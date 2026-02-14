// ============================================================
// マスターデータ型 (参照: requirement.md セクション 6.1)
// ============================================================

export type Provider = {
  id: number;
  name: string;
};

export type ModelCategory = "flagship" | "standard" | "lightweight" | "reasoning";

export type Model = {
  id: number;
  providerId: number;
  providerName: string;
  name: string;
  category: ModelCategory;
  inputPrice: number; // $/1M tokens
  outputPrice: number; // $/1M tokens
  cacheWritePrice: number | null; // Anthropic Cache Write
  cacheReadPrice: number | null; // Cache Read / Cached Input
  maxContextLength: number | null;
  isLegacy: boolean;
};

export type PricingTier = "online" | "batch";

export type EmbeddingModel = {
  id: number;
  providerId: number;
  providerName: string;
  name: string;
  inputPrice: number; // $/1M tokens
  dimensions: number | null;
  pricingTier: PricingTier;
};

export type WebSearchTool = {
  id: number;
  providerId: number;
  providerName: string;
  name: string;
  pricePerKCalls: number; // $/1K calls
  additionalPricingNotes: string | null;
};

export type MasterData = {
  providers: Provider[];
  models: Model[];
  embeddingModels: EmbeddingModel[];
  webSearchTools: WebSearchTool[];
};

// ============================================================
// 言語設定 (参照: requirement.md セクション 5.1)
// ============================================================

export type Language = "ja" | "en" | "mixed";

// ============================================================
// ざっくり算定モード (参照: requirement.md セクション 2)
// ============================================================

export type UseCaseType =
  | "simpleQA"
  | "knowledgeSearch"
  | "customerSupport"
  | "generalAssistant";

export type TextLengthPreset = "short" | "medium" | "long";

export type SimpleModeInput = {
  modelId: number;
  dailyRequests: number;
  inputLengthPreset: TextLengthPreset;
  outputLengthPreset: TextLengthPreset;
  useCaseType: UseCaseType;
};

// ============================================================
// 詳細算定モード (参照: requirement.md セクション 3.1〜3.4)
// ============================================================

export type DetailedModeInput = {
  // 基本設定 (3.1: #1〜#8)
  mainModelId: number;
  dailyRequests: number;
  monthlyWorkingDays: number;
  maxInputChars: number;
  maxOutputChars: number;
  language: Language;
  systemPromptChars: number;
  avgTurnsPerSession: number;

  // マルチエージェント構成 (3.2: #9〜#15)
  topicClassification: boolean;
  classificationFallbackRate: number; // 0〜100 (%)
  classificationModelId: number | null;
  orchestrator: boolean;
  orchestratorModelId: number | null;
  subAgentMaxCalls: number;
  subAgentModelId: number | null;

  // 意味検索 (3.3.1: #16〜#22)
  semanticSearchEnabled: boolean;
  searchChunkCount: number;
  searchChunkSize: number; // 文字数
  embeddingModelId: number | null;
  rerankingEnabled: boolean;
  rerankingModelId: number | null;
  reembeddingMonthlyChars: number; // 月あたりの再埋め込みドキュメント文字数

  // 会話履歴参照 (3.3.2: #22〜#26)
  conversationHistory: boolean;
  maxHistoryTurns: number;
  historyCompression: boolean;
  compressionFrequency: number; // 何ターンごと
  compressionModelId: number | null;

  // Web 参照 (3.3.3: #27〜#32)
  webSearch: boolean;
  webSearchToolId: number | null;
  webSearchCallsPerRequest: number;
  webSearchResultCount: number;
  webSearchSummarization: boolean;
  summarizationModelId: number | null;

  // コスト調整 (3.4: #33〜#36)
  promptCaching: boolean;
  safetyMargin: number; // 0〜100 (%)
  currency: "USD" | "JPY";
  exchangeRate: number; // JPY/USD
};

// ============================================================
// コスト計算結果 (参照: requirement.md セクション 9)
// ============================================================

