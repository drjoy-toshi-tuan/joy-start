/* ==========================================================================
   JOY START mockup — APP
   Vanilla JS, không build step, không thư viện. Mọi thao tác đi qua MỘT bộ
   lắng nghe (event delegation, thuộc tính `data-act`), nên vẽ lại HTML bằng
   innerHTML không làm rơi sự kiện nào.

   Route (hash — chia sẻ được link từng màn khi review):
     #/home · #/<khoá trang> (vd #/todo/報告/上長報告) · #/settings/<tab>
     #/announce/<id> · #/deals · #/search?q=…
   ========================================================================== */
(function () {
  'use strict';

  // ── §Lưu trữ — localStorage luôn bọc try/catch (chế độ riêng tư có thể ném lỗi) ──
  var KEY = {
    lang: 'joystart_lang', theme: 'joystart_theme', rail: 'joystart_rail', open: 'joystart_open_blocks',
    favs: 'joystart_favorites', read: 'joystart_announce_read', cards: 'joystart_home_cards',
    tz: 'joystart_timezone', datefmt: 'joystart_datefmt', settings: 'joystart_settings_'
  };
  function load(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
  function loadJSON(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); } catch (e) { /* bỏ qua */ } }
  function drop(k) { try { localStorage.removeItem(k); } catch (e) { /* bỏ qua */ } }

  // ── §Tiện ích ──
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  /* Icon Solar (outline). Body là dữ liệu tin cậy sinh từ gói offline (tools/sync-icons.mjs). */
  function ic(name, size, cls) {
    var body = ICONS[name];
    if (body === undefined) { console.warn('[icon] thiếu: ' + name); body = ''; }
    size = size || 18;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="' + size + '" height="' + size + '"' +
      (cls ? ' class="' + cls + '"' : '') + ' aria-hidden="true" focusable="false">' + body + '</svg>';
  }
  function nm(node) { return LANG === 'vi' && node.vi ? node.vi : node.ja; }
  function nf(n, digits) {
    digits = digits || 0;
    return Number(n).toLocaleString(LANG === 'vi' ? 'vi-VN' : 'ja-JP', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }
  function yen(n) { return '¥' + nf(n); }
  // 事業部: chấm màu thay icon. --ac khai inline + class .jw-prod pha các token con NGAY trên phần tử đó
  function prodStyle(p) { return ' style="--ac:' + p.color + '"'; }
  function prodDot(p, big) { return '<span class="jw-prod jw-prod-dot' + (big ? ' jw-prod-dot--lg' : '') + '"' + prodStyle(p) + ' aria-hidden="true"></span>'; }
  function prodTag(p, cls) { return '<span class="jw-tag jw-prod jw-prod-tag' + (cls ? ' ' + cls : '') + '"' + prodStyle(p) + '>' + esc(tr(p)) + '</span>'; }
  // Icon của một mục menu: 事業部 ⇒ chấm màu
  function nodeIcon(node, size) { return node.prod && PRODUCT_BY_JA[node.prod] ? prodDot(PRODUCT_BY_JA[node.prod], size >= 20) : ic(node.icon, size); }
  // Số THỐNG KÊ: đếm từ 0 lên đúng lúc CHÍNH con số vào vùng nhìn (xem §Hiện dần khi cuộn)
  function cntFmt(v, fmt, digits) { return fmt === 'yen' ? yen(v) : nf(v, digits || 0); }
  function cnt(n, fmt, digits) {
    return '<span class="jw-cnt" data-count-to="' + n + '"' + (fmt ? ' data-count-fmt="' + fmt + '"' : '') + (digits ? ' data-count-digits="' + digits + '"' : '') + '>' + cntFmt(n, fmt, digits) + '</span>';
  }
  // t() + chèn HTML (số đếm được) vào chỗ {x} — phần chữ vẫn được escape
  function tH(ja, vars) { return esc(t(ja)).replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  // Ngày: JA 9/24(木) · VI 24/9 (T5). Người dùng đổi được thứ tự ở 設定 › 表示.
  var WD = { ja: ['日', '月', '火', '水', '木', '金', '土'], vi: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'] };
  var WD_LONG_VI = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  function pd(s) {
    var m = String(s).match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }
  function dateOrder() {
    var v = load(KEY.datefmt, '');
    if (v === 'md' || v === 'dm') return v;
    return LANG === 'vi' ? 'dm' : 'md';
  }
  function fmtMDs(s) {
    var d = typeof s === 'string' ? pd(s) : s;
    if (!d) return esc(s);
    return dateOrder() === 'dm' ? d.getDate() + '/' + (d.getMonth() + 1) : (d.getMonth() + 1) + '/' + d.getDate();
  }
  function fmtMD(s) {
    var d = typeof s === 'string' ? pd(s) : s;
    if (!d) return esc(s);
    var w = WD[LANG][d.getDay()];
    return dateOrder() === 'dm' ? fmtMDs(d) + ' (' + w + ')' : fmtMDs(d) + '(' + w + ')';
  }
  function fmtLong(d) {
    return LANG === 'vi'
      ? WD_LONG_VI[d.getDay()] + ', ' + pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear()
      : d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日（' + WD.ja[d.getDay()] + '）';
  }
  function fmtYM(y, m) { return LANG === 'vi' ? 'Tháng ' + m + '/' + y : y + '年' + m + '月'; }
  function dayDiff(a, b) { return Math.round((a - b) / 86400000); }
  function byDate(dir) { return function (x, y) { return x.date < y.date ? -dir : x.date > y.date ? dir : 0; }; }
  // Tìm: chữ thường + bỏ dấu tiếng Việt ("lich" khớp "Lịch").
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd'); }

  // ── §Theme (sáng/tối) — chưa gạt lần nào thì theo hệ điều hành ──
  var mqDark = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function themePref() { var v = load(KEY.theme, ''); return v === 'light' || v === 'dark' ? v : ''; }
  function themeNow() { return themePref() || (mqDark && mqDark.matches ? 'dark' : 'light'); }
  function applyTheme() { document.documentElement.setAttribute('data-theme', themeNow()); }
  if (mqDark && mqDark.addEventListener) {
    mqDark.addEventListener('change', function () { if (!themePref()) { applyTheme(); refreshChrome(); } });
  }

  // ── §Chỉ mục menu ──
  var PAGES = {};
  var PAGE_LIST = [];
  var BLOCKS = {};
  // Route tiếng Anh: `key` khối + `slug` từng tầng (#/todo/reports/supervisor). Khoá NỘI BỘ vẫn là
  // đường đi tiếng Nhật (dữ liệu, お気に入り đã lưu… đều trỏ theo khoá đó).
  var PAGE_BY_PATH = {};
  MENU.forEach(function (b) {
    BLOCKS[b.key] = b;
    if (!b.children) { addPage(b.key, b.key, b, b, null, []); return; }
    b.children.forEach(function (n) {
      if (n.children) {
        n.firstKey = b.key + '/' + n.ja + '/' + n.children[0].ja;
        n.children.forEach(function (k) { addPage(b.key + '/' + n.ja + '/' + k.ja, b.key + '/' + n.slug + '/' + k.slug, k, b, n, [b, n]); });
      } else {
        addPage(b.key + '/' + n.ja, b.key + '/' + n.slug, n, b, null, [b]);
      }
    });
  });
  function addPage(key, path, node, block, group, trail) {
    if (!/^[a-z0-9/-]+$/.test(path) || PAGE_BY_PATH[path]) console.warn('[route] slug thiếu/trùng: ' + key + ' → ' + path);
    var p = { key: key, path: path, node: node, block: block, group: group, trail: trail };
    PAGES[key] = p;
    PAGE_BY_PATH[path] = p;
    PAGE_LIST.push(p);
  }
  var SET_SLUG = {}, SET_BY_SLUG = {};
  SETTINGS_TABS.forEach(function (x) { SET_SLUG[x.id] = x.slug; SET_BY_SLUG[x.slug] = x.id; });
  function setHref(id, row) { return '#/settings/' + (SET_SLUG[id] || 'account') + (row ? '?row=' + encodeURIComponent(row) : ''); }
  function pathLabel(p) { return p.trail.map(nm).join(' › '); }
  function fullLabel(p) { return p.trail.map(nm).concat([nm(p.node)]).join(' › '); }
  function enc(key) { return key.split('/').map(encodeURIComponent).join('/'); }
  function href(key) { return '#/' + (PAGES[key] ? PAGES[key].path : enc(key)); }
  var LINK_BY_KEY = {};
  LINK_GROUPS.forEach(function (g) {
    g.items.forEach(function (it) { LINK_BY_KEY[it.key] = { group: g, item: it }; });
  });
  function blockBadge(b) {
    var n = 0;
    (b.children || []).forEach(function (c) {
      n += c.badge || 0;
      (c.children || []).forEach(function (k) { n += k.badge || 0; });
    });
    return n;
  }

  // ── §Trạng thái ──
  var favsRaw = loadJSON(KEY.favs, ['todo/予定', 'incident/台帳']);
  var readRaw = loadJSON(KEY.read, []);
  var openRaw = loadJSON(KEY.open, []);
  var S = {
    rail: load(KEY.rail, '0') === '1',
    favs: Array.isArray(favsRaw) ? favsRaw.filter(function (k) { return typeof k === 'string' && (PAGES[k] || LINK_BY_KEY[k]); }) : [],
    read: {},
    open: {},
    drawer: false,
    sideQuery: '',
    announceTab: 'すべて',
    healthCat: '量',
    rankCat: '量',
    rankLoc: '全社',
    dealProd: 'すべて',
    schedPast: false,
    todoTab: 0,
    acc: {},
    searchTab: 'all',
    linkFilter: '',
    homeDraft: null,
    menuOpen: false,
    inboxOpen: false,
    inboxTab: 'all',
    gsHot: -1,
    photos: PHOTOS.slice(),
    pendingScroll: null,
    missingFolder: ''
  };
  if (Array.isArray(readRaw)) readRaw.forEach(function (id) { S.read[id] = true; });
  if (Array.isArray(openRaw)) openRaw.forEach(function (k) { if (BLOCKS[k] && BLOCKS[k].children) S.open[k] = true; });
  function saveOpen() { save(KEY.open, Object.keys(S.open)); }
  // Người dùng bật "giảm chuyển động" ⇒ tắt hiện-dần-khi-cuộn, đếm số, đèn theo con trỏ.
  var REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  // ≤640px (như mockup gốc): side panel luôn là dải icon; nút gập mở nó thành NGĂN KÉO.
  var mqNarrow = window.matchMedia ? window.matchMedia('(max-width: 640px)') : null;
  function narrow() { return !!(mqNarrow && mqNarrow.matches); }
  function railNow() { return narrow() ? !S.drawer : S.rail; }
  var ROUTE = { name: 'home' };

  function isUnread(a) { return !!a.unread && !S.read[a.id]; }
  function unreadCount() { return ANNOUNCEMENTS.filter(isUnread).length; }
  function saveRead() { save(KEY.read, Object.keys(S.read)); }
  function toggleFav(k) {
    var i = S.favs.indexOf(k);
    if (i < 0) S.favs.push(k); else S.favs.splice(i, 1);
    save(KEY.favs, S.favs);
    return i < 0;
  }

  // ── §Router ──
  function parseHash() {
    var h = location.hash.replace(/^#\/?/, '');
    var qs = '';
    var qi = h.indexOf('?');
    if (qi >= 0) { qs = h.slice(qi + 1); h = h.slice(0, qi); }
    var parts = h.split('/').filter(function (x) { return x !== ''; }).map(function (x) {
      try { return decodeURIComponent(x); } catch (e) { return x; }
    });
    var params = {};
    qs.split('&').forEach(function (kv) {
      if (!kv) return;
      var i = kv.indexOf('=');
      try { params[decodeURIComponent(i < 0 ? kv : kv.slice(0, i))] = decodeURIComponent((i < 0 ? '' : kv.slice(i + 1)).replace(/\+/g, ' ')); } catch (e) { /* bỏ qua */ }
    });
    var head = parts[0] || 'home';
    if (head === 'home') return { name: 'home' };
    if (head === 'settings') {
      // slug tiếng Anh; tên tab tiếng Nhật (link cũ) vẫn nhận rồi đổi URL sang slug
      var tab = SET_BY_SLUG[parts[1]] || (SET_SLUG[parts[1]] ? parts[1] : 'アカウント');
      return { name: 'settings', tab: tab, row: params.row || '', legacy: !!parts[1] && !SET_BY_SLUG[parts[1]] };
    }
    if (head === 'announce' && parts[1]) return { name: 'announce', id: parts[1] };
    if (head === 'deals') return { name: 'deals' };
    if (head === 'search') return { name: 'search', q: params.q || '' };
    var path = parts.join('/');
    if (PAGE_BY_PATH[path]) return { name: 'page', key: PAGE_BY_PATH[path].key };
    if (PAGES[path]) return { name: 'page', key: path, legacy: true };
    return { name: 'home', fallback: true };
  }
  function go(h) { if (location.hash === h) onRoute(); else location.hash = h; }
  function routeBlock() {
    if (ROUTE.name === 'page') return PAGES[ROUTE.key].block.key;
    if (ROUTE.name === 'home' || ROUTE.name === 'announce' || ROUTE.name === 'deals') return 'home';
    return null;
  }
  function isCurrent(k) { return ROUTE.name === 'page' && ROUTE.key === k; }

  function onRoute() {
    var r = parseHash();
    if (r.fallback && location.hash && location.hash !== '#/home') {
      try { history.replaceState(null, '', '#/home'); } catch (e) { /* file:// */ }
    }
    // Link cũ (route tiếng Nhật) ⇒ thay URL bằng route tiếng Anh, không thêm bước vào lịch sử
    if (r.legacy) {
      try { history.replaceState(null, '', r.name === 'page' ? href(r.key) : setHref(r.tab, r.row)); } catch (e) { /* file:// */ }
    }
    ROUTE = r;
    closeFloating();
    S.drawer = false;
    // Sang một trang ⇒ khối chứa nó MỞ ra (các khối đang mở khác GIỮ nguyên — mở được nhiều khối)
    if (r.name === 'page') {
      var b = PAGES[r.key].block;
      if (b.children && !S.open[b.key]) { S.open[b.key] = true; saveOpen(); }
    }
    if (r.name === 'settings') S.homeDraft = null;
    renderSide();
    revealCurrent();
    renderPage(true);
  }

  // ── §Logo ──
  // Mark Dr.JOY (hai bong bóng thoại) — path chép NGUYÊN VĂN từ `docs/brand/drjoy-mark.svg` của
  // JOY Analytics, màu #f08c00 là hằng số thương hiệu. viewBox cắt sát hình (bbox 0 83 500 336).
  var DRJOY_MARK = '<svg class="jw-brand-mark" viewBox="-6 77 512 348" aria-hidden="true" focusable="false"><g fill="#f08c00">' +
    '<path d="M 476.558 113.792 L 318.801 113.792 C 304.829 113.792 292.353 122.543 287.601 135.68 L 219.463 323.986 C 213.938 339.256 225.25 355.378 241.489 355.378 L 289.757 355.378 L 256.43 418.954 L 336.729 355.378 L 399.246 355.378 C 413.218 355.378 425.694 346.622 430.447 333.485 L 498.583 145.182 C 504.106 129.913 492.796 113.792 476.558 113.792 M 389.296 329.948 L 257.006 329.948 C 252.948 329.948 250.118 325.919 251.499 322.103 L 312.575 153.009 C 314.528 147.596 319.67 143.989 325.423 143.989 L 457.719 143.989 C 461.777 143.989 464.602 148.017 463.226 151.834 L 402.146 320.927 C 400.194 326.341 395.055 329.948 389.296 329.948"/>' +
    '<path d="M 192.486 350.609 C 192.486 350.609 103.929 277.498 0 351.645 L 85.873 114.513 C 188.172 44.763 278.358 113.481 278.358 113.481 L 192.486 350.609 Z"/></g></svg>';
  function brandLockup() {
    return '<span class="jw-brandlock">' + DRJOY_MARK + '<span class="jw-wordmark"><b>JOY</b><em>START</em></span></span>';
  }
  // ── §Panel cài đặt (nút bánh răng cạnh profile): ngôn ngữ · theme · vào màn 設定 ──
  function menuHtml() {
    var theme = themeNow();
    return '<div class="jw-menu-sec">' + t('表示設定') + '</div>' +
      '<div class="jw-menu-field"><span class="jw-menu-row-label">' + t('言語') + '</span>' +
        seg('lang', [{ v: 'ja', label: '日本語' }, { v: 'vi', label: 'Tiếng Việt' }], LANG, t('言語'), 'menuLang') + '</div>' +
      '<div class="jw-menu-field"><span class="jw-menu-row-label">' + t('テーマ') + '</span>' +
        seg('theme', [{ v: 'light', label: t('ライト'), icon: ic('sun', 15) }, { v: 'dark', label: t('ダーク'), icon: ic('moon', 15) }], theme, t('テーマ'), 'menuTheme') + '</div>' +
      '<div class="jw-menu-sep"></div>' +
      '<a class="jw-menu-item jw-menu-item--go" id="setGo" data-act="setgo" href="' + setHref('アカウント') + '"' + (ROUTE.name === 'settings' ? ' aria-current="page"' : '') + '>' +
        ic('settings', 18) + '<span>' + t('設定画面を開く') + '</span>' + ic('alt-arrow-right', 15) + '</a>';
  }
  function openMenu() {
    closeFloating();
    S.menuOpen = true;
    document.documentElement.setAttribute('data-menu-open', '');
    var layer = $('#layer');
    layer.innerHTML = '<div class="jw-scrim" data-act="menu-close" aria-hidden="true"></div>' +
      '<div class="jw-menu jw-glass" role="dialog" id="menuPanel" aria-label="' + esc(t('表示設定')) + '">' + menuHtml() + '</div>';
    placeMenu();
    var panel = $('#menuPanel');
    void panel.offsetHeight;
    panel.classList.add('jw-menu--open');
    var btn = $('#setBtn');
    if (btn) btn.setAttribute('aria-expanded', 'true');
  }
  // Nhô HẲN ra ngoài side panel: mép trái = mép phải side panel + MENU_GAP, đáy canh đáy nút
  // bánh răng. Không đủ chỗ bên phải (ngăn kéo mobile) ⇒ nằm TRÊN nút, trong ngăn kéo.
  var MENU_GAP = 12;
  function placeMenu() {
    var panel = $('#menuPanel');
    var btn = $('#setBtn');
    if (!panel || !btn) return;
    var b = btn.getBoundingClientRect();
    var side = $('#side').getBoundingClientRect();
    var room = window.innerWidth - side.right - MENU_GAP - 8;
    panel.style.width = '';
    var w = panel.offsetWidth;
    var outside = room >= Math.min(w, 248);
    if (outside && room < w) { panel.style.width = room + 'px'; w = room; }
    var h = panel.offsetHeight;
    var left = outside ? side.right + MENU_GAP : side.left + MENU_GAP;
    var top = outside ? b.bottom - h : b.top - h - MENU_GAP;
    panel.classList.toggle('jw-menu--inside', !outside);
    panel.style.left = Math.round(Math.max(8, Math.min(left, window.innerWidth - w - 8))) + 'px';
    panel.style.top = Math.round(Math.max(8, top)) + 'px';
  }
  function closeMenu() {
    if (!S.menuOpen) return;
    S.menuOpen = false;
    document.documentElement.removeAttribute('data-menu-open');
    var panel = $('#menuPanel');
    var scrim = $('#layer .jw-scrim');
    if (scrim) scrim.remove();
    if (panel) {
      panel.classList.remove('jw-menu--open');
      setTimeout(function () { if (!S.menuOpen && panel.parentNode) panel.remove(); }, 240);
    }
    var btn = $('#setBtn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  // ── §Side panel ──
  function favBtn(k) {
    var on = S.favs.indexOf(k) >= 0;
    return '<button type="button" class="jw-fav" data-act="fav" data-k="' + esc(k) + '" aria-pressed="' + on + '" aria-label="' +
      esc(on ? t('お気に入りから外す') : t('お気に入りに追加')) + '" title="' + esc(on ? t('お気に入りから外す') : t('お気に入りに追加')) + '">' + (on ? ic('star@bold', 14) : ic('star', 14)) + '</button>';
  }
  function tipAttr(n) { return n.tip ? ' data-tip="' + esc(tr(n.tip)) + '"' : ''; }
  function rowItem(k, n) {
    var on = isCurrent(k);
    return '<div class="jw-tree-item"><a class="jw-tree-row' + (on ? ' jw-tree-on' : '') + '" href="' + href(k) + '"' + (on ? ' aria-current="page"' : '') + tipAttr(n) + '>' +
      '<span class="jw-tree-icon">' + nodeIcon(n, 15) + '</span><span class="jw-tree-name">' + esc(nm(n)) + '</span>' +
      (n.badge ? '<span class="jw-count">' + n.badge + '</span>' : '') + '</a>' + favBtn(k) + '</div>';
  }
  function leafItem(k, n) {
    var on = isCurrent(k);
    return '<li class="jw-tree-kid"><a class="jw-tree-leaf' + (on ? ' jw-tree-on' : '') + '" href="' + href(k) + '"' + (on ? ' aria-current="page"' : '') + tipAttr(n) + '>' +
      '<span class="jw-tree-leafname">' + esc(nm(n)) + '</span>' +
      (n.badge ? '<span class="jw-count">' + n.badge + '</span>' : '') + '</a>' + favBtn(k) + '</li>';
  }
  function treeHtml(b) {
    return '<div class="jw-sn-body" data-fade-y>' + b.children.map(function (n) {
      if (!n.children) return '<div class="jw-tree-node">' + rowItem(b.key + '/' + n.ja, n) + '</div>';
      var groupOn = ROUTE.name === 'page' && PAGES[ROUTE.key].group === n;
      return '<div class="jw-tree-node"><a class="jw-tree-row' + (groupOn ? ' jw-tree-row--here' : '') + '" href="' + href(n.firstKey) + '">' +
        '<span class="jw-tree-icon">' + nodeIcon(n, 15) + '</span><span class="jw-tree-name">' + esc(nm(n)) + '</span>' +
        '<span class="jw-tree-count">' + n.children.length + '</span></a>' +
        '<ul class="jw-tree-kids">' + n.children.map(function (k) { return leafItem(b.key + '/' + n.ja + '/' + k.ja, k); }).join('') + '</ul></div>';
    }).join('') + '</div>';
  }
  function blockHtml(b) {
    var here = routeBlock() === b.key;
    var rail = railNow();
    var railTip = rail ? ' data-tip="' + esc(nm(b)) + '"' : '';
    if (!b.children) {
      return '<div class="jw-sn-block"><a class="jw-sn-top" href="' + href(b.key) + '"' + (here ? ' aria-current="page"' : '') + railTip +
        (rail ? ' aria-label="' + esc(nm(b)) + '"' : '') + '><span class="jw-sn-topico">' + ic(b.icon, 18) + '</span>' +
        '<span class="jw-sn-topname">' + esc(nm(b)) + '</span></a></div>';
    }
    var open = !!S.open[b.key] && !rail;
    var badge = blockBadge(b);
    return '<div class="jw-sn-block' + (open ? ' jw-sn-block--open' : '') + (here ? ' jw-sn-block--here' : '') + (badge ? ' jw-sn-block--count' : '') + '">' +
      '<button type="button" class="jw-sn-top" data-act="block" data-k="' + b.key + '"' + (rail ? ' aria-label="' + esc(nm(b)) + '"' : ' aria-expanded="' + open + '"') + railTip + (badge ? ' data-count="' + badge + '"' : '') + '>' +
        '<span class="jw-sn-topico">' + ic(b.icon, 18) + '</span><span class="jw-sn-topname">' + esc(nm(b)) + '</span>' +
        (badge && !open ? '<span class="jw-count" aria-label="' + esc(t('{n}件', { n: badge })) + '">' + badge + '</span>' : '') +
        '<span class="jw-sn-caret">' + ic('alt-arrow-down', 14) + '</span></button>' +
      (open ? treeHtml(b) : '') + '</div>';
  }
  // Hàng お気に入り: hover hiện nút × để gỡ khỏi danh sách (nút đứng CẠNH link, không lồng trong nó)
  function favRemove(k) {
    return '<button type="button" class="jw-sn-fav-x" data-act="fav" data-k="' + esc(k) + '" aria-label="' + esc(t('お気に入りから外す')) + '" data-tip="' + esc(t('お気に入りから外す')) + '">' + ic('close', 13) + '</button>';
  }
  function favsHtml() {
    var rows = S.favs.map(function (k) {
      var p = PAGES[k];
      var l = LINK_BY_KEY[k];
      if (l) {
        return '<div class="jw-sn-fav-item"><button type="button" class="jw-sn-fav" data-act="extlink" data-k="' + esc(k) + '">' + ic('link-round', 14) +
          '<span class="jw-sn-fav-name">' + esc(tr(l.item.label)) + '</span><span class="jw-sn-fav-path">' + esc(tr(l.group.label)) + '</span></button>' + favRemove(k) + '</div>';
      }
      if (!p) return '';
      return '<div class="jw-sn-fav-item"><a class="jw-sn-fav" href="' + href(k) + '">' + nodeIcon(p.node, 14) +
        '<span class="jw-sn-fav-name">' + esc(nm(p.node)) + '</span><span class="jw-sn-fav-path">' + esc(pathLabel(p)) + '</span></a>' + favRemove(k) + '</div>';
    }).join('');
    return rows ? '<div class="jw-sn-favs"><div class="jw-sn-sec">' + ic('star', 12) + t('お気に入り') + '</div>' + rows + '</div>' : '';
  }
  function searchPages(q) {
    var n = norm(q.trim());
    if (!n) return [];
    return PAGE_LIST.filter(function (p) {
      var hay = [p.node.ja, LANG === 'vi' ? p.node.vi : ''].concat(p.trail.map(function (x) { return x.ja + ' ' + (LANG === 'vi' ? x.vi : ''); })).join(' ');
      return norm(hay).indexOf(n) >= 0;
    });
  }
  function hitsHtml(q) {
    var hits = searchPages(q);
    if (!hits.length) return '<p class="jw-sn-hits-none">' + t('該当するメニューがありません。') + '</p>';
    return '<div class="jw-sn-hits">' + hits.map(function (h, i) {
      return '<a class="jw-sn-hit" href="' + href(h.key) + '"' + (i === 0 ? ' data-hot' : '') + '>' +
        '<span class="jw-sn-hit-ico">' + nodeIcon(h.node, 16) + '</span><span class="jw-sn-hit-body">' +
        '<span class="jw-sn-hit-name">' + esc(nm(h.node)) + '</span>' +
        (h.trail.length ? '<span class="jw-sn-hit-path">' + esc(pathLabel(h)) + '</span>' : '') + '</span></a>';
    }).join('') + '</div>';
  }
  function sideBodyHtml() {
    var rail = railNow();
    if (!rail && S.sideQuery.trim()) return hitsHtml(S.sideQuery);
    return (rail ? '' : favsHtml()) + '<nav class="jw-sn-nav" aria-label="' + esc(t('メニュー')) + '">' + MENU.map(blockHtml).join('') + '</nav>';
  }
  function toolBtn(act, icon, label) {
    return '<button type="button" class="jw-sn-tool" data-act="' + act + '" aria-label="' + esc(label) + '" data-tip="' + esc(label) + '" data-tip-pos="bottom">' + icon + '</button>';
  }
  // Side panel = 4 tầng như mockup gốc: logo (+ nút gập) · công cụ · cây (cuộn riêng) · profile + bánh răng
  function renderSide() {
    var el = $('#side');
    var sc = $('#sideScroll');
    var keep = sc ? sc.scrollTop : 0;
    var rail = railNow();
    var drawer = narrow() && S.drawer;
    el.className = 'jw-sidenav jw-glass' + (rail ? ' jw-sidenav--rail' : '') + (drawer ? ' jw-sidenav--drawer' : '');
    document.documentElement.toggleAttribute('data-drawer', drawer);
    var toggleLabel = narrow() ? (drawer ? t('メニューを閉じる') : t('メニューを開く')) : (rail ? t('メニューを開く') : t('メニューを閉じる'));
    var me = SETTINGS_ME;
    var onAccount = ROUTE.name === 'settings' && ROUTE.tab === 'アカウント';
    el.innerHTML =
      '<div class="jw-sn-brand">' +
        '<a class="jw-brandhome" href="#/home" aria-label="JOY START — ' + esc(t('ホーム')) + '"' + (rail ? ' data-tip="JOY START"' : '') + '>' + brandLockup() + '</a>' +
        '<button type="button" class="jw-sn-toggle" data-act="rail" aria-expanded="' + !rail + '" aria-label="' + esc(toggleLabel) + '" data-tip="' + esc(toggleLabel) + '"' + (rail ? '' : ' data-tip-pos="bottom"') + '>' + ic('sidebar-minimalistic', 18) + '</button>' +
      '</div>' +
      (rail ? '' : '<div class="jw-sn-tools">' +
        '<label class="jw-sn-find"' + (S.sideQuery ? ' data-filled' : '') + '>' + ic('magnifier', 16) +
          '<input class="jw-sn-find-input" id="sideFind" type="text" autocomplete="off" placeholder="' + esc(t('メニューを検索')) + '" aria-label="' + esc(t('メニューを検索')) + '" value="' + esc(S.sideQuery) + '">' +
          '<button type="button" class="jw-sn-find-x" id="sideFindX" data-act="side-find-x" aria-label="' + esc(t('検索をクリア')) + '"' + (S.sideQuery ? '' : ' hidden') + '>' + ic('close', 14) + '</button></label>' +
        toolBtn('expand-all', ic('double-alt-arrow-down', 18), t('すべて開く')) +
        toolBtn('collapse-all', ic('double-alt-arrow-up', 18), t('すべて閉じる')) +
      '</div>') +
      '<div class="jw-sn-scroll" id="sideScroll" data-fade-y><div class="jw-sn-content" id="sideBody">' + sideBodyHtml() + '</div></div>' +
      '<div class="jw-sn-foot">' +
        '<a class="jw-sn-me" href="' + setHref('アカウント') + '"' + (onAccount ? ' aria-current="page"' : '') +
          ' aria-label="' + esc(me.name + ' — ' + t('アカウント')) + '"' + (rail ? ' data-tip="' + esc(me.name) + '"' : '') + '>' +
          '<span class="jw-avatar">' + avatarSvg(HEALTH_AVATARS[me.name]) + '</span>' +
          '<span class="jw-sn-who"><span class="jw-sn-name">' + esc(me.name) + '</span><span class="jw-sn-mail">' + esc(me.mail) + '</span></span></a>' +
        '<button type="button" class="jw-sn-gear" id="setBtn" data-act="setpop" aria-haspopup="dialog" aria-expanded="' + S.menuOpen + '" aria-label="' + esc(t('表示設定')) + '" data-tip="' + esc(t('表示設定')) + '">' + ic('settings', 20) + '</button>' +
      '</div>';
    var nsc = $('#sideScroll');
    nsc.scrollTop = keep;
    syncFades(el);
  }
  // Trang hiện tại nằm ngoài vùng nhìn của cột ⇒ cuộn cột tới đó (chỉ khi ĐỔI trang)
  function revealCurrent() {
    var el = $('#sideScroll');
    var cur = $('#side .jw-tree-on');
    if (!el || !cur) return;
    var er = el.getBoundingClientRect(), cr = cur.getBoundingClientRect();
    if (cr.top < er.top + 40 || cr.bottom > er.bottom - 24) el.scrollTop += cr.top - er.top - er.height / 3;
  }
  function refreshSideBody() {
    var el = $('#sideBody');
    if (el) { el.innerHTML = sideBodyHtml(); syncFades($('#sideScroll')); }
    var x = $('#sideFindX');
    if (x) x.hidden = !S.sideQuery;
    var fl = $('#side .jw-sn-find');
    if (fl) fl.toggleAttribute('data-filled', !!S.sideQuery);
  }

  function closeFloating() {
    closeMenu();
    closeInbox();
    closeGs();
    hideTip();
  }

  // ── §Khung trang ──
  function pageHead(o) {
    var eb = '';
    if (o.crumbs && o.crumbs.length) {
      eb = '<nav class="jw-page-eyebrow" aria-label="' + esc(t('パンくずリスト')) + '">' + o.crumbs.map(function (c, i) {
        var sep = i ? '<span class="jw-page-sep" aria-hidden="true">' + ic('alt-arrow-right', 12) + '</span>' : '';
        return sep + (c.href
          ? '<a class="jw-page-crumb-btn" href="' + c.href + '">' + esc(c.label) + '</a>'
          : '<span class="jw-page-crumb-txt">' + esc(c.label) + '</span>');
      }).join('') + '</nav>';
    }
    return '<header class="jw-page-head">' + eb +
      '<div class="jw-page-row"><h1 class="jw-page-title">' + (o.icon ? '<span class="jw-page-icon">' + o.icon + '</span>' : '') +
      '<span>' + esc(o.title) + '</span></h1>' + (o.actions ? '<div class="jw-page-actions">' + o.actions + '</div>' : '') + '</div>' +
      (o.desc ? '<p class="jw-page-desc">' + esc(o.desc) + '</p>' : '') + '</header>';
  }
  function pageInfoHead(p, extraActions) {
    var crumbs = p.trail.map(function (n, i) {
      return { label: nm(n), icon: i === 0 ? ic(p.block.icon, 13) : '' };
    });
    var fav = S.favs.indexOf(p.key) >= 0;
    // Chỉ icon (không chữ); đã ghim = sao đặc cam. Dạt phải, thẳng mép thẻ của trang.
    var favLabel = fav ? t('お気に入りから外す') : t('お気に入りに追加');
    var favAction = '<button type="button" class="jw-pagefav" data-act="fav" data-k="' + esc(p.key) + '" aria-pressed="' + fav + '" aria-label="' + esc(favLabel) + '" data-tip="' + esc(favLabel) + '" data-tip-pos="bottom">' +
      (fav ? ic('star@bold', 22) : ic('star', 22)) + '</button>';
    return pageHead({
      crumbs: crumbs,
      title: nm(p.node),
      icon: nodeIcon(p.node, 20),
      desc: PLACEHOLDER_DESC[p.key] ? tr(PLACEHOLDER_DESC[p.key]) : (p.node.tip ? tr(p.node.tip) : ''),
      actions: (extraActions || '') + (p.key === 'home' ? '' : favAction)
    });
  }
  // Nút "mở" ở góc panel — cùng hình + tooltip như `.jw-hpanel-cta` của JOY Analytics
  function cta(h, tip) {
    return '<a class="jw-cta" href="' + h + '" data-tip="' + esc(tip) + '" data-tip-pos="bottom" aria-label="' + esc(tip) + '">' + ic('square-top-down', 18) + '</a>';
  }
  function panel(o) {
    return '<section class="jw-panel jw-glass' + (o.cls ? ' ' + o.cls : '') + '"' + (o.id ? ' data-card="' + o.id + '" id="card-' + o.id + '"' : '') + '>' +
      // Đầu thẻ KHÔNG còn ô icon (bớt icon thừa) — `o.icon` được bỏ qua có chủ ý
      (o.title ? '<header class="jw-panel-head"><div class="jw-panel-lead">' +
        '<h2 class="jw-panel-name"><span>' + esc(o.title) + '</span>' + (o.sub || '') + '</h2></div>' +
        (o.actions ? '<div class="jw-panel-actions">' + o.actions + '</div>' : '') + '</header>' : '') +
      (o.body || '') + '</section>';
  }
  function seg(act, opts, cur, aria, id) {
    var i = 0;
    opts.forEach(function (o, j) { if (o.v === cur) i = j; });
    return '<div class="jw-seg" role="radiogroup" data-seg="' + esc(id || act) + '"' + (aria ? ' aria-label="' + esc(aria) + '"' : '') + ' style="--seg-n:' + opts.length + ';--seg-i:' + i + '">' +
      '<span class="jw-seg-thumb" aria-hidden="true"></span>' + opts.map(function (o) {
        var on = o.v === cur;
        return '<button type="button" class="jw-seg-opt' + (on ? ' jw-seg-opt--on' : '') + '" role="radio" aria-checked="' + on + '" data-act="' + act + '" data-v="' + esc(o.v) + '"' + (o.name ? ' data-name="' + esc(o.name) + '"' : '') + '>' + (o.icon || '') + esc(o.label) + '</button>';
      }).join('') + '</div>';
  }
  function dsLine(key) {
    var id = PAGE_DS_MAP[key];
    var r = id && DS_BY_ID[id];
    if (!r) return '';
    return '<button type="button" class="jw-ds-line" data-act="ds-line" data-row="' + id + '">' + ic('database', 14) +
      '<span>' + esc(t('データソース：{s}｜担当：{o}｜最終更新：—', { s: tr(r.source), o: t(r.owner) })) + '</span></button>';
  }

  function renderPage(isNav) {
    var main = $('#main');
    var keepTop = main.scrollTop;
    var keepTabs = {};
    var keepSeg = {};
    $$('[data-keep]', main).forEach(function (el) { keepTabs[el.id] = el.scrollLeft; });
    $$('.jw-seg[data-seg]', main).forEach(function (el) { keepSeg[el.getAttribute('data-seg')] = el.style.getPropertyValue('--seg-i'); });
    var keepInk = inkRead(main);
    var focusKey = document.activeElement && document.activeElement.getAttribute && document.activeElement.getAttribute('data-fk');

    var html = pageHtml();
    var screen = $('#screen');
    if (isNav) {
      var fresh = document.createElement('div');
      fresh.className = 'jw-screen';
      fresh.id = 'screen';
      screen.parentNode.replaceChild(fresh, screen);
      screen = fresh;
    }
    screen.innerHTML = html;
    // Núm segmented + vệt tab: gắn vị trí CŨ trước khi bất cứ gì đọc layout, rồi mới trượt sang mới
    var segNow = [];
    $$('.jw-seg[data-seg]', screen).forEach(function (el) {
      var old = keepSeg[el.getAttribute('data-seg')];
      var now = el.style.getPropertyValue('--seg-i');
      if (old !== undefined && old !== now) { el.style.setProperty('--seg-i', old); segNow.push([el, now]); }
    });
    inkMount(screen, keepInk);
    if (isNav) {
      main.scrollTop = 0;
    } else {
      main.scrollTop = keepTop;
      Object.keys(keepTabs).forEach(function (id) { var el = document.getElementById(id); if (el) el.scrollLeft = keepTabs[id]; });
      if (focusKey) { var f = $('[data-fk="' + focusKey + '"]', main); if (f) f.focus({ preventScroll: true }); }
    }
    // (phép đọc layout ở trên đã tính style với vị trí cũ) ⇒ giờ đặt vị trí mới là TRƯỢT
    void main.offsetWidth;
    segNow.forEach(function (x) { x[0].style.setProperty('--seg-i', x[1]); });
    inkPlace(screen);
    syncFades(main);
    if (S.pendingScroll) {
      var target = document.getElementById(S.pendingScroll);
      S.pendingScroll = null;
      if (target) target.scrollIntoView({ block: 'start' });
    }
    if (ROUTE.name === 'settings' && ROUTE.row && isNav) flashDsRow(ROUTE.row);
    document.title = pageTitleText() + ' — JOY START';
    srScan(isNav);
    renderInboxBtn();
    // Ngữ cảnh của JOY Pilot đi theo trang đang xem (chip + gợi ý)
    if (PILOT.open) {
      var cx = $('#pilot .jw-pilot-ctx-page span');
      if (cx) cx.textContent = pageTitleText();
      pilotRefreshChips();
    }
  }

  // ── §Vệt tab: nền của tab đang chọn là MỘT phần tử trượt giữa các tab ──
  var INK_LIST = '.jw-tabs, .jw-vtabs';
  var INK_ON = '[role="tab"][aria-selected="true"]';
  function inkBox(on) { return [on.offsetLeft, on.offsetTop, on.offsetWidth, on.offsetHeight]; }
  function inkSet(ink, b) {
    ink.style.setProperty('--ink-x', b[0] + 'px');
    ink.style.setProperty('--ink-y', b[1] + 'px');
    ink.style.setProperty('--ink-w', b[2] + 'px');
    ink.style.setProperty('--ink-h', b[3] + 'px');
  }
  function inkRead(root) {
    var keep = {};
    $$('.jw-tabs[id], .jw-vtabs[id]', root).forEach(function (tl) {
      var on = $(INK_ON, tl);
      if (on) keep[tl.id] = inkBox(on);
    });
    return keep;
  }
  function inkMount(root, keep) {
    $$(INK_LIST, root).forEach(function (tl) {
      if ($('.jw-tabs-ink', tl)) return;
      var ink = document.createElement('span');
      ink.className = 'jw-tabs-ink';
      ink.setAttribute('aria-hidden', 'true');
      var old = tl.id && keep && keep[tl.id];
      if (old) inkSet(ink, old);
      else ink.classList.add('jw-tabs-ink--now');
      tl.insertBefore(ink, tl.firstChild);
      tl.setAttribute('data-ink', '');
    });
  }
  function inkPlace(root) {
    $$('.jw-tabs[data-ink], .jw-vtabs[data-ink]', root).forEach(function (tl) {
      var ink = $('.jw-tabs-ink', tl);
      var on = $(INK_ON, tl);
      if (!ink) return;
      ink.hidden = !on;
      if (!on) return;
      inkSet(ink, inkBox(on));
      if (ink.classList.contains('jw-tabs-ink--now')) { void ink.offsetWidth; ink.classList.remove('jw-tabs-ink--now'); }
    });
  }

  // ── §Accordion: mở = khung GIÃN ra + từng mục PHÓNG ra lần lượt; đóng = thu lại rồi mới vẽ lại ──
  // (HTML được vẽ lại nguyên khối nên CSS transition không có "trạng thái trước" ⇒ dùng Web Animations)
  var ACC_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
  function accOpen(body, items, caret, delay) {
    if (REDUCED || !body || !body.animate) return;
    delay = delay || 0;
    var h = body.offsetHeight, cs = getComputedStyle(body);
    body.style.overflow = 'hidden';
    // padding cũng co về 0 — không thì khung còn đúng phần đệm (border-box) và nhảy một nhịp
    var a = body.animate([{ height: '0px', paddingTop: '0px', paddingBottom: '0px', opacity: 0.35 },
      { height: h + 'px', paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom, opacity: 1 }], { duration: 440, delay: delay, easing: ACC_EASE, fill: 'backwards' });
    a.onfinish = a.oncancel = function () { body.style.overflow = ''; };
    (items || []).forEach(function (it, i) {
      it.animate([{ opacity: 0, transform: 'translateY(-8px) scale(0.97)' }, { opacity: 1, transform: 'none' }],
        { duration: 420, delay: delay + 40 + Math.min(i, 14) * 32, easing: ACC_EASE, fill: 'backwards' });
    });
    if (caret) caret.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(180deg)' }], { duration: 420, delay: delay, easing: ACC_EASE, fill: 'backwards' });
  }
  function accClose(body, items, caret, done) {
    if (REDUCED || !body || !body.animate) { done(); return; }
    var h = body.offsetHeight, n = (items || []).length, cs = getComputedStyle(body);
    body.style.overflow = 'hidden';
    (items || []).forEach(function (it, i) {
      it.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-6px) scale(0.98)' }],
        { duration: 200, delay: Math.min(n - 1 - i, 10) * 14, easing: 'ease-in', fill: 'forwards' });
    });
    if (caret) caret.animate([{ transform: 'rotate(180deg)' }, { transform: 'rotate(0deg)' }], { duration: 300, easing: ACC_EASE, fill: 'forwards' });
    var a = body.animate([{ height: h + 'px', paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom, opacity: 1 },
      { height: '0px', paddingTop: '0px', paddingBottom: '0px', opacity: 0 }], { duration: 300, delay: 60, easing: 'cubic-bezier(0.4, 0, 0.6, 1)', fill: 'forwards' });
    var fired = false;
    a.onfinish = a.oncancel = function () { if (!fired) { fired = true; done(); } };
  }
  // Cây menu: lấy từng HÀNG (hàng nhóm, hàng lá) — không lấy cả khối node, để hàng con không bị cộng dồn chuyển động
  function treeItems(body) { return $$('.jw-tree-node > .jw-tree-item, .jw-tree-node > .jw-tree-row, .jw-tree-kid', body); }
  function blockParts(k) {
    var top = $('#side .jw-sn-top[data-k="' + k + '"]');
    var blk = top && top.parentNode;
    var body = blk && $('.jw-sn-body', blk);
    return { blk: blk, body: body, caret: top && $('.jw-sn-caret', top) };
  }
  function animateBlockOpen(k, delay) {
    var bp = blockParts(k);
    if (bp.body) accOpen(bp.body, treeItems(bp.body), bp.caret, delay);
  }
  // Hàng MỚI xuất hiện trong một thẻ (vd. 過去 của スケジュール) phóng ra lần lượt
  function revealNew(before, root) {
    if (REDUCED || !root) return;
    $$('.jw-rowi', root).filter(function (el) { return before.indexOf(el.textContent) < 0; }).forEach(function (it, i) {
      it.animate([{ opacity: 0, transform: 'translateY(-8px) scale(0.98)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: Math.min(i, 12) * 36, easing: ACC_EASE, fill: 'backwards' });
    });
  }

  // ── §Hiện dần khi cuộn (mọi trang) ──
  // Khối (đầu trang · hero · MVV · thẻ) trượt lên + hiện khi vào vùng nhìn; phần tử con trong khối
  // (hàng, thẻ nhỏ, ô…) nối đuôi nhau theo --sr-i. Chỉ chạy khi ĐỔI TRANG — vẽ lại tại chỗ (đổi tab,
  // lọc…) thì hiện ngay, không nhảy lại. Số có `data-count-to` đếm lên lúc khối hiện ra.
  var SR_BLOCK = '.jw-page-head, .jw-hero, .jw-mvv2, .jw-panel, .jw-set-tabs, .jw-search-page > :first-child';
  var SR_ITEM = '.jw-rowi, .jw-nh-card, .jw-photo, .jw-fx-row, .jw-mvv2-value, .jw-set-row, .jw-table tbody tr, .jw-linkbtn, .jw-tile, .jw-acc-item';
  var srIO = !REDUCED && 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      srIO.unobserve(en.target);
      srShow(en.target);
    });
  }, { root: $('#main'), rootMargin: '0px 0px -6% 0px', threshold: 0.04 }) : null;
  function srShow(el) {
    el.classList.add('jw-sr-in');
    setTimeout(function () { el.classList.add('jw-sr-done'); }, 1400);
  }
  var cntIO = srIO ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      cntIO.unobserve(en.target);
      // Hàng đang nối đuôi hiện ra (--sr-i) ⇒ số bắt đầu đếm ĐÚNG lúc hàng đó hiện, không sớm hơn
      var it = en.target.closest(SR_ITEM), blk = en.target.closest('[data-sr]');
      var lag = it && blk && !blk.classList.contains('jw-sr-done') ? (parseFloat(it.style.getPropertyValue('--sr-i')) || 0) * 45 + 140 : 0;
      countUp(en.target, 1400, lag);
    });
  }, { root: $('#main'), rootMargin: '0px 0px -6% 0px', threshold: 0 }) : null;
  // Cuộn NHẢY qua (kéo thanh cuộn, Home/End) ⇒ số chưa kịp "giao" với vùng nhìn đã nằm phía TRÊN:
  // IO không bao giờ báo ⇒ đặt thẳng số cuối, không để kẹt ở 0
  var cntRaf = 0;
  if (cntIO) $('#main').addEventListener('scroll', function () {
    if (cntRaf) return;
    cntRaf = requestAnimationFrame(function () {
      cntRaf = 0;
      var top = $('#main').getBoundingClientRect().top;
      $$('#screen [data-count-to]:not([data-counted])').forEach(function (el) {
        if (el.getBoundingClientRect().bottom >= top) return;
        cntIO.unobserve(el);
        el.setAttribute('data-counted', '');
        el.textContent = cntFmt(+el.getAttribute('data-count-to'), el.getAttribute('data-count-fmt'), +el.getAttribute('data-count-digits') || 0);
        el.style.minWidth = '';
      });
    });
  }, { passive: true });
  function srScan(animate) {
    if (srIO && animate) srIO.disconnect();
    $$(SR_BLOCK, $('#screen')).forEach(function (el) {
      if (el.hasAttribute('data-sr') || (el.parentElement && el.parentElement.closest('[data-sr]'))) return;
      el.setAttribute('data-sr', '');
      $$(SR_ITEM, el).forEach(function (it, i) { it.style.setProperty('--sr-i', Math.min(i, 14)); });
      if (animate && srIO) srIO.observe(el);
      else el.classList.add('jw-sr-in', 'jw-sr-done');
    });
    if (!cntIO || !animate) return;
    cntIO.disconnect();
    $$('[data-count-to]', $('#screen')).forEach(function (el) {
      // giữ bề ngang của số cuối ⇒ hàng không xô lệch trong lúc đếm; về 0 NGAY (khối còn ẩn nên không ai thấy)
      el.style.minWidth = el.getBoundingClientRect().width + 'px';
      el.textContent = cntFmt(0, el.getAttribute('data-count-fmt'), +el.getAttribute('data-count-digits') || 0);
      cntIO.observe(el);
    });
  }
  function countUp(el, dur, lag) {
    var to = Number(el.getAttribute('data-count-to'));
    if (!isFinite(to) || el.hasAttribute('data-counted')) return;
    el.setAttribute('data-counted', '');
    var fmt = el.getAttribute('data-count-fmt'), digits = +el.getAttribute('data-count-digits') || 0;
    dur = dur || 1400;
    var t0 = performance.now() + (lag || 0);
    function show(v) { el.textContent = cntFmt(digits ? Math.round(v * Math.pow(10, digits)) / Math.pow(10, digits) : Math.round(v), fmt, digits); }
    show(0);
    (function frame(now) {
      if (!el.isConnected) return;
      var k = Math.max(0, Math.min(1, (now - t0) / dur));
      show(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(frame);
      else el.style.minWidth = '';
    })(performance.now());
  }
  function pageTitleText() {
    if (ROUTE.name === 'page') return nm(PAGES[ROUTE.key].node);
    if (ROUTE.name === 'settings') return t('設定');
    if (ROUTE.name === 'announce') return t('お知らせ');
    if (ROUTE.name === 'deals') return t('受注速報');
    if (ROUTE.name === 'search') return t('検索結果');
    return t('ホーム');
  }
  function pageHtml() {
    switch (ROUTE.name) {
      case 'settings': return pageSettings();
      case 'announce': return pageAnnounce();
      case 'deals': return pageDeals();
      case 'search': return pageSearch();
      case 'page': return pageByKey(PAGES[ROUTE.key]);
      default: return pageHome();
    }
  }
  function pageByKey(p) {
    switch (p.key) {
      case 'todo/予定': return pageTodo(p);
      case 'link': return pageLinks(p);
      case 'health/記録': return pageHealthRecord(p);
      case 'health/ランキング': return pageRanking(p);
      case 'health/部活': return pageClubs(p);
      case 'health/制度｜サポート': return pageSupport(p);
      default: return pagePlaceholder(p);
    }
  }

  // ── §HOME ──
  function homeCfg() {
    var cfg = { left: HOME_CARD_DEFAULT.left.slice(), right: HOME_CARD_DEFAULT.right.slice(), hidden: {} };
    var o = loadJSON(KEY.cards, null);
    if (o && typeof o === 'object') {
      ['left', 'right'].forEach(function (col) {
        if (!Array.isArray(o[col])) return;
        var ids = [];
        o[col].forEach(function (id) { if (HOME_CARD_DEFS[id] && HOME_CARD_DEFS[id].col === col && ids.indexOf(id) < 0) ids.push(id); });
        HOME_CARD_DEFAULT[col].forEach(function (id) { if (ids.indexOf(id) < 0) ids.push(id); });
        cfg[col] = ids;
      });
      if (o.hidden && typeof o.hidden === 'object') {
        Object.keys(o.hidden).forEach(function (id) { if (HOME_CARD_DEFS[id] && o.hidden[id]) cfg.hidden[id] = true; });
      }
    }
    return cfg;
  }
  var CARD_HTML = {
    deal: cardDeal, announce: cardAnnounce, newhire: cardNewhire, schedule: cardSchedule,
    health: cardHealth, photos: cardPhotos, bizdays: cardBizdays, fx: cardFx
  };
  function cardIcon(id) { return ic(HOME_CARD_DEFS[id].icon, 18); }
  // Home = lời chào + ô tìm (hero) → MVV (xương sống của công ty) → lưới thẻ.
  // Số việc (承認待ち…) KHÔNG còn ở đây — đã dời vào 通知センター ở góc phải.
  function pageHome() {
    var cfg = homeCfg();
    function col(c) { return cfg[c].filter(function (id) { return !cfg.hidden[id]; }).map(function (id) { return CARD_HTML[id](); }).join(''); }
    return '<div class="jw-home">' + heroHtml() + mvvHtml() +
        '<div class="jw-home-grid"><div class="jw-home-col">' + col('left') + '</div><div class="jw-home-col jw-home-col--side">' + col('right') + '</div></div>' +
      '</div>';
  }
  function greeting() {
    var h = new Date().getHours();
    return h >= 5 && h < 11 ? t('おはようございます') : h >= 11 && h < 18 ? t('こんにちは') : t('こんばんは');
  }
  function heroHtml() {
    var name = LANG === 'vi' ? SETTINGS_ME.name : SETTINGS_ME.name.split(' ')[0];
    return '<section class="jw-hero" data-card="hero">' +
      '<p class="jw-hero-date">' + esc(fmtLong(HOME_TODAY)) + '</p>' +
      '<h1 class="jw-hero-title">' + esc(greeting()) + (LANG === 'vi' ? ', ' : '、') + '<span class="jw-hero-name">' + esc(t('{name}さん', { name: name })) + '</span></h1>' +
      '<div class="jw-hero-search">' + gsearchHtml() + '</div></section>';
  }
  function gsearchHtml() {
    return '<div class="jw-gsearch" id="gsearch"><label class="jw-gsearch-box jw-glass">' + ic('magnifier', 18) +
      '<input class="jw-gsearch-input" id="gsInput" type="text" autocomplete="off" placeholder="' + esc(t('JOY START 全体を検索')) + '" aria-label="' + esc(t('JOY START 全体を検索')) + '" aria-controls="gsDrop">' +
      '<button type="button" class="jw-sn-find-x" id="gsClear" data-act="gs-clear" aria-label="' + esc(t('検索をクリア')) + '" hidden>' + ic('close', 14) + '</button>' +
      '</label><div class="jw-gs-drop jw-glass" id="gsDrop" hidden></div></div>';
  }
  // MVV — sân khấu chính của Home: MISSION chữ lớn, VISION + số giờ đã giảm (đếm lên khi hiện),
  // 5 VALUE đánh số. Nền phẳng (không gradient) + mark Dr.JOY chìm, đứng thẳng.
  function mvvHtml() {
    return '<section class="jw-mvv2" data-card="mvv" aria-label="MISSION · VISION · VALUE">' +
      '<div class="jw-mvv2-bg" aria-hidden="true">' + DRJOY_MARK.replace('jw-brand-mark', 'jw-mvv2-mark') + '</div>' +
      '<div class="jw-mvv2-top">' +
        '<div class="jw-mvv2-mission"><span class="jw-mvv2-label">MISSION</span><p class="jw-mvv2-statement">' + tr(MVV.mission) + '</p></div>' +
        '<div class="jw-mvv2-vision"><span class="jw-mvv2-label">VISION</span><p class="jw-mvv2-vtext">' + tr(MVV.vision) + '</p>' +
          '<div class="jw-mvv2-impact"><span class="jw-mvv2-num"><span class="jw-num jw-cnt" data-count-to="' + MVV.impactHours + '">' + nf(MVV.impactHours) + '</span><small>' + t('時間') + '</small></span>' +
            '<span class="jw-mvv2-impact-label">' + t('今月減らせた時間') + '</span>' +
            '<button type="button" class="jw-link" data-act="toast" data-msg="Vision Report（準備中のモック）">' + t('詳細') + ic('alt-arrow-right', 14) + '</button></div>' +
        '</div>' +
      '</div>' +
      '<div class="jw-mvv2-values"><span class="jw-mvv2-label">VALUE</span><ol class="jw-mvv2-list">' +
        MVV.values.map(function (v, i) { return '<li class="jw-mvv2-value"><span class="jw-mvv2-no">' + pad(i + 1) + '</span><span class="jw-mvv2-vname">' + esc(tr(v)) + '</span></li>'; }).join('') +
      '</ol></div></section>';
  }

  // ── §通知センター — nút chuông góc phải + panel (承認待ち · 期限切れ · 今日の予定 · 未読) ──
  function inboxGroups() {
    function map(list) { return list.map(function (x) { return { lead: x.time || '', title: tr(x.title), meta: tr(x.meta), href: href(x.page) }; }); }
    var unread = ANNOUNCEMENTS.filter(isUnread).sort(byDate(-1)).map(function (a) {
      return { lead: '', title: tr(a.title), meta: fmtMD(a.date) + ' · ' + t(a.cat), href: '#/announce/' + a.id, important: !!a.important };
    });
    return [
      { id: 'approval', label: t('承認待ち'), tone: 'orange', more: href('todo/承認'), items: map(INBOX.approval) },
      { id: 'overdue', label: t('期限切れ'), tone: 'rose', more: href('todo/アクション'), items: map(INBOX.overdue) },
      { id: 'today', label: t('今日の予定'), tone: 'blue', more: href('todo/予定'), items: map(INBOX.today) },
      { id: 'unread', label: t('未読のお知らせ'), tone: 'plum', more: '', items: unread }
    ];
  }
  function inboxTotal() { return inboxGroups().reduce(function (n, g) { return n + g.items.length; }, 0); }
  function renderInboxBtn() {
    var btn = $('#inboxBtn');
    if (!btn) return;
    var n = inboxTotal();
    btn.innerHTML = ic('bell', 20) + (n ? '<span class="jw-inbox-badge jw-num">' + (n > 99 ? '99+' : n) + '</span>' : '');
    btn.setAttribute('aria-label', t('通知を開く') + (n ? ' — ' + n + ' ' + t('件の通知') : ''));
    btn.setAttribute('aria-expanded', String(S.inboxOpen));
  }
  function inboxHtml() {
    var gs = inboxGroups();
    var total = gs.reduce(function (n, g) { return n + g.items.length; }, 0);
    return '<div class="jw-inbox-head"><span class="jw-inbox-title">' + t('通知') + '</span><span class="jw-inbox-total jw-num">' + total + '</span></div>' +
      '<div class="jw-inbox-sum" role="tablist" aria-label="' + esc(t('通知')) + '">' +
        '<button type="button" class="jw-inbox-tile jw-tone-orange" role="tab" aria-selected="' + (S.inboxTab === 'all') + '" data-act="inbox-tab" data-v="all"><b class="jw-num" data-count-to="' + total + '">' + total + '</b><span>' + t('すべて') + '</span></button>' +
        gs.map(function (g) {
          return '<button type="button" class="jw-inbox-tile jw-tone-' + g.tone + '" role="tab" aria-selected="' + (S.inboxTab === g.id) + '" data-act="inbox-tab" data-v="' + g.id + '"><b class="jw-num" data-count-to="' + g.items.length + '">' + g.items.length + '</b><span>' + esc(g.label) + '</span></button>';
        }).join('') + '</div>' +
      '<div class="jw-inbox-body" id="inboxBody">' + gs.filter(function (g) { return S.inboxTab === 'all' || S.inboxTab === g.id; }).map(function (g) {
        return '<section class="jw-inbox-sec jw-tone-' + g.tone + '" id="inbox-' + g.id + '"><div class="jw-inbox-sec-head"><span class="jw-inbox-sec-name">' + esc(g.label) + '</span>' +
          '<span class="jw-inbox-n jw-num">' + g.items.length + '</span>' + (g.more ? '<a class="jw-link" href="' + g.more + '">' + t('すべて見る') + '</a>' : '') + '</div>' +
          (g.items.length ? g.items.map(function (it) {
            return '<a class="jw-inbox-item" href="' + it.href + '">' + (it.lead ? '<span class="jw-inbox-time jw-num">' + esc(it.lead) + '</span>' : '<span class="jw-inbox-dot"></span>') +
              '<span class="jw-inbox-txt"><span class="jw-inbox-name">' + esc(it.title) + '</span><span class="jw-inbox-meta">' + esc(it.meta) + '</span></span>' +
              (it.important ? '<span class="jw-badge jw-badge--crit">' + t('重要') + '</span>' : '') + '</a>';
          }).join('') : '<p class="jw-inbox-none">' + t('未読はありません') + '</p>') + '</section>';
      }).join('') + '</div>';
  }
  function openInbox() {
    closeFloating();
    S.inboxOpen = true;
    $('#inboxLayer').innerHTML = '<div class="jw-scrim jw-scrim--clear" data-act="inbox-close" aria-hidden="true"></div>' +
      '<div class="jw-inbox jw-glass" role="dialog" id="inboxPanel" aria-label="' + esc(t('通知センター')) + '">' + inboxHtml() + '</div>';
    var p = $('#inboxPanel');
    void p.offsetHeight;
    p.classList.add('jw-inbox--open');
    if (!REDUCED) $$('.jw-inbox-tile [data-count-to]', p).forEach(function (el) { countUp(el, 700, 80); });
    renderInboxBtn();
  }
  function closeInbox() {
    if (!S.inboxOpen) return;
    S.inboxOpen = false;
    var box = $('#inboxLayer');
    var p = $('#inboxPanel');
    var sc = box.querySelector('.jw-scrim');
    if (sc) sc.remove();
    if (p) { p.classList.remove('jw-inbox--open'); setTimeout(function () { if (!S.inboxOpen && p.parentNode) p.remove(); }, 220); }
    renderInboxBtn();
  }
  function dealIsNew(d) { var diff = dayDiff(HOME_TODAY, pd(d.date)); return diff >= 0 && diff <= DEAL_NEW_DAYS; }
  function dealsSorted() { return DEALS.slice().sort(byDate(-1)); }
  function dealRow(d) {
    var p = PRODUCT_BY_JA[d.prod];
    return '<div class="jw-rowi jw-deal">' +
      '<span class="jw-deal-face">' + avatarSvg(DEAL_AES[d.ae] || AVATAR_POOL[0]) + '</span>' +
      '<span class="jw-deal-ae" title="' + esc(d.ae) + ' (AE)">' + esc(d.ae) + '</span>' +
      '<span class="jw-deal-br" aria-hidden="true"></span>' +
      '<span class="jw-deal-info"><span class="jw-deal-hosp" title="' + esc(d.hosp) + '">' + esc(d.hosp) + '</span>' +
        prodTag(p, 'jw-deal-prod') + '</span>' +
      '<span class="jw-deal-amt"><span class="jw-deal-total">' + cnt(d.total, 'yen') + '</span><span class="jw-deal-mrr">MRR ' + cnt(d.mrr, 'yen') + '</span></span>' +
      '<span class="jw-deal-date">' + (dealIsNew(d) ? '<span class="jw-badge jw-badge--solid">NEW</span>' : '') + fmtMD(d.date) + '</span>' +
    '</div>';
  }
  function cardDeal() {
    return panel({ id: 'deal', icon: cardIcon('deal'), title: t('受注速報'), cls: 'jw-deals',
      actions: cta('#/deals', t('過去の受注速報')),
      body: '<div class="jw-rows">' + dealsSorted().slice(0, 5).map(dealRow).join('') + '</div>' });
  }
  function annFiltered() {
    var k = S.announceTab;
    var list = k === 'すべて' ? ANNOUNCEMENTS.slice() : k === '未読' ? ANNOUNCEMENTS.filter(isUnread) : ANNOUNCEMENTS.filter(function (a) { return a.cat === k; });
    return list.sort(annOrder);
  }
  function annOrder(x, y) {
    if (!!x.important !== !!y.important) return x.important ? -1 : 1;
    return x.date < y.date ? 1 : x.date > y.date ? -1 : 0;
  }
  function annRow(a) {
    var unread = isUnread(a);
    return '<a class="jw-rowi jw-ann" href="#/announce/' + a.id + '"' + (unread ? '' : ' data-read') + (a.important ? ' data-important' : '') + ' title="' + esc(tr(a.title)) + '">' +
      '<span class="jw-ann-dot"' + (unread ? ' aria-label="' + esc(t('未読')) + '" role="img"' : '') + '></span>' +
      '<span class="jw-ann-date">' + fmtMD(a.date) + '</span>' +
      '<span class="jw-tag jw-tone-' + ANNOUNCE_TONE[a.cat] + '">' + esc(t(a.cat)) + '</span>' +
      (a.important ? '<span class="jw-badge jw-badge--crit">' + t('重要') + '</span>' : '') +
      '<span class="jw-ann-title">' + esc(tr(a.title)) + '</span></a>';
  }
  function cardAnnounce() {
    var unread = unreadCount();
    var list = annFiltered();
    var tabs = '<div class="jw-tabs" role="tablist" id="annTabs" data-keep data-fade-x aria-label="' + esc(t('お知らせ')) + '">' + ANNOUNCE_TABS.map(function (k) {
      var n = k === '未読' ? unread : null;
      return '<button type="button" class="jw-tab" role="tab" aria-selected="' + (k === S.announceTab) + '" data-act="ann-tab" data-v="' + esc(k) + '" data-fk="ann-' + esc(k) + '" data-tip="' + esc(tr(ANNOUNCE_TAB_DESC[k])) + '" data-tip-pos="bottom">' +
        esc(t(k)) + (n !== null ? '<span class="jw-tab-n">' + n + '</span>' : '') + '</button>';
    }).join('') + '</div>';
    return panel({ id: 'announce', icon: cardIcon('announce'), title: t('お知らせ'),
      actions: '<span class="jw-ann-unread"' + (unread ? '' : ' data-zero') + '>' + esc(t('未読 {n}', { n: unread })) + '</span>' +
        '<button type="button" class="jw-link" data-act="ann-readall"' + (unread ? '' : ' disabled') + '>' + t('すべて既読') + '</button>',
      body: tabs + (list.length ? '<div class="jw-rows">' + list.map(annRow).join('') + '</div>' : '<p class="jw-empty">' + ic('inbox', 34) + t('該当するお知らせはありません') + '</p>') });
  }
  function cardNewhire() {
    var groups = ['JP', 'VN'].map(function (site) {
      var list = NEW_HIRES.filter(function (h) { return h.site === site; });
      if (!list.length) return '';
      return '<div class="jw-nh-group"><h3 class="jw-nh-gtitle">' + site + ' · ' + esc(t('{n}名', { n: list.length })) + '</h3><div class="jw-nh-grid">' +
        list.map(function (h) {
          return '<article class="jw-nh-card jw-tile jw-pane">' +
            '<div class="jw-nh-photo">' + avatarSvg(h.av) + '<span class="jw-sample">' + t('サンプル') + '</span></div>' +
            '<div class="jw-nh-name" title="' + esc(h.name) + '">' + esc(h.name) + '</div>' +
            '<div class="jw-nh-date">' + esc(t('{d} 入社', { d: fmtMDs(h.date) })) + '</div>' +
            '<div class="jw-nh-dept">' + esc(t(h.dept)) + '</div>' +
            '<span class="jw-tag jw-tone-orange" title="' + esc(h.code + '：' + t(h.job)) + '">' + esc(h.code) + ' · ' + esc(t(h.job)) + '</span>' +
            '<p class="jw-nh-msg" title="' + esc(h.msg) + '">' + esc(h.msg) + '</p></article>';
        }).join('') + '</div></div>';
    }).join('');
    return panel({ id: 'newhire', icon: cardIcon('newhire'), title: t('今月の新入社員'),
      sub: '<span class="jw-panel-sub">' + fmtYM(NEW_HIRES_MONTH.y, NEW_HIRES_MONTH.m) + '</span>',
      actions: '<span class="jw-hchip">' + tH('{n}名', { n: cnt(NEW_HIRES.length) }) + '</span>', body: groups });
  }
  function schRow(e, isPast) {
    var diff = dayDiff(pd(e.date), HOME_TODAY);
    var badge = isPast ? '' : diff === 0 ? '<span class="jw-badge jw-badge--solid">' + t('今日') + '</span>' : diff === 1 ? '<span class="jw-badge">' + t('明日') + '</span>' : '';
    return '<div class="jw-rowi jw-sch"' + (isPast ? ' data-past' : '') + '><span class="jw-sch-date">' + fmtMD(e.date) + badge + '</span>' +
      '<span class="jw-sch-name">' + esc(tr(e.name)) + '</span><span class="jw-sch-place"><span>' + esc(tr(e.place)) + '</span></span></div>';
  }
  function cardSchedule() {
    var past = S.schedPast
      ? '<div class="jw-rows">' + SCHEDULE_PAST.slice().sort(byDate(1)).map(function (e) { return schRow(e, true); }).join('') + '</div>' +
        '<div class="jw-sch-today">' + esc(t('今日 {d}', { d: fmtMDs(HOME_TODAY) })) + '</div>'
      : '';
    return panel({ id: 'schedule', icon: cardIcon('schedule'), title: t('スケジュール'),
      actions: '<button type="button" class="jw-link" data-act="sched-past" aria-expanded="' + S.schedPast + '">' + (S.schedPast ? t('過去を閉じる') : t('過去')) + '</button>',
      body: past + '<div class="jw-rows">' + SCHEDULE_EVENTS.map(function (e) { return schRow(e, false); }).join('') + '</div>' });
  }
  function rankFace(r) { return '<span class="jw-face">' + avatarSvg(HEALTH_AVATARS[r.name] || AVATAR_POOL[(Math.max(1, r.rank) - 1) % AVATAR_POOL.length]) + '</span>'; }
  function rankRow(r) {
    return '<div class="jw-rowi jw-rank"' + (r.rank <= 3 ? ' data-top' : '') + '><span class="jw-rank-no">' + esc(t('{n}位', { n: r.rank })) + '</span>' + rankFace(r) +
      '<span class="jw-rank-name">' + esc(r.name) + '</span><span class="jw-rank-pt">' + cnt(r.pt) + ' pt</span></div>';
  }
  function catOpts() { return HEALTH_CATS.map(function (c) { return { v: c, label: t(c) }; }); }
  function cardHealth() {
    var rows = (HEALTH_RANKING[S.healthCat] || []).slice(0, 5);
    return panel({ id: 'health', icon: cardIcon('health'), title: t('健康JOY 今月のランキング'),
      actions: '<a class="jw-cta" href="' + href('health/ランキング') + '" data-act="to-ranking" data-tip="' + esc(t('ランキングへ')) + '" data-tip-pos="bottom" aria-label="' + esc(t('ランキングへ')) + '">' + ic('square-top-down', 18) + '</a>',
      body: seg('health-cat', catOpts(), S.healthCat, t('部門'), 'homeHealth') + '<div class="jw-rows">' + rows.map(rankRow).join('') + '</div>' });
  }
  function photoMedia(p) { return p.src ? '<img src="' + p.src + '" alt="">' : photoSvg(p.scene); }
  function cardPhotos() {
    return panel({ id: 'photos', icon: cardIcon('photos'), title: t('みんなのフォト'),
      actions: '<button type="button" class="jw-btn jw-btn--solid jw-btn--sm" data-act="photo-post">' + ic('camera-add', 15) + t('投稿') + '</button>',
      body: '<input type="file" accept="image/*" id="photoInput" hidden><div class="jw-photos">' + S.photos.map(function (p, i) {
        var cap = tr(p.caption);
        return '<button type="button" class="jw-photo" data-act="photo" data-i="' + i + '" aria-label="' + esc(t('{c}を拡大表示', { c: cap })) + '">' +
          '<div class="jw-photo-thumb">' + photoMedia(p) + (p.src ? '' : '<span class="jw-sample">' + t('サンプル') + '</span>') + '</div>' +
          '<div class="jw-photo-cap">' + esc(cap) + '</div>' +
          '<div class="jw-photo-meta"><span>' + fmtMDs(p.date) + '</span><span class="jw-photo-user">' + esc(p.user) + '</span>' +
          '<span class="jw-photo-like">' + ic('heart', 12) + cnt(p.likes) + '</span></div></button>';
      }).join('') + '</div>' });
  }
  function monthsLabel(r) {
    var p = r.split('-');
    return LANG === 'vi' ? 'T' + p[0] + '–T' + p[1] : p[0] + '-' + p[1] + '月';
  }
  function cardBizdays() {
    return panel({ id: 'bizdays', icon: cardIcon('bizdays'), title: t('四半期'),
      body: '<div class="jw-table-wrap"><table class="jw-table"><thead><tr><th>' + t('四半期') + '</th><th class="jw-r">' + t('残り営業日') + '</th><th class="jw-r">' + t('残り週') + '</th></tr></thead><tbody>' +
        BIZDAYS.map(function (r) {
          return '<tr' + (r.current ? ' data-current' : '') + '><td>' + r.q + ' <span class="jw-muted">' + monthsLabel(r.months) + '</span></td>' +
            '<td class="jw-r jw-num">' + cnt(r.days) + '</td><td class="jw-r jw-num">' + cnt(r.weeks) + '</td></tr>';
        }).join('') + '</tbody></table></div><p class="jw-note">' + t('当期（4Q）を強調表示・値はサンプルです') + '</p>' });
  }
  function cardFx() {
    return panel({ id: 'fx', icon: cardIcon('fx'), title: t('為替'),
      body: '<div class="jw-fx">' + FX.map(function (f) {
        return '<div class="jw-fx-row jw-pane"><span class="jw-fx-from">' + f.from + '</span><span class="jw-fx-to">' + cnt(f.to, null, f.digits) + '<small>' + (LANG === 'vi' ? f.unit : f.unitJa) + '</small></span></div>';
      }).join('') + '</div><p class="jw-note">' + esc(t('取得日時：{d}（サンプル値）', { d: '2026/09/27 09:00' })) + '</p>' });
  }

  // ── §全体検索 ──
  function sampleText(v) { return typeof v === 'object' && v ? v.ja + (LANG === 'vi' ? ' ' + v.vi : '') : String(v || ''); }
  function sampleMatch(it, n) {
    var hay = sampleText(it.title) + ' ' + sampleText(it.sub) + ' ' + (it.keywords || []).join(' ');
    return norm(hay).indexOf(n) >= 0;
  }
  function linkSamples() {
    var out = [];
    LINK_GROUPS.forEach(function (g) {
      g.items.forEach(function (it) { out.push({ title: it.label, sub: { ja: 'リンク ＞ ' + sampleText(g.label).split(' ')[0], vi: 'Liên kết › ' + tr(g.label) }, key: it.key, keywords: [sampleText(g.label)] }); });
    });
    return out;
  }
  function gsCollect(q) {
    var n = norm(q.trim());
    var res = [];
    if (!n) return res;
    searchPages(q).forEach(function (p) { res.push({ cat: 'menu', title: nm(p.node), sub: pathLabel(p) || t('メニュー'), page: p.key, node: p.node }); });
    GS_CATS.forEach(function (c) {
      if (c.id === 'menu') return;
      var items = c.id === 'link' ? linkSamples() : (SAMPLE_RESULTS[c.id] || []);
      items.forEach(function (it) {
        if (sampleMatch(it, n)) res.push({ cat: c.id, title: typeof it.title === 'object' ? tr(it.title) : it.title, sub: tr(it.sub), link: it.key });
      });
    });
    return res;
  }
  function catOf(id) { for (var i = 0; i < GS_CATS.length; i++) { if (GS_CATS[i].id === id) return GS_CATS[i]; } return GS_CATS[0]; }
  function renderGsDrop(q) {
    var drop = $('#gsDrop');
    if (!drop) return;
    S.gsHot = -1;
    if (!q.trim()) { drop.hidden = true; drop.innerHTML = ''; return; }
    var all = gsCollect(q);
    var html = '';
    GS_CATS.forEach(function (c) {
      var items = all.filter(function (r) { return r.cat === c.id; }).slice(0, c.id === 'menu' ? 8 : 5);
      if (!items.length) return;
      html += '<div class="jw-gs-group"><div class="jw-gs-title">' + ic(c.icon, 13) + esc(t(c.label)) + '</div>' + items.map(function (r) {
        return '<button type="button" class="jw-gs-item" data-act="gs-item" data-cat="' + r.cat + '" data-page="' + esc(r.page || '') + '" data-link="' + esc(r.link || '') + '" data-title="' + esc(r.title) + '">' +
          (r.node ? nodeIcon(r.node, 16) : r.icon ? ic(r.icon, 16) : ic(c.icon, 16)) + '<span class="jw-gs-body"><span class="jw-gs-name">' + esc(r.title) + '</span><span class="jw-gs-sub">' + esc(r.sub) + '</span></span></button>';
      }).join('') + '</div>';
    });
    var ask = '<button type="button" class="jw-gs-item jw-gs-pilot jw-pmark-host" data-act="gs-pilot">' + pilotMark(20, true) +
      '<span class="jw-gs-body"><span class="jw-gs-name">' + esc(t('JOY Pilot に頼む：「{q}」', { q: q.trim() })) + '</span><span class="jw-gs-sub">' + esc(t('ページ操作・集計・データ更新まで')) + '</span></span></button>';
    drop.innerHTML = ask + (all.length
      ? html + '<button type="button" class="jw-gs-all" data-act="gs-all">' + ic('magnifier', 14) + esc(t('すべての結果を見る（{n}件）', { n: all.length })) + '</button>'
      : '<div class="jw-gs-none">' + t('該当する結果がありません') + '</div>');
    drop.hidden = false;
  }
  function closeGs() { var d = $('#gsDrop'); if (d) { d.hidden = true; d.innerHTML = ''; } S.gsHot = -1; }
  function gsItems() { return $$('#gsDrop .jw-gs-item, #gsDrop .jw-gs-all'); }
  function gsSetHot(i) {
    var items = gsItems();
    items.forEach(function (el) { el.removeAttribute('data-hot'); });
    if (!items.length) return;
    S.gsHot = (i + items.length) % items.length;
    items[S.gsHot].setAttribute('data-hot', '');
    items[S.gsHot].scrollIntoView({ block: 'nearest' });
  }
  function openResult(cat, page, title, link) {
    if (cat === 'menu' && page) { go(href(page)); return; }
    if (cat === 'link') { toast(t('外部リンク（モック）'), ic('arrow-right-up', 16)); return; }
    toast(t('{c}「{x}」は準備中です（モック）', { c: t(catOf(cat).label), x: title }));
  }

  function pageSearch() {
    var q = ROUTE.q || '';
    var all = gsCollect(q);
    var tabs = [{ id: 'all', label: 'すべて', icon: 'widget' }].concat(GS_CATS);
    var cur = S.searchTab;
    var list = cur === 'all' ? all : all.filter(function (r) { return r.cat === cur; });
    var side = '<div class="jw-panel jw-glass jw-vtabs-card"><div class="jw-vtabs" role="tablist" id="searchTabs" aria-label="' + esc(t('検索結果')) + '">' + tabs.map(function (c) {
      var n = c.id === 'all' ? all.length : all.filter(function (r) { return r.cat === c.id; }).length;
      return '<button type="button" class="jw-vtab" role="tab" aria-selected="' + (c.id === cur) + '" data-act="search-tab" data-v="' + c.id + '">' + ic(c.icon, 16) + '<span class="jw-vtab-name">' + esc(t(c.label)) + '</span><span class="jw-tab-n">' + n + '</span></button>';
    }).join('') + '</div></div>';
    var results = list.length ? '<div class="jw-rows">' + list.map(function (r) {
      var c = catOf(r.cat);
      var inner = (r.node ? nodeIcon(r.node, 18) : r.icon ? ic(r.icon, 18) : ic(c.icon, 18)) + '<span class="jw-gs-body"><span class="jw-result-cat">' + esc(t(c.label)) + '</span><span class="jw-result-title">' + esc(r.title) + '</span><span class="jw-result-sub">' + esc(r.sub) + '</span></span>';
      return r.cat === 'menu'
        ? '<a class="jw-rowi jw-result" href="' + href(r.page) + '">' + inner + '</a>'
        : '<button type="button" class="jw-rowi jw-result" data-act="gs-item" data-cat="' + r.cat + '" data-title="' + esc(r.title) + '" data-link="' + esc(r.link || '') + '">' + inner + '</button>';
    }).join('') + '</div>' : '<p class="jw-empty">' + ic('magnifier', 34) + t('該当する結果がありません') + '</p>';
    return pageHead({ crumbs: [{ label: t('ホーム'), href: '#/home', icon: ic('home-2', 13) }], title: t('検索結果'), icon: ic('magnifier', 20),
        desc: t('「{q}」の検索結果 {n} 件', { q: q || t('すべて'), n: list.length }) }) +
      '<div class="jw-search-page">' + side + panel({ body: results }) + '</div>';
  }

  // ── §お知らせ — chi tiết ──
  function pageAnnounce() {
    var list = ANNOUNCEMENTS.slice().sort(annOrder);
    var idx = -1;
    list.forEach(function (a, i) { if (a.id === ROUTE.id) idx = i; });
    if (idx < 0) return pageHome();
    var a = list[idx];
    var d = ANNOUNCE_DETAILS[a.id] || { dept: '', name: '', readers: 0, body: L('', ''), files: [] };
    if (isUnread(a)) { S.read[a.id] = true; saveRead(); }
    var prev = idx > 0 ? list[idx - 1] : null;
    var next = idx < list.length - 1 ? list[idx + 1] : null;
    var body = tr(d.body).replace('{{release}}', '<button type="button" class="jw-link" data-act="go" data-href="' + href('dev/リリースノート') + '">' + t('開発＞リリースノートで詳しく見る') + ic('alt-arrow-right', 14) + '</button>');
    var files = d.files.length ? '<div class="jw-files"><div class="jw-set-sec">' + esc(t('添付ファイル（{n}件）', { n: d.files.length })) + '</div>' + d.files.map(function (f) {
      return '<button type="button" class="jw-file" data-act="toast" data-msg="添付ファイル（モック）">' + ic('file-text', 18) + '<span class="jw-file-name">' + esc(f.name) + '</span><span class="jw-tag jw-tone-crit">' + f.ext + '</span><span class="jw-file-size">' + f.size + '</span></button>';
    }).join('') + '</div>' : '';
    function pager(x, dir) {
      if (!x) return '<button type="button" class="jw-pager-btn" disabled><span>' + (dir < 0 ? ic('alt-arrow-left', 14) + t('前へ') : t('次へ') + ic('alt-arrow-right', 14)) + '</span></button>';
      return '<a class="jw-pager-btn" href="#/announce/' + x.id + '" title="' + esc(tr(x.title)) + '"><span>' + (dir < 0 ? ic('alt-arrow-left', 14) + t('前へ') : t('次へ') + ic('alt-arrow-right', 14)) + '</span><span class="jw-pager-sub">' + esc(tr(x.title)) + '</span></a>';
    }
    return pageHead({ crumbs: [{ label: t('ホーム'), href: '#/home', icon: ic('home-2', 13) }, { label: t('お知らせ') }], title: t('お知らせ'), icon: ic('bell', 20),
        actions: '<button type="button" class="jw-btn jw-btn--ghost jw-btn--sm" data-act="back-announce">' + ic('alt-arrow-left', 15) + t('お知らせ一覧に戻る') + '</button>' }) +
      panel({ cls: 'jw-article', body:
        '<div class="jw-article-meta"><span class="jw-tag jw-tone-' + ANNOUNCE_TONE[a.cat] + '">' + esc(t(a.cat)) + '</span>' +
          (a.important ? '<span class="jw-badge jw-badge--crit">' + t('重要') + '</span>' : '') + '<span>' + fmtMD(a.date) + '</span></div>' +
        '<h2 class="jw-article-title">' + esc(tr(a.title)) + '</h2>' +
        '<div class="jw-article-author">' + ic('user-rounded', 14) + esc(t(d.dept)) + '｜' + esc(d.name) + ' ' + esc(t('（サンプル）')) + '</div>' +
        '<div class="jw-prose">' + body + '</div>' + files +
        '<div class="jw-article-author">' + ic('eye', 14) + tH('既読 {r}／{m}名（サンプル）', { r: cnt(d.readers), m: nf(ANNOUNCE_TOTAL_MEMBERS) }) + '</div>' +
        '<nav class="jw-pager" aria-label="' + esc(t('前後のお知らせ')) + '">' + pager(prev, -1) + pager(next, 1) + '</nav>' });
  }

  // ── §受注速報 (lịch sử) ──
  function pageDeals() {
    var tab = S.dealProd;
    var list = dealsSorted().filter(function (d) { return tab === 'すべて' || d.prod === tab; });
    var ym = HOME_TODAY.getFullYear() + '/' + pad(HOME_TODAY.getMonth() + 1) + '/';
    var month = list.filter(function (d) { return d.date.indexOf(ym) === 0; });
    function sum(label, l) {
      var total = 0, mrr = 0;
      l.forEach(function (d) { total += d.total; mrr += d.mrr; });
      return '<div class="jw-tile jw-pane"><div class="jw-sum-label">' + esc(label) + '</div><div class="jw-sum-vals">' +
        '<span class="jw-sum-item">' + t('件数') + '<b>' + cnt(l.length) + '</b></span>' +
        '<span class="jw-sum-item">' + t('総額') + '<b>' + cnt(total, 'yen') + '</b></span>' +
        '<span class="jw-sum-item">MRR<b>' + cnt(mrr, 'yen') + '</b></span></div></div>';
    }
    var tabs = '<div class="jw-tabs" role="tablist" id="dealTabs" data-keep data-fade-x>' + ['すべて'].concat(PRODUCTS.map(function (p) { return p.ja; })).map(function (k) {
      var p = PRODUCT_BY_JA[k];
      return '<button type="button" class="jw-tab" role="tab" aria-selected="' + (k === tab) + '" data-act="deal-tab" data-v="' + esc(k) + '" data-fk="deal-' + esc(k) + '">' + (p ? prodDot(p) + esc(tr(p)) : esc(t(k))) + '</button>';
    }).join('') + '</div>';
    return pageHead({ crumbs: [{ label: t('ホーム'), href: '#/home', icon: ic('home-2', 13) }], title: t('受注速報'), icon: ic('bill-check', 20),
        desc: t('新しい順・病院名／担当者／金額はサンプル'),
        actions: '<a class="jw-btn jw-btn--ghost jw-btn--sm" href="#/home">' + ic('alt-arrow-left', 15) + t('ホームに戻る') + '</a>' }) +
      '<div class="jw-stack">' +
        '<div class="jw-sumbox">' + sum(t('今月（{m}）', { m: fmtYM(HOME_TODAY.getFullYear(), HOME_TODAY.getMonth() + 1) }), month) + sum(t('全期間'), list) + '</div>' +
        panel({ cls: 'jw-deals', body: tabs + (list.length ? '<div class="jw-rows">' + list.map(dealRow).join('') + '</div>' : '<p class="jw-empty">' + t('該当する受注はありません') + '</p>') }) +
      '</div>';
  }

  // ── §やること › 予定 ──
  function pageTodo(p) {
    var tab = TODO_TABS[S.todoTab];
    var tabs = '<div class="jw-tabs" role="tablist" id="todoTabs" data-fade-x>' + TODO_TABS.map(function (x, i) {
      return '<button type="button" class="jw-tab" role="tab" aria-selected="' + (i === S.todoTab) + '" data-act="todo-tab" data-i="' + i + '">' + esc(t(x.label)) + '<span class="jw-tab-n">0</span></button>';
    }).join('') + '</div>';
    var meet = panel({ icon: ic('users-group-two-rounded', 18), title: t('面談'), body: tabs +
      '<p class="jw-empty">' + ic('calendar-minimalistic', 34) + esc(t(tab.empty)) + '</p>' +
      '<div class="jw-row-actions" style="justify-content:center;gap:1.4rem">' +
        '<button type="button" class="jw-link" data-act="toast" data-msg="アポ一覧（モック）">' + t('アポ一覧') + ic('arrow-right', 14) + '</button>' +
        '<button type="button" class="jw-link" data-act="toast" data-msg="ミーティング一覧（モック）">' + t('ミーティング一覧') + ic('arrow-right', 14) + '</button></div>' });
    function acc(a, i) {
      var open = !!S.acc[i];
      return '<section class="jw-panel jw-glass jw-acc jw-tone-' + a.tone + '"><button type="button" class="jw-acc-head" data-act="acc" data-i="' + i + '" aria-expanded="' + open + '">' +
        '<span class="jw-acc-icon">' + ic(a.icon, 16) + '</span><span>' + esc(t(a.title)) + '</span><span class="jw-acc-num">' + a.num + '</span>' + ic('alt-arrow-down', 16, 'jw-acc-caret') + '</button>' +
        (open ? '<div class="jw-acc-body"><p>' + esc(tr(a.body)) + '</p></div>' : '') + '</section>';
    }
    var left = [], right = [];
    TODO_ACTIONS.forEach(function (a, i) { (a.col === 'left' ? left : right).push(acc(a, i)); });
    return pageInfoHead(p, '<a class="jw-btn jw-btn--solid jw-btn--sm" href="' + href('todo/アクション') + '">' + ic('add-circle', 16) + t('アクションを登録') + '</a>') +
      '<div class="jw-stack">' + meet + '<div class="jw-grid2"><div class="jw-stack">' + left.join('') + '</div><div class="jw-stack">' + right.join('') + '</div></div></div>';
  }

  // ── §健康JOY ──
  function pageHealthRecord(p) {
    return pageInfoHead(p) + panel({ body:
      '<p class="jw-page-desc" style="margin:0">' + t('運動（歩く・走る・筋トレ・ヨガ・部活など）と生活習慣（早寝早起き・禁煙など）を分単位で記録します。歩数は分に換算します。記録の内容は本人だけが見られます。') + '</p>' +
      '<div class="jw-form">' +
        '<label class="jw-field">' + t('日付') + '<input class="jw-input" type="date" value="2026-09-27"></label>' +
        '<label class="jw-field">' + t('種類') + '<select class="jw-input">' + HEALTH_RECORD_TYPES.map(function (x) { return '<option>' + esc(t(x)) + '</option>'; }).join('') + '</select></label>' +
        '<label class="jw-field">' + t('時間（分）または歩数') + '<input class="jw-input" type="number" min="0" placeholder="' + esc(t('例：30')) + '"></label>' +
        '<label class="jw-field">' + t('メモ（任意）') + '<textarea class="jw-input" rows="3"></textarea></label>' +
        '<p class="jw-note">' + ic('info-circle', 13) + ' ' + t('※病歴や体調など健康状態は書かないでください') + '</p>' +
        '<div><button type="button" class="jw-btn jw-btn--solid" data-act="toast" data-msg="記録しました（モック）" data-icon="ok">' + ic('check-circle', 16) + t('記録する') + '</button></div>' +
      '</div>' + dsLine(p.key) });
  }
  function pageRanking(p) {
    var rows = (HEALTH_RANKING[S.rankCat] || []).filter(function (r) {
      return S.rankLoc === '全社' || (S.rankLoc === 'VN' ? r.site === 'VN' : r.site !== 'VN');
    });
    return pageInfoHead(p, '<a class="jw-btn jw-btn--ghost jw-btn--sm" href="' + setHref('プライバシー') + '">' + ic('settings-minimalistic', 15) + t('参加設定') + '</a>') +
      '<div class="jw-grid2">' +
        panel({ icon: ic('ranking', 18), title: t('今月のランキング'), body:
          '<div class="jw-row-actions" style="justify-content:flex-start">' + seg('rank-cat', catOpts(), S.rankCat, t('部門'), 'rankCat') +
          seg('rank-loc', HEALTH_LOCS.map(function (l) { return { v: l, label: t(l) }; }), S.rankLoc, t('拠点'), 'rankLoc') + '</div>' +
          (rows.length ? '<div class="jw-rows">' + rows.map(rankRow).join('') + '</div>' : '<p class="jw-empty">' + t('データがありません') + '</p>') + dsLine(p.key) }) +
        panel({ icon: ic('medal-ribbons-star', 18), title: t('過去の表彰'), body: '<div class="jw-rows">' + HEALTH_AWARDS.map(function (a) {
          return '<div class="jw-rowi">' + rankFace({ name: a.name, rank: 1 }) +
            '<span class="jw-gs-body" style="flex:1 1 auto"><span class="jw-rank-name">' + esc(t('{c}部門 優勝', { c: t(a.cat) })) + '</span><span class="jw-result-sub">' + esc(a.name) + '</span></span>' +
            '<span class="jw-tag jw-tone-gold">' + fmtYM(a.y, a.m) + '</span></div>';
        }).join('') + '</div>' }) +
      '</div>';
  }
  function pageClubs(p) {
    return pageInfoHead(p, '<button type="button" class="jw-btn jw-btn--solid jw-btn--sm" data-act="toast" data-msg="部活の作成は準備中です（モック）">' + ic('add-circle', 16) + t('部活を作る') + '</button>') +
      '<div class="jw-grid-auto">' + HEALTH_CLUBS.map(function (c) {
        return panel({ icon: ic(c.icon, 18), title: tr(c.name), body:
          '<div class="jw-kv">' + ic('calendar', 14) + esc(t('活動日：{d}', { d: tr(c.day) })) + '</div>' +
          '<div class="jw-kv">' + ic('users-group-rounded', 14) + tH('参加人数：{n}名', { n: cnt(c.members) }) + '</div>' +
          '<div><button type="button" class="jw-btn jw-btn--ghost jw-btn--sm" data-act="club-join" data-name="' + esc(tr(c.name)) + '">' + ic('user-plus', 15) + t('参加する') + '</button></div>' });
      }).join('') + '</div>' + '<div style="margin-top:1rem">' + dsLine(p.key) + '</div>';
  }
  function pageSupport(p) {
    return pageInfoHead(p) + panel({ body: '<div class="jw-rows">' + HEALTH_SUPPORT.map(function (s) {
      return '<div class="jw-rowi jw-support-row"><span class="jw-panel-ico">' + ic(s.icon, 17) + '</span><span class="jw-support-name">' + esc(tr(s.name)) + '</span>' +
        '<span class="jw-support-desc">' + esc(tr(s.desc)) + '</span>' +
        '<a class="jw-btn jw-btn--ghost jw-btn--sm" href="' + href('todo/申請/勤怠') + '">' + ic('clipboard-add', 15) + t('申請する') + '</a></div>';
    }).join('') + '</div>' + dsLine(p.key) });
  }

  // ── §リンク ──
  function linkBody() {
    var n = norm(S.linkFilter.trim());
    var rows = LINK_GROUPS.map(function (g) {
      var items = g.items.filter(function (it) { return !n || norm(sampleText(g.label) + ' ' + sampleText(it.label)).indexOf(n) >= 0; });
      if (!items.length) return '';
      return '<div class="jw-link-row"><div class="jw-link-label">' + esc(tr(g.label)) + '</div><div class="jw-link-btns">' + items.map(function (it) {
        var fav = S.favs.indexOf(it.key) >= 0;
        return '<span class="jw-linkbtn"><button type="button" class="jw-link-open" data-act="extlink" data-k="' + esc(it.key) + '">' + esc(tr(it.label)) + ic('arrow-right-up', 14) + '</button>' +
          '<button type="button" class="jw-fav" data-act="fav" data-k="' + esc(it.key) + '" aria-pressed="' + fav + '" aria-label="' + esc(fav ? t('お気に入りから外す') : t('お気に入りに追加')) + '" title="' + esc(fav ? t('お気に入りから外す') : t('お気に入りに追加')) + '">' + (fav ? ic('star@bold', 14) : ic('star', 14)) + '</button></span>';
      }).join('') + '</div></div>';
    }).join('');
    return rows ? panel({ body: rows }) : '<p class="jw-empty">' + t('該当なし') + '</p>';
  }
  function pageLinks(p) {
    return pageInfoHead(p) +
      '<label class="jw-sn-find jw-link-filter">' + ic('magnifier', 15) + '<input class="jw-sn-find-input" id="linkFilter" type="text" autocomplete="off" placeholder="' + esc(t('リンクを絞り込む')) + '" aria-label="' + esc(t('リンクを絞り込む')) + '" value="' + esc(S.linkFilter) + '"></label>' +
      '<div id="linkResults">' + linkBody() + '</div>';
  }

  // ── §Trang CHUẨN BỊ ──
  function pagePlaceholder(p) {
    var action = PLACEHOLDER_ACTIONS[p.key];
    return pageInfoHead(p) + panel({ cls: 'jw-ph', body:
      '<span class="jw-ph-ico">' + ic('ruler-cross-pen', 30) + '</span>' +
      '<div class="jw-ph-title">' + t('準備中のモック画面') + '</div>' +
      '<p class="jw-ph-desc">' + esc(PLACEHOLDER_DESC[p.key] ? t('この画面のデザインは準備中です。') : t('「{p}」の画面は現在デザイン準備中です。', { p: fullLabel(p) })) + '</p>' +
      (action ? '<a class="jw-btn jw-btn--solid" href="' + href(action.target) + '">' + ic(action.icon, 16) + esc(tr(action.label)) + '</a>' : '') +
      dsLine(p.key) });
  }

  // ── §設定 ──
  function sload(tab) { var o = loadJSON(KEY.settings + tab, {}); return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; }
  function sstore(tab, o) { save(KEY.settings + tab, o); }
  function sval(o, k, d) { return Object.prototype.hasOwnProperty.call(o, k) ? o[k] : d; }
  function sw(attr, on, label) { return '<label class="jw-switch"><input type="checkbox" ' + attr + (on ? ' checked' : '') + ' aria-label="' + esc(label) + '"><span></span></label>'; }
  function toggleRow(s, k, d, label, sub, extra) {
    return '<div class="jw-set-row"><span class="jw-set-label">' + esc(label) + (sub ? '<span class="jw-set-sub">' + esc(sub) + '</span>' : '') + '</span>' + (extra || '') + sw('data-sf="' + k + '"', !!sval(s, k, d), label) + '</div>';
  }
  function saveBar(tab, extra) {
    return '<div class="jw-row-actions" style="justify-content:flex-start"><button type="button" class="jw-btn jw-btn--solid" data-act="set-save" data-tab="' + esc(tab) + '">' + ic('diskette', 16) + t('保存する') + '</button>' + (extra || '') + '</div>';
  }
  function setBox(inner, id) { return '<section class="jw-panel jw-glass"' + (id ? ' id="' + id + '"' : '') + '>' + inner + '</section>'; }
  function tabAccount() {
    var s = sload('アカウント');
    function ro(label, v) { return '<label class="jw-field">' + esc(label) + '<input class="jw-input" type="text" value="' + esc(v) + '" readonly></label>'; }
    return setBox(
      '<div class="jw-profile"><span class="jw-profile-av">' + avatarSvg(HEALTH_AVATARS[SETTINGS_ME.name]) + '</span><div class="jw-stack" style="gap:.35rem">' +
        '<div><button type="button" class="jw-btn jw-btn--ghost jw-btn--sm" data-act="toast" data-msg="写真の変更（モック）">' + ic('camera', 15) + t('写真を変更') + '</button></div>' +
        '<span class="jw-note">' + t('イラストはサンプルです') + '</span></div></div>' +
      '<label class="jw-field">' + t('表示名') + '<input class="jw-input" type="text" data-sf="displayName" maxlength="40" value="' + esc(sval(s, 'displayName', SETTINGS_ME.name)) + '"></label>' +
      '<label class="jw-field">' + t('ひとこと（プロフィール）') + '<textarea class="jw-input" rows="3" data-sf="bio" maxlength="140" placeholder="' + esc(t('例：AI電話の導入支援を担当しています')) + '">' + esc(sval(s, 'bio', '')) + '</textarea></label>' +
      '<div><div class="jw-set-grid3">' + ro(t('所属事業部'), t(SETTINGS_ME.dept)) + ro(t('職種'), t(SETTINGS_ME.job)) + ro(t('拠点'), t(SETTINGS_ME.site)) + '</div>' +
        '<p class="jw-note" style="margin:.4rem 0 0">' + t('所属事業部・職種・拠点は名簿が正です（ここでは変更できません）。変更は人材戦略部へご連絡ください。') + '</p></div>' +
      '<label class="jw-field">' + t('メール') + '<input class="jw-input" type="email" data-sf="mail" value="' + esc(sval(s, 'mail', SETTINGS_ME.mail)) + '"></label>' +
      saveBar('アカウント')) +
    setBox('<div class="jw-row-actions" style="justify-content:space-between"><div><div class="jw-set-sec">' + t('ログアウト') + '</div><p class="jw-note" style="margin:0">' + t('この端末から JOY START をログアウトします。') + '</p></div>' +
      '<button type="button" class="jw-btn jw-btn--danger" data-act="logout">' + ic('logout-2', 16) + t('ログアウト') + '</button></div>');
  }
  function tabDisplay() {
    var sample = new Date(2026, 8, 24);
    var w = WD[LANG][sample.getDay()];
    var tz = load(KEY.tz, 'Asia/Tokyo') === 'Asia/Ho_Chi_Minh' ? 'Asia/Ho_Chi_Minh' : 'Asia/Tokyo';
    function group(title, control, note) {
      return '<div><div class="jw-set-sec">' + esc(title) + '</div>' + control + '<p class="jw-note" style="margin:.45rem 0 0">' + esc(note) + '</p></div>';
    }
    return setBox(
      group(t('言語'), seg('set-lang', [{ v: 'ja', label: '日本語' }, { v: 'vi', label: 'Tiếng Việt' }], LANG, t('言語'), 'setLang'), t('すべての画面が日本語／ベトナム語に切り替わります。サイドパネル下の歯車ボタンからも切り替えられます。')) +
      group(t('テーマ'), seg('set-theme', [{ v: 'light', label: t('ライト'), icon: ic('sun', 15) }, { v: 'dark', label: t('ダーク'), icon: ic('moon', 15) }], themeNow(), t('テーマ'), 'setTheme'), t('未設定の間はOSの設定（ライト／ダーク）に合わせます。')) +
      group(t('タイムゾーン'), seg('set-tz', [{ v: 'Asia/Tokyo', label: t('日本（JST, UTC+9）') }, { v: 'Asia/Ho_Chi_Minh', label: t('ベトナム（ICT, UTC+7）') }], tz, t('タイムゾーン'), 'setTz'), t('モックのため保存のみ（表示は変わりません）')) +
      group(t('日付の表記'), seg('set-datefmt', [{ v: 'md', label: (sample.getMonth() + 1) + '/' + sample.getDate() + '(' + w + ')' }, { v: 'dm', label: sample.getDate() + '/' + (sample.getMonth() + 1) + ' (' + w + ')' }], dateOrder(), t('日付の表記'), 'setDate'), t('ホーム・お知らせ・スケジュールなど、すべての日付の並びが変わります。'))
    );
  }
  function tabNotify() {
    var s = sload('通知');
    var scope = sval(s, 'k_announce_scope', 'important');
    return setBox(
      '<div><div class="jw-set-sec">' + t('通知の届け先') + '</div><div class="jw-row-actions" style="justify-content:flex-start;gap:.5rem 1.2rem">' + NOTIFY_CHANNELS.map(function (c) {
        return '<label class="jw-check"><input type="checkbox" data-sf="' + c.key + '"' + (sval(s, c.key, c.def) ? ' checked' : '') + '>' + esc(t(c.label)) + '</label>';
      }).join('') + '</div></div>' +
      '<div><div class="jw-set-sec">' + t('通知を受け取る種類') + '</div><div class="jw-set-list jw-pane">' + NOTIFY_KINDS.map(function (k) {
        var extra = k.scope ? '<select class="jw-input jw-input--sm" data-sf="k_announce_scope" aria-label="' + esc(t('お知らせの範囲')) + '"><option value="important"' + (scope === 'important' ? ' selected' : '') + '>' + t('重要のみ') + '</option><option value="all"' + (scope === 'all' ? ' selected' : '') + '>' + t('すべて') + '</option></select>' : '';
        return toggleRow(s, k.key, k.def, t(k.label), '', extra);
      }).join('') + '</div></div>' +
      '<div><div class="jw-set-sec">' + t('通知しない時間帯') + '</div><div class="jw-row-actions" style="justify-content:flex-start;gap:.6rem">' +
        '<label class="jw-check">' + t('開始') + ' <input class="jw-input jw-input--sm" type="time" data-sf="quiet_start" value="' + esc(sval(s, 'quiet_start', '22:00')) + '"></label><span class="jw-muted">〜</span>' +
        '<label class="jw-check">' + t('終了') + ' <input class="jw-input jw-input--sm" type="time" data-sf="quiet_end" value="' + esc(sval(s, 'quiet_end', '07:00')) + '"></label></div>' +
        '<p class="jw-note" style="margin:.45rem 0 0">' + t('この時間帯はスマホのプッシュとメールを送りません（Dr.JOY の通知一覧には残ります）') + '</p></div>' +
      saveBar('通知'));
  }
  function tabHome() {
    if (!S.homeDraft) S.homeDraft = homeCfg();
    var d = S.homeDraft;
    function rows(col) {
      return d[col].map(function (id, i) {
        var label = t(HOME_CARD_DEFS[id].label);
        return '<div class="jw-set-row"><span class="jw-panel-ico" style="width:30px;height:30px">' + ic(HOME_CARD_DEFS[id].icon, 16) + '</span><span class="jw-set-label">' + esc(label) + '</span>' +
          '<span class="jw-move"><button type="button" class="jw-iconbtn" data-act="home-move" data-k="' + id + '" data-dir="-1" data-fk="mv-' + id + '-up" aria-label="' + esc(t('{c}を上へ', { c: label })) + '"' + (i === 0 ? ' disabled' : '') + '>' + ic('alt-arrow-up', 16) + '</button>' +
          '<button type="button" class="jw-iconbtn" data-act="home-move" data-k="' + id + '" data-dir="1" data-fk="mv-' + id + '-down" aria-label="' + esc(t('{c}を下へ', { c: label })) + '"' + (i === d[col].length - 1 ? ' disabled' : '') + '>' + ic('alt-arrow-down', 16) + '</button></span>' +
          sw('data-home-show="' + id + '"', !d.hidden[id], t('{c}を表示', { c: label })) + '</div>';
      }).join('');
    }
    return setBox(
      '<div><div class="jw-set-sec">' + t('ホームに出すカード') + '</div><p class="jw-note" style="margin:0">' + t('トグルで表示・非表示、▲▼で並べ替えます。並べ替えはPC（2カラム）の各カラムの中の順番です。1カラム表示では決まった順で表示します。') + '</p></div>' +
      '<div class="jw-grid2" style="grid-template-columns:repeat(auto-fit,minmax(16rem,1fr))">' +
        '<div class="jw-set-list jw-pane"><div class="jw-set-colhead">' + t('左カラム') + '</div>' + rows('left') + '</div>' +
        '<div class="jw-set-list jw-pane"><div class="jw-set-colhead">' + t('右カラム') + '</div>' + rows('right') + '</div></div>' +
      '<div class="jw-row-actions" style="justify-content:flex-start"><button type="button" class="jw-btn jw-btn--solid" data-act="home-save">' + ic('diskette', 16) + t('保存する') + '</button>' +
        '<button type="button" class="jw-btn jw-btn--ghost" data-act="home-reset">' + ic('restart', 16) + t('初期設定に戻す') + '</button></div>');
  }
  function tabPrivacy() {
    var s = sload('プライバシー');
    return setBox('<div class="jw-set-list jw-pane">' +
      toggleRow(s, 'health_join', true, t('健康JOYのランキングに参加する'), t('参加しない場合も、自分の記録は自分だけが見られます')) +
      toggleRow(s, 'health_hide_name', false, t('ランキングで名前を非公開にする'), t('オンにすると「匿名」と表示します')) +
      toggleRow(s, 'photo_tag', true, t('みんなのフォトで自分の名前のタグ付けを許可する'), '') +
      toggleRow(s, 'newhire_photo', true, t('新入社員として紹介される際の写真掲載を許可する'), t('オフの場合はイラストで表示します')) +
      '</div>' + saveBar('プライバシー'));
  }
  function tabIntegration() {
    var s = sload('連携');
    return setBox('<div class="jw-set-list jw-pane">' + INTEGRATIONS.map(function (x) {
      var on = !!sval(s, x.key, x.def);
      return '<div class="jw-set-row"><span class="jw-panel-ico" style="width:30px;height:30px">' + ic(x.icon, 16) + '</span><span class="jw-set-label">' + esc(x.name) + '<span class="jw-set-sub">' + esc(tr(x.sub)) + '</span></span>' +
        '<span class="jw-tag ' + (on ? 'jw-tone-ok' : 'jw-tone-slate') + '">' + (on ? t('連携済み') : t('未連携')) + '</span>' +
        '<button type="button" class="jw-btn jw-btn--sm ' + (on ? 'jw-btn--danger' : 'jw-btn--ghost') + '" data-act="integ" data-k="' + x.key + '">' + (on ? ic('unlink', 15) + t('解除') : ic('link-round', 15) + t('連携する')) + '</button></div>';
    }).join('') + '</div><p class="jw-note" style="margin:0">' + t('モックのため、実際の連携・解除は行いません（状態だけ保存します）') + '</p>');
  }
  function tabSecurity() {
    var s = sload('セキュリティ');
    return setBox('<div class="jw-set-list jw-pane">' + toggleRow(s, 'twofa', true, t('2段階認証'), t('ログインのときに、スマホに届く確認コードも入力します')) + '</div>' + saveBar('セキュリティ')) +
      setBox('<div><div class="jw-set-sec">' + t('ログイン中の端末') + '</div><div class="jw-set-list jw-pane">' + SECURITY_DEVICES.map(function (dv, i) {
        return '<div class="jw-set-row"><span class="jw-panel-ico" style="width:30px;height:30px">' + ic(dv.icon, 16) + '</span><span class="jw-set-label">' + esc(tr(dv.name)) + '<span class="jw-set-sub">' + esc(tr(dv.place)) + '｜' + esc(tr(dv.last)) + '</span></span>' +
          (dv.current ? '<span class="jw-tag jw-tone-ok">' + t('この端末') + '</span>' : '<button type="button" class="jw-btn jw-btn--sm jw-btn--danger" data-act="sec-logout" data-i="' + i + '">' + ic('logout-2', 15) + t('ログアウト') + '</button>') + '</div>';
      }).join('') + '</div><p class="jw-note" style="margin:.45rem 0 0">' + t('端末・場所はサンプルです') + '</p></div>' +
      '<div><div class="jw-set-sec">' + t('最近のログイン履歴') + '</div><div class="jw-table-wrap"><table class="jw-table"><thead><tr><th>' + t('日時') + '</th><th>' + t('場所') + '</th><th>' + t('端末') + '</th></tr></thead><tbody>' +
        SECURITY_HISTORY.map(function (h) { return '<tr><td class="jw-num">' + h.at + '</td><td>' + esc(tr(h.place)) + '</td><td>' + esc(tr(h.device)) + '</td></tr>'; }).join('') + '</tbody></table></div></div>');
  }
  function tabPermission() {
    var cls = { '○': 'jw-mark-o', '△': 'jw-mark-t', '×': 'jw-mark-x' };
    return setBox('<div class="jw-row-actions" style="justify-content:flex-start"><span class="jw-badge jw-badge--crit">' + t('管理者のみ') + '</span><span class="jw-note">' + t('この画面は管理者だけが見られます。役職ごとの閲覧範囲（モック）です。') + '</span></div>' +
      '<div class="jw-table-wrap"><table class="jw-table"><thead><tr><th>' + t('役職') + '</th>' + PERMISSION_COLS.map(function (c) { return '<th class="jw-c">' + esc(t(c)) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        PERMISSION_ROWS.map(function (r) { return '<tr><td>' + esc(t(r.role)) + '</td>' + r.marks.map(function (m) { return '<td class="jw-mark ' + cls[m] + '">' + m + '</td>'; }).join('') + '</tr>'; }).join('') +
      '</tbody></table></div><p class="jw-note" style="margin:0">' + t('○＝全社の数字を見られる／△＝自部署の分だけ見られる／×＝見られない') + '</p>');
  }
  function tabDataSource() {
    return setBox('<div class="jw-callout">' + ic('info-circle', 16) + '<span>' + t('データの正（原本）は1つ。JOY STARTは原本を参照して表示する運用です。') + '</span></div>' +
      '<div class="jw-row-actions" style="justify-content:space-between"><span class="jw-note">' + t('※管理者向けの一覧です。') + '</span>' +
        '<a class="jw-ds-folder" href="' + DS_ROOT_URL + '" target="_blank" rel="noopener">' + ic('folder-2', 15) + t('JOY STARTフォルダ（ルート）') + ic('arrow-right-up', 13) + '</a></div>' +
      '<div class="jw-table-wrap"><table class="jw-table" style="min-width:52rem"><thead><tr><th>' + t('メニュー') + '</th><th>' + t('データの正（システム名）') + '</th><th>' + t('JOY STARTフォルダ（Google Drive）') + '</th><th>' + t('更新担当（部署）') + '</th><th>' + t('更新頻度') + '</th><th>' + t('状態') + '</th></tr></thead><tbody>' +
        DS_ROWS.map(function (r) {
          var folder = r.folderUrl
            ? '<a class="jw-ds-folder" href="' + r.folderUrl + '" target="_blank" rel="noopener">' + ic('folder-2', 14) + esc(r.folderName) + '</a>'
            : (r.folderName === '—' ? '<span class="jw-muted">—</span>' : '<button type="button" class="jw-ds-folder" data-missing data-act="ds-folder" data-folder="' + esc(r.folderName) + '">' + ic('folder-2', 14) + esc(r.folderName) + '</button>');
          return '<tr id="' + r.id + '"><td>' + esc(tr(r.menu)) + '</td><td>' + esc(tr(r.source)) + '</td><td>' + folder + '</td><td>' + esc(t(r.owner)) + '</td><td>' + esc(tr(r.freq)) + '</td>' +
            '<td><span class="jw-tag ' + (r.ok ? 'jw-tone-ok' : 'jw-tone-slate') + '">' + (r.ok ? t('設定済み') : t('未設定')) + '</span></td></tr>';
        }).join('') + '</tbody></table></div>' +
      (S.missingFolder ? '<p class="jw-note" style="margin:0">' + esc(t('「{f}」のフォルダURLは未設定です。', { f: S.missingFolder })) + '</p>' : ''));
  }
  var SETTINGS_BODY = {
    'アカウント': tabAccount, '表示': tabDisplay, '通知': tabNotify, 'ホーム': tabHome, 'プライバシー': tabPrivacy,
    '連携': tabIntegration, 'セキュリティ': tabSecurity, '権限': tabPermission, 'データソース': tabDataSource
  };
  function pageSettings() {
    var tab = ROUTE.tab;
    var tabs = '<div class="jw-tabs" role="tablist" id="setTabs" data-keep data-fade-x aria-label="' + esc(t('設定')) + '">' + SETTINGS_TABS.map(function (x) {
      return '<a class="jw-tab" role="tab" aria-selected="' + (x.id === tab) + '" href="' + setHref(x.id) + '">' + esc(t(x.id)) + '</a>';
    }).join('') + '</div>';
    return pageHead({ crumbs: [{ label: t('ホーム'), href: '#/home', icon: ic('home-2', 13) }], title: t('設定'), icon: ic('settings', 20) }) +
      '<div class="jw-stack">' + setBox(tabs) + '<div class="jw-stack" id="setBody">' + SETTINGS_BODY[tab]() + '</div></div>';
  }
  function flashDsRow(id) {
    var row = document.getElementById(id);
    if (!row) return;
    row.setAttribute('data-flash', '');
    row.scrollIntoView({ block: 'center' });
    setTimeout(function () { row.removeAttribute('data-flash'); }, 2200);
  }

  // ── §Lớp nổi: toast · tooltip · hộp thoại · đăng xuất ──
  function toast(msg, icon) {
    var box = $('#toasts');
    var el = document.createElement('div');
    el.className = 'jw-toast jw-glass';
    el.innerHTML = (icon || ic('info-circle', 16)) + '<span class="jw-toast-text">' + esc(msg) + '</span>';
    box.appendChild(el);
    while (box.children.length > 3) box.removeChild(box.firstChild);
    setTimeout(function () {
      el.classList.add('jw-toast--out');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 200);
    }, 2600);
  }
  var tipEl = null;
  var tipFor = null;
  function hideTip() { if (tipEl) tipEl.removeAttribute('data-show'); tipFor = null; }
  function showTip(el, text) {
    tipEl = tipEl || $('#tipbox');
    tipFor = el;
    tipEl.textContent = text != null ? text : el.getAttribute('data-tip');
    tipEl.style.left = '0px';
    tipEl.style.top = '0px';
    var r = el.getBoundingClientRect();
    var w = tipEl.offsetWidth, h = tipEl.offsetHeight;
    var gap = 8, left, top;
    if (el.getAttribute('data-tip-pos') === 'bottom') {
      left = r.left + r.width / 2 - w / 2;
      top = r.bottom + gap;
    } else {
      left = r.right + gap;
      top = r.top + r.height / 2 - h / 2;
      if (left + w > window.innerWidth - 6) left = r.left - gap - w;
    }
    left = Math.max(6, Math.min(left, window.innerWidth - w - 6));
    top = Math.max(6, Math.min(top, window.innerHeight - h - 6));
    tipEl.style.left = Math.round(left) + 'px';
    tipEl.style.top = Math.round(top) + 'px';
    tipEl.setAttribute('data-show', '');
  }
  function openModal(inner, cls) {
    closeFloating();
    document.documentElement.setAttribute('data-modal-open', '');
    var m = document.createElement('div');
    m.className = 'jw-modal';
    m.id = 'modal';
    m.setAttribute('role', 'dialog');
    m.setAttribute('aria-modal', 'true');
    m.innerHTML = '<div class="jw-modal-scrim" data-act="dialog-close"></div><div class="jw-dialog jw-glass' + (cls ? ' ' + cls : '') + '">' + inner + '</div>';
    document.body.appendChild(m);
    var f = m.querySelector('[data-autofocus]') || m.querySelector('button');
    if (f) f.focus();
  }
  function closeModal() {
    var m = $('#modal');
    if (!m) return false;
    m.remove();
    document.documentElement.removeAttribute('data-modal-open');
    return true;
  }
  function openLightbox(p) {
    var cap = tr(p.caption);
    openModal('<button type="button" class="jw-iconbtn jw-dialog-x" data-act="dialog-close" aria-label="' + esc(t('閉じる')) + '" data-autofocus>' + ic('close', 18) + '</button>' +
      '<div class="jw-lightbox-media">' + photoMedia(p) + '</div>' +
      '<div class="jw-lightbox-cap">' + esc(cap) + (p.src ? '' : ' <span class="jw-muted">' + esc(t('（サンプル）')) + '</span>') + '</div>' +
      '<div class="jw-lightbox-meta">' + ic('calendar-minimalistic', 13) + fmtMD(p.date) + '｜' + ic('user-rounded', 13) + esc(p.user) + '｜' + ic('heart', 13) + p.likes + '</div>');
  }
  function confirmLogout() {
    openModal('<div class="jw-dialog-head"><span class="jw-dialog-icon jw-dialog-icon--danger">' + ic('logout-2', 18) + '</span><h2 class="jw-dialog-title">' + t('ログアウト') + '</h2></div>' +
      '<p class="jw-dialog-body">' + t('JOY START からログアウトしますか？') + '</p>' +
      '<div class="jw-dialog-actions"><button type="button" class="jw-btn jw-btn--ghost" data-act="dialog-close" data-autofocus>' + t('キャンセル') + '</button>' +
      '<button type="button" class="jw-btn jw-btn--crit" data-act="logout-do">' + ic('logout-2', 16) + t('ログアウト') + '</button></div>', 'jw-dialog--confirm');
  }
  function showLoggedOut() {
    closeModal();
    var ov = document.createElement('div');
    ov.className = 'jw-logout';
    ov.id = 'loggedOut';
    ov.innerHTML = '<div class="jw-ambient" aria-hidden="true"></div><div class="jw-logout-card jw-glass" role="dialog" aria-modal="true" aria-labelledby="loTitle">' + brandLockup() +
      '<div class="jw-logout-title" id="loTitle">' + t('ログアウトしました') + '</div>' +
      '<div class="jw-logout-sub">' + t('JOY START をご利用いただきありがとうございました（モック）') + '</div>' +
      '<button type="button" class="jw-btn jw-btn--solid" data-act="relogin">' + ic('login-2', 16) + t('もう一度ログイン') + '</button></div>';
    document.body.appendChild(ov);
    var b = ov.querySelector('button');
    if (b) b.focus();
  }

  // ── §Mờ mép dải cuộn (tabs ngang · thân cây) ──
  function syncFade(el) {
    if (el.hasAttribute('data-fade-x')) {
      var mx = el.scrollWidth - el.clientWidth;
      el.toggleAttribute('data-fade-l', el.scrollLeft > 2);
      el.toggleAttribute('data-fade-r', mx - el.scrollLeft > 2);
    }
    if (el.hasAttribute('data-fade-y')) {
      var my = el.scrollHeight - el.clientHeight;
      el.toggleAttribute('data-fade-t', el.scrollTop > 2);
      el.toggleAttribute('data-fade-b', my - el.scrollTop > 2);
    }
  }
  function syncFades(root) {
    $$('[data-fade-x], [data-fade-y]', root).forEach(syncFade);
    if (root.hasAttribute && (root.hasAttribute('data-fade-x') || root.hasAttribute('data-fade-y'))) syncFade(root);
  }
  document.addEventListener('scroll', function (e) {
    var el = e.target;
    if (el && el.hasAttribute && (el.hasAttribute('data-fade-x') || el.hasAttribute('data-fade-y'))) syncFade(el);
    if (tipFor) hideTip();
  }, true);
  var wasNarrow = narrow();
  window.addEventListener('resize', function () {
    if (narrow() !== wasNarrow) { wasNarrow = narrow(); S.drawer = false; closeMenu(); renderSide(); }
    if (S.menuOpen) placeMenu();
    hideTip();
    syncFades(document);
    inkPlace(document);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { inkPlace(document); });

  // ── §Vẽ lại toàn bộ (đổi ngôn ngữ / theme) ──
  function refreshChrome() {
    document.documentElement.lang = LANG;
    renderSide();
    renderPage(false);
    if (PILOT.open) renderPilot();
    renderPilotBtn();
    if (S.inboxOpen) { var ip = $('#inboxPanel'); if (ip) ip.innerHTML = inboxHtml(); }
    if (S.menuOpen) {
      var panel = $('#menuPanel');
      if (panel) {
        panel.innerHTML = menuHtml();
        placeMenu();
      }
      var btn = $('#setBtn');
      if (btn) btn.setAttribute('aria-expanded', 'true');
    }
  }
  function setLang(v) {
    LANG = v === 'vi' ? 'vi' : 'ja';
    save(KEY.lang, LANG);
    refreshChrome();
    toast(LANG === 'vi' ? 'Đã chuyển sang Tiếng Việt' : '日本語に切り替えました', ic('global', 16));
  }
  function setTheme(v) {
    function apply() {
      save(KEY.theme, v === 'dark' ? 'dark' : 'light');
      applyTheme();
      refreshChrome();
    }
    // Hoà mờ CHẬM cả trang (~1s) thay cho đổi màu tức thì — mượt như slow motion
    if (document.startViewTransition && !REDUCED) document.startViewTransition(apply);
    else apply();
  }

  // ── §Sự kiện: click ──
  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-act]') : null;
    // Bấm ra ngoài: đóng dropdown tìm · menu phím gửi của JOY Pilot
    if (!e.target.closest('#gsearch')) closeGs();
    if (PILOT.keyMenu && !e.target.closest('#pilotKeys, #pilotKeyBtn')) pilotKeyMenuClose(false);
    if (!el) return;
    if (el.classList.contains('jw-seg-opt')) {
      if (el.getAttribute('aria-checked') === 'true') return;
      if (SEG_LEAD_ACTS[el.getAttribute('data-act')] && !REDUCED) {
        segMoveTo(el);
        setTimeout(function () { runAct(e, el); }, SEG_LEAD_MS);
        return;
      }
    }
    runAct(e, el);
  });
  var SEG_LEAD_ACTS = { lang: 1, theme: 1, 'set-lang': 1, 'set-theme': 1 };
  var SEG_LEAD_MS = 360;
  function segMoveTo(opt) {
    var sg = opt.parentNode;
    var opts = $$('.jw-seg-opt', sg);
    sg.style.setProperty('--seg-i', opts.indexOf(opt));
    opts.forEach(function (o) { var on = o === opt; o.classList.toggle('jw-seg-opt--on', on); o.setAttribute('aria-checked', String(on)); });
  }
  function runAct(e, el) {
    var act = el.getAttribute('data-act');
    var v = el.getAttribute('data-v');
    var k = el.getAttribute('data-k');
    switch (act) {
      case 'pilot': if (PILOT.open) closePilot(); else openPilot(); break;
      case 'pilot-close': closePilot(); break;
      case 'pilot-full': PILOT.full = !PILOT.full; pilotSync(); renderPilot(); break;
      case 'pilot-new': pilotClear(); break;
      case 'pilot-stop': pilotStop(); break;
      case 'pilot-keys': if (PILOT.keyMenu) pilotKeyMenuClose(true); else pilotKeyMenuOpen(); break;
      case 'pilot-key': pilotPickKey(v); break;
      case 'pilot-poke': pilotPoke(el); break;
      case 'pilot-tab': PILOT.tab = v; renderPilot(); break;
      case 'pilot-ask': openPilot(el.getAttribute('data-q')); break;
      case 'pilot-send': { var pi = $('#pilotInput'); if (pi) pilotSend(pi.value); break; }
      case 'pilot-plan': pilotPlanAct(el.getAttribute('data-id'), v); break;
      case 'pilot-advance': pilotAdvance(el.getAttribute('data-id')); break;
      case 'pilot-csv': pilotCsv(v); break;
      case 'pilot-perm': toast(t('権限リクエストを送りました（モック）'), ic('key-square', 16)); break;
      case 'gs-pilot': { var gq = $('#gsInput'); var qv = gq ? gq.value : ''; closeGs(); if (gq) gq.value = ''; openPilot(qv); break; }
      case 'setpop': if (S.menuOpen) closeMenu(); else openMenu(); break;
      case 'setgo': e.preventDefault(); closeMenu(); S.drawer = false; go(el.getAttribute('href')); break;
      case 'menu-close': closeMenu(); break;
      case 'lang': setLang(v); break;
      case 'theme': setTheme(v); break;
      case 'logout': confirmLogout(); break;
      case 'logout-do': showLoggedOut(); break;
      case 'relogin': { var lo = $('#loggedOut'); if (lo) lo.remove(); go('#/home'); break; }
      case 'dialog-close': closeModal(); break;
      case 'toast': toast(t(el.getAttribute('data-msg')), el.getAttribute('data-icon') === 'ok' ? ic('check-circle', 16) : null); break;
      case 'go': go(el.getAttribute('data-href')); break;

      case 'block': {
        // Dải icon: bấm một khối ⇒ bung panel ra (≤640px: mở ngăn kéo) với khối đó mở sẵn
        hideTip();
        closeMenu();
        if (railNow()) {
          if (narrow()) S.drawer = true; else { S.rail = false; save(KEY.rail, '0'); }
          S.open[k] = true;
        } else if (S.open[k]) {
          // Đóng: thu lại TRƯỚC (trên DOM đang có) rồi mới vẽ lại
          if (el.hasAttribute('data-closing')) break;
          el.setAttribute('data-closing', '');
          var cp = blockParts(k);
          accClose(cp.body, cp.body ? treeItems(cp.body) : [], cp.caret, function () { delete S.open[k]; saveOpen(); renderSide(); });
          break;
        } else S.open[k] = true;
        saveOpen();
        renderSide();
        animateBlockOpen(k);
        setTimeout(function () {
          var bk = blockParts(k).blk;
          if (bk && S.open[k]) bk.scrollIntoView({ block: 'nearest', behavior: REDUCED ? 'auto' : 'smooth' });
        }, REDUCED ? 0 : 460);
        break;
      }
      case 'rail': {
        if (narrow()) S.drawer = !S.drawer;
        else { S.rail = !S.rail; save(KEY.rail, S.rail ? '1' : '0'); }
        hideTip();
        closeMenu();
        renderSide();
        break;
      }
      case 'drawer-close': S.drawer = false; renderSide(); break;
      case 'expand-all': {
        var fresh = [];
        MENU.forEach(function (b) { if (b.children && !S.open[b.key]) { S.open[b.key] = true; fresh.push(b.key); } });
        S.sideQuery = '';
        saveOpen();
        renderSide();
        fresh.forEach(function (bk, i) { animateBlockOpen(bk, Math.min(i, 8) * 45); });
        break;
      }
      case 'collapse-all': {
        var shut = Object.keys(S.open), left = shut.length;
        function allShut() { S.open = {}; S.sideQuery = ''; saveOpen(); renderSide(); var sc0 = $('#sideScroll'); if (sc0) sc0.scrollTop = 0; }
        if (!left) { allShut(); break; }
        shut.forEach(function (bk) {
          var cp = blockParts(bk);
          accClose(cp.body, cp.body ? treeItems(cp.body) : [], cp.caret, function () { if (--left === 0) allShut(); });
        });
        break;
      }
      case 'side-find-x': S.sideQuery = ''; renderSide(); { var f = $('#sideFind'); if (f) f.focus(); } break;
      case 'fav': {
        e.preventDefault();
        var added = toggleFav(k);
        renderSide();
        if (ROUTE.name === 'page') {
          if (ROUTE.key === 'link') { var lr = $('#linkResults'); if (lr) lr.innerHTML = linkBody(); }
          else renderPage(false);
        }
        toast(added ? t('お気に入りに追加しました') : t('お気に入りから外しました'), ic('star', 16));
        break;
      }
      case 'extlink': toast(t('外部リンク（モック）'), ic('arrow-right-up', 16)); break;

      case 'gs-item': openResult(el.getAttribute('data-cat'), el.getAttribute('data-page'), el.getAttribute('data-title'), el.getAttribute('data-link')); closeGs(); break;
      case 'gs-clear': { var gi = $('#gsInput'); if (gi) { gi.value = ''; gi.focus(); } el.hidden = true; closeGs(); break; }
      case 'gs-all': { var inp = $('#gsInput'); S.searchTab = 'all'; go('#/search?q=' + encodeURIComponent(inp ? inp.value.trim() : '')); break; }
      case 'search-tab': S.searchTab = v; renderPage(false); break;
      case 'inbox': if (S.inboxOpen) closeInbox(); else openInbox(); break;
      case 'inbox-close': closeInbox(); break;
      case 'inbox-tab': {
        S.inboxTab = v;
        var ipn = $('#inboxPanel');
        if (ipn) { ipn.innerHTML = inboxHtml(); var ib2 = $('#inboxBody'); if (ib2) ib2.classList.add('jw-inbox-body--in'); }
        break;
      }
      case 'ann-tab': S.announceTab = v; renderPage(false); break;
      case 'ann-readall':
        ANNOUNCEMENTS.forEach(function (a) { if (a.unread) S.read[a.id] = true; });
        saveRead();
        renderPage(false);
        toast(t('すべて既読にしました（モック）'), ic('check-read', 16));
        break;
      case 'back-announce': S.pendingScroll = 'card-announce'; go('#/home'); break;
      case 'sched-past': {
        var card = $('#card-schedule');
        var before = card ? $$('.jw-rowi', card).map(function (r) { return r.textContent; }) : [];
        S.schedPast = !S.schedPast;
        renderPage(false);
        if (S.schedPast) revealNew(before, $('#card-schedule'));
        break;
      }
      case 'health-cat': S.healthCat = v; renderPage(false); break;
      case 'to-ranking': S.rankCat = S.healthCat; break;
      case 'photo': openLightbox(S.photos[+el.getAttribute('data-i')]); break;
      case 'photo-post': { var fi = $('#photoInput'); if (fi) fi.click(); break; }

      case 'todo-tab': S.todoTab = +el.getAttribute('data-i'); renderPage(false); break;
      case 'acc': {
        var i = +el.getAttribute('data-i');
        if (S.acc[i]) {
          if (el.hasAttribute('data-closing')) break;
          el.setAttribute('data-closing', '');
          var ob = el.parentNode.querySelector('.jw-acc-body');
          accClose(ob, ob ? $$('.jw-acc-body > *', el.parentNode) : [], el.querySelector('.jw-acc-caret'), function () { S.acc[i] = false; renderPage(false); });
          break;
        }
        S.acc[i] = true;
        renderPage(false);
        var nh = $('#main .jw-acc-head[data-i="' + i + '"]');
        var nb = nh && nh.parentNode.querySelector('.jw-acc-body');
        if (nb) accOpen(nb, $$('.jw-acc-body > *', nh.parentNode), nh.querySelector('.jw-acc-caret'));
        break;
      }
      case 'rank-cat': S.rankCat = v; renderPage(false); break;
      case 'rank-loc': S.rankLoc = v; renderPage(false); break;
      case 'club-join': toast(t('{c}に参加しました（モック）', { c: el.getAttribute('data-name') }), ic('check-circle', 16)); break;
      case 'deal-tab': S.dealProd = v; renderPage(false); break;
      case 'ds-line': go(setHref('データソース', el.getAttribute('data-row'))); break;
      case 'ds-folder': S.missingFolder = el.getAttribute('data-folder'); renderPage(false); break;

      case 'set-lang': setLang(v); break;
      case 'set-theme': setTheme(v); break;
      case 'set-tz': save(KEY.tz, v); renderPage(false); toast(t('タイムゾーンを保存しました（モック）'), ic('check-circle', 16)); break;
      case 'set-datefmt': save(KEY.datefmt, v); renderPage(false); toast(t('日付の表記を保存しました'), ic('check-circle', 16)); break;
      case 'set-save': {
        var tab = el.getAttribute('data-tab');
        var o = sload(tab);
        $$('#setBody [data-sf]').forEach(function (inp2) { o[inp2.getAttribute('data-sf')] = inp2.type === 'checkbox' ? inp2.checked : inp2.value; });
        sstore(tab, o);
        toast(t('保存しました（モック）'), ic('check-circle', 16));
        break;
      }
      case 'home-move': {
        var d = S.homeDraft;
        var list = d[HOME_CARD_DEFS[k].col];
        var a = list.indexOf(k), b = a + (+el.getAttribute('data-dir'));
        if (a < 0 || b < 0 || b >= list.length) break;
        list[a] = list[b]; list[b] = k;
        renderPage(false);
        break;
      }
      case 'home-save':
        save(KEY.cards, { left: S.homeDraft.left, right: S.homeDraft.right, hidden: S.homeDraft.hidden });
        toast(t('保存しました（モック）'), ic('check-circle', 16));
        break;
      case 'home-reset':
        drop(KEY.cards);
        S.homeDraft = null;
        renderPage(false);
        toast(t('初期設定に戻しました（モック）'), ic('restart', 16));
        break;
      case 'integ': {
        var x = INTEGRATIONS.filter(function (i2) { return i2.key === k; })[0];
        var s = sload('連携');
        var on = !sval(s, k, x.def);
        s[k] = on;
        sstore('連携', s);
        renderPage(false);
        toast(on ? t('{x} と連携しました（モック）', { x: x.name }) : t('{x} の連携を解除しました（モック）', { x: x.name }), on ? ic('link-round', 16) : ic('unlink', 16));
        break;
      }
      case 'sec-logout': {
        var dv = SECURITY_DEVICES[+el.getAttribute('data-i')];
        el.disabled = true;
        el.innerHTML = ic('check-circle', 15) + t('ログアウト済み');
        toast(t('{x} をログアウトしました（モック）', { x: tr(dv.name) }), ic('logout-2', 16));
        break;
      }
    }
  }

  // ── §Sự kiện: nhập liệu ──
  var composing = false;
  document.addEventListener('compositionstart', function () { composing = true; });
  document.addEventListener('compositionend', function (e) { composing = false; onInput(e.target); });
  document.addEventListener('input', function (e) { if (!composing) onInput(e.target); });
  function onInput(el) {
    if (!el || !el.id) return;
    if (el.id === 'sideFind') { S.sideQuery = el.value; refreshSideBody(); }
    else if (el.id === 'gsInput') { renderGsDrop(el.value); var cl = $('#gsClear'); if (cl) cl.hidden = !el.value; }
    else if (el.id === 'pilotInput') { pilotGrow(el); pilotOnType(); }
    else if (el.id === 'linkFilter') { S.linkFilter = el.value; var lr = $('#linkResults'); if (lr) lr.innerHTML = linkBody(); }
  }
  document.addEventListener('change', function (e) {
    var el = e.target;
    if (el.id === 'photoInput') {
      var file = el.files && el.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        var now = HOME_TODAY;
        S.photos.unshift({ src: reader.result, caption: L('新しい写真', 'Ảnh mới'), date: now.getFullYear() + '/' + pad(now.getMonth() + 1) + '/' + pad(now.getDate()), user: SETTINGS_ME.name, likes: 0 });
        renderPage(false);
        toast(t('写真を投稿しました（モック・保存はされません）'), ic('gallery-add', 16));
      };
      reader.readAsDataURL(file);
      el.value = '';
      return;
    }
    var show = el.getAttribute && el.getAttribute('data-home-show');
    if (show && S.homeDraft) {
      if (el.checked) delete S.homeDraft.hidden[show]; else S.homeDraft.hidden[show] = true;
    }
  });

  // ── §Sự kiện: bàn phím ──
  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    var typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
    // ⌘J / Ctrl+J: mở–đóng JOY Pilot từ bất cứ đâu (kể cả đang gõ trong ô khác)
    if ((e.metaKey || e.ctrlKey) && !e.altKey && (e.key === 'j' || e.key === 'J')) {
      e.preventDefault();
      if (PILOT.open) closePilot(); else openPilot();
      return;
    }
    if (e.target.id === 'pilotInput' && e.key === 'Enter') {
      if (!composing && shouldSend(PILOT.sendKey, e)) { e.preventDefault(); pilotSend(e.target.value); }
      // chế độ enter: Ctrl/⌘+Enter bị bỏ qua (không gửi, không xuống dòng) — đỡ gửi nhầm
      else if (PILOT.sendKey === 'enter' && (e.ctrlKey || e.metaKey)) e.preventDefault();
      return;
    }
    if (e.key === 'Escape' && PILOT.keyMenu) { pilotKeyMenuClose(true); return; }
    if (e.key === 'Escape') {
      if (closeModal()) return;
      if (S.menuOpen) { closeMenu(); var mb = $('#setBtn'); if (mb) mb.focus(); return; }
      if (S.inboxOpen) { closeInbox(); var ib = $('#inboxBtn'); if (ib) ib.focus(); return; }
      if (PILOT.open && (e.target.closest && e.target.closest('#pilot') || !typing)) { closePilot(); return; }
      if (e.target.id === 'gsInput') { closeGs(); e.target.blur(); return; }
      if (e.target.id === 'sideFind') { S.sideQuery = ''; renderSide(); return; }
      if (S.drawer) { S.drawer = false; renderSide(); return; }
      return;
    }
    if (e.target.id === 'gsInput') {
      if (e.key === 'ArrowDown') { e.preventDefault(); gsSetHot(S.gsHot + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); gsSetHot(S.gsHot - 1); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        var items = gsItems();
        if (S.gsHot >= 0 && items[S.gsHot]) items[S.gsHot].click();
        else if (e.target.value.trim()) { S.searchTab = 'all'; go('#/search?q=' + encodeURIComponent(e.target.value.trim())); }
      }
      return;
    }
    if (e.target.id === 'sideFind' && e.key === 'Enter' && !composing) {
      var hot = $('#side .jw-sn-hit[data-hot]');
      if (hot) { e.preventDefault(); go(hot.getAttribute('href')); }
      return;
    }
    if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey) {
      var gs = $('#gsInput');
      if (gs) { e.preventDefault(); gs.focus(); return; }
      var sf = $('#sideFind');
      if (sf) { e.preventDefault(); sf.focus(); }
    }
  });

  // ── §Đèn theo con trỏ (Reveal kiểu Windows) ──
  // Mỗi khung hình: mọi phần tử (trong cùng vùng với con trỏ) cách chuột ≤ RV_R px được bật
  // `data-rv` + toạ độ chuột TÍNH TRONG nó (--mx/--my) ⇒ CSS vẽ viền sáng dần theo khoảng cách.
  // Chỉ chuột (không chạm), và một lượt đọc hết rồi mới ghi (tránh layout thrash).
  // Nút CHỈ có icon (sao, ×, mở/đóng tất cả, bánh răng…) KHÔNG nằm trong danh sách: chỉ đổi màu icon.
  var RV_SEL = '.jw-sn-top, .jw-tree-row, .jw-tree-leaf, .jw-sn-fav, .jw-sn-hit, .jw-sn-me, a.jw-rowi, button.jw-rowi, ' +
    '.jw-panel:not(.jw-panel--flat), .jw-pane, .jw-photo-thumb, .jw-mvv2, .jw-mvv2-value, .jw-inbox-item, .jw-inbox-tile, ' +
    '.jw-input, .jw-gsearch-box, .jw-sn-find, .jw-vtab, .jw-gs-item';
  var RV_R = 96;
  var rvLit = [], rvPt = null, rvRaf = 0;
  var rvOff = REDUCED;
  function rvSchedule() { if (!rvRaf) rvRaf = requestAnimationFrame(rvFrame); }
  function rvFrame() {
    rvRaf = 0;
    var next = [];
    var scope = rvPt && rvPt.t && rvPt.t.closest ? rvPt.t.closest('.jw-sidenav, .jw-menu, .jw-main, .jw-dialog, .jw-inbox') : null;
    if (scope) {
      var x = rvPt.x, y = rvPt.y, els = scope.querySelectorAll(RV_SEL);
      for (var i = 0; i < els.length; i++) {
        var r = els[i].getBoundingClientRect();
        if (!r.width) continue;
        var dx = Math.max(r.left - x, 0, x - r.right), dy = Math.max(r.top - y, 0, y - r.bottom);
        if (dx * dx + dy * dy <= RV_R * RV_R) next.push([els[i], x - r.left, y - r.top]);
      }
    }
    var keep = next.map(function (n) { return n[0]; });
    rvLit.forEach(function (el) { if (keep.indexOf(el) < 0) el.removeAttribute('data-rv'); });
    next.forEach(function (n) {
      n[0].style.setProperty('--mx', Math.round(n[1]) + 'px');
      n[0].style.setProperty('--my', Math.round(n[2]) + 'px');
      if (!n[0].hasAttribute('data-rv')) n[0].setAttribute('data-rv', '');
    });
    rvLit = keep;
  }
  if (!rvOff) {
    document.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      rvPt = { x: e.clientX, y: e.clientY, t: e.target };
      rvSchedule();
    }, { passive: true });
    document.documentElement.addEventListener('mouseleave', function () { rvPt = null; rvSchedule(); });
    document.addEventListener('scroll', function () { if (rvPt) rvSchedule(); }, true);
  }

  // ── §Tooltip ──
  // Tên mục trong cây / お気に入り / kết quả tìm bị cắt "…" (hay gặp ở tiếng Việt) ⇒ tooltip
  // hiện TÊN ĐẦY ĐỦ, kèm lời giải thích ở dòng dưới nếu mục có data-tip. Không bị cắt thì y như cũ.
  var CLIP_HOST = '.jw-tree-row, .jw-tree-leaf, .jw-sn-fav, .jw-sn-hit';
  var CLIP_NAME = '.jw-tree-name, .jw-tree-leafname, .jw-sn-fav-name, .jw-sn-hit-name';
  function tipText(el) {
    var tip = el.getAttribute('data-tip') || '';
    var name = el.matches(CLIP_HOST) && !el.closest('.jw-sidenav--rail') ? el.querySelector(CLIP_NAME) : null;
    if (name && name.scrollWidth > name.clientWidth + 1) return tip ? name.textContent + '\n' + tip : name.textContent;
    return tip;
  }
  document.addEventListener('mouseover', function (e) {
    var el = e.target.closest ? e.target.closest('[data-tip], ' + CLIP_HOST) : null;
    if (el === tipFor) return;
    var text = el ? tipText(el) : '';
    if (!text) { hideTip(); return; }
    showTip(el, text);
  });
  document.addEventListener('focusin', function (e) {
    var el = e.target;
    var text = el && el.matches && el.matches('[data-tip], ' + CLIP_HOST) ? tipText(el) : '';
    if (text && el.matches(':focus-visible')) showTip(el, text);
    else hideTip();
  });

  // ── §JOY Pilot — trợ lý chung cho MỌI trang ──
  // Panel NEO bên phải (không phải màn riêng): mở ở trang nào thì làm việc NGAY TRÊN trang đó,
  // chuyển trang vẫn giữ hội thoại. 3 việc: THAO TÁC trang (mở trang · お気に入り · đổi theme/ngôn ngữ)
  // · TRA dữ liệu (tổng hợp tại chỗ) · SỬA dữ liệu khi có quyền (組織図 · 名簿), luôn qua THẺ
  // XÁC NHẬN; có ngày áp dụng trong tương lai thì giữ bản nháp rồi TỰ áp vào đúng ngày.
  // ⚠ MOCKUP: chưa nối BigQuery MCP — `pilotPlan()` là chỗ DUY NHẤT phải đổi khi nối thật
  // (câu hỏi → kế hoạch trả lời); khung chat chỉ đọc hình dạng kế hoạch đó.
  var PILOT = { open: false, full: false, tab: 'chat', msgs: [], busy: false, plans: [], seq: 0, timers: [], ticker: null,
    F: null, face: 'idle', status: null, stick: true, pokes: [], annoyPending: false, wakeUntil: 0, lastType: 0, lastActive: 0,
    idleTimer: 0, sleepTimer: 0, listenTimer: 0, tickleTimer: 0 };
  // Màu nhân vật = HẰNG SỐ (cùng bộ với JOY Pilot của JOY Analytics), không theo theme
  var PC = { head: '#f5f5f6', shade: '#e3e4e7', line: '#d9d3cc', orange: '#ff8c1a', orangeDark: '#d9670b', visor: '#2a2b2e', eye: '#45c8ff', star: '#ffc94d' };
  var P_HEAD = 'M100 54 C150 54 176 84 176 118 C176 152 146 172 100 172 C54 172 24 152 24 118 C24 84 50 54 100 54 Z';
  var P_CHIN = 'M29 136 C42 161 70 171 100 171 C130 171 158 161 171 136 C150 152 126 157 100 157 C74 157 50 152 29 136 Z';
  var P_VISOR = 'M46 88 C46 78 56 74 70 74 H130 C144 74 154 78 154 88 V116 C154 132 144 140 132 140 C120 140 112 128 100 128 C88 128 80 140 68 140 C56 140 46 132 46 116 Z';
  // Mặt robot. live = 待機 (mắt chớp, bồng bềnh) và hover vào CHỦ (.jw-pmark-host) thì ra 回答.
  function pilotMark(size, live) {
    var still = REDUCED || !live;
    function bob(dy, b) {
      return still ? '' : '<animateTransform attributeName="transform" type="translate" values="0 0;0 ' + dy + ';0 0" dur="3s" begin="' + b + '" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/>';
    }
    var blink = still ? '' : function (a, v) { return '<animate attributeName="' + a + '" values="' + v + '" keyTimes="0;0.9;0.94;0.98;1" dur="4.5s" begin="0s" repeatCount="indefinite"/>'; };
    var eyes = [69, 114].map(function (x) {
      return '<rect x="' + x + '" y="89" width="17" height="23" rx="4.5" fill="' + PC.eye + '">' + (blink ? blink('height', '23;23;3;23;23') + blink('y', '89;89;99;89;89') : '') + '</rect>';
    }).join('');
    var happy = live ? '<g class="jw-pmark-happy"><path d="M68 106 Q77.5 91 87 106" fill="none" stroke="' + PC.eye + '" stroke-width="6" stroke-linecap="round"/>' +
      '<path d="M113 106 Q122.5 91 132 106" fill="none" stroke="' + PC.eye + '" stroke-width="6" stroke-linecap="round"/>' +
      '<g transform="translate(170 62) scale(1.6)"><g>' + (still ? '' : '<animateTransform attributeName="transform" type="scale" values="0.4;1;0.4" dur="1.6s" begin="0s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/>') +
      '<path d="M0 -7 L1.8 -1.8 L7 0 L1.8 1.8 L0 7 L-1.8 1.8 L-7 0 L-1.8 -1.8 Z" fill="' + PC.star + '"/></g></g></g>' : '';
    return '<svg class="jw-pmark" viewBox="0 0 200 200" width="' + size + '" height="' + size + '" aria-hidden="true" focusable="false">' +
      '<g>' + bob(-4, '0.3s') + '<ellipse cx="100" cy="32" rx="29" ry="13" fill="none" stroke="' + PC.orange + '" stroke-width="11" transform="rotate(-8 100 32)"/></g>' +
      '<g>' + bob(-3, '0s') +
        '<rect x="4" y="88" width="32" height="60" rx="10" fill="' + PC.orangeDark + '"/><rect x="164" y="88" width="32" height="60" rx="10" fill="' + PC.orangeDark + '"/>' +
        '<rect x="4" y="88" width="32" height="46" rx="10" fill="' + PC.orange + '"/><rect x="164" y="88" width="32" height="46" rx="10" fill="' + PC.orange + '"/>' +
        '<path d="' + P_HEAD + '" fill="' + PC.head + '" stroke="' + PC.line + '" stroke-width="2"/><path d="' + P_CHIN + '" fill="' + PC.shade + '"/><path d="' + P_VISOR + '" fill="' + PC.visor + '"/>' +
        '<g class="jw-pmark-idle">' + eyes + '</g>' + happy +
      '</g></svg>';
  }
  // ── Mặt robot ĐỘNG — port NGUYÊN của `PilotFace.tsx` + `face.ts` (JOY Analytics): 28 biểu cảm,
  // mọi cú chuyển đi qua `neutral` (trừ phản xạ `tickled` · cặp `tickled → angry`), đèn trán đổi
  // màu, cú nảy riêng, nghiêng đầu, mắt nhìn theo chuột. Mỗi biểu cảm là một LỚP enter → in → out
  // (cũ mờ TRONG LÚC mới nở ⇒ không có khung trống). Tắt chuyển động ⇒ mọi SMIL `indefinite`.
  var PFC = { head: '#f5f5f6', shade: '#e3e4e7', line: '#d9d3cc', orange: '#ff8c1a', orangeDark: '#d9670b', slot: '#b85407', visor: '#2a2b2e', eye: '#45c8ff', mic: '#6b7078', drop: '#8fcdff', star: '#ffc94d', heart: '#ff6b8b', ok: '#4ade80', warn: '#ffb020', err: '#ff5a5f', dim: '#5a6570', blush: '#ff8fab', blushLine: '#f06a8c', gloom: '#8a8f96' };
  var PF_EXPR = ['neutral', 'idle', 'listening', 'typing', 'happy', 'wink', 'confused', 'love', 'thinking', 'searching', 'trendUp', 'trendDown', 'surprised', 'warning', 'success', 'excited', 'starry', 'shy', 'proud', 'moved', 'sad', 'angry', 'celebrate', 'tickled', 'loading', 'dizzy', 'sleepy', 'oops'];
  var PF_LED = { idle: [PFC.eye, '3s'], listening: [PFC.eye, '0.8s'], typing: [PFC.eye, '0.6s'], happy: [PFC.ok, '1.5s'], wink: [PFC.ok, '1.5s'], confused: [PFC.warn, '1.4s'], love: [PFC.heart, '1s'], thinking: [PFC.warn, '0.5s'], searching: [PFC.warn, '0.8s'], trendUp: [PFC.ok, '1.5s'], trendDown: [PFC.warn, '1.5s'], surprised: [PFC.warn, '0.4s'], warning: [PFC.warn, '0.3s'], success: [PFC.ok, '1.2s'], excited: [PFC.star, '0.4s'], starry: [PFC.star, '0.6s'], shy: [PFC.heart, '2s'], proud: [PFC.ok, '2s'], moved: [PFC.drop, '1.6s'], sad: [PFC.drop, '3s'], angry: [PFC.err, '0.5s'], celebrate: [PFC.star, '0.5s'], tickled: [PFC.heart, '0.35s'], loading: [PFC.eye, '0.4s'], dizzy: [PFC.warn, '0.3s'], sleepy: [PFC.dim, '4s'], oops: [PFC.err, '0.35s'] };
  function faceLed(e) { return PF_LED[e] || [PFC.eye, '3s']; }
  var PF_HOP = { happy: ['0 0;0 -6;0 0', '1s'], love: ['0 0;0 -4;0 0', '1.4s'], surprised: ['0 0;0 -8;0 0', '0.7s'], typing: ['0 0;0 -2;0 0', '1.1s'], excited: ['0 0;0 -7;0 0', '0.6s'], starry: ['0 0;0 -5;0 0', '0.8s'], celebrate: ['0 0;0 -6;0 0', '0.9s'], success: ['0 0;0 -3;0 0', '1s'], tickled: ['0 0;-3 -2;3 -3;-3 -2;3 -1;0 0', '0.5s'] };
  var PF_TILT = { confused: -6, sleepy: 6, listening: -3, shy: -4, proud: -5, sad: 5 };
  var PF_ENTER = 40, PF_PRUNE = 320, PF_NEUTRAL_HOLD = 440;
  var PF_DIRECT_IN = { tickled: 1 };
  var PF_LOOK_MAX = { x: 12, y: 7 };
  function lookAt(dx, dy, range) {
    var dist = Math.hypot(dx, dy);
    if (!(range > 0) || dist > range) return null;
    if (dist === 0) return { x: 0, y: 0 };
    var m = Math.min(1, dist / (range * 0.4));
    return { x: (dx / dist) * m * PF_LOOK_MAX.x, y: (dy / dist) * m * PF_LOOK_MAX.y };
  }
  var PF_SPL = ' calcMode="spline" keyTimes="0;0.5;1" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"';
  function pfA(attr, values, dur, begin, kt, spline) { return '<animate attributeName="' + attr + '" values="' + values + '" dur="' + dur + '" begin="' + begin + '" repeatCount="indefinite"' + (spline ? PF_SPL : kt ? ' keyTimes="' + kt + '"' : '') + '/>'; }
  function pfT(type, values, dur, begin, kt, spline) { return '<animateTransform attributeName="transform" type="' + type + '" values="' + values + '" dur="' + dur + '" begin="' + begin + '" repeatCount="indefinite"' + (spline ? PF_SPL : kt ? ' keyTimes="' + kt + '"' : '') + '/>'; }
  var PF_STAR4 = 'M0 -7 L1.8 -1.8 L7 0 L1.8 1.8 L0 7 L-1.8 1.8 L-7 0 L-1.8 -1.8 Z';
  var PF_STAR5 = 'M0 -11.5 L2.94 -4.05 L10.94 -3.55 L4.76 1.55 L6.76 9.3 L0 5 L-6.76 9.3 L-4.76 1.55 L-10.94 -3.55 L-2.94 -4.05 Z';
  var PF_HEART = 'M0 7 C-9 1 -10 -6 -5 -8 C-2 -9 0 -7 0 -5 C0 -7 2 -9 5 -8 C10 -6 9 1 0 7 Z';
  var PF_DROP = 'M0 -4 C2.5 0 4 2.5 4 4 A4 4 0 0 1 -4 4 C-4 2.5 -2.5 0 0 -4 Z';
  var PF_SPIRAL = 'M-1 0 A1 1 0 0 1 1 0 A2 2 0 0 1 -3 0 A3 3 0 0 1 3 0 A4 4 0 0 1 -5 0 A5 5 0 0 1 5 0 A6 6 0 0 1 -7 0';
  var PF_ANGER = 'M-7 -2.5 Q-2.5 -2.5 -2.5 -7 M2.5 -7 Q2.5 -2.5 7 -2.5 M7 2.5 Q2.5 2.5 2.5 7 M-2.5 7 Q-2.5 2.5 -7 2.5';
  var PF_BLINK = '0;0.9;0.94;0.98;1', PF_POP = '0;0.15;0.3;0.85;1';
  function pfSparkle(x, y, s, bg) { return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')"><g>' + pfT('scale', '0;1;0', '1.6s', bg, null, true) + '<path d="' + PF_STAR4 + '" fill="' + PFC.star + '"/></g></g>'; }
  function pfPop(x, y, dur, bg, inner) { return '<g transform="translate(' + x + ' ' + y + ')"><g>' + pfT('scale', '0.3;1.15;1;1;0.3', dur, bg, PF_POP) + inner + '</g></g>'; }
  function pfEye(x, blink, bg) { return '<rect x="' + x + '" y="89" width="17" height="23" rx="4.5" fill="' + PFC.eye + '">' + (blink ? pfA('height', '23;23;3;23;23', '4.5s', bg, PF_BLINK) + pfA('y', '89;89;99;89;89', '4.5s', bg, PF_BLINK) : '') + '</rect>'; }
  function pfBar(x, hs, bg) {
    var loop = hs.concat([hs[0]]);
    return '<rect x="' + x + '" y="' + (112 - hs[0]) + '" width="5" height="' + hs[0] + '" rx="1.5" fill="' + PFC.eye + '">' + pfA('height', loop.join(';'), '0.9s', bg) + pfA('y', loop.map(function (h) { return 112 - h; }).join(';'), '0.9s', bg) + '</rect>';
  }
  function pfDraw(d, len, dur, bg, w) { return '<path d="' + d + '" fill="none" stroke="' + PFC.eye + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="' + len + '" stroke-dashoffset="0">' + pfA('stroke-dashoffset', len + ';0;0', dur, bg, '0;0.45;1') + '</path>'; }
  function pfTrend(d, len, end, ex, ey, b) { return '<path d="M56 124 H144" fill="none" stroke="' + PFC.eye + '" stroke-width="1.5" opacity="0.3"/>' + pfDraw(d, len, '2.4s', b.a, 4.5) + '<circle cx="' + ex + '" cy="' + ey + '" r="5" fill="' + end + '">' + pfA('opacity', '0;0;1;1', '2.4s', b.a, '0;0.4;0.5;1') + '</circle>'; }
  function pfConfetti(x, y, dx, color, dur, bg, spin) { return '<g transform="translate(' + x + ' ' + y + ')"><g>' + pfT('translate', '0 0;' + dx + ' 118', dur, bg) + pfA('opacity', '1;1;0', dur, bg, '0;0.75;1') + '<rect x="-2.2" y="-3.8" width="4.4" height="7.6" rx="1.2" fill="' + color + '">' + pfT('rotate', '0 0 0;' + spin + ' 0 0', '0.9s', bg) + '</rect></g></g>'; }
  var PF_SMILE = '<path d="M68 106 Q77.5 91 87 106" fill="none" stroke="' + PFC.eye + '" stroke-width="6" stroke-linecap="round"/><path d="M113 106 Q122.5 91 132 106" fill="none" stroke="' + PFC.eye + '" stroke-width="6" stroke-linecap="round"/>';
  function pfArt(e, b) {
    var C = PFC;
    switch (e) {
      case 'neutral': return '<rect x="71" y="94" width="13" height="13" rx="5" fill="' + C.eye + '"/><rect x="116" y="94" width="13" height="13" rx="5" fill="' + C.eye + '"/>';
      case 'idle': return pfEye(69, true, b.a) + pfEye(114, true, b.a);
      case 'listening': return '<rect x="70" y="91" width="15" height="19" rx="7.5" fill="' + C.eye + '"/><rect x="115" y="91" width="15" height="19" rx="7.5" fill="' + C.eye + '"/>' +
        '<path d="M171.4 158 A12 12 0 0 1 167 174.4" fill="none" stroke="' + C.eye + '" stroke-width="3" stroke-linecap="round">' + pfA('opacity', '0.1;1;0.1', '1.2s', b.a) + '</path>' +
        '<path d="M177.5 154.5 A19 19 0 0 1 170.5 180.5" fill="none" stroke="' + C.eye + '" stroke-width="3" stroke-linecap="round">' + pfA('opacity', '0.1;1;0.1', '1.2s', b.c) + '</path>';
      case 'typing': return [[84, b.a], [100, b.b], [116, b.c]].map(function (p) {
        return '<circle cx="' + p[0] + '" cy="101" r="6" fill="' + C.eye + '">' + pfT('translate', '0 0;0 -7;0 0;0 0', '1.1s', p[1], '0;0.25;0.5;1') + pfA('opacity', '1;0.5;1;1', '1.1s', p[1], '0;0.25;0.5;1') + '</circle>';
      }).join('');
      case 'happy': return PF_SMILE + pfSparkle(34, 66, 1, b.a) + pfSparkle(168, 64, 1.2, b.c) + pfSparkle(160, 40, 0.8, b.e);
      case 'wink': return '<path d="M68 104 Q77.5 91 87 104" fill="none" stroke="' + C.eye + '" stroke-width="6" stroke-linecap="round"/>' + pfEye(114, false, b.a) + pfSparkle(160, 72, 1.1, b.a);
      case 'confused': return pfEye(69, false, b.a) + '<rect x="114" y="98" width="17" height="8" rx="4" fill="' + C.eye + '"/>' +
        '<g transform="translate(164 60)"><g>' + pfT('rotate', '-14;14;-14', '2s', b.a, null, true) + '<text x="0" y="9" text-anchor="middle" font-family="Outfit, sans-serif" font-size="30" font-weight="700" fill="' + C.orange + '">?</text></g></g>';
      case 'love': return [77.5, 122.5].map(function (cx) {
          return '<g transform="translate(' + cx + ' 101)"><g transform="scale(1.45)">' + pfT('scale', '1.35;1.65;1.35', '0.8s', b.a, null, true) + '<path d="' + PF_HEART + '" fill="' + C.heart + '"/></g></g>';
        }).join('') +
        '<g transform="translate(164 64)"><g>' + pfT('translate', '0 6;0 -18', '2s', b.a) + pfA('opacity', '0;1;0', '2s', b.a) + '<path d="' + PF_HEART + '" fill="' + C.heart + '"/></g></g>' +
        '<g transform="translate(38 70) scale(0.8)"><g>' + pfT('translate', '0 6;0 -18', '2s', b.d) + pfA('opacity', '0;1;0', '2s', b.d) + '<path d="' + PF_HEART + '" fill="' + C.heart + '"/></g></g>';
      case 'thinking': return pfBar(67, [10, 20, 6], b.a) + pfBar(74.5, [17, 8, 22], b.b) + pfBar(82, [23, 12, 16], b.c) + pfBar(113, [14, 22, 9], b.b) + pfBar(120.5, [23, 10, 18], b.a) + pfBar(128, [8, 18, 12], b.c);
      case 'searching': return '<g>' + pfT('translate', '-8 0;8 0;-8 0', '2.4s', b.a, null, true) + '<rect x="70.5" y="92" width="14" height="17" rx="4" fill="' + C.eye + '"/><rect x="115.5" y="92" width="14" height="17" rx="4" fill="' + C.eye + '"/></g>' +
        '<rect x="54" y="84" width="92" height="2.5" rx="1.25" fill="' + C.eye + '" opacity="0.55">' + pfA('y', '82;120;82', '2s', b.a, null, true) + '</rect>';
      case 'trendUp': return pfTrend('M56 118 L72 110 L86 114 L102 98 L116 102 L138 84', 100.1, C.ok, 138, 84, b);
      case 'trendDown': return pfTrend('M56 84 L72 94 L86 90 L102 106 L116 102 L138 120', 101, C.warn, 138, 120, b);
      case 'surprised': return '<circle cx="77.5" cy="100.5" r="11" fill="' + C.eye + '"/><circle cx="122.5" cy="100.5" r="11" fill="' + C.eye + '"/><circle cx="77.5" cy="100.5" r="4.5" fill="' + C.visor + '"/><circle cx="122.5" cy="100.5" r="4.5" fill="' + C.visor + '"/>' +
        '<g transform="translate(164 58)"><g>' + pfT('scale', '0;1.25;1;1;0', '2.4s', b.a, '0;0.12;0.22;0.88;1') + '<rect x="-3.5" y="-16" width="7" height="20" rx="3.5" fill="' + C.warn + '"/><circle cx="0" cy="10" r="4" fill="' + C.warn + '"/></g></g>';
      case 'warning': return [[77.5, b.a], [122.5, b.b]].map(function (p) {
        return '<g>' + pfA('opacity', '1;0.35;1', '0.6s', p[1]) + '<rect x="' + (p[0] - 2.8) + '" y="88" width="5.6" height="15" rx="2.8" fill="' + C.warn + '"/><circle cx="' + p[0] + '" cy="109.5" r="3.2" fill="' + C.warn + '"/></g>';
      }).join('');
      case 'success': return pfDraw('M69 101 L75.5 107.5 L87 94', 28.9, '2s', b.a, 5.5) + pfDraw('M114 101 L120.5 107.5 L132 94', 28.9, '2s', b.b, 5.5) + pfSparkle(160, 70, 1, b.c);
      case 'excited': return '<path d="M69 92 L84 100.5 L69 109" fill="none" stroke="' + C.eye + '" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M131 92 L116 100.5 L131 109" fill="none" stroke="' + C.eye + '" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>' +
        pfPop(158, 58, '1.4s', b.a, '<path d="M-1.4 -8 L-3.2 -18 M4 -7 L9.5 -16 M7.5 -2.8 L17 -6.4" fill="none" stroke="' + C.star + '" stroke-width="4" stroke-linecap="round"/>');
      case 'starry': return [[77.5, b.a], [122.5, b.b]].map(function (p) {
        return '<g transform="translate(' + p[0] + ' 100.5)"><g>' + pfT('scale', '1;1.18;1', '0.9s', p[1], null, true) + '<g>' + pfT('rotate', '-10;10;-10', '1.8s', p[1], null, true) + '<path d="' + PF_STAR5 + '" fill="' + C.star + '" stroke="' + C.star + '" stroke-width="2" stroke-linejoin="round"/></g></g></g>';
      }).join('');
      case 'shy': return '<path d="M70 105 Q77.5 95 85 105" fill="none" stroke="' + C.eye + '" stroke-width="5" stroke-linecap="round"/><path d="M115 105 Q122.5 95 130 105" fill="none" stroke="' + C.eye + '" stroke-width="5" stroke-linecap="round"/>' +
        [[56, b.a], [144, b.b]].map(function (p) {
          var cx = p[0];
          return '<g><ellipse cx="' + cx + '" cy="148" rx="11" ry="6" fill="' + C.blush + '">' + pfA('opacity', '0.55;0.95;0.55', '1.6s', p[1], null, true) + '</ellipse>' +
            '<path d="M' + (cx - 7) + ' 150 l3 -4.5 M' + (cx - 1) + ' 150.5 l3 -4.5 M' + (cx + 5) + ' 150 l3 -4.5" fill="none" stroke="' + C.blushLine + '" stroke-width="1.8" stroke-linecap="round"/></g>';
        }).join('');
      case 'proud': return '<path d="M69 101 H86 V107 A5 5 0 0 1 81 112 H74 A5 5 0 0 1 69 107 Z" fill="' + C.eye + '"/><path d="M114 101 H131 V107 A5 5 0 0 1 126 112 H119 A5 5 0 0 1 114 107 Z" fill="' + C.eye + '"/>' +
        '<path d="M66 97 H89 M111 97 H134" fill="none" stroke="' + C.eye + '" stroke-width="2.5" stroke-linecap="round" opacity="0.55"/>' + pfSparkle(62, 84, 0.9, b.a) + pfSparkle(160, 66, 1.1, b.d);
      case 'moved': return '<path d="M67 91 H88 M77.5 91 V108" fill="none" stroke="' + C.eye + '" stroke-width="5" stroke-linecap="round"/><path d="M112 91 H133 M122.5 91 V108" fill="none" stroke="' + C.eye + '" stroke-width="5" stroke-linecap="round"/>' +
        [[77.5, b.a], [122.5, b.d]].map(function (p) {
          return '<g transform="translate(' + p[0] + ' 112)"><g>' + pfT('translate', '0 0;0 30', '1.5s', p[1]) + pfA('opacity', '1;1;0', '1.5s', p[1]) + '<path d="' + PF_DROP + '" fill="' + C.drop + '"/></g></g>';
        }).join('');
      case 'sad': return '<g>' + pfT('translate', '0 0;0 3;0 0', '3s', b.a, null, true) +
          '<rect x="69" y="96" width="17" height="9" rx="4.5" fill="' + C.eye + '" transform="rotate(-18 77.5 100.5)"/><rect x="114" y="96" width="17" height="9" rx="4.5" fill="' + C.eye + '" transform="rotate(18 122.5 100.5)"/></g>' +
        '<path d="M60 57 V69 M68 55 V69 M76 57 V69" fill="none" stroke="' + C.gloom + '" stroke-width="2.5" stroke-linecap="round">' + pfA('opacity', '0.2;0.8;0.2', '2.4s', b.a, null, true) + '</path>';
      case 'angry': return '<path d="M69 93 L86 100 V108 A4 4 0 0 1 82 112 H73 A4 4 0 0 1 69 108 Z" fill="' + C.eye + '"/><path d="M131 93 L114 100 V108 A4 4 0 0 0 118 112 H127 A4 4 0 0 0 131 108 Z" fill="' + C.eye + '"/>' +
        pfPop(158, 62, '1.2s', b.a, '<path d="' + PF_ANGER + '" fill="none" stroke="' + C.err + '" stroke-width="3.2" stroke-linecap="round"/>');
      case 'celebrate': return PF_SMILE + pfConfetti(34, 34, 6, C.orange, '2.2s', b.a, 360) + pfConfetti(54, 20, -4, C.eye, '2.6s', b.c, -360) + pfConfetti(74, 40, 5, C.star, '2s', b.e, 360) +
        pfConfetti(94, 16, -6, C.heart, '2.4s', b.b, -360) + pfConfetti(112, 36, 4, C.ok, '2.1s', b.d, 360) + pfConfetti(130, 22, -5, C.orange, '2.5s', b.a, -360) +
        pfConfetti(150, 38, 6, C.eye, '2.3s', b.e, 360) + pfConfetti(168, 24, -3, C.star, '2s', b.c, -360);
      case 'tickled': return '<g>' + pfT('translate', '0 0;0 -1.5;0 0', '0.25s', b.a) +
          '<path d="M70 93 L83 100.5 L70 108" fill="none" stroke="' + C.eye + '" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M130 93 L117 100.5 L130 108" fill="none" stroke="' + C.eye + '" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></g>' +
        '<path d="M91 113 Q100 113 109 113 Q108 123 100 123 Q92 123 91 113 Z" fill="' + C.eye + '">' + pfA('d', 'M91 113 Q100 113 109 113 Q108 123 100 123 Q92 123 91 113 Z;M92 113 Q100 113 108 113 Q107 119 100 119 Q93 119 92 113 Z;M91 113 Q100 113 109 113 Q108 123 100 123 Q92 123 91 113 Z', '0.25s', b.a) + '</path>' +
        [[56, b.a], [144, b.b]].map(function (p) { return '<ellipse cx="' + p[0] + '" cy="148" rx="11" ry="6" fill="' + C.blush + '">' + pfA('opacity', '0.6;1;0.6', '0.9s', p[1], null, true) + '</ellipse>'; }).join('') +
        [[64, b.a], [136, b.c]].map(function (p) { return '<g>' + pfT('translate', '0 0;0 9', '1.1s', p[1]) + pfA('opacity', '0;1;1;0', '1.1s', p[1], '0;0.15;0.7;1') + '<path d="' + PF_DROP + '" transform="translate(' + p[0] + ' 110) scale(0.9)" fill="' + C.drop + '"/></g>'; }).join('') +
        pfPop(30, 70, '0.9s', b.a, '<path d="M-2 -10 L-9 -15 M-4 -2 L-13 -3 M-2 6 L-9 10" fill="none" stroke="' + C.star + '" stroke-width="3.5" stroke-linecap="round"/>') +
        pfPop(170, 70, '0.9s', b.b, '<path d="M2 -10 L9 -15 M4 -2 L13 -3 M2 6 L9 10" fill="none" stroke="' + C.star + '" stroke-width="3.5" stroke-linecap="round"/>');
      case 'loading': return [[77.5, b.a], [122.5, b.b]].map(function (p) {
        var cx = p[0];
        return '<g><circle cx="' + cx + '" cy="100.5" r="9" fill="none" stroke="' + C.eye + '" stroke-width="3" opacity="0.25"/><path d="M' + cx + ' 91.5 A9 9 0 0 1 ' + (cx + 7.79) + ' 105" fill="none" stroke="' + C.eye + '" stroke-width="4.5" stroke-linecap="round">' + pfT('rotate', '0 ' + cx + ' 100.5;360 ' + cx + ' 100.5', '0.9s', p[1]) + '</path></g>';
      }).join('');
      case 'dizzy': return [[77.5, '0;360'], [122.5, '360;0']].map(function (p) {
          return '<g transform="translate(' + p[0] + ' 100.5) scale(1.5)"><g>' + pfT('rotate', p[1], '1.1s', b.a) + '<path d="' + PF_SPIRAL + '" fill="none" stroke="' + C.eye + '" stroke-width="1.9" stroke-linecap="round"/></g></g>';
        }).join('') +
        [[146, 44, 'M0 0 A61.3 14.7 0 1 1 -122.7 0 A61.3 14.7 0 1 1 0 0'], [54, 44, 'M0 0 A61.3 14.7 0 1 1 122.7 0 A61.3 14.7 0 1 1 0 0'], [100, 33, 'M0 0 A61.3 14.7 0 0 1 61.3 14.7 A61.3 14.7 0 0 1 0 29.3 A61.3 14.7 0 0 1 -61.3 14.7 A61.3 14.7 0 0 1 0 0']].map(function (p) {
          return '<g transform="translate(' + p[0] + ' ' + p[1] + ') scale(0.75)"><path d="' + PF_STAR4 + '" fill="' + C.star + '"><animateMotion path="' + p[2] + '" dur="1.8s" begin="' + b.a + '" repeatCount="indefinite"/></path></g>';
        }).join('');
      case 'sleepy': return '<rect x="69" y="103" width="17" height="4" rx="2" fill="' + C.eye + '"/><rect x="114" y="103" width="17" height="4" rx="2" fill="' + C.eye + '"/>' +
        [[148, 72, 13, b.a], [158, 58, 17, b.d], [170, 42, 21, b.e]].map(function (p) {
          return '<g transform="translate(' + p[0] + ' ' + p[1] + ')"><g>' + pfT('translate', '0 4;6 -10', '3s', p[3]) + pfA('opacity', '0;1;0', '3s', p[3]) + '<text x="0" y="0" text-anchor="middle" font-family="Outfit, sans-serif" font-size="' + p[2] + '" font-weight="700" fill="' + C.eye + '">Z</text></g></g>';
        }).join('');
      case 'oops': return '<path d="M70 93 L85 108 M85 93 L70 108" fill="none" stroke="' + C.eye + '" stroke-width="5" stroke-linecap="round"/><path d="M115 93 L130 108 M130 93 L115 108" fill="none" stroke="' + C.eye + '" stroke-width="5" stroke-linecap="round"/>' +
        '<g>' + pfT('translate', '0 0;0 12', '1.6s', b.a) + pfA('opacity', '1;1;0', '1.6s', b.a) + '<path d="M162 56 C168 66 172 72 172 77 A10 10 0 0 1 152 77 C152 72 156 66 162 56 Z" fill="' + C.drop + '"/></g>';
    }
    return '';
  }
  // Một mặt sống: tạo DOM một lần, đổi biểu cảm bằng `pfSet` (không vẽ lại cả SVG ⇒ SMIL không giật)
  function pfCreate(size, e) {
    var motion = !REDUCED;
    var bg = function (v) { return motion ? v : 'indefinite'; };
    var b = { a: bg('0s'), b: bg('0.15s'), c: bg('0.3s'), d: bg('0.7s'), e: bg('1s') };
    var svg = '<svg class="jw-pilot-face" viewBox="0 0 200 200" width="' + size + '" height="' + size + '" aria-hidden="true" focusable="false" style="display:block;overflow:visible">' +
      '<g>' + pfT('translate', '0 0;0 -4;0 0', '3s', b.c, null, true) + '<g transform="rotate(-8 100 32)"><ellipse cx="100" cy="32" rx="29" ry="13" fill="none" stroke="' + PFC.orange + '" stroke-width="11"/><g data-pf="orbit"></g></g></g>' +
      '<g>' + pfT('translate', '0 0;0 -3;0 0', '3s', b.a, null, true) +
        '<g data-pf="hop"><g data-pf="tilt" style="transform-origin:100px 118px;transform-box:view-box;transition:transform 520ms cubic-bezier(.34,1.4,.64,1)"><g data-pf="shake">' +
          '<rect x="4" y="88" width="32" height="60" rx="10" fill="' + PFC.orangeDark + '"/><rect x="164" y="88" width="32" height="60" rx="10" fill="' + PFC.orangeDark + '"/>' +
          '<rect x="4" y="88" width="32" height="46" rx="10" fill="' + PFC.orange + '"/><rect x="164" y="88" width="32" height="46" rx="10" fill="' + PFC.orange + '"/>' +
          '<path d="M10 101 H20 M10 109 H20 M10 117 H20" fill="none" stroke="' + PFC.slot + '" stroke-width="2.5" stroke-linecap="round"/>' +
          [[100, b.a], [109, b.b], [118, b.c]].map(function (p) { return '<circle cx="187" cy="' + p[0] + '" r="2.6" fill="' + PFC.eye + '">' + pfA('opacity', '0.25;1;0.25', '1.2s', p[1]) + '</circle>'; }).join('') +
          '<path d="' + P_HEAD + '" fill="' + PFC.head + '" stroke="' + PFC.line + '" stroke-width="2"/><path d="' + P_CHIN + '" fill="' + PFC.shade + '"/>' +
          '<rect data-pf="led" x="91" y="61" width="18" height="5.5" rx="2.75" style="transition:fill 350ms ease"></rect>' +
          '<path d="' + P_VISOR + '" fill="' + PFC.visor + '"/>' +
          '<path d="M54 84 H146 M52 96 H148 M52 108 H148 M54 120 H146" fill="none" stroke="' + PFC.eye + '" stroke-width="1" opacity="0.08"/><path d="M56 84 Q58 80 66 79" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.28"/>' +
          '<g data-pf="look" style="transition:transform 160ms ease-out"></g>' +
          '<path d="M178 146 L166 162" fill="none" stroke="' + PFC.mic + '" stroke-width="3.5" stroke-linecap="round"/><rect x="152" y="158" width="18" height="11" rx="5.5" fill="' + PFC.visor + '" transform="rotate(-28 161 163.5)"/>' +
          '<circle data-pf="mic" cx="158" cy="165" r="2.2" fill="' + PFC.eye + '"></circle>' +
        '</g></g></g></g></svg>';
    var host = document.createElement('span');
    host.innerHTML = svg;
    var F = { el: host.firstChild, motion: motion, b: b, layers: {}, shown: null, target: e, timers: [], look: null };
    F.q = function (k) { return F.el.querySelector('[data-pf="' + k + '"]'); };
    pfLayer(F, e, 'in');
    pfShow(F, e);
    return F;
  }
  function pfLayer(F, k, st) {
    var g = F.layers[k];
    if (!g) {
      g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('data-layer', k);
      g.setAttribute('style', 'transform-origin:100px 101px;transform-box:view-box;transition:opacity 200ms ease-out, transform 300ms cubic-bezier(.34,1.35,.64,1);opacity:0;transform:scale(0.55)');
      g.innerHTML = pfArt(k, F.b);
      F.q('look').appendChild(g);
      F.layers[k] = g;
    }
    g.setAttribute('data-st', st);
    var on = st === 'in';
    g.style.opacity = on ? '1' : '0';
    g.style.transform = 'scale(' + (on ? 1 : 0.55) + ')';
  }
  // Biểu cảm ĐANG THỂ HIỆN đổi ⇒ đèn trán · cú nảy · nghiêng · quỹ đạo · lắc (oops) · đèn mic
  function pfShow(F, e) {
    if (F.shown === e) return;
    var prev = F.shown;
    F.shown = e;
    var led = faceLed(e), led0 = prev ? faceLed(prev) : null;
    var r = F.q('led');
    r.style.fill = led[0];
    if (!led0 || led0[1] !== led[1]) r.innerHTML = pfA('opacity', '1;0.3;1', led[1], F.b.a);
    var hopG = F.q('hop'), old = hopG.querySelector(':scope > animateTransform');
    var hop = F.motion ? PF_HOP[e] : null;
    if (old) old.remove();
    if (hop) hopG.insertAdjacentHTML('afterbegin', pfT('translate', hop[0], hop[1], '0s', null, true));
    F.q('tilt').style.transform = 'rotate(' + (PF_TILT[e] || 0) + 'deg)';
    var fast = e === 'thinking' || e === 'searching', fast0 = prev === 'thinking' || prev === 'searching';
    if (!prev || fast !== fast0) {
      var od = fast ? '1.6s' : '5s';
      F.q('orbit').innerHTML = '<circle cx="129" cy="32" r="4.5" fill="' + PFC.eye + '" stroke="' + PFC.head + '" stroke-width="2"><animateMotion path="M0 0 A29 13 0 1 1 -58 0 A29 13 0 1 1 0 0" dur="' + od + '" begin="' + F.b.a + '" repeatCount="indefinite"/></circle>' +
        '<circle cx="71" cy="32" r="3.5" fill="' + PFC.eye + '" stroke="' + PFC.head + '" stroke-width="2"><animateMotion path="M0 0 A29 13 0 1 1 58 0 A29 13 0 1 1 0 0" dur="' + od + '" begin="' + F.b.a + '" repeatCount="indefinite"/></circle>';
    }
    var sh = F.q('shake'), so = sh.querySelector(':scope > animateTransform');
    if (so) so.remove();
    if (F.motion && e === 'oops') sh.insertAdjacentHTML('afterbegin', pfT('translate', '0 0;-4 0;4 0;-3 0;3 0;0 0;0 0', '1.8s', '0s', '0;0.06;0.12;0.18;0.24;0.3;1'));
    F.q('mic').innerHTML = F.motion && e === 'listening' ? pfA('opacity', '1;0.2;1', '0.6s', '0s') : '';
    pfLook(F, F.look);
  }
  function pfLook(F, v) {
    F.look = v;
    var on = v && F.motion && F.shown !== 'sleepy';
    F.q('look').style.transform = 'translate(' + (on ? v.x : 0) + 'px, ' + (on ? v.y : 0) + 'px)';
  }
  function pfBloom(F, target, delay) {
    F.timers.push(setTimeout(function () {
      Object.keys(F.layers).forEach(function (k) { if (k !== target) pfLayer(F, k, 'out'); });
      pfLayer(F, target, 'enter');
      pfShow(F, target);
    }, delay));
    F.timers.push(setTimeout(function () { pfLayer(F, target, 'in'); }, delay + PF_ENTER));
    F.timers.push(setTimeout(function () {
      Object.keys(F.layers).forEach(function (k) {
        if (F.layers[k].getAttribute('data-st') === 'out') { F.layers[k].remove(); delete F.layers[k]; }
      });
    }, delay + PF_PRUNE));
  }
  function pfSet(F, e) {
    if (!F || e === F.target) return;
    F.target = e;
    F.timers.forEach(clearTimeout);
    F.timers = [];
    if (!F.motion) {
      Object.keys(F.layers).forEach(function (k) { F.layers[k].remove(); delete F.layers[k]; });
      pfLayer(F, e, 'in');
      pfShow(F, e);
      return;
    }
    var from = F.shown;
    var direct = from === 'neutral' || e === 'neutral' || PF_DIRECT_IN[e] || (from === 'tickled' && e === 'angry');
    if (direct) pfBloom(F, e, 0);
    else { pfBloom(F, 'neutral', 0); pfBloom(F, e, PF_NEUTRAL_HOLD); }
  }

  function pilotWordmark() { return '<span class="jw-wordmark jw-pilot-wm"><b>JOY</b><em>Pilot</em></span><span class="jw-pilot-beta">BETA</span>'; }
  function deptName(d) { return LANG === 'vi' && PILOT_DEPT_VI[d] ? PILOT_DEPT_VI[d] : d; }
  function pilotToday() { return new Date(HOME_TODAY.getTime()); }
  function fmtYMDw(d) { return d.getFullYear() + '/' + pad(d.getMonth() + 1) + '/' + pad(d.getDate()) + (LANG === 'vi' ? ' (' + WD.vi[d.getDay()] + ')' : '（' + WD.ja[d.getDay()] + '）'); }
  function daysLeft(d) { return dayDiff(d, pilotToday()); }
  // Ngày trong câu: JA m/d · m月d日 · 来月 — VI d/m · "ngày d tháng m". Ngày đã qua ⇒ năm sau.
  function pilotDate(text) {
    var now = pilotToday(), y = now.getFullYear(), m, d, r;
    if ((r = text.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日/))) { m = +r[1]; d = +r[2]; }
    else if ((r = text.match(/ngày\s*(\d{1,2})\s*tháng\s*(\d{1,2})/i))) { d = +r[1]; m = +r[2]; }
    else if ((r = text.match(/(\d{1,2})\s*\/\s*(\d{1,2})/))) { if (/[぀-ヿ一-鿿]/.test(text)) { m = +r[1]; d = +r[2]; } else { d = +r[1]; m = +r[2]; } }
    else if (/来月|tháng sau/i.test(text)) { m = now.getMonth() + 2; d = 1; }
    else if (/今すぐ|即時|ngay bây giờ|ngay lập tức/i.test(text)) return null;
    if (!m || !d || m > 12 || d > 31) return null;
    var out = new Date(y, m - 1, d);
    if (out < now) out = new Date(y + 1, m - 1, d);
    return out;
  }
  function pilotPerson(text) {
    var n = norm(text);
    for (var i = 0; i < PILOT_STAFF.length; i++) {
      var p = PILOT_STAFF[i];
      var family = p.name.split(' ')[0];
      if (text.indexOf(p.name) >= 0 || n.indexOf(norm(p.name)) >= 0 || (family.length > 1 && text.indexOf(family) >= 0 && !/サンプル/.test(family))) return p;
    }
    if (/sato|佐藤/i.test(n)) return PILOT_STAFF[0];
    return null;
  }
  function pilotDept(text) {
    var ds = Object.keys(PILOT_DEPT_VI);
    for (var i = 0; i < ds.length; i++) {
      if (text.indexOf(ds[i]) >= 0 || norm(text).indexOf(norm(PILOT_DEPT_VI[ds[i]])) >= 0) return ds[i];
      var short = ds[i].replace(/事業部|部$/, '');
      if (short.length > 1 && text.indexOf(short) >= 0) return ds[i];
    }
    return null;
  }
  function pilotPage(text) {
    var best = null, bestLen = 0, n = norm(text);
    PAGE_LIST.forEach(function (p) {
      [p.node.ja, p.node.vi].forEach(function (name) {
        if (!name) return;
        var k = norm(name);
        if (k.length > bestLen && n.indexOf(k) >= 0) { best = p; bestLen = k.length; }
      });
    });
    return best;
  }
  // Dữ liệu tổng hợp TẠI CHỖ từ dữ liệu mẫu — cùng mẫu số với các trang (受注速報 · 新入社員 · お知らせ)
  function pilotTable(kind) {
    var rows = [];
    if (kind === 'deals') {
      var by = {};
      DEALS.forEach(function (d) { if (d.date.indexOf('2026/09') !== 0) return; var k = d.prod; by[k] = by[k] || { n: 0, v: 0 }; by[k].n++; by[k].v += d.total; });
      Object.keys(by).forEach(function (k) { rows.push({ label: tr(PRODUCT_BY_JA[k]), n: by[k].n, v: by[k].v, prod: PRODUCT_BY_JA[k] }); });
      rows.sort(function (a, b) { return b.v - a.v; });
      return { title: L('今月の受注（事業部別）', 'Đơn hàng tháng này (theo mảng)'), cols: [t('事業部'), t('件数'), t('受注総額')], rows: rows, money: true, link: '#/deals', linkLabel: L('受注速報を開く', 'Mở báo cáo đơn hàng') };
    }
    if (kind === 'ae') {
      var ae = {};
      DEALS.forEach(function (d) { ae[d.ae] = ae[d.ae] || { n: 0, v: 0 }; ae[d.ae].n++; ae[d.ae].v += d.total; });
      Object.keys(ae).forEach(function (k) { rows.push({ label: k, n: ae[k].n, v: ae[k].v }); });
      rows.sort(function (a, b) { return b.v - a.v; });
      return { title: L('担当者別の受注額（8〜9月）', 'Doanh số theo người phụ trách (T8–T9)'), cols: [t('担当'), t('件数'), t('受注総額')], rows: rows, money: true, link: '#/deals', linkLabel: L('受注速報を開く', 'Mở báo cáo đơn hàng') };
    }
    if (kind === 'hires') {
      var hd = {};
      NEW_HIRES.forEach(function (h) { hd[h.dept] = (hd[h.dept] || 0) + 1; });
      Object.keys(hd).forEach(function (k) { rows.push({ label: deptName(k), n: hd[k], v: hd[k] }); });
      rows.sort(function (a, b) { return b.v - a.v; });
      return { title: L('9月の入社人数（部署別）', 'Số người vào công ty tháng 9 (theo phòng)'), cols: [t('部署'), t('人数')], rows: rows, money: false };
    }
    ANNOUNCEMENTS.forEach(function (a) {
      var d = ANNOUNCE_DETAILS[a.id];
      if (!d || !d.readers) return;
      rows.push({ label: tr(a.title), n: d.readers, v: Math.round(d.readers / ANNOUNCE_TOTAL_MEMBERS * 100) });
    });
    rows.sort(function (a, b) { return a.v - b.v; });
    return { title: L('お知らせの既読率（低い順）', 'Tỉ lệ đã đọc thông báo (thấp → cao)'), cols: [t('お知らせ'), t('既読'), t('既読率')], rows: rows.slice(0, 5), pct: true, link: '#/announce/' + ANNOUNCEMENTS[0].id, linkLabel: L('お知らせを開く', 'Mở thông báo') };
  }
  function newPlan(o) { o.id = 'p' + (++PILOT.seq); o.state = 'proposed'; PILOT.plans.push(o); return o; }
  function planById(id) { for (var i = 0; i < PILOT.plans.length; i++) if (PILOT.plans[i].id === id) return PILOT.plans[i]; return null; }
  var STEP = {
    read: L('依頼内容を読み取っています', 'Đang đọc yêu cầu'),
    find: L('データを探しています', 'Đang tìm dữ liệu'),
    sum: L('集計しています', 'Đang tổng hợp'),
    perm: L('編集権限を確認しています', 'Đang kiểm tra quyền chỉnh sửa'),
    diff: L('変更案を作っています', 'Đang soạn phương án thay đổi'),
    page: L('ページを開いています', 'Đang mở trang')
  };
  var STEP_DONE = {
    read: L('依頼内容を確認しました', 'Đã hiểu yêu cầu'),
    find: L('データが見つかりました', 'Đã tìm thấy dữ liệu'),
    sum: L('集計できました', 'Đã tổng hợp xong'),
    perm: L('編集権限があります', 'Bạn có quyền chỉnh sửa'),
    permNo: L('編集権限がありません', 'Bạn không có quyền chỉnh sửa'),
    diff: L('変更案ができました', 'Đã soạn xong phương án'),
    page: L('ページを開きました', 'Đã mở trang')
  };
  // ⚠ Chỗ DUY NHẤT đổi khi nối MCP thật: câu hỏi → { steps, text, card, chips, run }
  function pilotPlan(text) {
    var q = text.trim(), n = norm(q), me = SETTINGS_ME.name.split(' ')[0];
    var when = pilotDate(q);
    var isEdit = /変更|更新|修正|編集|追加|登録|削除|外す|異動|予約|反映|đổi|sửa|cập nhật|thêm|xoa|xóa|chuyen|chuyển|dat lich|đặt lịch/i.test(q) || /xoa|chuyen|dat lich/.test(n);
    // 1) Không có quyền — giải thích rõ + lối xin quyền, KHÔNG làm gì cả
    if (/給与|給料|賞与|評価|査定|PL|損益|luong|danh gia|lai lo/i.test(q) || /luong|danh gia|lai lo/.test(n)) {
      var what = /PL|損益|lai lo/i.test(n + q) ? L('PL（損益）', 'PL (lãi lỗ)') : /評価|査定|danh gia/i.test(n + q) ? L('人事評価', 'đánh giá nhân sự') : L('給与', 'lương');
      return { steps: ['read', 'permNo'], text: L('この操作は私からは実行できません。「' + what.ja + '」の' + (isEdit ? '編集' : '閲覧') + '権限が、あなたのアカウントには付与されていないためです。', 'Mình không thể thực hiện thao tác này, vì tài khoản của bạn chưa được cấp quyền ' + (isEdit ? 'chỉnh sửa' : 'xem') + ' “' + what.vi + '”.'),
        card: { type: 'deny', what: what } };
    }
    // 2) 組織変更 (nhiều thay đổi cùng lúc, có ngày áp dụng)
    if (/組織変更|組織改編|組織図.*(変更|更新|予約|反映)|co cau|so do to chuc.*(doi|cap nhat|dat)/.test(q + ' ' + n)) {
      var d1 = when || new Date(2026, 9, 1);
      var p1 = newPlan({ kind: 'org', title: L('組織変更（' + PILOT_ORG_CHANGES.length + '件）', 'Thay đổi cơ cấu (' + PILOT_ORG_CHANGES.length + ' mục)'), target: L('組織図 · 名簿 · 座席', 'Sơ đồ tổ chức · Danh bạ · Chỗ ngồi'), rows: PILOT_ORG_CHANGES, date: d1 });
      return { steps: ['read', 'perm', 'diff'], text: L('お知らせ「10月1日付 組織変更」の内容で変更案を作りました。適用日を指定すると、それまでは下書きとして保持し、当日0:00に自動で反映します。', 'Mình đã soạn phương án theo thông báo “Thay đổi cơ cấu từ 1/10”. Nếu đặt ngày áp dụng, mình sẽ giữ dạng bản nháp và tự áp dụng lúc 0:00 ngày đó.'),
        card: { type: 'plan', id: p1.id } };
    }
    // 3) 異動 (một người)
    if (/異動|配属|所属.*(変更|移)|chuyen.*(phong|bo phan|sang)|dieu chuyen/.test(q + ' ' + n)) {
      var who = pilotPerson(q) || PILOT_STAFF[0];
      var to = pilotDept(q.replace(who.dept, '')) || '人材戦略部';
      var p2 = newPlan({ kind: 'move', title: L(who.name + ' の異動', 'Điều chuyển ' + who.name), target: L('名簿 · 組織図', 'Danh bạ · Sơ đồ tổ chức'),
        person: who, diff: [{ label: L('所属', 'Bộ phận'), from: who.dept, to: to, dept: true }], date: when });
      return { steps: ['read', 'find', 'perm', 'diff'], text: L(who.name + 'さんの所属を変更する案です。' + (when ? '適用日まで下書きとして保持します。' : '適用日の指定がないので、今すぐ反映か日付を決めて予約を選べます。'), 'Đây là phương án đổi bộ phận của ' + who.name + '. ' + (when ? 'Mình sẽ giữ bản nháp tới ngày áp dụng.' : 'Chưa có ngày áp dụng, bạn có thể áp dụng ngay hoặc chọn ngày để đặt lịch.')),
        card: { type: 'plan', id: p2.id } };
    }
    // 4) Bỏ khỏi 名簿 (退職など) — thẻ màu đỏ, hoàn tác được 30 ngày
    if (/外す|削除|退職|xoa|nghi viec|loai khoi/.test(q + ' ' + n)) {
      var gone = pilotPerson(q) || PILOT_STAFF[3];
      var p3 = newPlan({ kind: 'remove', title: L(gone.name + ' を名簿から外す', 'Gỡ ' + gone.name + ' khỏi danh bạ'), target: L('名簿 · 組織図 · 座席', 'Danh bạ · Sơ đồ tổ chức · Chỗ ngồi'),
        person: gone, diff: [{ label: L('在籍', 'Trạng thái'), from: L('在籍', 'Đang làm việc'), to: L('退職（名簿から外す）', 'Nghỉ việc (gỡ khỏi danh bạ)') }], date: when, danger: true });
      return { steps: ['read', 'find', 'perm', 'diff'], text: L(gone.name + 'さんを名簿から外す案です。反映後30日間は元に戻せます。', 'Đây là phương án gỡ ' + gone.name + ' khỏi danh bạ. Sau khi áp dụng vẫn khôi phục được trong 30 ngày.'),
        card: { type: 'plan', id: p3.id } };
    }
    // 5) Thêm người vào 名簿
    if (/(追加|登録|入社予定).*(名簿|メンバー|社員|さん)|(名簿|メンバー).*(追加|登録)|them.*(danh ba|nhan vien|thanh vien)/.test(q + ' ' + n) && !/お気に入り|yeu thich/.test(q + n)) {
      var nd = pilotDept(q) || '研究開発部';
      var p4 = newPlan({ kind: 'add', title: L('新しいメンバーを名簿に追加', 'Thêm thành viên mới vào danh bạ'), target: L('名簿 · 組織図', 'Danh bạ · Sơ đồ tổ chức'),
        person: { name: L('サンプル 新太', 'Sample Arata'), dept: nd, role: '開発' }, diff: [{ label: L('氏名', 'Họ tên'), from: '—', to: L('サンプル 新太', 'Sample Arata') }, { label: L('所属', 'Bộ phận'), from: '—', to: nd, dept: true }], date: when || new Date(2026, 9, 1) });
      return { steps: ['read', 'perm', 'diff'], text: L('名簿に追加する案です。氏名・所属は下書きなので、予約前にいつでも変えられます。', 'Đây là phương án thêm vào danh bạ. Họ tên và bộ phận đang là bản nháp, bạn đổi được bất cứ lúc nào trước khi đặt lịch.'),
        card: { type: 'plan', id: p4.id } };
    }
    // 6) Thao tác chính app: theme · ngôn ngữ · お気に入り · thông báo
    if (/ダーク|暗く|dark|toi/.test(q + ' ' + n) && !/データ|du lieu/.test(q + n)) return { steps: [], text: L('ダークテーマに切り替えました。', 'Đã chuyển sang giao diện tối.'), run: function () { if (themeNow() !== 'dark') setTheme('dark'); } };
    if (/ライト|明るく|light|sang/.test(q + ' ' + n) && !/sang (phong|bo phan)/.test(n)) return { steps: [], text: L('ライトテーマに切り替えました。', 'Đã chuyển sang giao diện sáng.'), run: function () { if (themeNow() !== 'light') setTheme('light'); } };
    if (/ベトナム語|tieng viet|vietnam/.test(q + ' ' + n)) return { steps: [], text: L('表示をベトナム語に切り替えました。', 'Đã chuyển giao diện sang tiếng Việt.'), run: function () { if (LANG !== 'vi') setLang('vi'); } };
    if (/日本語|tieng nhat|japanese/.test(q + ' ' + n)) return { steps: [], text: L('表示を日本語に切り替えました。', 'Đã chuyển giao diện sang tiếng Nhật.'), run: function () { if (LANG !== 'ja') setLang('ja'); } };
    if (/お気に入り|yeu thich/.test(q + ' ' + n)) {
      if (ROUTE.name !== 'page') return { steps: [], text: L('お気に入りに追加できるのはメニューのページです。追加したいページを開いてから、もう一度頼んでください。', 'Chỉ thêm được các trang trong menu vào yêu thích. Hãy mở trang đó rồi nhờ mình lại nhé.') };
      var fk = ROUTE.key, on = S.favs.indexOf(fk) >= 0;
      return { steps: [], text: on ? L('「' + PAGES[fk].node.ja + '」はすでにお気に入りにあります。', '“' + (PAGES[fk].node.vi || PAGES[fk].node.ja) + '” đã có trong yêu thích.') : L('「' + PAGES[fk].node.ja + '」をお気に入りに追加しました。サイドパネルの一番上から開けます。', 'Đã thêm “' + (PAGES[fk].node.vi || PAGES[fk].node.ja) + '” vào yêu thích. Bạn mở được từ đầu side panel.'),
        run: function () { if (!on) { toggleFav(fk); renderSide(); renderPage(false); } } };
    }
    if (/通知|thong bao.*(mo|xem)|(mo|xem).*thong bao/.test(q + ' ' + n) && !/既読|da doc/.test(q + n)) return { steps: [], text: L('通知センターを開きました。', 'Đã mở trung tâm thông báo.'), run: function () { openInbox(); } };
    // 7) Tra dữ liệu
    if (/担当者|誰が|nguoi phu trach|ai co/.test(q + ' ' + n)) return { steps: ['read', 'find', 'sum'], text: L('8〜9月の受注を担当者ごとに合計しました。1位は' + pilotTable('ae').rows[0].label + 'さんです。', 'Mình đã cộng đơn hàng T8–T9 theo người phụ trách. Đứng đầu là ' + pilotTable('ae').rows[0].label + '.'), card: { type: 'table', kind: 'ae', csv: /csv/i.test(q) } };
    if (/受注|売上|don hang|doanh so|doanh thu/.test(q + ' ' + n)) {
      var tb = pilotTable('deals');
      return { steps: ['read', 'find', 'sum'], text: L('9月の受注を事業部ごとにまとめました。合計は' + yen(tb.rows.reduce(function (s, r) { return s + r.v; }, 0)) + '、最も大きいのは' + PRODUCTS.filter(function (p) { return tr(p) === tb.rows[0].label; }).map(function (p) { return p.ja; })[0] + 'です。', 'Mình đã gom đơn hàng tháng 9 theo mảng. Tổng ' + yen(tb.rows.reduce(function (s, r) { return s + r.v; }, 0)) + ', lớn nhất là ' + tb.rows[0].label + '.'),
        card: { type: 'table', kind: 'deals', csv: /csv/i.test(q) } };
    }
    if (/入社|新入社員|新メンバー|nhan vien moi|vao cong ty/.test(q + ' ' + n)) return { steps: ['read', 'find', 'sum'], text: L('9月に入社したのは' + NEW_HIRES.length + '人です。部署ごとの内訳はこちら。', 'Tháng 9 có ' + NEW_HIRES.length + ' người vào công ty. Chi tiết theo phòng như sau.'), card: { type: 'table', kind: 'hires', csv: /csv/i.test(q) } };
    if (/既読|お知らせ|da doc|thong bao/.test(q + ' ' + n)) return { steps: ['read', 'find', 'sum'], text: L('既読率が低いお知らせから並べました。上の方は、もう一度案内すると届きやすくなります。', 'Mình đã xếp các thông báo có tỉ lệ đọc thấp lên trước. Những thông báo đầu danh sách nên nhắc lại một lần nữa.'), card: { type: 'table', kind: 'reads', csv: /csv/i.test(q) } };
    // 8) Mở trang
    var pg = pilotPage(q);
    if (pg) return { steps: ['page'], text: L('「' + pg.node.ja + '」を開きました。このまま、このページについて聞いてください。', 'Đã mở “' + (pg.node.vi || pg.node.ja) + '”. Bạn cứ hỏi tiếp về trang này nhé.'), card: { type: 'page', key: pg.key }, run: function () { S.drawer = false; go(href(pg.key)); } };
    // 9) Chào / hỏi khả năng / không hiểu
    if (/こんにちは|おはよう|こんばんは|ありがとう|xin chao|chao|cam on|hello|hi\b/.test(q + ' ' + n)) return { steps: [], text: L(me + 'さん、どういたしまして。ほかに進めたいことがあれば、そのまま話しかけてください。', 'Không có gì đâu! Còn việc gì cần làm, bạn cứ nói với mình nhé.'), chips: true, face: 'love', status: L('どういたしまして', 'Không có gì') };
    return { steps: ['read'], text: L('ごめんなさい、その依頼はまだデモで用意していません。いまできるのは「ページを開く・切り替える」「受注や入社などの集計」「組織図・名簿の変更（確認してから反映・予約）」です。', 'Xin lỗi, yêu cầu này chưa có trong bản demo. Hiện mình làm được: mở/chuyển trang, tổng hợp đơn hàng hay số người vào công ty, và thay đổi sơ đồ tổ chức/danh bạ (xác nhận rồi mới áp dụng hoặc đặt lịch).'), chips: true, face: 'confused', status: L('ほかの言い方で試してみてください', 'Bạn thử cách nói khác giúp mình nhé') };
  }

  // ── Hội thoại — cùng khung với `PilotScreen` › `BotRow` của JOY Analytics ──
  // Hàng bot MỚI NHẤT: cột trái là MẶT SỐNG (72px, chọt được, mắt nhìn theo chuột) + dòng trạng thái
  // (đèn theo mặt · câu trạng thái · sóng khi đang viết). Hàng đã qua: chấm tâm trạng + "JOY PILOT · 回答".
  // ⚠ Mỗi nhịp chỉ SỬA đúng phần đổi (bước · chữ · trạng thái); vẽ lại cả khung là mọi tin nhắn
  //   chạy lại hiệu ứng vào ⇒ chữ "hiện rồi mất". Hiệu ứng vào chỉ gắn cho phần tử MỚI (.jw-pilot-in).
  var PT = { firstStep: 200, step: 1100, queryStep: 1400, think: 900, charsPerTick: 2, tick: 26, holdMood: 8500, tickle: 4000, annoyed: 4000, laughBeforeAnnoyed: 2000, pokeWindow: 30000, wake: 2800, stopped: 4000, listen: 2200, sleep: 45000 };
  var PILOT_LIVE = {
    idle: L('いつでもどうぞ', 'Sẵn sàng'), listening: L('聞いています…', 'Đang nghe…'), thinking: L('ちょっと考え中…', 'Đang nghĩ một chút…'),
    typing: L('回答を書いています…', 'Đang viết câu trả lời…'), stopped: L('停止しました', 'Đã dừng'),
    sleepy: L('スリープ中 · 話しかけると起きます', 'Đang ngủ · gõ gì đó để đánh thức'), wake: L('はっ！起きました', 'Ồ! Dậy rồi đây'),
    tickled: L('くすぐったい〜！あはは', 'Ha ha, buồn quá, đừng cù nữa!'), annoyed: L('もう！くすぐりすぎ！', 'Hừm! Cù hoài bực rồi nha!')
  };
  var PILOT_MOOD = {
    happy: { label: L('回答', 'Trả lời'), tone: 'accent' }, trendUp: { label: L('上昇トレンド', 'Xu hướng tăng'), tone: 'ok' },
    surprised: { label: L('発見', 'Phát hiện'), tone: 'warn' }, success: { label: L('成功', 'Thành công'), tone: 'ok' },
    oops: { label: L('エラー', 'Lỗi'), tone: 'crit' }, confused: { label: L('聞き返し', 'Hỏi lại'), tone: 'warn' },
    love: { label: L('ありがとう', 'Cảm ơn'), tone: 'accent' }
  };
  PILOT.status = null;
  var STEP_FACE = { read: 'thinking', find: 'searching', sum: 'loading', perm: 'searching', permNo: 'searching', diff: 'thinking', page: 'loading' };
  var PILOT_GREETING = L('JOY Pilot、準備OKです！ページを開くのも、数字の確認も、組織図や名簿の更新も、話しかけるだけで大丈夫。「組織図を開いて」くらいの一言でどうぞ。',
    'JOY Pilot sẵn sàng! Mở hay chuyển trang, xem con số, cập nhật sơ đồ tổ chức hay danh bạ — cứ nói với mình là được. Kiểu “Mở sơ đồ tổ chức” là đủ.');
  var PILOT_FOLLOW = { deals: [L('受注額の多い担当者は？', 'Ai có doanh số đơn hàng cao nhất?'), L('10/1付の組織変更を予約して', 'Đặt lịch thay đổi cơ cấu ngày 1/10')], ae: [L('今月の受注を事業部別に集計して', 'Tổng hợp đơn hàng tháng này theo mảng')], hires: [L('佐藤 美咲さんを10/1付で人材戦略部へ異動', 'Chuyển Sato Misaki sang Phòng Chiến lược Nhân sự từ 1/10')], reads: [L('組織図を開いて', 'Mở sơ đồ tổ chức')] };
  var RING_SPIN = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 2A10 10 0 1 0 22 12A10 10 0 0 0 12 2Zm0 18a8 8 0 1 1 8-8A8 8 0 0 1 12 20Z" opacity="0.5" stroke-width="1" stroke="currentColor"/><path fill="currentColor" d="M20 12h2A10 10 0 0 0 12 2V4A8 8 0 0 1 20 12Z" stroke-width="1" stroke="currentColor">' + (REDUCED ? '' : '<animateTransform attributeName="transform" dur="1s" from="0 12 12" repeatCount="indefinite" to="360 12 12" type="rotate"/>') + '</path></svg>';
  function pilotWave() {
    var bars = [[0, 6, 14, '0.5s'], [6, 10, 4, '0.42s'], [12, 12, 5, '0.6s'], [18, 8, 14, '0.48s'], [24, 6, 11, '0.55s']];
    return '<svg class="jw-pilot-wave" viewBox="0 0 27 14" width="27" height="14" aria-hidden="true">' + bars.map(function (x) {
      var y0 = (14 - x[1]) / 2, y1 = (14 - x[2]) / 2, bg = REDUCED ? 'indefinite' : '0s';
      return '<rect x="' + x[0] + '" y="' + y0 + '" width="3" height="' + x[1] + '" rx="1.5" fill="currentColor"><animate attributeName="height" values="' + x[1] + ';' + x[2] + ';' + x[1] + '" dur="' + x[3] + '" begin="' + bg + '" repeatCount="indefinite"/><animate attributeName="y" values="' + y0 + ';' + y1 + ';' + y0 + '" dur="' + x[3] + '" begin="' + bg + '" repeatCount="indefinite"/></rect>';
    }).join('') + '</svg>';
  }
  function pilotCtxKey() {
    if (ROUTE.name === 'deals') return 'deals';
    if (ROUTE.name === 'home') return 'home';
    if (ROUTE.name === 'page' && PAGES[ROUTE.key].block.key === 'staff') return 'staff';
    return '_';
  }
  function pilotChipsHtml(list, fresh) {
    if (!list || !list.length) return '';
    return '<div class="jw-pilot-chips' + (fresh ? ' jw-pilot-in' : '') + '">' + list.map(function (c) {
      var label = tr(c);
      return '<button type="button" class="jw-pilot-chip jw-pilot-chip--ask" data-act="pilot-ask" data-q="' + esc(label) + '">' + esc(label) + '</button>';
    }).join('') + '</div>';
  }
  function pilotMsgChips(m) {
    var r = m.reply;
    if (r.chips === true) return (PILOT_SUGGEST[pilotCtxKey()] || PILOT_SUGGEST._).map(function (s) { return s.text; });
    return r.chips || null;
  }
  function pilotLiveIdx() { for (var i = PILOT.msgs.length - 1; i >= 0; i--) if (PILOT.msgs[i].who === 'bot') return i; return -1; }
  function pilotStepLi(s, fresh) {
    var state = s.state, label = state === 'run' ? STEP[s.key === 'permNo' ? 'perm' : s.key] : state === 'fail' ? STEP_DONE.permNo : STEP_DONE[s.key];
    return '<li class="jw-pilot-step jw-pilot-step--' + state + (fresh ? ' jw-pilot-in' : '') + '"><span class="jw-pilot-step-ico" aria-hidden="true">' +
      (state === 'run' ? RING_SPIN : state === 'done' ? ic('check-circle', 16) : ic('danger-triangle', 16)) + '</span><span class="jw-pilot-step-label">' + esc(tr(label)) + '</span></li>';
  }
  function pilotStatusInner() {
    if (!PILOT.status) PILOT.status = PILOT_LIVE.idle;
    var led = faceLed(PILOT.face)[0];
    return '<span class="jw-pilot-led" style="background:' + led + ';box-shadow:0 0 8px ' + led + '" aria-hidden="true"></span><span class="jw-pilot-status-text">' + esc(tr(PILOT.status)) + '</span>' + (PILOT.face === 'typing' ? pilotWave() : '');
  }
  function pilotWhoHtml(m) {
    var mood = m.reply.mood || PILOT_MOOD[m.reply.face];
    return '<div class="jw-pilot-who" aria-hidden="true">' + pilotMark(16, false).replace('class="jw-pmark"', 'class="jw-pmark jw-pilot-whoico"') + '<span>JOY PILOT</span>' +
      (mood && m.settled ? '<span class="jw-pilot-whomood jw-ptone--' + mood.tone + '">· ' + esc(tr(mood.label)) + '</span>' : '') + '</div>';
  }
  function pilotGutterHtml(m, live) {
    var mood = m.reply.mood || PILOT_MOOD[m.reply.face];
    return live ? '<button type="button" class="jw-pilot-facebtn" data-act="pilot-poke" aria-label="' + esc(t('JOY Pilot をくすぐる')) + '"></button>'
      : '<span class="jw-pilot-mood jw-ptone--' + (mood ? mood.tone : 'accent') + '"></span>';
  }
  function pilotTextHtml(m) {
    var text = tr(m.reply.text), shown = m.shown === Infinity ? text : text.slice(0, m.shown);
    return esc(shown) + (m.streaming ? '<span class="jw-pilot-caret" aria-hidden="true"></span>' : '') + (m.stopped ? '<span class="jw-pilot-stopped"> ' + esc(t('（停止しました）')) + '</span>' : '');
  }
  function pilotRowHtml(m, i, live, last) {
    if (m.who === 'me') return '<div class="jw-pilot-row jw-pilot-row--user" data-id="' + m.id + '"><p class="jw-pilot-bubble">' + esc(m.text) + '</p></div>';
    var steps = m.steps.length ? '<ol class="jw-pilot-steps">' + m.steps.map(function (s) { return pilotStepLi(s, false); }).join('') + '</ol>' : '';
    var hasText = m.shown > 0 || m.stopped;
    return '<div class="jw-pilot-row jw-pilot-row--bot' + (live ? ' jw-pilot-row--live' : '') + '" data-id="' + m.id + '">' +
      '<div class="jw-pilot-gutter" aria-hidden="true">' + pilotGutterHtml(m, live) + '</div>' +
      '<div class="jw-pilot-body"><span class="jw-sr">JOY Pilot: </span>' +
        (live ? '<div class="jw-pilot-status">' + pilotStatusInner() + '</div>' : pilotWhoHtml(m)) + steps +
        (hasText ? '<p class="jw-pilot-text">' + pilotTextHtml(m) + '</p>' : '') +
        (m.settled ? pilotCardHtml(m.reply.card) + (last && !PILOT.busy ? pilotChipsHtml(pilotMsgChips(m), false) : '') : '') +
      '</div></div>';
  }
  function pilotRow(m) { return $('#pilotBody .jw-pilot-row[data-id="' + m.id + '"]'); }
  // Gắn mặt sống (một phần tử duy nhất, tồn tại suốt phiên) vào hàng bot mới nhất
  function pilotAttachFace() {
    var btn = $('#pilotBody .jw-pilot-row--live .jw-pilot-facebtn');
    if (!btn) return;
    if (!PILOT.F) PILOT.F = pfCreate(72, PILOT.face);
    if (PILOT.F.el.parentNode !== btn) btn.appendChild(PILOT.F.el);
  }
  function pilotRenderLog() {
    var body = $('#pilotBody');
    if (!body) return;
    if (PILOT.tab === 'plans') { body.innerHTML = '<div class="jw-pilot-plans">' + pilotPlansHtml() + '</div>'; syncFades(body); return; }
    var live = pilotLiveIdx();
    body.innerHTML = '<div class="jw-pilot-thread" role="log" aria-label="JOY Pilot">' + PILOT.msgs.map(function (m, i) { return pilotRowHtml(m, i, i === live, i === PILOT.msgs.length - 1); }).join('') + '</div>';
    pilotAttachFace();
    syncFades(body);
  }
  function pilotToEnd(smooth) {
    var body = $('#pilotBody');
    if (!body || !PILOT.stick) return;
    if (smooth && !REDUCED) body.scrollTo({ top: body.scrollHeight, behavior: 'smooth' });
    else body.scrollTop = body.scrollHeight;
  }
  // Hàng bot trước đó thôi "sống": mặt → chấm tâm trạng, dòng trạng thái → "JOY PILOT · …", bỏ gợi ý
  function pilotDemote(m) {
    var row = pilotRow(m);
    if (!row) return;
    row.classList.remove('jw-pilot-row--live');
    var g = $('.jw-pilot-gutter', row); if (g) g.innerHTML = pilotGutterHtml(m, false);
    var st = $('.jw-pilot-status', row); if (st) st.outerHTML = pilotWhoHtml(m);
    var ch = $('.jw-pilot-chips', row); if (ch) ch.remove();
  }
  function pilotAppend(msgs) {
    var th = $('#pilotBody .jw-pilot-thread');
    if (!th) { pilotRenderLog(); return; }
    var prevLive = null;
    for (var i = PILOT.msgs.length - msgs.length - 1; i >= 0; i--) if (PILOT.msgs[i].who === 'bot') { prevLive = PILOT.msgs[i]; break; }
    if (prevLive) pilotDemote(prevLive);
    msgs.forEach(function (m) {
      var idx = PILOT.msgs.indexOf(m);
      th.insertAdjacentHTML('beforeend', pilotRowHtml(m, idx, m.who === 'bot', idx === PILOT.msgs.length - 1));
      th.lastElementChild.classList.add('jw-pilot-in');
    });
    pilotAttachFace();
    syncFades($('#pilotBody'));
    pilotToEnd(true);
  }
  function pilotPaintStatus() {
    var st = $('#pilotBody .jw-pilot-row--live .jw-pilot-status');
    if (!st) return;
    var led = faceLed(PILOT.face)[0], dot = $('.jw-pilot-led', st), txt = $('.jw-pilot-status-text', st), wave = $('.jw-pilot-wave', st);
    if (!dot) { st.innerHTML = pilotStatusInner(); return; }
    dot.style.background = led;
    dot.style.boxShadow = '0 0 8px ' + led;
    txt.textContent = tr(PILOT.status);
    if (PILOT.face === 'typing' && !wave) st.insertAdjacentHTML('beforeend', pilotWave());
    if (PILOT.face !== 'typing' && wave) wave.remove();
  }
  function pilotMood(face, status) {
    PILOT.face = face;
    if (status) PILOT.status = status;
    pfSet(PILOT.F, face);
    pilotPaintStatus();
  }
  function pilotBackToIdle(face, ms) {
    clearTimeout(PILOT.idleTimer);
    PILOT.idleTimer = setTimeout(function () { if (!PILOT.busy && PILOT.face === face) pilotMood('idle', PILOT_LIVE.idle); }, REDUCED ? Math.min(ms, 1500) : ms);
  }
  function pilotTouch() {
    PILOT.lastActive = Date.now();
    clearTimeout(PILOT.sleepTimer);
    PILOT.sleepTimer = setTimeout(function () {
      if (PILOT.open && !PILOT.busy && PILOT.face === 'idle') pilotMood('sleepy', PILOT_LIVE.sleepy);
    }, PT.sleep);
  }
  function pilotWake() {
    PILOT.wakeUntil = Date.now() + PT.wake;
    pilotMood('surprised', PILOT_LIVE.wake);
    clearTimeout(PILOT.idleTimer);
    PILOT.idleTimer = setTimeout(function () {
      if (PILOT.busy || PILOT.face !== 'surprised') return;
      var inp = $('#pilotInput');
      if (inp && inp.value.trim() && Date.now() - PILOT.lastType < PT.listen - 700) { pilotMood('listening', PILOT_LIVE.listening); pilotListenEnd(); }
      else pilotMood('idle', PILOT_LIVE.idle);
    }, PT.wake);
  }
  function pilotListenEnd() {
    clearTimeout(PILOT.listenTimer);
    PILOT.listenTimer = setTimeout(function () { if (!PILOT.busy && PILOT.face === 'listening') pilotMood('idle', PILOT_LIVE.idle); }, PT.listen);
  }
  function pilotOnType() {
    if (PILOT.busy) return;
    pilotTouch();
    PILOT.lastType = Date.now();
    if (PILOT.face === 'sleepy') { pilotWake(); return; }
    if (Date.now() < PILOT.wakeUntil) return;
    if (PILOT.face !== 'listening') pilotMood('listening', PILOT_LIVE.listening);
    pilotListenEnd();
  }
  // Chọt vào mặt: cười · quá 2 cú trong 30s thì cười ngắn rồi BỰC (chuyển thẳng) · đang ngủ thì dậy
  function pilotPoke(btn) {
    if (!REDUCED && btn && btn.animate) btn.animate([{ transform: 'scale(1)' }, { transform: 'scale(0.9, 0.86)' }, { transform: 'scale(1.04, 1.02)' }, { transform: 'scale(1)' }], { duration: 300, easing: 'ease-out' });
    if (PILOT.busy) return;
    pilotTouch();
    if (PILOT.face === 'sleepy') { pilotWake(); return; }
    var now = Date.now();
    PILOT.pokes = PILOT.pokes.filter(function (x) { return now - x < PT.pokeWindow; }).concat([now]);
    var mood = PILOT.pokes.length > 2 ? 'angry' : 'tickled';
    var act = PILOT.annoyPending ? 'wait' : mood === 'tickled' ? 'laugh' : PILOT.face === 'angry' ? 'annoyed' : 'laughThenAnnoy';
    if (act === 'wait') return;
    clearTimeout(PILOT.tickleTimer);
    PILOT.wakeUntil = 0;
    if (act === 'annoyed') { pilotMood('angry', PILOT_LIVE.annoyed); pilotBackToIdle('angry', PT.annoyed); return; }
    pilotMood('tickled', PILOT_LIVE.tickled);
    if (act === 'laugh') { pilotBackToIdle('tickled', PT.tickle); return; }
    PILOT.annoyPending = true;
    PILOT.tickleTimer = setTimeout(function () {
      PILOT.annoyPending = false;
      if (PILOT.busy || PILOT.face !== 'tickled') return;
      pilotMood('angry', PILOT_LIVE.annoyed);
      pilotBackToIdle('angry', PT.annoyed);
    }, PT.laughBeforeAnnoyed);
  }
  // Mắt nhìn theo chuột: phạm vi = 2,2 × cạnh mặt tính từ tâm; gộp theo rAF; chạm thì bỏ qua
  var pilotLookRaf = 0, pilotLookPt = null;
  if (!REDUCED) {
    document.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch' || !PILOT.open || !PILOT.F) return;
      pilotLookPt = { x: e.clientX, y: e.clientY };
      if (!pilotLookRaf) pilotLookRaf = requestAnimationFrame(function () {
        pilotLookRaf = 0;
        var F = PILOT.F;
        if (!F || !F.el.isConnected || !pilotLookPt) return;
        var r = F.el.getBoundingClientRect();
        var v = lookAt(pilotLookPt.x - (r.left + r.width / 2), pilotLookPt.y - (r.top + r.height / 2), r.width * 2.2);
        var c = F.look;
        if (c === v || (c && v && Math.abs(c.x - v.x) < 0.2 && Math.abs(c.y - v.y) < 0.2)) return;
        pfLook(F, v);
      });
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', function () { pilotLookPt = null; if (PILOT.F) pfLook(PILOT.F, null); });
  }
  function pilotLater(fn, ms) { var id = setTimeout(fn, REDUCED ? 0 : ms); PILOT.timers.push(id); }
  function pilotClearWork() {
    PILOT.timers.forEach(clearTimeout);
    PILOT.timers = [];
    if (PILOT.ticker) { clearInterval(PILOT.ticker); PILOT.ticker = null; }
  }
  function pilotSetBusy(on) {
    PILOT.busy = on;
    var s = $('#pilotSend');
    if (s) s.outerHTML = pilotSendHtml();
    var last = PILOT.msgs[PILOT.msgs.length - 1];
    if (on) { var ch = $('#pilotBody .jw-pilot-chips'); if (ch) ch.remove(); }
    else if (last && last.who === 'bot' && last.settled) {
      var row = pilotRow(last), body = row && $('.jw-pilot-body', row);
      if (body && !$('.jw-pilot-chips', body)) { body.insertAdjacentHTML('beforeend', pilotChipsHtml(pilotMsgChips(last), true)); pilotToEnd(true); }
    }
  }
  // Phím GỬI chọn được — cùng luật `shouldSend` của JOY Analytics: IME đang ghép chữ thì KHÔNG gửi
  // (Enter đầu tiên là chốt 変換/dấu); `ctrl` nhận cả ⌘; chế độ enter có modifier thì không gửi.
  var SEND_KEYS = ['enter', 'shift', 'ctrl'];
  var SEND_KEY_STORE = 'joystart_pilot_sendkey';
  var KEY_CAP = { enter: 'Enter', shift: 'Shift + Enter', ctrl: 'Ctrl / ⌘ + Enter' };
  var KEY_LABEL = { enter: 'Enter で送信', shift: 'Shift + Enter で送信', ctrl: 'Ctrl + Enter で送信' };
  var KEY_DESC = { enter: '改行：Shift + Enter', shift: '改行：Enter', ctrl: '改行：Enter' };
  PILOT.sendKey = (function (v) { return v === 'shift' || v === 'ctrl' ? v : 'enter'; })(load(SEND_KEY_STORE, 'enter'));
  PILOT.keyMenu = false;
  function shouldSend(mode, e) {
    if (e.key !== 'Enter') return false;
    if (e.isComposing || e.keyCode === 229) return false;
    var mod = e.ctrlKey || e.metaKey;
    if (mode === 'enter') return !e.shiftKey && !mod;
    if (mode === 'shift') return e.shiftKey && !mod;
    return mod;
  }
  function pilotKeyBtnHtml() {
    return '<button type="button" class="jw-pilot-keybtn" id="pilotKeyBtn" data-act="pilot-keys" aria-haspopup="menu" aria-expanded="' + PILOT.keyMenu + '">' +
      ic('keyboard', 16) + '<span>' + esc(t(KEY_LABEL[PILOT.sendKey])) + '</span>' + ic('alt-arrow-up', 12) + '</button>';
  }
  function pilotHintText() { return t(PILOT.sendKey === 'enter' ? 'Shift + Enter で改行' : 'Enter で改行'); }
  function pilotKeyMenuOpen() {
    var box = $('#pilot .jw-pilot-box'), btn = $('#pilotKeyBtn');
    if (!box || !btn) return;
    PILOT.keyMenu = true;
    btn.setAttribute('aria-expanded', 'true');
    var m = document.createElement('div');
    m.className = 'jw-pilot-keys';
    m.id = 'pilotKeys';
    m.setAttribute('role', 'menu');
    m.setAttribute('aria-label', t('送信キー'));
    m.innerHTML = '<div class="jw-pilot-keys-head" aria-hidden="true">' + esc(t('送信キー')) + '</div>' + SEND_KEYS.map(function (k) {
      var on = k === PILOT.sendKey;
      return '<button type="button" role="menuitemradio" aria-checked="' + on + '" class="jw-pilot-key' + (on ? ' jw-pilot-key--on' : '') + '" data-act="pilot-key" data-v="' + k + '">' +
        '<kbd class="jw-pilot-kbd">' + esc(KEY_CAP[k]) + '</kbd><span class="jw-pilot-keydesc">' + esc(t(KEY_DESC[k])) + '</span>' +
        '<span class="jw-pilot-keycheck" aria-hidden="true">' + (on ? ic('check-circle', 16) : '') + '</span></button>';
    }).join('');
    document.body.appendChild(m);
    // Mọc NGAY TRÊN ô nhập, canh mép trái; hẹp hơn 320px thì theo bề ngang ô nhập
    var r = box.getBoundingClientRect(), w = Math.min(320, r.width);
    m.style.width = w + 'px';
    m.style.left = Math.max(8, Math.min(r.left, innerWidth - w - 8)) + 'px';
    m.style.top = Math.max(8, r.top - m.offsetHeight - 8) + 'px';
    var cur = $('.jw-pilot-key--on', m);
    if (cur) cur.focus({ preventScroll: true });
  }
  function pilotKeyMenuClose(refocus) {
    var m = $('#pilotKeys');
    if (m) m.remove();
    PILOT.keyMenu = false;
    var btn = $('#pilotKeyBtn');
    if (btn) { btn.setAttribute('aria-expanded', 'false'); if (refocus) btn.focus({ preventScroll: true }); }
  }
  function pilotPickKey(k) {
    PILOT.sendKey = SEND_KEYS.indexOf(k) >= 0 ? k : 'enter';
    save(SEND_KEY_STORE, PILOT.sendKey);
    pilotKeyMenuClose(false);
    var btn = $('#pilotKeyBtn'); if (btn) btn.outerHTML = pilotKeyBtnHtml();
    var h = $('#pilot .jw-pilot-hint'); if (h) h.textContent = pilotHintText();
    var inp = $('#pilotInput'); if (inp) inp.focus({ preventScroll: true });
  }
  function pilotSendHtml() {
    return PILOT.busy
      ? '<button type="button" class="jw-pilot-send jw-pilot-send--stop" id="pilotSend" data-act="pilot-stop" aria-label="' + esc(t('停止')) + '" data-tip="' + esc(t('停止')) + '">' + ic('stop-circle', 20) + '</button>'
      : '<button type="button" class="jw-pilot-send" id="pilotSend" data-act="pilot-send" aria-label="' + esc(t('送信')) + '" data-tip="' + esc(t('送信')) + '（Enter）">' + ic('undo-left', 20) + '</button>';
  }
  function pilotUpdSteps(m) {
    var row = pilotRow(m);
    if (!row) return;
    var ol = $('.jw-pilot-steps', row);
    if (!ol) {
      var anchor = $('.jw-pilot-status, .jw-pilot-who', row);
      anchor.insertAdjacentHTML('afterend', '<ol class="jw-pilot-steps jw-pilot-in"></ol>');
      ol = $('.jw-pilot-steps', row);
    }
    m.steps.forEach(function (s, i) {
      var li = ol.children[i];
      if (!li) { ol.insertAdjacentHTML('beforeend', pilotStepLi(s, true)); return; }
      if (!li.classList.contains('jw-pilot-step--' + s.state)) li.outerHTML = pilotStepLi(s, false);
    });
    pilotToEnd(false);
  }
  function pilotUpdText(m) {
    var row = pilotRow(m);
    if (!row) return;
    var p = $('.jw-pilot-text', row);
    if (!p) { $('.jw-pilot-body', row).insertAdjacentHTML('beforeend', '<p class="jw-pilot-text jw-pilot-in"></p>'); p = $('.jw-pilot-text', row); }
    p.innerHTML = pilotTextHtml(m);
    pilotToEnd(false);
  }
  function pilotSettle(m) {
    var row = pilotRow(m);
    if (!row) return;
    var body = $('.jw-pilot-body', row);
    var card = pilotCardHtml(m.reply.card);
    if (card) {
      body.insertAdjacentHTML('beforeend', card);
      var el = body.lastElementChild;
      el.classList.add('jw-pilot-in');
      if (!REDUCED) $$('[data-count-to]', el).forEach(function (n) { countUp(n, 1000, 180); });
    }
    pilotToEnd(true);
  }
  function pilotStream(m, done) {
    var total = tr(m.reply.text).length;
    var step = total > 110 ? PT.charsPerTick : 1;
    m.streaming = true;
    m.shown = 0;
    if (REDUCED) { m.shown = Infinity; m.streaming = false; pilotUpdText(m); done(); return; }
    PILOT.ticker = setInterval(function () {
      m.shown = Math.min(total, m.shown + step);
      if (m.shown >= total) {
        clearInterval(PILOT.ticker); PILOT.ticker = null;
        m.streaming = false; m.shown = Infinity;
        pilotUpdText(m);
        done();
        return;
      }
      pilotUpdText(m);
    }, PT.tick);
  }
  function pilotFinish(m) {
    var r = m.reply;
    m.settled = true;
    pilotSettle(m);
    pilotMood(r.face || 'happy', r.status || PILOT_LIVE.idle);
    pilotSetBusy(false);
    pilotTouch();
    pilotBackToIdle(r.face || 'happy', PT.holdMood);
  }
  function pilotGreet() {
    var m = { who: 'bot', id: 'm' + (++PILOT.seq), reply: { text: PILOT_GREETING, face: 'happy', status: PILOT_LIVE.idle, chips: true, card: null }, steps: [], shown: 0, streaming: false, settled: false };
    PILOT.msgs.push(m);
    PILOT.stick = true;
    pilotAppend([m]);
    pilotSetBusy(true);
    pilotMood('typing', PILOT_LIVE.typing);
    pilotLater(function () { pilotStream(m, function () { pilotFinish(m); }); }, 380);
  }
  // Mặt + câu trạng thái của câu trả lời (planReply chỉ lo nội dung)
  function pilotMeta(r) {
    var c = r.card;
    if (r.face) return r;
    if (c && c.type === 'deny') { r.face = 'sad'; r.status = L('権限のリクエストをお待ちしています', 'Chờ bạn gửi yêu cầu cấp quyền'); r.mood = { label: L('権限なし', 'Không có quyền'), tone: 'warn' }; }
    else if (c && c.type === 'plan') { r.face = 'happy'; r.status = L('内容を確認してください', 'Bạn kiểm tra nội dung giúp mình nhé'); r.mood = { label: L('変更案', 'Phương án'), tone: 'accent' }; }
    else if (c && c.type === 'table') { r.face = 'happy'; r.status = L('まとめました', 'Đã tổng hợp xong'); r.chips = PILOT_FOLLOW[c.kind]; }
    else if (c && c.type === 'page') { r.face = 'success'; r.status = L('ページを開きました', 'Đã mở trang'); }
    else if (r.run) { r.face = 'success'; r.status = L('できました', 'Xong rồi'); }
    else { r.face = 'happy'; r.status = PILOT_LIVE.idle; }
    return r;
  }
  function pilotSend(raw) {
    var text = String(raw || '').trim();
    if (!text || PILOT.busy) return;
    if (PILOT.tab !== 'chat') { PILOT.tab = 'chat'; renderPilot(); }
    pilotClearWork();
    clearTimeout(PILOT.idleTimer); clearTimeout(PILOT.listenTimer); clearTimeout(PILOT.tickleTimer);
    PILOT.annoyPending = false; PILOT.wakeUntil = 0;
    pilotTouch();
    var inp = $('#pilotInput');
    if (inp) { inp.value = ''; pilotGrow(inp); }
    var r = pilotMeta(pilotPlan(text));
    var u = { who: 'me', id: 'm' + (++PILOT.seq), text: text };
    var m = { who: 'bot', id: 'm' + (++PILOT.seq), reply: r, steps: [], shown: 0, streaming: false, settled: false };
    PILOT.msgs.push(u, m);
    PILOT.stick = true;
    pilotSetBusy(true);
    pilotAppend([u, m]);
    var keys = r.steps || [];
    var run = r.run;
    function answer() {
      pilotMood('typing', PILOT_LIVE.typing);
      if (run) { var f = run; run = null; f(); }
      pilotStream(m, function () { pilotFinish(m); });
    }
    if (!keys.length) {
      pilotLater(function () { pilotMood('thinking', PILOT_LIVE.thinking); }, 0);
      pilotLater(answer, PT.think);
      return;
    }
    var t0 = PT.firstStep;
    keys.forEach(function (k, i) {
      var start = t0, end = t0 + (i === 2 ? PT.queryStep : PT.step);
      t0 = end;
      pilotLater(function () {
        m.steps.push({ key: k, state: 'run' });
        pilotUpdSteps(m);
        var lab = STEP[k === 'permNo' ? 'perm' : k];
        pilotMood(STEP_FACE[k] || 'thinking', L(lab.ja + '…', lab.vi + '…'));
        if (k === 'page' && run) { var f = run; run = null; pilotLater(f, 400); }
      }, start);
      pilotLater(function () { m.steps[i].state = k === 'permNo' ? 'fail' : 'done'; pilotUpdSteps(m); }, end);
    });
    pilotLater(answer, t0 + 200);
  }
  function pilotStop() {
    if (!PILOT.busy) return;
    pilotClearWork();
    var m = PILOT.msgs[PILOT.msgs.length - 1];
    if (m && m.who === 'bot') {
      m.streaming = false; m.stopped = true;
      m.steps.forEach(function (s) { if (s.state === 'run') s.state = 'fail'; });
      pilotUpdSteps(m);
      pilotUpdText(m);
    }
    pilotSetBusy(false);
    pilotMood('surprised', PILOT_LIVE.stopped);
    pilotBackToIdle('surprised', PT.stopped);
  }

  function pilotCardHtml(c) {
    if (!c) return '';
    if (c.type === 'page') {
      var p = PAGES[c.key];
      return '<a class="jw-pilot-card jw-pilot-pagecard" href="' + href(c.key) + '">' + nodeIcon(p.node, 18) + '<span><small>' + esc(pathLabel(p)) + '</small><b>' + esc(nm(p.node)) + '</b></span>' + ic('alt-arrow-right', 15) + '</a>';
    }
    if (c.type === 'deny') {
      return '<div class="jw-pilot-card jw-pilot-deny">' + ic('lock-keyhole-minimalistic', 20) +
        '<div><b>' + esc(t('権限が必要です')) + '</b><p>' + esc(t('「{x}」は人材戦略部の管理者が付与します。依頼すると、承認後に私からも操作できるようになります。', { x: tr(c.what) })) + '</p>' +
        '<div class="jw-pilot-actions"><button type="button" class="jw-btn jw-btn--sm" data-act="pilot-perm">' + t('権限をリクエスト') + '</button>' +
        '<a class="jw-btn jw-btn--ghost jw-btn--sm" href="' + setHref('権限') + '">' + t('権限の一覧') + '</a></div></div></div>';
    }
    if (c.type === 'table') {
      var tb = pilotTable(c.kind);
      var max = tb.rows.reduce(function (m, r) { return Math.max(m, r.v); }, 0) || 1;
      var total = tb.rows.reduce(function (s, r) { return s + r.v; }, 0);
      return '<figure class="jw-pilot-card jw-pilot-table">' +
        '<figcaption><b>' + esc(tr(tb.title)) + '</b><span class="jw-pilot-sample">' + esc(t('サンプルデータ')) + '</span></figcaption>' +
        '<div class="jw-pilot-rows">' + tb.rows.map(function (r) {
          var val = tb.money ? cnt(r.v, 'yen') : tb.pct ? cnt(r.v) + '%' : cnt(r.v);
          return '<div class="jw-pilot-trow' + (r.prod ? ' jw-prod' : '') + '"' + (r.prod ? prodStyle(r.prod) : '') + '><span class="jw-pilot-tlabel" title="' + esc(r.label) + '">' + (r.prod ? prodDot(r.prod) : '') + esc(r.label) + '</span>' +
            (tb.cols.length > 2 ? '<span class="jw-pilot-tn jw-num">' + cnt(r.n) + '</span>' : '') +
            '<span class="jw-pilot-tv jw-num">' + val + '</span>' +
            '<span class="jw-pilot-tbar" style="--w:' + Math.max(4, Math.round(r.v / max * 100)) + '%"></span></div>';
        }).join('') + '</div>' +
        (tb.money ? '<div class="jw-pilot-ttotal"><span>' + t('合計') + '</span><b class="jw-num">' + cnt(total, 'yen') + '</b></div>' : '') +
        '<div class="jw-pilot-actions">' + (tb.link ? '<a class="jw-btn jw-btn--ghost jw-btn--sm" href="' + tb.link + '">' + esc(tr(tb.linkLabel)) + ic('alt-arrow-right', 14) + '</a>' : '') +
          (c.csv ? '<button type="button" class="jw-btn jw-btn--ghost jw-btn--sm" data-act="pilot-csv" data-v="' + c.kind + '">' + ic('copy', 14) + t('CSVをコピー') + '</button>' : '') + '</div>' +
      '</figure>';
    }
    if (c.type === 'plan') return pilotPlanCard(planById(c.id));
    return '';
  }
  function planStateHtml(p) {
    if (p.state === 'scheduled') return '<div class="jw-pilot-state jw-pilot-state--sched">' + ic('clock-circle', 16) + '<span>' + esc(t('予約済み — {d} 0:00 に自動で反映します', { d: fmtYMDw(p.date) })) + '</span>' +
      '<button type="button" class="jw-linkbtn-sm" data-act="pilot-plan" data-v="cancel" data-id="' + p.id + '">' + t('予約を取り消す') + '</button></div>';
    if (p.state === 'applied') return '<div class="jw-pilot-state jw-pilot-state--ok">' + ic('check-circle', 16) + '<span>' + esc(t('反映しました — {d}', { d: fmtYMDw(p.appliedAt || pilotToday()) })) + '</span>' +
      (p.danger ? '<button type="button" class="jw-linkbtn-sm" data-act="pilot-plan" data-v="undo" data-id="' + p.id + '">' + t('元に戻す') + '</button>' : '') + '</div>';
    if (p.state === 'draft') return '<div class="jw-pilot-state">' + ic('document-add', 16) + '<span>' + esc(t('下書きに保存しました')) + '</span>' +
      '<button type="button" class="jw-linkbtn-sm" data-act="pilot-plan" data-v="reopen" data-id="' + p.id + '">' + t('続きを編集') + '</button></div>';
    if (p.state === 'cancelled') return '<div class="jw-pilot-state jw-pilot-state--off">' + ic('close-circle', 16) + '<span>' + esc(t('取り消しました（何も変更していません）')) + '</span></div>';
    var future = p.date && daysLeft(p.date) > 0;
    return '<div class="jw-pilot-actions">' +
      (future ? '<button type="button" class="jw-btn jw-btn--solid jw-btn--sm" data-act="pilot-plan" data-v="schedule" data-id="' + p.id + '">' + ic('calendar-mark', 15) + esc(t('{d}に予約', { d: fmtMDs(p.date) })) + '</button>' : '') +
      '<button type="button" class="jw-btn ' + (future ? 'jw-btn--ghost' : p.danger ? 'jw-btn--danger' : 'jw-btn--solid') + ' jw-btn--sm" data-act="pilot-plan" data-v="apply" data-id="' + p.id + '">' + esc(p.danger ? t('名簿から外す') : t('今すぐ反映')) + '</button>' +
      '<button type="button" class="jw-btn jw-btn--ghost jw-btn--sm" data-act="pilot-plan" data-v="draft" data-id="' + p.id + '">' + t('下書きに保存') + '</button>' +
      '<button type="button" class="jw-pilot-textbtn" data-act="pilot-plan" data-v="cancel" data-id="' + p.id + '">' + t('やめる') + '</button></div>';
  }
  function pilotPlanCard(p) {
    if (!p) return '';
    var icon = p.kind === 'org' ? ic('structure', 18) : p.kind === 'move' ? ic('transfer-horizontal', 18) : p.kind === 'add' ? ic('user-plus-rounded', 18) : ic('user-minus-rounded', 18);
    var body = p.rows
      ? '<ul class="jw-pilot-changes">' + p.rows.map(function (r) { return '<li><span class="jw-pilot-kind jw-pilot-kind--' + r.kind + '">' + esc(tr(r.label)) + '</span><span>' + esc(tr(r.text)) + '</span></li>'; }).join('') + '</ul>'
      : '<div class="jw-pilot-person">' + ic('user-rounded', 16) + '<b>' + esc(tr(p.person.name)) + '</b><span>' + esc(deptName(p.person.dept)) + '</span></div>' +
        '<dl class="jw-pilot-diff">' + p.diff.map(function (d) {
          var f = d.dept ? deptName(d.from) : tr(d.from), to = d.dept ? deptName(d.to) : tr(d.to);
          return '<div><dt>' + esc(tr(d.label)) + '</dt><dd><s>' + esc(f) + '</s>' + ic('arrow-right', 13) + '<ins>' + esc(to) + '</ins></dd></div>';
        }).join('') + '</dl>';
    return '<section class="jw-pilot-card jw-pilot-plan' + (p.danger ? ' jw-pilot-plan--danger' : '') + '" data-plan="' + p.id + '" data-state="' + p.state + '">' +
      '<header class="jw-pilot-plan-head">' + icon + '<b>' + esc(tr(p.title)) + '</b><span class="jw-pilot-perm">' + ic('shield-check', 13) + esc(t('編集権限あり')) + '</span></header>' +
      body +
      '<div class="jw-pilot-meta"><span>' + ic('calendar', 14) + esc(t('適用日')) + '：<b>' + (p.date ? esc(fmtYMDw(p.date)) + (daysLeft(p.date) > 0 ? ' <em>' + esc(t('あと{n}日', { n: daysLeft(p.date) })) + '</em>' : '') : esc(t('指定なし（今すぐ）'))) + '</b></span>' +
        '<span>' + ic('database', 14) + esc(t('反映先')) + '：' + esc(tr(p.target)) + '</span></div>' +
      planStateHtml(p) + '</section>';
  }
  function pilotPlansHtml() {
    var groups = [
      { id: 'scheduled', label: t('予約中'), icon: 'clock-circle' },
      { id: 'draft', label: t('下書き'), icon: 'document-add' },
      { id: 'applied', label: t('反映済み（操作ログ）'), icon: 'history' }
    ];
    var any = PILOT.plans.some(function (p) { return p.state === 'scheduled' || p.state === 'draft' || p.state === 'applied'; });
    if (!any) return '<div class="jw-pilot-empty">' + ic('calendar-add', 34) + '<b>' + esc(t('予約や下書きはまだありません')) + '</b><p>' + esc(t('日付を指定して変更を頼むと、当日まで下書きとして保持し、0:00に自動で反映します。')) + '</p>' +
      pilotChipsHtml([PILOT_SUGGEST._[2].text], false) + '</div>';
    return groups.map(function (g) {
      var list = PILOT.plans.filter(function (p) { return p.state === g.id; });
      if (!list.length) return '';
      return '<section class="jw-pilot-plans-sec"><h4>' + ic(g.icon, 15) + esc(g.label) + '<span class="jw-num">' + list.length + '</span></h4>' + list.map(function (p) {
        var d = p.date || p.appliedAt || pilotToday();
        return '<article class="jw-pilot-item" data-state="' + p.state + '"><span class="jw-pilot-date"><b class="jw-num">' + fmtMDs(d) + '</b><small>' + WD[LANG][d.getDay()] + '</small></span>' +
          '<span class="jw-pilot-item-body"><b>' + esc(tr(p.title)) + '</b><small>' + esc(tr(p.target)) + (p.state === 'scheduled' && p.date ? ' · ' + esc(t('あと{n}日', { n: daysLeft(p.date) })) : '') + '</small></span>' +
          '<span class="jw-pilot-item-act">' +
            (p.state === 'scheduled' ? '<button type="button" class="jw-pilot-textbtn" data-act="pilot-advance" data-id="' + p.id + '" data-tip="' + esc(t('デモ用：適用日まで時間を進めて、自動反映を確認します')) + '">' + ic('forward', 14) + t('当日にする') + '</button>' +
              '<button type="button" class="jw-pilot-textbtn" data-act="pilot-plan" data-v="cancel" data-id="' + p.id + '">' + t('取り消す') + '</button>' : '') +
            (p.state === 'draft' ? '<button type="button" class="jw-pilot-textbtn" data-act="pilot-plan" data-v="reopen" data-id="' + p.id + '">' + t('続きを編集') + '</button>' : '') +
          '</span></article>';
      }).join('') + '</section>';
    }).join('');
  }
  function pilotCountPlans() { return PILOT.plans.filter(function (p) { return p.state === 'scheduled' || p.state === 'draft'; }).length; }
  function pilotTabsHtml() {
    var n = pilotCountPlans();
    return seg('pilot-tab', [{ v: 'chat', label: t('チャット') }, { v: 'plans', label: t('予約・下書き') + (n ? ' ' + n : '') }], PILOT.tab, 'JOY Pilot', 'pilotTab');
  }
  function pilotHtml() {
    var page = pageTitleText();
    return '<header class="jw-pilot-head">' +
        '<span class="jw-pilot-avatar jw-pmark-host">' + pilotMark(26, true) + '</span>' +
        '<span class="jw-pilot-brand">' + pilotWordmark() +
          '<span class="jw-pilot-link" tabindex="0" data-tip="' + esc(t('デモモード — BigQuery MCP にはまだ接続していません。回答はサンプルデータです。')) + '" data-tip-pos="bottom" aria-label="' + esc(t('接続状態：デモ')) + '"><span class="jw-pilot-dot"></span></span></span>' +
        '<span class="jw-pilot-head-sp"></span>' +
        '<button type="button" class="jw-iconbtn" data-act="pilot-new" aria-label="' + esc(t('会話をクリア')) + '" data-tip="' + esc(t('会話をクリア')) + '" data-tip-pos="bottom">' + ic('notification-lines-remove', 18) + '</button>' +
        '<button type="button" class="jw-iconbtn jw-pilot-fullbtn" data-act="pilot-full" aria-pressed="' + PILOT.full + '" aria-label="' + esc(PILOT.full ? t('パネルに戻す') : t('広げる')) + '" data-tip="' + esc(PILOT.full ? t('パネルに戻す') : t('広げる')) + '" data-tip-pos="bottom">' + (PILOT.full ? ic('minimize-square-minimalistic', 18) : ic('maximize-square-minimalistic', 18)) + '</button>' +
        '<button type="button" class="jw-iconbtn" data-act="pilot-close" aria-label="' + esc(t('閉じる')) + '" data-tip="' + esc(t('閉じる')) + '（Esc）" data-tip-pos="bottom">' + ic('close', 18) + '</button>' +
      '</header>' +
      '<div class="jw-pilot-tabs">' + pilotTabsHtml() + '</div>' +
      '<div class="jw-pilot-scroll" id="pilotBody" data-fade-y aria-busy="' + PILOT.busy + '"></div>' +
      '<div class="jw-pilot-foot">' +
        '<div class="jw-pilot-ctx"><span class="jw-pilot-ctx-page" data-tip="' + esc(t('JOY Pilot はこのページの内容をふまえて答えます')) + '">' + ic('document', 13) + '<span>' + esc(page) + '</span></span>' +
          '<span class="jw-pilot-ctx-perm" data-tip="' + esc(tr(PILOT_ME.role)) + '">' + ic('key-square', 13) + '<span>' + esc(t('組織図・名簿を編集できます')) + '</span></span></div>' +
        '<div class="jw-pilot-box">' +
          '<textarea id="pilotInput" class="jw-pilot-input" rows="1" placeholder="' + esc(t('JOY Pilot に頼む…')) + '" aria-label="' + esc(t('JOY Pilot に頼む…')) + '"></textarea>' +
          '<div class="jw-pilot-bar">' + pilotKeyBtnHtml() + '<span class="jw-pilot-hint">' + esc(pilotHintText()) + '</span>' + pilotSendHtml() + '</div>' +
        '</div>' +
      '</div>';
  }
  function renderPilotBtn() {
    var b = $('#pilotBtn');
    if (!b) return;
    if (!b.firstChild) b.innerHTML = pilotMark(26, true);
    b.setAttribute('aria-expanded', String(PILOT.open));
    b.setAttribute('aria-label', 'JOY Pilot');
    b.setAttribute('data-tip', 'JOY Pilot BETA（' + (/Mac|iP/.test(navigator.platform || '') ? '⌘J' : 'Ctrl+J') + '）');
  }
  function pilotSync() {
    var h = document.documentElement;
    if (PILOT.open) h.setAttribute('data-pilot', PILOT.full ? 'full' : 'dock'); else h.removeAttribute('data-pilot');
    renderPilotBtn();
  }
  // Vẽ lại cả panel (mở · đổi tab · đổi ngôn ngữ). Hàng chat vẽ KHÔNG kèm hiệu ứng vào; mặt sống giữ nguyên.
  function renderPilot() {
    var box = $('#pilot');
    if (!box) return;
    if (PILOT.keyMenu) pilotKeyMenuClose(false);
    var sg = $('.jw-seg[data-seg="pilotTab"]', box);
    var old = sg ? sg.style.getPropertyValue('--seg-i') : null;
    var draft = $('#pilotInput', box);
    var keep = draft ? draft.value : '';
    var hadFocus = draft && document.activeElement === draft;
    var ob = $('#pilotBody', box);
    var oldTop = ob ? ob.scrollTop : 0, oldTab = box.getAttribute('data-tab');
    box.innerHTML = pilotHtml();
    box.setAttribute('data-tab', PILOT.tab);
    var sg2 = $('.jw-seg[data-seg="pilotTab"]', box);
    var now = sg2.style.getPropertyValue('--seg-i');
    if (old != null && old !== now) sg2.style.setProperty('--seg-i', old);
    var inp = $('#pilotInput', box);
    inp.value = keep;
    pilotRenderLog();
    pilotGrow(inp);
    void box.offsetWidth;
    if (old != null && old !== now) sg2.style.setProperty('--seg-i', now);
    if (hadFocus) inp.focus({ preventScroll: true });
    var nb = $('#pilotBody', box);
    nb.scrollTop = oldTab === PILOT.tab && !PILOT.stick ? oldTop : nb.scrollHeight;
    syncFades(box);
  }
  function pilotRefreshTabs() {
    var tb = $('#pilot .jw-pilot-tabs');
    if (tb) tb.innerHTML = pilotTabsHtml();
  }
  // Đổi trang ⇒ gợi ý của lời chào (chips theo ngữ cảnh) đổi theo
  function pilotRefreshChips() {
    var last = PILOT.msgs[PILOT.msgs.length - 1];
    if (!PILOT.open || PILOT.busy || !last || last.who !== 'bot' || !last.settled || last.reply.chips !== true) return;
    var row = pilotRow(last), ch = row && $('.jw-pilot-chips', row);
    if (ch) ch.outerHTML = pilotChipsHtml(pilotMsgChips(last), false);
  }
  function pilotGrow(el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 150) + 'px'; }
  function openPilot(q) {
    closeMenu(); closeInbox(); closeGs(); hideTip();
    if (!PILOT.open) {
      PILOT.open = true;
      var box = $('#pilot');
      box.hidden = false;
      renderPilot();
      void box.offsetWidth;
      box.classList.add('jw-pilot--open');
      pilotSync();
      pilotTouch();
    }
    if (narrow()) S.drawer = false;
    if (q) pilotSend(q);
    else {
      if (!PILOT.msgs.length && !PILOT.busy) pilotGreet();
      var inp = $('#pilotInput');
      if (inp) setTimeout(function () { inp.focus({ preventScroll: true }); }, REDUCED ? 0 : 120);
    }
  }
  function closePilot() {
    if (!PILOT.open) return;
    pilotKeyMenuClose(false);
    PILOT.open = false;
    var box = $('#pilot');
    box.classList.remove('jw-pilot--open');
    pilotSync();
    setTimeout(function () { if (!PILOT.open) box.hidden = true; }, REDUCED ? 0 : 320);
    var b = $('#pilotBtn');
    if (b && box.contains(document.activeElement)) b.focus({ preventScroll: true });
  }
  function pilotClear() {
    pilotClearWork();
    clearTimeout(PILOT.idleTimer); clearTimeout(PILOT.tickleTimer); clearTimeout(PILOT.listenTimer);
    PILOT.msgs = [];
    PILOT.busy = false;
    PILOT.annoyPending = false;
    PILOT.plans = PILOT.plans.filter(function (p) { return p.state !== 'proposed'; });
    PILOT.tab = 'chat';
    PILOT.face = 'idle'; PILOT.status = PILOT_LIVE.idle;
    pfSet(PILOT.F, 'idle');
    renderPilot();
    pilotGreet();
  }
  // Thẻ phương án: chỉ thay ĐÚNG thẻ đó (không vẽ lại hội thoại) + mặt robot phản ứng
  function pilotPlanAct(id, v) {
    var p = planById(id);
    if (!p) return;
    if (v === 'schedule') { p.state = 'scheduled'; toast(t('{d} 0:00 に自動で反映する予約を入れました', { d: fmtMDs(p.date) }), ic('calendar-mark', 16)); pilotMood('success', L('予約しました · ' + fmtYMDw(p.date) + ' 0:00 に反映', 'Đã đặt lịch · áp dụng 0:00 ngày ' + fmtMDs(p.date))); pilotBackToIdle('success', PT.holdMood); }
    else if (v === 'apply') { p.state = 'applied'; p.appliedAt = pilotToday(); toast(p.danger ? t('名簿から外しました（30日間は元に戻せます）') : t('変更を反映しました'), ic('check-circle', 16)); pilotMood('success', L('反映しました', 'Đã áp dụng')); pilotBackToIdle('success', PT.holdMood); }
    else if (v === 'draft') { p.state = 'draft'; toast(t('下書きに保存しました'), ic('document-add', 16)); pilotMood('wink', L('下書きに保存しました', 'Đã lưu bản nháp')); pilotBackToIdle('wink', PT.holdMood); }
    else if (v === 'reopen') { p.state = 'proposed'; }
    else if (v === 'undo') { p.state = 'cancelled'; toast(t('元に戻しました'), ic('restart', 16)); pilotMood('moved', L('元に戻しました', 'Đã khôi phục')); pilotBackToIdle('moved', PT.holdMood); }
    else if (v === 'cancel') { p.state = 'cancelled'; }
    if (v === 'reopen' && PILOT.tab !== 'chat') { PILOT.tab = 'chat'; renderPilot(); }
    else if (PILOT.tab === 'plans') pilotRenderLog();
    else $$('#pilot [data-plan="' + id + '"]').forEach(function (el) { el.outerHTML = pilotPlanCard(p); });
    pilotRefreshTabs();
    if (v === 'reopen') { var el = $('#pilot [data-plan="' + id + '"]'); if (el) el.scrollIntoView({ block: 'center', behavior: REDUCED ? 'auto' : 'smooth' }); }
  }
  // Demo: tua tới ngày áp dụng ⇒ bản nháp TỰ áp, có thông báo — đúng hành vi "đợi tới 1/10 thì tự lên"
  function pilotAdvance(id) {
    var p = planById(id);
    if (!p || p.state !== 'scheduled') return;
    p.state = 'applied';
    p.appliedAt = p.date;
    toast(t('{d} 0:00 — 予約していた「{x}」を自動で反映しました', { d: fmtMDs(p.date), x: tr(p.title) }), pilotMark(18, false));
    pilotMood('celebrate', L('予約していた変更を反映しました', 'Đã áp dụng thay đổi theo lịch'));
    pilotBackToIdle('celebrate', PT.holdMood);
    pilotRenderLog();
    pilotRefreshTabs();
  }

  function pilotCsv(kind) {
    var tb = pilotTable(kind);
    var csv = [tb.cols.join(',')].concat(tb.rows.map(function (r) { return [r.label, tb.cols.length > 2 ? r.n : null, r.v].filter(function (x) { return x !== null; }).join(','); })).join('\n');
    try { if (navigator.clipboard) navigator.clipboard.writeText(csv); } catch (e) { /* bỏ qua */ }
    toast(t('CSVをクリップボードにコピーしました'), ic('copy', 16));
  }

  // ── §Khởi động ──
  LANG = load(KEY.lang, 'ja') === 'vi' ? 'vi' : 'ja';
  document.documentElement.lang = LANG;
  applyTheme();
  window.addEventListener('hashchange', onRoute);
  if (!location.hash) { try { history.replaceState(null, '', '#/home'); } catch (e) { /* file:// */ } }
  onRoute();
  renderPilotBtn();
  // Cho script kiểm (tools/verify.mjs) đọc danh sách trang + chữ chưa dịch
  window.__JOYSTART__ = { pages: PAGE_LIST.map(function (p) { return p.key; }), routes: PAGE_LIST.map(function (p) { return '#/' + p.path; }), missing: I18N_MISSING, announce: ANNOUNCEMENTS.map(function (a) { return a.id; }), settings: SETTINGS_TABS.map(function (x) { return x.slug; }) };
})();
