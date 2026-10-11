import { background, expect, links, open, overlaps, popup, result, test } from "./fixtures.js";

const transparent = (page) =>
  page.evaluate(() =>
    [
      ["body::before", getComputedStyle(document.body, "::before")],
      ...[".stage", ".dock", ".copyright"]
        .map((selector) => [selector, document.querySelector(selector)])
        .filter(([selector, element]) => selector !== ".dock" || element.checkVisibility())
        .map(([selector, element]) => [selector, element.checkVisibility({ visibilityProperty: true }) ? getComputedStyle(element) : { opacity: "hidden" }]),
    ]
      .filter(([, style]) => style.opacity !== "1")
      .map(([selector]) => selector),
  );

const opacity = (color) => Number(color.match(/rgba?\((.*)\)/)[1].split(",")[3] ?? 1);

const press = (locator, hasTouch) => (hasTouch ? locator.tap() : locator.click());

const take = (problems, expected) => {
  const taken = problems.filter((problem) => expected.some((pattern) => pattern.test(problem)));
  expect(problems.filter((problem) => !taken.includes(problem))).toEqual([]);
  problems.length = 0;
  return taken;
};

test("the page reveals its content with every image loaded", async ({ page }) => {
  await open(page);
  await expect.poll(() => transparent(page)).toEqual([]);
  const broken = () =>
    page.locator("img[src]").evaluateAll((images) => images.filter((image) => !image.naturalWidth).map((image) => image.getAttribute("src")));
  await expect.poll(broken).toEqual([]);
});

test.describe("when a script fails to load", () => {
  test.skip(({ browserName, viewport }) => browserName === "webkit" && viewport.width > 600, "Mac Chrome and iPhone are enough");

  for (const [script, name] of [
    ["main.js", "the main module"],
    ["store.js", "a module that main.js imports"],
  ]) {
    test(`the content reveals after a delay when ${name} fails to load`, async ({ page, problems }) => {
      await page.route(`**/scripts/${script}`, (route) => route.abort());
      await page.goto("/");
      await expect.poll(() => transparent(page), { timeout: 10_000 }).toEqual([]);
      await expect(page.locator("html")).not.toHaveClass(/is-ready/);
      const taken = take(problems, [new RegExp(`/scripts/${script.replace(".", "\\.")}$`), /^Failed to load resource: net::ERR_FAILED$/]);
      expect(taken).toContainEqual(expect.stringMatching(`/scripts/${script}`));
    });
  }
});

test.describe("with JavaScript disabled", () => {
  test.use({ javaScriptEnabled: false });

  test("the content shows at once and results open as plain links", async ({ page, problems }) => {
    await page.goto("/");
    expect(await transparent(page)).toEqual([]);
    expect(await popup(page, () => result(page, "LinkedIn").click())).toBe(links.LinkedIn);
    take(problems, [/^csp http:\/\/127\.0\.0\.1:\d+\/scripts\/\w+\.js$/]);
  });
});

test("each filter shows only its section and changes the bar symbol", async ({ page, hasTouch }) => {
  await open(page);
  const sections = ["products", "projects", "profiles"];
  for (const mode of [...sections, "all"]) {
    await press(page.locator(`.filter[data-mode="${mode}"]`), hasTouch);
    await expect(page.locator('.filter[aria-pressed="true"]')).toHaveAttribute("data-mode", mode);
    await expect(page.locator(".bar-symbol.is-active")).toHaveAttribute("data-mode", mode);
    const [pressed, unpressed] = await Promise.all([true, false].map((state) => background(page.locator(`.filter[aria-pressed="${state}"]`).first())));
    expect(opacity(pressed)).toBeGreaterThan(opacity(unpressed));
    for (const section of sections) {
      const locator = page.locator(`.section[data-mode="${section}"]`);
      await (mode === "all" || mode === section ? expect(locator).toBeVisible() : expect(locator).toBeHidden());
    }
  }
});

test("the layout fits the screen with nothing overlapping", async ({ page }) => {
  await open(page);
  expect(await overlaps(page)).toEqual([]);
});

test("the content security policy blocks an injected style", async ({ page, problems }) => {
  await open(page);
  await page.evaluate(() => {
    const style = document.createElement("style");
    style.textContent = ".stage { opacity: 0.5 !important; }";
    document.head.append(style);
  });
  await expect.poll(() => problems).toContainEqual(expect.stringMatching(/^CSP violation: style-src/));
  await expect(page.locator(".stage")).toHaveCSS("opacity", "1");
  take(problems, [/^CSP violation: style-src/, /Content Security Policy/]);
});
