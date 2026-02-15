"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ComparisonEntry, CostResult, Model } from "@/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { GripVertical, Copy } from "lucide-react";
import { toast } from "sonner";
import { generateComparisonMarkdown } from "@/lib/comparison-export";

type ComparisonTableProps = {
  entries: ComparisonEntry[];
  models: Model[];
  onRemove: (id: string) => void;
  onReorder?: (fromId: string, toId: string) => void;
  onClearAll: () => void;
  currency: "USD" | "JPY";
  exchangeRate: number;
  onShowDetail?: (result: CostResult) => void;
};

// ドラッグ可能なヘッダーセル
function SortableColumnHeader({
  id,
  index,
  showHandle,
}: {
  id: string;
  index: number;
  showHandle: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <th
      ref={setNodeRef}
      style={style}
      className="border-b px-3 py-2 text-center font-medium w-[300px]"
    >
      <div className="flex items-center justify-center gap-1">
        {showHandle && (
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
            aria-label={`案${index + 1}を並び替え`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
        <span className="font-bold">案{index + 1}</span>
      </div>
    </th>
  );
}

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
  | "auxiliaryModel"
  | "benchmarkOverall"
  | "benchmarkGpqa"
  | "benchmarkSweBench"
  | "benchmarkAime"
  | "benchmarkArcAgi"
  | "benchmarkMmmu"
  | "dailyRequests"
  | "workingDays"
  | "inputChars"
  | "outputChars"
  | "enabledOptions"
  | "actions";

type RowDef = { key: RowKey; label: string; benchmarkRow?: boolean };

const ROW_DEFINITIONS: RowDef[] = [
  { key: "monthlyCost", label: "月額コスト" },
  { key: "annualCost", label: "年間コスト" },
  { key: "dailyCost", label: "日次コスト" },
  { key: "costPerRequest", label: "1リクエスト単価" },
  { key: "model", label: "メインモデル" },
  { key: "auxiliaryModel", label: "補助モデル" },
  // ベンチマーク行（トグルで表示/非表示）
  { key: "benchmarkOverall", label: "総合スコア", benchmarkRow: true },
  { key: "benchmarkGpqa", label: "GPQA Diamond", benchmarkRow: true },
  { key: "benchmarkSweBench", label: "SWE-bench", benchmarkRow: true },
  { key: "benchmarkAime", label: "AIME 2025", benchmarkRow: true },
  { key: "benchmarkArcAgi", label: "ARC-AGI 2", benchmarkRow: true },
  { key: "benchmarkMmmu", label: "MMMU Pro", benchmarkRow: true },
  // 条件行
  { key: "dailyRequests", label: "リクエスト数/日" },
  { key: "workingDays", label: "稼働日数/月" },
  { key: "inputChars", label: "入力文字数" },
  { key: "outputChars", label: "出力文字数" },
  { key: "enabledOptions", label: "有効オプション" },
  { key: "actions", label: "操作" },
];

export function ComparisonTable({
  entries,
  models,
  onRemove,
  onReorder,
  onClearAll,
  currency,
  exchangeRate,
  onShowDetail,
}: ComparisonTableProps) {
  const [showBenchmarks, setShowBenchmarks] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  if (entries.length === 0) return null;

  const findModelByName = (name: string): Model | undefined =>
    models.find((m) => m.name === name);

  const showDragHandles = entries.length > 2 && !!onReorder;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !onReorder) return;
    onReorder(String(active.id), String(over.id));
  }

  async function handleCopyMarkdown() {
    const md = generateComparisonMarkdown(entries, currency, exchangeRate);
    try {
      await navigator.clipboard.writeText(md);
      toast.success("マークダウンをクリップボードにコピーしました");
    } catch {
      toast.error("コピーに失敗しました");
    }
  }

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
            <div className="text-xs text-muted-foreground mt-0.5">
              安全マージン +{result.safetyMarginRate}% 込み
            </div>
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
          <div>
            <span className="tabular-nums">
              {formatCost(result.annualCostUsd, currency, exchangeRate)}
            </span>
            <div className="text-xs text-muted-foreground mt-0.5">
              安全マージン +{result.safetyMarginRate}% 込み
            </div>
          </div>
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
      case "auxiliaryModel":
        return (
          <span className="text-sm">
            {assumptions.auxiliaryModelName ?? "（メインモデルと同一）"}
          </span>
        );
      case "benchmarkOverall": {
        const m = findModelByName(assumptions.modelName);
        return m?.benchmarkOverall != null ? (
          <span className="font-semibold tabular-nums">{m.benchmarkOverall.toFixed(1)} / 10</span>
        ) : <span className="text-muted-foreground">--</span>;
      }
      case "benchmarkGpqa": {
        const m = findModelByName(assumptions.modelName);
        return m?.benchmarkGpqa != null ? (
          <span className="tabular-nums">{m.benchmarkGpqa.toFixed(1)}%</span>
        ) : <span className="text-muted-foreground">--</span>;
      }
      case "benchmarkSweBench": {
        const m = findModelByName(assumptions.modelName);
        return m?.benchmarkSweBench != null ? (
          <span className="tabular-nums">{m.benchmarkSweBench.toFixed(1)}%</span>
        ) : <span className="text-muted-foreground">--</span>;
      }
      case "benchmarkAime": {
        const m = findModelByName(assumptions.modelName);
        return m?.benchmarkAime != null ? (
          <span className="tabular-nums">{m.benchmarkAime.toFixed(1)}%</span>
        ) : <span className="text-muted-foreground">--</span>;
      }
      case "benchmarkArcAgi": {
        const m = findModelByName(assumptions.modelName);
        return m?.benchmarkArcAgi != null ? (
          <span className="tabular-nums">{m.benchmarkArcAgi.toFixed(1)}%</span>
        ) : <span className="text-muted-foreground">--</span>;
      }
      case "benchmarkMmmu": {
        const m = findModelByName(assumptions.modelName);
        return m?.benchmarkMmmu != null ? (
          <span className="tabular-nums">{m.benchmarkMmmu.toFixed(1)}%</span>
        ) : <span className="text-muted-foreground">--</span>;
      }
      case "dailyRequests":
        return (
          <span className="tabular-nums">
            {assumptions.dailyRequests.toLocaleString("ja-JP")}
          </span>
        );
      case "workingDays":
        return (
          <span className="tabular-nums">
            {assumptions.monthlyWorkingDays}日
          </span>
        );
      case "inputChars":
        return (
          <span className="tabular-nums">
            {assumptions.maxInputChars.toLocaleString("ja-JP")}文字
          </span>
        );
      case "outputChars":
        return (
          <span className="tabular-nums">
            {assumptions.maxOutputChars.toLocaleString("ja-JP")}文字
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
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="show-benchmarks"
                checked={showBenchmarks}
                onCheckedChange={setShowBenchmarks}
                aria-label="モデルスペック表示"
              />
              <Label htmlFor="show-benchmarks" className="text-sm cursor-pointer">
                モデルスペック
              </Label>
            </div>
            <Button variant="outline" size="sm" onClick={handleCopyMarkdown}>
              <Copy className="mr-1 h-4 w-4" aria-hidden="true" />
              MDコピー
            </Button>
            <Button variant="outline" size="sm" onClick={onClearAll}>
              すべてクリア
            </Button>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="table-fixed text-sm border-collapse" style={{ width: `calc(120px + ${entries.length} * 300px)` }}>
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-card border-b border-r px-3 py-2 text-left font-medium text-muted-foreground w-[120px]">
                    {/* Row header column */}
                  </th>
                  <SortableContext
                    items={entries.map((e) => e.id)}
                    strategy={horizontalListSortingStrategy}
                  >
                    {entries.map((entry, i) => (
                      <SortableColumnHeader
                        key={entry.id}
                        id={entry.id}
                        index={i}
                        showHandle={showDragHandles}
                      />
                    ))}
                  </SortableContext>
                </tr>
              </thead>
              <tbody>
                {ROW_DEFINITIONS.filter((row) => !row.benchmarkRow || showBenchmarks).map(({ key, label }) => (
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
        </DndContext>
      </CardContent>
    </Card>
  );
}
