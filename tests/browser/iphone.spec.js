import { expect, links, open, overlaps, popup, result, settled, sheet, test } from "./fixtures.js";

const present = async (page, title) => {
  await result(page, title).tap();
  await expect(page.getByRole("dialog", { name: title })).toBeVisible();
};

const tapBackdrop = (page) => page.touchscreen.tap(210, 100);

const drag = (page, ...fractions) =>
  page.locator(".sheet-body").evaluate((body, fractions) => {
    const { left, top } = body.getBoundingClientRect();
    const send = (type, fraction) =>
      body.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          pointerId: 1,
          pointerType: "touch",
          isPrimary: true,
          clientX: left + 40,
          clientY: top + 40 + fraction * body.offsetHeight,
        }),
      );
    send("pointerdown", 0);
    fractions.forEach((fraction) => send("pointermove", fraction));
    const moved = (body.getBoundingClientRect().top - top) / body.offsetHeight;
    send("pointerup", fractions.at(-1));
    return moved;
  }, fractions);

const tileLayout = (page) =>
  page.locator('.section[data-mode="projects"]').evaluate((section) => {
    const box = (element) => element.getBoundingClientRect();
    const [lexicon, skills] = [...section.querySelectorAll(".result")].map(box);
    return {
      columns: Math.round(box(section).width / lexicon.width),
      sideBySide: Math.abs(skills.top - lexicon.top) < 1 && Math.abs(skills.left - lexicon.right) < 1,
      startsAtTheEdge: Math.abs(lexicon.left - box(section).left) < 1,
      titleSpansTheRow: box(section.querySelector(".section-title")).width > box(section).width * 0.8,
      iconAboveTitle: box(section.querySelector(".result-icon")).bottom <= box(section.querySelector(".result-title")).top,
      cutTitles: [...document.querySelectorAll(".result-title")].filter((title) => title.scrollWidth > title.clientWidth).map((title) => title.textContent),
    };
  });

test.beforeEach(async ({ page }) => {
  await open(page);
});

for (const size of [null, { width: 375, height: 667 }]) {
  test(`results appear as a grid of four icon tiles with full titles${size ? ` at ${size.width} points` : ""}`, async ({ page }) => {
    if (size) await page.setViewportSize(size);
    expect(await tileLayout(page)).toEqual({
      columns: 4,
      sideBySide: true,
      startsAtTheEdge: true,
      titleSpansTheRow: true,
      iconAboveTitle: true,
      cutTitles: [],
    });
    for (const part of await page.locator(".result-detail, .result-action").all()) await expect(part).toBeHidden();
    expect(await overlaps(page)).toEqual([]);
  });
}

for (const { kind, title, icon, detail, action, href, address } of [
  {
    kind: "project",
    title: "Lexicon",
    icon: "lexicon.png",
    detail: "Offline-first iOS app in SwiftUI and TCA.",
    action: "Open on GitHub",
    href: links.Lexicon,
    address: "github.com/mazzsva/Lexicon",
  },
  {
    kind: "profile",
    title: "LinkedIn",
    icon: "linkedin.png",
    detail: "Experience and career updates.",
    action: "Open on LinkedIn",
    href: links.LinkedIn,
    address: "linkedin.com/in/mazzsva",
  },
]) {
  test(`tapping a ${kind} presents its sheet instead of opening the link`, async ({ page }) => {
    await page.evaluate(() => addEventListener("click", (event) => (window.followed = !event.defaultPrevented), { once: true }));
    await present(page, title);
    expect(await page.evaluate(() => window.followed)).toBe(false);
    const dialog = page.getByRole("dialog", { name: title });
    await expect(dialog.locator(".sheet-icon")).toHaveAttribute("src", new RegExp(`/assets/icons/${icon}$`));
    await expect(dialog.locator(".sheet-detail")).toHaveText(detail);
    await expect(dialog.getByRole("link", { name: action })).toHaveAttribute("href", href);
    await expect(dialog.locator(".sheet-link")).toHaveText(address);
  });
}

