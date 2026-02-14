import type {
  Language,
  UseCaseType,
  UseCasePreset,
  TextLengthPreset,
  EstimationLevel,
  Model,
} from "@/types";

// ============================================================
// トークン換算係数 (参照: requirement.md セクション 5.1)
// ============================================================

export const TOKEN_CONVERSION_RATES: Record<Language, number> = {
  ja: 1.5, // 日本語: 約1.0〜1.5 → 保守的に1.5を採用
  en: 0.25, // 英語: 約0.25
  mixed: 0.7, // 混在: 約0.7
};

// ============================================================
// ざっくりモード デフォルト値 (参照: requirement.md セクション 2.3)
// ============================================================

export const SIMPLE_MODE_DEFAULTS = {
  language: "ja" as Language,
  monthlyWorkingDays: 20,
  systemPromptChars: 2000,
  avgTurnsPerSession: 5,
  searchChunkCount: 5,
  searchChunkSize: 500,
  reembeddingMonthlyChars: 0,
  maxHistoryTurns: 10,
  historyCompression: true,
  compressionFrequency: 5, // 5ターンごとに圧縮（一般的な運用範囲）
  webSearchResultCount: 3,
  classificationFallbackRate: 20, // %
  subAgentMaxCalls: 2,
  promptCaching: false,
  safetyMargin: 20, // %
  exchangeRate: 150, // JPY/USD
} as const;

// ============================================================
// 用途タイプ別プリセット (参照: requirement.md セクション 2.2)
// ============================================================

export const USE_CASE_PRESETS: Record<UseCaseType, UseCasePreset> = {
  simpleQA: {
    semanticSearchEnabled: false,
    conversationHistory: false,
    webSearch: false,
    topicClassification: false,
    orchestrator: false,
  },
  knowledgeSearch: {
    semanticSearchEnabled: true,
    conversationHistory: false,
    webSearch: false,
    topicClassification: false,
    orchestrator: false,
  },
  customerSupport: {
    semanticSearchEnabled: true,
    conversationHistory: true,
    webSearch: false,
    topicClassification: true,
    orchestrator: true,
  },
  generalAssistant: {
    semanticSearchEnabled: true,
    conversationHistory: true,
    webSearch: true,
    topicClassification: true,
    orchestrator: true,
  },
};

// ============================================================
// 入力文字数プリセット (参照: requirement.md セクション 2.1 #3, #4)
// ============================================================

export const INPUT_LENGTH_PRESETS: Record<Exclude<TextLengthPreset, "custom">, number> = {
  short: 200,
  medium: 1000,
  long: 3000,
};

export const OUTPUT_LENGTH_PRESETS: Record<Exclude<TextLengthPreset, "custom">, number> = {
  short: 500,
  medium: 1500,
  long: 3000,
};

// ============================================================
// システムプロンプト推定ヘルパー定数
// (参照: requirement.md セクション 4.1)
// ============================================================

type EstimationMapping = Record<EstimationLevel, number>;

// A. 行動制約・ガードレール系
export const ESTIMATION_A1_GUARDRAILS: EstimationMapping = {
  none: 0,
  low: 200,
  medium: 600,
  high: 1500,
};

export const ESTIMATION_A2_COMPLIANCE: EstimationMapping = {
  none: 0,
  low: 300,
  medium: 600,
  high: 1000,
};

export const ESTIMATION_A3_PROHIBITED_TOPICS: EstimationMapping = {
  none: 0,
  low: 100,
  medium: 300,
  high: 500,
};

export const ESTIMATION_A4_PRIORITY_RULES: EstimationMapping = {
  none: 0,
  low: 100,
  medium: 250,
  high: 400,
};

export const ESTIMATION_A5_ERROR_HANDLING: EstimationMapping = {
  none: 0,
  low: 200,
  medium: 400,
  high: 600,
};

// B. ナレッジ・ドメイン系
export const ESTIMATION_B1_DOMAIN_KNOWLEDGE: EstimationMapping = {
  none: 0,
  low: 300,
  medium: 1000,
  high: 2000,
};

