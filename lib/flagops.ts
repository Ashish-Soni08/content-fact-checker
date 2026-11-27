import type { FactCheckFlags } from "./flags"

/**
 * One event per /api/fact-check request, POSTed to FLAGOPS_INGEST_URL.
 * FlagOps groups these by flag values to compute per-variant error rate,
 * latency, token cost and parse-failure rate, and kills a variant that breaches
 * its guardrail.
 */
export interface FactCheckEvent {
  schema: "flagops.factcheck.v1"
  event_id: string
  timestamp: string // ISO 8601, request start
  app: string
  environment: string
  identity: string
  flags_source: "flagsmith" | "defaults"
  flags: FactCheckFlags
  status: "ok" | "error"
  http_status: number
  error: { type: string; message: string } | null
  latency_ms: number
  tokens: { input: number; output: number; total: number }
  cost_usd: number
  claims: number
  verdicts: { true: number; false: number; uncertain: number }
  parse_failures: number
  refusals: number
  search_calls: number
  search_errors: number
}

// USD per million tokens (input, output) for the models we expect as flag values.
const PRICES: Record<string, [number, number]> = {
  "claude-haiku-5-5": [0.1, 0.5],
  "claude-sonnet-5-5": [2, 10],
  "claude-opus-5-5": [4, 20],
}

export function estimateCostUsd(model: string, input: number, output: number): number {
  const [inPrice, outPrice] = PRICES[model] ?? [0, 0]
  return Number(((input * inPrice + output * outPrice) / 1_000_000).toFixed(6))
}

export async function emitEvent(event: FactCheckEvent): Promise<void> {
  const url = process.env.FLAGOPS_INGEST_URL
  if (process.env.FLAGOPS_LOG_EVENTS === "true") console.log("[flagops]", JSON.stringify(event))
  if (!url) return

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.FLAGOPS_INGEST_TOKEN ? { Authorization: `Bearer ${process.env.FLAGOPS_INGEST_TOKEN}` } : {}),
      },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) console.error(`[flagops] ingest returned ${res.status}`)
  } catch (error) {
    // Metrics must never break the app.
    console.error("[flagops] ingest failed:", error instanceof Error ? error.message : error)
  }
}
