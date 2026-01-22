import { NextRequest, NextResponse } from "next/server"

interface SearchResult {
  url: string
  title: string | null
  publish_date: string | null
  excerpts: string[]
}

interface ClaimResult {
  claim: string
  verdict: "true" | "false" | "uncertain"
  reason: string
  sources: string[]
}

const CEREBRAS_MODEL_NAME = "gpt-oss-120b"

async function callCerebrasChatReasoning(
  userContent: string,
  systemContent: string | null,
  apiKey: string
): Promise<string> {
  const messages: Array<{ role: string; content: string }> = []
  if (systemContent) {
    messages.push({ role: "system", content: systemContent })
  }
  messages.push({ role: "user", content: userContent })

  const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-Cerebras-3rd-Party-Integration": "parallel-ai-workshop",
    },
    body: JSON.stringify({
      model: CEREBRAS_MODEL_NAME,
      messages,
      temperature: 1.0,
      top_p: 1.0,
      max_tokens: 4096,
      reasoning_effort: "medium",
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Cerebras API error: ${error}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

async function callCerebrasChat(
  userContent: string,
  systemContent: string | null,
  apiKey: string
): Promise<string> {
  const messages: Array<{ role: string; content: string }> = []
  if (systemContent) {
    messages.push({ role: "system", content: systemContent })
  }
  messages.push({ role: "user", content: userContent })

  const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-Cerebras-3rd-Party-Integration": "parallel-ai-workshop",
    },
    body: JSON.stringify({
      model: CEREBRAS_MODEL_NAME,
      messages,
      temperature: 1.0,
      top_p: 1.0,
      max_tokens: 4096,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Cerebras API error: ${error}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

async function searchWeb(
  query: string,
  parallelApiKey: string,
  num: number = 6
): Promise<SearchResult[]> {
  const objective = `Find high-quality, up-to-date sources that answer the question:\n\n${query}\nPrefer authoritative sites (e.g., .gov, .edu, major news, or official org websites).`

  const response = await fetch("https://api.parallel.ai/v1beta/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": parallelApiKey,
      "parallel-beta": "search-extract-2025-10-10",
    },
    body: JSON.stringify({
      objective,
      search_queries: [query],
      max_results: num,
      excerpts: { max_chars_per_result: 8000 },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Parallel API error: ${error}`)
  }

  const data = await response.json()
  return data.results.map((r: { url: string; title?: string; publish_date?: string; excerpts?: string[] }) => ({
    url: r.url,
    title: r.title || null,
    publish_date: r.publish_date || null,
    excerpts: r.excerpts || [],
  }))
}

function buildEvidenceContext(results: SearchResult[], maxChars: number = 8000): string {
  const blocks: string[] = []

  for (let idx = 0; idx < results.length; idx++) {
    const r = results[idx]
    const excerptsText = r.excerpts.slice(0, 2).join("\n\n")
    const block = `[Source ${idx + 1}]
Title: ${r.title || r.url}
URL: ${r.url}
Publish date: ${r.publish_date || "Unknown"}

Excerpts:
${excerptsText}`
    blocks.push(block)
  }

  let context = blocks.join("\n\n")
  if (context.length > maxChars) {
    context = context.slice(0, maxChars) + "\n\n[Context truncated for length]"
  }
  return context
}

async function extractClaimsFromText(
  text: string,
  cerebrasApiKey: string,
  maxClaims: number = 8
): Promise<string[]> {
  const systemPrompt = `You are an information extraction assistant.
From the user's text, extract up to ${maxClaims} atomic factual claims.
Each claim should:
- Be checkable against external sources (dates, numbers, named entities)
- Be concrete and not an opinion.
Return STRICT JSON:
{
  "claims": ["...", "..."]
}`

  const userPrompt = `Text:\n\n${text}\n\nExtract up to ${maxClaims} factual claims.`

  const raw = await callCerebrasChatReasoning(userPrompt, systemPrompt, cerebrasApiKey)

  // Clean up possible markdown fences
  let cleaned = raw.trim()
  cleaned = cleaned.replace(/^\s*```(?:json)?\s*/i, "")
  cleaned = cleaned.replace(/\s*```\s*$/, "")

  try {
    const data = JSON.parse(cleaned)
    const claims = data.claims || []
    return claims
      .filter((c: unknown): c is string => typeof c === "string" && c.trim() !== "")
      .map((c: string) => c.trim())
      .slice(0, maxClaims)
  } catch {
    console.error("Error parsing claims JSON:", raw)
    return []
  }
}

async function factCheckSingleClaim(
  claim: string,
  cerebrasApiKey: string,
  parallelApiKey: string
): Promise<ClaimResult> {
  // Search for evidence
  const results = await searchWeb(claim, parallelApiKey, 6)
  const evidenceContext = buildEvidenceContext(results)

  const systemPrompt = `You are a careful, skeptical fact‑checking assistant.
You get a factual claim and web search excerpts.
Decide if the evidence supports, contradicts, or does not clearly resolve the claim.
Respond with STRICT JSON:
{
  "verdict": "true" | "false" | "uncertain",
  "reason": "short explanation",
  "top_sources": ["url1", "url2", ...]
}
Use 'true' only when the evidence strongly supports the claim.
Use 'false' only when it clearly contradicts the claim.
Otherwise use 'uncertain'.`

  const userPrompt = `Claim:
${claim}

Evidence (web search excerpts):
${evidenceContext}`

  const raw = await callCerebrasChat(userPrompt, systemPrompt, cerebrasApiKey)

  // Clean up JSON
  let cleaned = raw.trim()
  cleaned = cleaned.replace(/^\s*```(?:json)?\s*/i, "")
  cleaned = cleaned.replace(/\s*```\s*$/, "")

  let data: { verdict?: string; reason?: string; top_sources?: string[] }
  try {
    data = JSON.parse(cleaned)
  } catch {
    console.error("Error parsing judgment JSON:", raw)
    data = { verdict: "uncertain", reason: "Could not parse model output.", top_sources: [] }
  }

  let verdict = String(data.verdict || "uncertain").toLowerCase()
  if (!["true", "false", "uncertain"].includes(verdict)) {
    verdict = "uncertain"
  }

  let topSources = data.top_sources || []
  if (!Array.isArray(topSources)) {
    topSources = [String(topSources)]
  }
  topSources = topSources.map((u) => String(u)).slice(0, 5)

  return {
    claim,
    verdict: verdict as "true" | "false" | "uncertain",
    reason: data.reason || "",
    sources: topSources,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, cerebrasApiKey, parallelApiKey, maxClaims = 6 } = body

    if (!text || !cerebrasApiKey || !parallelApiKey) {
      return NextResponse.json(
        { error: "Missing required fields: text, cerebrasApiKey, parallelApiKey" },
        { status: 400 }
      )
    }

    // Extract claims
    const claims = await extractClaimsFromText(text, cerebrasApiKey, maxClaims)

    if (claims.length === 0) {
      return NextResponse.json({
        claims: [],
        results: [],
        message: "No factual claims could be extracted from the provided text.",
      })
    }

    // Fact-check each claim
    const results: ClaimResult[] = []
    for (const claim of claims) {
      const result = await factCheckSingleClaim(claim, cerebrasApiKey, parallelApiKey)
      results.push(result)
    }

    return NextResponse.json({ claims, results })
  } catch (error) {
    console.error("Fact-check error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unknown error occurred" },
      { status: 500 }
    )
  }
}