export const ESTIMATION_B2_FEW_SHOT_EXAMPLES: EstimationMapping = {
  none: 0,
  low: 500,
  medium: 1000,
  high: 2000,
};

export const ESTIMATION_B3_WORKFLOW_DEFINITION: EstimationMapping = {
  none: 0,
  low: 300,
  medium: 800,
  high: 1500,
};

// C. 入出力制御系
export const ESTIMATION_C1_OUTPUT_FORMAT: EstimationMapping = {
  none: 0,
  low: 100,
  medium: 400,
  high: 800,
};

export const ESTIMATION_C2_PERSONA_TONE: EstimationMapping = {
  none: 0,
  low: 100,
  medium: 250,
  high: 400,
};

export const ESTIMATION_C3_RESPONSE_LENGTH: EstimationMapping = {
  none: 0,
  low: 50,
  medium: 100,
  high: 200,
};

export const ESTIMATION_C4_CITATION_RULES: EstimationMapping = {
  none: 0,
  low: 100,
  medium: 200,
  high: 300,
};

export const ESTIMATION_C5_MULTI_LANGUAGE: EstimationMapping = {
  none: 0,
  low: 200,
  medium: 400,
  high: 600,
};

// D. ツール・外部連携系
export const ESTIMATION_D1_TOOL_DEFINITIONS: EstimationMapping = {
  none: 0,
  low: 500,
  medium: 1500,
  high: 3000,
};

export const ESTIMATION_D2_REFERENCE_INSTRUCTIONS: EstimationMapping = {
  none: 0,
  low: 300,
  medium: 500,
  high: 800,
};

export const ESTIMATION_D3_API_INTEGRATION: EstimationMapping = {
  none: 0,
  low: 300,
  medium: 600,
  high: 1000,
};

// E. コンテキスト・セッション系
export const ESTIMATION_E1_USER_SEGMENTS: EstimationMapping = {
  none: 0,
  low: 300,
  medium: 600,
  high: 1000,
};

export const ESTIMATION_E2_DYNAMIC_CONTEXT: EstimationMapping = {
  none: 0,
  low: 100,
  medium: 300,
  high: 500,
};

export const ESTIMATION_E3_MULTI_STEP_REASONING: EstimationMapping = {
  none: 0,
  low: 200,
  medium: 500,
  high: 800,
};

export const ESTIMATION_E4_EXCEPTION_HANDLING: EstimationMapping = {
  none: 0,
  low: 200,
  medium: 500,
  high: 1000,
};

export const ESTIMATION_BASE_CHARS = 200;

export const ALL_ESTIMATION_MAPPINGS = {
  a1Guardrails: ESTIMATION_A1_GUARDRAILS,
  a2Compliance: ESTIMATION_A2_COMPLIANCE,
  a3ProhibitedTopics: ESTIMATION_A3_PROHIBITED_TOPICS,
  a4PriorityRules: ESTIMATION_A4_PRIORITY_RULES,
  a5ErrorHandling: ESTIMATION_A5_ERROR_HANDLING,
  b1DomainKnowledge: ESTIMATION_B1_DOMAIN_KNOWLEDGE,
  b2FewShotExamples: ESTIMATION_B2_FEW_SHOT_EXAMPLES,
  b3WorkflowDefinition: ESTIMATION_B3_WORKFLOW_DEFINITION,
  c1OutputFormat: ESTIMATION_C1_OUTPUT_FORMAT,
  c2PersonaTone: ESTIMATION_C2_PERSONA_TONE,
  c3ResponseLength: ESTIMATION_C3_RESPONSE_LENGTH,
  c4CitationRules: ESTIMATION_C4_CITATION_RULES,
  c5MultiLanguage: ESTIMATION_C5_MULTI_LANGUAGE,
  d1ToolDefinitions: ESTIMATION_D1_TOOL_DEFINITIONS,
  d2ReferenceInstructions: ESTIMATION_D2_REFERENCE_INSTRUCTIONS,
  d3ApiIntegration: ESTIMATION_D3_API_INTEGRATION,
  e1UserSegments: ESTIMATION_E1_USER_SEGMENTS,
  e2DynamicContext: ESTIMATION_E2_DYNAMIC_CONTEXT,
  e3MultiStepReasoning: ESTIMATION_E3_MULTI_STEP_REASONING,
  e4ExceptionHandling: ESTIMATION_E4_EXCEPTION_HANDLING,
} as const;

