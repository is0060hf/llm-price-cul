import type {
  Language,
  Model,
  EmbeddingModel,
  WebSearchTool,
  StepCost,
  CostResult,
  SystemPromptEstimation,
  SimpleModeInput,
  DetailedModeInput,
  GrowthScenario,
  AnnualProjection,
  MonthlyProjection,
} from "@/types";
import {
  TOKEN_CONVERSION_RATES,
  SIMPLE_MODE_DEFAULTS,
  USE_CASE_PRESETS,
  INPUT_LENGTH_PRESETS,
  OUTPUT_LENGTH_PRESETS,
  ALL_ESTIMATION_MAPPINGS,
  ESTIMATION_BASE_CHARS,
} from "@/lib/constants/defaults";

// ============================================================
// 1. トークン換算 (参照: requirement.md セクション 5.1)
// ============================================================

export function convertToTokens(chars: number, language: Language): number {
  return Math.round(chars * TOKEN_CONVERSION_RATES[language]);
}

// --- ヘルパー: トークン数からコスト計算 ---
function tokenCost(tokens: number, pricePerMTokens: number): number {
  return (tokens / 1_000_000) * pricePerMTokens;
}

// ============================================================
// 2. トピック分類コスト (参照: requirement.md セクション 5.2)
// ============================================================

export function calcTopicClassificationCost(
  enabled: boolean,
  fallbackRate: number, // 0-100
  classificationModel: Model | null,
  embeddingModel: EmbeddingModel | null,
  language: Language,
  inputChars: number
): StepCost {
  if (!enabled) return { name: "トピック分類", inputTokens: 0, outputTokens: 0, costUsd: 0 };

  const inputTokens = convertToTokens(inputChars, language);
  let cost = 0;

  // セマンティック分類: Embedding API 1回
  if (embeddingModel) {
    cost += tokenCost(inputTokens, embeddingModel.inputPrice);
  }

  // LLMフォールバック
  if (classificationModel && fallbackRate > 0) {
    const rate = fallbackRate / 100;
    const llmInputCost = tokenCost(inputTokens, classificationModel.inputPrice);
    const outputTokens = 50; // 分類結果は短い
    const llmOutputCost = tokenCost(outputTokens, classificationModel.outputPrice);
    cost += (llmInputCost + llmOutputCost) * rate;
  }

  return { name: "トピック分類", inputTokens, outputTokens: 0, costUsd: cost };
}

// ============================================================
// 3. オーケストレータコスト (参照: requirement.md セクション 5.2)
// ============================================================

export function calcOrchestratorCost(
  enabled: boolean,
  model: Model | null,
  language: Language,
  inputChars: number,
  outputChars: number
): StepCost {
  if (!enabled || !model) return { name: "オーケストレータ", inputTokens: 0, outputTokens: 0, costUsd: 0 };

  const inputTokens = convertToTokens(inputChars, language);
  const outputTokens = convertToTokens(Math.min(outputChars, 500), language); // ルーティング判断は短い出力
  const cost = tokenCost(inputTokens, model.inputPrice) + tokenCost(outputTokens, model.outputPrice);

  return { name: "オーケストレータ", inputTokens, outputTokens, costUsd: cost };
}

// ============================================================
// 4. 意味検索コスト (参照: requirement.md セクション 5.2)
// ============================================================

export function calcSemanticSearchCost(
  enabled: boolean,
  chunkCount: number,
  chunkSize: number, // 文字数
  embeddingModel: EmbeddingModel | null,
  rerankingEnabled: boolean,
  rerankingModel: Model | null,
  language: Language,
  inputChars: number
): StepCost {
  if (!enabled) return { name: "意味検索", inputTokens: 0, outputTokens: 0, costUsd: 0 };

  const queryTokens = convertToTokens(inputChars, language);
  let cost = 0;

  // Embedding API 1回 (クエリ埋め込み)
  if (embeddingModel) {
    cost += tokenCost(queryTokens, embeddingModel.inputPrice);
  }

  // チャンク分のトークン増加
  const chunkTokens = convertToTokens(chunkCount * chunkSize, language);

  // リランキング (LLMベース)
  let rerankOutputTokens = 0;
  if (rerankingEnabled && rerankingModel) {
    const rerankInputTokens = chunkTokens + queryTokens;
    rerankOutputTokens = 100;
    cost += tokenCost(rerankInputTokens, rerankingModel.inputPrice) + tokenCost(rerankOutputTokens, rerankingModel.outputPrice);
  }

  return { name: "意味検索", inputTokens: chunkTokens, outputTokens: rerankOutputTokens, costUsd: cost };
}

