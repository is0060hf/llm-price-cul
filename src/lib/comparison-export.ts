import type { ComparisonEntry } from "@/types";

function formatUsd(value: number, decimals: 2 | 6 = 2): string {
  return `$${value.toFixed(decimals)}`;
}

function formatLanguage(lang: string): string {
  return { ja: "日本語", en: "英語", mixed: "混在" }[lang] ?? lang;
}

/**
 * 比較表のエントリ群から、事実ベースのマークダウンレポートを生成する。
 */
export function generateComparisonMarkdown(
  entries: ComparisonEntry[],
  currency: "USD" | "JPY",
  exchangeRate: number
): string {
  const lines: string[] = [];

  lines.push("# LLMランニングコスト比較レポート");
  lines.push("");

  // --- 比較概要テーブル ---
  if (entries.length >= 2) {
    lines.push("## 比較概要");
    lines.push("");

    const headers = ["項目", ...entries.map((_, i) => `案${i + 1}`)];
    lines.push(`| ${headers.join(" | ")} |`);
    lines.push(`| ${headers.map(() => "---").join(" | ")} |`);

    const rows: { label: string; values: string[] }[] = [
      { label: "メインモデル", values: entries.map((e) => `${e.result.assumptions.modelName} (${e.result.assumptions.providerName})`) },
      { label: "補助モデル", values: entries.map((e) => e.result.assumptions.auxiliaryModelName ?? "（メインモデルと同一）") },
      { label: "月額コスト", values: entries.map((e) => `${formatUsd(e.result.monthlyCostUsd)} (マージン+${e.result.safetyMarginRate}%込み)`) },
      { label: "年間コスト", values: entries.map((e) => formatUsd(e.result.annualCostUsd)) },
      { label: "日次コスト", values: entries.map((e) => formatUsd(e.result.dailyCostUsd)) },
      { label: "1リクエスト単価", values: entries.map((e) => formatUsd(e.result.costPerRequest, 6)) },
      { label: "リクエスト数/日", values: entries.map((e) => e.result.assumptions.dailyRequests.toLocaleString("ja-JP")) },
      { label: "稼働日数/月", values: entries.map((e) => `${e.result.assumptions.monthlyWorkingDays}日`) },
      { label: "入力文字数", values: entries.map((e) => `${e.result.assumptions.maxInputChars.toLocaleString("ja-JP")}文字`) },
      { label: "出力文字数", values: entries.map((e) => `${e.result.assumptions.maxOutputChars.toLocaleString("ja-JP")}文字`) },
      { label: "有効オプション", values: entries.map((e) => e.result.assumptions.enabledOptions.length > 0 ? e.result.assumptions.enabledOptions.join(", ") : "基本構成") },
    ];

    for (const row of rows) {
      lines.push(`| ${row.label} | ${row.values.join(" | ")} |`);
    }
    lines.push("");
  }

  // --- 各案の詳細セクション ---
  entries.forEach((entry, i) => {
    const { result } = entry;
    const { assumptions } = result;

    lines.push(`## 案${i + 1}: ${entry.label}`);
    lines.push("");

    // 前提条件
    lines.push("### 前提条件");
    lines.push("");
    lines.push(`- メインモデル: ${assumptions.modelName} (${assumptions.providerName})`);
    lines.push(`- 補助モデル: ${assumptions.auxiliaryModelName ?? "（メインモデルと同一）"}`);
    lines.push(`- リクエスト数/日: ${assumptions.dailyRequests.toLocaleString("ja-JP")}`);
    lines.push(`- 稼働日数/月: ${assumptions.monthlyWorkingDays}日`);
    lines.push(`- 入力最大文字数: ${assumptions.maxInputChars.toLocaleString("ja-JP")}文字`);
    lines.push(`- 出力最大文字数: ${assumptions.maxOutputChars.toLocaleString("ja-JP")}文字`);
    lines.push(`- 主要言語: ${formatLanguage(assumptions.language)}`);
    lines.push(`- システムプロンプト: ${assumptions.systemPromptChars.toLocaleString("ja-JP")}文字`);
    lines.push(`- 平均ターン数: ${assumptions.avgTurnsPerSession}`);
    lines.push(`- 安全マージン: ${assumptions.safetyMarginPercent}%`);
    if (assumptions.enabledOptions.length > 0) {
      lines.push(`- 有効オプション: ${assumptions.enabledOptions.join(", ")}`);
    }
    lines.push("");

    // コストサマリ
    lines.push("### コストサマリ");
    lines.push("");
    lines.push(`- 月額コスト: ${formatUsd(result.monthlyCostUsd)} (安全マージン+${result.safetyMarginRate}%込み)`);
    lines.push(`- 月額コスト（マージン前）: ${formatUsd(result.monthlyCostBeforeMargin)}`);
    lines.push(`- 年間コスト: ${formatUsd(result.annualCostUsd)}`);
    lines.push(`- 日次コスト: ${formatUsd(result.dailyCostUsd)}`);
    lines.push(`- 1リクエストあたり合計: ${formatUsd(result.costPerRequest, 6)}`);
    if (result.longContextSurcharge) {
      lines.push(`- ※ 長文コンテキスト割増が適用されています`);
    }
    lines.push("");

    // コスト内訳テーブル
    lines.push("### コスト内訳（処理ステップ別・月額）");
    lines.push("");

    const monthlyMultiplier = result.costPerRequest > 0
      ? result.monthlyCostUsd / result.costPerRequest
      : 0;

    lines.push("| 処理ステップ | 処理内容 | 使用モデル | 入力tokens | 出力tokens | 月額コスト |");
    lines.push("| --- | --- | --- | --- | --- | --- |");
    for (const step of result.steps) {
      lines.push(
        `| ${step.name} | ${step.description || "—"} | ${step.modelName || "—"} | ${step.inputTokens.toLocaleString("ja-JP")} | ${step.outputTokens.toLocaleString("ja-JP")} | ${formatUsd(step.costUsd * monthlyMultiplier)} |`
      );
    }
    lines.push("");
  });

  return lines.join("\n");
}
