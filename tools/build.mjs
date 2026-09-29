#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Ghép mockup/template.html + CSS + JS thành MỘT file tự chứa: joy-start-mockup.html
// (mở thẳng bằng trình duyệt, gửi đi được — như mockup gốc).
//
//   node tools/build.mjs          # build
//   node tools/build.mjs --check  # chỉ kiểm file build có khớp nguồn không (exit 1 nếu lệch)
//
// ⚠ Chỉ dùng builtin của node. Từ chối build khi một file JS chứa `</script` hoặc
//   CSS chứa `</style` — chuỗi đó sẽ ĐÓNG thẻ sớm và nuốt phần còn lại của trang.
// ⚠ Từ chối build khi file ra chứa email @drjoy.jp: repo này PUBLIC nên file build coi
//   như đã publish. Dữ liệu mẫu dùng @example.com (RFC 2606) — cùng luật với
//   `scripts/privacy-rules.mjs` của JOY Analytics.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'mockup');
const OUT = join(ROOT, 'joy-start-mockup.html');
const check = process.argv.includes('--check');

let html = readFileSync(join(SRC, 'template.html'), 'utf8');
const used = [];
html = html.replace(/\/\*@inline ([\w.-]+)\*\//g, (_, file) => {
  const body = readFileSync(join(SRC, file), 'utf8');
  if (file.endsWith('.js') && /<\/script/i.test(body)) throw new Error(`${file} chứa "</script"`);
  if (file.endsWith('.css') && /<\/style/i.test(body)) throw new Error(`${file} chứa "</style"`);
  used.push(file);
  return body.trimEnd();
});
for (const need of ['styles.css', 'icons.js', 'i18n.js', 'data.js', 'illustrations.js', 'app.js']) {
  if (!used.includes(need)) throw new Error(`template thiếu marker cho ${need}`);
}
const leaked = [...new Set(html.match(/\b[A-Za-z0-9._%+-]+@drjoy\.jp\b/gi) || [])];
if (leaked.length) throw new Error(`file build chứa email @drjoy.jp (${leaked.join(', ')}) — dữ liệu mẫu phải dùng @example.com`);

if (check) {
  const cur = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
  if (cur !== html) {
    console.error('✖ joy-start-mockup.html KHÔNG khớp nguồn — chạy: node tools/build.mjs');
    process.exit(1);
  }
  console.log('✔ joy-start-mockup.html khớp nguồn');
} else {
  writeFileSync(OUT, html);
  console.log(`✔ joy-start-mockup.html — ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB (${used.join(' + ')})`);
}