// ============================================================
// 4b. 再埋め込みコスト（月あたり）
// ============================================================

export function calcReembeddingCost(
  monthlyChars: number,
  embeddingModel: EmbeddingModel | null,
  language: Language
): StepCost {
  if (monthlyChars <= 0 || !embeddingModel) {
    return { name: "再埋め込み", inputTokens: 0, outputTokens: 0, costUsd: 0 };
  }

  const tokens = convertToTokens(monthlyChars, language);
  const cost = tokenCost(tokens, embeddingModel.inputPrice);

  return { name: "再埋め込み", inputTokens: tokens, outputTokens: 0, costUsd: cost };
}

// ============================================================
// 5. Web参照コスト (参照: requirement.md セクション 5.2)
// ============================================================

export function calcWebSearchCost(
  enabled: boolean,
  webSearchTool: WebSearchTool | null,
  callsPerRequest: number,
  resultCount: number,
  summarization: boolean,
  summarizationModel: Model | null,
  language: Language
): StepCost {
  if (!enabled || !webSearchTool) return { name: "Web参照", inputTokens: 0, outputTokens: 0, costUsd: 0 };

  // 検索API呼び出しコスト (無料枠は考慮しない: セクション5.7)
  let cost = (callsPerRequest / 1000) * webSearchTool.pricePerKCalls;

  // 検索結果分のトークン (1結果あたり約2000文字と仮定)
  const resultChars = resultCount * 2000;
  const resultTokens = convertToTokens(resultChars, language);

  // 要約処理
  let outputTokens = 0;
  if (summarization && summarizationModel) {
    outputTokens = convertToTokens(500, language); // 要約結果
    cost += tokenCost(resultTokens, summarizationModel.inputPrice) + tokenCost(outputTokens, summarizationModel.outputPrice);
  }

  return { name: "Web参照", inputTokens: resultTokens, outputTokens, costUsd: cost };
}

// ============================================================
// 6. 会話履歴参照コスト (参照: requirement.md セクション 5.4)
// ============================================================

export function calcConversationHistoryCost(
  enabled: boolean,
  maxHistoryTurns: number,
  language: Language,
  inputChars: number,
  outputChars: number
): StepCost {
  if (!enabled) return { name: "会話履歴参照", inputTokens: 0, outputTokens: 0, costUsd: 0 };

  // 平均インプットトークン増分 = (最大参照ターン数 / 2) × (入力文字数 + 出力文字数) × トークン換算係数
  const avgTurnChars = inputChars + outputChars;
  const historyChars = (maxHistoryTurns / 2) * avgTurnChars;
  const historyTokens = convertToTokens(historyChars, language);

  return { name: "会話履歴参照", inputTokens: historyTokens, outputTokens: 0, costUsd: 0 };
}

// ============================================================
// 7. メインエージェント応答コスト (参照: requirement.md セクション 5.2)
// ============================================================

export function calcMainAgentCost(
  model: Model,
  language: Language,
  systemPromptChars: number,
  inputChars: number,
  outputChars: number,
  historyTokens: number,
  ragTokens: number,
  webTokens: number,
  promptCaching: boolean
): StepCost {
  const sysPromptTokens = convertToTokens(systemPromptChars, language);
  const userInputTokens = convertToTokens(inputChars, language);
  const totalInputTokens = sysPromptTokens + userInputTokens + historyTokens + ragTokens + webTokens;
  const outputTokens = convertToTokens(outputChars, language);

  let inputCost: number;
  if (promptCaching && model.cacheReadPrice !== null) {
    // Prompt Caching ON: システムプロンプト部分にCache Read単価、その他は通常単価
    const cachedCost = tokenCost(sysPromptTokens, model.cacheReadPrice);
    const nonCachedTokens = totalInputTokens - sysPromptTokens;
    const nonCachedCost = tokenCost(nonCachedTokens, model.inputPrice);
    inputCost = cachedCost + nonCachedCost;
  } else {
    inputCost = tokenCost(totalInputTokens, model.inputPrice);
  }

  const outputCost = tokenCost(outputTokens, model.outputPrice);

  return {
    name: "メインエージェント応答",
    inputTokens: totalInputTokens,
    outputTokens,
    costUsd: inputCost + outputCost,
  };
}

