import { test, expect } from "@playwright/test";

// ============================================================
// A. 画面表示・モード切替
// ============================================================
test.describe("A. 画面表示・モード切替", () => {
  test("A-1. 初期表示", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/calculator");
    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("h1")).toContainText("Prestimo");
    await expect(page.getByRole("tab", { name: "ざっくり算定" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "詳細算定" })).toBeVisible();
    await page.waitForTimeout(2000);
    expect(errors).toHaveLength(0);
  });

  test("A-2. ざっくり算定モードへの切替", async ({ page }) => {
    await page.goto("/calculator");
    await page.getByRole("tab", { name: "ざっくり算定" }).click();
    await expect(page.getByText("ざっくり算定モード")).toBeVisible();
  });

  test("A-3. 詳細算定モードへの切替", async ({ page }) => {
    await page.goto("/calculator");
    await page.getByRole("tab", { name: "詳細算定" }).click();
    await expect(page.getByText("基本設定").first()).toBeVisible();
  });

  test("A-5. マスターデータのロード", async ({ page }) => {
    await page.goto("/calculator");
    await page.waitForSelector("#model-select", { timeout: 10000 });
    await expect(page.locator("#model-select")).toBeVisible();
  });
});

// ============================================================
// B. ざっくり算定モード
// ============================================================
test.describe("B. ざっくり算定モード", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/calculator");
    await page.getByRole("tab", { name: "ざっくり算定" }).click();
    await page.waitForSelector("#model-select", { timeout: 10000 });
  });

  test("B-1. 全項目入力して算出（シンプルQ&A）", async ({ page }) => {
    // 1. モデル選択
    await page.locator("#model-select").click();
    await page.getByRole("option", { name: /GPT-4\.1$/ }).first().click();
    // 2. リクエスト数
    await page.locator("#daily-requests").fill("100");
    // 3+4 はデフォルトで中文が選択済み
    // 5. 用途タイプはデフォルトでシンプルQ&Aが選択済み
    // 算出
    await page.getByRole("button", { name: "コストを算出する" }).click();
    // 結果確認
    await expect(page.getByText("月額コスト").first()).toBeVisible();
    await expect(page.getByText("メインエージェント応答").first()).toBeVisible();
  });

  test("B-8. バリデーション: リクエスト数空欄でエラー", async ({ page }) => {
    await page.locator("#daily-requests").fill("");
    await page.getByRole("button", { name: "コストを算出する" }).click();
    await expect(page.locator("[role='alert']").first()).toBeVisible();
  });
});

// ============================================================
// C. 詳細算定モード — 基本設定
// ============================================================
test.describe("C. 詳細算定モード — 基本設定", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/calculator");
    await page.getByRole("tab", { name: "詳細算定" }).click();
    await page.waitForSelector("text=基本設定", { timeout: 10000 });
  });

  test("C-3. 基本設定のみで算出", async ({ page }) => {
    // モデル選択
    await page.locator("#main-model").click();
    await page.getByRole("option", { name: /Claude Sonnet 4\.5/ }).click();
    // 入力値
    await page.locator("#daily-requests").fill("200");
    await page.locator("#monthly-working-days").fill("20");
    await page.locator("#max-input-chars").fill("1000");
    await page.locator("#max-output-chars").fill("1500");
    await page.locator("#system-prompt-chars").fill("2000");
    await page.locator("#avg-turns").fill("1");
    // 算出
    await page.getByRole("button", { name: "コストを算出する" }).click();
    // 月額コスト表示
    await expect(page.getByText("月額コスト").first()).toBeVisible();
    await expect(page.getByText("$226.80").first()).toBeVisible();
  });
});

// ============================================================
// D-G. オプション機能の表示切替
// ============================================================
test.describe("D-G. オプション機能の表示切替", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/calculator");
    await page.getByRole("tab", { name: "詳細算定" }).click();
    await page.waitForSelector("text=基本設定", { timeout: 10000 });
  });

  test("D-1. トピック分類ON: サブ項目表示", async ({ page }) => {
    await page.locator("#topic-classification").click();
    await expect(page.getByText("フォールバック率")).toBeVisible();
  });

  test("E-1. RAG ON: サブ項目表示", async ({ page }) => {
    await page.locator("#rag-enabled").click();
    await expect(page.getByText("取得チャンク数")).toBeVisible();
  });

  test("F-1. 会話履歴参照ON: サブ項目表示", async ({ page }) => {
    await page.locator("#conversation-history").click();
    await expect(page.getByText("最大ターン数")).toBeVisible();
  });

  test("G-1. Web参照ON: サブ項目表示", async ({ page }) => {
    await page.locator("#web-search").click();
    await expect(page.getByText("検索回数")).toBeVisible();
  });
});

