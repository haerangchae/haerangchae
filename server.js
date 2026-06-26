// 로컬 미리보기 서버 — 실행: bun server.js  (브라우저에서 http://localhost:5500)
import { join, extname } from "path";

const root = import.meta.dir;
const port = 8123;
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".png": "image/png", ".webp": "image/webp",
  ".gif": "image/gif", ".svg": "image/svg+xml",
  ".ico": "image/x-icon", ".woff2": "font/woff2", ".woff": "font/woff",
};

Bun.serve({
  port,
  async fetch(req) {
    let p = new URL(req.url).pathname;
    if (p === "/") p = "/index.html";
    const file = Bun.file(join(root, decodeURIComponent(p)));
    if (await file.exists()) {
      const ct = types[extname(p).toLowerCase()] || "application/octet-stream";
      return new Response(file, { headers: { "Content-Type": ct } });
    }
    return new Response("404 Not Found", { status: 404 });
  },
});

console.log(`✅ 해랑채 미리보기 서버: http://localhost:${port}`);
