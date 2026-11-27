# Content Fact Checker

An AI-powered fact verification tool that extracts factual claims from any text or URL and verifies them against authoritative web sources.

## Overview

This application combines **Claude** (Anthropic API) for claim extraction and judging with **Firecrawl** search for real-time web evidence. Its behaviour is steered by **Flagsmith** feature flags, and every request reports metrics to **FlagOps Control Room**. It's designed as a prototype to demonstrate how AI can assist in verifying information accuracy.

## How It Works

1. **Input**: Paste text directly or provide a URL (content is automatically extracted)
2. **Claim Extraction**: Claude identifies up to `max_claims` atomic, verifiable factual claims
3. **Evidence Search**: Each claim triggers a Firecrawl search for authoritative sources (when `web_search_evidence` is on)
4. **Verdict Generation**: Claude analyzes the evidence and renders a verdict:
   - **Verified** (green): Evidence strongly supports the claim
   - **False** (red): Evidence clearly contradicts the claim
   - **Uncertain** (amber): Evidence is inconclusive

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React, Tailwind CSS, shadcn/ui components
- **AI/LLM**: Anthropic API (model chosen by the `llm_model` flag, default `claude-haiku-5-5`)
- **Search**: Firecrawl search API
- **Feature flags**: self-hosted Flagsmith (`flagsmith-nodejs`)
- **Deployment**: Vercel

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── fact-check/route.ts    # Main fact-checking endpoint
│   │   └── extract-url/route.ts   # URL content extraction
│   ├── page.tsx                   # Main application page
│   ├── layout.tsx                 # Root layout with metadata
│   └── loading.tsx                # Loading state fallback
├── components/
│   ├── api-keys-panel.tsx         # API key configuration sheet
│   ├── claim-result-card.tsx      # Individual claim result display
│   ├── empty-state.tsx            # Empty state with examples
│   ├── fact-check-loading.tsx     # Loading states and progress
│   └── results-summary.tsx        # Summary dashboard with score ring
```

## API Routes

### POST `/api/fact-check`

Main endpoint for fact-checking content.

**Request Body:**
```json
{
  "text": "Content to fact-check",
  "cerebrasApiKey": "csk-...",
  "parallelApiKey": "par-...",
  "maxClaims": 6
}
```

**Response:**
```json
{
  "claims": ["Claim 1", "Claim 2"],
  "results": [
    {
      "claim": "Claim 1",
      "verdict": "true" | "false" | "uncertain",
      "reason": "Explanation of the verdict",
      "sources": ["https://source1.com", "https://source2.com"]
    }
  ]
}
```

### POST `/api/extract-url`

Extracts text content from a given URL.

**Request Body:**
```json
{
  "url": "https://example.com/article"
}
```

**Response:**
```json
{
  "text": "Extracted article content..."
}
```

## Getting API Keys

### Cerebras AI
1. Visit [cloud.cerebras.ai](https://cloud.cerebras.ai/)
2. Create an account and generate an API key
3. Keys start with `csk-`

### Parallel AI
1. Visit [parallel.ai](https://parallel.ai/)
2. Sign up for API access
3. Keys start with `par-`

## Local Development

```bash
# Clone the repository
git clone <your-repo-url>
cd content-fact-checker

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Data & Privacy

- **API Keys**: Stored in browser localStorage (persist between sessions)
- **Results**: Stored only in memory (lost on page refresh/close)
- **No Server Storage**: Keys are sent directly to Cerebras/Parallel APIs, never stored on our servers

## Key Components

### `api-keys-panel.tsx`
Slide-out sheet for managing API keys with:
- Password toggle visibility
- Links to get API keys
- Clear all keys button
- Persistence status messaging

### `claim-result-card.tsx`
Displays individual fact-check results with:
- Color-coded verdict badges
- Detailed reasoning
- Clickable source links
- Animated entry transitions

### `results-summary.tsx`
Dashboard showing:
- SVG ring chart with verdict breakdown
- Accuracy percentage
- Count statistics
- Overall content reliability status

### `fact-check-loading.tsx`
Progressive loading states:
- Skeleton cards during extraction
- Live progress bar during checking
- Claim list with completion status

## Limitations

