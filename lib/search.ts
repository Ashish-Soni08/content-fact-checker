export interface SearchResult {
  url: string
  title: string | null
  excerpt: string
}

interface FirecrawlWebResult {
  url?: string
  title?: string
  description?: string
  markdown?: string
}

/**
 * Web search through Firecrawl's /v2/search endpoint. When FIRECRAWL_SCRAPE_RESULTS
 * is not "false", each result is also scraped to markdown so the judge sees real
 * page text (costs extra Firecrawl credits per result).
 */
export async function searchWeb(query: string, limit = 3): Promise<SearchResult[]> {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY is not set")

  const scrape = process.env.FIRECRAWL_SCRAPE_RESULTS !== "false"
  const response = await fetch(`${process.env.FIRECRAWL_API_URL || "https://api.firecrawl.dev"}/v2/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      limit,
      sources: ["web"],
      ...(scrape ? { scrapeOptions: { formats: ["markdown"], onlyMainContent: true } } : {}),
    }),
  })

  if (!response.ok) {
    throw new Error(`Firecrawl search error ${response.status}: ${(await response.text()).slice(0, 300)}`)
  }

  const body = await response.json()
  // v2 returns { data: { web: [...] } }; older shapes return { data: [...] }.
  const items: FirecrawlWebResult[] = Array.isArray(body?.data) ? body.data : (body?.data?.web ?? [])

  return items
    .filter((r) => typeof r.url === "string")
    .map((r) => ({
      url: r.url as string,
      title: r.title ?? null,
      excerpt: (r.markdown || r.description || "").slice(0, 3000),
    }))
}

export function buildEvidenceContext(results: SearchResult[], maxChars = 8000): string {
  const context = results
    .map((r, idx) => `[Source ${idx + 1}]\nTitle: ${r.title || r.url}\nURL: ${r.url}\n\nExcerpt:\n${r.excerpt}`)
    .join("\n\n")
  return context.length > maxChars ? context.slice(0, maxChars) + "\n\n[Context truncated for length]" : context
}
