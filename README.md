# JOY START — mockup (giao diện JOY Analytics)

Mockup cổng nội bộ **JOY START**, dựng lại từ `JOY_START_menu_mockup.html` (cùng nội dung, trang, chức năng,
và cùng BỐ CỤC: không header, side panel cao hết màn) nhưng mặc chất liệu của **JOY Analytics**: kính
liquid glass, cây điều hướng, panel, control.

- **Side panel** (như bản gốc): logo Dr.JOY ở đỉnh · ô tìm menu (bình thường chỉ là icon kính lúp,
  hover hoặc bấm vào thì bung thành ô nhập) + nút **mở tất cả / đóng tất cả** · お気に入り + cây menu
  (cuộn riêng) · ở đáy là **profile** (ảnh + tên + email, bấm vào mở 設定 › アカウント) và **nút bánh
  răng** mở panel cài đặt nhanh: đổi ngôn ngữ, đổi theme, nút vào màn 設定. Panel này bật ra NGOÀI
  side panel, cách mép 12px; chỗ không đủ (ngăn kéo ở mobile) thì nằm trong, ngay trên bánh răng.
  Nút gập thu side panel thành dải icon. Ở khổ ≤640px side panel luôn là dải icon; nút gập mở nó
  thành ngăn kéo phủ lên nội dung.
- **Màu nhấn = cam Dr.JOY `#f08c00`** ở cả hai theme. Riêng chữ cam trên nền sáng dùng `#cc7400`
  (cùng hue) cho đủ tương phản 3:1. Theme **sáng / tối** (mặc định theo hệ điều hành); nền sáng sáng
  hơn, nền tối tối hơn bộ Ember của JOY Analytics.
- **Song ngữ 日本語 / Tiếng Việt**. Ngôn ngữ, theme, khối đang mở, お気に入り nhớ trong `localStorage`.
- **お気に入り**: sao hover = cam, đã ghim = sao đặc cam (Solar bản Bold, ngoại lệ duy nhất của quy tắc
  "chỉ Outline"). Hover một hàng trong danh sách お気に入り hiện nút × để gỡ.
- **JOY Pilot** (trợ lý dùng chung cho MỌI trang, cùng nhận diện với JOY Pilot của JOY Analytics:
  mặt robot, chữ Pilot cam `#f08c00`, chip BETA, chấm trạng thái). Mở bằng nút mặt robot cạnh chuông,
  phím **⌘J / Ctrl+J**, hoặc dòng đầu của ô tìm toàn bộ (「JOY Pilot に頼む」). Là panel NEO bên phải:
  khổ ≥1180px thì đẩy nội dung sang trái (vừa chat vừa thấy trang đổi), khổ vừa thì phủ lên, ≤640px
  toàn màn hình; nút 広げる phủ hết vùng nội dung. Chuyển trang vẫn giữ hội thoại, chip dưới ô nhập
  cho biết đang đứng ở trang nào; gợi ý đổi theo trang.
  - **Thao tác trang**: mở trang (「組織図を開いて」), thêm お気に入り, đổi theme / ngôn ngữ, mở 通知.
  - **Tra dữ liệu**: tổng hợp tại chỗ từ dữ liệu mẫu (受注 theo 事業部 / theo người, 入社, 既読率);
    CSV chỉ khi người dùng tự yêu cầu.
  - **Sửa dữ liệu khi có quyền** (組織図 · 名簿: 組織変更, 異動, thêm người, gỡ khỏi 名簿): luôn
    qua THẺ PHƯƠNG ÁN (trước → sau, ngày áp dụng, nơi phản ánh) với 今すぐ反映 / 予約 / 下書き /
    やめる. Ngày áp dụng ở tương lai ⇒ giữ bản nháp và TỰ phản ánh lúc 0:00 ngày đó; tab
    予約・下書き có nút demo 「当日にする」 để xem việc tự phản ánh. Không có quyền (給与 · 評価 · PL)
    ⇒ giải thích + 権限をリクエスト, không làm gì cả.
  - ⚠ **Chưa nối BigQuery MCP**: mọi câu trả lời là kịch bản trên dữ liệu mẫu, nên chấm trạng thái
    luôn VÀNG (デモ). Nối thật thì chỉ đổi `pilotPlan()` trong `app.js`.
