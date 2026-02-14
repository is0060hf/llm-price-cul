"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

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
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { ModelPriceInfo } from "@/components/ModelPriceInfo";

import type {
  Model,
  EmbeddingModel,
  WebSearchTool,
  DetailedModeInput,
  Language,
} from "@/types";

// ============================================================
// Props
// ============================================================

export type DetailedModeProps = {
  models: Model[];
  embeddingModels: EmbeddingModel[];
  webSearchTools: WebSearchTool[];
  onCalculate: (input: DetailedModeInput) => void;
  onOpenSystemPromptHelper: () => void;
  systemPromptCharsFromHelper: number | null;
};

// ============================================================
// Form schema (Zod)
// ============================================================

const languages: Language[] = ["ja", "en", "mixed"];
const currencies = ["USD", "JPY"] as const;

const detailedModeSchema = z
  .object({
    // 基本設定
    mainModelId: z.string().min(1, "使用モデルを選択してください"),
    dailyRequests: z
      .string()
      .min(1, "1日あたりの最大リクエスト数を入力してください")
      .refine((val) => !Number.isNaN(Number(val)) && Number(val) > 0, {
        message: "1以上の数値を入力してください",
      }),
    monthlyWorkingDays: z
      .string()
      .min(1, "月の稼働日数を入力してください")
      .refine((val) => !Number.isNaN(Number(val)) && Number(val) > 0, {
        message: "1以上の数値を入力してください",
      }),
    maxInputChars: z
      .string()
      .min(1, "1回あたりのユーザー入力最大文字数を入力してください")
      .refine((val) => !Number.isNaN(Number(val)) && Number(val) > 0, {
        message: "1以上の数値を入力してください",
      }),
    maxOutputChars: z
      .string()
      .min(1, "1回あたりの出力最大文字数を入力してください")
      .refine((val) => !Number.isNaN(Number(val)) && Number(val) > 0, {
        message: "1以上の数値を入力してください",
      }),
    language: z.enum(languages as [Language, ...Language[]], {
      message: "主要言語を選択してください",
    }),
    systemPromptChars: z
      .string()
      .min(1, "システムプロンプトの文字数を入力してください")
      .refine((val) => !Number.isNaN(Number(val)) && Number(val) >= 0, {
        message: "0以上の数値を入力してください",
      }),
    avgTurnsPerSession: z
      .string()
      .min(1, "1セッションあたりの平均ターン数を入力してください")
      .refine((val) => !Number.isNaN(Number(val)) && Number(val) > 0, {
        message: "1以上の数値を入力してください",
      }),

    // マルチエージェント構成
    topicClassification: z.boolean(),
    classificationFallbackRate: z.number().min(0).max(100),
    classificationModelId: z.string(),
    orchestrator: z.boolean(),
    orchestratorModelId: z.string(),
    subAgentMaxCalls: z
      .string()
      .refine((val) => !Number.isNaN(Number(val)) && Number(val) >= 0, {
        message: "0以上の数値を入力してください",
      }),
    subAgentModelId: z.string(),

    // 意味検索
    semanticSearchEnabled: z.boolean(),
    searchChunkCount: z
      .string()
      .refine((val) => !Number.isNaN(Number(val)) && Number(val) > 0, {
        message: "1以上の数値を入力してください",
      }),
    searchChunkSize: z
      .string()
      .refine((val) => !Number.isNaN(Number(val)) && Number(val) > 0, {
        message: "1以上の数値を入力してください",
      }),
    reembeddingMonthlyChars: z
      .string()
      .refine((val) => !Number.isNaN(Number(val)) && Number(val) >= 0, {
        message: "0以上の数値を入力してください",
      }),
    embeddingModelId: z.string(),
    rerankingEnabled: z.boolean(),
    rerankingModelId: z.string(),

    // 会話履歴参照
    conversationHistory: z.boolean(),
    maxHistoryTurns: z
      .string()
      .refine((val) => !Number.isNaN(Number(val)) && Number(val) >= 0, {
        message: "0以上の数値を入力してください",
      }),
    historyCompression: z.boolean(),
    compressionFrequency: z
      .string()
      .refine((val) => !Number.isNaN(Number(val)) && Number(val) > 0, {
        message: "1以上の数値を入力してください",
      }),
    compressionModelId: z.string(),

    // Web参照
    webSearch: z.boolean(),
    webSearchToolId: z.string(),
    webSearchCallsPerRequest: z
      .string()
      .refine((val) => !Number.isNaN(Number(val)) && Number(val) > 0, {
        message: "1以上の数値を入力してください",
      }),
    webSearchResultCount: z
      .string()
      .refine((val) => !Number.isNaN(Number(val)) && Number(val) > 0, {
        message: "1以上の数値を入力してください",
      }),
    webSearchSummarization: z.boolean(),
    summarizationModelId: z.string(),

    // コスト調整
    promptCaching: z.boolean(),
    safetyMargin: z.number().min(0).max(100),
    currency: z.enum(currencies),
    exchangeRate: z
      .string()
      .refine((val) => !Number.isNaN(Number(val)) && Number(val) > 0, {
        message: "0より大きい数値を入力してください",
      }),
  })
  .superRefine((data, ctx) => {
    if (data.topicClassification && !data.classificationModelId) {
      ctx.addIssue({
        code: "custom",
        message: "分類用モデルを選択してください",
        path: ["classificationModelId"],
      });
    }
    if (data.orchestrator && !data.orchestratorModelId) {
      ctx.addIssue({
        code: "custom",
        message: "オーケストレータ用モデルを選択してください",
        path: ["orchestratorModelId"],
      });
    }
    if (data.semanticSearchEnabled && !data.embeddingModelId) {
      ctx.addIssue({
        code: "custom",
        message: "Embeddingモデルを選択してください",
        path: ["embeddingModelId"],
      });
    }
    if (data.semanticSearchEnabled && data.rerankingEnabled && !data.rerankingModelId) {
      ctx.addIssue({
        code: "custom",
        message: "リランキング用モデルを選択してください",
        path: ["rerankingModelId"],
      });
    }
    if (data.conversationHistory && data.historyCompression && !data.compressionModelId) {
      ctx.addIssue({
        code: "custom",
        message: "圧縮用モデルを選択してください",
        path: ["compressionModelId"],
      });
    }
    if (data.webSearch && !data.webSearchToolId) {
      ctx.addIssue({
        code: "custom",
        message: "Web検索APIの種類を選択してください",
        path: ["webSearchToolId"],
      });
    }
    if (data.webSearch && data.webSearchSummarization && !data.summarizationModelId) {
      ctx.addIssue({
        code: "custom",
        message: "要約用モデルを選択してください",
        path: ["summarizationModelId"],
      });
    }
  });

