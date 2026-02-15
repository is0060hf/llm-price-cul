"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SimpleMode } from "@/components/SimpleMode";
import { DetailedMode } from "@/components/DetailedMode";
import { CostResult } from "@/components/CostResult";
import { SystemPromptHelper } from "@/components/SystemPromptHelper";
import { ComparisonTable } from "@/components/ComparisonTable";
import { GrowthScenario } from "@/components/GrowthScenario";
import { Disclaimer } from "@/components/Disclaimer";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { fetchMasterData } from "@/lib/api";
import {
  calcRequestCost,
  calcMonthlyCost,
  convertSimpleToDetailed,
} from "@/lib/calculation/cost-calculator";
import {
  getRecommendedAuxiliary,
} from "@/lib/constants/defaults";
import {
  loadComparisons,
  saveComparison,
  removeComparison,
  clearComparisons,
  buildComparisonLabel,
  reorderComparisons,
} from "@/lib/comparison-storage";
import type {
  MasterData,
  SimpleModeInput,
  DetailedModeInput,
  CostResult as CostResultType,
  Assumptions,
  ComparisonEntry,
  Model,
  EmbeddingModel,
  WebSearchTool,
} from "@/types";

export default function CalculatorPage() {
  const [masterData, setMasterData] = useState<MasterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CostResultType | null>(null);
  const [currency, setCurrency] = useState<"USD" | "JPY">("USD");
  const [exchangeRate, setExchangeRate] = useState(150);

  // システムプロンプト推定ヘルパー
  const [helperOpen, setHelperOpen] = useState(false);
  const [helperChars, setHelperChars] = useState<number | null>(null);

  // 比較表
  const [comparisons, setComparisons] = useState<ComparisonEntry[]>([]);

  // 算出結果へのスクロール用
  const costResultRef = useRef<HTMLDivElement>(null);

  // 比較表へのスクロール用
  const comparisonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMasterData()
      .then((data) => {
        setMasterData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
    setComparisons(loadComparisons());
  }, []);

  const findModel = useCallback(
    (id: number): Model | null => {
      return masterData?.models.find((m) => m.id === id) ?? null;
    },
    [masterData]
  );

  const findEmbedding = useCallback(
    (id: number | null): EmbeddingModel | null => {
      if (id === null) return masterData?.embeddingModels[0] ?? null;
      return masterData?.embeddingModels.find((e) => e.id === id) ?? null;
    },
    [masterData]
  );

  const findWebSearch = useCallback(
    (id: number | null): WebSearchTool | null => {
      if (id === null) return masterData?.webSearchTools[0] ?? null;
      return masterData?.webSearchTools.find((w) => w.id === id) ?? null;
    },
    [masterData]
  );

  const buildAssumptions = useCallback(
    (input: DetailedModeInput, mainModel: Model): Assumptions => {
      const enabledOptions: string[] = [];
      const optionDetails: Record<string, string> = {};

      if (input.topicClassification) {
        enabledOptions.push("トピック分類");
        optionDetails["フォールバック率"] = `${input.classificationFallbackRate}%`;
      }
      if (input.orchestrator) {
        enabledOptions.push("オーケストレータ");
        optionDetails["サブエージェント最大呼び出し"] = `${input.subAgentMaxCalls}回`;
      }
      if (input.semanticSearchEnabled) {
        enabledOptions.push("意味検索");
        optionDetails["チャンク数"] = `${input.searchChunkCount}件`;
        optionDetails["チャンクサイズ"] = `${input.searchChunkSize}文字`;
        if (input.reembeddingMonthlyChars > 0) {
          optionDetails["再埋め込み"] = `${input.reembeddingMonthlyChars.toLocaleString()}文字/月`;
        }
      }
      if (input.conversationHistory) {
        enabledOptions.push("会話履歴参照");
        optionDetails["最大ターン数"] = `${input.maxHistoryTurns}ターン`;
        if (input.historyCompression) {
          enabledOptions.push("会話履歴圧縮");
          optionDetails["圧縮頻度"] = `${input.compressionFrequency}ターンごと`;
        }
      }
      if (input.webSearch) {
        enabledOptions.push("Web参照");
        optionDetails["検索回数"] = `${input.webSearchCallsPerRequest}回/リクエスト`;
        optionDetails["検索結果取得件数"] = `${input.webSearchResultCount}件`;
      }
      if (input.promptCaching) {
        enabledOptions.push("Prompt Caching");
      }

      const auxModel = input.auxiliaryModelId ? findModel(input.auxiliaryModelId) : null;

      return {
        modelName: mainModel.name,
        auxiliaryModelName: auxModel?.name ?? null,
        providerName: mainModel.providerName,
        dailyRequests: input.dailyRequests,
        monthlyWorkingDays: input.monthlyWorkingDays,
        maxInputChars: input.maxInputChars,
        maxOutputChars: input.maxOutputChars,
        language: input.language,
        systemPromptChars: input.systemPromptChars,
        avgTurnsPerSession: input.avgTurnsPerSession,
        safetyMarginPercent: input.safetyMargin,
        currency: input.currency,
        exchangeRate: input.exchangeRate,
        enabledOptions,
        optionDetails,
      };
    },
    [findModel]
  );

  const handleSimpleCalculate = useCallback(
    (input: SimpleModeInput) => {
      if (!masterData) return;
      const mainModel = findModel(input.modelId);
      if (!mainModel) return;

      // 補助モデルをペアリング表から自動解決
      const auxModel = getRecommendedAuxiliary(mainModel, masterData.models);
      const detailed = convertSimpleToDetailed(input, auxModel?.id ?? null);
      handleDetailedCalculate(detailed);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [masterData, findModel]
  );

  const handleDetailedCalculate = useCallback(
    (input: DetailedModeInput) => {
      if (!masterData) return;

      const mainModel = findModel(input.mainModelId);
      if (!mainModel) return;

      // 補助モデル: 明示指定 → ペアリング自動解決 → メインモデルにフォールバック
      const auxiliaryModel = input.auxiliaryModelId
        ? findModel(input.auxiliaryModelId)
        : getRecommendedAuxiliary(mainModel, masterData.models);
      const auxOrMain = auxiliaryModel ?? mainModel;

      // 各ステップのモデル解決:
      // - 明示的にIDが設定されている → そのモデル
      // - null → サブエージェントはメインモデル、その他は補助モデル
      const resolveStepModel = (
        modelId: number | null,
        defaultModel: Model
      ): Model => {
        if (modelId) {
          return findModel(modelId) ?? defaultModel;
        }
        return defaultModel;
      };

      const requestResult = calcRequestCost({
        mainModel,
        language: input.language,
        systemPromptChars: input.systemPromptChars,
        maxInputChars: input.maxInputChars,
        maxOutputChars: input.maxOutputChars,
        avgTurnsPerSession: input.avgTurnsPerSession,

        topicClassification: input.topicClassification,
        classificationFallbackRate: input.classificationFallbackRate,
        classificationModel: resolveStepModel(input.classificationModelId, auxOrMain),
        orchestrator: input.orchestrator,
        orchestratorModel: resolveStepModel(input.orchestratorModelId, auxOrMain),
        subAgentMaxCalls: input.subAgentMaxCalls,
        subAgentModel: resolveStepModel(input.subAgentModelId, mainModel),

        semanticSearchEnabled: input.semanticSearchEnabled,
        searchChunkCount: input.searchChunkCount,
        searchChunkSize: input.searchChunkSize,
        embeddingModel: findEmbedding(input.embeddingModelId),
        rerankingEnabled: input.rerankingEnabled,
        rerankingModel: resolveStepModel(input.rerankingModelId, auxOrMain),
        reembeddingMonthlyChars: input.reembeddingMonthlyChars,

        conversationHistory: input.conversationHistory,
        maxHistoryTurns: input.maxHistoryTurns,
        historyCompression: input.historyCompression,
        compressionFrequency: input.compressionFrequency,
        compressionModel: resolveStepModel(input.compressionModelId, auxOrMain),

        webSearch: input.webSearch,
        webSearchTool: findWebSearch(input.webSearchToolId),
        webSearchCallsPerRequest: input.webSearchCallsPerRequest,
        webSearchResultCount: input.webSearchResultCount,
        webSearchSummarization: input.webSearchSummarization,
        summarizationModel: resolveStepModel(input.summarizationModelId, auxOrMain),

        promptCaching: input.promptCaching,
      });

      const monthly = calcMonthlyCost(
        requestResult.costPerRequest,
        input.dailyRequests,
        input.monthlyWorkingDays,
        input.safetyMargin,
        input.exchangeRate
      );

      const assumptions = buildAssumptions(input, mainModel);

      setCurrency(input.currency);
      setExchangeRate(input.exchangeRate);
      setResult({
        ...requestResult,
        ...monthly,
        safetyMarginRate: input.safetyMargin,
        exchangeRate: input.exchangeRate,
        assumptions,
      });

      // 結果表示位置までスクロール
      setTimeout(() => {
        costResultRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    },
    [masterData, findModel, findEmbedding, findWebSearch, buildAssumptions]
  );

  const comparisonLabel = result
    ? buildComparisonLabel(result.assumptions)
    : "";

  const isAlreadyInComparison = comparisons.some(
    (entry) => entry.label === comparisonLabel
  );

  const handleAddToComparison = useCallback(() => {
    if (!result) return;
    saveComparison(comparisonLabel, result);
    setComparisons(loadComparisons());
    toast.success("比較表に追加しました");
  }, [result, comparisonLabel]);

  const handleScrollToComparison = useCallback(() => {
    comparisonRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  const handleShowDetail = useCallback(
    (detailResult: CostResultType) => {
      setCurrency(detailResult.assumptions.currency === "JPY" ? "JPY" : "USD");
      setExchangeRate(detailResult.exchangeRate);
      setResult(detailResult);
      setTimeout(() => {
        costResultRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    },
    []
  );

  const handleRemoveComparison = useCallback((id: string) => {
    removeComparison(id);
    setComparisons(loadComparisons());
  }, []);

  const handleReorderComparison = useCallback((fromId: string, toId: string) => {
    const reordered = reorderComparisons(fromId, toId);
    setComparisons(reordered);
  }, []);

  const handleClearComparisons = useCallback(() => {
    clearComparisons();
    setComparisons([]);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" role="status">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">
            マスターデータを読み込み中...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20" role="alert">
        <div className="text-center text-destructive">
          <p className="text-lg font-semibold">エラーが発生しました</p>
          <p className="mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!masterData) return null;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="simple" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
          <TabsTrigger value="simple">ざっくり算定</TabsTrigger>
          <TabsTrigger value="detailed">詳細算定</TabsTrigger>
        </TabsList>

        <TabsContent value="simple" className="mt-6">
          <div className="flex justify-center">
            <SimpleMode
              models={masterData.models.filter((m) => !m.isLegacy)}
              embeddingModels={masterData.embeddingModels}
              webSearchTools={masterData.webSearchTools}
              onCalculate={handleSimpleCalculate}
            />
          </div>
        </TabsContent>

        <TabsContent value="detailed" className="mt-6">
          <div className="flex justify-center">
            <DetailedMode
              models={masterData.models}
              embeddingModels={masterData.embeddingModels}
              webSearchTools={masterData.webSearchTools}
              onCalculate={handleDetailedCalculate}
              onOpenSystemPromptHelper={() => setHelperOpen(true)}
              systemPromptCharsFromHelper={helperChars}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* 算出結果 */}
      <div ref={costResultRef} id="cost-result" />
      {result && (
        <>
          <CostResult
            result={result}
            currency={currency}
            exchangeRate={exchangeRate}
            onAddToComparison={handleAddToComparison}
            isAlreadyInComparison={isAlreadyInComparison}
            onScrollToComparison={handleScrollToComparison}
          />

          {/* 成長シナリオ */}
          <GrowthScenario
            baseMonthlyCostUsd={result.monthlyCostUsd}
            exchangeRate={exchangeRate}
            currency={currency}
          />
        </>
      )}

      {/* 比較表 */}
      <div ref={comparisonRef} id="comparison-table" />
      <ComparisonTable
        entries={comparisons}
        models={masterData.models}
        onRemove={handleRemoveComparison}
        onReorder={handleReorderComparison}
        onClearAll={handleClearComparisons}
        currency={currency}
        exchangeRate={exchangeRate}
        onShowDetail={handleShowDetail}
      />

      {/* 免責事項・算出対象の説明 */}
      <Disclaimer />

      <SystemPromptHelper
        open={helperOpen}
        onOpenChange={setHelperOpen}
        onApply={(chars) => {
          setHelperChars(chars);
          setHelperOpen(false);
        }}
      />

      <Toaster position="top-right" richColors />
    </div>
  );
}
