"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Controller } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

import type {
  Model,
  EmbeddingModel,
  WebSearchTool,
  SimpleModeInput,
  UseCaseType,
  TextLengthPreset,
} from "@/types";
import { USE_CASE_PRESETS } from "@/lib/constants/defaults";
import { ModelPriceInfo } from "@/components/ModelPriceInfo";

// ============================================================
// Props
// ============================================================

export type SimpleModeProps = {
  models: Model[];
  embeddingModels: EmbeddingModel[];
  webSearchTools: WebSearchTool[];
  onCalculate: (input: SimpleModeInput) => void;
};

// ============================================================
// Form schema (Zod)
// ============================================================

const useCaseTypes: UseCaseType[] = [
  "simpleQA",
  "knowledgeSearch",
  "customerSupport",
  "generalAssistant",
];

const textLengthPresets: TextLengthPreset[] = ["short", "medium", "long"];

const simpleModeSchema = z.object({
  modelId: z.string().min(1, "使用モデルを選択してください"),
  dailyRequests: z
    .string()
    .min(1, "1日あたりのリクエスト数を入力してください")
    .refine((val) => !Number.isNaN(Number(val)) && Number(val) > 0, {
      message: "1以上の数値を入力してください",
    }),
  inputLengthPreset: z.enum(
    ["short", "medium", "long"] as [TextLengthPreset, ...TextLengthPreset[]],
    { message: "ユーザー入力文字数を選択してください" }
  ),
  outputLengthPreset: z.enum(
    ["short", "medium", "long"] as [TextLengthPreset, ...TextLengthPreset[]],
    { message: "出力文字数を選択してください" }
  ),
  useCaseType: z.enum(useCaseTypes as [UseCaseType, ...UseCaseType[]], {
    message: "用途タイプを選択してください",
  }),
});

type SimpleModeFormValues = z.infer<typeof simpleModeSchema>;

// ============================================================
// Labels
// ============================================================

const USE_CASE_LABELS: Record<UseCaseType, string> = {
  simpleQA: "シンプルQ&A",
  knowledgeSearch: "社内ナレッジ検索",
  customerSupport: "カスタマーサポート",
  generalAssistant: "汎用AIアシスタント",
};

const INPUT_LENGTH_LABELS: Record<TextLengthPreset, string> = {
  short: "短文（〜200文字）",
  medium: "中文（〜1,000文字）",
  long: "長文（〜3,000文字）",
};

const OUTPUT_LENGTH_LABELS: Record<TextLengthPreset, string> = {
  short: "短文（〜500文字）",
  medium: "中文（〜1,500文字）",
  long: "長文（〜3,000文字）",
};

// ============================================================
// Component
// ============================================================

