import { createServer } from "node:http";
import { open, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { responseHeaders } from "./security-policy.mjs";

const distRoot = fileURLToPath(new URL("../dist/", import.meta.url));
const types = { ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2" };

function within(root, target) {
  const relative = path.relative(root, target);
  return relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

export function createStaticServer({ root = distRoot } = {}) {
  return createServer(async (request, response) => {
    let file;
    const send = (status, message, extra = {}) => {
      response.writeHead(status, { ...responseHeaders(), "Content-Type": "text/plain; charset=utf-8", ...extra });
      response.end(request.method === "HEAD" ? undefined : message);
    };
    try {
      if (!["GET", "HEAD"].includes(request.method)) return send(405, "Method not allowed", { Allow: "GET, HEAD" });
      let pathname;
      try { pathname = decodeURIComponent((request.url || "/").split(/[?#]/, 1)[0]); }
      catch { return send(400, "Bad request"); }
      if (!pathname.startsWith("/") || /[\0\\]/.test(pathname)) return send(400, "Bad request");
      const base = await realpath(root);
      const target = path.resolve(base, `.${pathname.endsWith("/") ? `${pathname}index.html` : pathname}`);
      if (!within(base, target)) return send(403, "Forbidden");
      let resolved;
      let status = 200;
      try { resolved = await realpath(target); }
      catch (error) {
        if (!["ENOENT", "ENOTDIR"].includes(error.code)) throw error;
        status = 404;
        resolved = await realpath(path.join(base, "404.html"));
      }
      if (!within(base, resolved)) return send(403, "Forbidden");
      file = await open(resolved, "r");
      const info = await file.stat();
      if (!info.isFile()) return send(404, "Not found");
      const asset = status === 200 && /^\/assets\/(?:css|fonts|images|js)\/[^/]+\.[a-f0-9]{12}\.[a-z0-9]+$/.test(pathname);
      response.writeHead(status, { ...responseHeaders(asset), "Content-Type": types[path.extname(resolved)] || "application/octet-stream", "Content-Length": info.size });
      if (request.method === "HEAD") return response.end();
      const stream = file.createReadStream();
      file = undefined; // The stream owns and closes the descriptor from here.
      stream.on("error", () => response.destroy());
      response.on("close", () => stream.destroy());
      stream.pipe(response);
    } catch {
      if (response.headersSent) response.destroy();
      else send(500, "Internal server error");
    } finally {
      await file?.close().catch(() => {});
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await realpath(path.join(distRoot, "index.html")); }
  catch { console.error("Ejecutá npm run build antes de iniciar el servidor."); process.exit(1); }
  const server = createStaticServer();
  server.listen(Number(process.env.PORT || 8788), "127.0.0.1", () => {
    console.log(`KUROSU Static: http://127.0.0.1:${server.address().port}`);
  });
  server.on("error", error => { console.error(error.message); process.exitCode = 1; });
}
