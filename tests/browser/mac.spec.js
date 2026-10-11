import { background, expect, links, open, overlaps, popup, result, selected, settled, test } from "./fixtures.js";

const expectSelected = (page, title) => expect(selected(page).locator(".result-title")).toHaveText(title);

const expectMode = (page, mode) => expect(page.locator('.filter[aria-pressed="true"]')).toHaveAttribute("data-mode", mode);

const openHint = (page) => page.locator(".hint-open");

const tabs = (page) => {
  const urls = [];
  page.context().on("page", (tab) => urls.push(tab.waitForLoadState().then(() => tab.url())));
  return () => Promise.all(urls);
};

const focusFirstFilter = async (page, browserName) => {
  await page.keyboard.press(browserName === "webkit" ? "Alt+Tab" : "Tab");
  await expect(page.locator('.filter[data-mode="all"]')).toBeFocused();
};

const showProducts = (page) =>
  page.locator(".panel").evaluate((panel) => {
    document.querySelector('.filter[data-mode="products"]').click();
    return panel.getAnimations().map((animation) => animation.effect.getTiming().duration);
  });

const expectHighlighted = async (page, title) => {
  await expectSelected(page, title);
  const highlight = await background(selected(page));
  expect(["rgba(0, 0, 0, 0)", await background(page.locator(".panel"))]).not.toContain(highlight);
};

const sectionsShown = (page) => page.locator(".section:visible").evaluateAll((sections) => sections.map((section) => section.dataset.mode));

test.beforeEach(async ({ page }) => {
  await open(page);
});

test.describe("keyboard", () => {
  test("Down and Up move the selection and wrap around", async ({ page }) => {
    await page.keyboard.press("ArrowUp");
    await expectSelected(page, "LinkedIn");
    await page.keyboard.press("ArrowDown");
    await expectSelected(page, "Untitled");
    await page.keyboard.press("ArrowDown");
    await expectSelected(page, "Lexicon");
    await page.keyboard.press("ArrowUp");
    await expectSelected(page, "Untitled");
  });

  test("Right and Left switch the mode in order and select its first result", async ({ page }) => {
    for (const [mode, title] of [
      ["products", "Untitled"],
      ["projects", "Lexicon"],
      ["profiles", "GitHub"],
      ["all", "Untitled"],
    ]) {
      await page.keyboard.press("ArrowRight");
      await expectMode(page, mode);
      await expectSelected(page, title);
    }
    await page.keyboard.press("ArrowLeft");
    await expectMode(page, "profiles");
    await expectSelected(page, "GitHub");
    await page.keyboard.press("ArrowDown");
    await expectSelected(page, "LinkedIn");
    await page.keyboard.press("ArrowDown");
    await expectSelected(page, "GitHub");
  });

  test("Return opens the selected link in a new tab", async ({ page }) => {
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await expectSelected(page, "Lexicon");
    expect(await popup(page, () => page.keyboard.press("Enter"))).toBe(links.Lexicon);
  });

  test("Return opens the highlighted result in a filtered mode", async ({ page }) => {
    for (let count = 0; count < 3; count++) await page.keyboard.press("ArrowRight");
    await expectMode(page, "profiles");
    await expectSelected(page, "GitHub");
    expect(await popup(page, () => page.keyboard.press("Enter"))).toBe(links.GitHub);
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowDown");
    await expectSelected(page, "claude-skills");
    expect(await popup(page, () => page.keyboard.press("Enter"))).toBe(links["claude-skills"]);
  });

  test("Return on Untitled opens nothing", async ({ page }) => {
    const opened = tabs(page);
    await page.keyboard.press("ArrowDown");
    await expectSelected(page, "Untitled");
    await page.keyboard.press("Enter");
    await page.keyboard.press("ArrowDown");
    expect(await popup(page, () => page.keyboard.press("Enter"))).toBe(links.Lexicon);
    expect(await opened()).toEqual([links.Lexicon]);
  });

  test("Holding Return opens only one tab", async ({ page }) => {
    const opened = tabs(page);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await expectSelected(page, "Lexicon");
    const hold = async () => {
      for (let count = 0; count < 4; count++) await page.keyboard.down("Enter");
      await page.keyboard.up("Enter");
    };
    expect(await popup(page, hold)).toBe(links.Lexicon);
    await page.keyboard.press("ArrowDown");
    expect(await popup(page, () => page.keyboard.press("Enter"))).toBe(links["claude-skills"]);
    expect(await opened()).toEqual([links.Lexicon, links["claude-skills"]]);
  });

  test("the Open hint is enabled only when the selection has a link", async ({ page }) => {
    await expect(page.locator(".hints")).toBeVisible();
    await expect(openHint(page)).toHaveClass(/is-disabled/);
    await page.keyboard.press("ArrowDown");
    await expectSelected(page, "Untitled");
    await expect(openHint(page)).toHaveClass(/is-disabled/);
    await page.keyboard.press("ArrowDown");
    await expectSelected(page, "Lexicon");
    await expect(openHint(page)).not.toHaveClass(/is-disabled/);
  });

  test("arrows with Command, Control or Option leave the page unchanged", async ({ page }) => {
    for (const modifier of ["Meta", "Control", "Alt"]) {
      await page.keyboard.press(`${modifier}+ArrowDown`);
      await page.keyboard.press(`${modifier}+ArrowRight`);
    }
    await expectMode(page, "all");
    await expect(selected(page)).toHaveCount(0);
  });

  test("the arrow keys do not scroll a short window", async ({ page }) => {
    await page.setViewportSize({ width: 1470, height: 400 });
    for (let count = 0; count < 4; count++) await page.keyboard.press("ArrowDown");
    await expectSelected(page, "GitHub");
    expect(await page.evaluate(() => scrollY)).toBe(0);
  });
});

