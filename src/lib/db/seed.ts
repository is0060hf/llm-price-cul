import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

// --- Helper: UPSERT provider ---
async function upsertProvider(name: string): Promise<number> {
  const existing = await db
    .select()
    .from(schema.providers)
    .where(eq(schema.providers.name, name));
  if (existing.length > 0) {
    return existing[0].id;
  }
  const inserted = await db
    .insert(schema.providers)
    .values({ name })
    .returning({ id: schema.providers.id });
  return inserted[0].id;
}

// --- Helper: UPSERT model ---
async function upsertModel(
  providerId: number,
  data: {
    name: string;
    category: string;
    inputPricePerMTokens: number;
    outputPricePerMTokens: number;
    cacheWritePricePerMTokens: number | null;
    cacheReadPricePerMTokens: number | null;
    maxContextLength: number | null;
    isLegacy: boolean;
  }
) {
  const existing = await db
    .select()
    .from(schema.models)
    .where(eq(schema.models.name, data.name));
  if (existing.length > 0) {
    await db
      .update(schema.models)
      .set({ ...data, providerId, updatedAt: new Date() })
      .where(eq(schema.models.id, existing[0].id));
  } else {
    await db.insert(schema.models).values({ ...data, providerId });
  }
}

// --- Helper: UPSERT embedding model ---
async function upsertEmbeddingModel(
  providerId: number,
  data: {
    name: string;
    inputPricePerMTokens: number;
    dimensions: number | null;
    pricingTier: string;
  }
) {
  const existing = await db
    .select()
    .from(schema.embeddingModels)
    .where(eq(schema.embeddingModels.name, data.name));
  if (existing.length > 0) {
    await db
      .update(schema.embeddingModels)
      .set({ ...data, providerId, updatedAt: new Date() })
      .where(eq(schema.embeddingModels.id, existing[0].id));
  } else {
    await db.insert(schema.embeddingModels).values({ ...data, providerId });
  }
}

// --- Helper: UPSERT web search tool ---
async function upsertWebSearchTool(
  providerId: number,
  data: {
    name: string;
    pricePer1kCalls: number;
    additionalPricingNotes: string | null;
  }
) {
  const existing = await db
    .select()
    .from(schema.webSearchTools)
    .where(eq(schema.webSearchTools.name, data.name));
  if (existing.length > 0) {
    await db
      .update(schema.webSearchTools)
      .set({ ...data, providerId, updatedAt: new Date() })
      .where(eq(schema.webSearchTools.id, existing[0].id));
  } else {
    await db.insert(schema.webSearchTools).values({ ...data, providerId });
  }
}

