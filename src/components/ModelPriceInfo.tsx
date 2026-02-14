"use client";

import type { Model } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// プロバイダー別公式料金ページURL
const PROVIDER_PRICING_URLS: Record<string, string> = {
  OpenAI: "https://openai.com/api/pricing/",
  Anthropic: "https://www.anthropic.com/pricing",
  Google: "https://cloud.google.com/vertex-ai/generative-ai/pricing",
};

type ModelPriceInfoProps = {
  model: Model | null;
};

function formatPrice(price: number): string {
  if (price < 0.01) return `$${price.toFixed(4)}`;
  if (price < 1) return `$${price.toFixed(3)}`;
  return `$${price.toFixed(2)}`;
}

export function ModelPriceInfo({ model }: ModelPriceInfoProps) {
  if (!model) return null;

  const pricingUrl = PROVIDER_PRICING_URLS[model.providerName];

  return (
    <div
      className="rounded-lg border bg-muted/30 p-3 text-sm space-y-2"
      role="region"
      aria-label="選択中モデルの料金情報"
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-medium">{model.name}</span>
        <Badge variant="outline" className="text-xs">
          {model.providerName}
        </Badge>
        <Badge variant="secondary" className="text-xs">
          {model.category}
        </Badge>
      </div>

      <Separator />

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div className="text-muted-foreground">インプット単価</div>
        <div className="font-mono text-right">
          {formatPrice(model.inputPrice)} / 1M tokens
        </div>

        <div className="text-muted-foreground">アウトプット単価</div>
        <div className="font-mono text-right">
          {formatPrice(model.outputPrice)} / 1M tokens
        </div>

        {model.cacheReadPrice !== null && (
          <>
            <div className="text-muted-foreground">Cache Read 単価</div>
            <div className="font-mono text-right">
              {formatPrice(model.cacheReadPrice)} / 1M tokens
            </div>
          </>
        )}

        {model.cacheWritePrice !== null && (
          <>
            <div className="text-muted-foreground">Cache Write 単価</div>
            <div className="font-mono text-right">
              {formatPrice(model.cacheWritePrice)} / 1M tokens
            </div>
          </>
        )}

        {model.maxContextLength !== null && (
          <>
            <div className="text-muted-foreground">最大コンテキスト長</div>
            <div className="font-mono text-right">
              {(model.maxContextLength / 1000).toLocaleString("ja-JP")}K tokens
            </div>
          </>
        )}
      </div>

      {pricingUrl && (
        <div className="pt-1">
          <a
            href={pricingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary underline underline-offset-2 hover:text-primary/80"
          >
            {model.providerName} 公式料金ページ →
          </a>
        </div>
      )}
    </div>
  );
}
