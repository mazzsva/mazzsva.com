import { expect, open, result, selected, sheet, test } from "./fixtures.js";

test.use({ bypassCSP: true });

test.beforeEach(async ({ page }) => {
  await open(page);
});

test("the page looks as designed", async ({ page }) => {
  await expect(page).toHaveScreenshot("page.png");
});

test("the selection looks as designed", async ({ page, hasTouch }) => {
  test.skip(hasTouch, "only the Mac shows a selection");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(selected(page)).toHaveText(/Lexicon/);
  await expect(page).toHaveScreenshot("selection.png");
});

test("the sheet looks as designed", async ({ page, viewport }) => {
  test.skip(viewport.width > 600, "only the iPhone shows the sheet");
  await result(page, "Lexicon").tap();
  await expect(sheet(page)).toBeVisible();
  await expect(page).toHaveScreenshot("sheet.png");
});
