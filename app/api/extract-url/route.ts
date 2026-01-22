import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url } = body

    if (!url) {
      return NextResponse.json({ error: "Missing URL" }, { status: 400 })
    }

    // Fetch the URL content
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    })

    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch URL: ${response.status}` }, { status: 400 })
    }

    const html = await response.text()

    // Simple HTML text extraction (removing tags)
    // Find article or main content first
    let content = html

    // Try to extract main content
    const articleMatch = content.match(/<article[^>]*>([\s\S]*?)<\/article>/i)
    const mainMatch = content.match(/<main[^>]*>([\s\S]*?)<\/main>/i)

    if (articleMatch) {
      content = articleMatch[1]
    } else if (mainMatch) {
      content = mainMatch[1]
    }

    // Extract text from paragraphs and headings
    const textParts: string[] = []
    const pMatches = content.matchAll(/<(?:p|h[1-6])[^>]*>([\s\S]*?)<\/(?:p|h[1-6])>/gi)

    for (const match of pMatches) {
      // Remove nested HTML tags
      const text = match[1]
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, " ")
        .trim()

      if (text.length > 20) {
        textParts.push(text)
      }
    }

    const extractedText = textParts.join("\n\n")

    if (extractedText.length < 100) {
      return NextResponse.json(
        { error: "Could not extract enough text content from the URL" },
        { status: 400 }
      )
    }

    return NextResponse.json({ text: extractedText.slice(0, 10000) })
  } catch (error) {
    console.error("URL extraction error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to extract content from URL" },
      { status: 500 }
    )
  }
}
