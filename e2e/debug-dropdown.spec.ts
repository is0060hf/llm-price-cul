import { test } from "@playwright/test";

test("Debug dropdown options", async ({ page }) => {
  await page.goto("/calculator");
  
  // Wait for data to load
  await page.waitForSelector('text=マスターデータを読み込み中', { state: 'hidden', timeout: 10000 });
  await page.waitForTimeout(2000); // Extra wait for React to render

  console.log("\n=== Before clicking dropdown ===");
  
  // Check if select trigger exists
  const triggers = page.locator('[role="combobox"]');
  const triggerCount = await triggers.count();
  console.log(`Found ${triggerCount} combobox elements`);

  // Click the model dropdown
  const modelSelect = triggers.first();
  console.log("\nClicking dropdown...");
  await modelSelect.click();
  await page.waitForTimeout(2000); // Wait for dropdown animation

  console.log("\n=== After clicking dropdown ===");

  // Take screenshot
  await page.screenshot({ path: "test-results/debug-dropdown.png", fullPage: true });

  // Check for portal content
  const portals = page.locator('[data-radix-popper-content-wrapper]');
  const portalCount = await portals.count();
  console.log(`Found ${portalCount} radix portal wrappers`);

  // List all select items
  const items = page.locator('[data-slot="select-item"]');
  const count = await items.count();
  console.log(`Found ${count} select items with data-slot="select-item"`);
  
  for (let i = 0; i < Math.min(count, 10); i++) {
    const text = await items.nth(i).textContent();
    console.log(`  ${i}: "${text}"`);
  }

  // Also check for options with role
  const options = page.locator('[role="option"]');
  const optionCount = await options.count();
  console.log(`\nFound ${optionCount} options with role="option"`);
  
  for (let i = 0; i < Math.min(optionCount, 10); i++) {
    const text = await options.nth(i).textContent();
    const ariaLabel = await options.nth(i).getAttribute('aria-label');
    console.log(`  ${i}: text="${text}", aria-label="${ariaLabel}"`);
  }
  
  // Check for any text containing "GPT"
  const gptTexts = page.locator('text=/GPT/i');
  const gptCount = await gptTexts.count();
  console.log(`\nFound ${gptCount} elements containing "GPT"`);
  for (let i = 0; i < Math.min(gptCount, 15); i++) {
    const text = await gptTexts.nth(i).textContent();
    console.log(`  ${i}: "${text?.substring(0, 50)}"`);
  }
});
