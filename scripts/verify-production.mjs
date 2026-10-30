import { securityHeaders, removedHeaders, assetCacheControl, htmlCacheControl } from "./security-policy.mjs";

const hosts = ["kurosu.com.py", "www.kurosu.com.py", "enlaces.kurosuycia.com.py"];
const failures = [];
for (const host of hosts) {
  try {
    for (const pathname of ["/", "/contacto/", "/security-check-not-found"]) {
      const url = `https://${host}${pathname}`;
      const r = await fetch(url, { signal: AbortSignal.timeout(15000), cache: "no-store" });
      const html = await r.text();
      const expected = pathname === "/security-check-not-found" ? 404 : 200;
      if (r.status !== expected || !html.includes("ks-site-header")) failures.push(`${url}: status/contenido inesperado (${r.status})`);
      if (r.headers.get("cache-control") !== htmlCacheControl) failures.push(`${url}: cache HTML inesperada`);
      for (const [key, value] of Object.entries(securityHeaders)) {
        if (r.headers.get(key) !== value) failures.push(`${url}: ${key} no coincide con la politica del repo`);
      }
      const external = removedHeaders.filter(k => r.headers.has(k));
      if (external.length) console.warn(`${host}: cabeceras reintroducidas fuera del repo: ${external.join(", ")}`);
      if (pathname === "/") {
        const resources = [...html.matchAll(/(?:href|src)="([^"]*assets\/(?:css|js)\/[^"]+)"/g)].map(m => new URL(m[1], url));
        if (resources.length !== 3) failures.push(`${host}: faltan CSS o scripts externos`);
        for (const resource of resources) {
          const a = await fetch(resource, { signal: AbortSignal.timeout(15000) });
          await a.arrayBuffer();
          if (!a.ok || a.headers.get("cache-control") !== assetCacheControl) failures.push(`${resource}: status/cache inesperado`);
          for (const [key, value] of Object.entries(securityHeaders)) {
            if (a.headers.get(key) !== value) failures.push(`${resource}: ${key} no coincide con la politica del repo`);
          }
        }
      }
      console.log(`${url}: ${r.status}, HSTS=${r.headers.get("strict-transport-security")}`);
    }
    const http = await fetch(`http://${host}/`, { redirect: "manual", signal: AbortSignal.timeout(10000) });
    await http.arrayBuffer();
    if (![301, 302, 307, 308].includes(http.status) || !http.headers.get("location")?.startsWith(`https://${host}/`)) failures.push(`${host}: HTTP no redirige a HTTPS`);
  } catch (error) { failures.push(`${host}: ${error.message}`); }
}
if (failures.length) { console.error(failures.join("\n")); process.exitCode = 1; }
else console.log("Production security checks passed for all three hosts.");