type DetailedModeFormValues = z.infer<typeof detailedModeSchema>;

// ============================================================
// Labels
// ============================================================

const LANGUAGE_LABELS: Record<Language, string> = {
  ja: "日本語",
  en: "英語",
  mixed: "混在",
};

// ============================================================
// Component
// ============================================================

export function DetailedMode({
  models,
  embeddingModels,
  webSearchTools,
  onCalculate,
  onOpenSystemPromptHelper,
  systemPromptCharsFromHelper,
}: DetailedModeProps) {
  const nonLegacyModels = models.filter((m) => !m.isLegacy);
  const modelsByProvider = nonLegacyModels.reduce<Record<string, Model[]>>(
    (acc, m) => {
      const key = m.providerName;
      if (!acc[key]) acc[key] = [];
      acc[key].push(m);
      return acc;
    },
    {}
  );

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DetailedModeFormValues>({
    resolver: zodResolver(detailedModeSchema),
    defaultValues: {
      mainModelId: "",
      dailyRequests: "100",
      monthlyWorkingDays: "20",
      maxInputChars: "1000",
      maxOutputChars: "1500",
      language: "ja",
      systemPromptChars: "2000",
      avgTurnsPerSession: "5",

      topicClassification: false,
      classificationFallbackRate: 0,
      classificationModelId: "",
      orchestrator: false,
      orchestratorModelId: "",
      subAgentMaxCalls: "0",
      subAgentModelId: "",

      semanticSearchEnabled: false,
      searchChunkCount: "5",
      searchChunkSize: "500",
      reembeddingMonthlyChars: "0",
      embeddingModelId: "",
      rerankingEnabled: false,
      rerankingModelId: "",

      conversationHistory: false,
      maxHistoryTurns: "5",
      historyCompression: false,
      compressionFrequency: "3",
      compressionModelId: "",

      webSearch: false,
      webSearchToolId: "",
      webSearchCallsPerRequest: "1",
      webSearchResultCount: "10",
      webSearchSummarization: false,
      summarizationModelId: "",

      promptCaching: false,
      safetyMargin: 20,
      currency: "USD",
      exchangeRate: "150",
    },
  });

  const watchedMainModelId = watch("mainModelId");
  const selectedModel = watchedMainModelId
    ? models.find((m) => m.id === Number(watchedMainModelId)) ?? null
    : null;

  const watched = {
    topicClassification: watch("topicClassification"),
    orchestrator: watch("orchestrator"),
    semanticSearchEnabled: watch("semanticSearchEnabled"),
    rerankingEnabled: watch("rerankingEnabled"),
    conversationHistory: watch("conversationHistory"),
    historyCompression: watch("historyCompression"),
    webSearch: watch("webSearch"),
    webSearchSummarization: watch("webSearchSummarization"),
    currency: watch("currency"),
  };

  useEffect(() => {
    if (systemPromptCharsFromHelper !== null) {
      setValue("systemPromptChars", String(systemPromptCharsFromHelper));
    }
  }, [systemPromptCharsFromHelper, setValue]);

  const toNum = (s: string) => (s === "" ? null : Number(s));
  const toNumOrZero = (s: string) => (s === "" ? 0 : Number(s));

  const onSubmit = (data: DetailedModeFormValues) => {
    const input: DetailedModeInput = {
      mainModelId: Number(data.mainModelId),
      dailyRequests: Number(data.dailyRequests),
      monthlyWorkingDays: Number(data.monthlyWorkingDays),
      maxInputChars: Number(data.maxInputChars),
      maxOutputChars: Number(data.maxOutputChars),
      language: data.language,
      systemPromptChars: Number(data.systemPromptChars),
      avgTurnsPerSession: Number(data.avgTurnsPerSession),

      topicClassification: data.topicClassification,
      classificationFallbackRate: data.classificationFallbackRate,
      classificationModelId: data.topicClassification
        ? toNum(data.classificationModelId)
        : null,
      orchestrator: data.orchestrator,
      orchestratorModelId: data.orchestrator
        ? toNum(data.orchestratorModelId)
        : null,
      subAgentMaxCalls: toNumOrZero(data.subAgentMaxCalls),
      subAgentModelId: toNum(data.subAgentModelId) ?? null,

      semanticSearchEnabled: data.semanticSearchEnabled,
      searchChunkCount: data.semanticSearchEnabled ? Number(data.searchChunkCount) : 0,
      searchChunkSize: data.semanticSearchEnabled ? Number(data.searchChunkSize) : 0,
      reembeddingMonthlyChars: data.semanticSearchEnabled ? Number(data.reembeddingMonthlyChars) : 0,
      embeddingModelId: data.semanticSearchEnabled ? toNum(data.embeddingModelId) : null,
      rerankingEnabled: data.rerankingEnabled,
      rerankingModelId:
        data.semanticSearchEnabled && data.rerankingEnabled
          ? toNum(data.rerankingModelId)
          : null,

      conversationHistory: data.conversationHistory,
      maxHistoryTurns: data.conversationHistory
        ? Number(data.maxHistoryTurns)
        : 0,
      historyCompression: data.historyCompression,
      compressionFrequency:
        data.conversationHistory && data.historyCompression
          ? Number(data.compressionFrequency)
          : 0,
      compressionModelId:
        data.conversationHistory && data.historyCompression
          ? toNum(data.compressionModelId)
          : null,

      webSearch: data.webSearch,
      webSearchToolId: data.webSearch ? toNum(data.webSearchToolId) : null,
      webSearchCallsPerRequest: data.webSearch
        ? Number(data.webSearchCallsPerRequest)
        : 0,
      webSearchResultCount: data.webSearch
        ? Number(data.webSearchResultCount)
        : 0,
      webSearchSummarization: data.webSearchSummarization,
      summarizationModelId:
        data.webSearch && data.webSearchSummarization
          ? toNum(data.summarizationModelId)
          : null,

      promptCaching: data.promptCaching,
      safetyMargin: data.safetyMargin,
      currency: data.currency,
      exchangeRate: Number(data.exchangeRate),
    };
    onCalculate(input);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-6"
      noValidate
      aria-label="詳細算定モードフォーム"
    >
      {/* 1. 基本設定 */}
      <Card>
        <CardHeader>
          <CardTitle id="section-basic">基本設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="main-model">使用モデル</Label>
            <Controller
              name="mainModelId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  aria-invalid={!!errors.mainModelId}
                >
                  <SelectTrigger
                    id="main-model"
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
            {errors.mainModelId && (
              <p className="text-sm text-destructive" role="alert">
                {errors.mainModelId.message}
              </p>
            )}
            <ModelPriceInfo model={selectedModel} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="daily-requests">1日あたりの最大リクエスト数</Label>
              <Controller
                name="dailyRequests"
                control={control}
                render={({ field }) => (
                  <Input
                    id="daily-requests"
                    type="number"
                    min={1}
                    step={1}
                    aria-required="true"
                    aria-invalid={!!errors.dailyRequests}
                    {...field}
                  />
                )}
              />
              {errors.dailyRequests && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.dailyRequests.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthly-working-days">月の稼働日数</Label>
              <Controller
                name="monthlyWorkingDays"
                control={control}
                render={({ field }) => (
                  <Input
                    id="monthly-working-days"
                    type="number"
                    min={1}
                    max={31}
                    step={1}
                    aria-required="true"
                    aria-invalid={!!errors.monthlyWorkingDays}
                    {...field}
                  />
                )}
              />
              {errors.monthlyWorkingDays && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.monthlyWorkingDays.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="max-input-chars">
                1回あたりのユーザー入力最大文字数
              </Label>
              <Controller
                name="maxInputChars"
                control={control}
                render={({ field }) => (
                  <Input
                    id="max-input-chars"
                    type="number"
                    min={1}
                    step={1}
                    aria-required="true"
                    aria-invalid={!!errors.maxInputChars}
                    {...field}
                  />
                )}
              />
              {errors.maxInputChars && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.maxInputChars.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-output-chars">
                1回あたりの出力最大文字数
              </Label>
              <Controller
                name="maxOutputChars"
                control={control}
                render={({ field }) => (
                  <Input
                    id="max-output-chars"
                    type="number"
                    min={1}
                    step={1}
                    aria-required="true"
                    aria-invalid={!!errors.maxOutputChars}
                    {...field}
                  />
                )}
              />
              {errors.maxOutputChars && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.maxOutputChars.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">主要言語</Label>
            <Controller
              name="language"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  aria-invalid={!!errors.language}
                >
                  <SelectTrigger
                    id="language"
                    className="w-full min-w-0 sm:w-[200px]"
                    aria-label="主要言語を選択"
                    aria-required="true"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem
                        key={lang}
                        value={lang}
                        aria-label={LANGUAGE_LABELS[lang]}
                      >
                        {LANGUAGE_LABELS[lang]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.language && (
              <p className="text-sm text-destructive" role="alert">
                {errors.language.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="system-prompt-chars">システムプロンプトの文字数</Label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Controller
                name="systemPromptChars"
                control={control}
                render={({ field }) => (
                  <Input
                    id="system-prompt-chars"
                    type="number"
                    min={0}
                    step={1}
                    className="sm:max-w-[200px]"
                    aria-required="true"
                    aria-invalid={!!errors.systemPromptChars}
                    {...field}
                  />
                )}
              />
              <Button
                type="button"
                variant="outline"
                onClick={onOpenSystemPromptHelper}
                aria-label="システムプロンプトの文字数を推定するヘルパーを開く"
              >
                推定ヘルパー
              </Button>
            </div>
            {errors.systemPromptChars && (
              <p className="text-sm text-destructive" role="alert">
                {errors.systemPromptChars.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="avg-turns">1セッションあたりの平均ターン数</Label>
            <Controller
              name="avgTurnsPerSession"
              control={control}
              render={({ field }) => (
                <Input
                  id="avg-turns"
                  type="number"
                  min={1}
                  step={1}
                  className="sm:max-w-[200px]"
                  aria-required="true"
                  aria-invalid={!!errors.avgTurnsPerSession}
                  {...field}
                />
              )}
            />
            {errors.avgTurnsPerSession && (
              <p className="text-sm text-destructive" role="alert">
                {errors.avgTurnsPerSession.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 2. マルチエージェント構成 */}
      <Card>
        <CardHeader>
          <CardTitle id="section-multi-agent">マルチエージェント構成</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="topic-classification">トピック分類の有無</Label>
            <Controller
              name="topicClassification"
              control={control}
              render={({ field }) => (
                <Switch
                  id="topic-classification"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  aria-label="トピック分類を使用する"
                />
              )}
            />
          </div>

          {watched.topicClassification && (
            <>
              <div className="space-y-2">
                <Label htmlFor="classification-fallback">
                  セマンティック分類のフォールバック率（%）
                </Label>
                <Controller
                  name="classificationFallbackRate"
                  control={control}
                  render={({ field }) => (
                    <Slider
                      id="classification-fallback"
                      min={0}
                      max={100}
                      value={[field.value]}
                      onValueChange={([v]) => field.onChange(v ?? 0)}
                      aria-label="セマンティック分類のフォールバック率"
                    />
                  )}
                />
                <p className="text-sm text-muted-foreground">
                  {watch("classificationFallbackRate")}%
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="classification-model">分類用モデル</Label>
                <Controller
                  name="classificationModelId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      aria-invalid={!!errors.classificationModelId}
                    >
                      <SelectTrigger
                        id="classification-model"
                        className="w-full min-w-0"
                        aria-label="分類用モデルを選択"
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
                {errors.classificationModelId && (
                  <p className="text-sm text-destructive" role="alert">
                    {errors.classificationModelId.message}
                  </p>
                )}
              </div>
            </>
          )}

          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="orchestrator">オーケストレータの有無</Label>
            <Controller
              name="orchestrator"
              control={control}
              render={({ field }) => (
                <Switch
                  id="orchestrator"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  aria-label="オーケストレータを使用する"
                />
              )}
            />
          </div>

          {watched.orchestrator && (
            <div className="space-y-2">
              <Label htmlFor="orchestrator-model">オーケストレータ用モデル</Label>
              <Controller
                name="orchestratorModelId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    aria-invalid={!!errors.orchestratorModelId}
                  >
                    <SelectTrigger
                      id="orchestrator-model"
                      className="w-full min-w-0"
                      aria-label="オーケストレータ用モデルを選択"
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
              {errors.orchestratorModelId && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.orchestratorModelId.message}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="sub-agent-max-calls">サブエージェント最大呼び出し回数</Label>
            <Controller
              name="subAgentMaxCalls"
              control={control}
              render={({ field }) => (
                <Input
                  id="sub-agent-max-calls"
                  type="number"
                  min={0}
                  step={1}
                  className="sm:max-w-[200px]"
                  aria-invalid={!!errors.subAgentMaxCalls}
                  {...field}
                />
              )}
            />
            {errors.subAgentMaxCalls && (
              <p className="text-sm text-destructive" role="alert">
                {errors.subAgentMaxCalls.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sub-agent-model">サブエージェント用モデル</Label>
            <Controller
              name="subAgentModelId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  aria-invalid={!!errors.subAgentModelId}
                >
                  <SelectTrigger
                    id="sub-agent-model"
                    className="w-full min-w-0"
                    aria-label="サブエージェント用モデルを選択"
                  >
                    <SelectValue placeholder="モデルを選択してください（任意）" />
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
          </div>
        </CardContent>
      </Card>

      {/* 3. 意味検索 */}
      <Card>
        <CardHeader>
          <CardTitle id="section-semantic-search">意味検索</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="semantic-search-enabled">意味検索の有無</Label>
            <Controller
              name="semanticSearchEnabled"
              control={control}
              render={({ field }) => (
                <Switch
                  id="semantic-search-enabled"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  aria-label="意味検索を使用する"
                />
              )}
            />
          </div>

          {watched.semanticSearchEnabled && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="search-chunk-count">取得チャンク数</Label>
                  <Controller
                    name="searchChunkCount"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="search-chunk-count"
                        type="number"
                        min={1}
                        step={1}
                        aria-invalid={!!errors.searchChunkCount}
                        {...field}
                      />
                    )}
                  />
                  {errors.searchChunkCount && (
                    <p className="text-sm text-destructive" role="alert">
                      {errors.searchChunkCount.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="search-chunk-size">
                    1チャンクあたりの平均文字数
                  </Label>
                  <Controller
                    name="searchChunkSize"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="search-chunk-size"
                        type="number"
                        min={1}
                        step={1}
                        aria-invalid={!!errors.searchChunkSize}
                        {...field}
                      />
                    )}
                  />
                  {errors.searchChunkSize && (
                    <p className="text-sm text-destructive" role="alert">
                      {errors.searchChunkSize.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="embedding-model">Embeddingモデル</Label>
                <Controller
                  name="embeddingModelId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      aria-invalid={!!errors.embeddingModelId}
                    >
                      <SelectTrigger
                        id="embedding-model"
                        className="w-full min-w-0"
                        aria-label="Embeddingモデルを選択"
                      >
                        <SelectValue placeholder="モデルを選択してください" />
                      </SelectTrigger>
                      <SelectContent>
                        {embeddingModels.map((em) => (
                          <SelectItem
                            key={em.id}
                            value={String(em.id)}
                            aria-label={`${em.providerName} ${em.name}`}
                          >
                            {em.providerName} - {em.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.embeddingModelId && (
                  <p className="text-sm text-destructive" role="alert">
                    {errors.embeddingModelId.message}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="reranking-enabled">リランキングの有無</Label>
                <Controller
                  name="rerankingEnabled"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      id="reranking-enabled"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label="リランキングを使用する"
                    />
                  )}
                />
              </div>

              {watched.rerankingEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="reranking-model">リランキング用モデル</Label>
                  <Controller
                    name="rerankingModelId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        aria-invalid={!!errors.rerankingModelId}
                      >
                        <SelectTrigger
                          id="reranking-model"
                          className="w-full min-w-0"
                          aria-label="リランキング用モデルを選択"
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
                  {errors.rerankingModelId && (
                    <p className="text-sm text-destructive" role="alert">
                      {errors.rerankingModelId.message}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="reembedding-monthly-chars">
                  月あたりの再埋め込みドキュメント文字数
                </Label>
                <Controller
                  name="reembeddingMonthlyChars"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="reembedding-monthly-chars"
                      type="number"
                      min={0}
                      step={1}
                      placeholder="例: 500000"
                      className="sm:max-w-[200px]"
                      aria-invalid={!!errors.reembeddingMonthlyChars}
                      {...field}
                    />
                  )}
                />
                {errors.reembeddingMonthlyChars && (
                  <p className="text-sm text-destructive" role="alert">
                    {errors.reembeddingMonthlyChars.message}
                  </p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 4. 会話履歴参照 */}
      <Card>
        <CardHeader>
          <CardTitle id="section-history">会話履歴参照</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="conversation-history">会話履歴参照の有無</Label>
            <Controller
              name="conversationHistory"
              control={control}
              render={({ field }) => (
                <Switch
                  id="conversation-history"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  aria-label="会話履歴を参照する"
                />
              )}
            />
          </div>

          {watched.conversationHistory && (
            <>
              <div className="space-y-2">
                <Label htmlFor="max-history-turns">参照する最大ターン数</Label>
                <Controller
                  name="maxHistoryTurns"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="max-history-turns"
                      type="number"
                      min={0}
                      step={1}
                      className="sm:max-w-[200px]"
                      aria-invalid={!!errors.maxHistoryTurns}
                      {...field}
                    />
                  )}
                />
                {errors.maxHistoryTurns && (
                  <p className="text-sm text-destructive" role="alert">
                    {errors.maxHistoryTurns.message}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="history-compression">会話履歴圧縮の有無</Label>
                <Controller
                  name="historyCompression"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      id="history-compression"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label="会話履歴を圧縮する"
                    />
                  )}
                />
              </div>

              {watched.historyCompression && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="compression-frequency">圧縮頻度</Label>
                    <Controller
                      name="compressionFrequency"
                      control={control}
                      render={({ field }) => (
                        <Input
                          id="compression-frequency"
                          type="number"
                          min={1}
                          step={1}
                          placeholder="何ターンごと"
                          className="sm:max-w-[200px]"
                          aria-invalid={!!errors.compressionFrequency}
                          {...field}
                        />
                      )}
                    />
                    {errors.compressionFrequency && (
                      <p className="text-sm text-destructive" role="alert">
                        {errors.compressionFrequency.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="compression-model">圧縮用モデル</Label>
                    <Controller
                      name="compressionModelId"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          aria-invalid={!!errors.compressionModelId}
                        >
                          <SelectTrigger
                            id="compression-model"
                            className="w-full min-w-0"
                            aria-label="圧縮用モデルを選択"
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
                    {errors.compressionModelId && (
                      <p className="text-sm text-destructive" role="alert">
                        {errors.compressionModelId.message}
                      </p>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 5. Web参照 */}
      <Card>
        <CardHeader>
          <CardTitle id="section-web">Web参照</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="web-search">Web参照の有無</Label>
            <Controller
              name="webSearch"
              control={control}
              render={({ field }) => (
                <Switch
                  id="web-search"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  aria-label="Web参照を使用する"
                />
              )}
            />
          </div>

          {watched.webSearch && (
            <>
              <div className="space-y-2">
                <Label htmlFor="web-search-tool">Web検索APIの種類</Label>
                <Controller
                  name="webSearchToolId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      aria-invalid={!!errors.webSearchToolId}
                    >
                      <SelectTrigger
                        id="web-search-tool"
                        className="w-full min-w-0"
                        aria-label="Web検索APIの種類を選択"
                      >
                        <SelectValue placeholder="APIを選択してください" />
                      </SelectTrigger>
                      <SelectContent>
                        {webSearchTools.map((tool) => (
                          <SelectItem
                            key={tool.id}
                            value={String(tool.id)}
                            aria-label={`${tool.providerName} ${tool.name}`}
                          >
                            {tool.providerName} - {tool.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.webSearchToolId && (
                  <p className="text-sm text-destructive" role="alert">
                    {errors.webSearchToolId.message}
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="web-search-calls">
                    1リクエストあたりの検索回数
                  </Label>
                  <Controller
                    name="webSearchCallsPerRequest"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="web-search-calls"
                        type="number"
                        min={1}
                        step={1}
                        aria-invalid={!!errors.webSearchCallsPerRequest}
                        {...field}
                      />
                    )}
                  />
                  {errors.webSearchCallsPerRequest && (
                    <p className="text-sm text-destructive" role="alert">
                      {errors.webSearchCallsPerRequest.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="web-search-result-count">
                    検索結果の取得件数
                  </Label>
                  <Controller
                    name="webSearchResultCount"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="web-search-result-count"
                        type="number"
                        min={1}
                        step={1}
                        aria-invalid={!!errors.webSearchResultCount}
                        {...field}
                      />
                    )}
                  />
                  {errors.webSearchResultCount && (
                    <p className="text-sm text-destructive" role="alert">
                      {errors.webSearchResultCount.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="web-search-summarization">
                  検索結果の要約処理の有無
                </Label>
                <Controller
                  name="webSearchSummarization"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      id="web-search-summarization"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label="検索結果を要約する"
                    />
                  )}
                />
              </div>

              {watched.webSearchSummarization && (
                <div className="space-y-2">
                  <Label htmlFor="summarization-model">要約用モデル</Label>
                  <Controller
                    name="summarizationModelId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        aria-invalid={!!errors.summarizationModelId}
                      >
                        <SelectTrigger
                          id="summarization-model"
                          className="w-full min-w-0"
                          aria-label="要約用モデルを選択"
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
                  {errors.summarizationModelId && (
                    <p className="text-sm text-destructive" role="alert">
                      {errors.summarizationModelId.message}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 6. コスト調整 */}
      <Card>
        <CardHeader>
          <CardTitle id="section-cost">コスト調整</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="prompt-caching">Prompt Cachingの利用有無</Label>
            <Controller
              name="promptCaching"
              control={control}
              render={({ field }) => (
                <Switch
                  id="prompt-caching"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  aria-label="Prompt Cachingを使用する"
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="safety-margin">安全マージン（%）</Label>
            <Controller
              name="safetyMargin"
              control={control}
              render={({ field }) => (
                <Slider
                  id="safety-margin"
                  min={0}
                  max={100}
                  value={[field.value]}
                  onValueChange={([v]) => field.onChange(v ?? 0)}
                  aria-label="安全マージン"
                />
              )}
            />
            <p className="text-sm text-muted-foreground">
              {watch("safetyMargin")}%
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">表示通貨</Label>
            <Controller
              name="currency"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  aria-invalid={!!errors.currency}
                >
                  <SelectTrigger
                    id="currency"
                    className="w-full min-w-0 sm:w-[200px]"
                    aria-label="表示通貨を選択"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD" aria-label="米ドル">
                      USD
                    </SelectItem>
                    <SelectItem value="JPY" aria-label="日本円">
                      JPY
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {watched.currency === "JPY" && (
            <div className="space-y-2">
              <Label htmlFor="exchange-rate">為替レート（JPY/USD）</Label>
              <Controller
                name="exchangeRate"
                control={control}
                render={({ field }) => (
                  <Input
                    id="exchange-rate"
                    type="number"
                    min={0.01}
                    step={0.01}
                    className="sm:max-w-[200px]"
                    aria-invalid={!!errors.exchangeRate}
                    {...field}
                  />
                )}
              />
              {errors.exchangeRate && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.exchangeRate.message}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Button type="submit" className="w-full sm:w-auto">
        コストを算出する
      </Button>
    </form>
  );
}
