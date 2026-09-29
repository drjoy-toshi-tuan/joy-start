#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Sinh `mockup/icons.js` từ gói Solar Icons — bản OUTLINE (mặc định).
//
//   node tools/sync-icons.mjs <đường dẫn tới Solar.zip | thư mục đã giải nén>
//
// Script tự QUÉT mã nguồn mockup để biết đang dùng icon nào (2 mẫu duy nhất):
//   · ic('ten-icon' …)        — gọi hàm vẽ icon trong app.js
//   · icon: 'ten-icon'        — khai trong dữ liệu (menu, thẻ, tab…)
// rồi chép ĐÚNG những icon đó từ file `solar--<ten>-outline.svg`. Thêm icon mới =
// viết tên vào code rồi chạy lại script; không sửa tay `icons.js`.
// Ngoại lệ có chủ ý: tên kèm hậu tố `@bold` (vd `star@bold`) lấy bản BOLD
// `solar--<ten>-bold.svg` — chỉ dùng cho trạng thái "đã chọn" (sao お気に入り đã ghim).
//
// ⚠ Từ chối (exit 1) khi: tên không có bản outline trong gói · body có màu cứng
//   (#…) · không dùng currentColor · mang `id`/`url(` — icon phải ĂN MÀU chữ để
//   theo được theme sáng/tối.
// ⚠ Chỉ dùng builtin của node (fs, path, zlib) — chạy được khi chưa `npm install`.
//
// Solar Icons — 480 Design, giấy phép CC BY 4.0
// https://www.figma.com/community/file/1166831539721848736
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_FILES = ['mockup/app.js', 'mockup/data.js'];
const OUT = join(ROOT, 'mockup/icons.js');

const source = process.argv[2];
if (!source) {
  console.error('Cách dùng: node tools/sync-icons.mjs <Solar.zip | thư mục>');
  process.exit(1);
}

// ── 1. Tên icon đang dùng ────────────────────────────────────────────────────
const used = new Set();
for (const rel of SRC_FILES) {
  const code = readFileSync(join(ROOT, rel), 'utf8');
  for (const re of [/\bic\(\s*['"]([a-z0-9-]+(?:@bold)?)['"]/g, /\bicon\s*:\s*['"]([a-z0-9-]+(?:@bold)?)['"]/g]) {
    for (const m of code.matchAll(re)) used.add(m[1]);
  }
}

// ── 2. Đọc gói (zip hoặc thư mục) → Map<tên file, nội dung> ──────────────────
function readZip(file) {
  const buf = readFileSync(file);
  // End Of Central Directory: chữ ký 0x06054b50, dò từ cuối file.
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Không đọc được zip (thiếu EOCD)');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out = new Map();
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('Central directory hỏng');
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    p += 46 + nameLen + extraLen + commentLen;
    if (!name.endsWith('-outline.svg') && !name.endsWith('-bold.svg')) continue;
    const lNameLen = buf.readUInt16LE(local + 26);
    const lExtraLen = buf.readUInt16LE(local + 28);
    const start = local + 30 + lNameLen + lExtraLen;
    const raw = buf.subarray(start, start + csize);
    const data = method === 8 ? inflateRawSync(raw) : method === 0 ? raw : null;
    if (!data) throw new Error(`Kiểu nén ${method} chưa hỗ trợ: ${name}`);
    out.set(basename(name), data.toString('utf8'));
  }
  return out;
}

function readDir(dir) {
  const out = new Map();
  for (const f of readdirSync(dir)) {
    if (f.endsWith('-outline.svg') || f.endsWith('-bold.svg')) out.set(f, readFileSync(join(dir, f), 'utf8'));
  }
  return out;
}

const pack = statSync(source).isDirectory() ? readDir(source) : readZip(source);
if (!pack.size) {
  console.error('Không thấy file *-outline.svg nào trong gói.');
  process.exit(1);
}

// ── 3. Lấy body + kiểm ───────────────────────────────────────────────────────
const bodies = {};
const errors = [];
for (const name of [...used].sort()) {
  const bold = name.endsWith('@bold');
  const file = bold ? `solar--${name.slice(0, -5)}-bold.svg` : `solar--${name}-outline.svg`;
  const svg = pack.get(file);
  if (!svg) { errors.push(`không có ${bold ? 'bản bold' : 'bản outline'}: ${name}`); continue; }
  const body = svg
    .replace(/^[\s\S]*?<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .replace(/\s*\n\s*/g, '')
    .trim();
  if (/#[0-9a-f]{3,8}\b/i.test(body)) errors.push(`màu cứng: ${name}`);
  if (!/currentColor/.test(body)) errors.push(`không dùng currentColor: ${name}`);
  if (/\sid=|url\(/.test(body)) errors.push(`mang id/url(): ${name}`);
  bodies[name] = body;
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

const header = `// ⚠ FILE SINH TỰ ĐỘNG — đừng sửa tay. Chạy lại: node tools/sync-icons.mjs <Solar.zip>
// Solar Icons (bản OUTLINE; tên \`…@bold\` = bản BOLD) — 480 Design, CC BY 4.0 — ${Object.keys(bodies).length} icon.
`;
const lines = Object.entries(bodies).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`);
writeFileSync(OUT, `${header}var ICONS = {\n${lines.join('\n')}\n};\n`);
console.log(`✔ mockup/icons.js — ${Object.keys(bodies).length} icon (outline)`);
