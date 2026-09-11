import { readdir, readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
const root = path.resolve("dist"); const failures = [];
async function walk(dir) { const entries = await readdir(dir, { withFileTypes: true }); const results = []; for (const entry of entries) { const full = path.join(dir, entry.name); results.push(...(entry.isDirectory() ? await walk(full) : [full])); } return results; }
const files = await walk(root); const html = files.filter((file) => file.endsWith(".html"));
for (const file of html) { const content = await readFile(file, "utf8"); if (/\{[{%]/.test(content)) failures.push(`${file}: Liquid sin procesar`); if (/href=["']#["']/.test(content)) failures.push(`${file}: href=# inválido`); if (/spotify/i.test(content)) failures.push(`${file}: Spotify detectado`); if (!content.includes("<main")) failures.push(`${file}: sin main`); }
for (const file of html) { const content = await readFile(file, "utf8"); if (/\b(?:src|href)="\/(?!\/)/.test(content)) failures.push(`${file}: ruta absoluta incompatible con file://`); }
for (const file of html) { const content = await readFile(file, "utf8"); if (/\bsrc="https?:\/\//.test(content)) failures.push(`${file}: recurso remoto no permitido`); if (!content.includes("data:font/woff2;base64")) failures.push(`${file}: fuente local no incluida`); }
const home = await readFile(path.join(root, "index.html"), "utf8");
if ((home.match(/data-ks-video data-video-id/g) || []).length !== 3) failures.push("index.html: faltan reproductores diferidos de YouTube");
if (!home.includes("youtube-nocookie.com/embed/") || !home.includes("controls=1") || !home.includes("playsinline=1")) failures.push("index.html: configuración de iframe YouTube incompleta");
for (const file of html.filter((file) => !file.endsWith("404.html"))) { const content = await readFile(file, "utf8"); if (/href="(?:\.\/|\.\.\/)[^"]+\/$/.test(content)) failures.push(`${file}: enlace local apunta a carpeta`); }
const run = promisify(execFile);
for (const file of [path.resolve("src/assets/site.js")]) { try { await run(process.execPath, ["--check", file]); } catch (error) { failures.push(`${file}: ${error.stderr || error.message}`); } }
if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log(`Checks passed: ${html.length} HTML files, no Liquid, no href=#, no Spotify.`);
