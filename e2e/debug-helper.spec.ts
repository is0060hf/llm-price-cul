import { test } from "@playwright/test";

test("Debug helper button", async ({ page }) => {
  await page.goto("/calculator");
  
  // Wait for data to load
  await page.waitForSelector('text=マスターデータを読み込み中', { state: 'hidden', timeout: 10000 });
  await page.waitForTimeout(1000);

  // Click detailed mode tab
  await page.getByRole("tab", { name: "詳細算定" }).click();
  await page.waitForTimeout(1000);

  console.log("\n=== Looking for helper button ===");

  // Check for system prompt label
  const systemPromptLabel = page.getByText("システムプロンプトの文字数");
  const labelCount = await systemPromptLabel.count();
  console.log(`Found ${labelCount} "システムプロンプトの文字数" labels`);
  
  if (labelCount > 0) {
    await systemPromptLabel.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    await page.screenshot({ path: "test-results/debug-helper-area.png", fullPage: false });
  }

  // Check for button with different selectors
  const byRole = await page.getByRole("button", { name: "推定ヘルパー" }).count();
  console.log(`By role="button" name="推定ヘルパー": ${byRole}`);
  
  const byText = await page.getByText("推定ヘルパー").count();
  console.log(`By text="推定ヘルパー": ${byText}`);
  
  const byExactText = await page.getByText("推定ヘルパー", { exact: true }).count();
  console.log(`By text="推定ヘルパー" (exact): ${byExactText}`);
  
  const byAriaLabel = await page.locator('[aria-label*="推定"]').count();
  console.log(`By aria-label containing "推定": ${byAriaLabel}`);

  // List all buttons
  const allButtons = page.locator('button');
  const buttonCount = await allButtons.count();
  console.log(`\nTotal buttons on page: ${buttonCount}`);
  console.log("First 20 button texts:");
  for (let i = 0; i < Math.min(buttonCount, 20); i++) {
    const text = await allButtons.nth(i).textContent();
    const ariaLabel = await allButtons.nth(i).getAttribute('aria-label');
    console.log(`  ${i}: "${text}" (aria-label="${ariaLabel}")`);
  }
});