// ============================================================
// 8. サブエージェントコスト (参照: requirement.md セクション 5.2)
// ============================================================

export function calcSubAgentCost(
  maxCalls: number,
  model: Model | null,
  language: Language,
  inputChars: number,
  outputChars: number
): StepCost {
  if (maxCalls === 0 || !model) return { name: "サブエージェント", inputTokens: 0, outputTokens: 0, costUsd: 0 };

  const inputTokens = convertToTokens(inputChars, language);
  const outputTokens = convertToTokens(outputChars, language);
  const costPerCall = tokenCost(inputTokens, model.inputPrice) + tokenCost(outputTokens, model.outputPrice);

  return {
    name: "サブエージェント",
    inputTokens: inputTokens * maxCalls,
    outputTokens: outputTokens * maxCalls,
    costUsd: costPerCall * maxCalls,
  };
}

// ============================================================
// 9. 会話履歴圧縮コスト (参照: requirement.md セクション 5.2)
// ============================================================

export function calcCompressionCost(
  enabled: boolean,
  frequency: number, // 何ターンごと
  model: Model | null,
  language: Language,
  inputChars: number,
  outputChars: number,
  maxHistoryTurns: number
): StepCost {
  if (!enabled || frequency === 0 || !model) {
    return { name: "会話履歴圧縮", inputTokens: 0, outputTokens: 0, costUsd: 0 };
  }

  // 圧縮対象: 履歴全体のトークン数
  const historyChars = maxHistoryTurns * (inputChars + outputChars);
  const historyTokens = convertToTokens(historyChars, language);
  const summaryTokens = convertToTokens(500, language); // 圧縮結果

  const costPerCompression = tokenCost(historyTokens, model.inputPrice) + tokenCost(summaryTokens, model.outputPrice);
  // 1/frequency の確率で発生
  const cost = costPerCompression / frequency;

  return { name: "会話履歴圧縮", inputTokens: historyTokens, outputTokens: summaryTokens, costUsd: cost };
}

// ============================================================
// 10. 1リクエストあたりのコスト統合計算
// (参照: requirement.md セクション 5.3, 5.5, 5.6, 5.7)
// ============================================================

export type RequestCostInput = {
  mainModel: Model;
  language: Language;
  systemPromptChars: number;
  maxInputChars: number;
  maxOutputChars: number;
  avgTurnsPerSession: number;

  topicClassification: boolean;
  classificationFallbackRate: number;
  classificationModel: Model | null;

  orchestrator: boolean;
  orchestratorModel: Model | null;

  subAgentMaxCalls: number;
  subAgentModel: Model | null;

  semanticSearchEnabled: boolean;
  searchChunkCount: number;
  searchChunkSize: number;
  embeddingModel: EmbeddingModel | null;
  rerankingEnabled: boolean;
  rerankingModel: Model | null;
  reembeddingMonthlyChars: number;

  conversationHistory: boolean;
  maxHistoryTurns: number;
  historyCompression: boolean;
  compressionFrequency: number;
  compressionModel: Model | null;

  webSearch: boolean;
  webSearchTool: WebSearchTool | null;
  webSearchCallsPerRequest: number;
  webSearchResultCount: number;
  webSearchSummarization: boolean;
  summarizationModel: Model | null;

  promptCaching: boolean;
};

