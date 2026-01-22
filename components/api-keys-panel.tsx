"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Settings, Eye, EyeOff, Check, ExternalLink, Trash2 } from "lucide-react"

interface ApiKeysPanelProps {
  cerebrasKey: string
  parallelKey: string
  onCerebrasKeyChange: (key: string) => void
  onParallelKeyChange: (key: string) => void
}

export function ApiKeysPanel({
  cerebrasKey,
  parallelKey,
  onCerebrasKeyChange,
  onParallelKeyChange,
}: ApiKeysPanelProps) {
  const [showCerebras, setShowCerebras] = useState(false)
  const [showParallel, setShowParallel] = useState(false)
  const [localCerebras, setLocalCerebras] = useState(cerebrasKey)
  const [localParallel, setLocalParallel] = useState(parallelKey)

  useEffect(() => {
    setLocalCerebras(cerebrasKey)
    setLocalParallel(parallelKey)
  }, [cerebrasKey, parallelKey])

  const handleSave = () => {
    onCerebrasKeyChange(localCerebras)
    onParallelKeyChange(localParallel)
    localStorage.setItem("cerebras_api_key", localCerebras)
    localStorage.setItem("parallel_api_key", localParallel)
  }

  const handleClear = () => {
    setLocalCerebras("")
    setLocalParallel("")
    onCerebrasKeyChange("")
    onParallelKeyChange("")
    localStorage.removeItem("cerebras_api_key")
    localStorage.removeItem("parallel_api_key")
  }

  const keysConfigured = cerebrasKey && parallelKey
  const hasAnyKey = localCerebras || localParallel

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant={keysConfigured ? "outline" : "default"}
          size="sm"
          className="gap-2"
        >
          <Settings className="h-4 w-4" />
          {keysConfigured ? (
            <>
              <Check className="h-3 w-3 text-emerald-500" />
              <span className="text-emerald-400">Keys Set</span>
            </>
          ) : (
            "Set API Keys"
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>API Configuration</SheetTitle>
          <SheetDescription>
            Enter your API keys to enable fact-checking. Keys are stored locally in your browser.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="cerebras-key" className="text-sm font-medium">
                Cerebras API Key
              </Label>
              <a
                href="https://cloud.cerebras.ai/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                Get key <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="relative">
              <Input
                id="cerebras-key"
                type={showCerebras ? "text" : "password"}
                value={localCerebras}
                onChange={(e) => setLocalCerebras(e.target.value)}
                placeholder="csk-..."
                className="pr-10 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowCerebras(!showCerebras)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showCerebras ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {localCerebras && (
              <p className="text-xs text-emerald-500 flex items-center gap-1">
                <Check className="h-3 w-3" /> Cerebras key configured
              </p>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="parallel-key" className="text-sm font-medium">
                Parallel API Key
              </Label>
              <a
                href="https://parallel.ai/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                Get key <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="relative">
              <Input
                id="parallel-key"
                type={showParallel ? "text" : "password"}
                value={localParallel}
                onChange={(e) => setLocalParallel(e.target.value)}
                placeholder="par-..."
                className="pr-10 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowParallel(!showParallel)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showParallel ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {localParallel && (
              <p className="text-xs text-emerald-500 flex items-center gap-1">
                <Check className="h-3 w-3" /> Parallel key configured
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} className="flex-1">
              Save Keys
            </Button>
            {hasAnyKey && (
              <Button
                variant="outline"
                onClick={handleClear}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-500/30 bg-transparent"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="space-y-2 pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground text-center">
              Your keys are stored in your browser&apos;s local storage and persist between sessions.
            </p>
            <p className="text-xs text-amber-500/80 text-center">
              Note: Fact-check results are not saved and will be lost when you close the page.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
