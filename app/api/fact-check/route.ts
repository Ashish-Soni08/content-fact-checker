import Anthropic from "@anthropic-ai/sdk"
import { after, NextRequest, NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { evaluateFlags, type FactCheckFlags } from "@/lib/flags"
import { emitEvent, estimateCostUsd, type FactCheckEvent } from "@/lib/flagops"
import { extractionPrompt, getJudgePrompt } from "@/lib/prompts"
import { buildEvidenceContext, searchWeb } from "@/lib/search"

export const runtime = "nodejs"
export const maxDuration = 120

interface ClaimResult {
  claim: string
  verdict: "true" | "false" | "uncertain"
  reason: string
  sources: string[]
}

/** Per-request counters that end up in the FlagOps event. */
interface RequestStats {
  inputTokens: number
  outputTokens: number
  parseFailures: number
  refusals: number
  searchCalls: number
  searchErrors: number
}

const anthropic = new Anthropic() // reads ANTHROPIC_API_KEY

async function callClaude(
  flags: FactCheckFlags,
  system: string,
  user: string,
  stats: RequestStats,
): Promise<string | null> {
  const response = await anthropic.messages.create({
    model: flags.llm_model,
    max_tokens: 16000,
    system,
    messages: [{ role: "user", content: user }],
    output_config: { effort: flags.reasoning_effort },
  })

  stats.inputTokens += response.usage.input_tokens
  stats.outputTokens += response.usage.output_tokens

  if (response.stop_reason === "refusal") {
    stats.refusals += 1
    return null
  }

  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
}

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null
  const cleaned = raw
    .trim()
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
  try {
    return JSON.parse(cleaned) as T
  } catch {
    return null
  }
}

async function extractClaims(text: string, flags: FactCheckFlags, stats: RequestStats): Promise<string[]> {
  const raw = await callClaude(
    flags,
    extractionPrompt(flags.max_claims),
    `Text:\n\n${text}\n\nExtract up to ${flags.max_claims} factual claims.`,
    stats,
  )
  const data = parseJson<{ claims?: unknown[] }>(raw)
  if (!data) {
    stats.parseFailures += 1
    console.error("Could not parse claims JSON:", raw)
    return []
  }
  return (data.claims ?? [])
    .filter((c): c is string => typeof c === "string" && c.trim() !== "")
    .map((c) => c.trim())
    .slice(0, flags.max_claims)
}

async function checkClaim(claim: string, flags: FactCheckFlags, stats: RequestStats): Promise<ClaimResult> {
  let evidence = "No external evidence was retrieved for this claim. Judge from well-established knowledge only."
  if (flags.web_search_evidence) {
    stats.searchCalls += 1
    try {
      const results = await searchWeb(claim, 3)
      if (results.length > 0) evidence = buildEvidenceContext(results)
    } catch (error) {
      stats.searchErrors += 1
      console.error("Search failed:", error)
    }
  }

  const judge = getJudgePrompt(flags.judge_prompt_version)
  const raw = await callClaude(flags, judge.prompt, `Claim:\n${claim}\n\nEvidence:\n${evidence}`, stats)
  const data = parseJson<{ verdict?: string; reason?: string; top_sources?: unknown }>(raw)

  if (!data) {
    stats.parseFailures += 1
    return {
      claim,
      verdict: "uncertain",
      reason: raw === null ? "The model declined to judge this claim." : "Could not parse model output.",
      sources: [],
    }
  }

  const verdict = String(data.verdict ?? "uncertain").toLowerCase()
  const sources = Array.isArray(data.top_sources) ? data.top_sources : data.top_sources ? [data.top_sources] : []

  return {
    claim,
    verdict: verdict === "true" || verdict === "false" ? verdict : "uncertain",
    reason: data.reason ?? "",
    sources: sources.map(String).slice(0, 5),
  }
}

function errorInfo(error: unknown): { type: string; message: string; status: number } {
  if (error instanceof Anthropic.APIError) {
    return { type: `anthropic_${error.status ?? "error"}`, message: error.message, status: 502 }
  }
  return { type: "internal", message: error instanceof Error ? error.message : String(error), status: 500 }
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now()
  const body = await request.json().catch(() => ({}))
  const text: string | undefined = body?.text

  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "Missing required field: text" }, { status: 400 })
  }

  // One Flagsmith identity per caller: header from the traffic script / browser, else anonymous.
  const identity =
    request.headers.get("x-flagops-identity") || (typeof body?.userId === "string" && body.userId) || `anon-${randomUUID()}`
  const client = request.headers.get("x-flagops-client") || "web"

  const evaluation = await evaluateFlags(identity, { client })
  const flags = evaluation.flags
  const stats: RequestStats = {
    inputTokens: 0,
    outputTokens: 0,
    parseFailures: 0,
    refusals: 0,
    searchCalls: 0,
    searchErrors: 0,
  }

  let claims: string[] = []
  let results: ClaimResult[] = []
  let failure: ReturnType<typeof errorInfo> | null = null

  try {
    claims = await extractClaims(text, flags, stats)
    results = await Promise.all(claims.map((claim) => checkClaim(claim, flags, stats)))
  } catch (error) {
    console.error("Fact-check error:", error)
    failure = errorInfo(error)
  }

  const httpStatus = failure ? failure.status : 200
  const event: FactCheckEvent = {
    schema: "flagops.factcheck.v1",
    event_id: randomUUID(),
    timestamp: new Date(startedAt).toISOString(),
    app: "content-fact-checker",
    environment: process.env.FLAGOPS_ENVIRONMENT || "development",
    identity,
    flags_source: evaluation.source,
    flags,
    status: failure ? "error" : "ok",
    http_status: httpStatus,
    error: failure ? { type: failure.type, message: failure.message.slice(0, 500) } : null,
    latency_ms: Date.now() - startedAt,
    tokens: {
      input: stats.inputTokens,
      output: stats.outputTokens,
      total: stats.inputTokens + stats.outputTokens,
    },
    cost_usd: estimateCostUsd(flags.llm_model, stats.inputTokens, stats.outputTokens),
    claims: claims.length,
    verdicts: {
      true: results.filter((r) => r.verdict === "true").length,
      false: results.filter((r) => r.verdict === "false").length,
      uncertain: results.filter((r) => r.verdict === "uncertain").length,
    },
    parse_failures: stats.parseFailures,
    refusals: stats.refusals,
    search_calls: stats.searchCalls,
    search_errors: stats.searchErrors,
  }
  after(() => emitEvent(event))

  const meta = { flags, flagsSource: evaluation.source, latencyMs: event.latency_ms, tokens: event.tokens.total }

  if (failure) {
    return NextResponse.json({ error: failure.message, meta }, { status: httpStatus })
  }
  if (claims.length === 0) {
    return NextResponse.json({
      claims: [],
      results: [],
      message: "No factual claims could be extracted from the provided text.",
      meta,
    })
  }
  return NextResponse.json({ claims, results, meta })
}
