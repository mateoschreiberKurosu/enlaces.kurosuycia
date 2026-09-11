import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { layout } from "../src/templates/layout.mjs";
import * as pages from "../src/templates/pages.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const sourceAssets = path.join(root, "src", "assets", "source");
const sourceImages = path.join(root, "src", "assets", "images");
const routes = [
  ["index.html", { title: "Inicio", description: "Kurosu & Cía. en Paraguay.", active: "/", body: pages.home() }],
  ["contacto/index.html", { title: "Contacto", description: "Canales de atención de Kurosu.", active: "/contacto/", body: pages.contact() }],
  ["enlaces-de-productos/index.html", { title: "Enlaces de Productos", description: "Categorías oficiales de productos Kurosu.", active: "/enlaces-de-productos/", body: pages.products() }],
  ["soporte-tecnico/index.html", { title: "Soporte Técnico", description: "Soporte técnico y recursos de Kurosu.", active: "/soporte-tecnico/", body: pages.support() }],
  ["promociones/index.html", { title: "Promociones", description: "Consultas sobre oportunidades vigentes de Kurosu.", active: "/promociones/", body: pages.promotions() }],
  ["preguntas-frecuentes/index.html", { title: "Preguntas frecuentes", description: "Respuestas rápidas del portal Kurosu.", active: "/preguntas-frecuentes/", body: pages.faq() }],
  ["sobre-nosotros/index.html", { title: "Sobre nosotros", description: "Información institucional de Kurosu & Cía.", active: "/sobre-nosotros/", body: pages.about() }],
  ["busqueda/index.html", { title: "Búsqueda", description: "Buscador del portal Kurosu.", active: "/busqueda/", body: pages.search() }],
  ["acceso-denegado/index.html", { title: "Acceso denegado", description: "Página de acceso restringido.", body: pages.message("denied") }],
  ["404.html", { title: "Página no encontrada", description: "Página no encontrada.", body: pages.message("404") }]
];

async function write(relative, contents) { const target = path.join(dist, relative); await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, contents, "utf8"); }
function localizeRootPaths(html, route) {
  const prefix = route.includes("/") ? "../" : "./";
  let localized = html.replaceAll('="/', `="${prefix}`).replaceAll(`${prefix}assets/images/icons.svg#`, "#");
  localized = localized.replaceAll(`href="${prefix}"`, `href="${prefix}index.html"`);
  localized = localized.replace(/href="(\.\/|\.\.\/)([a-záéíóúñ0-9-]+)\/"/gi, 'href="$1$2/index.html"');
  return localized;
}
function mimeType(file) {
  if (file.endsWith(".png")) return "image/png";
  if (file.endsWith(".jpg")) return "image/jpeg";
  if (file.endsWith(".woff2")) return "font/woff2";
  return "application/octet-stream";
}
async function dataUri(file) { return `data:${mimeType(file)};base64,${(await readFile(file)).toString("base64")}`; }
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
const globalCss = await readFile(path.join(sourceAssets, "kurosu-ui.css"), "utf8");
const bootstrapCss = await readFile(path.join(sourceAssets, "bootstrap.min.css"), "utf8");
const homeCss = await readFile(path.join(sourceAssets, "home.css"), "utf8");
const overrides = await readFile(path.join(root, "src", "assets", "overrides.css"), "utf8");
const fontNames = ["poppins-400-latin.woff2", "poppins-500-latin.woff2", "poppins-600-latin.woff2", "poppins-700-latin.woff2"];
const fontUris = Object.fromEntries(await Promise.all(fontNames.map(async (name) => [name, await dataUri(path.join(sourceAssets, name))])));
let styles = `${bootstrapCss}\n${globalCss}\n${homeCss}\n${overrides}\n`;
for (const [name, uri] of Object.entries(fontUris)) styles = styles.replaceAll(`url("/${name}")`, `url("${uri}")`);
const imageNames = ["kurosu-k-mark.png", "kurosu-hub-background-desktop.png", "kurosu-hub-background-mobile.png", "kurosu-hub-profile.jpg", "kurosu-hub-careers.jpg", "kurosu-hub-machinefinder.jpg", "kurosu-hub-official.jpg"];
const imageUris = Object.fromEntries(await Promise.all(imageNames.map(async (name) => [name, await dataUri(path.join(sourceAssets, name))])));
const favicon = `data:image/svg+xml;base64,${Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#102f22"/><image href="${imageUris["kurosu-k-mark.png"]}" x="10" y="10" width="44" height="44" preserveAspectRatio="xMidYMid meet"/></svg>`).toString("base64")}`;
for (const name of ["video-MuX-2vtmI8A.jpg", "video-PS-fCoKlDdk.jpg", "video-c1YK510VfYY.jpg"]) imageUris[name] = await dataUri(path.join(sourceImages, name));
const iconSprite = await readFile(path.join(root, "src", "assets", "icons.svg"), "utf8");
const appJs = await readFile(path.join(root, "src", "assets", "site.js"), "utf8");
const index = routes.filter(([route]) => route !== "404.html").map(([route, page]) => ({ title: page.title, description: page.description, url: route === "index.html" ? "/" : `/${route.replace(/index\.html$/, "")}` }));
for (const [route, page] of routes) {
  let html = layout(page);
  for (const [name, uri] of Object.entries(imageUris)) html = html.replaceAll(`/assets/images/${name}`, uri);
  html = html.replaceAll('__FAVICON__', favicon).replaceAll('__INLINE_STYLES__', styles).replaceAll('__ICON_SPRITE__', iconSprite).replaceAll('__SEARCH_INDEX__', JSON.stringify(index)).replaceAll('__ROUTE_PREFIX__', route.includes("/") ? "../" : "./").replaceAll('__INLINE_APP_JS__', appJs);
  await write(route, localizeRootPaths(html, route));
}
await write("robots.txt", "User-agent: *\nAllow: /\nSitemap: /sitemap.xml\n");
const siteUrl = (process.env.PUBLIC_SITE_URL || "").replace(/\/$/, "");
const sitemapUrls = siteUrl ? index.map(({ url }) => `<url><loc>${siteUrl}${url}</loc></url>`).join("") : "";
await write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapUrls}</urlset>`);
await write("_headers", "/*\n  Content-Security-Policy: default-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self'; frame-ancestors 'self'; img-src 'self' data:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com; connect-src 'self' https://cloudflareinsights.com; frame-src https://www.youtube-nocookie.com\n  Permissions-Policy: camera=(), geolocation=(), microphone=(), payment=(), usb=()\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: SAMEORIGIN\n  Referrer-Policy: strict-origin-when-cross-origin\n");
await write("_redirects", "/busqueda /busqueda/ 301\n/contacto /contacto/ 301\n/enlaces-de-productos /enlaces-de-productos/ 301\n/soporte-tecnico /soporte-tecnico/ 301\n/promociones /promociones/ 301\n/preguntas-frecuentes /preguntas-frecuentes/ 301\n/sobre-nosotros /sobre-nosotros/ 301\n/acceso-denegado /acceso-denegado/ 301\n");
console.log(`Build complete: ${routes.length} pages in ${dist}`);
