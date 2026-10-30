import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { layout } from "../src/templates/layout.mjs";
import * as pages from "../src/templates/pages.mjs";
import { disableOfficialSiteLinks } from "../src/templates/maintenance.mjs";
import { renderHeadersFile } from "./security-policy.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const sourceAssets = path.join(root, "src", "assets", "source");
const sourceImages = path.join(root, "src", "assets", "images");
const iconSprite = await readFile(path.join(root, "src", "assets", "icons.svg"), "utf8");
const productionBuild = process.env.PRODUCTION_BUILD === "1";
const siteUrl = (process.env.PUBLIC_SITE_URL || "").replace(/\/$/, "");
if (productionBuild && !siteUrl) throw new Error("PUBLIC_SITE_URL es obligatorio cuando PRODUCTION_BUILD=1.");

const routes = [
  ["index.html", { title: "Inicio", description: "KUROSU & CÍA. en Paraguay.", active: "/", body: pages.home() }],
  ["contacto/index.html", { title: "Contacto", description: "Canales de atención de KUROSU & CÍA.", active: "/contacto/", body: pages.contact() }],
  ["enlaces-de-productos/index.html", { title: "Enlaces de Productos", description: "Categorías oficiales de productos KUROSU & CÍA.", active: "/enlaces-de-productos/", body: pages.products() }],
  ["soporte-tecnico/index.html", { title: "Soporte Técnico", description: "Soporte técnico y recursos de KUROSU & CÍA.", active: "/soporte-tecnico/", body: pages.support() }],
  ["promociones/index.html", { title: "Promociones", description: "Consultas sobre oportunidades vigentes de KUROSU & CÍA.", active: "/promociones/", body: pages.promotions() }],
  ["preguntas-frecuentes/index.html", { title: "Preguntas frecuentes", description: "Respuestas rápidas del portal KUROSU & CÍA.", active: "/preguntas-frecuentes/", body: pages.faq() }],
  ["sobre-nosotros/index.html", { title: "Sobre nosotros", description: "Información institucional de KUROSU & CÍA.", active: "/sobre-nosotros/", body: pages.about() }],
  ["busqueda/index.html", { title: "Búsqueda", description: "Buscador del portal KUROSU & CÍA.", active: "/busqueda/", body: pages.search() }],
  ["acceso-denegado/index.html", { title: "Acceso denegado", description: "Página de acceso restringido.", body: pages.message("denied") }],
  ["404.html", { title: "Página no encontrada", description: "Página no encontrada.", body: pages.message("404") }]
];

async function write(relative, contents) {
  const target = path.join(dist, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, contents);
}

function fingerprint(contents) {
  return createHash("sha256").update(contents).digest("hex").slice(0, 12);
}

async function writeAsset(directory, name, contents) {
  const extension = path.extname(name);
  const stem = path.basename(name, extension);
  const fileName = `${stem}.${fingerprint(contents)}${extension}`;
  const relative = `assets/${directory}/${fileName}`;
  await write(relative, contents);
  return relative;
}

async function copyAsset(directory, file, sourceDirectory = sourceAssets) {
  return writeAsset(directory, file, await readFile(path.join(sourceDirectory, file)));
}

