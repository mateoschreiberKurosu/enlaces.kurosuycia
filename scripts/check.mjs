import { readdir, readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const root = path.resolve("dist");
const failures = [];
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
for (const file of html) {
  const content = await readFile(file, "utf8");
  if (/\{[{%]/.test(content)) failures.push(`${file}: Liquid sin procesar`);
  if (/href=["']#["']/.test(content)) failures.push(`${file}: href=# invalido`);
  if (/spotify/i.test(content)) failures.push(`${file}: Spotify detectado`);
  if (!content.includes("<main")) failures.push(`${file}: sin main`);
  if (/\b(?:src|href)="\/(?!\/)/.test(content)) failures.push(`${file}: ruta absoluta incompatible con file://`);
  if (/\bsrc="https?:\/\//.test(content)) failures.push(`${file}: recurso remoto no permitido`);
  if (!content.includes("data:font/woff2;base64")) failures.push(`${file}: fuente local no incluida`);
  for (const anchor of content.match(/<a\b(?=[^>]*\bhref="https?:\/\/)[^>]*>/gi) || []) {
    if (!/\btarget="_blank"/.test(anchor) || !/\brel="noopener noreferrer"/.test(anchor)) failures.push(`${file}: enlace externo sin aislamiento seguro`);
  }
}
const home = await readFile(path.join(root, "index.html"), "utf8");
if ((home.match(/data-ks-video data-video-id/g) || []).length !== 3) failures.push("index.html: faltan reproductores diferidos de YouTube");
if (!home.includes("youtube-nocookie.com/embed/") || !home.includes("controls=1") || !home.includes("playsinline=1")) failures.push("index.html: configuracion de iframe YouTube incompleta");
const faviconMatch = home.match(/<link rel="icon" type="image\/svg\+xml" href="data:image\/svg\+xml;base64,([^\"]+)"/);
const faviconSvg = faviconMatch ? Buffer.from(faviconMatch[1], "base64").toString("utf8") : "";
if (!faviconMatch || !faviconSvg.includes('fill="#102f22"') || home.includes("Logo-sm-64.png")) failures.push("index.html: favicon Kurosu invalido");
if (!home.includes("id=\"searchToggle\"") || !home.includes("ks-header-search__group") || !home.includes("ks-header-search__submit") || home.includes("ks-search-link")) failures.push("index.html: buscador del header invalido");
if (!/body\s*\{[^}]*margin:\s*0/.test(home) || !home.includes("min-height: 100dvh") || !home.includes(".ks-site-footer__legal { display: block !important; width: 100%; text-align: center; }")) failures.push("index.html: viewport o pie no centrado");
if (!home.includes(".ks-video-list {\n  display: grid;\n  grid-template-columns: minmax(0, 1fr);") || home.includes("grid-auto-flow: column")) failures.push("index.html: carrusel movil no eliminado");
if (!home.includes("Powered by: Kurosu &amp; Cía S.A.")) failures.push("index.html: pie institucional incompleto");
for (const file of html.filter((file) => !file.endsWith("404.html"))) {
  const content = await readFile(file, "utf8");
  if (/href="(?:\.\/|\.\.\/)[^"]+\/$/.test(content)) failures.push(`${file}: enlace local apunta a carpeta`);
  for (const anchor of content.match(/<a\b(?=[^>]*\bhref="(?:\.\/|\.\.\/)(?:index\.html|[^\"]+\/index\.html)")[^>]*>/gi) || []) {
    if (/\btarget="_blank"/.test(anchor)) failures.push(`${file}: enlace interno abre una pestana nueva`);
  }
}
const siteJs = await readFile(path.resolve("src/assets/site.js"), "utf8");
if (siteJs.includes("innerHTML")) failures.push("site.js: renderizado HTML inseguro");
if (!siteJs.includes('addEventListener("input"') || !siteJs.includes("contains(event.target)")) failures.push("site.js: interacciones de busqueda o menu incompletas");
const headers = await readFile(path.join(root, "_headers"), "utf8");
for (const header of ["Content-Security-Policy:", "Permissions-Policy:", "X-Content-Type-Options: nosniff", "X-Frame-Options: SAMEORIGIN", "Referrer-Policy: strict-origin-when-cross-origin", "frame-src https://www.youtube-nocookie.com", "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com", "connect-src 'self' https://cloudflareinsights.com"]) {
  if (!headers.includes(header)) failures.push(`_headers: falta ${header}`);
}
const run = promisify(execFile);
for (const file of [path.resolve("src/assets/site.js"), path.resolve("scripts/build.mjs"), path.resolve("scripts/check.mjs")]) {
  try { await run(process.execPath, ["--check", file]); } catch (error) { failures.push(`${file}: ${error.stderr || error.message}`); }
}
if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log(`Checks passed: ${html.length} HTML files, security headers, local assets, and interactions verified.`);
