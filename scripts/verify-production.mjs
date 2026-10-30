import { assetCacheControl, htmlCacheControl, removedHeaders, securityHeaders } from "./security-policy.mjs";
import { publicationOrigin, sitemapUrls } from "./publication-config.mjs";

const hosts = ["kurosu.com.py", "www.kurosu.com.py", "enlaces.kurosuycia.com.py"];
const pages = ["/", "/contacto/", "/enlaces-de-productos/", "/soporte-tecnico/", "/promociones/", "/preguntas-frecuentes/", "/sobre-nosotros/", "/busqueda/", "/acceso-denegado/", "/404.html"];
const missingPath = "/security-check-not-found";
const jsonOnly = process.argv.includes("--json");
const results = [];

function report({ host, url, control, expected, observed, classification }) {
  results.push({ host, url, control, expected, observed, classification });
  if (!jsonOnly && classification !== "pass") console[classification === "error" ? "error" : "warn"](`[${classification}] ${url} — ${control}: esperado ${expected}; observado ${observed}`);
}

function cloudflareBlock(response, body) {
  return response.status === 403 && /(?:cf-error-details|cdn-cgi\/styles\/cf\.errors\.css|cloudflare)/i.test(body);
}

async function fetchChecked(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000), cache: "no-store" });
  return { response, body: await response.text() };
}

