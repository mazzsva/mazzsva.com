import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PORT ?? 8787);

const macBookAir = { viewport: { width: 1470, height: 830 }, deviceScaleFactor: 2, isMobile: false, hasTouch: false };

export default defineConfig({
  testDir: "tests/browser",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: "list",
  snapshotPathTemplate: "{testDir}/screenshots/{projectName}/{arg}{ext}",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    contextOptions: { reducedMotion: "reduce" },
    trace: "retain-on-failure",
  },
  projects: [
    { name: "Headers", testMatch: "headers.spec.js" },
    { name: "Mac Chrome", use: { browserName: "chromium", ...macBookAir }, testMatch: ["page.spec.js", "design.spec.js", "mac.spec.js"] },
    { name: "Mac Safari", use: { browserName: "webkit", ...macBookAir }, testMatch: ["page.spec.js", "design.spec.js", "mac.spec.js"] },
    { name: "iPad", use: devices["iPad Pro 11"], testMatch: ["page.spec.js", "design.spec.js", "ipad.spec.js"] },
    { name: "iPhone", use: devices["iPhone Air"], testMatch: ["page.spec.js", "design.spec.js", "iphone.spec.js"] },
  ],
  webServer: {
    command: `wrangler dev --ip 127.0.0.1 --port ${port} --show-interactive-dev-session=false`,
    url: `http://127.0.0.1:${port}/`,
    reuseExistingServer: !process.env.CI,
    env: { WRANGLER_SEND_METRICS: "false" },
    gracefulShutdown: { signal: "SIGTERM", timeout: 2000 },
  },
});