export function SimpleMode({
  models,
  embeddingModels,
  webSearchTools,
  onCalculate,
}: SimpleModeProps) {
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SimpleModeFormValues>({
    resolver: zodResolver(simpleModeSchema),
    defaultValues: {
      modelId: "",
      dailyRequests: "",
      inputLengthPreset: "medium",
      outputLengthPreset: "medium",
      useCaseType: "simpleQA",
    },
  });

  const selectedUseCase = watch("useCaseType");
  const selectedModelId = watch("modelId");
  const selectedModel = selectedModelId
    ? models.find((m) => m.id === Number(selectedModelId)) ?? null
    : null;

  const onSubmit = (data: SimpleModeFormValues) => {
    const input: SimpleModeInput = {
      modelId: Number(data.modelId),
      dailyRequests: Number(data.dailyRequests),
      inputLengthPreset: data.inputLengthPreset,
      outputLengthPreset: data.outputLengthPreset,
      useCaseType: data.useCaseType,
    };
    onCalculate(input);
  };

  // Group models by provider
  const modelsByProvider = models.reduce<Record<string, Model[]>>((acc, m) => {
    const key = m.providerName;
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  const preset = selectedUseCase ? USE_CASE_PRESETS[selectedUseCase] : null;

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle id="simple-mode-title">ざっくり算定モード</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-6"
          aria-labelledby="simple-mode-title"
          noValidate
        >
          {/* 1. Model selection */}
          <div className="space-y-2">
            <Label htmlFor="model-select">使用モデル</Label>
            <Controller
              name="modelId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  aria-invalid={!!errors.modelId}
                  aria-describedby={
                    errors.modelId ? "model-error" : undefined
                  }
                >
                  <SelectTrigger
                    id="model-select"
                    className="w-full min-w-0"
                    aria-label="使用モデルを選択"
                    aria-required="true"
                  >
                    <SelectValue placeholder="モデルを選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(modelsByProvider).map(
                      ([providerName, providerModels]) => (
                        <SelectGroup key={providerName}>
                          <SelectLabel>{providerName}</SelectLabel>
                          {providerModels.map((model) => (
                            <SelectItem
                              key={model.id}
                              value={String(model.id)}
                              aria-label={`${providerName} ${model.name}`}
                            >
                              {model.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )
                    )}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.modelId && (
              <p
                id="model-error"
                className="text-sm text-destructive"
                role="alert"
              >
                {errors.modelId.message}
              </p>
            )}
            <ModelPriceInfo model={selectedModel} />
          </div>

          {/* 2. Daily requests */}
          <div className="space-y-2">
            <Label htmlFor="daily-requests">1日あたりのリクエスト数</Label>
            <Controller
              name="dailyRequests"
              control={control}
              render={({ field }) => (
                <Input
                  id="daily-requests"
                  type="number"
                  min={1}
                  step={1}
                  placeholder="例: 100"
                  aria-required="true"
                  aria-invalid={!!errors.dailyRequests}
                  aria-describedby={
                    errors.dailyRequests ? "daily-requests-error" : undefined
                  }
                  {...field}
                />
              )}
            />
            {errors.dailyRequests && (
              <p
                id="daily-requests-error"
                className="text-sm text-destructive"
                role="alert"
              >
                {errors.dailyRequests.message}
              </p>
            )}
          </div>

          {/* 3. User input character count */}
          <div className="space-y-2">
            <Label htmlFor="input-length-select">
              1回あたりのユーザー入力文字数
            </Label>
            <Controller
              name="inputLengthPreset"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  aria-invalid={!!errors.inputLengthPreset}
                >
                  <SelectTrigger
                    id="input-length-select"
                    className="w-full min-w-0"
                    aria-label="ユーザー入力文字数を選択"
                    aria-required="true"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {textLengthPresets.map((preset) => (
                      <SelectItem
                        key={preset}
                        value={preset}
                        aria-label={INPUT_LENGTH_LABELS[preset]}
                      >
                        {INPUT_LENGTH_LABELS[preset]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.inputLengthPreset && (
              <p className="text-sm text-destructive" role="alert">
                {errors.inputLengthPreset.message}
              </p>
            )}
          </div>

          {/* 4. Output character count */}
          <div className="space-y-2">
            <Label htmlFor="output-length-select">
              1回あたりの出力文字数
            </Label>
            <Controller
              name="outputLengthPreset"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  aria-invalid={!!errors.outputLengthPreset}
                >
                  <SelectTrigger
                    id="output-length-select"
                    className="w-full min-w-0"
                    aria-label="出力文字数を選択"
                    aria-required="true"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {textLengthPresets.map((preset) => (
                      <SelectItem
                        key={preset}
                        value={preset}
                        aria-label={OUTPUT_LENGTH_LABELS[preset]}
                      >
                        {OUTPUT_LENGTH_LABELS[preset]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.outputLengthPreset && (
              <p className="text-sm text-destructive" role="alert">
                {errors.outputLengthPreset.message}
              </p>
            )}
          </div>

          {/* 5. Use case type */}
          <div className="space-y-2">
            <Label htmlFor="use-case-select">用途タイプ</Label>
            <Controller
              name="useCaseType"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  aria-invalid={!!errors.useCaseType}
                >
                  <SelectTrigger
                    id="use-case-select"
                    className="w-full min-w-0"
                    aria-label="用途タイプを選択"
                    aria-required="true"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {useCaseTypes.map((type) => (
                      <SelectItem
                        key={type}
                        value={type}
                        aria-label={USE_CASE_LABELS[type]}
                      >
                        {USE_CASE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.useCaseType && (
              <p className="text-sm text-destructive" role="alert">
                {errors.useCaseType.message}
              </p>
            )}

            {/* Applied options when use case is selected */}
            {preset && (
              <div
                className="mt-3 flex flex-wrap gap-2"
                role="status"
                aria-live="polite"
                aria-label="適用されるオプション"
              >
                <Badge variant="outline">
                  意味検索: {preset.semanticSearchEnabled ? "ON" : "OFF"}
                </Badge>
                <Badge variant="outline">
                  履歴: {preset.conversationHistory ? "ON" : "OFF"}
                </Badge>
                <Badge variant="outline">
                  Web: {preset.webSearch ? "ON" : "OFF"}
                </Badge>
                <Badge variant="outline">
                  分類: {preset.topicClassification ? "ON" : "OFF"}
                </Badge>
                <Badge variant="outline">
                  オーケストレータ: {preset.orchestrator ? "ON" : "OFF"}
                </Badge>
              </div>
            )}
          </div>

          <Button type="submit" className="w-full sm:w-auto">
            コストを算出する
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
