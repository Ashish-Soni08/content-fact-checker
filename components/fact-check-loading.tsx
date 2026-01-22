"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface FactCheckLoadingProps {
  currentStep: "extracting" | "checking" | null
  currentClaim: number
  totalClaims: number
  claims: string[]
}

export function FactCheckLoading({
  currentStep,
  currentClaim,
  totalClaims,
  claims,
}: FactCheckLoadingProps) {
  return (
    <div className="space-y-6">
      {/* Status indicator */}
      <div className="flex items-center justify-center gap-3 p-4">
        <div className="relative">
          <div className="h-10 w-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-4 w-4 rounded-full bg-primary/20 animate-pulse" />
          </div>
        </div>
        <div className="text-center">
          {currentStep === "extracting" && (
            <p className="text-sm font-medium text-foreground">
              Extracting factual claims...
            </p>
          )}
          {currentStep === "checking" && (
            <>
              <p className="text-sm font-medium text-foreground">
                Fact-checking claim {currentClaim} of {totalClaims}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Searching sources and analyzing evidence
              </p>
            </>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {currentStep === "checking" && totalClaims > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{Math.round(((currentClaim - 1) / totalClaims) * 100)}%</span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${((currentClaim - 1) / totalClaims) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Extracted claims preview */}
      {claims.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Extracted Claims ({claims.length})
          </p>
          <div className="space-y-2">
            {claims.map((claim, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-2 text-sm p-2 rounded-lg transition-all ${
                  idx < currentClaim - 1
                    ? "bg-primary/10 text-foreground"
                    : idx === currentClaim - 1
                      ? "bg-primary/20 text-foreground animate-pulse"
                      : "bg-muted/30 text-muted-foreground"
                }`}
              >
                <span className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-background text-xs font-medium">
                  {idx + 1}
                </span>
                <span className="truncate">{claim}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skeleton cards */}
      {currentStep === "extracting" && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-16 w-full rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
