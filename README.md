# JOY START — mockup (giao diện JOY Analytics)

Mockup cổng nội bộ **JOY START**, dựng lại từ `JOY_START_menu_mockup.html` (cùng nội dung, trang, chức năng,
và cùng BỐ CỤC: không header, side panel cao hết màn) nhưng mặc chất liệu của **JOY Analytics**: kính
liquid glass, cây điều hướng, panel, control.

- **Side panel** (như bản gốc): logo Dr.JOY ở đỉnh · ô tìm menu + nút **mở tất cả / đóng tất cả** ·
  お気に入り + cây menu (cuộn riêng) · ở đáy là **profile** (ảnh + tên + email, bấm vào mở 設定 › アカウント)
  và **nút bánh răng** mở panel cài đặt nhanh: đổi ngôn ngữ, đổi theme, nút vào màn 設定.
  Nút gập thu side panel thành dải icon. Ở khổ ≤640px side panel luôn là dải icon; nút gập mở nó
  thành ngăn kéo phủ lên nội dung.
- **Màu nhấn = cam Dr.JOY `#f08c00`** ở cả hai theme. Riêng chữ cam trên nền sáng dùng `#cc7400`
  (cùng hue) cho đủ tương phản 3:1. Theme **sáng / tối** (mặc định theo hệ điều hành); nền sáng sáng
  hơn, nền tối tối hơn bộ Ember của JOY Analytics.
- **Song ngữ 日本語 / Tiếng Việt**. Ngôn ngữ, theme, khối đang mở, お気に入り nhớ trong `localStorage`.
- **Icon: toàn bộ lấy từ Solar, bản Outline** (161 icon).
- **Không lấy nền ribbon** của JOY Analytics. Chỉ giữ 3 vệt loang màu rất nhẹ sau lớp kính: kính cần
  một nền có sắc để còn đọc ra là kính. Muốn nền phẳng hẳn thì xoá khối `.jw-ambient` ở `styles.css`.

## Mở

Mở thẳng **`joy-start-mockup.html`** bằng trình duyệt. File tự chứa (CSS, JS, icon, ảnh minh hoạ đều
nằm trong file), gửi đi được như mockup gốc. Font lấy từ Google Fonts; không có mạng thì trình duyệt
dùng font hệ thống.

Bản online (GitHub Pages): **https://drjoy-toshi-tuan.github.io/joy-start/**

Đường dẫn (hash): `#/home` · `#/<khối>/<nhóm>/<trang>` (theo `data-page` của bản gốc, ví dụ
`#/todo/報告/上長報告`) · `#/settings/<tab>` · `#/announce/<id>` · `#/deals` · `#/search?q=…`.

## Cấu trúc

| File | Việc |
|---|---|
| `mockup/template.html` | khung trang + 6 chỗ ghép (`/*@inline …*/`) |
| `mockup/styles.css` | toàn bộ CSS: token Ember (sáng/tối), kính, header, side panel, thẻ, các trang |
| `mockup/app.js` | router hash, vẽ các màn, thao tác (vanilla JS, không thư viện) |
| `mockup/data.js` | dữ liệu mẫu: menu 13 khối, お知らせ, 受注速報, 健康JOY, 設定… (nhãn dạng `L(ja, vi)`) |
| `mockup/i18n.js` | từ điển Tiếng Việt: KHOÁ là câu tiếng Nhật, `t('日本語')` tra ra bản Việt |
| `mockup/illustrations.js` | avatar + ảnh minh hoạ SVG (giữ nguyên từ bản gốc) |
| `mockup/icons.js` | **file sinh ra** — icon Solar Outline, đừng sửa tay |
| `joy-start-mockup.html` | **file build** — ghép tất cả thành một file |

## Lệnh (chỉ cần node, không cần `npm install`)

```sh
node tools/build.mjs                    # ghép mockup/* → joy-start-mockup.html
node tools/build.mjs --check            # kiểm file build có khớp nguồn không (exit 1 nếu lệch)
node tools/sync-icons.mjs <Solar.zip | thư mục svg>   # sinh lại mockup/icons.js
node tools/verify.mjs [--shots <thư mục>]              # kiểm bằng trình duyệt thật (cần Playwright)
```

