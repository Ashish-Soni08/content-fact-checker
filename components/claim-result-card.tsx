"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, HelpCircle, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

interface ClaimResultCardProps {
  claim: string
  verdict: "true" | "false" | "uncertain"
  reason: string
  sources: string[]
  index: number
}

export function ClaimResultCard({ claim, verdict, reason, sources, index }: ClaimResultCardProps) {
  const verdictConfig = {
    true: {
      icon: CheckCircle2,
      label: "Verified",
      className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
      iconClassName: "text-emerald-400",
      borderClassName: "border-l-emerald-500",
    },
    false: {
      icon: XCircle,
      label: "False",
      className: "bg-red-500/10 text-red-400 border-red-500/30",
      iconClassName: "text-red-400",
      borderClassName: "border-l-red-500",
    },
    uncertain: {
      icon: HelpCircle,
      label: "Uncertain",
      className: "bg-amber-500/10 text-amber-400 border-amber-500/30",
      iconClassName: "text-amber-400",
      borderClassName: "border-l-amber-500",
    },
  }

  const config = verdictConfig[verdict]
  const Icon = config.icon

  return (
    <Card
      className={cn(
        "border-l-4 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:bg-card/80",
        config.borderClassName
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                config.className
              )}
            >
              <span className="text-sm font-semibold">{index + 1}</span>
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed pt-1">{claim}</p>
          </div>
          <Badge variant="outline" className={cn("shrink-0 gap-1.5", config.className)}>
            <Icon className={cn("h-3.5 w-3.5", config.iconClassName)} />
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-muted/30 p-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Analysis: </span>
            {reason}
          </p>
        </div>

        {sources.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Sources
            </p>
            <div className="space-y-1.5">
              {sources.map((source, idx) => (
                <a
                  key={idx}
                  href={source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-primary/80 hover:text-primary transition-colors group"
                >
                  <ExternalLink className="h-3 w-3 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
                  <span className="truncate">{source}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
