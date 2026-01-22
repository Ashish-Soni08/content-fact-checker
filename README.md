# Content Fact Checker

An AI-powered fact verification tool that extracts factual claims from any text or URL and verifies them against authoritative web sources.

## Overview

This application combines **Cerebras AI** for intelligent claim extraction and reasoning with **Parallel Search** for real-time web evidence gathering. It's designed as a prototype to demonstrate how AI can assist in verifying information accuracy.

## How It Works

1. **Input**: Paste text directly or provide a URL (content is automatically extracted)
2. **Claim Extraction**: Cerebras AI identifies up to 6 atomic, verifiable factual claims
3. **Evidence Search**: Each claim triggers a Parallel Search query for authoritative sources
4. **Verdict Generation**: Cerebras AI analyzes the evidence and renders a verdict:
   - **Verified** (green): Evidence strongly supports the claim
   - **False** (red): Evidence clearly contradicts the claim
   - **Uncertain** (amber): Evidence is inconclusive

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React, Tailwind CSS, shadcn/ui components
- **AI/LLM**: Cerebras AI (gpt-oss-120b model with reasoning)
- **Search**: Parallel AI Search API
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
