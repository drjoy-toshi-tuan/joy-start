#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Kiểm mockup bằng trình duyệt thật (Playwright/Chromium):
//   node tools/verify.mjs                 # quét toàn bộ + thao tác chính
//   node tools/verify.mjs --shots out/    # kèm ảnh chụp các màn chính (2 theme × 2 ngôn ngữ)
//
// Quét MỌI route (Home · ~115 trang menu · 9 tab 設定 · 14 お知らせ · 受注速報 ·
// 検索) × 日本語/Tiếng Việt × 1440px/390px và ĐỎ khi có:
//   · lỗi / cảnh báo console (kể cả icon thiếu: `[icon] thiếu: …`)
//   · cuộn NGANG ở trang hoặc ở vùng nội dung
//   · chữ tiếng Nhật chưa có bản dịch khi đang ở Tiếng Việt (I18N_MISSING)
//
// Cần Playwright (npm i -g playwright hoặc có sẵn trong NODE_PATH).
// Môi trường có proxy: PW_PROXY=http://host:port · cache font: PW_FONT_CACHE=<thư mục>.
// ─────────────────────────────────────────────────────────────────────────────
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch {
  console.error('Thiếu Playwright: npm i -g playwright (hoặc đặt NODE_PATH tới thư mục có nó).');
  process.exit(2);
}
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = pathToFileURL(join(ROOT, 'joy-start-mockup.html')).href;
const argv = process.argv.slice(2);
const shotDir = argv.includes('--shots') ? argv[argv.indexOf('--shots') + 1] : null;
const CACHE = process.env.PW_FONT_CACHE || null;
if (CACHE) mkdirSync(CACHE, { recursive: true });

const browser = await chromium.launch(process.env.PW_PROXY ? { proxy: { server: process.env.PW_PROXY } } : {});
const failures = [];
const fail = (where, msg) => failures.push(`${where} — ${msg}`);