function absoluteLocalUrls(html, documentUrl) {
  const urls = new Set();
  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const value = match[1];
    if (!value.includes("assets/") || /^(?:data:|https?:|#)/i.test(value)) continue;
    const url = new URL(value, documentUrl);
    if (url.origin === new URL(documentUrl).origin) urls.add(url.href);
  }
  return urls;
}

function cssAssetUrls(css, stylesheetUrl) {
  const urls = new Set();
  for (const match of css.matchAll(/url\((?:"|')?([^"')]+)(?:"|')?\)/g)) {
    if (/^(?:data:|https?:|#)/i.test(match[1])) continue;
    const url = new URL(match[1], stylesheetUrl);
    if (/\/assets\/.+\.[a-f0-9]{12}\./.test(url.pathname)) urls.add(url.href);
  }
  return urls;
}

function checkHeaders(host, url, response, cacheControl) {
  const cache = response.headers.get("cache-control");
  report({ host, url, control: "Cache-Control", expected: cacheControl, observed: cache || "ausente", classification: cache === cacheControl ? "pass" : "error" });
  for (const [header, expected] of Object.entries(securityHeaders)) {
    const observed = response.headers.get(header);
    report({ host, url, control: header, expected, observed: observed || "ausente", classification: observed === expected ? "pass" : "error" });
  }
  const reintroduced = removedHeaders.filter((header) => response.headers.has(header));
  if (reintroduced.length) report({ host, url, control: "cabeceras eliminadas en el repositorio", expected: "ausentes", observed: reintroduced.join(", "), classification: "external-warning" });
}

async function checkAsset(host, url, checkedAssets) {
  if (checkedAssets.has(url)) return;
  checkedAssets.add(url);
  try {
    const { response, body } = await fetchChecked(url);
    if (!response.ok) {
      report({ host, url, control: "asset publicado", expected: "HTTP 200", observed: `HTTP ${response.status}`, classification: "error" });
      return;
    }
    checkHeaders(host, url, response, assetCacheControl);
    if (new URL(url).pathname.endsWith(".css")) for (const nested of cssAssetUrls(body, url)) await checkAsset(host, nested, checkedAssets);
  } catch (error) {
    report({ host, url, control: "asset publicado", expected: "respuesta accesible", observed: error.message, classification: "external-warning" });
  }
}

async function checkDocument(host, pathname, expectedStatus, assets) {
  const url = `https://${host}${pathname}`;
  try {
    const { response, body } = await fetchChecked(url);
    if (cloudflareBlock(response, body)) {
      report({ host, url, control: "respuesta de aplicacion", expected: `HTTP ${expectedStatus} con la landing`, observed: "HTTP 403 de Cloudflare", classification: "external-warning" });
      return;
    }
    report({ host, url, control: "estado HTTP", expected: `HTTP ${expectedStatus}`, observed: `HTTP ${response.status}`, classification: response.status === expectedStatus ? "pass" : "error" });
    if (!body.includes("ks-site-header") || !body.includes("<main")) {
      report({ host, url, control: "firma de la landing", expected: "cabecera y main de KUROSU & CÍA.", observed: "HTML sin la firma esperada", classification: "error" });
      return;
    }
    checkHeaders(host, url, response, htmlCacheControl);
    for (const asset of absoluteLocalUrls(body, url)) assets.add(asset);
  } catch (error) {
    report({ host, url, control: "respuesta de aplicacion", expected: "respuesta accesible", observed: error.message, classification: "external-warning" });
  }
}

async function checkPublishingFiles(host) {
  const robotsUrl = `https://${host}/robots.txt`;
  const sitemapUrl = `https://${host}/sitemap.xml`;
  const expectedRobots = `User-agent: *\nAllow: /\nSitemap: ${publicationOrigin}/sitemap.xml\n`;
  try {
    const { response, body } = await fetchChecked(robotsUrl);
    if (cloudflareBlock(response, body)) report({ host, url: robotsUrl, control: "robots.txt", expected: "archivo publicado", observed: "HTTP 403 de Cloudflare", classification: "external-warning" });
    else {
      report({ host, url: robotsUrl, control: "robots.txt", expected: expectedRobots, observed: body, classification: response.ok && body.replaceAll("\r\n", "\n") === expectedRobots ? "pass" : "error" });
      if (response.ok) checkHeaders(host, robotsUrl, response, htmlCacheControl);
    }
  } catch (error) {
    report({ host, url: robotsUrl, control: "robots.txt", expected: "archivo publicado", observed: error.message, classification: "external-warning" });
  }
  try {
    const { response, body } = await fetchChecked(sitemapUrl);
    if (cloudflareBlock(response, body)) {
      report({ host, url: sitemapUrl, control: "sitemap.xml", expected: "nueve URLs publicadas", observed: "HTTP 403 de Cloudflare", classification: "external-warning" });
      return;
    }
    const observed = Array.from(body.matchAll(/<loc>([^<]+)<\/loc>/g), (match) => match[1]);
    const expected = sitemapUrls();
    const valid = response.ok && observed.length === expected.length && expected.every((url) => observed.includes(url)) && observed.every((url) => expected.includes(url));
    report({ host, url: sitemapUrl, control: "sitemap.xml", expected: expected.join(", "), observed: observed.join(", ") || "sin URLs", classification: valid ? "pass" : "error" });
    if (response.ok) checkHeaders(host, sitemapUrl, response, htmlCacheControl);
  } catch (error) {
    report({ host, url: sitemapUrl, control: "sitemap.xml", expected: "archivo publicado", observed: error.message, classification: "external-warning" });
  }
}

async function checkHost(host) {
  const assets = new Set();
  for (const pathname of pages) await checkDocument(host, pathname, 200, assets);
  await checkDocument(host, missingPath, 404, assets);
  await checkPublishingFiles(host);
  const checkedAssets = new Set();
  for (const asset of assets) await checkAsset(host, asset, checkedAssets);
  try {
    const response = await fetch(`http://${host}/`, { redirect: "manual", signal: AbortSignal.timeout(10000) });
    await response.arrayBuffer();
    const location = response.headers.get("location") || "ausente";
    const valid = [301, 302, 307, 308].includes(response.status) && location.startsWith(`https://${host}/`);
    report({ host, url: `http://${host}/`, control: "redireccion HTTP a HTTPS", expected: `https://${host}/`, observed: `HTTP ${response.status}; ${location}`, classification: valid ? "pass" : "error" });
  } catch (error) {
    report({ host, url: `http://${host}/`, control: "redireccion HTTP a HTTPS", expected: `https://${host}/`, observed: error.message, classification: "external-warning" });
  }
}

for (const host of hosts) await checkHost(host);
const summary = {
  pass: results.filter((result) => result.classification === "pass").length,
  errors: results.filter((result) => result.classification === "error").length,
  externalWarnings: results.filter((result) => result.classification === "external-warning").length
};
const output = { checkedAt: new Date().toISOString(), publicationOrigin, results, summary };
if (jsonOnly) console.log(JSON.stringify(output, null, 2));
else console.log(`Verificacion de produccion: ${summary.pass} controles correctos, ${summary.errors} errores, ${summary.externalWarnings} advertencias externas.`);
if (summary.errors) process.exitCode = 1;
