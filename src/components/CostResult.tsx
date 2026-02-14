"use client";

import type { CostResult, Assumptions } from "@/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Check, ArrowDown } from "lucide-react";

const BAR_COLORS = [
  "bg-blue-600",
  "bg-violet-600",
  "bg-pink-600",
  "bg-orange-600",
  "bg-lime-600",
  "bg-cyan-600",
  "bg-indigo-600",
  "bg-rose-600",
];

type CostResultProps = {
  result: CostResult | null;
  currency: "USD" | "JPY";
  exchangeRate: number;
  onAddToComparison?: () => void;
  isAlreadyInComparison?: boolean;
  onScrollToComparison?: () => void;
};

function formatUsd(value: number, decimals: 2 | 6 = 2): string {
  return `$${value.toFixed(decimals)}`;
}

function formatJpy(value: number): string {
  return `¥${Math.round(value).toLocaleString("ja-JP")}`;
}

function formatCost(
  valueUsd: number,
  currency: "USD" | "JPY",
  exchangeRate: number,
  decimals: 2 | 6 = 2
): string {
  if (currency === "JPY") {
    return formatJpy(valueUsd * exchangeRate);
  }
  return formatUsd(valueUsd, decimals);
}

function formatLanguage(lang: Assumptions["language"]): string {
  return { ja: "日本語", en: "英語", mixed: "混在" }[lang];
}