async function context({ vp, lang, theme }) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: vp.width < 500 ? 2 : 1, ignoreHTTPSErrors: !!process.env.PW_PROXY });
  await ctx.addInitScript(([l, th]) => { try { localStorage.clear(); localStorage.setItem('joystart_lang', l); localStorage.setItem('joystart_theme', th); } catch (e) {} }, [lang, theme]);
  if (CACHE) {
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, async (route) => {
      const url = route.request().url();
      const f = join(CACHE, createHash('sha1').update(url).digest('hex'));
      if (existsSync(f) && existsSync(f + '.json')) {
        return route.fulfill({ status: 200, body: readFileSync(f), headers: { 'content-type': JSON.parse(readFileSync(f + '.json', 'utf8')).ct, 'access-control-allow-origin': '*' } });
      }
      for (let i = 0; i < 4; i++) {
        try {
          const res = await route.fetch({ timeout: 30000 });
          const body = await res.body();
          if (res.status() === 200) { writeFileSync(f, body); writeFileSync(f + '.json', JSON.stringify({ ct: res.headers()['content-type'] || '' })); }
          return route.fulfill({ status: res.status(), body, headers: { 'content-type': res.headers()['content-type'] || '', 'access-control-allow-origin': '*' } });
        } catch { await new Promise((r) => setTimeout(r, 400 * (i + 1))); }
      }
      return route.abort();
    });
  }
  const page = await ctx.newPage();
  const logs = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.text()); });
  page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
  await page.goto(FILE + '#/home', { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  return { ctx, page, logs };
}

async function go(page, hash) {
  await page.evaluate((h) => { location.hash = h; }, hash);
  await page.waitForFunction(() => document.querySelector('#screen') && document.querySelector('#screen').children.length > 0);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

const enc = (k) => k.split('/').map(encodeURIComponent).join('/');
let routes = null;

for (const lang of ['ja', 'vi']) {
  for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const tag = `${lang}@${vp.width}`;
    const { ctx, page, logs } = await context({ vp, lang, theme: 'light' });
    if (!routes) {
      const meta = await page.evaluate(() => window.__JOYSTART__);
      routes = ['#/home', '#/deals', '#/search?q=AI', '#/search?q=lich']
        .concat(meta.settings.map((s) => '#/settings/' + encodeURIComponent(s)))
        .concat(meta.announce.map((a) => '#/announce/' + a))
        .concat(meta.pages.filter((k) => k !== 'home').map((k) => '#/' + enc(k)));
    }
    for (const r of routes) {
      logs.length = 0;
      await go(page, r);
      const o = await page.evaluate(() => {
        const main = document.querySelector('#main');
        return { doc: document.documentElement.scrollWidth - window.innerWidth, main: main.scrollWidth - main.clientWidth };
      });
      if (o.doc > 1) fail(`${tag} ${decodeURIComponent(r)}`, `trang cuộn ngang ${o.doc}px`);
      if (o.main > 1) fail(`${tag} ${decodeURIComponent(r)}`, `nội dung tràn ngang ${o.main}px`);
      logs.forEach((l) => fail(`${tag} ${decodeURIComponent(r)}`, 'console: ' + l));
    }
    if (lang === 'vi') {
      const missing = await page.evaluate(() => Object.keys(window.__JOYSTART__.missing));
      missing.forEach((m) => fail(tag, 'chưa dịch: ' + m));
    }
    await ctx.close();
  }
}

// ── Thao tác chính (desktop, ja → vi) ──
let steps = 0;
{
  const { ctx, page, logs } = await context({ vp: { width: 1440, height: 900 }, lang: 'ja', theme: 'light' });
  const step = async (name, fn) => { steps++; try { await fn(); } catch (e) { fail('thao tác', `${name}: ${e.message.split('\n')[0]}`); } };
  await step('mở khối やること', async () => {
    await page.click('.jw-sn-top[data-k="todo"]');
    await page.waitForSelector('.jw-sn-block--open .jw-tree-kids');
  });
  await step('sang 上長報告 từ cây', async () => {
    await page.click('.jw-tree-leaf[href*="%E4%B8%8A%E9%95%B7"]');
    await page.waitForFunction(() => location.hash.includes('%E4%B8%8A%E9%95%B7'));
  });
  await step('ghim お気に入り', async () => {
    await page.click('.jw-page-actions [data-act="fav"]');
    await page.waitForSelector('.jw-sn-favs a[href*="%E4%B8%8A%E9%95%B7"]');
  });
  await step('mở tất cả / đóng tất cả', async () => {
    await page.click('[data-act="expand-all"]');
    const n = await page.$$eval('.jw-sn-block--open', (e) => e.length);
    const want = await page.$$eval('.jw-sn-top[data-act="block"]', (e) => e.length);
    if (n !== want) throw new Error(`mở ${n}/${want} khối`);
    await page.click('[data-act="collapse-all"]');
    const m = await page.$$eval('.jw-sn-block--open', (e) => e.length);
    if (m !== 0) throw new Error(`còn ${m} khối mở`);
  });
  // Tìm menu: 日本語 chỉ khớp nhãn tiếng Nhật; nhãn tiếng Việt chỉ khớp khi đang ở Tiếng Việt.
  await step('tìm trong side panel (ja: 在庫 khớp, kho KHÔNG khớp)', async () => {
    await page.fill('#sideFind', 'kho');
    await page.waitForSelector('.jw-sn-hits-none');
    await page.fill('#sideFind', '在庫');
    await page.waitForSelector('.jw-sn-hit[href*="inventory"]');
  });
  await step('về Home + tìm toàn bộ', async () => {
    await page.click('[data-act="side-find-x"]');
    await go(page, '#/home');
    await page.fill('#gsInput', '石松');
    await page.waitForSelector('#gsDrop:not([hidden]) .jw-gs-item');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => location.hash.startsWith('#/search'));
  });
  await step('bánh răng cạnh profile → đổi Tiếng Việt + theme tối', async () => {
    await page.click('#setBtn');
    await page.waitForSelector('.jw-menu--open');
    await page.click('.jw-slide[data-act="lang"]');
    await page.waitForFunction(() => document.documentElement.lang === 'vi');
    await page.click('.jw-slide[data-act="theme"]');
    await page.waitForFunction(() => document.documentElement.getAttribute('data-theme') === 'dark');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#menuPanel.jw-menu--open'));
  });
  await step('bánh răng → nút vào màn 設定', async () => {
    await page.click('#setBtn');
    await page.waitForSelector('.jw-menu--open #setGo');
    await page.click('#setGo');
    await page.waitForFunction(() => location.hash.startsWith('#/settings'));
  });
  await step('tìm trong side panel (vi: kho khớp)', async () => {
    await page.fill('#sideFind', 'kho');
    await page.waitForSelector('.jw-sn-hit[href*="inventory"]');
    await page.click('[data-act="side-find-x"]');
  });
  await step('đăng xuất → đăng nhập lại', async () => {
    await go(page, '#/settings/' + encodeURIComponent('アカウント'));
    await page.click('#setBody [data-act="logout"]');
    await page.click('[data-act="logout-do"]');
    await page.waitForSelector('#loggedOut');
    await page.click('[data-act="relogin"]');
    await page.waitForFunction(() => !document.querySelector('#loggedOut') && location.hash === '#/home');
  });
  logs.forEach((l) => fail('thao tác', 'console: ' + l));
  await ctx.close();
}
// ── Mobile (390px): side panel là dải icon; nút gập mở NGĂN KÉO; chọn trang thì ngăn kéo đóng ──
{
  const { ctx, page, logs } = await context({ vp: { width: 390, height: 844 }, lang: 'ja', theme: 'light' });
  const step = async (name, fn) => { steps++; try { await fn(); } catch (e) { fail('thao tác mobile', `${name}: ${e.message.split('\n')[0]}`); } };
  await step('dải icon → ngăn kéo → chọn trang', async () => {
    await page.waitForSelector('.jw-sidenav--rail');
    await page.click('.jw-sn-top[data-k="todo"]');
    await page.waitForSelector('html[data-drawer] .jw-sidenav--drawer .jw-sn-block--open .jw-tree-kids');
    await page.click('.jw-tree-leaf[href*="%E4%B8%8A%E9%95%B7"]');
    await page.waitForFunction(() => location.hash.includes('%E4%B8%8A%E9%95%B7') && !document.documentElement.hasAttribute('data-drawer'));
    await page.waitForSelector('.jw-sidenav--rail');
  });
  await step('ngăn kéo: bánh răng mở panel cài đặt nổi TRÊN ngăn kéo', async () => {
    await page.click('[data-act="rail"]');
    await page.waitForSelector('.jw-sidenav--drawer');
    await page.click('#setBtn');
    await page.waitForSelector('.jw-menu--open');
    const top = await page.evaluate(() => { const r = document.querySelector('#setGo').getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!(el && el.closest('#menuPanel')); });
    if (!top) throw new Error('panel cài đặt bị ngăn kéo che');
  });
  logs.forEach((l) => fail('thao tác mobile', 'console: ' + l));
  await ctx.close();
}