- **Rate Limits**: Subject to Cerebras and Parallel API rate limits
- **Accuracy**: AI verdicts should be independently verified for critical decisions
- **URL Extraction**: Basic HTML parsing; may not work with JavaScript-heavy sites
- **Claim Types**: Works best with concrete, verifiable facts (dates, numbers, named entities)

## Future Improvements

- [ ] Save/export results to PDF or JSON
- [ ] Batch URL processing
- [ ] Historical result storage
- [ ] Custom confidence thresholds
- [ ] Source credibility scoring
- [ ] Multi-language support

## Credits

Built with:
- [Cerebras AI](https://cerebras.ai) - LLM inference
- [Parallel AI](https://parallel.ai) - Web search
- [v0](https://v0.dev) - Development platform
- [shadcn/ui](https://ui.shadcn.com) - UI components

---

**Disclaimer**: This is a prototype tool for educational and demonstration purposes. Always verify critical information through multiple authoritative sources.


## Feature flags and FlagOps

Keys now live in server env vars (see `.env.example`); the browser no longer sends any keys.

Each request is evaluated for one Flagsmith identity (`x-flagops-identity` header; the browser sends a stable anonymous id, the traffic script a pool of fake users). Identities are sent as transient so traffic doesn't fill the Flagsmith identities table. If Flagsmith is unreachable or a flag is missing, the code defaults below apply.

| Flag | Type | Default | Effect |
|---|---|---|---|
| `judge_prompt_version` | string (multivariate) | `v1` | Judge system prompt. `v2` is a stricter newsroom judge. `v3` is a deliberately broken "friendly" prompt with no JSON contract, so every verdict fails to parse. |
| `llm_model` | string | `claude-haiku-5-5` | Anthropic model for extraction and judging, e.g. `claude-sonnet-5-5`. A non-existent model name makes every request fail. |
| `web_search_evidence` | on/off | on | Firecrawl evidence search. Off makes requests cheaper and faster, and raises the share of `uncertain` verdicts. |
| `reasoning_effort` | string | `low` | `output_config.effort`: `low`, `medium` or `high`. |
| `max_claims` | number | `4` | Claims extracted per request (1 to 10). |

For the value flags, the value is used only when the flag is enabled. A disabled value flag means "use the default".

### Metrics event

After each `/api/fact-check` response the server POSTs one JSON event to `FLAGOPS_INGEST_URL` (optional `Authorization: Bearer $FLAGOPS_INGEST_TOKEN`, 3 s timeout, failures only logged). Shape (`lib/flagops.ts`):

```json
{
  "schema": "flagops.factcheck.v1",
  "event_id": "uuid",
  "timestamp": "2026-11-27T20:18:53.391Z",
  "app": "content-fact-checker",
  "environment": "development",
  "identity": "traffic-user-7",
  "flags_source": "flagsmith",
  "flags": {
    "judge_prompt_version": "v3",
    "llm_model": "claude-haiku-5-5",
    "web_search_evidence": true,
    "reasoning_effort": "low",
    "max_claims": 3
  },
  "status": "ok",
  "http_status": 200,
  "error": null,
  "latency_ms": 4210,
  "tokens": { "input": 5120, "output": 830, "total": 5950 },
  "cost_usd": 0.000927,
  "claims": 3,
  "verdicts": { "true": 0, "false": 0, "uncertain": 3 },
  "parse_failures": 3,
  "refusals": 0,
  "search_calls": 3,
  "search_errors": 0
}
```

On failure, `status` is `"error"`, `http_status` is 502 (Anthropic error) or 500, and `error` is `{ "type": "anthropic_404", "message": "..." }`. Suggested guardrails: error rate, p95 `latency_ms`, `cost_usd` per request, and `parse_failures / claims` per `judge_prompt_version`.

### Demo traffic

```bash
pnpm dev                         # app on :3000
node scripts/traffic.mjs --interval 4000 --concurrency 2 --users 40 --duration 600
```

Every request spends real Anthropic tokens and Firecrawl credits (one search, plus a scrape per result, for each claim), so keep `max_claims` at 2 or 3 while traffic runs. Set `FIRECRAWL_SCRAPE_RESULTS=false` to use search snippets only.

**On-camera failure:** set the `judge_prompt_version` split to send 50% to `v3`. Those requests come back with every claim marked "Uncertain: Could not parse model output", and their `parse_failures` match their `claims`. FlagOps detects the breach and turns `v3` off.
