"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { CostResult, Assumptions } from "@/types";
import { STEP_BUSINESS_VALUES } from "@/lib/constants/defaults";
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

const CHART_COLORS = [
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#65a30d",
  "#0891b2",
  "#4f46e5",
  "#be185d",
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

  const chartData = result.steps.map((step, i) => ({
    name: step.name,
    value: step.costUsd * monthlyMultiplier,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

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
              <p className="text-xs text-muted-foreground">モデル</p>
              <p className="font-medium">{result.assumptions.modelName}</p>
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

      {/* コスト内訳テーブル */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">コスト内訳（処理ステップ別・月額）</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px] text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-3 text-left font-medium">処理ステップ</th>
                  <th className="pb-3 text-right font-medium">インプットトークン<br /><span className="text-xs font-normal text-muted-foreground">(1リクエストあたり)</span></th>
                  <th className="pb-3 text-right font-medium">アウトプットトークン<br /><span className="text-xs font-normal text-muted-foreground">(1リクエストあたり)</span></th>
                  <th className="pb-3 text-right font-medium">月額コスト</th>
                </tr>
              </thead>
              <tbody>
                {result.steps.map((step) => (
                  <tr key={step.name} className="border-b last:border-0">
                    <td className="py-3">
                      <div>{step.name}</div>
                      {STEP_BUSINESS_VALUES[step.name] && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {STEP_BUSINESS_VALUES[step.name]}
                        </p>
                      )}
                    </td>
                    <td className="py-3 text-right tabular-nums">
                      {step.inputTokens.toLocaleString("ja-JP")}
                    </td>
                    <td className="py-3 text-right tabular-nums">
                      {step.outputTokens.toLocaleString("ja-JP")}
                    </td>
                    <td className="py-3 text-right tabular-nums">
                      {formatCost(step.costUsd * monthlyMultiplier, currency, exchangeRate, 2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            1リクエストあたり合計: {formatUsd(result.costPerRequest, 6)}
          </p>
        </CardContent>
      </Card>

      {/* コスト内訳チャート */}
      {result.steps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">コスト内訳グラフ（月額）</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) =>
                      `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                    }
                  >
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={chartData[index].fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number | undefined) =>
                      formatCost(value ?? 0, currency, exchangeRate, 2)
                    }
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