export type StepCost = {
  name: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

export type Assumptions = {
  modelName: string;
  providerName: string;
  dailyRequests: number;
  monthlyWorkingDays: number;
  maxInputChars: number;
  maxOutputChars: number;
  language: Language;
  systemPromptChars: number;
  avgTurnsPerSession: number;
  safetyMarginPercent: number;
  currency: "USD" | "JPY";
  exchangeRate: number;
  // 有効オプション
  enabledOptions: string[];
  // 主要パラメータ（有効な場合のみ）
  optionDetails: Record<string, string>;
};

export type CostResult = {
  // 1リクエストあたり
  costPerRequest: number;
  steps: StepCost[];

  // 日次・月次・年間
  dailyCostUsd: number;
  monthlyCostUsd: number;
  monthlyCostBeforeMargin: number;
  monthlyCostJpy: number;
  annualCostUsd: number;
  annualCostJpy: number;

  // メタ情報
  totalInputTokens: number;
  totalOutputTokens: number;
  safetyMarginRate: number;
  exchangeRate: number;
  longContextSurcharge: boolean;

  // 前提条件
  assumptions: Assumptions;
};

// ============================================================
// 比較表 (ローカルストレージ保存)
// ============================================================

export type ComparisonEntry = {
  id: string;
  label: string;
  result: CostResult;
  createdAt: string; // ISO 8601
};

// ============================================================
// 成長シナリオ
// ============================================================

export type GrowthMode = "multiplier" | "monthlyRate";

export type GrowthScenario = {
  mode: GrowthMode;
  // 倍率指定モード: 各月の倍率（例: [1, 1, 1.2, 1.2, 1.5, 1.5, 2, 2, 2, 2.5, 2.5, 3]）
  monthlyMultipliers: number[];
  // 月次成長率モード: 月あたりの成長率（%）
  monthlyGrowthRate: number;
};

export type MonthlyProjection = {
  month: number; // 1〜12
  multiplier: number;
  monthlyCostUsd: number;
  monthlyCostJpy: number;
  cumulativeCostUsd: number;
  cumulativeCostJpy: number;
};

export type AnnualProjection = {
  projections: MonthlyProjection[];
  totalAnnualCostUsd: number;
  totalAnnualCostJpy: number;
};

// ============================================================
// システムプロンプト推定ヘルパー (参照: requirement.md セクション 4)
// ============================================================

export type EstimationLevel = "none" | "low" | "medium" | "high";

export type SystemPromptEstimation = {
  // A. 行動制約・ガードレール系
  a1Guardrails: EstimationLevel;
  a2Compliance: EstimationLevel;
  a3ProhibitedTopics: EstimationLevel;
  a4PriorityRules: EstimationLevel;
  a5ErrorHandling: EstimationLevel;

  // B. ナレッジ・ドメイン系
  b1DomainKnowledge: EstimationLevel;
  b2FewShotExamples: EstimationLevel;
  b3WorkflowDefinition: EstimationLevel;

  // C. 入出力制御系
  c1OutputFormat: EstimationLevel;
  c2PersonaTone: EstimationLevel;
  c3ResponseLength: EstimationLevel;
  c4CitationRules: EstimationLevel;
  c5MultiLanguage: EstimationLevel;

  // D. ツール・外部連携系
  d1ToolDefinitions: EstimationLevel;
  d2ReferenceInstructions: EstimationLevel;
  d3ApiIntegration: EstimationLevel;

  // E. コンテキスト・セッション系
  e1UserSegments: EstimationLevel;
  e2DynamicContext: EstimationLevel;
  e3MultiStepReasoning: EstimationLevel;
  e4ExceptionHandling: EstimationLevel;
};

// ============================================================
// 用途タイプ別プリセット (参照: requirement.md セクション 2.2)
// ============================================================

export type UseCasePreset = {
  semanticSearchEnabled: boolean;
  conversationHistory: boolean;
  webSearch: boolean;
  topicClassification: boolean;
  orchestrator: boolean;
};