// ============================================================
// SEED DATA (参照: docs/requirement.md セクション 6.2〜6.4)
// 最終取得日: 2026-02-14
// ============================================================
async function seed() {
  console.log("Seeding database...");

  // --- Providers ---
  const openaiId = await upsertProvider("OpenAI");
  const anthropicId = await upsertProvider("Anthropic");
  const googleId = await upsertProvider("Google");
  console.log("Providers seeded:", { openaiId, anthropicId, googleId });

  // =============================================
  // OpenAI テキスト生成モデル (セクション 6.2)
  // =============================================
  const openaiModels = [
    { name: "GPT-5.2", category: "flagship", inputPricePerMTokens: 1.75, outputPricePerMTokens: 14.0, cacheWritePricePerMTokens: null, cacheReadPricePerMTokens: 0.175, maxContextLength: null, isLegacy: false },
    { name: "GPT-5.2 pro", category: "flagship", inputPricePerMTokens: 21.0, outputPricePerMTokens: 168.0, cacheWritePricePerMTokens: null, cacheReadPricePerMTokens: null, maxContextLength: null, isLegacy: false },
    { name: "GPT-5 mini", category: "flagship", inputPricePerMTokens: 0.25, outputPricePerMTokens: 2.0, cacheWritePricePerMTokens: null, cacheReadPricePerMTokens: 0.025, maxContextLength: null, isLegacy: false },
    { name: "GPT-4.1", category: "standard", inputPricePerMTokens: 2.0, outputPricePerMTokens: 8.0, cacheWritePricePerMTokens: null, cacheReadPricePerMTokens: 0.5, maxContextLength: 1000000, isLegacy: false },
    { name: "GPT-4.1 mini", category: "standard", inputPricePerMTokens: 0.4, outputPricePerMTokens: 1.6, cacheWritePricePerMTokens: null, cacheReadPricePerMTokens: 0.1, maxContextLength: 1000000, isLegacy: false },
    { name: "GPT-4.1 nano", category: "lightweight", inputPricePerMTokens: 0.1, outputPricePerMTokens: 0.4, cacheWritePricePerMTokens: null, cacheReadPricePerMTokens: 0.025, maxContextLength: 1000000, isLegacy: false },
    { name: "GPT-4o", category: "standard", inputPricePerMTokens: 2.5, outputPricePerMTokens: 10.0, cacheWritePricePerMTokens: null, cacheReadPricePerMTokens: 1.25, maxContextLength: 128000, isLegacy: false },
    { name: "GPT-4o-mini", category: "lightweight", inputPricePerMTokens: 0.15, outputPricePerMTokens: 0.6, cacheWritePricePerMTokens: null, cacheReadPricePerMTokens: 0.075, maxContextLength: 128000, isLegacy: false },
  ];

  // OpenAI 推論モデル (セクション 6.2)
  const openaiReasoningModels = [
    { name: "o4-mini", category: "reasoning", inputPricePerMTokens: 1.1, outputPricePerMTokens: 4.4, cacheWritePricePerMTokens: null, cacheReadPricePerMTokens: null, maxContextLength: null, isLegacy: false },
    { name: "o3-mini", category: "reasoning", inputPricePerMTokens: 1.1, outputPricePerMTokens: 4.4, cacheWritePricePerMTokens: null, cacheReadPricePerMTokens: null, maxContextLength: null, isLegacy: false },
  ];

  for (const m of [...openaiModels, ...openaiReasoningModels]) {
    await upsertModel(openaiId, m);
  }
  console.log("OpenAI models seeded:", openaiModels.length + openaiReasoningModels.length);

  // =============================================
  // Anthropic テキスト生成モデル (セクション 6.3)
  // =============================================
  const anthropicModels = [
    // 最新モデル
    { name: "Claude Opus 4.6", category: "flagship", inputPricePerMTokens: 5.0, outputPricePerMTokens: 25.0, cacheWritePricePerMTokens: 6.25, cacheReadPricePerMTokens: 0.5, maxContextLength: 200000, isLegacy: false },
    { name: "Claude Sonnet 4.5", category: "standard", inputPricePerMTokens: 3.0, outputPricePerMTokens: 15.0, cacheWritePricePerMTokens: 3.75, cacheReadPricePerMTokens: 0.3, maxContextLength: 200000, isLegacy: false },
    { name: "Claude Haiku 4.5", category: "lightweight", inputPricePerMTokens: 1.0, outputPricePerMTokens: 5.0, cacheWritePricePerMTokens: 1.25, cacheReadPricePerMTokens: 0.1, maxContextLength: 200000, isLegacy: false },
    // レガシーモデル
    { name: "Claude Opus 4.5", category: "flagship", inputPricePerMTokens: 5.0, outputPricePerMTokens: 25.0, cacheWritePricePerMTokens: 6.25, cacheReadPricePerMTokens: 0.5, maxContextLength: null, isLegacy: true },
    { name: "Claude Opus 4.1", category: "flagship", inputPricePerMTokens: 15.0, outputPricePerMTokens: 75.0, cacheWritePricePerMTokens: 18.75, cacheReadPricePerMTokens: 1.5, maxContextLength: null, isLegacy: true },
    { name: "Claude Sonnet 4", category: "standard", inputPricePerMTokens: 3.0, outputPricePerMTokens: 15.0, cacheWritePricePerMTokens: 3.75, cacheReadPricePerMTokens: 0.3, maxContextLength: null, isLegacy: true },
    { name: "Claude Opus 4", category: "flagship", inputPricePerMTokens: 15.0, outputPricePerMTokens: 75.0, cacheWritePricePerMTokens: 18.75, cacheReadPricePerMTokens: 1.5, maxContextLength: null, isLegacy: true },
    { name: "Claude Haiku 3", category: "lightweight", inputPricePerMTokens: 0.25, outputPricePerMTokens: 1.25, cacheWritePricePerMTokens: 0.3, cacheReadPricePerMTokens: 0.03, maxContextLength: null, isLegacy: true },
  ];

  for (const m of anthropicModels) {
    await upsertModel(anthropicId, m);
  }
  console.log("Anthropic models seeded:", anthropicModels.length);

  // =============================================
  // Google テキスト生成モデル (セクション 6.4)
  // =============================================
  const googleModels = [
    { name: "Gemini 3 Pro Preview", category: "flagship", inputPricePerMTokens: 2.0, outputPricePerMTokens: 12.0, cacheWritePricePerMTokens: null, cacheReadPricePerMTokens: 0.2, maxContextLength: 200000, isLegacy: false },
    { name: "Gemini 3 Flash Preview", category: "standard", inputPricePerMTokens: 0.5, outputPricePerMTokens: 3.0, cacheWritePricePerMTokens: null, cacheReadPricePerMTokens: 0.05, maxContextLength: 200000, isLegacy: false },
    { name: "Gemini 2.5 Pro", category: "flagship", inputPricePerMTokens: 1.25, outputPricePerMTokens: 10.0, cacheWritePricePerMTokens: null, cacheReadPricePerMTokens: 0.125, maxContextLength: 200000, isLegacy: false },
    { name: "Gemini 2.5 Flash", category: "standard", inputPricePerMTokens: 0.3, outputPricePerMTokens: 2.5, cacheWritePricePerMTokens: null, cacheReadPricePerMTokens: 0.03, maxContextLength: 200000, isLegacy: false },
    { name: "Gemini 2.5 Flash Lite", category: "lightweight", inputPricePerMTokens: 0.1, outputPricePerMTokens: 0.4, cacheWritePricePerMTokens: null, cacheReadPricePerMTokens: 0.01, maxContextLength: 200000, isLegacy: false },
    { name: "Gemini 2.0 Flash", category: "standard", inputPricePerMTokens: 0.15, outputPricePerMTokens: 0.6, cacheWritePricePerMTokens: null, cacheReadPricePerMTokens: null, maxContextLength: null, isLegacy: false },
    { name: "Gemini 2.0 Flash Lite", category: "lightweight", inputPricePerMTokens: 0.075, outputPricePerMTokens: 0.3, cacheWritePricePerMTokens: null, cacheReadPricePerMTokens: null, maxContextLength: null, isLegacy: false },
  ];

  for (const m of googleModels) {
    await upsertModel(googleId, m);
  }
  console.log("Google models seeded:", googleModels.length);

  // =============================================
  // Embedding モデル (セクション 6.2, 6.4)
  // =============================================
  const embeddingData = [
    // OpenAI
    { providerId: openaiId, name: "text-embedding-3-small", inputPricePerMTokens: 0.02, dimensions: 1536, pricingTier: "online" },
    { providerId: openaiId, name: "text-embedding-3-large", inputPricePerMTokens: 0.13, dimensions: 3072, pricingTier: "online" },
    // Google (オンライン + バッチの 2 件)
    { providerId: googleId, name: "Gemini Embedding (online)", inputPricePerMTokens: 0.15, dimensions: null, pricingTier: "online" },
    { providerId: googleId, name: "Gemini Embedding (batch)", inputPricePerMTokens: 0.12, dimensions: null, pricingTier: "batch" },
  ];

  for (const e of embeddingData) {
    await upsertEmbeddingModel(e.providerId, {
      name: e.name,
      inputPricePerMTokens: e.inputPricePerMTokens,
      dimensions: e.dimensions,
      pricingTier: e.pricingTier,
    });
  }
  console.log("Embedding models seeded:", embeddingData.length);

  // =============================================
  // Web 検索ツール (セクション 6.2, 6.3, 6.4)
  // =============================================
  const webSearchData = [
    { providerId: openaiId, name: "OpenAI Web Search", pricePer1kCalls: 10.0, additionalPricingNotes: "検索コンテンツトークンはモデルのインプット単価で課金" },
    { providerId: anthropicId, name: "Anthropic Web Search", pricePer1kCalls: 10.0, additionalPricingNotes: "インプット/アウトプットトークンは別途モデル単価で課金" },
    { providerId: googleId, name: "Google Grounding (Gemini 3)", pricePer1kCalls: 14.0, additionalPricingNotes: "月5,000クエリまで無料（本システムでは無料枠は考慮しない）" },
    { providerId: googleId, name: "Google Grounding (Gemini 2.x)", pricePer1kCalls: 35.0, additionalPricingNotes: "日1,500プロンプトまで無料（本システムでは無料枠は考慮しない）" },
  ];

  for (const w of webSearchData) {
    await upsertWebSearchTool(w.providerId, {
      name: w.name,
      pricePer1kCalls: w.pricePer1kCalls,
      additionalPricingNotes: w.additionalPricingNotes,
    });
  }
  console.log("Web search tools seeded:", webSearchData.length);

  console.log("Seeding complete!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