// ============================================================
// メインモデル ⇔ 補助モデル ペアリング定義
// (ベンチマーク評価に基づく推奨組み合わせ)
// キー: メインモデル名, 値: 推奨補助モデル名 (同プロバイダ)
// ============================================================

export const MODEL_PAIRINGS: Record<string, string> = {
  // OpenAI
  "GPT-5.2": "GPT-4.1 mini",
  "GPT-5.2 pro": "GPT-5 mini",
  "GPT-5 mini": "GPT-4.1 nano",
  "GPT-4.1": "GPT-4.1 nano",
  "GPT-4.1 mini": "GPT-4.1 nano",
  "GPT-4o": "GPT-4o-mini",
  "o4-mini": "GPT-4.1 nano",
  "o3-mini": "GPT-4.1 nano",
  // Anthropic
  "Claude Opus 4.6": "Claude Haiku 4.5",
  "Claude Sonnet 4.5": "Claude Haiku 4.5",
  // Google
  "Gemini 3 Pro Preview": "Gemini 3 Flash Preview",
  "Gemini 3 Flash Preview": "Gemini 2.5 Flash Lite",
  "Gemini 2.5 Pro": "Gemini 2.5 Flash",
  "Gemini 2.5 Flash": "Gemini 2.5 Flash Lite",
  "Gemini 2.0 Flash": "Gemini 2.0 Flash Lite",
};

/**
 * メインモデルに対する推奨補助モデルを解決する。
 * ペアリング表に該当があり、かつ非レガシーのモデルが allModels に存在する場合に返す。
 */
export function getRecommendedAuxiliary(
  mainModel: Model,
  allModels: Model[]
): Model | null {
  const auxiliaryName = MODEL_PAIRINGS[mainModel.name];
  if (!auxiliaryName) return null;
  return (
    allModels.find((m) => m.name === auxiliaryName && !m.isLegacy) ?? null
  );
}

/**
 * ざっくりモードのメインモデルとして適格かを判定する。
 * ペアリング表にキーとして存在するモデル = 有意な補助モデルが存在する = メインモデル適格
 */
export function isMainModelEligible(model: Model): boolean {
  return MODEL_PAIRINGS[model.name] !== undefined;
}

// ============================================================
// 処理ステップのビジネス価値説明
// ============================================================

export const STEP_BUSINESS_VALUES: Record<string, string> = {
  "トピック分類": "ユーザーの問い合わせ内容を自動分類し、適切な処理フローに振り分けます",
  "オーケストレータ": "複数のAIエージェントを統括し、最適な処理経路を判断します",
  "意味検索": "社内ドキュメントや過去事例から関連情報を検索し、回答の正確性を向上させます",
  "再埋め込み": "ドキュメントの追加・更新に伴い、検索インデックスを最新の状態に維持します",
  "Web参照": "最新のWeb情報を検索・参照し、リアルタイムな情報に基づく回答を可能にします",
  "メインエージェント応答": "ユーザーの質問に対して、収集した情報を統合して最終的な回答を生成します",
  "サブエージェント": "専門的なタスク（翻訳、要約、分析等）を分担して処理する補助エージェントです",
  "会話履歴参照": "過去の会話内容を参照することで、文脈を踏まえた一貫性のある応答を実現します",
  "会話履歴圧縮": "長くなった会話履歴を要約し、コンテキスト長の制約内で効率的に処理します",
};
