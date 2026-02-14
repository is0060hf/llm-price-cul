import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { providers, models, embeddingModels, webSearchTools } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { MasterData, Model, EmbeddingModel, WebSearchTool, Provider } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const providerRows = await db.select().from(providers);
    const modelRows = await db.select().from(models);
    const embeddingRows = await db.select().from(embeddingModels);
    const webSearchRows = await db.select().from(webSearchTools);

    const providerMap = new Map(providerRows.map((p) => [p.id, p.name]));

    const response: MasterData = {
      providers: providerRows.map(
        (p): Provider => ({ id: p.id, name: p.name })
      ),
      models: modelRows.map(
        (m): Model => ({
          id: m.id,
          providerId: m.providerId,
          providerName: providerMap.get(m.providerId) ?? "",
          name: m.name,
          category: m.category as Model["category"],
          inputPrice: m.inputPricePerMTokens,
          outputPrice: m.outputPricePerMTokens,
          cacheWritePrice: m.cacheWritePricePerMTokens,
          cacheReadPrice: m.cacheReadPricePerMTokens,
          maxContextLength: m.maxContextLength,
          isLegacy: m.isLegacy,
        })
      ),
      embeddingModels: embeddingRows.map(
        (e): EmbeddingModel => ({
          id: e.id,
          providerId: e.providerId,
          providerName: providerMap.get(e.providerId) ?? "",
          name: e.name,
          inputPrice: e.inputPricePerMTokens,
          dimensions: e.dimensions,
          pricingTier: e.pricingTier as EmbeddingModel["pricingTier"],
        })
      ),
      webSearchTools: webSearchRows.map(
        (w): WebSearchTool => ({
          id: w.id,
          providerId: w.providerId,
          providerName: providerMap.get(w.providerId) ?? "",
          name: w.name,
          pricePerKCalls: w.pricePer1kCalls,
          additionalPricingNotes: w.additionalPricingNotes,
        })
      ),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to fetch master data:", error);
    return NextResponse.json(
      { error: "マスターデータの取得に失敗しました" },
      { status: 500 }
    );
  }
}
