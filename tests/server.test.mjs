import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { request } from "node:http";
import { mkdtemp, writeFile, mkdir, symlink, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createStaticServer } from "../scripts/serve.mjs";
import { securityHeaders, assetCacheControl } from "../scripts/security-policy.mjs";

let server, address, fixture;
before(async () => {
  fixture = await mkdtemp(path.join(os.tmpdir(), "kurosu-server-test-"));
  const root = path.join(fixture, "public");
  await mkdir(path.join(root, "assets/js"), { recursive: true });
  await writeFile(path.join(root, "index.html"), "<!doctype html><h1>Test</h1>");
  await writeFile(path.join(root, "404.html"), "Not found");
  await writeFile(path.join(root, "assets/js/site.0123456789ab.js"), "console.log('test')");
  await writeFile(path.join(fixture, "private.txt"), "private fixture marker");
  await symlink(fixture, path.join(root, "outside"), process.platform === "win32" ? "junction" : "dir");
  server = createStaticServer({ root });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  address = server.address();
});
after(async () => {
  if (server) await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
  // Only the exact temporary directory created above is eligible for cleanup.
  if (fixture && path.dirname(fixture) === os.tmpdir() && path.basename(fixture).startsWith("kurosu-server-test-")) await rm(fixture, { recursive: true, force: true });
});

function rawRequest(urlPath, method = "GET") {
  return new Promise((resolve, reject) => {
    const req = request({ hostname: "127.0.0.1", port: address.port, path: urlPath, method }, res => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", data => body += data);
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on("error", reject);
    req.end();
  });
}

test("GET/HEAD and 404 return the security policy without exposing errors", async () => {
  assert.equal(address.address, "127.0.0.1");
  for (const method of ["GET", "HEAD"]) {
    for (const urlPath of ["/", "/missing"]) {
      const r = await rawRequest(urlPath, method);
      assert.equal(r.status, urlPath === "/" ? 200 : 404);
      for (const [k,v] of Object.entries(securityHeaders)) assert.equal(r.headers[k.toLowerCase()], v);
      if (method === "HEAD") assert.equal(r.body, "");
      assert.equal(r.headers["cache-control"], "public, max-age=0, must-revalidate");
    }
  }
});
test("malformed requests and forbidden methods cannot terminate the server", async () => {
  for (const value of ["/%", "/%E0%A4%A", "/%00", "/%5cwindows"]) assert.equal((await rawRequest(value)).status, 400);
  const post = await rawRequest("/", "POST");
  assert.equal(post.status, 405);
  assert.equal(post.headers.allow, "GET, HEAD");
  assert.equal((await rawRequest("/")).status, 200);
});
test("traversal and symlinks cannot escape the public root", async () => {
  for (const value of ["/../private.txt", "/%2e%2e/private.txt", "/outside/private.txt"]) {
    const r = await rawRequest(value);
    assert.equal(r.status, 403);
    assert.ok(!r.body.includes("private fixture marker"));
  }
  assert.equal((await rawRequest("/assets")).status, 404);
});
test("only existing fingerprinted assets get immutable caching", async () => {
  assert.equal((await rawRequest("/assets/js/site.0123456789ab.js")).headers["cache-control"], assetCacheControl);
  assert.equal((await rawRequest("/assets/js/missing.0123456789ab.js")).headers["cache-control"], "public, max-age=0, must-revalidate");
});
