"use client";

import { useState, useMemo } from "react";
import type { SystemPromptEstimation, EstimationLevel } from "@/types";
import { estimateSystemPromptChars } from "@/lib/calculation/cost-calculator";
import {
  ALL_ESTIMATION_MAPPINGS,
  ESTIMATION_BASE_CHARS,
} from "@/lib/constants/defaults";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

type SystemPromptHelperProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (estimatedChars: number) => void;
};

const ESTIMATION_KEYS = [
  "a1Guardrails",
  "a2Compliance",
  "a3ProhibitedTopics",
  "a4PriorityRules",
  "a5ErrorHandling",
  "b1DomainKnowledge",
  "b2FewShotExamples",
  "b3WorkflowDefinition",
  "c1OutputFormat",
  "c2PersonaTone",
  "c3ResponseLength",
  "c4CitationRules",
  "c5MultiLanguage",
  "d1ToolDefinitions",
  "d2ReferenceInstructions",
  "d3ApiIntegration",
  "e1UserSegments",
  "e2DynamicContext",
  "e3MultiStepReasoning",
  "e4ExceptionHandling",
] as const;

const LEVEL_LABELS: Record<EstimationLevel, string> = {
  none: "なし",
  low: "少",
  medium: "中",
  high: "多",
};

const LEVEL_ORDER: EstimationLevel[] = ["none", "low", "medium", "high"];

const ELEMENT_CONFIG: {
  key: (typeof ESTIMATION_KEYS)[number];
  label: string;
}[] = [
  // A. 行動制約・ガードレール系
  { key: "a1Guardrails", label: "ガードレール（制約・禁止事項）" },
  { key: "a2Compliance", label: "倫理・コンプライアンス・法的制約" },
  { key: "a3ProhibitedTopics", label: "禁止トピック・話題制限" },
  { key: "a4PriorityRules", label: "優先順位・競合解決ルール" },
  { key: "a5ErrorHandling", label: "エラーハンドリング指示" },
  // B. ナレッジ・ドメイン系
  { key: "b1DomainKnowledge", label: "ドメインナレッジ・専門用語定義" },
  { key: "b2FewShotExamples", label: "Few-shot例示（入出力例）" },
  { key: "b3WorkflowDefinition", label: "ワークフロー・状態遷移の定義" },
  // C. 入出力制御系
  { key: "c1OutputFormat", label: "出力フォーマット指定" },
  { key: "c2PersonaTone", label: "ペルソナ・トーン設定" },
  { key: "c3ResponseLength", label: "回答の長さ・詳細度の制御" },
  { key: "c4CitationRules", label: "引用・ソース明示ルール" },
  { key: "c5MultiLanguage", label: "多言語対応指示" },
  // D. ツール・外部連携系
  { key: "d1ToolDefinitions", label: "ツール/Function定義の使用指示" },
  { key: "d2ReferenceInstructions", label: "RAG・Web等の参照先に関する指示" },
  { key: "d3ApiIntegration", label: "外部API連携の手順・条件" },
  // E. コンテキスト・セッション系
  { key: "e1UserSegments", label: "ユーザーセグメント別の対応指示" },
  { key: "e2DynamicContext", label: "動的コンテキスト注入枠" },
  { key: "e3MultiStepReasoning", label: "マルチステップ推論の手順指示" },
  { key: "e4ExceptionHandling", label: "特殊条件による例外処理" },
];

const CATEGORY_HEADERS: { id: string; label: string }[] = [
  { id: "A", label: "A. 行動制約・ガードレール系" },
  { id: "B", label: "B. ナレッジ・ドメイン系" },
  { id: "C", label: "C. 入出力制御系" },
  { id: "D", label: "D. ツール・外部連携系" },
  { id: "E", label: "E. コンテキスト・セッション系" },
];

function formatCharCount(value: number): string {
  if (value === 0) return "0文字";
  return `+${value.toLocaleString("ja-JP")}文字`;
}

function getInitialEstimation(): SystemPromptEstimation {
  const estimation = {} as SystemPromptEstimation;
  for (const key of ESTIMATION_KEYS) {
    estimation[key] = "none";
  }
  return estimation;
}

export function SystemPromptHelper({
  open,
  onOpenChange,
  onApply,
}: SystemPromptHelperProps) {
  const [estimation, setEstimation] =
    useState<SystemPromptEstimation>(getInitialEstimation);

  const estimatedChars = useMemo(
    () => estimateSystemPromptChars(estimation),
    [estimation]
  );

  const handleChange = (key: keyof SystemPromptEstimation, value: EstimationLevel) => {
    setEstimation((prev) => ({ ...prev, [key]: value }));
  };

  const handleApply = () => {
    onApply(estimatedChars);
    onOpenChange(false);
  };

  const getOptionsForKey = (key: keyof typeof ALL_ESTIMATION_MAPPINGS) => {
    const mapping = ALL_ESTIMATION_MAPPINGS[key];
    return LEVEL_ORDER.map((level) => ({
      level,
      label: `${LEVEL_LABELS[level]} (${formatCharCount(mapping[level])})`,
    }));
  };

  const getCategoryForKey = (key: string) => {
    const firstChar = key.charAt(0).toUpperCase();
    return firstChar;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>システムプロンプト文字数 推定ヘルパー</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 推定文字数表示 */}
          <div className="rounded-lg border bg-muted/50 p-4 text-center">
            <p className="text-sm text-muted-foreground">推定文字数</p>
            <p className="text-3xl font-bold tracking-tight">
              {estimatedChars.toLocaleString("ja-JP")} 文字
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              ベース {ESTIMATION_BASE_CHARS.toLocaleString("ja-JP")} 文字 + 各要素の合計
            </p>
          </div>

          <Separator />

          {/* カテゴリ別フォーム */}
          <div className="space-y-6">
            {CATEGORY_HEADERS.map((category) => {
              const elements = ELEMENT_CONFIG.filter(
                (e) => getCategoryForKey(e.key) === category.id
              );
              return (
                <div key={category.id} className="space-y-3">
                  <Badge variant="secondary" className="text-xs font-normal">
                    {category.label}
                  </Badge>
                  <div className="grid gap-3 sm:grid-cols-1">
                    {elements.map(({ key, label }) => (
                      <div
                        key={key}
                        className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <Label
                          htmlFor={key}
                          className="text-sm font-medium sm:min-w-0 sm:flex-1"
                        >
                          {label}
                        </Label>
                        <Select
                          value={estimation[key]}
                          onValueChange={(v) =>
                            handleChange(key, v as EstimationLevel)
                          }
                        >
                          <SelectTrigger id={key} className="sm:w-[200px]">
                            <SelectValue placeholder="選択" />
                          </SelectTrigger>
                          <SelectContent>
                            {getOptionsForKey(key).map(({ level, label }) => (
                              <SelectItem key={level} value={level}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button onClick={handleApply}>この値を適用する</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