// ============================================================
// I. システムプロンプト推定ヘルパー
// ============================================================
test.describe("I. システムプロンプト推定ヘルパー", () => {
  test("I-1/I-3. ヘルパー起動 + デフォルト200文字", async ({ page }) => {
    await page.goto("/calculator");
    await page.getByRole("tab", { name: "詳細算定" }).click();
    await page.waitForSelector("text=基本設定", { timeout: 10000 });
    await page.getByRole("button", { name: /推定する|ヘルパーを開く/ }).click();
    await expect(page.getByText("推定文字数")).toBeVisible();
    await expect(page.getByText("200 文字", { exact: true })).toBeVisible();
  });
});

// ============================================================
// J. コスト計算結果の正確性
// ============================================================
test.describe("J. コスト計算結果の正確性", () => {
  test("J-3/J-4. 月次・日次コスト + グラフ + 内訳が表示", async ({ page }) => {
    await page.goto("/calculator");
    await page.getByRole("tab", { name: "ざっくり算定" }).click();
    await page.waitForSelector("#model-select", { timeout: 10000 });
    await page.locator("#model-select").click();
    await page.getByRole("option").first().click();
    await page.locator("#daily-requests").fill("100");
    await page.getByRole("button", { name: "コストを算出する" }).click();
    await expect(page.getByText("月額コスト").first()).toBeVisible();
    await expect(page.getByText("日次コスト")).toBeVisible();
    await expect(page.getByText("コスト内訳グラフ")).toBeVisible();
    await expect(page.getByText("コスト内訳（処理ステップ別")).toBeVisible();
    await expect(page.getByText("トークン数合計")).toBeVisible();
    await expect(page.getByText("安全マージン")).toBeVisible();
  });
});

// ============================================================
// L. マスターデータ・API
// ============================================================
test.describe("L. マスターデータ・API", () => {
  test("L-1. APIレスポンスの完全性", async ({ request }) => {
    const res = await request.get("/api/models");
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data).toHaveProperty("providers");
    expect(data).toHaveProperty("models");
    expect(data).toHaveProperty("embeddingModels");
    expect(data).toHaveProperty("webSearchTools");
    expect(data.providers.length).toBe(3);
    expect(data.models.length).toBe(25);
    expect(data.embeddingModels.length).toBe(4);
    expect(data.webSearchTools.length).toBe(4);
  });

  test("L-2. APIレスポンスの型安全性", async ({ request }) => {
    const res = await request.get("/api/models");
    const data = await res.json();
    for (const model of data.models) {
      expect(typeof model.inputPrice).toBe("number");
      expect(typeof model.outputPrice).toBe("number");
      expect(typeof model.isLegacy).toBe("boolean");
      expect(typeof model.name).toBe("string");
    }
  });

  test("L-3. /api/models経由のみでデータ取得", async ({ page }) => {
    const apiCalls: string[] = [];
    page.on("request", (req) => apiCalls.push(req.url()));
    await page.goto("/calculator");
    await page.waitForTimeout(3000);
    const modelsCalls = apiCalls.filter((u) => u.includes("/api/models"));
    expect(modelsCalls.length).toBeGreaterThan(0);
  });
});

// ============================================================
// M. 非機能要件
// ============================================================
test.describe("M. 非機能要件", () => {
  test("M-1. レスポンシブ — PC (1280px)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("footer")).toBeVisible();
  });

  test("M-2. レスポンシブ — タブレット (768px)", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");
    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("main")).toBeVisible();
  });

  test("M-3. レスポンシブ — スマートフォン (375px)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("main")).toBeVisible();
  });

  test("M-8. コンソールエラーなし", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/calculator");
    await page.waitForTimeout(3000);
    expect(errors).toHaveLength(0);
  });
});

// ============================================================
// N. 非実装要件の確認
// ============================================================
test.describe("N. 非実装要件の確認", () => {
  test("N-1. 認証機能が存在しない", async ({ page }) => {
    await page.goto("/calculator");
    await expect(page.getByText("ログイン")).not.toBeVisible();
    await expect(page.locator("h1")).toContainText("Prestimo");
  });

  test("N-2. 管理画面が存在しない (404)", async ({ page }) => {
    const res1 = await page.goto("/admin");
    expect(res1?.status()).toBe(404);
    const res2 = await page.goto("/dashboard");
    expect(res2?.status()).toBe(404);
  });

  test("N-3. 算出結果が永続化されない", async ({ page }) => {
    const postRequests: string[] = [];
    page.on("request", (req) => {
      if (req.method() === "POST" || req.method() === "PUT") {
        postRequests.push(req.url());
      }
    });
    await page.goto("/calculator");
    await page.waitForSelector("#model-select", { timeout: 10000 });
    await page.locator("#model-select").click();
    await page.getByRole("option").first().click();
    await page.locator("#daily-requests").fill("10");
    await page.getByRole("button", { name: "コストを算出する" }).click();
    await page.waitForTimeout(1000);
    expect(postRequests).toHaveLength(0);
    await page.reload();
    await page.waitForTimeout(2000);
    await expect(page.getByText("月額コスト")).not.toBeVisible();
  });
});