// ── Ảnh chụp (tuỳ chọn) ──
if (shotDir) {
  mkdirSync(shotDir, { recursive: true });
  const shots = [
    ['home', '#/home'], ['todo', '#/' + enc('todo/予定')], ['ranking', '#/' + enc('health/ランキング')],
    ['announce', '#/announce/a12'], ['settings', '#/settings/' + encodeURIComponent('通知')], ['placeholder', '#/' + enc('incident/台帳')]
  ];
  for (const lang of ['ja', 'vi']) {
    for (const theme of ['light', 'dark']) {
      for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
        const { ctx, page } = await context({ vp, lang, theme });
        for (const [name, hash] of shots) {
          await go(page, hash);
          await page.waitForTimeout(250);
          await page.screenshot({ path: join(shotDir, `${name}-${lang}-${theme}-${vp.width}.png`) });
        }
        await ctx.close();
      }
    }
  }
}

await browser.close();
const n = routes ? routes.length : 0;
if (failures.length) {
  console.error(`✖ ${failures.length} lỗi (${n} route × 4 lượt quét):\n` + failures.slice(0, 80).map((f) => '  · ' + f).join('\n'));
  process.exit(1);
}
console.log(`✔ ${n} route × (ja, vi) × (1440, 390) — 0 lỗi console · 0 tràn ngang · 0 chữ chưa dịch · ${steps} thao tác OK`);
