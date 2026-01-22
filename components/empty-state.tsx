"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Lightbulb, Newspaper, MessageSquareQuote, TrendingUp } from "lucide-react"

interface EmptyStateProps {
  onSelectExample: (text: string) => void
  keysConfigured: boolean
}

const examples = [
  {
    icon: Newspaper,
    title: "News Article",
    description: "Verify claims from recent news",
    text: `The Great Wall of China is the only man-made structure visible from space. It was built over 2,000 years ago and stretches for 13,000 miles. The wall was primarily built to protect against invasions from nomadic groups.`,
  },
  {
    icon: TrendingUp,
    title: "Tech Claims",
    description: "Check technology facts",
    text: `Apple was founded in 1976 by Steve Jobs, Steve Wozniak, and Ronald Wayne in a garage. The first iPhone was released in 2007 and sold over 1 million units in its first year. Apple became the first company to reach a $1 trillion market cap in 2018.`,
  },
  {
    icon: MessageSquareQuote,
    title: "Famous Quotes",
    description: "Verify attributed quotes",
    text: `"The definition of insanity is doing the same thing over and over and expecting different results." - Albert Einstein. "Be the change you wish to see in the world." - Mahatma Gandhi. "I have a dream" was first said by Martin Luther King Jr. in 1963.`,
  },
  {
    icon: Lightbulb,
    title: "Science Facts",
    description: "Verify scientific claims",
    text: `Water boils at 100 degrees Celsius at sea level. The human body contains about 206 bones. Light travels at approximately 186,000 miles per second. The Earth is approximately 4.5 billion years old.`,
  },
]

export function EmptyState({ onSelectExample, keysConfigured }: EmptyStateProps) {
  return (
    <div className="space-y-8 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-lg font-medium text-foreground">Try an Example</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {keysConfigured
            ? "Select one of these examples to see how the fact-checker works"
            : "Configure your API keys first, then try one of these examples"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {examples.map((example, idx) => (
          <Card
            key={idx}
            className="group relative overflow-hidden bg-card/30 border-border/50 hover:border-primary/50 hover:bg-card/50 transition-all duration-300 cursor-pointer"
            onClick={() => keysConfigured && onSelectExample(example.text)}
          >
            <div className="p-5">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <example.icon className="h-5 w-5" />
                </div>
                <div className="space-y-1 flex-1 min-w-0">
                  <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                    {example.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{example.description}</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground/70 line-clamp-2">
                &ldquo;{example.text.slice(0, 100)}...&rdquo;
              </p>
            </div>
            {!keysConfigured && (
              <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] flex items-center justify-center">
                <span className="text-xs text-muted-foreground bg-background/80 px-3 py-1.5 rounded-full">
                  Set API keys first
                </span>
              </div>
            )}
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground justify-center">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>Verified</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-red-500" />
          <span>False</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-amber-500" />
          <span>Uncertain</span>
        </div>
      </div>
    </div>
  )
}
