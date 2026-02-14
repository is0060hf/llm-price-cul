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
  if (!enabled) return { name: "トピック分類", modelName: "", description: "", inputTokens: 0, outputTokens: 0, costUsd: 0 };

  const inputTokens = convertToTokens(inputChars, language);
  let cost = 0;
  let classificationOutputTokens = 0;

  // セマンティック分類: Embedding API 1回
  if (embeddingModel) {
    cost += tokenCost(inputTokens, embeddingModel.inputPrice);
  }

  // LLMフォールバック
  if (classificationModel && fallbackRate > 0) {
    const rate = fallbackRate / 100;
    const llmInputCost = tokenCost(inputTokens, classificationModel.inputPrice);
    const rawOutputTokens = 50; // 分類結果は短い
    const llmOutputCost = tokenCost(rawOutputTokens, classificationModel.outputPrice);
    cost += (llmInputCost + llmOutputCost) * rate;
    classificationOutputTokens = Math.round(rawOutputTokens * rate);
  }

  const desc = fallbackRate > 0
    ? `Embedding分類 + LLM判定（フォールバック率${fallbackRate}%）`
    : "Embeddingによるセマンティック分類";

  return { name: "トピック分類", modelName: classificationModel?.name ?? "", description: desc, inputTokens, outputTokens: classificationOutputTokens, costUsd: cost };
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
  if (!enabled || !model) return { name: "オーケストレータ", modelName: "", description: "", inputTokens: 0, outputTokens: 0, costUsd: 0 };

  const inputTokens = convertToTokens(inputChars, language);
  const outputTokens = convertToTokens(Math.min(outputChars, 500), language);
  const cost = tokenCost(inputTokens, model.inputPrice) + tokenCost(outputTokens, model.outputPrice);

  return { name: "オーケストレータ", modelName: model.name, description: "入力内容を解析し、最適な処理経路へルーティング", inputTokens, outputTokens, costUsd: cost };
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
  if (!enabled) return { name: "意味検索", modelName: "", description: "", inputTokens: 0, outputTokens: 0, costUsd: 0 };

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

  const desc = rerankingEnabled
    ? `クエリをベクトル化し、${chunkCount}件のチャンクから検索 + リランキング`
    : `クエリをベクトル化し、${chunkCount}件のチャンクから関連情報を検索`;

  return { name: "意味検索", modelName: embeddingModel?.name ?? "", description: desc, inputTokens: chunkTokens, outputTokens: rerankOutputTokens, costUsd: cost };
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
    return { name: "再埋め込み", modelName: "", description: "", inputTokens: 0, outputTokens: 0, costUsd: 0 };
  }

  const tokens = convertToTokens(monthlyChars, language);
  const cost = tokenCost(tokens, embeddingModel.inputPrice);

  return { name: "再埋め込み", modelName: embeddingModel.name, description: `月${monthlyChars.toLocaleString()}文字のドキュメントをEmbeddingで再インデックス`, inputTokens: tokens, outputTokens: 0, costUsd: cost };
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
  if (!enabled || !webSearchTool) return { name: "Web参照", modelName: "", description: "", inputTokens: 0, outputTokens: 0, costUsd: 0 };

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

  const desc = summarization
    ? `Web検索APIを${callsPerRequest}回呼び出し、${resultCount}件の結果を取得・要約`
    : `Web検索APIを${callsPerRequest}回呼び出し、${resultCount}件の結果を取得`;

  return { name: "Web参照", modelName: summarizationModel?.name ?? webSearchTool.name, description: desc, inputTokens: resultTokens, outputTokens, costUsd: cost };
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
  if (!enabled) return { name: "会話履歴参照", modelName: "", description: "", inputTokens: 0, outputTokens: 0, costUsd: 0 };

  // 平均インプットトークン増分 = (最大参照ターン数 / 2) × (入力文字数 + 出力文字数) × トークン換算係数
  const avgTurnChars = inputChars + outputChars;
  const historyChars = (maxHistoryTurns / 2) * avgTurnChars;
  const historyTokens = convertToTokens(historyChars, language);

  return { name: "会話履歴参照", modelName: "", description: `過去${maxHistoryTurns}ターンの会話を参照（メイン応答のインプットに含算）`, inputTokens: historyTokens, outputTokens: 0, costUsd: 0 };
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

  const parts = ["システムプロンプト", "ユーザー入力"];
  if (historyTokens > 0) parts.push("履歴");
  if (ragTokens > 0) parts.push("検索結果");
  if (webTokens > 0) parts.push("Web参照結果");
  const mainDesc = promptCaching && model.cacheReadPrice !== null
    ? `${parts.join("+")}を統合して応答を生成（Prompt Caching適用）`
    : `${parts.join("+")}を統合して応答を生成`;

  return {
    name: "メインエージェント応答",
    modelName: model.name,
    description: mainDesc,
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
  if (maxCalls === 0 || !model) return { name: "サブエージェント", modelName: "", description: "", inputTokens: 0, outputTokens: 0, costUsd: 0 };

  const inputTokens = convertToTokens(inputChars, language);
  const outputTokens = convertToTokens(outputChars, language);
  const costPerCall = tokenCost(inputTokens, model.inputPrice) + tokenCost(outputTokens, model.outputPrice);

  return {
    name: "サブエージェント",
    modelName: model.name,
    description: `専門タスクをLLMで最大${maxCalls}回処理`,
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
    return { name: "会話履歴圧縮", modelName: "", description: "", inputTokens: 0, outputTokens: 0, costUsd: 0 };
  }

  // 圧縮対象: 履歴全体のトークン数
  const historyChars = maxHistoryTurns * (inputChars + outputChars);
  const historyTokens = convertToTokens(historyChars, language);
  const summaryTokens = convertToTokens(500, language); // 圧縮結果

  const costPerCompression = tokenCost(historyTokens, model.inputPrice) + tokenCost(summaryTokens, model.outputPrice);
  // 1/frequency の確率で発生
  const cost = costPerCompression / frequency;

  return { name: "会話履歴圧縮", modelName: model.name, description: `${frequency}ターンごとにLLMで会話履歴を要約・圧縮`, inputTokens: historyTokens, outputTokens: summaryTokens, costUsd: cost };
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

  // CoTフロー順: 会話履歴参照 → メインエージェント応答 → サブエージェント → 圧縮
  if (historyStep.inputTokens > 0) steps.push(historyStep);
  steps.push(mainStep);

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
      modelName: "", auxiliaryModelName: null, providerName: "", dailyRequests: 0, monthlyWorkingDays: 0,
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

export function convertSimpleToDetailed(input: SimpleModeInput, auxiliaryModelId?: number | null): DetailedModeInput {
  const preset = USE_CASE_PRESETS[input.useCaseType];
  const defaults = SIMPLE_MODE_DEFAULTS;
  const auxId = auxiliaryModelId ?? null;

  return {
    mainModelId: input.modelId,
    auxiliaryModelId: auxId,
    dailyRequests: input.dailyRequests,
    monthlyWorkingDays: defaults.monthlyWorkingDays,
    maxInputChars: input.inputLengthPreset === "custom"
      ? (input.customInputChars ?? 1000)
      : INPUT_LENGTH_PRESETS[input.inputLengthPreset as Exclude<typeof input.inputLengthPreset, "custom">],
    maxOutputChars: input.outputLengthPreset === "custom"
      ? (input.customOutputChars ?? 1500)
      : OUTPUT_LENGTH_PRESETS[input.outputLengthPreset as Exclude<typeof input.outputLengthPreset, "custom">],
    language: defaults.language,
    systemPromptChars: defaults.systemPromptChars,
    avgTurnsPerSession: defaults.avgTurnsPerSession,

    topicClassification: preset.topicClassification,
    classificationFallbackRate: defaults.classificationFallbackRate,
    classificationModelId: auxId,
    orchestrator: preset.orchestrator,
    orchestratorModelId: auxId,
    subAgentMaxCalls: preset.orchestrator ? defaults.subAgentMaxCalls : 0,
    subAgentModelId: auxId,

    semanticSearchEnabled: preset.semanticSearchEnabled,
    searchChunkCount: defaults.searchChunkCount,
    searchChunkSize: defaults.searchChunkSize,
    embeddingModelId: null,
    rerankingEnabled: false,
    rerankingModelId: auxId,
    reembeddingMonthlyChars: defaults.reembeddingMonthlyChars,

    conversationHistory: preset.conversationHistory,
    maxHistoryTurns: defaults.maxHistoryTurns,
    historyCompression: preset.conversationHistory, // 会話履歴ONなら圧縮も自動ON
    compressionFrequency: preset.conversationHistory ? defaults.compressionFrequency : 0,
    compressionModelId: auxId,

    webSearch: preset.webSearch,
    webSearchToolId: null,
    webSearchCallsPerRequest: 1,
    webSearchResultCount: defaults.webSearchResultCount,
    webSearchSummarization: false,
    summarizationModelId: auxId,

    promptCaching: defaults.promptCaching,
    safetyMargin: defaults.safetyMargin,
    currency: "USD",
    exchangeRate: defaults.exchangeRate,
  };
}