export function calcRequestCost(input: RequestCostInput): CostResult & { costPerRequest: number } {
  const steps: StepCost[] = [];

  // 各処理ステップのコスト計算
  const classificationStep = calcTopicClassificationCost(
    input.topicClassification, input.classificationFallbackRate,
    input.classificationModel, input.embeddingModel,
    input.language, input.maxInputChars
  );
  if (classificationStep.costUsd > 0) steps.push(classificationStep);

  const orchestratorStep = calcOrchestratorCost(
    input.orchestrator, input.orchestratorModel,
    input.language, input.maxInputChars, input.maxOutputChars
  );
  if (orchestratorStep.costUsd > 0) steps.push(orchestratorStep);

  const searchStep = calcSemanticSearchCost(
    input.semanticSearchEnabled, input.searchChunkCount, input.searchChunkSize,
    input.embeddingModel, input.rerankingEnabled, input.rerankingModel,
    input.language, input.maxInputChars
  );
  if (input.semanticSearchEnabled) steps.push(searchStep);

  const webStep = calcWebSearchCost(
    input.webSearch, input.webSearchTool,
    input.webSearchCallsPerRequest, input.webSearchResultCount,
    input.webSearchSummarization, input.summarizationModel,
    input.language
  );
  if (input.webSearch) steps.push(webStep);

  const historyStep = calcConversationHistoryCost(
    input.conversationHistory, input.maxHistoryTurns,
    input.language, input.maxInputChars, input.maxOutputChars
  );

  // メインエージェント
  const mainStep = calcMainAgentCost(
    input.mainModel, input.language,
    input.systemPromptChars, input.maxInputChars, input.maxOutputChars,
    historyStep.inputTokens, searchStep.inputTokens,
    input.webSearch ? webStep.inputTokens : 0,
    input.promptCaching
  );

  // 200K超過チェック (セクション 5.6)
  let longContextSurcharge = false;
  const totalInputTokens = mainStep.inputTokens;
  if (totalInputTokens > 200_000) {
    const providerName = input.mainModel.providerName;
    if (providerName === "Anthropic" || providerName === "Google") {
      // 2倍の割増を適用
      mainStep.costUsd = mainStep.costUsd * 2;
      longContextSurcharge = true;
    }
  }

  steps.push(mainStep);
  if (historyStep.inputTokens > 0) steps.push(historyStep);

  const subAgentStep = calcSubAgentCost(
    input.subAgentMaxCalls, input.subAgentModel,
    input.language, input.maxInputChars, input.maxOutputChars
  );
  if (subAgentStep.costUsd > 0) steps.push(subAgentStep);

  const compressionStep = calcCompressionCost(
    input.historyCompression, input.compressionFrequency,
    input.compressionModel, input.language,
    input.maxInputChars, input.maxOutputChars, input.maxHistoryTurns
  );
  if (compressionStep.costUsd > 0) steps.push(compressionStep);

  // 合算
  const costPerRequest = steps.reduce((sum, s) => sum + s.costUsd, 0);
  const totalInput = steps.reduce((sum, s) => sum + s.inputTokens, 0);
  const totalOutput = steps.reduce((sum, s) => sum + s.outputTokens, 0);

  return {
    costPerRequest,
    steps,
    dailyCostUsd: 0,
    monthlyCostUsd: 0,
    monthlyCostBeforeMargin: 0,
    monthlyCostJpy: 0,
    annualCostUsd: 0,
    annualCostJpy: 0,
    totalInputTokens: totalInput,
    totalOutputTokens: totalOutput,
    safetyMarginRate: 0,
    exchangeRate: 0,
    longContextSurcharge,
    assumptions: {
      modelName: "", providerName: "", dailyRequests: 0, monthlyWorkingDays: 0,
      maxInputChars: 0, maxOutputChars: 0, language: "ja" as const,
      systemPromptChars: 0, avgTurnsPerSession: 0, safetyMarginPercent: 0,
      currency: "USD" as const, exchangeRate: 0, enabledOptions: [], optionDetails: {},
    },
  };
}

// ============================================================
// 11. 月額コスト算出 (参照: requirement.md セクション 5.3)
// ============================================================

export function calcMonthlyCost(
  costPerRequest: number,
  dailyRequests: number,
  monthlyWorkingDays: number,
  safetyMarginPercent: number,
  exchangeRate: number
): {
  dailyCostUsd: number;
  monthlyCostUsd: number;
  monthlyCostBeforeMargin: number;
  monthlyCostJpy: number;
  annualCostUsd: number;
  annualCostJpy: number;
} {
  const dailyCostUsd = costPerRequest * dailyRequests;
  const monthlyCostBeforeMargin = dailyCostUsd * monthlyWorkingDays;
  const monthlyCostUsd = monthlyCostBeforeMargin * (1 + safetyMarginPercent / 100);
  const monthlyCostJpy = monthlyCostUsd * exchangeRate;
  const annualCostUsd = monthlyCostUsd * 12;
  const annualCostJpy = annualCostUsd * exchangeRate;

  return { dailyCostUsd, monthlyCostUsd, monthlyCostBeforeMargin, monthlyCostJpy, annualCostUsd, annualCostJpy };
}

