"use client";

import type { ComparisonEntry, CostResult } from "@/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type ComparisonTableProps = {
  entries: ComparisonEntry[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
  currency: "USD" | "JPY";
  exchangeRate: number;
  onShowDetail?: (result: CostResult) => void;
};

function formatCost(
  valueUsd: number,
  currency: "USD" | "JPY",
  exchangeRate: number
): string {
  const displayValue = currency === "JPY" ? valueUsd * exchangeRate : valueUsd;
  if (currency === "JPY") {
    return `¥${Math.round(displayValue).toLocaleString("ja-JP")}`;
  }
  return `$${displayValue.toFixed(2)}`;
}

function formatCostPerRequest(
  valueUsd: number,
  currency: "USD" | "JPY",
  exchangeRate: number
): string {
  const displayValue = currency === "JPY" ? valueUsd * exchangeRate : valueUsd;
  if (currency === "JPY") {
    return `¥${displayValue.toFixed(2)}`;
  }
  return `$${valueUsd.toFixed(6)}`;
}

function formatDiff(
  diffUsd: number,
  currency: "USD" | "JPY",
  exchangeRate: number
): string {
  const displayValue = currency === "JPY" ? diffUsd * exchangeRate : diffUsd;
  if (currency === "JPY") {
    return `+¥${Math.round(displayValue).toLocaleString("ja-JP")}`;
  }
  return `+$${displayValue.toFixed(2)}`;
}

type RowKey =
  | "monthlyCost"
  | "annualCost"
  | "dailyCost"
  | "costPerRequest"
  | "model"
  | "dailyRequests"
  | "enabledOptions"
  | "actions";

const ROW_DEFINITIONS: { key: RowKey; label: string }[] = [
  { key: "monthlyCost", label: "月額コスト" },
  { key: "annualCost", label: "年間コスト" },
  { key: "dailyCost", label: "日次コスト" },
  { key: "costPerRequest", label: "1リクエスト単価" },
  { key: "model", label: "モデル" },
  { key: "dailyRequests", label: "リクエスト数/日" },
  { key: "enabledOptions", label: "有効オプション" },
  { key: "actions", label: "操作" },
];

export function ComparisonTable({
  entries,
  onRemove,
  onClearAll,
  currency,
  exchangeRate,
  onShowDetail,
}: ComparisonTableProps) {
  if (entries.length === 0) return null;

  const minMonthlyCostUsd =
    entries.length > 1
      ? Math.min(...entries.map((e) => e.result.monthlyCostUsd))
      : null;

  function renderCell(
    entry: ComparisonEntry,
    rowKey: RowKey,
    entryIndex: number
  ): React.ReactNode {
    const { result } = entry;
    const { assumptions } = result;

    switch (rowKey) {
      case "monthlyCost": {
        const isCheapest =
          minMonthlyCostUsd !== null &&
          result.monthlyCostUsd === minMonthlyCostUsd;
        const diff = minMonthlyCostUsd !== null
          ? result.monthlyCostUsd - minMonthlyCostUsd
          : 0;

        return (
          <div>
            <span className={`font-bold text-lg tabular-nums ${isCheapest ? "text-primary" : ""}`}>
              {formatCost(result.monthlyCostUsd, currency, exchangeRate)}
            </span>
            {minMonthlyCostUsd !== null && (
              <div className="mt-1">
                {isCheapest ? (
                  <Badge variant="default" className="text-xs">
                    最安値
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {formatDiff(diff, currency, exchangeRate)}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      }
      case "annualCost":
        return (
          <span className="tabular-nums">
            {formatCost(result.annualCostUsd, currency, exchangeRate)}
          </span>
        );
      case "dailyCost":
        return (
          <span className="tabular-nums">
            {formatCost(result.dailyCostUsd, currency, exchangeRate)}
          </span>
        );
      case "costPerRequest":
        return (
          <span className="tabular-nums">
            {formatCostPerRequest(result.costPerRequest, currency, exchangeRate)}
          </span>
        );
      case "model":
        return (
          <div>
            <span className="font-medium">{assumptions.modelName}</span>
            <span className="text-muted-foreground text-xs ml-1">
              ({assumptions.providerName})
            </span>
          </div>
        );
      case "dailyRequests":
        return (
          <span className="tabular-nums">
            {assumptions.dailyRequests.toLocaleString("ja-JP")}
          </span>
        );
      case "enabledOptions":
        return (
          <div className="flex flex-wrap gap-1 justify-center">
            {assumptions.enabledOptions.length > 0 ? (
              assumptions.enabledOptions.map((opt) => (
                <Badge key={opt} variant="secondary" className="text-xs">
                  {opt}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </div>
        );
      case "actions":
        return (
          <div className="flex items-center justify-center gap-2">
            {onShowDetail && (
              <Button
                variant="outline"
                size="xs"
                onClick={() => onShowDetail(entry.result)}
              >
                詳細を見る
              </Button>
            )}
            <Button
              variant="destructive"
              size="xs"
              onClick={() => onRemove(entry.id)}
            >
              除外
            </Button>
          </div>
        );
      default:
        return "-";
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4">
        <CardTitle>比較表</CardTitle>
        <CardAction>
          <Button variant="outline" size="sm" onClick={onClearAll}>
            すべてクリア
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="table-fixed text-sm border-collapse" style={{ width: `calc(120px + ${entries.length} * 300px)` }}>
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-card border-b border-r px-3 py-2 text-left font-medium text-muted-foreground w-[120px]">
                  {/* Row header column */}
                </th>
                {entries.map((entry, i) => (
                  <th
                    key={entry.id}
                    className="border-b px-3 py-2 text-center font-medium w-[300px]"
                  >
                    <div className="font-bold">案{i + 1}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROW_DEFINITIONS.map(({ key, label }) => (
                <tr key={key}>
                  <td className="sticky left-0 z-10 bg-card border-b border-r px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap w-[120px]">
                    {label}
                  </td>
                  {entries.map((entry, i) => (
                    <td
                      key={entry.id}
                      className="border-b px-3 py-2 text-center align-top w-[300px]"
                    >
                      {renderCell(entry, key, i)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
