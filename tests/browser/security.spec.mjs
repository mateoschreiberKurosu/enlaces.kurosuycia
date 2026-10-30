import { test, expect } from "@playwright/test";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { securityHeaders, assetCacheControl } from "../../scripts/security-policy.mjs";

const root = fileURLToPath(new URL("../../dist/", import.meta.url));
const routes = ["index.html", "contacto/index.html", "enlaces-de-productos/index.html", "soporte-tecnico/index.html", "promociones/index.html", "preguntas-frecuentes/index.html", "sobre-nosotros/index.html", "busqueda/index.html", "acceso-denegado/index.html", "404.html"];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.auditViolations = [];
    document.addEventListener("securitypolicyviolation", e => window.auditViolations.push(`${e.effectiveDirective}: ${e.blockedURI}`));
  });
});

for (const route of routes) {
  test(`${route}: strict CSP, resources and layout`, async ({ page }) => {
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    const response = await page.goto(`/${route}`);
    await page.evaluate(() => document.fonts.ready);
    for (const [k,v] of Object.entries(securityHeaders)) expect(response.headers()[k.toLowerCase()]).toBe(v);
    await expect(page.locator("main")).toBeVisible();
    expect(await page.locator(".ks-icon-sprite").evaluate(e => getComputedStyle(e).display)).toBe("none");
    expect(await page.locator("script:not([src]),[style],[onclick],[onerror],[onload]").count()).toBe(0);
    expect(await page.locator('a[href*="www.kurosu.com.py"]').count()).toBe(0);
    expect(await page.locator("a[target='_blank']").evaluateAll(els => els.every(e => e.rel.includes("noopener") && e.rel.includes("noreferrer")))).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.evaluate(() => window.auditViolations)).toEqual([]);
    expect(errors).toEqual([]);
    if (["index.html", "sobre-nosotros/index.html"].includes(route)) await page.screenshot({ path: `test-results/${test.info().project.name}-${route.split("/")[0]}.png`, fullPage: true });
  });
}

for (const protocol of ["http", "file"]) {
  test(`${protocol}: both search forms initialize without inline JS or XSS`, async ({ page }) => {
    const url = protocol === "http" ? "/busqueda/index.html" : pathToFileURL(path.join(root, "busqueda/index.html")).href;
    await page.goto(`${url}?q=${encodeURIComponent('<svg onload="window.auditXss=1">')}`);
    await expect(page.locator("#searchInput")).toHaveValue('<svg onload="window.auditXss=1">');
    expect(await page.evaluate(() => window.auditXss)).toBeUndefined();
    expect(await page.locator("svg[onload]").count()).toBe(0);
    await page.locator("#searchInput").fill("Contacto");
    await expect(page.locator("#searchResults a")).toHaveText("Contacto");
    const link = page.locator("#searchResults a");
    if (protocol === "file") expect(await link.getAttribute("href")).toBe("../contacto/index.html");
    else expect(await link.getAttribute("href")).toBe("/contacto/");
    await link.click();
    await expect(page.locator("h1")).toHaveText("Estamos para ayudarte");
    if (await page.locator("#menuToggle").isVisible()) await page.locator("#menuToggle").click();
    await page.locator("#searchToggle").click();
    await page.locator("#headerSearchInput").fill("Productos");
    await expect(page.locator("#headerSearchResults a")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(page.locator("#headerSearch")).toBeHidden();
    expect(await page.evaluate(() => window.auditViolations)).toEqual([]);
  });
}

test("video remains deferred and the permitted iframe is usable", async ({ page }) => {
  // A deterministic remote fixture checks iframe loading under our actual CSP;
  // it does not claim that YouTube itself is available from every CI network.
  await page.route("https://www.youtube-nocookie.com/embed/**", route => route.fulfill({ contentType: "text/html", body: "<p>Video fixture</p>" }));
  await page.goto("/");
  await expect(page.locator("iframe")).toHaveCount(0);
  await page.locator("[data-ks-video-trigger]").first().click();
  await expect(page.frameLocator("iframe").locator("p")).toHaveText("Video fixture");
  await expect(page.locator("iframe")).toHaveAttribute("src", /controls=1&playsinline=1/);
  expect(await page.evaluate(() => window.auditViolations)).toEqual([]);
});

test("Insights stays allowed but unexpected scripts and inline handlers are blocked", async ({ page }) => {
  await page.route("https://static.cloudflareinsights.com/**", route => route.fulfill({ contentType: "application/javascript", body: "window.analyticsFixture=true;" }));
  await page.goto("/");
  await page.addScriptTag({ url: "https://static.cloudflareinsights.com/beacon.min.js" });
  expect(await page.evaluate(() => window.analyticsFixture)).toBe(true);
  await page.evaluate(() => {
    const e = document.createElement("script");
    e.textContent = "window.inlineShouldNotRun=true";
    document.body.appendChild(e);
    const button = document.createElement("button");
    button.setAttribute("onclick", "window.handlerShouldNotRun=true");
    document.body.appendChild(button);
    button.click();
  });
  expect(await page.evaluate(() => window.inlineShouldNotRun)).toBeUndefined();
  expect(await page.evaluate(() => window.handlerShouldNotRun)).toBeUndefined();
  await page.addScriptTag({ url: "https://unexpected.invalid/audit.js" }).catch(() => {});
  await expect.poll(() => page.evaluate(() => window.auditViolations.some(v => v.includes("https://unexpected.invalid/audit.js")))).toBe(true);
});

test("HTML revalidates; fingerprinted CSS/JS cache immutably; 404 is protected", async ({ request }) => {
  const html = await request.get("/");
  expect(html.headers()["cache-control"]).toBe("public, max-age=0, must-revalidate");
  const body = await html.text();
  const assets = [...body.matchAll(/(?:src|href)="([^\"]*assets\/(?:css|js)\/[^"]+)"/g)].map(m => m[1]);
  expect(assets).toHaveLength(3);
  for (const asset of assets) {
    const response = await request.get(new URL(asset, "http://127.0.0.1:8799/" ).href);
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toBe(assetCacheControl);
    expect(response.headers()["cross-origin-resource-policy"]).toBe("same-origin");
  }
  const missing = await request.get("/not-found-security");
  expect(missing.status()).toBe(404);
  expect(missing.headers()["content-security-policy"]).toBe(securityHeaders["Content-Security-Policy"]);
});

test("all file:// pages retain their local assets and initialization", async ({ page }) => {
  for (const route of routes) {
    const errors = [];
    const collect = e => errors.push(e.message);
    page.on("pageerror", collect);
    await page.goto(pathToFileURL(path.join(root, route)).href);
    await expect(page.locator("main")).toBeVisible();
    expect(await page.evaluate(() => window.KS_SEARCH_INDEX.length)).toBe(9);
    expect(await page.locator(".ks-site-brand__logo").evaluateAll(els => els.every(e => e.complete && e.naturalWidth > 0))).toBe(true);
    expect(errors).toEqual([]);
    page.removeListener("pageerror", collect);
  }
});