// ============================================================
// 11b. 成長シナリオ計算
// ============================================================

export function calcGrowthProjection(
  baseMonthlyCostUsd: number,
  exchangeRate: number,
  scenario: GrowthScenario
): AnnualProjection {
  const projections: MonthlyProjection[] = [];
  let cumulativeUsd = 0;

  for (let month = 1; month <= 12; month++) {
    let multiplier: number;
    if (scenario.mode === "multiplier") {
      multiplier = scenario.monthlyMultipliers[month - 1] ?? 1;
    } else {
      multiplier = Math.pow(1 + scenario.monthlyGrowthRate / 100, month - 1);
    }

    const monthlyCostUsd = baseMonthlyCostUsd * multiplier;
    const monthlyCostJpy = monthlyCostUsd * exchangeRate;
    cumulativeUsd += monthlyCostUsd;

    projections.push({
      month,
      multiplier,
      monthlyCostUsd,
      monthlyCostJpy,
      cumulativeCostUsd: cumulativeUsd,
      cumulativeCostJpy: cumulativeUsd * exchangeRate,
    });
  }

  return {
    projections,
    totalAnnualCostUsd: cumulativeUsd,
    totalAnnualCostJpy: cumulativeUsd * exchangeRate,
  };
}

// ============================================================
// 12. システムプロンプト推定ヘルパー (参照: requirement.md セクション 4.2)
// ============================================================

export function estimateSystemPromptChars(input: SystemPromptEstimation): number {
  let total = ESTIMATION_BASE_CHARS;

  for (const [key, level] of Object.entries(input)) {
    const mapping = ALL_ESTIMATION_MAPPINGS[key as keyof typeof ALL_ESTIMATION_MAPPINGS];
    if (mapping) {
      total += mapping[level as keyof typeof mapping];
    }
  }

  return total;
}

// ============================================================
// 13. ざっくりモード → 詳細モード変換
// (参照: requirement.md セクション 2)
// ============================================================

export function convertSimpleToDetailed(input: SimpleModeInput): DetailedModeInput {
  const preset = USE_CASE_PRESETS[input.useCaseType];
  const defaults = SIMPLE_MODE_DEFAULTS;

  return {
    mainModelId: input.modelId,
    dailyRequests: input.dailyRequests,
    monthlyWorkingDays: defaults.monthlyWorkingDays,
    maxInputChars: INPUT_LENGTH_PRESETS[input.inputLengthPreset],
    maxOutputChars: OUTPUT_LENGTH_PRESETS[input.outputLengthPreset],
    language: defaults.language,
    systemPromptChars: defaults.systemPromptChars,
    avgTurnsPerSession: defaults.avgTurnsPerSession,

    topicClassification: preset.topicClassification,
    classificationFallbackRate: defaults.classificationFallbackRate,
    classificationModelId: null,
    orchestrator: preset.orchestrator,
    orchestratorModelId: null,
    subAgentMaxCalls: preset.orchestrator ? defaults.subAgentMaxCalls : 0,
    subAgentModelId: null,

    semanticSearchEnabled: preset.semanticSearchEnabled,
    searchChunkCount: defaults.searchChunkCount,
    searchChunkSize: defaults.searchChunkSize,
    embeddingModelId: null,
    rerankingEnabled: false,
    rerankingModelId: null,
    reembeddingMonthlyChars: defaults.reembeddingMonthlyChars,

    conversationHistory: preset.conversationHistory,
    maxHistoryTurns: defaults.maxHistoryTurns,
    historyCompression: defaults.historyCompression,
    compressionFrequency: 0,
    compressionModelId: null,

    webSearch: preset.webSearch,
    webSearchToolId: null,
    webSearchCallsPerRequest: 1,
    webSearchResultCount: defaults.webSearchResultCount,
    webSearchSummarization: false,
    summarizationModelId: null,

    promptCaching: defaults.promptCaching,
    safetyMargin: defaults.safetyMargin,
    currency: "USD",
    exchangeRate: defaults.exchangeRate,
  };
}
