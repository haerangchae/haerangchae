// 로컬 미리보기 서버 — 실행: bun server.js  (브라우저에서 http://localhost:8123)
import { join, extname } from "path";
import { readdirSync, writeFileSync } from "fs";

const root = import.meta.dir;
const port = 8123;
const imgExts = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

// images/sub 폴더를 읽어 이미지 목록(JSON)을 만들고 manifest.json에도 기록
// → 로컬에선 항상 최신, 커밋된 manifest.json은 정적 배포(GitHub Pages)에서도 동작
function buildSubManifest() {
  const dir = join(root, "images", "sub");
  const files = readdirSync(dir)
    .filter((f) => imgExts.has(extname(f).toLowerCase()))
    .sort();
  const body = JSON.stringify(files, null, 0);
  try { writeFileSync(join(dir, "manifest.json"), body); } catch (_) {}
  return body;
}
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
    // sub 폴더 이미지 목록: 매 요청마다 폴더를 스캔해 최신 목록 반환(+manifest.json 갱신)
    if (p === "/images/sub/manifest.json") {
      try {
        return new Response(buildSubManifest(), {
          headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
        });
      } catch (_) {
        return new Response("[]", { headers: { "Content-Type": "application/json; charset=utf-8" } });
      }
    }
    const file = Bun.file(join(root, decodeURIComponent(p)));
    if (await file.exists()) {
      const ct = types[extname(p).toLowerCase()] || "application/octet-stream";
      return new Response(file, { headers: { "Content-Type": ct } });
    }
    return new Response("404 Not Found", { status: 404 });
  },
});

console.log(`✅ 해랑채 미리보기 서버: http://localhost:${port}`);
