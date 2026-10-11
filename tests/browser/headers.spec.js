import { expect, test } from "@playwright/test";

const policy =
  "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

test("the page has the strict security policy and sets no cookie", async ({ request }) => {
  const response = await request.get("/");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-security-policy"]).toBe(policy);
  expect(response.headers()["cross-origin-opener-policy"]).toBe("same-origin");
  expect(response.headersArray().filter(({ name }) => name.toLowerCase() === "set-cookie")).toEqual([]);
});

test("assets stay in the cache for a day", async ({ request }) => {
  const response = await request.get("/assets/preview.png");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe("public, max-age=86400, stale-while-revalidate=604800");
});

test("the page, scripts, and styles revalidate on every load", async ({ request }) => {
  for (const path of ["/", "/scripts/main.js", "/styles/base.css"]) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"], path).toBe("public, max-age=0, must-revalidate");
  }
});