- **Thêm icon:** viết tên icon Solar (không có đuôi `-outline`) ở dạng `ic('tên')` hoặc `icon: 'tên'`
  trong `app.js` / `data.js`, rồi chạy `sync-icons.mjs` và `build.mjs`. Script chỉ gom những tên
  viết NGUYÊN VĂN như vậy, nên icon chọn qua biến cũng phải xuất hiện nguyên văn ở đâu đó.
  Icon thiếu sẽ hiện cảnh báo `[icon] thiếu: …` trên console.
- **Thêm chữ:** viết tiếng Nhật trong `t('…')` và thêm bản dịch vào `I18N_VI`. Thiếu bản dịch thì
  màn Tiếng Việt hiện chữ Nhật và `verify.mjs` báo đỏ.
- **`verify.mjs`** quét 135 route × 日本語/Tiếng Việt × 1440px/390px, rồi chạy các thao tác chính (mở khối,
  sang trang, ghim お気に入り, mở/đóng tất cả, tìm menu ở cả 2 ngôn ngữ, tìm toàn bộ, bánh răng → đổi
  ngôn ngữ + theme → vào 設定, đăng xuất, và ở 390px: dải icon → ngăn kéo → chọn trang). Nó báo đỏ khi
  có: lỗi/cảnh báo console, cuộn ngang, chữ chưa dịch. Cần Playwright (`npm i -g playwright` hoặc
  đặt `NODE_PATH`). Máy đi qua proxy thì thêm `PW_PROXY=http://host:port`; muốn cache font thì thêm
  `PW_FONT_CACHE=<thư mục>`.

## Deploy (GitHub Pages)

`.github/workflows/pages.yml` tự deploy mỗi lần push lên **default branch**. Nhánh khác không deploy.
Workflow chạy `build.mjs --check` trước: file build lệch nguồn hoặc có email `@drjoy.jp` thì dừng,
không publish. Muốn chạy tay: Actions → Deploy to GitHub Pages → Run workflow.

- Nên đặt Settings → Pages → Source = **GitHub Actions**: khi đó chỉ workflow này deploy (có cổng).
  Nếu để "Deploy from a branch" thì GitHub chạy thêm một lượt deploy riêng, lấy nguyên nhánh làm
  site (không qua cổng). Lúc đó `index.html` ở gốc repo chuyển sang `joy-start-mockup.html` (giữ
  nguyên `#/…`), còn `.nojekyll` tắt Jekyll.
- Đổi default branch (ví dụ sang `main`) thì nhánh mới tự thành nhánh deploy. Nhưng phải thêm nó vào
  Settings → Environments → `github-pages` → Deployment branches, không thì bước deploy bị từ chối.

## Khác JOY Analytics ở đâu

- Không header, không dải khối dưới header: bố cục theo mockup gốc (xem trên).
- Không nền ribbon (yêu cầu). Không bộ màu Rime. Cam là cam Dr.JOY, không phải cam cháy của Ember.
- Logo = mark Dr.JOY (path chép nguyên văn từ `docs/brand/drjoy-mark.svg` của JOY Analytics) + chữ
  JOY START. Favicon cũng là mark Dr.JOY.
- Tiếng Việt dùng font **Be Vietnam Pro** cho chữ tiêu đề/số, vì Outfit (font của JOY Analytics)
  không có dấu tiếng Việt.
- Cây menu: mở được NHIỀU khối cùng lúc (JOY Analytics chỉ mở một), vì có nút mở tất cả. Nên nền cam
  chỉ dành cho trang hiện tại ở tầng 1 (ホーム · リンク); khối chứa trang hiện tại = chữ cam + vạch.
  Tên mục bị cắt "…" thì tooltip hiện tên đầy đủ.

## Dữ liệu

Toàn bộ là **dữ liệu mẫu** của mockup gốc. ⚠ Repo này **public**, nên:

- Email mẫu phải là `@example.com` (RFC 2606). `build.mjs` **từ chối build** khi file ra chứa email
  `@drjoy.jp`, cùng luật với `scripts/privacy-rules.mjs` của JOY Analytics.
- Link thư mục Google Drive ở 設定 › データソース giữ nguyên như bản gốc. Quyền xem do Drive quyết định.

## Giấy phép icon

Icon: [Solar](https://icon-sets.iconify.design/solar/) của 480 Design, giấy phép
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