function localizeRootPaths(html, route) {
  const prefix = route.includes("/") ? "../" : "./";
  let localized = html.replaceAll('="/', `="${prefix}`);
  localized = localized.replaceAll(`href="${prefix}"`, `href="${prefix}index.html"`);
  localized = localized.replace(/href="(\.\/|\.\.\/)([a-záéíóúñ0-9-]+)\/"/gi, 'href="$1$2/index.html"');
  return localized;
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

const fontNames = ["poppins-400-latin.woff2", "poppins-500-latin.woff2", "poppins-600-latin.woff2", "poppins-700-latin.woff2"];
const imageNames = ["kurosu-logo-black.svg", "kurosu-logo-white.svg", "kurosu-hub-background-desktop.png", "kurosu-hub-background-mobile.png", "kurosu-hub-profile.jpg", "kurosu-hub-machinefinder.jpg", "kurosu-hub-official.jpg"];
const videoNames = ["video-MuX-2vtmI8A.jpg", "video-PS-fCoKlDdk.jpg", "video-c1YK510VfYY.jpg"];
const assetPaths = Object.fromEntries(await Promise.all([
  ...fontNames.map(async (name) => [name, await copyAsset("fonts", name)]),
  ...imageNames.map(async (name) => [name, await copyAsset("images", name)]),
  ...videoNames.map(async (name) => [name, await copyAsset("images", name, sourceImages)])
]));

const logoSvg = await readFile(path.join(sourceAssets, "kurosu-logo-black.svg"), "utf8");
const favicon = await writeAsset("images", "favicon.svg", Buffer.from(logoSvg.replace(/(<svg\b[^>]*>)/, '$1<rect width="100%" height="100%" fill="white"/>')));

let styles = `${await readFile(path.join(sourceAssets, "bootstrap.min.css"), "utf8")}\n${await readFile(path.join(sourceAssets, "kurosu-ui.css"), "utf8")}\n${await readFile(path.join(sourceAssets, "home.css"), "utf8")}\n${await readFile(path.join(root, "src", "assets", "overrides.css"), "utf8")}\n`;
for (const name of fontNames) styles = styles.replaceAll(`url("/${name}")`, `url("../fonts/${path.basename(assetPaths[name])}")`);
const siteCss = await writeAsset("css", "site.css", Buffer.from(styles));
const siteJs = await writeAsset("js", "site.js", await readFile(path.join(root, "src", "assets", "site.js")));

const searchIndex = routes.filter(([route]) => route !== "404.html").map(([route, page]) => ({ title: page.title, description: page.description, url: route === "index.html" ? "/" : `/${route.replace(/index\.html$/, "")}` }));
const initJs = await writeAsset("js", "init.js", Buffer.from(`window.KS_SEARCH_INDEX=${JSON.stringify(searchIndex)};\nwindow.KS_ROUTE_PREFIX=document.body.dataset.ksRoutePrefix;\n`));
for (const [route, page] of routes) {
  let html = disableOfficialSiteLinks(layout(page));
  for (const [name, assetPath] of Object.entries(assetPaths)) html = html.replaceAll(`/assets/images/${name}`, `/${assetPath}`);
  html = html.replaceAll("__ICON_SPRITE__", iconSprite).replaceAll("__FAVICON__", `/${favicon}`).replaceAll("__SITE_CSS__", `/${siteCss}`).replaceAll("__SITE_JS__", `/${siteJs}`).replaceAll("__INIT_JS__", `/${initJs}`).replaceAll("__ROUTE_PREFIX__", route.includes("/") ? "../" : "./");
  await write(route, localizeRootPaths(html, route));
}

const sitemapLocation = siteUrl ? `${siteUrl}/sitemap.xml` : "/sitemap.xml";
await write("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${sitemapLocation}\n`);
const sitemapUrls = siteUrl ? searchIndex.map(({ url }) => `<url><loc>${siteUrl}${url}</loc></url>`).join("") : "";
await write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapUrls}</urlset>`);
await write("_headers", renderHeadersFile());
await write("_redirects", "/busqueda /busqueda/ 301\n/contacto /contacto/ 301\n/enlaces-de-productos /enlaces-de-productos/ 301\n/soporte-tecnico /soporte-tecnico/ 301\n/promociones /promociones/ 301\n/preguntas-frecuentes /preguntas-frecuentes/ 301\n/sobre-nosotros /sobre-nosotros/ 301\n/acceso-denegado /acceso-denegado/ 301\n");
console.log(`Build complete: ${routes.length} pages and ${Object.keys(assetPaths).length + 4} fingerprinted assets in ${dist}`);
