"use client"

import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, XCircle, HelpCircle } from "lucide-react"

interface ClaimResult {
  claim: string
  verdict: "true" | "false" | "uncertain"
  reason: string
  sources: string[]
}

interface ResultsSummaryProps {
  results: ClaimResult[]
}

export function ResultsSummary({ results }: ResultsSummaryProps) {
  const trueCount = results.filter((r) => r.verdict === "true").length
  const falseCount = results.filter((r) => r.verdict === "false").length
  const uncertainCount = results.filter((r) => r.verdict === "uncertain").length

  const totalCount = results.length
  const accuracyScore =
    totalCount > 0 ? Math.round((trueCount / totalCount) * 100) : 0

  const getOverallStatus = () => {
    if (falseCount > 0) return "issues"
    if (uncertainCount > totalCount / 2) return "mixed"
    return "good"
  }

  const status = getOverallStatus()

  return (
    <Card className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border-primary/20">
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Score circle with SVG ring */}
          <div className="relative h-28 w-28">
            <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
              {/* Background ring */}
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-muted/20"
              />
              {/* Verified (green) segment */}
              {trueCount > 0 && (
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                  className="text-emerald-500"
                  strokeDasharray={`${(trueCount / totalCount) * 264} 264`}
                  strokeDashoffset="0"
                />
              )}
              {/* False (red) segment */}
              {falseCount > 0 && (
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                  className="text-red-500"
                  strokeDasharray={`${(falseCount / totalCount) * 264} 264`}
                  strokeDashoffset={`${-(trueCount / totalCount) * 264}`}
                />
              )}
              {/* Uncertain (amber) segment */}
              {uncertainCount > 0 && (
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                  className="text-amber-500"
                  strokeDasharray={`${(uncertainCount / totalCount) * 264} 264`}
                  strokeDashoffset={`${-((trueCount + falseCount) / totalCount) * 264}`}
                />
              )}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <span className="text-3xl font-bold text-foreground">{accuracyScore}%</span>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Verified</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex-1 grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <span className="text-2xl font-bold text-foreground">{trueCount}</span>
              </div>
              <p className="text-xs text-muted-foreground">Verified</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <XCircle className="h-5 w-5 text-red-400" />
                <span className="text-2xl font-bold text-foreground">{falseCount}</span>
              </div>
              <p className="text-xs text-muted-foreground">False</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <HelpCircle className="h-5 w-5 text-amber-400" />
                <span className="text-2xl font-bold text-foreground">{uncertainCount}</span>
              </div>
              <p className="text-xs text-muted-foreground">Uncertain</p>
            </div>
          </div>

          {/* Status message */}
          <div className="text-right">
            {status === "good" && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-sm">
                <CheckCircle2 className="h-4 w-4" />
                Content appears reliable
              </div>
            )}
            {status === "issues" && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 text-red-400 text-sm">
                <XCircle className="h-4 w-4" />
                Contains inaccuracies
              </div>
            )}
            {status === "mixed" && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-400 text-sm">
                <HelpCircle className="h-4 w-4" />
                Needs further review
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
