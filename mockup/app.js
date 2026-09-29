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
      '<span class="jw-tree-icon">' + ic(n.icon, 15) + '</span><span class="jw-tree-name">' + esc(nm(n)) + '</span>' +
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
        '<span class="jw-tree-icon">' + ic(n.icon, 15) + '</span><span class="jw-tree-name">' + esc(nm(n)) + '</span>' +
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
      return '<div class="jw-sn-fav-item"><a class="jw-sn-fav" href="' + href(k) + '">' + ic(p.node.icon, 14) +
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
        '<span class="jw-sn-hit-ico">' + ic(h.node.icon, 16) + '</span><span class="jw-sn-hit-body">' +
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
      icon: ic(p.node.icon, 20),
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
    $$('[data-count-to]', el).forEach(countUp);
    setTimeout(function () { el.classList.add('jw-sr-done'); }, 1400);
  }
  function srScan(animate) {
    if (srIO && animate) srIO.disconnect();
    $$(SR_BLOCK, $('#screen')).forEach(function (el) {
      if (el.hasAttribute('data-sr') || (el.parentElement && el.parentElement.closest('[data-sr]'))) return;
      el.setAttribute('data-sr', '');
      $$(SR_ITEM, el).forEach(function (it, i) { it.style.setProperty('--sr-i', Math.min(i, 14)); });
      if (animate && srIO) srIO.observe(el);
      else el.classList.add('jw-sr-in', 'jw-sr-done');
    });
  }
  function countUp(el) {
    var to = Number(el.getAttribute('data-count-to'));
    if (!isFinite(to) || el.hasAttribute('data-counted')) return;
    el.setAttribute('data-counted', '');
    var t0 = performance.now(), dur = 1400;
    (function frame(now) {
      var k = Math.min(1, (now - t0) / dur);
      el.textContent = nf(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(frame);
    })(t0);
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
      '<kbd class="jw-kbd" aria-hidden="true">/</kbd></label><div class="jw-gs-drop jw-glass" id="gsDrop" hidden></div></div>';
  }
  // MVV — sân khấu chính của Home: MISSION chữ lớn, VISION + số giờ đã giảm (đếm lên khi hiện),
  // 5 VALUE đánh số. Nền phẳng (không gradient) + mark Dr.JOY chìm, đứng thẳng.
  function mvvHtml() {
    return '<section class="jw-mvv2" data-card="mvv" aria-label="MISSION · VISION · VALUE">' +
      '<div class="jw-mvv2-bg" aria-hidden="true">' + DRJOY_MARK.replace('jw-brand-mark', 'jw-mvv2-mark') + '</div>' +
      '<div class="jw-mvv2-top">' +
        '<div class="jw-mvv2-mission"><span class="jw-mvv2-label">MISSION</span><p class="jw-mvv2-statement">' + tr(MVV.mission) + '</p></div>' +
        '<div class="jw-mvv2-vision"><span class="jw-mvv2-label">VISION</span><p class="jw-mvv2-vtext">' + tr(MVV.vision) + '</p>' +
          '<div class="jw-mvv2-impact"><span class="jw-mvv2-num"><span class="jw-num" data-count-to="' + MVV.impactHours + '">' + nf(MVV.impactHours) + '</span><small>' + t('時間') + '</small></span>' +
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
        '<button type="button" class="jw-inbox-tile jw-tone-orange" role="tab" aria-selected="' + (S.inboxTab === 'all') + '" data-act="inbox-tab" data-v="all"><b class="jw-num">' + total + '</b><span>' + t('すべて') + '</span></button>' +
        gs.map(function (g) {
          return '<button type="button" class="jw-inbox-tile jw-tone-' + g.tone + '" role="tab" aria-selected="' + (S.inboxTab === g.id) + '" data-act="inbox-tab" data-v="' + g.id + '"><b class="jw-num">' + g.items.length + '</b><span>' + esc(g.label) + '</span></button>';
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
        '<span class="jw-tag jw-tone-' + p.tone + ' jw-deal-prod">' + esc(tr(p)) + '</span></span>' +
      '<span class="jw-deal-amt"><span class="jw-deal-total">' + yen(d.total) + '</span><span class="jw-deal-mrr">MRR ' + yen(d.mrr) + '</span></span>' +
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
      actions: '<span class="jw-hchip">' + esc(t('{n}名', { n: NEW_HIRES.length })) + '</span>', body: groups });
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
      '<span class="jw-rank-name">' + esc(r.name) + '</span><span class="jw-rank-pt">' + nf(r.pt) + ' pt</span></div>';
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
          '<span class="jw-photo-like">' + ic('heart', 12) + p.likes + '</span></div></button>';
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
            '<td class="jw-r jw-num">' + r.days + '</td><td class="jw-r jw-num">' + r.weeks + '</td></tr>';
        }).join('') + '</tbody></table></div><p class="jw-note">' + t('当期（4Q）を強調表示・値はサンプルです') + '</p>' });
  }
  function cardFx() {
    return panel({ id: 'fx', icon: cardIcon('fx'), title: t('為替'),
      body: '<div class="jw-fx">' + FX.map(function (f) {
        return '<div class="jw-fx-row jw-pane"><span class="jw-fx-from">' + f.from + '</span><span class="jw-fx-to">' + nf(f.to, f.digits) + '<small>' + (LANG === 'vi' ? f.unit : f.unitJa) + '</small></span></div>';
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
    searchPages(q).forEach(function (p) { res.push({ cat: 'menu', title: nm(p.node), sub: pathLabel(p) || t('メニュー'), page: p.key, icon: p.node.icon }); });
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
          (r.icon ? ic(r.icon, 16) : ic(c.icon, 16)) + '<span class="jw-gs-body"><span class="jw-gs-name">' + esc(r.title) + '</span><span class="jw-gs-sub">' + esc(r.sub) + '</span></span></button>';
      }).join('') + '</div>';
    });
    drop.innerHTML = all.length
      ? html + '<button type="button" class="jw-gs-all" data-act="gs-all">' + ic('magnifier', 14) + esc(t('すべての結果を見る（{n}件）', { n: all.length })) + '</button>'
      : '<div class="jw-gs-none">' + t('該当する結果がありません') + '</div>';
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
      var inner = (r.icon ? ic(r.icon, 18) : ic(c.icon, 18)) + '<span class="jw-gs-body"><span class="jw-result-cat">' + esc(t(c.label)) + '</span><span class="jw-result-title">' + esc(r.title) + '</span><span class="jw-result-sub">' + esc(r.sub) + '</span></span>';
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
        '<div class="jw-article-author">' + ic('eye', 14) + esc(t('既読 {r}／{m}名（サンプル）', { r: d.readers, m: ANNOUNCE_TOTAL_MEMBERS })) + '</div>' +
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
        '<span class="jw-sum-item">' + t('件数') + '<b>' + l.length + '</b></span>' +
        '<span class="jw-sum-item">' + t('総額') + '<b>' + yen(total) + '</b></span>' +
        '<span class="jw-sum-item">MRR<b>' + yen(mrr) + '</b></span></div></div>';
    }
    var tabs = '<div class="jw-tabs" role="tablist" id="dealTabs" data-keep data-fade-x>' + ['すべて'].concat(PRODUCTS.map(function (p) { return p.ja; })).map(function (k) {
      var p = PRODUCT_BY_JA[k];
      return '<button type="button" class="jw-tab" role="tab" aria-selected="' + (k === tab) + '" data-act="deal-tab" data-v="' + esc(k) + '" data-fk="deal-' + esc(k) + '">' + (p ? ic(p.icon, 15) + esc(tr(p)) : esc(t(k))) + '</button>';
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
          '<div class="jw-kv">' + ic('users-group-rounded', 14) + esc(t('参加人数：{n}名', { n: c.members })) + '</div>' +
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
    // Bấm ra ngoài: đóng dropdown tìm
    if (!e.target.closest('#gsearch')) closeGs();
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
        if (railNow()) {
          if (narrow()) S.drawer = true; else { S.rail = false; save(KEY.rail, '0'); }
          S.open[k] = true;
        } else if (S.open[k]) delete S.open[k];
        else S.open[k] = true;
        saveOpen();
        hideTip();
        closeMenu();
        renderSide();
        if (S.open[k]) {
          var blk = $('#side .jw-sn-top[data-k="' + k + '"]');
          if (blk) blk.parentNode.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
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
      case 'expand-all':
        MENU.forEach(function (b) { if (b.children) S.open[b.key] = true; });
        S.sideQuery = '';
        saveOpen();
        renderSide();
        break;
      case 'collapse-all':
        S.open = {};
        S.sideQuery = '';
        saveOpen();
        renderSide();
        { var sc0 = $('#sideScroll'); if (sc0) sc0.scrollTop = 0; }
        break;
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
      case 'sched-past': S.schedPast = !S.schedPast; renderPage(false); break;
      case 'health-cat': S.healthCat = v; renderPage(false); break;
      case 'to-ranking': S.rankCat = S.healthCat; break;
      case 'photo': openLightbox(S.photos[+el.getAttribute('data-i')]); break;
      case 'photo-post': { var fi = $('#photoInput'); if (fi) fi.click(); break; }

      case 'todo-tab': S.todoTab = +el.getAttribute('data-i'); renderPage(false); break;
      case 'acc': { var i = +el.getAttribute('data-i'); S.acc[i] = !S.acc[i]; renderPage(false); break; }
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
    if (e.key === 'Escape') {
      if (closeModal()) return;
      if (S.menuOpen) { closeMenu(); var mb = $('#setBtn'); if (mb) mb.focus(); return; }
      if (S.inboxOpen) { closeInbox(); var ib = $('#inboxBtn'); if (ib) ib.focus(); return; }
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

  // ── §Khởi động ──
  LANG = load(KEY.lang, 'ja') === 'vi' ? 'vi' : 'ja';
  document.documentElement.lang = LANG;
  applyTheme();
  window.addEventListener('hashchange', onRoute);
  if (!location.hash) { try { history.replaceState(null, '', '#/home'); } catch (e) { /* file:// */ } }
  onRoute();
  // Cho script kiểm (tools/verify.mjs) đọc danh sách trang + chữ chưa dịch
  window.__JOYSTART__ = { pages: PAGE_LIST.map(function (p) { return p.key; }), routes: PAGE_LIST.map(function (p) { return '#/' + p.path; }), missing: I18N_MISSING, announce: ANNOUNCEMENTS.map(function (a) { return a.id; }), settings: SETTINGS_TABS.map(function (x) { return x.slug; }) };
})();
