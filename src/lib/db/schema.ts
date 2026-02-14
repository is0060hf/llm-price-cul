import {
  pgTable,
  serial,
  text,
  real,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// --- providers ---
export const providers = pgTable("providers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const providersRelations = relations(providers, ({ many }) => ({
  models: many(models),
  embeddingModels: many(embeddingModels),
  webSearchTools: many(webSearchTools),
}));

// --- models (テキスト生成 + 推論) ---
export const models = pgTable("models", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id")
    .notNull()
    .references(() => providers.id),
  name: text("name").notNull(),
  category: text("category").notNull(), // flagship / standard / lightweight / reasoning
  inputPricePerMTokens: real("input_price_per_m_tokens").notNull(),
  outputPricePerMTokens: real("output_price_per_m_tokens").notNull(),
  cacheWritePricePerMTokens: real("cache_write_price_per_m_tokens"), // nullable: Anthropic Cache Write
  cacheReadPricePerMTokens: real("cache_read_price_per_m_tokens"), // nullable: Cache Read / Cached Input
  maxContextLength: integer("max_context_length"), // nullable: トークン数上限
  isLegacy: boolean("is_legacy").default(false).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const modelsRelations = relations(models, ({ one }) => ({
  provider: one(providers, {
    fields: [models.providerId],
    references: [providers.id],
  }),
}));

// --- embedding_models ---
export const embeddingModels = pgTable("embedding_models", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id")
    .notNull()
    .references(() => providers.id),
  name: text("name").notNull(),
  inputPricePerMTokens: real("input_price_per_m_tokens").notNull(),
  dimensions: integer("dimensions"), // nullable
  pricingTier: text("pricing_tier").default("online").notNull(), // 'online' | 'batch'
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const embeddingModelsRelations = relations(embeddingModels, ({ one }) => ({
  provider: one(providers, {
    fields: [embeddingModels.providerId],
    references: [providers.id],
  }),
}));

// --- web_search_tools ---
export const webSearchTools = pgTable("web_search_tools", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id")
    .notNull()
    .references(() => providers.id),
  name: text("name").notNull(),
  pricePer1kCalls: real("price_per_1k_calls").notNull(),
  additionalPricingNotes: text("additional_pricing_notes"), // nullable
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const webSearchToolsRelations = relations(webSearchTools, ({ one }) => ({
  provider: one(providers, {
    fields: [webSearchTools.providerId],
    references: [providers.id],
  }),
}));
