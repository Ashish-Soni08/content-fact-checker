"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ApiKeysPanel } from "@/components/api-keys-panel"
import { ClaimResultCard } from "@/components/claim-result-card"
import { FactCheckLoading } from "@/components/fact-check-loading"
import { ResultsSummary } from "@/components/results-summary"
import { EmptyState } from "@/components/empty-state"
import { AlertCircle, FileText, Link2, Search, Sparkles, Zap } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import Loading from "./loading"

interface ClaimResult {
  claim: string
  verdict: "true" | "false" | "uncertain"
  reason: string
  sources: string[]
}

export default function FactCheckerPage() {
  const [cerebrasKey, setCerebrasKey] = useState("")
  const [parallelKey, setParallelKey] = useState("")
  const [inputText, setInputText] = useState("")
  const [inputUrl, setInputUrl] = useState("")
  const [inputMode, setInputMode] = useState<"text" | "url">("text")
  const [isLoading, setIsLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState<"extracting" | "checking" | null>(null)
  const [currentClaimIndex, setCurrentClaimIndex] = useState(0)
  const [extractedClaims, setExtractedClaims] = useState<string[]>([])
  const [results, setResults] = useState<ClaimResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()

  // Load API keys from localStorage on mount
  useEffect(() => {
    const storedCerebras = localStorage.getItem("cerebras_api_key")
    const storedParallel = localStorage.getItem("parallel_api_key")
    if (storedCerebras) setCerebrasKey(storedCerebras)
    if (storedParallel) setParallelKey(storedParallel)
  }, [])

  const handleFactCheck = async () => {
    if (!cerebrasKey || !parallelKey) {
      setError("Please configure your API keys first.")
      return
    }

    let textToCheck = inputText

    // If URL mode, first extract text from URL
    if (inputMode === "url") {
      if (!inputUrl) {
        setError("Please enter a URL to fact-check.")
        return
      }

      setIsLoading(true)
      setLoadingStep("extracting")
      setError(null)
      setResults([])
      setExtractedClaims([])

      try {
        const urlResponse = await fetch("/api/extract-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: inputUrl }),
        })

        const urlData = await urlResponse.json()

        if (!urlResponse.ok) {
          throw new Error(urlData.error || "Failed to extract content from URL")
        }

        textToCheck = urlData.text
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to extract content from URL")
        setIsLoading(false)
        setLoadingStep(null)
        return
      }
    } else {
      if (!inputText.trim()) {
        setError("Please enter some text to fact-check.")
        return
      }
    }

    setIsLoading(true)
    setLoadingStep("extracting")
    setError(null)
    setResults([])
    setExtractedClaims([])

    try {
      const response = await fetch("/api/fact-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToCheck,
          cerebrasApiKey: cerebrasKey,
          parallelApiKey: parallelKey,
          maxClaims: 6,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fact-check content")
      }

      if (data.claims && data.claims.length > 0) {
        setExtractedClaims(data.claims)
        setLoadingStep("checking")

        // Simulate progress for each claim (the actual checking happens server-side)
        for (let i = 0; i < data.claims.length; i++) {
          setCurrentClaimIndex(i + 1)
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
      }

      setResults(data.results || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while fact-checking")
    } finally {
      setIsLoading(false)
      setLoadingStep(null)
    }
  }

  const keysConfigured = cerebrasKey && parallelKey

  return (
    <div className="min-h-screen bg-background">
      {/* Ambient background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-chart-2/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <header className="text-center mb-12 animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
            <Sparkles className="h-3 w-3" />
            AI-Powered Verification
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 tracking-tight text-balance">
            Content Fact Checker
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-balance">
            Powered by Cerebras AI and Parallel Search. Extract factual claims from any text or URL
            and verify them against authoritative sources.
          </p>
        </header>

        {/* API Keys Panel */}
        <div className="flex justify-end mb-6">
          <ApiKeysPanel
            cerebrasKey={cerebrasKey}
            parallelKey={parallelKey}
            onCerebrasKeyChange={setCerebrasKey}
            onParallelKeyChange={setParallelKey}
          />
        </div>

        {/* Main Input Card */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50 mb-8 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Analyze Content
            </CardTitle>
            <CardDescription>
              Enter text directly or provide a URL to extract and fact-check claims
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs
              value={inputMode}
              onValueChange={(v) => setInputMode(v as "text" | "url")}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="text" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Text
                </TabsTrigger>
                <TabsTrigger value="url" className="gap-2">
                  <Link2 className="h-4 w-4" />
                  URL
                </TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="mt-0">
                <Textarea
                  placeholder="Paste the text content you want to fact-check here...

Example: The Eiffel Tower was built in 1889 and stands at 330 meters tall. It was designed by Gustave Eiffel's company for the 1889 World's Fair in Paris."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="min-h-[200px] resize-none bg-background/50"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {inputText.length} characters
                </p>
              </TabsContent>

              <TabsContent value="url" className="mt-0">
                <Input
                  type="url"
                  placeholder="https://example.com/article"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  className="bg-background/50"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  We&apos;ll extract the main content from this URL and analyze it
                </p>
              </TabsContent>
            </Tabs>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleFactCheck}
              disabled={isLoading || !keysConfigured}
              className="w-full gap-2"
              size="lg"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Fact-Check Content
                </>
              )}
            </Button>

            {!keysConfigured && (
              <p className="text-xs text-center text-muted-foreground">
                Configure your API keys to enable fact-checking
              </p>
            )}
          </CardContent>
        </Card>

        {/* Loading State */}
        <Suspense fallback={<Loading />}>
          {isLoading && (
            <FactCheckLoading
              currentStep={loadingStep}
              currentClaim={currentClaimIndex}
              totalClaims={extractedClaims.length}
              claims={extractedClaims}
            />
          )}
        </Suspense>

        {/* Results */}
        {!isLoading && results.length > 0 && (
          <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
            <ResultsSummary results={results} />

            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Detailed Analysis
              </h2>
              {results.map((result, idx) => (
                <div
                  key={idx}
                  className="animate-in fade-in-0 slide-in-from-bottom-2"
                  style={{ animationDelay: `${idx * 100}ms`, animationFillMode: "both" }}
                >
                  <ClaimResultCard
                    claim={result.claim}
                    verdict={result.verdict}
                    reason={result.reason}
                    sources={result.sources}
                    index={idx}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && results.length === 0 && (
          <EmptyState
            keysConfigured={keysConfigured}
            onSelectExample={(text) => {
              setInputText(text)
              setInputMode("text")
            }}
          />
        )}

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-border/50">
          <div className="flex flex-col items-center gap-4">
            <p className="text-xs text-muted-foreground">Built with</p>
            <div className="flex items-center gap-6">
              {/* Cerebras */}
              <a
                href="https://cerebras.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="currentColor"
                >
                  <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18l6.9 3.45L12 11.08 5.1 7.63 12 4.18zM4 8.82l7 3.5v7.36l-7-3.5V8.82zm9 10.86v-7.36l7-3.5v7.36l-7 3.5z" />
                </svg>
                <span className="text-sm font-medium">Cerebras</span>
              </a>

              <span className="text-muted-foreground/30">×</span>

              {/* Parallel */}
              <a
                href="https://parallel.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="currentColor"
                >
                  <path d="M4 4h4v16H4V4zm6 0h4v16h-4V4zm6 0h4v16h-4V4z" />
                </svg>
                <span className="text-sm font-medium">Parallel</span>
              </a>

              <span className="text-muted-foreground/30">×</span>

              {/* v0 */}
              <a
                href="https://v0.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="currentColor"
                >
                  <path d="M12 2L2 19h20L12 2zm0 4l6.5 11h-13L12 6z" />
                </svg>
                <span className="text-sm font-medium">v0</span>
              </a>
            </div>
            <p className="text-xs text-muted-foreground/70 mt-2">
              Results should be verified independently for critical decisions.
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
