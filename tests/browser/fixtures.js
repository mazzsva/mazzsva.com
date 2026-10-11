import { test as base, expect } from "@playwright/test";

export { expect };

export const links = {
  Lexicon: "https://github.com/mazzsva/Lexicon",
  "claude-skills": "https://github.com/mazzsva/claude-skills",
  GitHub: "https://github.com/mazzsva",
  LinkedIn: "https://www.linkedin.com/in/mazzsva",
};

export const test = base.extend({
  problems: async ({}, use) => {
    await use([]);
  },

  context: async ({ context }, use) => {
    await context.route(
      (url) => url.hostname !== "127.0.0.1",
      (route) => route.fulfill({ contentType: "text/html", body: "<title>External</title>" }),
    );
    await use(context);
  },

  page: async ({ page, problems }, use) => {
    await page.addInitScript(() =>
      addEventListener("securitypolicyviolation", (event) =>
        console.error(`CSP violation: ${event.effectiveDirective} ${event.blockedURI}`),
      ),
    );
    page.on("console", (message) => message.type() === "error" && problems.push(message.text()));
    page.on("pageerror", (error) => problems.push(error.message));
    page.on("requestfailed", (request) => problems.push(`${request.failure()?.errorText} ${request.url()}`));
    page.on("response", (response) => response.status() >= 400 && problems.push(`${response.status()} ${response.url()}`));
    await use(page);
    expect(problems).toEqual([]);
  },
});

export async function open(page) {
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/is-ready/);
}

export const overlaps = (page) =>
  page.evaluate(() => {
    const box = (selector) => {
      const element = document.querySelector(selector);
      return element.checkVisibility() ? element.getBoundingClientRect() : null;
    };
    const [panel, hints, copyright] = [".panel", ".hints", ".copyright"].map(box);
    return [
      document.documentElement.scrollWidth > innerWidth && "the page scrolls sideways",
      (panel.left < 0 || panel.right > innerWidth) && "the panel is wider than the screen",
      hints && hints.top < panel.bottom && "the hints overlap the panel",
      copyright.top < Math.max(panel.bottom, hints?.bottom ?? 0) && "the copyright overlaps the panel or the hints",
    ].filter(Boolean);
  });

export const settled = (locator) =>
  locator.evaluate((element) =>
    Promise.all(
      element
        .getAnimations({ subtree: true })
        .filter((animation) => animation.effect.getTiming().iterations !== Infinity)
        .map((animation) => animation.finished),
    ),
  );

export const result = (page, title) => page.locator(".result", { has: page.locator(".result-title", { hasText: new RegExp(`^${RegExp.escape(title)}$`) }) });

export const background = (locator) => locator.evaluate((element) => getComputedStyle(element).backgroundColor);

export const selected = (page) => page.locator(".result.is-selected");

export const sheet = (page) => page.locator("dialog.sheet");

export async function popup(page, action) {
  const opened = page.context().waitForEvent("page");
  await action();
  const tab = await opened;
  await tab.waitForLoadState();
  return tab.url();
}
