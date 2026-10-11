import { expect, links, open, popup, result, selected, sheet, test } from "./fixtures.js";

test.beforeEach(async ({ page }) => {
  await open(page);
});

for (const [orientation, size] of [
  ["portrait", null],
  ["landscape", { width: 1194, height: 834 }],
]) {
  test.describe(`in ${orientation}`, () => {
    test.beforeEach(async ({ page }) => {
      if (size) await page.setViewportSize(size);
    });

    test("results appear as a list of rows with details", async ({ page }) => {
      const lexicon = await result(page, "Lexicon").boundingBox();
      const skills = await result(page, "claude-skills").boundingBox();
      expect(skills.y).toBeGreaterThanOrEqual(lexicon.y + lexicon.height);
      for (const detail of await page.locator(".result-detail").all()) await expect(detail).toBeVisible();
    });

    test("every action pill is visible without a selection", async ({ page }) => {
      for (const action of await page.locator(".result-action").all()) await expect(action).toBeVisible();
      await expect(result(page, "Lexicon").locator(".result-action")).toHaveText("GitHub");
    });

    test("the keyboard hints are hidden", async ({ page }) => {
      await expect(page.locator(".hints")).toBeHidden();
    });
  });
}

test("tapping a project opens its link in a new tab without a sheet", async ({ page }) => {
  expect(await popup(page, () => result(page, "Lexicon").tap())).toBe(links.Lexicon);
  await expect(sheet(page)).toBeHidden();
});

test("a finger that moves over a row does not highlight it", async ({ page }) => {
  await result(page, "Lexicon").dispatchEvent("pointermove", { pointerType: "touch", bubbles: true, screenX: 100, screenY: 100 });
  await expect(selected(page)).toHaveCount(0);
});
