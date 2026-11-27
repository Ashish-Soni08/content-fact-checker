#!/usr/bin/env node
/**
 * Demo traffic generator for FlagOps.
 *
 * Sends fact-check requests from a pool of fake users so Flagsmith percentage
 * splits spread across variants and FlagOps has per-variant metrics to watch.
 *
 * Usage:
 *   node scripts/traffic.mjs [--url http://localhost:3000] [--interval 4000]
 *                            [--concurrency 2] [--users 40] [--duration 600]
 *
 * Every request costs real Anthropic tokens and Firecrawl credits. Keep the
 * max_claims flag at 2 or 3 while this runs.
 */

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, arg, i, all) => {
    if (arg.startsWith("--")) pairs.push([arg.slice(2), all[i + 1]])
    return pairs
  }, []),
)

const BASE_URL = args.url || process.env.TRAFFIC_URL || "http://localhost:3000"
const INTERVAL_MS = Number(args.interval || 4000)
const CONCURRENCY = Number(args.concurrency || 2)
const USERS = Number(args.users || 40)
const DURATION_S = Number(args.duration || 600)

const SAMPLES = [
  "The Eiffel Tower was completed in 1889 for the World's Fair in Paris and is about 330 metres tall.",
  "Mount Everest is the tallest mountain above sea level at 8,849 metres. It sits on the border of Nepal and China.",
  "The Great Wall of China is visible from the Moon with the naked eye. It was built in a single dynasty.",
  "Water boils at 100 degrees Celsius at sea level. The human body has 206 bones in adulthood.",
  "Berlin became the capital of reunified Germany in 1990. The Berlin Wall fell in November 1989.",
  "The Pacific is the largest ocean on Earth. Australia is both a country and a continent.",
  "Python was first released by Guido van Rossum in 1991. JavaScript was created in 10 days in 1995.",
  "The speed of light in a vacuum is about 300,000 kilometres per second. Sound travels faster than light.",
  "Marie Curie won Nobel Prizes in both Physics and Chemistry. She was born in Warsaw in 1867.",
  "The Amazon is the longest river in the world and flows through Canada.",
]

const pick = (list) => list[Math.floor(Math.random() * list.length)]
const userId = () => `traffic-user-${Math.floor(Math.random() * USERS) + 1}`

const totals = { sent: 0, ok: 0, errors: 0, parseFailures: 0 }
const stopAt = Date.now() + DURATION_S * 1000

async function fireOne() {
  const identity = userId()
  const started = Date.now()
  totals.sent += 1
  try {
    const res = await fetch(`${BASE_URL}/api/fact-check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-flagops-identity": identity,
        "x-flagops-client": "traffic-script",
      },
      body: JSON.stringify({ text: pick(SAMPLES) }),
    })
    const data = await res.json().catch(() => ({}))
    const ms = Date.now() - started
    const flags = data.meta?.flags ?? {}
    const unparsed = (data.results ?? []).filter((r) => r.reason === "Could not parse model output.").length
    totals.parseFailures += unparsed
    if (res.ok) totals.ok += 1
    else totals.errors += 1
    console.log(
      `${new Date().toISOString().slice(11, 19)} ${res.status} ${String(ms).padStart(6)}ms ` +
        `${identity.padEnd(18)} judge=${flags.judge_prompt_version ?? "?"} model=${flags.llm_model ?? "?"} ` +
        `effort=${flags.reasoning_effort ?? "?"} search=${flags.web_search_evidence ?? "?"} ` +
        `claims=${data.claims?.length ?? 0} unparsed=${unparsed}${res.ok ? "" : ` error=${String(data.error).slice(0, 80)}`}`,
    )
  } catch (error) {
    totals.errors += 1
    console.log(`request failed: ${error instanceof Error ? error.message : error}`)
  }
}

async function worker() {
  while (Date.now() < stopAt) {
    await fireOne()
    await new Promise((r) => setTimeout(r, INTERVAL_MS))
  }
}

console.log(`Sending traffic to ${BASE_URL} with ${CONCURRENCY} workers for ${DURATION_S}s (Ctrl+C to stop)`)
process.on("SIGINT", () => {
  console.log("\nTotals:", totals)
  process.exit(0)
})
await Promise.all(Array.from({ length: CONCURRENCY }, worker))
console.log("Totals:", totals)
