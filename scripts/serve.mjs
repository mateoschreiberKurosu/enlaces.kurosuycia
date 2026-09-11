import { createReadStream, existsSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = path.join(projectRoot, "dist");
const port = Number(process.env.PORT || 8788);
const types = { ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml; charset=utf-8" };

if (!existsSync(path.join(distRoot, "index.html"))) {
  console.error("Ejecutá npm run build antes de iniciar el servidor.");
  process.exit(1);
}

createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const relativePath = pathname.endsWith("/") ? `${pathname}index.html` : pathname;
  const candidate = path.resolve(distRoot, `.${relativePath}`);
  const safePath = candidate.startsWith(`${distRoot}${path.sep}`) ? candidate : path.join(distRoot, "404.html");
  const file = existsSync(safePath) ? safePath : path.join(distRoot, "404.html");
  const extension = path.extname(file).toLowerCase();
  response.writeHead(file === safePath ? 200 : 404, { "content-type": types[extension] || "application/octet-stream", "cache-control": "no-store" });
  createReadStream(file).pipe(response);
}).listen(port, "127.0.0.1", () => {
  console.log(`Kurosu Static: http://127.0.0.1:${port}`);
});