export function CostResult({ result, currency, exchangeRate, onAddToComparison, isAlreadyInComparison = false, onScrollToComparison }: CostResultProps) {
  if (result === null) return null;

  const monthlyDisplay = formatCost(
    result.monthlyCostUsd,
    currency,
    exchangeRate,
    2
  );
  const dailyDisplay = formatCost(
    result.dailyCostUsd,
    currency,
    exchangeRate,
    2
  );
  const monthlyBeforeMargin = formatCost(
    result.monthlyCostBeforeMargin,
    currency,
    exchangeRate,
    2
  );

  // 月額換算乗数: 1リクエストあたりのコスト → 月額コスト
  const monthlyMultiplier =
    result.costPerRequest > 0
      ? result.monthlyCostUsd / result.costPerRequest
      : 0;

  const totalMonthlyCostFromSteps = result.steps.reduce(
    (sum, s) => sum + s.costUsd * monthlyMultiplier,
    0
  );

  return (
    <div className="space-y-6">
      {/* 月額コスト（メイン表示） */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium text-muted-foreground">
            月額コスト
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold tracking-tight md:text-5xl">
            {monthlyDisplay}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {currency === "USD" ? "USD" : "円"} / 月
          </p>
          {onAddToComparison && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                variant={isAlreadyInComparison ? "ghost" : "outline"}
                size="sm"
                onClick={onAddToComparison}
                disabled={isAlreadyInComparison}
              >
                {isAlreadyInComparison ? (
                  <>
                    <Check className="mr-1 h-4 w-4" aria-hidden="true" />
                    追加済み
                  </>
                ) : (
                  "比較表に追加"
                )}
              </Button>
              {isAlreadyInComparison && onScrollToComparison && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onScrollToComparison}
                >
                  <ArrowDown className="mr-1 h-4 w-4" aria-hidden="true" />
                  比較表を見る
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 前提条件 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">算出前提条件</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">メインモデル</p>
              <p className="font-medium">{result.assumptions.modelName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">補助モデル</p>
              <p className="font-medium">{result.assumptions.auxiliaryModelName ?? "（メインモデルと同一）"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">プロバイダー</p>
              <p className="font-medium">{result.assumptions.providerName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">リクエスト数/日</p>
              <p className="font-medium">{result.assumptions.dailyRequests.toLocaleString("ja-JP")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">稼働日数/月</p>
              <p className="font-medium">{result.assumptions.monthlyWorkingDays}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">入力最大文字数</p>
              <p className="font-medium">{result.assumptions.maxInputChars.toLocaleString("ja-JP")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">出力最大文字数</p>
              <p className="font-medium">{result.assumptions.maxOutputChars.toLocaleString("ja-JP")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">主要言語</p>
              <p className="font-medium">{formatLanguage(result.assumptions.language)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">システムプロンプト</p>
              <p className="font-medium">{result.assumptions.systemPromptChars.toLocaleString("ja-JP")}文字</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">平均ターン数</p>
              <p className="font-medium">{result.assumptions.avgTurnsPerSession}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">安全マージン</p>
              <p className="font-medium">{result.assumptions.safetyMarginPercent}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">通貨</p>
              <p className="font-medium">{result.assumptions.currency === "USD" ? "USD" : "JPY"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">為替レート</p>
              <p className="font-medium">{result.assumptions.exchangeRate} JPY/USD</p>
            </div>
          </div>
          {result.assumptions.enabledOptions.length > 0 && (
            <>
              <Separator className="my-3" />
              <div>
                <p className="text-xs text-muted-foreground mb-1">有効なオプション</p>
                <div className="flex flex-wrap gap-1">
                  {result.assumptions.enabledOptions.map((opt) => (
                    <Badge key={opt} variant="outline" className="text-xs">{opt}</Badge>
                  ))}
                </div>
              </div>
            </>
          )}
          {Object.keys(result.assumptions.optionDetails).length > 0 && (
            <>
              <Separator className="my-3" />
              <div>
                <p className="text-xs text-muted-foreground mb-1">オプション詳細</p>
                <div className="space-y-1 text-sm">
                  {Object.entries(result.assumptions.optionDetails).map(([key, value]) => (
                    <div key={key}>
                      <span className="font-medium">{key}: </span>
                      <span>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 日次コスト・通貨表示 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm text-muted-foreground">日次コスト</p>
              <p className="text-xl font-semibold">{dailyDisplay}</p>
            </div>
            <Separator className="sm:hidden" />
            <Separator
              orientation="vertical"
              className="hidden shrink-0 self-stretch sm:block"
            />
            <div>
              <p className="text-sm text-muted-foreground">年間コスト</p>
              <p className="text-xl font-semibold">{formatCost(result.annualCostUsd, currency, exchangeRate, 2)}</p>
            </div>
            <Separator className="sm:hidden" />
            <Separator
              orientation="vertical"
              className="hidden shrink-0 self-stretch sm:block"
            />
            <div>
              <p className="text-sm text-muted-foreground">表示通貨</p>
              <Badge variant="secondary">
                {currency === "USD" ? "USD ($)" : "JPY (¥)"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 安全マージン前後比較 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">安全マージン</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">マージン適用前: </span>
              <span className="font-medium">{monthlyBeforeMargin}</span>
            </div>
            <span className="text-muted-foreground">→</span>
            <div>
              <span className="text-muted-foreground">
                マージン適用後 (+{result.safetyMarginRate}%):{" "}
              </span>
              <span className="font-semibold">{monthlyDisplay}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 長文コンテキスト割増警告 */}
      {result.longContextSurcharge && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">
                長文コンテキスト割増が適用されています
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                推定インプットトークン数が 200K を超過しているため、該当プロバイダーの割増料金が適用されています。
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* トークン数合計 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">トークン数合計</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="text-sm text-muted-foreground">インプットトークン</p>
              <p className="text-lg font-semibold">
                {result.totalInputTokens.toLocaleString("ja-JP")}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">アウトプットトークン</p>
              <p className="text-lg font-semibold">
                {result.totalOutputTokens.toLocaleString("ja-JP")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* コスト内訳（カード型リスト + 水平バー） */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">コスト内訳（処理ステップ別・月額）</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {result.steps.map((step, i) => {
              const stepMonthlyCost = step.costUsd * monthlyMultiplier;
              const percent =
                totalMonthlyCostFromSteps > 0
                  ? (stepMonthlyCost / totalMonthlyCostFromSteps) * 100
                  : 0;
              const barColor = BAR_COLORS[i % BAR_COLORS.length];

              return (
                <div
                  key={step.name}
                  className="rounded-lg border p-4"
                  role="listitem"
                >
                  {/* 1行目: ステップ名（左）+ コスト + 割合（右） */}
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm">{step.name}</p>
                    <div className="flex items-baseline gap-2 shrink-0">
                      <span className="font-semibold text-sm tabular-nums">
                        {formatCost(stepMonthlyCost, currency, exchangeRate, 2)}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {percent.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* 2行目: 水平比率バー */}
                  <div
                    className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden"
                    role="progressbar"
                    aria-valuenow={Math.round(percent)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${step.name}のコスト割合: ${percent.toFixed(1)}%`}
                  >
                    <div
                      className={`h-full rounded-full transition-all ${barColor}`}
                      style={{ width: `${Math.max(percent, 0.5)}%` }}
                    />
                  </div>

                  {/* 3行目: 処理内容の説明（メイン情報） */}
                  {step.description && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {step.description}
                    </p>
                  )}

                  {/* 4行目: モデル名 + トークン数（補助情報） */}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {step.modelName && (
                      <span>
                        モデル: <span className="font-medium">{step.modelName}</span>
                      </span>
                    )}
                    {(step.inputTokens > 0 || step.outputTokens > 0) && (
                      <span className="tabular-nums">
                        入力 {step.inputTokens.toLocaleString("ja-JP")} tokens
                        {" / "}
                        出力 {step.outputTokens.toLocaleString("ja-JP")} tokens
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            1リクエストあたり合計: {formatUsd(result.costPerRequest, 6)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
