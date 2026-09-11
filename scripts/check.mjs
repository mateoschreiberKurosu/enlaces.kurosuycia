import { readdir, readFile, stat } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const root = path.resolve("dist");
const failures = [];
const productionBuild = process.env.PRODUCTION_BUILD === "1";
const siteUrl = (process.env.PUBLIC_SITE_URL || "").replace(/\/$/, "");
const sitemapRoutes = ["/", "/contacto/", "/enlaces-de-productos/", "/soporte-tecnico/", "/promociones/", "/preguntas-frecuentes/", "/sobre-nosotros/", "/busqueda/", "/acceso-denegado/"];
// Baseline post-correccion: home 18,317 B; secundaria maxima 11,267 B;
// assets compartidos ~2.61 MB y 17 archivos. El margen permite cambios menores.
const performanceBudget = { homeHtmlBytes: 23000, secondaryHtmlBytes: 14500, assetsBytes: 3300000, assetCount: 24 };
if (productionBuild && !siteUrl) failures.push("PUBLIC_SITE_URL es obligatorio cuando PRODUCTION_BUILD=1.");

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    results.push(...(entry.isDirectory() ? await walk(full) : [full]));
  }
  return results;
}

const files = await walk(root);
const html = files.filter((file) => file.endsWith(".html"));
const assetFiles = files.filter((file) => file.includes(`${path.sep}assets${path.sep}`));
for (const file of html) {
  const content = await readFile(file, "utf8");
  if (/\{[{%]/.test(content)) failures.push(`${file}: Liquid sin procesar`);
  if (/href=["']#["']/.test(content)) failures.push(`${file}: href=# invalido`);
  if (/spotify/i.test(content)) failures.push(`${file}: Spotify detectado`);
  if (!content.includes("<main")) failures.push(`${file}: sin main`);
  if (/\b(?:src|href)="\/(?!\/)/.test(content)) failures.push(`${file}: ruta absoluta incompatible con file://`);
  if (/\bsrc="https?:\/\//.test(content)) failures.push(`${file}: recurso remoto no permitido`);
  if (/data:(?:font|image|text\/css|text\/javascript)/.test(content)) failures.push(`${file}: assets inline no permitidos`);
  const ids = new Set(Array.from(content.matchAll(/\sid="([^"]+)"/g), (match) => match[1]));
  for (const match of content.matchAll(/\saria-labelledby="([^"]+)"/g)) {
    for (const id of match[1].trim().split(/\s+/)) if (!ids.has(id)) failures.push(`${file}: aria-labelledby sin destino (${id})`);
  }
  for (const match of content.matchAll(/(?:href|src|srcset)="([^"#?]*assets\/[^"#?]+)(?:#[^"]*)?"/g)) {
    try { await stat(path.resolve(path.dirname(file), match[1])); } catch { failures.push(`${file}: asset local inexistente (${match[1]})`); }
  }
  for (const anchor of content.match(/<a\b(?=[^>]*\bhref="https?:\/\/)[^>]*>/gi) || []) {
    if (!/\btarget="_blank"/.test(anchor) || !/\brel="noopener noreferrer"/.test(anchor)) failures.push(`${file}: enlace externo sin aislamiento seguro`);
  }
}

const homeFile = path.join(root, "index.html");
const home = await readFile(homeFile, "utf8");
const cssMatch = home.match(/<link rel="stylesheet" href="([^"]*assets\/css\/site\.[a-f0-9]{12}\.css)">/);
const jsMatch = home.match(/<script src="([^"]*assets\/js\/site\.[a-f0-9]{12}\.js)"><\/script>/);
if (!cssMatch || !jsMatch) failures.push("index.html: CSS o JavaScript fingerprinted inexistente");
const styles = cssMatch ? await readFile(path.resolve(path.dirname(homeFile), cssMatch[1]), "utf8") : "";
const siteJs = jsMatch ? await readFile(path.resolve(path.dirname(homeFile), jsMatch[1]), "utf8") : "";
const assetNames = assetFiles.map((file) => path.relative(root, file).replaceAll("\\", "/"));
if (!assetNames.every((file) => /^assets\/(?:css|fonts|images|js)\/.+\.[a-f0-9]{12}\./.test(file))) failures.push("dist/assets: archivo sin fingerprint");
if ((home.match(/data-ks-video data-video-id/g) || []).length !== 3) failures.push("index.html: faltan reproductores diferidos de YouTube");
if (!siteJs.includes("youtube-nocookie.com/embed/") || !siteJs.includes("controls=1") || !siteJs.includes("playsinline=1")) failures.push("site.js: configuracion de iframe YouTube incompleta");
if (!/<link rel="icon" type="image\/svg\+xml" href="\.\/assets\/images\/favicon\.[a-f0-9]{12}\.svg">/.test(home) || home.includes("Logo-sm-64.png")) failures.push("index.html: favicon Kurosu invalido");
if (!home.includes("id=\"searchToggle\"") || !home.includes("ks-header-search__group") || !home.includes("ks-header-search__submit") || !styles.includes("is-search-open") || home.includes("ks-search-link")) failures.push("index.html: buscador del header invalido");
if (!/body\s*\{[^}]*display:\s*flex[^}]*flex-direction:\s*column[^}]*margin:\s*0/.test(styles) || !styles.includes("body > main { flex: 1 0 auto; }") || !styles.includes(".ks-site-footer { flex: 0 0 auto; }") || !styles.includes("min-height: 100dvh") || !styles.includes(".ks-site-footer__bottom .ks-shell-container { display: flex; justify-content: center; }")) failures.push("site.css: viewport o pie no centrado");
if (!styles.includes(".ks-video-list {\n  display: grid;\n  grid-template-columns: minmax(0, 1fr);") || styles.includes("grid-auto-flow: column")) failures.push("site.css: carrusel movil no eliminado");
if (!home.includes("Powered by: Kurosu &amp; Cía S.A.")) failures.push("index.html: pie institucional incompleto");
for (const file of html.filter((file) => !file.endsWith("404.html"))) {
  const content = await readFile(file, "utf8");
  if (/href="(?:\.\/|\.\.\/)[^"]+\/$/.test(content)) failures.push(`${file}: enlace local apunta a carpeta`);
  for (const anchor of content.match(/<a\b(?=[^>]*\bhref="(?:\.\/|\.\.\/)(?:index\.html|[^"]+\/index\.html)")[^>]*>/gi) || []) {
    if (/\btarget="_blank"/.test(anchor)) failures.push(`${file}: enlace interno abre una pestana nueva`);
  }
}
if (siteJs.includes("innerHTML")) failures.push("site.js: renderizado HTML inseguro");
if (!siteJs.includes('addEventListener("input"') || !siteJs.includes("contains(event.target)") || !siteJs.includes("closeNavigation")) failures.push("site.js: interacciones de busqueda o menu incompletas");

const headers = await readFile(path.join(root, "_headers"), "utf8");
for (const header of ["Content-Security-Policy:", "Permissions-Policy:", "X-Content-Type-Options: nosniff", "X-Frame-Options: SAMEORIGIN", "Referrer-Policy: strict-origin-when-cross-origin", "frame-src https://www.youtube-nocookie.com", "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com", "connect-src 'self' https://cloudflareinsights.com", "Cache-Control: public, max-age=31556952, immutable"]) {
  if (!headers.includes(header)) failures.push(`_headers: falta ${header}`);
}
const sitemap = await readFile(path.join(root, "sitemap.xml"), "utf8");
if (productionBuild) {
  const locations = Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g), (match) => match[1]);
  if (locations.length !== sitemapRoutes.length) failures.push(`sitemap.xml: se esperaban ${sitemapRoutes.length} URLs y se encontraron ${locations.length}`);
  for (const route of sitemapRoutes) if (!locations.includes(`${siteUrl}${route}`)) failures.push(`sitemap.xml: falta ${siteUrl}${route}`);
  const robots = await readFile(path.join(root, "robots.txt"), "utf8");
  if (!robots.includes(`Sitemap: ${siteUrl}/sitemap.xml`)) failures.push(`robots.txt: falta Sitemap: ${siteUrl}/sitemap.xml`);
}

const homeSize = (await stat(homeFile)).size;
const secondarySizes = await Promise.all(html.filter((file) => path.basename(file) === "index.html" && file !== homeFile).map(async (file) => (await stat(file)).size));
const assetsBytes = (await Promise.all(assetFiles.map(async (file) => (await stat(file)).size))).reduce((total, size) => total + size, 0);
if (homeSize > performanceBudget.homeHtmlBytes) failures.push(`presupuesto: home HTML supera ${performanceBudget.homeHtmlBytes} bytes (${homeSize})`);
if (Math.max(...secondarySizes) > performanceBudget.secondaryHtmlBytes) failures.push(`presupuesto: HTML secundario supera ${performanceBudget.secondaryHtmlBytes} bytes (${Math.max(...secondarySizes)})`);
if (assetsBytes > performanceBudget.assetsBytes) failures.push(`presupuesto: assets superan ${performanceBudget.assetsBytes} bytes (${assetsBytes})`);
if (assetFiles.length > performanceBudget.assetCount) failures.push(`presupuesto: cantidad de assets supera ${performanceBudget.assetCount} (${assetFiles.length})`);

const run = promisify(execFile);
for (const file of [path.resolve("src/assets/site.js"), path.resolve("scripts/build.mjs"), path.resolve("scripts/check.mjs")]) {
  try { await run(process.execPath, ["--check", file]); } catch (error) { failures.push(`${file}: ${error.stderr || error.message}`); }
}
if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log(`Checks passed: ${html.length} HTML files, ${assetFiles.length} fingerprinted assets, security headers, budgets, and interactions verified.`);
