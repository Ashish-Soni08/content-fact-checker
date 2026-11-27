import { DefaultFlag, Flagsmith } from "flagsmith-nodejs"

/**
 * Feature flags that steer the fact-check pipeline. Every request is evaluated
 * for one Flagsmith identity, so percentage splits and segment overrides apply
 * per caller.
 */
export type ReasoningEffort = "low" | "medium" | "high"

export interface FactCheckFlags {
  /** Which judge system prompt to use: "v1" | "v2" | "v3" (v3 drops the JSON contract on purpose). */
  judge_prompt_version: string
  /** Anthropic model id used for claim extraction and judging. */
  llm_model: string
  /** When false, the judge gets no web evidence and must rely on the model's own knowledge. */
  web_search_evidence: boolean
  /** Anthropic `output_config.effort` for both calls. */
  reasoning_effort: ReasoningEffort
  /** Upper bound on claims extracted per request (cost lever). */
  max_claims: number
}

export const FLAG_DEFAULTS: FactCheckFlags = {
  judge_prompt_version: "v1",
  llm_model: "claude-haiku-5-5",
  web_search_evidence: true,
  reasoning_effort: "low",
  max_claims: 4,
}

export interface FlagEvaluation {
  flags: FactCheckFlags
  /** "flagsmith" when evaluated remotely, "defaults" when Flagsmith was not configured or unreachable. */
  source: "flagsmith" | "defaults"
  error?: string
}

let client: Flagsmith | null = null

function getClient(): Flagsmith | null {
  const environmentKey = process.env.FLAGSMITH_ENVIRONMENT_KEY
  if (!environmentKey) return null
  if (!client) {
    client = new Flagsmith({
      environmentKey,
      apiUrl: process.env.FLAGSMITH_API_URL || undefined,
      requestTimeoutSeconds: Number(process.env.FLAGSMITH_TIMEOUT_SECONDS || 5),
      retries: 1,
      // Missing flags fall back to the code defaults instead of throwing.
      defaultFlagHandler: (name: string) => {
        const value = FLAG_DEFAULTS[name as keyof FactCheckFlags]
        return new DefaultFlag(typeof value === "boolean" ? null : value, typeof value === "boolean" ? value : true)
      },
    })
  }
  return client
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : fallback
}

function asEffort(value: unknown): ReasoningEffort {
  return value === "low" || value === "medium" || value === "high" ? value : FLAG_DEFAULTS.reasoning_effort
}

function asClaims(value: unknown): number {
  const n = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10)
  if (!Number.isFinite(n) || n < 1) return FLAG_DEFAULTS.max_claims
  return Math.min(Math.floor(n), 10)
}

/**
 * Flag semantics in Flagsmith:
 * - judge_prompt_version, llm_model, reasoning_effort, max_claims: the flag VALUE is used
 *   when the flag is enabled; a disabled flag means "use the code default".
 * - web_search_evidence: plain on/off toggle.
 */
export async function evaluateFlags(identity: string, traits: Record<string, string> = {}): Promise<FlagEvaluation> {
  const fs = getClient()
  if (!fs) return { flags: { ...FLAG_DEFAULTS }, source: "defaults" }

  try {
    const flags = await fs.getIdentityFlags(identity, traits, true)
    const valueIfEnabled = (name: keyof FactCheckFlags) =>
      flags.isFeatureEnabled(name) ? flags.getFeatureValue(name) : undefined

    return {
      source: "flagsmith",
      flags: {
        judge_prompt_version: asString(valueIfEnabled("judge_prompt_version"), FLAG_DEFAULTS.judge_prompt_version),
        llm_model: asString(valueIfEnabled("llm_model"), FLAG_DEFAULTS.llm_model),
        web_search_evidence: flags.isFeatureEnabled("web_search_evidence"),
        reasoning_effort: asEffort(valueIfEnabled("reasoning_effort")),
        max_claims: asClaims(valueIfEnabled("max_claims")),
      },
    }
  } catch (error) {
    console.error("Flagsmith evaluation failed, using defaults:", error)
    return {
      flags: { ...FLAG_DEFAULTS },
      source: "defaults",
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
