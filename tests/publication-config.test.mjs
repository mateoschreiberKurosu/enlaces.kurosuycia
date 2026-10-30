import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { publicationOrigin, resolvePublicationOrigin, sitemapRoutes, sitemapUrls } from "../scripts/publication-config.mjs";
import { securityHeaders } from "../scripts/security-policy.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("publication origin defaults to the agreed secure canonical hostname", () => {
  assert.equal(resolvePublicationOrigin(), publicationOrigin);
  assert.equal(resolvePublicationOrigin("https://www.kurosu.com.py/"), publicationOrigin);
  assert.deepEqual(sitemapUrls(), sitemapRoutes.map((route) => `${publicationOrigin}${route}`));
});

test("publication origin rejects a different or unsafe URL", () => {
  for (const value of [
    "http://www.kurosu.com.py",
    "https://kurosu.com.py",
    "https://enlaces.kurosuycia.com.py",
    "https://www.kurosu.com.py/path",
    "https://www.kurosu.com.py/?query=1",
    "https://www.kurosu.com.py/#fragment",
    "https://user@example.test@www.kurosu.com.py",
    "not a URL"
  ]) assert.throws(() => resolvePublicationOrigin(value), /PUBLIC_SITE_URL/);
});

test("ordinary build always writes the canonical robots and non-empty sitemap", async () => {
  const env = { ...process.env };
  delete env.PUBLIC_SITE_URL;
  delete env.PRODUCTION_BUILD;
  execFileSync(process.execPath, ["scripts/build.mjs"], { cwd: root, env, stdio: "pipe" });
  const robots = await readFile(path.join(root, "dist", "robots.txt"), "utf8");
  const sitemap = await readFile(path.join(root, "dist", "sitemap.xml"), "utf8");
  assert.equal(robots, `User-agent: *\nAllow: /\nSitemap: ${publicationOrigin}/sitemap.xml\n`);
  assert.deepEqual(Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g), (match) => match[1]), sitemapUrls());
  assert.match(securityHeaders["Content-Security-Policy"], /(?:^|; )upgrade-insecure-requests(?:;|$)/);
});

test("build rejects a non-canonical publication origin before writing output", () => {
  const result = spawnSync(process.execPath, ["scripts/build.mjs"], {
    cwd: root,
    env: { ...process.env, PUBLIC_SITE_URL: "https://enlaces.kurosuycia.com.py" },
    stdio: "pipe",
    encoding: "utf8"
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /PUBLIC_SITE_URL/);
});