test.describe("focus", () => {
  test("Tab into the results selects the focused result", async ({ page, browserName }) => {
    await focusFirstFilter(page, browserName);
    const tab = browserName === "webkit" ? "Alt+Tab" : "Tab";
    for (let count = 0; count < 4; count++) await page.keyboard.press(tab);
    await expect(result(page, "Untitled")).toBeFocused();
    await expectSelected(page, "Untitled");
    await expect(openHint(page)).toHaveClass(/is-disabled/);
    await page.keyboard.press(tab);
    await expectSelected(page, "Lexicon");
    await expect(openHint(page)).not.toHaveClass(/is-disabled/);
    expect(await popup(page, () => page.keyboard.press("Enter"))).toBe(links.Lexicon);
  });

  test("Return on a focused filter shows its section and opens no tab", async ({ page, browserName }) => {
    const opened = tabs(page);
    await result(page, "Lexicon").hover();
    await expectSelected(page, "Lexicon");
    await focusFirstFilter(page, browserName);
    await page.keyboard.press(browserName === "webkit" ? "Alt+Tab" : "Tab");
    await page.keyboard.press("Enter");
    await expectMode(page, "products");
    await page.keyboard.press("ArrowRight");
    expect(await popup(page, () => page.keyboard.press("Enter"))).toBe(links.Lexicon);
    expect(await opened()).toEqual([links.Lexicon]);
  });

  test("Down moves focus into the results so Return opens the highlighted link", async ({ page, browserName }) => {
    await focusFirstFilter(page, browserName);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await expectSelected(page, "Lexicon");
    await expect(result(page, "Lexicon")).toBeFocused();
    expect(await popup(page, () => page.keyboard.press("Enter"))).toBe(links.Lexicon);
  });

  test("Left moves focus into the results so Return opens the highlighted link", async ({ page, browserName }) => {
    await focusFirstFilter(page, browserName);
    await page.keyboard.press("ArrowLeft");
    await expectMode(page, "profiles");
    await expect(result(page, "GitHub")).toBeFocused();
    expect(await popup(page, () => page.keyboard.press("Enter"))).toBe(links.GitHub);
  });
});

test.describe("mouse", () => {
  test("hovering a result highlights it", async ({ page }) => {
    await result(page, "Lexicon").hover();
    await expectHighlighted(page, "Lexicon");
    await expect(openHint(page)).not.toHaveClass(/is-disabled/);
    await result(page, "Untitled").hover();
    await expectHighlighted(page, "Untitled");
    await expect(openHint(page)).toHaveClass(/is-disabled/);
  });

  test("clicking a result opens its link in a new tab", async ({ page }) => {
    expect(await popup(page, () => result(page, "LinkedIn").click())).toBe(links.LinkedIn);
  });

  test("clicking a filter clears the selection", async ({ page }) => {
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await expectSelected(page, "Lexicon");
    await page.locator('.filter[data-mode="projects"]').click();
    await expectMode(page, "projects");
    await expect(selected(page)).toHaveCount(0);
    await expect(openHint(page)).toHaveClass(/is-disabled/);
  });
});

test.describe("window", () => {
  test("a filter stays applied after the window resizes", async ({ page }) => {
    await page.locator('.filter[data-mode="projects"]').click();
    expect(await sectionsShown(page)).toEqual(["projects"]);
    await page.setViewportSize({ width: 1280, height: 720 });
    await expectMode(page, "projects");
    expect(await sectionsShown(page)).toEqual(["projects"]);
  });

  test("the layout fits smaller windows with nothing overlapping", async ({ page }) => {
    for (const [width, height] of [
      [1280, 720],
      [1024, 640],
    ]) {
      await page.setViewportSize({ width, height });
      expect(await overlaps(page), `${width} by ${height}`).toEqual([]);
    }
  });
});

test.describe("panel height", () => {
  test("changing the mode does not animate the panel under reduced motion", async ({ page }) => {
    expect(await showProducts(page)).toEqual([]);
  });

  test.describe("with motion", () => {
    test.use({ contextOptions: { reducedMotion: "no-preference" } });

    test("changing the mode animates the panel to its new height", async ({ page }) => {
      const panel = page.locator(".panel");
      const before = (await panel.boundingBox()).height;
      const durations = await showProducts(page);
      expect(durations).toHaveLength(1);
      expect(durations[0]).toBeLessThanOrEqual(500);
      await settled(panel);
      expect((await panel.boundingBox()).height).toBeLessThan(before);
    });
  });
});