- **通知センター**: nút chuông nổi ở góc phải trên (số = tổng mục). Panel có hàng tab すべて ·
  承認待ち · 期限切れ · 今日の予定 · 未読のお知らせ: bấm một tab thì chỉ hiện nhóm đó.
- **Home**: lời chào + ô tìm, rồi **MVV** thành sân khấu chính (MISSION chữ lớn, VISION + số giờ đã
  giảm đếm lên, 5 VALUE đánh số). Nền phẳng, chữ cam đặc (không gradient); mark Dr.JOY đứng thẳng làm
  watermark ở góc phải trên. Bên dưới là lưới thẻ; tiêu đề thẻ có vạch dọc cam mảnh phía trước.
- **Nút**: kiểu nút phẳng của JOY Forge (`flat-buttons.css`): thân đục, lúc nghỉ chỉ có vành 1px mờ
  + bóng nhỏ; hover ở theme sáng thì nhấc lên 2px + bóng, ở theme tối thì viền cam phát sáng. Nút
  chỉ có icon (sao, ×, mở/đóng tất cả…) không có thân, hover chỉ nhích icon lên. Nút お気に入り của
  mỗi trang chỉ còn icon sao, dạt phải thẳng mép thẻ.
- **Toggle**: một component segmented dùng chung cho panel cài đặt và các trang. Núm trượt 0.5s
  (nhanh lúc đầu, đậu êm). Đổi ngôn ngữ / theme thì núm trượt xong mới vẽ lại. Tab (お知らせ,
  受注速報, 設定…) có vệt nền trượt sang tab mới.
- **Đổi theme**: cả trang hoà mờ chậm ~1s (View Transitions API; trình duyệt không hỗ trợ thì đổi ngay).
- **Theme sáng**: thẻ trắng đục, ô con bên trong thẻ màu ngà + viền, lớp nổi (panel cài đặt, 通知,
  dropdown) đục hẳn nên chữ phía sau không lọt qua. Theme tối vẫn là kính.
- **Cuộn tới đâu hiện tới đó** (mọi trang): từng khối trượt lên khi vào vùng nhìn, hàng/thẻ con nối
  đuôi nhau. Vẽ lại tại chỗ (đổi tab, lọc) thì hiện ngay.
- **Số thống kê chạy** (số tiền, số lượng, điểm, tỉ giá, số ngày…): từng con số đếm từ 0 lên đúng lúc
  CHÍNH nó vào vùng nhìn (hàng dưới mép màn chỉ chạy khi cuộn tới); cuộn nhảy qua thì hiện ngay số cuối.
- **Accordion** (khối của cây menu, accordion trên trang, 過去 của スケジュール): mở thì khung giãn ra
  và từng mục phóng ra lần lượt; đóng thì các mục mờ đi rồi khung thu lại.
- **事業部 không dùng icon** — nhận diện bằng màu, đúng bảng màu プロダクト của JOY Analytics
  (医薬連携 `#3fa9f5` · 労務支援 `#F18D00` · AI電話 `#7C3AED` · スマート面会 `#fe9dac` ·
  院内メディア `#046b4f`) và cùng công thức pha: chấm/thanh = màu gốc, chữ = 44% với màu mực, chip =
  nền 22% + chữ 36%.
- **Ít icon hơn**: đầu thẻ, breadcrumb, link chữ, mục menu tầng 3 và tab 設定 chỉ còn chữ.
- **Hiệu ứng hover**: icon nhích lên; chữ trong hàng/mục nhích 2px; link chữ có gạch chân mọc
  từ trái; "đèn" theo con trỏ kiểu Reveal của Windows (nền mục đang hover + viền các mục/thẻ lân
  cận, kể cả thẻ nhỏ nằm trong thẻ lớn và các ô nhập / ô tìm). Nút chỉ có icon (sao, ×…) thì chỉ
  đổi màu icon, không nền. Bánh răng quay chậm 60° khi hover. Tắt khi hệ điều hành bật giảm chuyển động.