test("tapping Untitled after a project presents a sheet with no link", async ({ page }) => {
  await present(page, "Lexicon");
  await tapBackdrop(page);
  await expect(sheet(page)).toBeHidden();
  await present(page, "Untitled");
  await expect(sheet(page).locator(".sheet-open")).toHaveText("Coming Soon");
  await expect(sheet(page).locator(".sheet-open")).not.toHaveAttribute("href");
  await expect(sheet(page).locator(".sheet-link")).toBeEmpty();
});

test("the Open button opens the link in a new tab and dismisses the sheet", async ({ page }) => {
  await present(page, "Lexicon");
  expect(await popup(page, () => sheet(page).getByRole("link", { name: "Open on GitHub" }).tap())).toBe(links.Lexicon);
  await expect(sheet(page)).toBeHidden();
  await present(page, "GitHub");
});

for (const { name, dismiss } of [
  { name: "tapping the backdrop", dismiss: tapBackdrop },
  { name: "pressing Escape", dismiss: (page) => page.keyboard.press("Escape") },
]) {
  test(`${name} dismisses the sheet`, async ({ page }) => {
    await present(page, "Lexicon");
    await sheet(page).locator(".sheet-title").tap();
    await expect(sheet(page)).toBeVisible();
    await dismiss(page);
    await expect(sheet(page)).toBeHidden();
    await present(page, "claude-skills");
  });
}

test("widening the viewport past 600 points dismisses the sheet and shows the list", async ({ page }) => {
  await present(page, "Lexicon");
  await page.setViewportSize({ width: 719, height: 420 });
  await expect(sheet(page)).toBeHidden();
  await expect(result(page, "Lexicon").locator(".result-detail")).toBeVisible();
});

test("dragging the sheet down past a third of its height dismisses it", async ({ page }) => {
  await present(page, "Lexicon");
  await expect(sheet(page).locator(".sheet-body")).toHaveCSS("touch-action", "none");
  expect(await drag(page, 0.2, 0.4, 0.4)).toBeCloseTo(0.4, 1);
  await expect(sheet(page)).toBeHidden();
});

test("a short drag snaps the sheet back", async ({ page }) => {
  await present(page, "Lexicon");
  expect(await drag(page, 0.1, 0.25, 0.25)).toBeCloseTo(0.25, 1);
  await expect(sheet(page).locator(".sheet-body")).toHaveCSS("transform", "none");
  await expect(sheet(page)).toBeVisible();
  await expect(sheet(page)).not.toHaveClass(/is-closing/);
});

test("a quick downward flick dismisses the sheet", async ({ page }) => {
  await present(page, "Lexicon");
  await drag(page, 0.05, 0.1);
  await expect(sheet(page)).toBeHidden();
});

test("the sheet appears at once under reduced motion", async ({ page }) => {
  await result(page, "Lexicon").tap();
  const animations = await sheet(page).evaluate((dialog) => dialog.getAnimations({ subtree: true }).length);
  expect(animations).toBe(0);
  await expect(sheet(page)).toBeVisible();
});

test.describe("with motion", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });

  test("the sheet slides away before it closes", async ({ page }) => {
    await present(page, "Lexicon");
    await settled(sheet(page));
    await tapBackdrop(page);
    await expect(sheet(page)).toHaveClass(/is-closing/);
    const durations = await sheet(page).evaluate((dialog) => dialog.getAnimations({ subtree: true }).map((animation) => animation.effect.getTiming().duration));
    expect(durations.length).toBeGreaterThan(0);
    expect(Math.max(...durations)).toBeLessThanOrEqual(500);
    await expect(sheet(page)).not.toHaveAttribute("open");
    await expect(sheet(page)).not.toHaveClass(/is-closing/);
  });
});
