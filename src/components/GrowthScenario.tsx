"use client";

import { useState, useMemo } from "react";
import type { GrowthScenario, AnnualProjection } from "@/types";
import { calcGrowthProjection } from "@/lib/calculation/cost-calculator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ChevronRight } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type GrowthScenarioProps = {
  baseMonthlyCostUsd: number;
  exchangeRate: number;
  currency: "USD" | "JPY";
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

const MONTH_LABELS = [
  "1月",
  "2月",
  "3月",
  "4月",
  "5月",
  "6月",
  "7月",
  "8月",
  "9月",
  "10月",
  "11月",
  "12月",
];

const PRESET_GROWTH_NONE = Array(12).fill(1);
const PRESET_GROWTH_GENTLE = Array.from({ length: 12 }, (_, i) =>
  i === 0 ? 1 : 1 + (2 - 1) * (i / 11)
);
const PRESET_GROWTH_RAPID = Array.from({ length: 12 }, (_, i) =>
  i === 0 ? 1 : 1 + (5 - 1) * (i / 11)
);

export function GrowthScenario({
  baseMonthlyCostUsd,
  exchangeRate,
  currency,
}: GrowthScenarioProps) {
  const [mode, setMode] = useState<"multiplier" | "monthlyRate">("multiplier");
  const [multipliers, setMultipliers] = useState<number[]>(
    Array(12).fill(1)
  );
  const [growthRate, setGrowthRate] = useState(10);

  const scenario: GrowthScenario = useMemo(
    () =>
      mode === "multiplier"
        ? { mode: "multiplier", monthlyMultipliers: multipliers, monthlyGrowthRate: 0 }
        : { mode: "monthlyRate", monthlyMultipliers: [], monthlyGrowthRate: growthRate },
    [mode, multipliers, growthRate]
  );

  const projection: AnnualProjection = useMemo(
    () => calcGrowthProjection(baseMonthlyCostUsd, exchangeRate, scenario),
    [baseMonthlyCostUsd, exchangeRate, scenario]
  );

  const chartData = projection.projections.map((p) => ({
    month: `${p.month}月`,
    cost: currency === "JPY" ? p.monthlyCostJpy : p.monthlyCostUsd,
    costUsd: p.monthlyCostUsd,
  }));

  const totalDisplay =
    currency === "JPY"
      ? projection.totalAnnualCostJpy
      : projection.totalAnnualCostUsd;

  const formatChartValue = (value: number) =>
    currency === "JPY"
      ? `¥${Math.round(value).toLocaleString("ja-JP")}`
      : `$${value.toFixed(2)}`;

  const handleMultiplierChange = (index: number, value: string) => {
    const num = parseFloat(value) || 1;
    setMultipliers((prev) => {
      const next = [...prev];
      next[index] = num;
      return next;
    });
  };

  const applyPreset = (preset: number[]) => {
    setMultipliers([...preset]);
  };

  return (
    <Card>
      <Collapsible defaultOpen={false}>
        <CardHeader>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-2 text-left group"
            >
              <ChevronRight
                className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-90"
                aria-hidden="true"
              />
              <CardTitle>成長シナリオ</CardTitle>
              <span className="ml-auto text-xs text-muted-foreground">
                クリックして展開
              </span>
            </button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-6">
            <Tabs
          value={mode}
          onValueChange={(v) => setMode(v as "multiplier" | "monthlyRate")}
        >
          <TabsList>
            <TabsTrigger value="multiplier">倍率指定</TabsTrigger>
            <TabsTrigger value="monthlyRate">月次成長率</TabsTrigger>
          </TabsList>

          <TabsContent value="multiplier" className="space-y-4 mt-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPreset(PRESET_GROWTH_NONE)}
              >
                成長なし (全て1.0)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPreset(PRESET_GROWTH_GENTLE)}
              >
                緩やかな成長 (1→2倍)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPreset(PRESET_GROWTH_RAPID)}
              >
                急成長 (1→5倍)
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {MONTH_LABELS.map((label, i) => (
                <div key={label} className="space-y-1">
                  <Label htmlFor={`mult-${i}`} className="text-xs">
                    {label}
                  </Label>
                  <Input
                    id={`mult-${i}`}
                    type="number"
                    min={0}
                    step={0.1}
                    value={multipliers[i] ?? 1}
                    onChange={(e) => handleMultiplierChange(i, e.target.value)}
                    className="h-8"
                  />
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="monthlyRate" className="space-y-4 mt-4">
            <div className="max-w-[200px] space-y-2">
              <Label htmlFor="growth-rate">月次成長率 (%)</Label>
              <Input
                id="growth-rate"
                type="number"
                min={0}
                step={1}
                value={growthRate}
                onChange={(e) =>
                  setGrowthRate(parseFloat(e.target.value) || 0)
                }
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* 12-month BarChart */}
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis
                tickFormatter={(v) =>
                  currency === "JPY"
                    ? `¥${(v / 10000).toFixed(0)}万`
                    : `$${v.toFixed(0)}`
                }
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(value: number | undefined) => [
                    formatChartValue(value ?? 0),
                    "月額コスト",
                  ]}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid hsl(var(--border))",
                }}
              />
              <Bar
                dataKey="cost"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Year-end total */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">年間合計コスト</p>
          <p className="text-3xl font-bold mt-1">
            {currency === "JPY"
              ? `¥${Math.round(totalDisplay).toLocaleString("ja-JP")}`
              : `$${totalDisplay.toFixed(2)}`}
          </p>
        </div>

        {/* Table: 月, 倍率, 月額コスト, 累積コスト */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[400px] text-sm">
            <thead>
              <tr className="border-b">
                <th className="pb-2 text-left font-medium">月</th>
                <th className="pb-2 text-right font-medium">倍率</th>
                <th className="pb-2 text-right font-medium">月額コスト</th>
                <th className="pb-2 text-right font-medium">累積コスト</th>
              </tr>
            </thead>
            <tbody>
              {projection.projections.map((p) => (
                <tr key={p.month} className="border-b last:border-0">
                  <td className="py-2">{p.month}月</td>
                  <td className="py-2 text-right tabular-nums">
                    {p.multiplier.toFixed(2)}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {formatCost(p.monthlyCostUsd, currency, exchangeRate)}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {formatCost(p.cumulativeCostUsd, currency, exchangeRate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