- Đường nhánh của cây menu: 1px, góc vuông.
- **Icon: toàn bộ lấy từ Solar, bản Outline** (161 icon).
- **Không lấy nền ribbon** của JOY Analytics. Chỉ giữ 3 vệt loang màu rất nhẹ sau lớp kính: kính cần
  một nền có sắc để còn đọc ra là kính. Muốn nền phẳng hẳn thì xoá khối `.jw-ambient` ở `styles.css`.

## Mở

Mở thẳng **`index.html`** bằng trình duyệt. File tự chứa (CSS, JS, icon, ảnh minh hoạ đều
nằm trong file), gửi đi được như mockup gốc. Font lấy từ Google Fonts; không có mạng thì trình duyệt
dùng font hệ thống.

Bản online (GitHub Pages): **https://drjoy-toshi-tuan.github.io/joy-start/**

Đường dẫn (hash, **tiếng Anh**): `#/home` · `#/<khối>/<nhóm>/<trang>` (ví dụ `#/todo/reports/supervisor`)
· `#/settings/<tab>` (`account` · `display` · `notifications` · `home` · `privacy` · `integrations` ·
`security` · `permissions` · `data-sources`) · `#/announce/<id>` · `#/deals` · `#/search?q=…`.
Slug của từng trang khai ở `slug:` trong `MENU` (`mockup/data.js`). Link cũ kiểu tiếng Nhật
(`#/todo/報告/上長報告`) vẫn mở được và tự đổi sang route tiếng Anh.

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
| `index.html` | **file build** — ghép tất cả thành một file (tên `index.html` để URL Pages chỉ là `…/joy-start/#/home`) |
| `joy-start-mockup.html` | tên cũ — chỉ còn là trang chuyển tiếp sang `./#…` cho link cũ |

## Lệnh (chỉ cần node, không cần `npm install`)

```sh
node tools/build.mjs                    # ghép mockup/* → index.html
node tools/build.mjs --check            # kiểm file build có khớp nguồn không (exit 1 nếu lệch)
node tools/sync-icons.mjs <Solar.zip | thư mục svg>   # sinh lại mockup/icons.js
node tools/verify.mjs [--shots <thư mục>]              # kiểm bằng trình duyệt thật (cần Playwright)
```

- **Thêm icon:** viết tên icon Solar (không có đuôi `-outline`) ở dạng `ic('tên')` hoặc `icon: 'tên'`
  trong `app.js` / `data.js`, rồi chạy `sync-icons.mjs` và `build.mjs`. Thêm hậu tố `@bold`
  (vd `ic('star@bold')`) thì lấy bản Bold. Script chỉ gom những tên
  viết NGUYÊN VĂN như vậy, nên icon chọn qua biến cũng phải xuất hiện nguyên văn ở đâu đó.
  Icon thiếu sẽ hiện cảnh báo `[icon] thiếu: …` trên console.
- **Thêm chữ:** viết tiếng Nhật trong `t('…')` và thêm bản dịch vào `I18N_VI`. Thiếu bản dịch thì
  màn Tiếng Việt hiện chữ Nhật và `verify.mjs` báo đỏ.
- **`verify.mjs`** quét 135 route × 日本語/Tiếng Việt × 1440px/390px, rồi chạy các thao tác chính (mở khối,
  sang trang, ghim お気に入り, tab của 通知センター, mở/đóng tất cả, JOY Pilot (予約 → tự phản ánh,
  mở trang, tổng hợp, không quyền, đủ bản dịch, 390px), ô tìm menu gập/bung + tìm ở cả 2
  ngôn ngữ, tìm toàn bộ, bánh răng → đổi
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
  site (không qua cổng); vì mockup đã là `index.html` ở gốc repo nên cách nào cũng ra cùng một trang.
  `.nojekyll` tắt Jekyll.
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
