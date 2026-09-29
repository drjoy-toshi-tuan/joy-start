/* ==========================================================================
   JOY START mockup — DỮ LIỆU MẪU (toàn bộ là mẫu, không nối hệ thống thật)

   Quy ước song ngữ:
   · Chữ GIAO DIỆN trong app.js đi qua `t('日本語')` — từ điển ở i18n.js.
   · Chữ NỘI DUNG ở file này khai tại chỗ bằng `L('日本語', 'Tiếng Việt')`.
   · Tên người · tên bệnh viện mẫu · tên file · mã (AE/GT…) KHÔNG dịch.
   Khoá trang (`todo/報告/上長報告`) giữ NGUYÊN như mockup gốc, nên đường dẫn
   `#/…`, お気に入り và mọi localStorage cũ vẫn khớp.
   ========================================================================== */

function L(ja, vi) { return { ja: ja, vi: vi }; }

/* Mốc "hôm nay" của mockup (trùng giờ lấy tỷ giá 2026/09/27 của bản gốc). */
var HOME_TODAY = new Date(2026, 8, 27);

/* §PROダクト — tên + tông màu + icon dùng chung mọi nơi */
var PRODUCTS = [
  { ja: '医薬連携', vi: 'Liên kết Y Dược', icon: 'pills', tone: 'plum' },
  { ja: '労務支援', vi: 'Hỗ trợ Lao động', icon: 'clock-square', tone: 'green' },
  { ja: 'AI電話', vi: 'Điện thoại AI', icon: 'phone-calling-rounded', tone: 'blue' },
  { ja: 'スマート面会', vi: 'Gặp mặt thông minh', icon: 'chat-round-video', tone: 'rose' },
  { ja: '院内メディア', vi: 'Truyền thông nội viện', icon: 'tv', tone: 'gold' }
];
var PRODUCT_BY_JA = {};
PRODUCTS.forEach(function (p) { PRODUCT_BY_JA[p.ja] = p; });
function productKids() {
  return PRODUCTS.map(function (p) { return { ja: p.ja, vi: p.vi, icon: p.icon }; });
}

/* §MENU — cây 3 tầng (大 → 中 → 小). Nút có `children` là NHÓM, còn lại là TRANG.
   Khoá trang = `key` của khối + đường đi bằng nhãn tiếng Nhật. */
var TIP = {
  AEGT: L('AE：法人営業（Account Executive）／GT：見込み客育成推進（Growth Team）', 'AE: Kinh doanh doanh nghiệp (Account Executive) / GT: Nuôi dưỡng khách tiềm năng (Growth Team)'),
  LG: L('LG：リード獲得営業（Lead Generation）', 'LG: Kinh doanh thu hút khách tiềm năng (Lead Generation)'),
  CSOB: L('CS：カスタマーサクセス（Customer Success）／OB：導入支援（Onboarding）', 'CS: Thành công khách hàng (Customer Success) / OB: Hỗ trợ triển khai (Onboarding)'),
  TA: L('TA：採用（Talent Acquisition）', 'TA: Tuyển dụng nhân tài (Talent Acquisition)'),
  PL: L('PL：損益計算書（Profit and Loss）', 'PL: Báo cáo lãi lỗ (Profit and Loss)'),
  AE: L('AE：法人営業（Account Executive）', 'AE: Kinh doanh doanh nghiệp (Account Executive)'),
  GT: L('GT：見込み客育成推進（Growth Team）', 'GT: Nuôi dưỡng khách tiềm năng (Growth Team)'),
  OB: L('OB：導入支援（Onboarding）', 'OB: Hỗ trợ triển khai (Onboarding)'),
  CS: L('CS：カスタマーサクセス（Customer Success）', 'CS: Thành công khách hàng (Customer Success)'),
  PR: L('PR：広報戦略（Public Relations）', 'PR: Chiến lược truyền thông (Public Relations)')
};

var MENU = [
  { key: 'home', ja: 'ホーム', vi: 'Trang chủ', icon: 'home-2' },
  { key: 'todo', ja: 'やること', vi: 'Việc cần làm', icon: 'checklist-minimalistic', children: [
    { ja: '予定', vi: 'Lịch trình', icon: 'calendar' },
    { ja: 'アクション', vi: 'Hành động', icon: 'bolt' },
    { ja: '報告', vi: 'Báo cáo', icon: 'document-text', children: [
      { ja: '上長報告', vi: 'Báo cáo cấp trên', icon: 'user-speak-rounded' },
      { ja: '商談', vi: 'Đàm phán', icon: 'case-round' },
      { ja: '打ち合わせ', vi: 'Cuộc họp', icon: 'users-group-two-rounded' },
      { ja: '受注', vi: 'Nhận đơn hàng', icon: 'bill-check' },
      { ja: '顧客クレーム', vi: 'Khiếu nại khách hàng', icon: 'chat-round-unread' },
      { ja: 'インシデント', vi: 'Sự cố', icon: 'siren-rounded' }
    ] },
    { ja: '申請', vi: 'Đơn đề nghị', icon: 'clipboard-text', children: [
      { ja: '勤怠', vi: 'Chấm công', icon: 'clock-circle' },
      { ja: '休暇', vi: 'Nghỉ phép', icon: 'sun-2' },
      { ja: '経費', vi: 'Chi phí', icon: 'wallet-money' },
      { ja: '出張', vi: 'Công tác', icon: 'plane' },
      { ja: '備品｜端末', vi: 'Thiết bị｜Máy', icon: 'devices' },
      { ja: '身上変更', vi: 'Thay đổi thông tin cá nhân', icon: 'pen-new-square' },
      { ja: 'ソフトウェア利用', vi: 'Sử dụng phần mềm', icon: 'widget-add' },
      { ja: 'お知らせ', vi: 'Đăng thông báo', icon: 'bell' }
    ] },
    { ja: '承認', vi: 'Phê duyệt', icon: 'verified-check', badge: 3 }
  ] },
  { key: 'staff', ja: 'メンバー', vi: 'Thành viên', icon: 'users-group-rounded', children: [
    { ja: '名簿', vi: 'Danh bạ', icon: 'user-id' },
    { ja: '組織図', vi: 'Sơ đồ tổ chức', icon: 'structure' },
    { ja: '座席', vi: 'Chỗ ngồi', icon: 'armchair-2' },
    { ja: '活動拠点', vi: 'Địa điểm làm việc', icon: 'map-point' },
    { ja: 'スキルマップ', vi: 'Bản đồ kỹ năng', icon: 'stars-minimalistic' },
    { ja: 'ミツカリ', vi: 'Mitsucari', icon: 'face-scan-circle' }
  ] },
  { key: 'recruit', ja: '採用', vi: 'Tuyển dụng', icon: 'user-plus-rounded', children: [
    { ja: '計画', vi: 'Kế hoạch', icon: 'calendar-mark' },
    { ja: '募集中', vi: 'Đang tuyển', icon: 'user-hand-up', children: [
      { ja: 'ポジション一覧', vi: 'Danh sách vị trí', icon: 'list' },
      { ja: '選考状況', vi: 'Tình trạng tuyển chọn', icon: 'filter' }
    ] },
    { ja: '紹介キャンペーン', vi: 'Chiến dịch giới thiệu', icon: 'gift', children: [
      { ja: '紹介する', vi: 'Giới thiệu ứng viên', icon: 'user-plus' },
      { ja: '紹介実績', vi: 'Kết quả giới thiệu', icon: 'cup-star' }
    ] },
    { ja: '実績', vi: 'Kết quả', icon: 'chart', children: [
      { ja: '入社人数', vi: 'Số người vào công ty', icon: 'user-check-rounded' },
      { ja: 'コスト', vi: 'Chi phí', icon: 'banknote' }
    ] }
  ] },
  { key: 'train', ja: '研修', vi: 'Đào tạo', icon: 'square-academic-cap', children: [
    { ja: '共通', vi: 'Chung', icon: 'book-minimalistic', children: [
      { ja: '入社時', vi: 'Khi vào công ty', icon: 'flag' },
      { ja: '1ヶ月', vi: '1 tháng', icon: 'calendar-minimalistic' },
      { ja: '3ヶ月', vi: '3 tháng', icon: 'calendar-minimalistic' },
      { ja: '6ヶ月', vi: '6 tháng', icon: 'calendar-minimalistic' },
      { ja: '12ヶ月', vi: '12 tháng', icon: 'calendar-minimalistic' }
    ] },
    { ja: '役割別', vi: 'Theo vai trò', icon: 'user-hands', children: [
      { ja: '管理職', vi: 'Quản lý', icon: 'crown-minimalistic' },
      { ja: 'AE｜GT', vi: 'AE｜GT', icon: 'case-round', tip: TIP.AEGT },
      { ja: 'LG', vi: 'LG', icon: 'magnet', tip: TIP.LG },
      { ja: 'CS｜OB', vi: 'CS｜OB', icon: 'hand-heart', tip: TIP.CSOB },
      { ja: 'TA', vi: 'TA', icon: 'user-plus-rounded', tip: TIP.TA }
    ] },
    { ja: '事業部別', vi: 'Theo khối kinh doanh', icon: 'buildings-2', children: productKids() },
    { ja: 'AIロープレ', vi: 'Luyện nhập vai AI', icon: 'microphone-large' }
  ] },
  { key: 'rule', ja: 'ルール', vi: 'Quy định', icon: 'book-bookmark', children: [
    { ja: '就業規則', vi: 'Nội quy lao động', icon: 'document' },
    { ja: '社内規程', vi: 'Quy chế nội bộ', icon: 'shield-check' },
    { ja: '業務マニュアル', vi: 'Hướng dẫn nghiệp vụ', icon: 'book-2' },
    { ja: '書式', vi: 'Biểu mẫu', icon: 'documents' },
    { ja: 'FAQ', vi: 'FAQ', icon: 'question-circle' }
  ] },
  { key: 'health', ja: '健康JOY', vi: 'Sức khỏe JOY', icon: 'heart-pulse', children: [
    { ja: '記録', vi: 'Ghi chép', icon: 'notebook-minimalistic' },
    { ja: 'ランキング', vi: 'Xếp hạng', icon: 'ranking' },
    { ja: '部活', vi: 'Câu lạc bộ', icon: 'football' },
    { ja: '制度｜サポート', vi: 'Chế độ｜Hỗ trợ', icon: 'hand-heart' }
  ] },
  { key: 'perf', ja: '目標｜結果', vi: 'Mục tiêu｜Kết quả', icon: 'target', children: [
    { ja: '全社', vi: 'Toàn công ty', icon: 'buildings-3', children: [
      { ja: 'PL', vi: 'PL', icon: 'graph-up', tip: TIP.PL },
      { ja: '利用施設', vi: 'Cơ sở sử dụng', icon: 'hospital' },
      { ja: '利用ユーザー', vi: 'Người dùng', icon: 'users-group-rounded' },
      { ja: 'トスアップ', vi: 'Toss-up', icon: 'transfer-horizontal' },
      { ja: '導入マップ', vi: 'Bản đồ triển khai', icon: 'map' }
    ] },
    { ja: '事業部', vi: 'Khối kinh doanh', icon: 'buildings-2', children: productKids() },
    { ja: '個人', vi: 'Cá nhân', icon: 'user-rounded', children: [
      { ja: 'AE', vi: 'AE', icon: 'case-round', tip: TIP.AE },
      { ja: 'GT', vi: 'GT', icon: 'graph-new-up', tip: TIP.GT },
      { ja: 'LG', vi: 'LG', icon: 'magnet', tip: TIP.LG },
      { ja: 'OB', vi: 'OB', icon: 'rocket', tip: TIP.OB },
      { ja: 'CS', vi: 'CS', icon: 'hand-heart', tip: TIP.CS },
      { ja: 'TA', vi: 'TA', icon: 'user-plus-rounded', tip: TIP.TA },
      { ja: 'PR', vi: 'PR', icon: 'microphone-2', tip: TIP.PR }
    ] }
  ] },
  { key: 'cs', ja: '顧客対応', vi: 'Khách hàng', icon: 'hand-shake', children: [
    { ja: '施設', vi: 'Cơ sở y tế', icon: 'hospital' },
    { ja: 'コンタクト', vi: 'Liên hệ', icon: 'call-chat-rounded' },
    { ja: 'リード', vi: 'Khách tiềm năng', icon: 'magnet' },
    { ja: '案件', vi: 'Cơ hội', icon: 'case', children: productKids() },
    { ja: 'オンボーディング', vi: 'Onboarding', icon: 'rocket-2', children: productKids() },
    { ja: 'リテンション', vi: 'Duy trì khách hàng', icon: 'refresh-circle', children: productKids() },
    { ja: '料金シミュレーション', vi: 'Mô phỏng chi phí', icon: 'calculator' },
    { ja: '見積｜請求', vi: 'Báo giá｜Hóa đơn', icon: 'bill-list' },
    { ja: '学会', vi: 'Hội nghị học thuật', icon: 'presentation-graph' },
    { ja: 'ユーザー会', vi: 'Hội người dùng', icon: 'users-group-two-rounded' }
  ] },
  { key: 'dev', ja: '開発', vi: 'Phát triển', icon: 'code-square', children: [
    { ja: 'ロードマップ', vi: 'Lộ trình', icon: 'route' },
    { ja: 'チケット', vi: 'Ticket', icon: 'ticket' },
    { ja: '要望一覧', vi: 'Danh sách yêu cầu', icon: 'lightbulb' },
    { ja: 'リリースノート', vi: 'Ghi chú phát hành', icon: 'notes' },
    { ja: '障害', vi: 'Lỗi hệ thống', icon: 'bug' }
  ] },
  { key: 'inventory', ja: '在庫', vi: 'Kho', icon: 'box', children: [
    { ja: '在庫一覧', vi: 'Danh sách tồn kho', icon: 'box-minimalistic' },
    { ja: '顧客貸与端末', vi: 'Thiết bị cho khách mượn', icon: 'tablet' },
    { ja: 'ライセンス', vi: 'Giấy phép', icon: 'key' },
    { ja: 'パソコン', vi: 'Máy tính', icon: 'laptop' },
    { ja: 'スマホ', vi: 'Điện thoại', icon: 'smartphone' },
    { ja: 'パンフレット', vi: 'Tài liệu quảng cáo', icon: 'notebook-2' }
  ] },
  { key: 'incident', ja: 'インシデント', vi: 'Sự cố', icon: 'danger-triangle', children: [
    { ja: '台帳', vi: 'Sổ theo dõi', icon: 'list-check', badge: 2 },
    { ja: '集計', vi: 'Tổng hợp', icon: 'pie-chart-2' }
  ] },
  { key: 'link', ja: 'リンク', vi: 'Liên kết', icon: 'link-round' }
];

/* §Mô tả trang CHUẨN BỊ (mockup gốc `PLACEHOLDER_DESC`) */
var PLACEHOLDER_DESC = {
  'train/AIロープレ': L('AIが病院役・顧客役になりきる実践ロープレ（キックオフ商談、設定すり合わせ定例、稼働後MTGなど）。回答をその場で採点し、弱点をレポートします。', 'Luyện tập nhập vai thực tế: AI đóng vai bệnh viện / khách hàng (buổi kick-off, họp định kỳ thống nhất cài đặt, họp sau khi vận hành…). Chấm điểm câu trả lời ngay tại chỗ và báo cáo điểm yếu.'),
  'todo/承認': L('メンバーから提出された申請の承認（未承認／承認済み／差し戻しをタブで切替）', 'Phê duyệt các đơn thành viên đã nộp (chuyển tab: Chưa duyệt / Đã duyệt / Trả lại)'),
  'todo/アクション': L('新しいアクション（対応予定・ToDo）を登録する画面', 'Màn hình đăng ký hành động mới (việc dự định xử lý · ToDo)'),
  'todo/報告/商談': L('商談・訪問の内容を記録する報告画面', 'Màn hình báo cáo ghi lại nội dung buổi đàm phán · thăm khách hàng'),
  'todo/報告/受注': L('新規受注が確定した際の報告画面', 'Màn hình báo cáo khi xác nhận có đơn hàng mới'),
  'todo/報告/上長報告': L('上長への定期報告（現在は2週間に1回）。期間中の成果・課題・次の一手をまとめて提出します。', 'Báo cáo định kỳ cho cấp trên (hiện tại 2 tuần/lần). Tổng hợp thành quả · vấn đề · bước tiếp theo trong kỳ rồi nộp.'),
  'todo/報告/打ち合わせ': L('顧客・社内の打ち合わせ（定例ミーティングを含む）の議事と決定事項・宿題を記録します。', 'Ghi lại biên bản, quyết định và việc cần làm của các cuộc họp với khách hàng · nội bộ (bao gồm họp định kỳ).'),
  'todo/報告/顧客クレーム': L('顧客から受けたクレーム・ご不満の記録と対応状況', 'Ghi nhận khiếu nại · phàn nàn từ khách hàng và tình trạng xử lý'),
  'todo/報告/インシデント': L('情報セキュリティ・システム障害・顧客現場トラブル・ヒヤリハットの第一報を5W2H・時系列で登録', 'Đăng ký báo cáo ban đầu về an ninh thông tin · sự cố hệ thống · rắc rối tại cơ sở khách hàng · suýt xảy ra sự cố, theo 5W2H và dòng thời gian'),
  'todo/申請/勤怠': L('勤怠（出退勤等）の申請画面', 'Màn hình đơn chấm công (giờ vào / giờ ra…)'),
  'todo/申請/休暇': L('有給・特別休暇などの取得申請', 'Đơn xin nghỉ phép có lương · nghỉ đặc biệt…'),
  'todo/申請/経費': L('立替経費等の精算申請画面', 'Màn hình đề nghị thanh toán chi phí đã ứng trước'),
  'todo/申請/出張': L('出張の目的・行程・概算費用を事前申請する画面（精算は経費申請）', 'Màn hình đăng ký trước mục đích · lịch trình · chi phí dự kiến của chuyến công tác (thanh toán qua đơn Chi phí)'),
  'todo/申請/備品｜端末': L('PC・スマホ・SIM等の新規貸与・交換を申請する画面', 'Màn hình đề nghị cấp mới · đổi PC, điện thoại, SIM…'),
  'todo/申請/身上変更': L('住所・振込口座・扶養家族・緊急連絡先などの変更届', 'Thông báo thay đổi địa chỉ · tài khoản nhận lương · người phụ thuộc · liên hệ khẩn cấp…'),
  'todo/申請/ソフトウェア利用': L('新規SaaS・ツール導入前の利用申請・審査依頼', 'Đơn xin sử dụng · yêu cầu thẩm định trước khi đưa SaaS / công cụ mới vào dùng'),
  'todo/申請/お知らせ': L('全社へのお知らせ掲載を申請します。承認されるとホームのお知らせに掲載されます（カテゴリ・重要度・掲載期間を指定）。', 'Đề nghị đăng thông báo cho toàn công ty. Khi được duyệt sẽ hiển thị ở mục Thông báo trên Trang chủ (chỉ định danh mục · mức độ quan trọng · thời gian đăng).'),
  'staff/スキルマップ': L('出身業界・スキル・資格・言語などをメンバー横断で集約・検索する画面', 'Màn hình tổng hợp · tìm kiếm ngành xuất thân, kỹ năng, chứng chỉ, ngôn ngữ… của toàn bộ thành viên'),
  'recruit/計画': L('部署・職種ごとの採用人数計画（期別・JP/VN内訳）', 'Kế hoạch số lượng tuyển theo phòng ban · vị trí (theo kỳ, chia JP / VN)'),
  'recruit/募集中/ポジション一覧': L('募集中の求人と充足状況', 'Các vị trí đang tuyển và mức độ đã tuyển đủ'),
  'recruit/募集中/選考状況': L('応募〜内定の段階別の人数・歩留まり', 'Số người và tỷ lệ chuyển tiếp theo từng giai đoạn, từ ứng tuyển đến nhận offer'),
  'recruit/紹介キャンペーン/紹介する': L('社員が候補者を紹介する入口', 'Cổng để nhân viên giới thiệu ứng viên'),
  'recruit/紹介キャンペーン/紹介実績': L('紹介数・採用数・インセンティブ支給状況', 'Số lượt giới thiệu · số người được tuyển · tình trạng chi thưởng'),
  'recruit/実績/入社人数': L('期別の入社人数（JP/VN・部署別）', 'Số người vào công ty theo kỳ (JP / VN · theo phòng ban)'),
  'recruit/実績/コスト': L('採用チャネル別の1人あたり費用', 'Chi phí tuyển dụng trên mỗi người theo từng kênh'),
  'rule/就業規則': L('本則・賃金規程・退職金規程など', 'Quy định chính · quy chế lương · quy chế trợ cấp thôi việc…'),
  'rule/社内規程': L('ISMS・情報セキュリティ方針・テレワーク規程など', 'ISMS · chính sách an ninh thông tin · quy chế làm việc từ xa…'),
  'rule/業務マニュアル': L('部署別の業務ルール集（AI電話事業部CS「虎の巻」など）', 'Bộ quy tắc nghiệp vụ theo phòng ban (ví dụ “Toranomaki” của CS khối Điện thoại AI)'),
  'rule/書式': L('各種申請書・稟議書などのテンプレート', 'Mẫu các loại đơn đề nghị · tờ trình phê duyệt…'),
  'rule/FAQ': L('よくある質問', 'Câu hỏi thường gặp'),
  'perf/全社/導入マップ': L('全国の導入施設を地図で表示（大学病院82校中51校導入など）', 'Hiển thị các cơ sở đã triển khai trên toàn quốc bằng bản đồ (ví dụ: 51 / 82 bệnh viện đại học)'),
  'dev/ロードマップ': L('プロダクト横断の開発計画・マイルストーンを時系列で表示（プロダクトは画面内で絞込み）', 'Hiển thị kế hoạch phát triển · mốc quan trọng của mọi sản phẩm theo dòng thời gian (lọc sản phẩm ngay trên màn hình)'),
  'dev/チケット': L('Redmineの開発チケット一覧（自分に割り当てられた分は やること＞予定 にも表示）', 'Danh sách ticket phát triển trên Redmine (ticket giao cho mình cũng hiện ở Việc cần làm › Lịch trình)'),
  'dev/要望一覧': L('顧客対応で受けた要望のうち、開発が対応するものの一覧（未着手／検討中／採用／見送り）', 'Danh sách yêu cầu nhận từ khách hàng mà đội phát triển xử lý (Chưa bắt đầu / Đang xem xét / Chấp nhận / Hoãn)'),
  'dev/リリースノート': L('本番リリースの内容を全社・CS向けにわかりやすく公開', 'Công bố nội dung phát hành chính thức một cách dễ hiểu cho toàn công ty · CS'),
  'dev/障害': L('インシデント＞台帳のうち「システム障害」だけを表示（登録は やること＞報告＞インシデント から）', 'Chỉ hiển thị “Sự cố hệ thống” trong Sự cố › Sổ theo dõi (đăng ký từ Việc cần làm › Báo cáo › Sự cố)'),
  'cs/学会': L('出展・登壇・ランチョンセミナー等の学会対応の管理', 'Quản lý hoạt động hội nghị học thuật: triển lãm · diễn thuyết · hội thảo buổi trưa…'),
  'inventory/在庫一覧': L('相模原拠点に保管している、顧客に提供する商品の在庫一覧', 'Danh sách tồn kho hàng hóa cung cấp cho khách, lưu tại kho Sagamihara'),
  'inventory/顧客貸与端末': L('顧客施設に貸与しているタブレット・スマホ等の端末の貸与先・返却状況の管理', 'Quản lý nơi mượn · tình trạng trả lại của máy tính bảng, điện thoại… cho cơ sở khách hàng mượn'),
  'inventory/ライセンス': L('SaaS製品のライセンス管理', 'Quản lý giấy phép các sản phẩm SaaS'),
  'inventory/パソコン': L('社員に貸与しているパソコンの資産・貸与者・更新状況の管理', 'Quản lý tài sản · người mượn · tình trạng thay mới của máy tính cấp cho nhân viên'),
  'inventory/スマホ': L('社員に貸与しているスマホ（端末・回線）の管理', 'Quản lý điện thoại (máy · đường truyền) cấp cho nhân viên'),
  'inventory/パンフレット': L('営業・学会・顧客訪問で使用するパンフレット等の販促物の在庫管理', 'Quản lý tồn kho tài liệu quảng cáo (tờ rơi…) dùng khi bán hàng · hội nghị · thăm khách'),
  'incident/台帳': L('各インシデントを種別（情報セキュリティ／システム障害／顧客現場トラブル／ヒヤリハット）・重大度・ステータス（対応中／有効性確認待ち／完了）で管理する台帳一覧。ステータス・種別で絞り込みが可能。', 'Sổ theo dõi quản lý từng sự cố theo loại (An ninh thông tin / Sự cố hệ thống / Rắc rối tại cơ sở khách hàng / Suýt xảy ra sự cố) · mức độ nghiêm trọng · trạng thái (Đang xử lý / Chờ xác nhận hiệu quả / Hoàn tất). Có thể lọc theo trạng thái · loại.'),
  'incident/集計': L('台帳データをもとに種別・件数・傾向・再発状況を分析するレポート画面', 'Màn hình báo cáo phân tích loại · số lượng · xu hướng · tình trạng tái phát dựa trên dữ liệu sổ theo dõi')
};
/* 目標｜結果 — 17 trang cùng một câu mẫu, sinh thay vì chép 17 lần */
(function () {
  var perfJa = { '全社/PL': 'PL', '全社/利用施設': '利用施設', '全社/利用ユーザー': '利用ユーザー', '全社/トスアップ': 'トスアップ' };
  var perfVi = { '全社/PL': 'PL', '全社/利用施設': 'cơ sở sử dụng', '全社/利用ユーザー': 'người dùng', '全社/トスアップ': 'toss-up' };
  PRODUCTS.forEach(function (p) {
    perfJa['事業部/' + p.ja] = p.ja + '事業部';
    perfVi['事業部/' + p.ja] = 'khối ' + p.vi;
  });
  ['AE', 'GT', 'LG', 'OB', 'CS', 'TA', 'PR'].forEach(function (c) { perfJa['個人/' + c] = c; perfVi['個人/' + c] = c; });
  Object.keys(perfJa).forEach(function (k) {
    PLACEHOLDER_DESC['perf/' + k] = L(perfJa[k] + 'の目標と結果（計画・実績・達成率）を並べて表示',
      'Hiển thị song song mục tiêu và kết quả của ' + perfVi[k] + ' (kế hoạch · thực tế · tỷ lệ đạt)');
  });
})();

var PLACEHOLDER_ACTIONS = {
  'incident/台帳': { label: L('インシデントを報告', 'Báo cáo sự cố'), icon: 'add-circle', target: 'todo/報告/インシデント' }
};

/* §リンク */
var LINK_GROUPS = [
  { id: 'corp', label: L('公式HP', 'Website chính thức'), items: [
    { key: 'link/corp/corpJP', label: L('コーポレート JP', 'Doanh nghiệp JP') },
    { key: 'link/corp/corpVN', label: L('コーポレート VN', 'Doanh nghiệp VN') },
    { key: 'link/corp/recruitJP', label: L('採用 JP', 'Tuyển dụng JP') },
    { key: 'link/corp/recruitVN', label: L('採用 VN', 'Tuyển dụng VN') },
    { key: 'link/corp/svcDrJOY', label: L('サービス Dr.JOY', 'Dịch vụ Dr.JOY') },
    { key: 'link/corp/svcPrJOY', label: L('サービス Pr.JOY', 'Dịch vụ Pr.JOY') },
    { key: 'link/corp/joystore', label: 'JOYstore' }
  ] },
  { id: 'sns', label: 'SNS', items: [
    { key: 'link/sns/x', label: 'X' },
    { key: 'link/sns/facebook', label: 'Facebook' },
    { key: 'link/sns/youtube', label: 'Youtube' },
    { key: 'link/sns/news', label: L('お知らせ', 'Tin tức') }
  ] },
  { id: 'appprod', label: L('app本番', 'App production'), items: [
    { key: 'link/appprod/drjoy', label: 'Dr.JOY' },
    { key: 'link/appprod/prjoy', label: 'Pr.JOY' },
    { key: 'link/appprod/attend', label: L('出席管理', 'Quản lý điểm danh') },
    { key: 'link/appprod/admin', label: 'Admin' },
    { key: 'link/appprod/lookerin', label: L('Looker 社内向け', 'Looker nội bộ') },
    { key: 'link/appprod/lookerout', label: L('Looker 社外向け', 'Looker bên ngoài') },
    { key: 'link/appprod/usage', label: L('ユーザー利用状況', 'Tình hình sử dụng') }
  ] },
  { id: 'demo', label: L('demo商談', 'Demo bán hàng'), items: [
    { key: 'link/demo/drjoy', label: 'Dr.JOY' },
    { key: 'link/demo/prjoy', label: 'Pr.JOY' },
    { key: 'link/demo/attend', label: L('出席管理', 'Quản lý điểm danh') },
    { key: 'link/demo/admin', label: 'Admin' }
  ] },
  { id: 'staging', label: 'staging', items: [
    { key: 'link/staging/drjoy', label: 'Dr.JOY' },
    { key: 'link/staging/prjoy', label: 'Pr.JOY' },
    { key: 'link/staging/attend', label: L('出席管理', 'Quản lý điểm danh') },
    { key: 'link/staging/admin', label: 'Admin' },
    { key: 'link/staging/looker', label: 'Looker' }
  ] },
  { id: 'develop', label: 'develop', items: [
    { key: 'link/develop/drjoy', label: 'Dr.JOY' },
    { key: 'link/develop/prjoy', label: 'Pr.JOY' },
    { key: 'link/develop/attend', label: L('出席管理', 'Quản lý điểm danh') },
    { key: 'link/develop/admin', label: 'Admin' }
  ] },
  { id: 'jackfruit', label: 'jackfruit', items: [
    { key: 'link/jackfruit/drjoy', label: 'Dr.JOY' },
    { key: 'link/jackfruit/prjoy', label: 'Pr.JOY' },
    { key: 'link/jackfruit/attend', label: L('出席管理', 'Quản lý điểm danh') },
    { key: 'link/jackfruit/admin', label: 'Admin' }
  ] },
  { id: 'genai', label: L('生成AI', 'AI tạo sinh'), items: [
    { key: 'link/genai/usage', label: L('利用集計', 'Thống kê sử dụng') },
    { key: 'link/genai/claude', label: 'Claude' },
    { key: 'link/genai/manus', label: 'Manus' },
    { key: 'link/genai/gemini', label: 'Gemini' },
    { key: 'link/genai/notebooklm', label: 'NotebookLM' },
    { key: 'link/genai/gamma', label: 'Gamma' },
    { key: 'link/genai/turboscribe', label: 'Turboscribe' }
  ] }
];

/* §データソース (設定 › データソース) — giữ nguyên thư mục Drive của bản gốc */
var DS_ROOT_URL = 'https://drive.google.com/drive/folders/108vZOkweR572HcbGZ8JuYCzAhnkx3I9f';
var DS_ROWS = [
  { id: 'ds-row-staff', menu: L('メンバー＞名簿・組織図・座席', 'Thành viên › Danh bạ · Sơ đồ tổ chức · Chỗ ngồi'), source: L('Googleスプレッドシート「名簿_組織図_座席_会議」', 'Google Sheets “名簿_組織図_座席_会議”'), folderName: '02_メンバー', folderUrl: 'https://drive.google.com/drive/folders/1e-QShj5IA1J_NQfDY9qLRiwBzSztifna', owner: '人材戦略部', freq: L('月次（毎月第2営業日更新）', 'Hằng tháng (cập nhật ngày làm việc thứ 2 mỗi tháng)'), ok: true },
  { id: 'ds-row-jobtype', menu: L('職種マスタ（目標｜結果＞個人・研修＞役割別・ツールチップ）', 'Danh mục vị trí (Mục tiêu｜Kết quả › Cá nhân · Đào tạo › Theo vai trò · tooltip)'), source: L('同スプレッドシート「職種」シート', 'Sheet “職種” trong cùng bảng tính'), folderName: '00_マスタ/職種', folderUrl: 'https://drive.google.com/drive/folders/1lybY0TcfRTXtfpUwlRmb5TGgPalcOEV1', owner: '人材戦略部', freq: L('随時', 'Khi cần'), ok: true },
  { id: 'ds-row-health', menu: L('健康JOY', 'Sức khỏe JOY'), source: L('JOY START内で管理', 'Quản lý trong JOY START'), folderName: '06_健康JOY', owner: '人材戦略部', freq: L('随時', 'Khi cần') },
  { id: 'ds-row-cs', menu: L('顧客対応（施設・リード・案件・オンボーディング・リテンション）', 'Khách hàng (Cơ sở · Khách tiềm năng · Cơ hội · Onboarding · Duy trì)'), source: L('Mazrica（要確認）', 'Mazrica (cần xác nhận)'), folderName: '08_顧客対応', folderUrl: 'https://drive.google.com/drive/folders/1-xjRqGkvSjZu6sWRc8GgAIFQ4AiFqzDA', owner: 'AI事業開発部', freq: L('要確認', 'Cần xác nhận') },
  { id: 'ds-row-recruit', menu: L('採用', 'Tuyển dụng'), source: L('ATS（製品名要確認）', 'ATS (cần xác nhận tên sản phẩm)'), folderName: '03_採用', folderUrl: 'https://drive.google.com/drive/folders/1XoKC_VI3WeVzwAUi_xncock0QXzqXuV-', owner: '人材戦略部', freq: L('要確認', 'Cần xác nhận') },
  { id: 'ds-row-apply', menu: L('申請＞勤怠・経費', 'Đơn đề nghị › Chấm công · Chi phí'), source: L('freee（要確認）', 'freee (cần xác nhận)'), folderName: '01_やること/申請', folderUrl: 'https://drive.google.com/drive/folders/1biEcrIBxtWJD0qhQmtNymF2iGc3Rx2wq', owner: '経営戦略部・業務推進部', freq: L('要確認', 'Cần xác nhận') },
  { id: 'ds-row-pl', menu: L('目標｜結果＞全社＞PL', 'Mục tiêu｜Kết quả › Toàn công ty › PL'), source: L('freee（要確認）', 'freee (cần xác nhận)'), folderName: '07_目標｜結果/全社', folderUrl: 'https://drive.google.com/drive/folders/1soCRQSunzmP1c0fm-PYUXWJfgUyED9J0', owner: '経営戦略部・業務推進部', freq: L('要確認', 'Cần xác nhận') },
  { id: 'ds-row-map', menu: L('目標｜結果＞全社＞導入マップ', 'Mục tiêu｜Kết quả › Toàn công ty › Bản đồ triển khai'), source: L('顧客対応＞施設（要確認）', 'Khách hàng › Cơ sở y tế (cần xác nhận)'), folderName: '07_目標｜結果/全社', folderUrl: 'https://drive.google.com/drive/folders/1soCRQSunzmP1c0fm-PYUXWJfgUyED9J0', owner: '経営戦略部', freq: L('要確認', 'Cần xác nhận') },
  { id: 'ds-row-dev-ticket', menu: L('開発＞チケット', 'Phát triển › Ticket'), source: 'Redmine', folderName: '09_開発', owner: '研究開発部', freq: L('要確認', 'Cần xác nhận') },
  { id: 'ds-row-dev', menu: L('開発（ロードマップ・要望一覧・リリースノート）', 'Phát triển (Lộ trình · Danh sách yêu cầu · Ghi chú phát hành)'), source: L('要確認', 'Cần xác nhận'), folderName: '09_開発', owner: '研究開発部', freq: L('要確認', 'Cần xác nhận') },
  { id: 'ds-row-inventory', menu: L('在庫', 'Kho'), source: L('要確認', 'Cần xác nhận'), folderName: '10_在庫', folderUrl: 'https://drive.google.com/drive/folders/19jLGCZrqeGjPp9UzMPJlMsqDcz82W-14', owner: '業務推進部', freq: L('要確認', 'Cần xác nhận') },
  { id: 'ds-row-incident', menu: L('インシデント台帳（開発＞障害と同一データ）', 'Sổ theo dõi sự cố (cùng dữ liệu với Phát triển › Lỗi hệ thống)'), source: L('JOY START内で管理', 'Quản lý trong JOY START'), folderName: '11_インシデント/台帳', folderUrl: 'https://drive.google.com/drive/folders/1XqwcQcY_D4ZYWC4YU2x2orKEvKW69-zo', owner: '業務推進部', freq: L('要確認', 'Cần xác nhận') },
  { id: 'ds-row-rule', menu: L('ルール（就業規則・社内規程・業務マニュアル・虎の巻）', 'Quy định (Nội quy lao động · Quy chế nội bộ · Hướng dẫn nghiệp vụ · Toranomaki)'), source: L('Googleドライブ（要確認）', 'Google Drive (cần xác nhận)'), folderName: '05_ルール', folderUrl: 'https://drive.google.com/drive/folders/1ABaUSpwWpH71_dzRRl8lRspij6dvB37w', owner: '人材戦略部・業務推進部', freq: L('要確認', 'Cần xác nhận') },
  { id: 'ds-row-train', menu: L('研修', 'Đào tạo'), source: L('要確認', 'Cần xác nhận'), folderName: '04_研修', folderUrl: 'https://drive.google.com/drive/folders/1MZ-VAnbHdJIQ3f1Db1vfPeB5L38TCYRw', owner: '人材戦略部', freq: L('要確認', 'Cần xác nhận') },
  { id: 'ds-row-search-drive', menu: L('全体検索＞Googleドライブ', 'Tìm kiếm toàn bộ › Google Drive'), source: L('Google Drive（要確認）', 'Google Drive (cần xác nhận)'), folderName: '—', owner: '業務推進部', freq: L('要確認', 'Cần xác nhận') },
  { id: 'ds-row-search-gmail', menu: L('全体検索＞Gmail', 'Tìm kiếm toàn bộ › Gmail'), source: L('Gmail（要確認）', 'Gmail (cần xác nhận)'), folderName: '—', owner: '業務推進部', freq: L('要確認', 'Cần xác nhận') },
  { id: 'ds-row-search-drjoy', menu: L('全体検索＞Dr.JOY（投稿・グループ）', 'Tìm kiếm toàn bộ › Dr.JOY (bài đăng · nhóm)'), source: L('Dr.JOY MCP（要確認）', 'Dr.JOY MCP (cần xác nhận)'), folderName: '—', owner: 'AI事業開発部', freq: L('要確認', 'Cần xác nhận') }
];
var DS_BY_ID = {};
DS_ROWS.forEach(function (r) { DS_BY_ID[r.id] = r; });

var PAGE_DS_MAP = {
  'staff/名簿': 'ds-row-staff', 'staff/組織図': 'ds-row-staff', 'staff/座席': 'ds-row-staff',
  'health/記録': 'ds-row-health', 'health/ランキング': 'ds-row-health', 'health/部活': 'ds-row-health', 'health/制度｜サポート': 'ds-row-health',
  'train/役割別/AE｜GT': 'ds-row-jobtype', 'train/役割別/LG': 'ds-row-jobtype', 'train/役割別/CS｜OB': 'ds-row-jobtype', 'train/役割別/TA': 'ds-row-jobtype',
  'cs/施設': 'ds-row-cs', 'cs/リード': 'ds-row-cs',
  'recruit/計画': 'ds-row-recruit', 'recruit/募集中/ポジション一覧': 'ds-row-recruit', 'recruit/募集中/選考状況': 'ds-row-recruit',
  'recruit/紹介キャンペーン/紹介する': 'ds-row-recruit', 'recruit/紹介キャンペーン/紹介実績': 'ds-row-recruit',
  'recruit/実績/入社人数': 'ds-row-recruit', 'recruit/実績/コスト': 'ds-row-recruit',
  'todo/申請/勤怠': 'ds-row-apply', 'todo/申請/経費': 'ds-row-apply',
  'perf/全社/PL': 'ds-row-pl', 'perf/全社/導入マップ': 'ds-row-map',
  'dev/ロードマップ': 'ds-row-dev', 'dev/チケット': 'ds-row-dev-ticket', 'dev/要望一覧': 'ds-row-dev', 'dev/リリースノート': 'ds-row-dev', 'dev/障害': 'ds-row-incident',
  'inventory/在庫一覧': 'ds-row-inventory', 'inventory/顧客貸与端末': 'ds-row-inventory', 'inventory/ライセンス': 'ds-row-inventory',
  'inventory/パソコン': 'ds-row-inventory', 'inventory/スマホ': 'ds-row-inventory', 'inventory/パンフレット': 'ds-row-inventory',
  'incident/台帳': 'ds-row-incident',
  'rule/就業規則': 'ds-row-rule', 'rule/社内規程': 'ds-row-rule', 'rule/業務マニュアル': 'ds-row-rule', 'rule/書式': 'ds-row-rule', 'rule/FAQ': 'ds-row-rule'
};
['perf/個人/AE', 'perf/個人/GT', 'perf/個人/LG', 'perf/個人/OB', 'perf/個人/CS', 'perf/個人/TA', 'perf/個人/PR'].forEach(function (k) { PAGE_DS_MAP[k] = 'ds-row-jobtype'; });
['案件', 'オンボーディング', 'リテンション'].forEach(function (g) {
  PRODUCTS.forEach(function (p) { PAGE_DS_MAP['cs/' + g + '/' + p.ja] = 'ds-row-cs'; });
});

/* §HOME — MVV */
var MVV = {
  mission: L('すべての医療従事者に、<span class="jw-mvv-nb">次の一手を</span>', 'Mang đến <span class="jw-mvv-nb">bước đi tiếp theo</span> cho mọi nhân viên y tế'),
  vision: L('不要な非臨床業務を<span class="jw-mvv-nb"><span class="jw-mvv-em">"1秒"</span>でも減らす</span>', 'Giảm bớt công việc phi lâm sàng không cần thiết, <span class="jw-mvv-nb">dù chỉ <span class="jw-mvv-em">"1 giây"</span></span>'),
  values: [L('変数どこ？', 'Biến số ở đâu?'), L('素直さ is King', 'Cầu thị is King'), L('まずAI', 'AI trước tiên'), L('自分ごと', 'Coi là việc của mình'), L('やりきり力', 'Làm đến cùng')],
  impactHours: 1284
};

/* §HOME — số việc của tôi (mẫu) */
var HOME_COUNTS = [
  { label: '承認待ち', icon: 'verified-check', num: 3, page: 'todo/承認' },
  { label: '期限切れ', icon: 'alarm', num: 2, page: 'todo/予定' },
  { label: '今日の予定', icon: 'calendar', num: 4, page: 'todo/予定' },
  { label: '未読のお知らせ', icon: 'bell', unread: true }
];

/* §お知らせ */
var ANNOUNCE_TABS = ['すべて', '未読', '全社', '人事', '制度・ルール', 'IT・システム', 'イベント', 'リリース', '表彰', 'JOY Express'];
var ANNOUNCE_TAB_DESC = {
  'すべて': L('すべてのお知らせ', 'Tất cả thông báo'),
  '未読': L('まだ読んでいないお知らせだけを表示', 'Chỉ hiện thông báo chưa đọc'),
  '全社': L('経営方針・組織・全社への連絡', 'Định hướng kinh doanh · tổ chức · thông tin toàn công ty'),
  '人事': L('入退社・異動・評価・給与・年末調整', 'Vào / nghỉ việc · điều chuyển · đánh giá · lương · quyết toán thuế'),
  '制度・ルール': L('就業規則や規程の改定、新しい運用ルール', 'Sửa đổi nội quy, quy chế và quy tắc vận hành mới'),
  'IT・システム': L('メンテナンス・障害・新ツール・セキュリティ', 'Bảo trì · sự cố · công cụ mới · bảo mật'),
  'イベント': L('全社会・勉強会・社内イベントの告知', 'Họp toàn công ty · buổi học · sự kiện nội bộ'),
  'リリース': L('プロダクトの新機能・改善（リリースノート）', 'Tính năng mới · cải tiến sản phẩm (ghi chú phát hành)'),
  '表彰': L('MVP・ベストプラクティス', 'MVP · Best Practice'),
  'JOY Express': L('社内報', 'Bản tin nội bộ')
};
var ANNOUNCE_TONE = { '全社': 'orange', '人事': 'plum', '制度・ルール': 'green', 'IT・システム': 'blue', 'イベント': 'rose', 'リリース': 'teal', '表彰': 'gold', 'JOY Express': 'brown' };
var ANNOUNCEMENTS = [
  { id: 'a12', cat: 'IT・システム', date: '2026/09/25', unread: true, important: true, title: L('10/1 午前2時〜4時にDr.JOYのメンテナンスを行います', 'Bảo trì Dr.JOY từ 2:00 đến 4:00 sáng ngày 1/10') },
  { id: 'a01', cat: 'JOY Express', date: '2026/09/24', unread: true, title: L('大学病院導入が51校に到達しました', 'Số bệnh viện đại học triển khai đã đạt 51') },
  { id: 'a11', cat: 'イベント', date: '2026/09/23', unread: true, title: L('10月の全社会のご案内', 'Thông báo họp toàn công ty tháng 10') },
  { id: 'a02', cat: '人事', date: '2026/09/22', unread: true, title: L('10月度の組織変更について', 'Về việc thay đổi tổ chức tháng 10') },
  { id: 'a10', cat: '制度・ルール', date: '2026/09/21', unread: true, important: true, title: L('テレワーク規程を改定しました（10月1日施行）', 'Đã sửa đổi quy chế làm việc từ xa (áp dụng từ 1/10)') },
  { id: 'r01', cat: 'リリース', date: '2026/09/26', unread: true, title: L('AI電話：通話要約の精度を改善しました（v3.12）', 'Điện thoại AI: cải thiện độ chính xác tóm tắt cuộc gọi (v3.12)') },
  { id: 'r02', cat: 'リリース', date: '2026/09/17', title: L('Dr.JOY アプリ：勤怠申請の画面を刷新しました（v5.4）', 'Ứng dụng Dr.JOY: làm mới màn hình đơn chấm công (v5.4)') },
  { id: 'a03', cat: '表彰', date: '2026/09/20', title: L('9月度MVPはAI電話事業部 サンプル太郎さんです', 'MVP tháng 9: サンプル太郎 – khối Điện thoại AI') },
  { id: 'a04', cat: 'JOY Express', date: '2026/09/18', title: L('新機能「導入マップ」をリリースしました', 'Đã phát hành tính năng mới “Bản đồ triển khai”') },
  { id: 'a05', cat: '人事', date: '2026/09/16', title: L('年末調整の書類提出は10月15日までにお願いします', 'Vui lòng nộp hồ sơ quyết toán thuế cuối năm trước ngày 15/10') },
  { id: 'a09', cat: '全社', date: '2026/09/14', title: L('新しい経費精算フローのお知らせ', 'Thông báo quy trình thanh toán chi phí mới') },
  { id: 'a06', cat: 'JOY Express', date: '2026/09/12', title: L('AI電話の導入施設が前月比で増加しました（9月速報）', 'Số cơ sở triển khai Điện thoại AI tăng so với tháng trước (số liệu nhanh tháng 9)') },
  { id: 'a07', cat: '表彰', date: '2026/09/08', title: L('上期ベストプラクティス賞の受賞チームが決定しました', 'Đã chọn được đội đoạt giải Best Practice nửa đầu năm') },
  { id: 'a08', cat: '人事', date: '2026/09/03', title: L('ハノイ拠点との合同オンライン研修（10月開催）の参加者を募集します', 'Tuyển người tham gia khóa đào tạo trực tuyến chung với văn phòng Hà Nội (tháng 10)') }
];
var ANNOUNCE_TOTAL_MEMBERS = 353;
/* Nội dung chi tiết. `{{release}}` = nút sang 開発 › リリースノート (dựng lúc render để nhãn dịch được). */
var ANNOUNCE_DETAILS = {
  a12: { dept: '業務推進部 情報システム', name: 'サンプル 一郎', readers: 128,
    body: L('<p>サービス品質向上のため、下記の日程でDr.JOYのシステムメンテナンスを行います。メンテナンス中は一部の機能がご利用いただけません。</p><h3>日時</h3><ul><li>2026年10月1日（木）午前2:00〜4:00（予定）</li><li>作業の状況により、終了時刻が前後する場合があります</li></ul><h3>影響範囲</h3><ul><li>Web版・アプリ版ともにログインできません</li><li>AI電話・SMSの送受信は通常どおり動きます</li><li>勤怠の打刻は、メンテナンス後に手動で修正してください</li></ul><h3>お願い</h3><p>夜勤帯で病院さまとやり取りのあるメンバーは、事前に担当施設へご案内をお願いします。案内文のひな形を添付しています。</p>',
      '<p>Nhằm nâng cao chất lượng dịch vụ, chúng tôi sẽ bảo trì hệ thống Dr.JOY theo lịch dưới đây. Trong thời gian bảo trì, một số chức năng sẽ không sử dụng được.</p><h3>Thời gian</h3><ul><li>Thứ Năm, 1/10/2026, 2:00–4:00 sáng (dự kiến)</li><li>Giờ kết thúc có thể xê dịch tùy tình hình công việc</li></ul><h3>Phạm vi ảnh hưởng</h3><ul><li>Không thể đăng nhập cả bản Web lẫn ứng dụng</li><li>Điện thoại AI và gửi / nhận SMS vẫn hoạt động bình thường</li><li>Dữ liệu chấm công trong thời gian bảo trì vui lòng sửa thủ công sau khi bảo trì xong</li></ul><h3>Đề nghị</h3><p>Thành viên có liên lạc với bệnh viện vào ca đêm, vui lòng báo trước cho cơ sở mình phụ trách. Mẫu thông báo có trong tệp đính kèm.</p>'),
    files: [{ name: 'メンテナンス案内_病院さま向けひな形.pdf', ext: 'PDF', size: '182KB' }] },
  a01: { dept: 'ブランディング戦略部', name: 'サンプル 花子', readers: 241,
    body: L('<p>全国82校の大学病院のうち、51校（62%）でDr.JOYをご導入いただきました。現場の皆さんの積み重ねの成果です。ありがとうございます。</p><h3>この半年で増えたこと</h3><ul><li>新規導入：6校</li><li>AI電話の追加導入：9施設</li></ul><p>次の目標は60校です。導入事例の取材に協力いただける施設があれば、ブランディング戦略部までご連絡ください。</p>',
      '<p>Trong số 82 bệnh viện đại học trên toàn quốc, 51 bệnh viện (62%) đã triển khai Dr.JOY. Đây là thành quả tích lũy của mọi người ở hiện trường. Xin cảm ơn!</p><h3>Những gì tăng lên trong nửa năm qua</h3><ul><li>Triển khai mới: 6 bệnh viện</li><li>Triển khai thêm Điện thoại AI: 9 cơ sở</li></ul><p>Mục tiêu tiếp theo là 60 bệnh viện. Nếu có cơ sở sẵn lòng nhận phỏng vấn làm case study, vui lòng liên hệ Phòng Chiến lược Thương hiệu.</p>'),
    files: [] },
  a11: { dept: '人材戦略部', name: 'サンプル 次郎', readers: 176,
    body: L('<p>10月の全社会を下記のとおり開催します。JP・VNの全メンバーが対象です。</p><h3>開催概要</h3><ul><li>日時：10月3日（土）14:00〜16:00</li><li>会場：本社大会議室（オンライン同時配信あり）</li><li>内容：上期の振り返り、下期の方針、表彰</li></ul><p>オンラインで参加する方は、前日までに配信URLをお送りします。欠席する場合は、所属長にお伝えください。</p>',
      '<p>Họp toàn công ty tháng 10 sẽ được tổ chức như sau. Đối tượng là toàn bộ thành viên JP · VN.</p><h3>Tổng quan</h3><ul><li>Thời gian: Thứ Bảy 3/10, 14:00–16:00</li><li>Địa điểm: Phòng họp lớn trụ sở chính (có phát trực tuyến đồng thời)</li><li>Nội dung: nhìn lại nửa đầu năm, định hướng nửa cuối năm, khen thưởng</li></ul><p>Người tham gia trực tuyến sẽ nhận URL phát sóng chậm nhất một ngày trước. Nếu vắng mặt, vui lòng báo cho quản lý trực tiếp.</p>'),
    files: [{ name: '10月全社会_アジェンダ.pdf', ext: 'PDF', size: '96KB' }] },
  a02: { dept: '人材戦略部', name: 'サンプル 三郎', readers: 203,
    body: L('<p>10月1日付で、下記の組織変更を行います。</p><h3>主な変更点</h3><ul><li>AI電話事業部に「オンボーディング課」を新設します</li><li>研究開発部のQAチームを、品質保証課として独立させます</li><li>ハノイ拠点のTSチームを2つに分けます</li></ul><p>新しい組織図は添付のとおりです。異動がある方には、所属長から個別にお伝えしています。</p>',
      '<p>Từ ngày 1/10, công ty sẽ thay đổi tổ chức như sau.</p><h3>Thay đổi chính</h3><ul><li>Thành lập “Nhóm Onboarding” mới trong khối Điện thoại AI</li><li>Tách đội QA của Phòng Nghiên cứu &amp; Phát triển thành Nhóm Đảm bảo Chất lượng độc lập</li><li>Chia đội TS của văn phòng Hà Nội thành 2 đội</li></ul><p>Sơ đồ tổ chức mới xem trong tệp đính kèm. Người có thay đổi vị trí đã được quản lý trực tiếp thông báo riêng.</p>'),
    files: [{ name: '2026年10月_組織図.pdf', ext: 'PDF', size: '324KB' }, { name: '異動者一覧.xlsx', ext: 'XLSX', size: '28KB' }] },
  a10: { dept: '法務部', name: 'サンプル 四郎', readers: 152,
    body: L('<p>テレワーク規程を改定しました。10月1日から施行します。</p><h3>改定のポイント</h3><ul><li>テレワークの申請を「前日まで」から「当日の始業前まで」に変更</li><li>自宅以外の作業場所（コワーキング等）を、事前登録すれば利用可能に</li><li>公共の場所で画面を開くときは、のぞき見防止フィルターを必須に</li></ul><p>改定前後の対照表を添付しています。ご不明な点は法務部までお問い合わせください。</p>',
      '<p>Quy chế làm việc từ xa đã được sửa đổi và có hiệu lực từ ngày 1/10.</p><h3>Điểm sửa đổi</h3><ul><li>Hạn đăng ký làm việc từ xa đổi từ “trước ngày hôm trước” thành “trước giờ bắt đầu làm việc trong ngày”</li><li>Được làm việc ở nơi ngoài nhà riêng (coworking…) nếu đăng ký trước</li><li>Bắt buộc dùng miếng dán chống nhìn trộm khi mở màn hình ở nơi công cộng</li></ul><p>Bảng đối chiếu trước / sau sửa đổi có trong tệp đính kèm. Nếu có thắc mắc, vui lòng liên hệ Phòng Pháp chế.</p>'),
    files: [{ name: 'テレワーク規程_新旧対照表.pdf', ext: 'PDF', size: '148KB' }] },
  a03: { dept: '人材戦略部', name: 'サンプル 五郎', readers: 219,
    body: L('<p>9月度のMVPは、AI電話事業部のサンプル太郎さんに決まりました。おめでとうございます。</p><h3>受賞の理由</h3><ul><li>担当施設のAI電話の応答率を、2か月で78%から93%に改善</li><li>改善の手順をまとめ、チーム全体で使えるようにした</li></ul><p>10月の全社会で表彰します。皆さんも拍手でお祝いしましょう。</p>',
      '<p>MVP tháng 9 là サンプル太郎 của khối Điện thoại AI. Xin chúc mừng!</p><h3>Lý do được chọn</h3><ul><li>Nâng tỷ lệ trả lời của Điện thoại AI tại cơ sở phụ trách từ 78% lên 93% trong 2 tháng</li><li>Tổng hợp quy trình cải thiện để cả đội cùng dùng được</li></ul><p>Lễ khen thưởng sẽ diễn ra tại buổi họp toàn công ty tháng 10. Mọi người hãy cùng vỗ tay chúc mừng nhé!</p>'),
    files: [] },
  a04: { dept: '研究開発部', name: 'サンプル 六郎', readers: 188,
    body: L('<p>新機能「導入マップ」をリリースしました。全国の導入施設を地図で確認できます。</p><h3>できること</h3><ul><li>都道府県別の導入施設数を地図で表示</li><li>プロダクト（勤怠・AI電話・面会など）ごとの絞り込み</li></ul><p>商談の準備や、地域ごとの営業計画にご活用ください。使い方は添付のガイドをご覧ください。</p>',
      '<p>Đã phát hành tính năng mới “Bản đồ triển khai”: xem các cơ sở đã triển khai trên toàn quốc bằng bản đồ.</p><h3>Có thể làm gì</h3><ul><li>Hiển thị số cơ sở triển khai theo từng tỉnh / thành trên bản đồ</li><li>Lọc theo sản phẩm (chấm công · Điện thoại AI · gặp mặt…)</li></ul><p>Hãy tận dụng khi chuẩn bị đàm phán hay lập kế hoạch kinh doanh theo khu vực. Cách dùng xem trong hướng dẫn đính kèm.</p>'),
    files: [{ name: '導入マップ_使い方ガイド.pdf', ext: 'PDF', size: '1.2MB' }] },
  a05: { dept: '経営戦略部 経理', name: 'サンプル 七子', readers: 264,
    body: L('<p>年末調整の書類の提出期限は、10月15日（木）です。期限を過ぎると、今年の年末調整に間に合わない場合があります。</p><h3>提出するもの</h3><ul><li>扶養控除等申告書</li><li>保険料控除申告書（生命保険・地震保険など）</li><li>住宅ローン控除の書類（該当する方のみ）</li></ul><p>書類は「やること＞申請＞身上変更」からアップロードできます。</p>',
      '<p>Hạn nộp hồ sơ quyết toán thuế cuối năm là Thứ Năm 15/10. Nếu quá hạn, có thể không kịp quyết toán trong năm nay.</p><h3>Hồ sơ cần nộp</h3><ul><li>Tờ khai giảm trừ người phụ thuộc</li><li>Tờ khai khấu trừ phí bảo hiểm (bảo hiểm nhân thọ · bảo hiểm động đất…)</li><li>Hồ sơ khấu trừ vay mua nhà (chỉ người thuộc diện)</li></ul><p>Có thể tải hồ sơ lên từ “Việc cần làm › Đơn đề nghị › Thay đổi thông tin cá nhân”.</p>'),
    files: [{ name: '年末調整_記入例.pdf', ext: 'PDF', size: '412KB' }] },
  a09: { dept: '経営戦略部 経理', name: 'サンプル 八郎', readers: 231,
    body: L('<p>経費精算のフローを見直しました。承認までの日数を短くするのがねらいです。</p><h3>変わること</h3><ul><li>5,000円未満の経費は、所属長の承認だけで精算できます</li><li>領収書は写真のアップロードだけでよくなります（原本の提出は不要）</li></ul><p>新しいフローは10月分の精算から適用します。</p>',
      '<p>Quy trình thanh toán chi phí đã được xem xét lại, nhằm rút ngắn số ngày chờ duyệt.</p><h3>Những thay đổi</h3><ul><li>Chi phí dưới 5.000 yên chỉ cần quản lý trực tiếp duyệt là thanh toán được</li><li>Hóa đơn chỉ cần tải ảnh lên (không cần nộp bản gốc)</li></ul><p>Quy trình mới áp dụng từ kỳ thanh toán tháng 10.</p>'),
    files: [] },
  a06: { dept: 'AI事業開発部', name: 'サンプル 九郎', readers: 170,
    body: L('<p>9月のAI電話の導入施設数は、前月より増えました（速報値）。</p><h3>ポイント</h3><ul><li>新規の導入は地域の中核病院が中心</li><li>予約変更の電話を自動で受ける使い方が増えています</li></ul><p>確定値は10月上旬の経営会議のあとにお知らせします。</p>',
      '<p>Số cơ sở triển khai Điện thoại AI trong tháng 9 đã tăng so với tháng trước (số liệu nhanh).</p><h3>Điểm chính</h3><ul><li>Triển khai mới chủ yếu là các bệnh viện trung tâm của khu vực</li><li>Cách dùng tự động tiếp nhận cuộc gọi đổi lịch hẹn đang tăng</li></ul><p>Số liệu chính thức sẽ được thông báo sau cuộc họp ban lãnh đạo đầu tháng 10.</p>'),
    files: [] },
  a07: { dept: '人材戦略部', name: 'サンプル 十子', readers: 198,
    body: L('<p>上期のベストプラクティス賞の受賞チームが決まりました。</p><h3>受賞チーム</h3><ul><li>最優秀賞：労務支援事業部 オンボーディングチーム</li><li>優秀賞：ハノイ拠点 TSチーム</li></ul><p>受賞チームの取り組みは、10月の全社会で発表していただきます。</p>',
      '<p>Đã chọn được các đội đoạt giải Best Practice nửa đầu năm.</p><h3>Đội đoạt giải</h3><ul><li>Giải xuất sắc nhất: Đội Onboarding – khối Hỗ trợ Lao động</li><li>Giải xuất sắc: Đội TS – văn phòng Hà Nội</li></ul><p>Các đội đoạt giải sẽ trình bày cách làm của mình tại buổi họp toàn công ty tháng 10.</p>'),
    files: [] },
  r01: { dept: '研究開発部', name: 'サンプル 十二郎', readers: 96,
    body: L('<h3>リリース内容</h3><ul><li>通話要約の精度を改善しました（v3.12）。用件・折り返しの要否・患者さまの氏名の聞き取りミスを減らしています</li><li>要約の冒頭に「用件」を1行で表示するようにしました</li></ul><h3>対象</h3><ul><li>AI電話を導入しているすべての施設（設定の変更は不要です）</li></ul><h3>影響</h3><ul><li>9月26日以降の通話から新しい要約になります。過去の要約は変わりません</li><li>要約の文章の形が少し変わるため、病院さまから質問があれば「精度改善のため」とご案内ください</li></ul><p>{{release}}</p>',
      '<h3>Nội dung phát hành</h3><ul><li>Cải thiện độ chính xác tóm tắt cuộc gọi (v3.12): giảm lỗi nghe nhầm yêu cầu, việc có cần gọi lại hay không, họ tên bệnh nhân</li><li>Hiển thị “Yêu cầu” trong 1 dòng ở đầu bản tóm tắt</li></ul><h3>Đối tượng</h3><ul><li>Tất cả cơ sở đã triển khai Điện thoại AI (không cần thay đổi cài đặt)</li></ul><h3>Ảnh hưởng</h3><ul><li>Cuộc gọi từ ngày 26/9 trở đi dùng bản tóm tắt mới; bản tóm tắt cũ không đổi</li><li>Văn phong tóm tắt thay đổi đôi chút — nếu bệnh viện hỏi, vui lòng giải thích là “để cải thiện độ chính xác”</li></ul><p>{{release}}</p>'),
    files: [] },
  r02: { dept: '研究開発部', name: 'サンプル 十三子', readers: 158,
    body: L('<h3>リリース内容</h3><ul><li>Dr.JOY アプリの勤怠申請の画面を刷新しました（v5.4）</li><li>申請の種類を最初に選ぶ形にし、入力の項目を減らしました</li><li>差し戻された申請を、そのまま直して再申請できるようにしました</li></ul><h3>対象</h3><ul><li>労務支援（勤怠）を導入している施設の職員の方</li><li>iOS・Android のアプリ（Web版は10月に対応予定）</li></ul><h3>影響</h3><ul><li>アプリを最新版に更新すると新しい画面になります</li><li>申請のデータや承認の流れは変わりません</li></ul><p>{{release}}</p>',
      '<h3>Nội dung phát hành</h3><ul><li>Làm mới màn hình đơn chấm công của ứng dụng Dr.JOY (v5.4)</li><li>Chọn loại đơn trước, giảm số mục phải nhập</li><li>Đơn bị trả lại có thể sửa và nộp lại ngay</li></ul><h3>Đối tượng</h3><ul><li>Nhân viên của các cơ sở đã triển khai Hỗ trợ Lao động (chấm công)</li><li>Ứng dụng iOS · Android (bản Web dự kiến hỗ trợ vào tháng 10)</li></ul><h3>Ảnh hưởng</h3><ul><li>Cập nhật ứng dụng lên bản mới nhất sẽ thấy màn hình mới</li><li>Dữ liệu đơn và luồng phê duyệt không thay đổi</li></ul><p>{{release}}</p>'),
    files: [] },
  a08: { dept: '人材戦略部', name: 'サンプル 十一郎', readers: 145,
    body: L('<p>ハノイ拠点と合同のオンライン研修を開催します。拠点をまたいだ仕事の進め方を一緒に学びます。</p><h3>開催概要</h3><ul><li>日時：10月21日（水）16:00〜17:30（日本時間）</li><li>形式：オンライン（日本語・ベトナム語の通訳あり）</li><li>定員：各拠点30名</li></ul><p>参加を希望する方は、10月9日までに所属長へお申し出ください。</p>',
      '<p>Tổ chức khóa đào tạo trực tuyến chung với văn phòng Hà Nội, cùng học cách triển khai công việc xuyên văn phòng.</p><h3>Tổng quan</h3><ul><li>Thời gian: Thứ Tư 21/10, 16:00–17:30 (giờ Nhật Bản)</li><li>Hình thức: trực tuyến (có phiên dịch tiếng Nhật · tiếng Việt)</li><li>Số lượng: 30 người mỗi văn phòng</li></ul><p>Ai muốn tham gia, vui lòng đăng ký với quản lý trực tiếp trước ngày 9/10.</p>'),
    files: [] }
};

/* §今月の新入社員 — lời nhắn là lời của CHÍNH NGƯỜI ĐÓ nên KHÔNG dịch */
var NEW_HIRES_MONTH = { y: 2026, m: 9 };
var NEW_HIRES = [
  { name: '佐藤 美咲', date: '2026/09/01', code: 'CS', job: 'カスタマーサクセス', dept: 'AI電話事業部', site: 'JP', msg: '病院の方の声を一番近くで聞ける存在になりたいです', av: { bg: '#E6EEF3', skin: '#F2D4BC', hair: '#3A2A20', cloth: '#7C98B0', style: 'bob' } },
  { name: '高橋 健太', date: '2026/09/16', code: 'AE', job: '法人営業', dept: '医薬連携事業部', site: 'JP', msg: '前職は製薬MRでした。現場の困りごとを一緒に解決します', av: { bg: '#EEF0E4', skin: '#EBC7A8', hair: '#1F1A17', cloth: '#4E5D6C', style: 'short' } },
  { name: '鈴木 悠斗', date: '2026/09/01', code: 'OB', job: 'オンボーディング', dept: '労務支援事業部', site: 'JP', msg: '導入後の立ち上がりを全力で支えます', av: { bg: '#F6EBDD', skin: '#EFC9AA', hair: '#5A3A26', cloth: '#C07A45', style: 'up' } },
  { name: 'Nguyễn Thị Lan', date: '2026/09/01', code: 'TS', job: 'テクニカルサポート', dept: 'AI電話事業部', site: 'VN', msg: 'Rất vui được làm việc cùng mọi người! よろしくお願いします', av: { bg: '#F4EAE2', skin: '#E3B993', hair: '#181311', cloth: '#B98A7A', style: 'long' } },
  { name: 'Trần Minh Đức', date: '2026/09/08', code: 'Dev', job: '開発', dept: '研究開発部', site: 'VN', msg: '品質の高いコードでプロダクトを支えます', av: { bg: '#E7EDE8', skin: '#D9AE88', hair: '#15110F', cloth: '#6F8A76', style: 'side' } },
  { name: 'Phạm Quốc Bảo', date: '2026/09/15', code: 'QA', job: '品質保証', dept: '研究開発部', site: 'VN', msg: 'Xin chào! バグは見逃しません。Cảm ơn mọi người', av: { bg: '#EDEAF5', skin: '#DDB28C', hair: '#0F0D0C', cloth: '#6B7A3A', style: 'crew' } },
  { name: 'Hoàng Thị Thu', date: '2026/09/22', code: 'TS', job: 'テクニカルサポート', dept: '労務支援事業部', site: 'VN', msg: 'Rất mong được học hỏi! 病院さまの困りごとを早く解決します', av: { bg: '#FFF1DC', skin: '#E9C19C', hair: '#2A1A14', cloth: '#B784AE', style: 'bun' } },
  { name: 'Võ Thanh Tùng', date: '2026/09/15', code: 'Dev', job: '開発', dept: '研究開発部', site: 'VN', msg: 'Chào cả nhà! AI電話の新機能をどんどん作ります', av: { bg: '#E1ECF4', skin: '#D2A27C', hair: '#3A2418', cloth: '#34506E', style: 'curly' } }
];

/* §スケジュール */
var SCHEDULE_EVENTS = [
  { date: '2026/09/28', name: L('新入社員ウェルカムランチ', 'Tiệc trưa chào mừng nhân viên mới'), place: L('本社ラウンジ', 'Sảnh trụ sở chính') },
  { date: '2026/09/29', name: L('朝会', 'Họp sáng'), place: L('オンライン', 'Trực tuyến') },
  { date: '2026/10/03', name: L('全社会', 'Họp toàn công ty'), place: L('本社大会議室', 'Phòng họp lớn trụ sở chính') },
  { date: '2026/10/12', name: L('学会出展（AI電話事業部）', 'Triển lãm hội nghị (khối Điện thoại AI)'), place: L('パシフィコ横浜', 'Pacifico Yokohama') },
  { date: '2026/10/20', name: L('VN拠点イベント', 'Sự kiện văn phòng VN'), place: L('ハノイ拠点', 'Văn phòng Hà Nội') },
  { date: '2026/10/23', name: L('AI活用勉強会', 'Buổi học ứng dụng AI'), place: L('オンライン', 'Trực tuyến') },
  { date: '2026/10/30', name: L('ハロウィン交流会', 'Giao lưu Halloween'), place: L('本社ラウンジ', 'Sảnh trụ sở chính') },
  { date: '2026/11/02', name: L('上期表彰式', 'Lễ khen thưởng nửa đầu năm'), place: L('本社大会議室', 'Phòng họp lớn trụ sở chính') },
  { date: '2026/11/07', name: L('全社会', 'Họp toàn công ty'), place: L('本社大会議室', 'Phòng họp lớn trụ sở chính') },
  { date: '2026/11/14', name: L('ユーザー会（医薬連携）', 'Hội người dùng (Liên kết Y Dược)'), place: L('大阪会場', 'Hội trường Osaka') }
];
var SCHEDULE_PAST = [
  { date: '2026/08/01', name: L('全社会', 'Họp toàn công ty'), place: L('本社大会議室', 'Phòng họp lớn trụ sở chính') },
  { date: '2026/09/18', name: L('学会出展（AI電話事業部）', 'Triển lãm hội nghị (khối Điện thoại AI)'), place: L('東京ビッグサイト', 'Tokyo Big Sight') },
  { date: '2026/09/05', name: L('全社会', 'Họp toàn công ty'), place: L('本社大会議室', 'Phòng họp lớn trụ sở chính') },
  { date: '2026/09/12', name: L('歓迎会', 'Tiệc chào mừng'), place: L('本社近くの会場', 'Địa điểm gần trụ sở chính') },
  { date: '2026/09/13', name: L('ハノイ拠点BBQ', 'BBQ văn phòng Hà Nội'), place: L('ハノイ拠点', 'Văn phòng Hà Nội') },
  { date: '2026/09/20', name: L('フットサル部 練習', 'CLB Futsal – buổi tập'), place: L('区民体育館', 'Nhà thi đấu quận') },
  { date: '2026/09/24', name: L('ランチ会', 'Tiệc trưa'), place: L('本社ラウンジ', 'Sảnh trụ sở chính') }
];

/* §みんなのフォト */
var PHOTOS = [
  { scene: 'allhands', caption: L('全社会', 'Họp toàn công ty'), date: '2026/09/05', user: '山本 里奈', likes: 24 },
  { scene: 'welcome', caption: L('歓迎会の飲み会', 'Tiệc chào mừng'), date: '2026/09/12', user: 'Phạm Văn Hùng', likes: 31 },
  { scene: 'booth', caption: L('学会出展ブース', 'Gian triển lãm hội nghị'), date: '2026/09/18', user: '中村 大輔', likes: 18 },
  { scene: 'bbq', caption: L('ハノイ拠点 BBQ', 'BBQ văn phòng Hà Nội'), date: '2026/09/13', user: 'Lê Thị Hoa', likes: 42 },
  { scene: 'futsal', caption: L('フットサル部', 'CLB Futsal'), date: '2026/09/20', user: '小林 翔太', likes: 15 },
  { scene: 'birthday', caption: L('誕生日のお祝い', 'Mừng sinh nhật'), date: '2026/09/10', user: 'Vũ Thu Trang', likes: 27 },
  { scene: 'lunch', caption: L('ランチ会', 'Tiệc trưa'), date: '2026/09/24', user: '伊藤 彩花', likes: 12 },
  { scene: 'morning', caption: L('オフィスの朝会', 'Họp sáng ở văn phòng'), date: '2026/09/26', user: 'Đỗ Quang Minh', likes: 9 }
];

/* §受注速報 — bệnh viện / người phụ trách đều là tên BỊA của bản gốc */
var DEAL_AES = {
  '田村 翔太': { bg: '#E5EEF8', skin: '#EFC8A6', hair: '#4A3526', cloth: '#1F4E79', style: 'short' },
  '小川 真由': { bg: '#FBEBE3', skin: '#F6D9C4', hair: '#6B3E2A', cloth: '#D98B6A', style: 'bob' },
  '森 大輔': { bg: '#EAF0E2', skin: '#E2B994', hair: '#1C1714', cloth: '#5C7A48', style: 'crew' },
  '西村 彩': { bg: '#F1E8F3', skin: '#F4D3BC', hair: '#3E2A22', cloth: '#9A6FA5', style: 'long' },
  '岡田 拓海': { bg: '#F5EEDC', skin: '#EAC3A0', hair: '#8B5E3C', cloth: '#B8893A', style: 'up' },
  '松本 玲奈': { bg: '#E3F0EE', skin: '#F0CDB2', hair: '#2A1F1B', cloth: '#3F8C84', style: 'bun' }
};
var DEALS = [
  { date: '2026/09/26', ae: '田村 翔太', hosp: 'サンプル大学病院', prod: 'AI電話', total: 3600000, mrr: 100000 },
  { date: '2026/09/22', ae: '小川 真由', hosp: 'さくら記念病院', prod: '労務支援', total: 2880000, mrr: 120000 },
  { date: '2026/09/18', ae: '森 大輔', hosp: 'みなと総合病院', prod: 'スマート面会', total: 1200000, mrr: 50000 },
  { date: '2026/09/15', ae: '西村 彩', hosp: 'ひかり中央病院', prod: '医薬連携', total: 8400000, mrr: 350000 },
  { date: '2026/09/10', ae: '岡田 拓海', hosp: 'あおば病院', prod: '院内メディア', total: 960000, mrr: 80000 },
  { date: '2026/09/04', ae: '田村 翔太', hosp: 'かえで市民病院', prod: 'AI電話', total: 5400000, mrr: 150000 },
  { date: '2026/09/01', ae: '松本 玲奈', hosp: 'つばさ記念病院', prod: '労務支援', total: 4320000, mrr: 180000 },
  { date: '2026/08/27', ae: '小川 真由', hosp: 'やまびこ病院', prod: '医薬連携', total: 12000000, mrr: 350000 },
  { date: '2026/08/21', ae: '森 大輔', hosp: 'しらかば総合病院', prod: 'AI電話', total: 7200000, mrr: 200000 },
  { date: '2026/08/14', ae: '西村 彩', hosp: 'うみかぜ病院', prod: 'スマート面会', total: 600000, mrr: 50000 },
  { date: '2026/08/07', ae: '岡田 拓海', hosp: 'もみじ台病院', prod: '院内メディア', total: 1800000, mrr: 60000 },
  { date: '2026/08/03', ae: '松本 玲奈', hosp: 'ほしぞら大学病院', prod: 'AI電話', total: 6000000, mrr: 250000 }
];
var DEAL_NEW_DAYS = 3;

/* §健康JOY */
var HEALTH_RECORD_TYPES = ['ウォーキング', 'ランニング', '筋トレ', 'ヨガ', '部活動', '早寝早起き', '禁煙', 'その他'];
var HEALTH_CATS = ['量', '継続', '新チャレンジ'];
var HEALTH_LOCS = ['全社', 'JP', 'VN'];
var HEALTH_RANKING = {
  '量': [{ rank: 1, name: 'サンプル 太郎', pt: 980 }, { rank: 2, name: 'サンプル 花子', pt: 860 }, { rank: 3, name: '石松 宏章', pt: 790 }, { rank: 4, name: 'サンプル 三郎', pt: 720, site: 'JP' }, { rank: 5, name: 'Phạm Thu Hà', pt: 655, site: 'VN' }],
  '継続': [{ rank: 1, name: 'サンプル 次郎', pt: 30 }, { rank: 2, name: 'サンプル 花子', pt: 28 }, { rank: 3, name: 'サンプル 太郎', pt: 25 }, { rank: 4, name: 'Lê Văn Khoa', pt: 22, site: 'VN' }, { rank: 5, name: 'サンプル 健二', pt: 20, site: 'JP' }],
  '新チャレンジ': [{ rank: 1, name: 'サンプル 花子', pt: 12 }, { rank: 2, name: 'サンプル 次郎', pt: 9 }, { rank: 3, name: 'サンプル 太郎', pt: 7 }, { rank: 4, name: 'Đặng Thị Mai', pt: 6, site: 'VN' }, { rank: 5, name: 'サンプル 桃子', pt: 5, site: 'JP' }]
};
var HEALTH_AVATARS = {
  'サンプル 太郎': { bg: '#FBEFD6', skin: '#F3D2B5', hair: '#7A5230', cloth: '#D9A441', style: 'curly' },
  'サンプル 花子': { bg: '#F7E6EC', skin: '#F7DDCB', hair: '#4A2E24', cloth: '#C8697E', style: 'bun' },
  '石松 宏章': { bg: '#E9E6E0', skin: '#E6BE9A', hair: '#26211E', cloth: '#2C3A55', style: 'crew' },
  'サンプル 次郎': { bg: '#E2EEF0', skin: '#F0CFB0', hair: '#3B3029', cloth: '#5E8F9A', style: 'side' },
  'サンプル 三郎': { bg: '#FCE9D9', skin: '#EDC4A2', hair: '#9A6A3E', cloth: '#C4553F', style: 'short' },
  'Phạm Thu Hà': { bg: '#E6F2F7', skin: '#E4BC98', hair: '#241C19', cloth: '#2F6E8F', style: 'long' },
  'Lê Văn Khoa': { bg: '#F6E9EE', skin: '#D8AB85', hair: '#141010', cloth: '#A34E6E', style: 'side' },
  'サンプル 健二': { bg: '#E6F1EC', skin: '#F1CEB2', hair: '#2E2520', cloth: '#4F7D6A', style: 'up' },
  'Đặng Thị Mai': { bg: '#E9ECF8', skin: '#E2B58E', hair: '#1A1412', cloth: '#5D6FB0', style: 'bob' },
  'サンプル 桃子': { bg: '#FDEEE4', skin: '#F6D8C2', hair: '#5E3A24', cloth: '#D46F4D', style: 'long' }
};
var AVATAR_POOL = [
  { bg: '#EDE7F4', skin: '#EFCBAE', hair: '#4B3A2F', cloth: '#8C74A8', style: 'crew' },
  { bg: '#EAF1E4', skin: '#F5D7BF', hair: '#6A4128', cloth: '#8FA65E', style: 'bun' },
  { bg: '#F3E9E1', skin: '#DDB28E', hair: '#1E1916', cloth: '#A0674B', style: 'curly' },
  { bg: '#E4EAF4', skin: '#F2D0B6', hair: '#5B4636', cloth: '#5B78A8', style: 'short' }
];
var HEALTH_AWARDS = [
  { y: 2026, m: 8, cat: '量', name: 'サンプル 太郎' },
  { y: 2026, m: 8, cat: '継続', name: 'サンプル 花子' },
  { y: 2026, m: 7, cat: '新チャレンジ', name: 'サンプル 次郎' }
];
var HEALTH_CLUBS = [
  { name: L('フットサル', 'Futsal'), day: L('毎週水曜 19:00〜', 'Thứ Tư hằng tuần, 19:00 ~'), members: 18, icon: 'football' },
  { name: L('ランニング', 'Chạy bộ'), day: L('毎週土曜 7:00〜', 'Thứ Bảy hằng tuần, 7:00 ~'), members: 12, icon: 'running-round' },
  { name: L('バドミントン（VN）', 'Cầu lông (VN)'), day: L('毎週火曜 18:30〜', 'Thứ Ba hằng tuần, 18:30 ~'), members: 9, icon: 'tennis' },
  { name: L('ヨガ', 'Yoga'), day: L('毎週木曜 12:15〜', 'Thứ Năm hằng tuần, 12:15 ~'), members: 15, icon: 'meditation-round' }
];
var HEALTH_SUPPORT = [
  { name: L('健康診断', 'Khám sức khỏe'), desc: L('年1回の定期健康診断（全額会社負担）', 'Khám sức khỏe định kỳ 1 lần / năm (công ty chi trả toàn bộ)'), icon: 'stethoscope' },
  { name: L('ストレスチェック', 'Kiểm tra căng thẳng'), desc: L('年1回のストレスチェック（法定・任意で面談可）', 'Kiểm tra mức độ căng thẳng 1 lần / năm (theo luật; có thể gặp tư vấn nếu muốn)'), icon: 'pulse' },
  { name: L('相談窓口', 'Kênh tư vấn'), desc: L('産業医・外部EAPによる相談窓口', 'Kênh tư vấn với bác sĩ lao động · chương trình EAP bên ngoài'), icon: 'chat-round-dots' },
  { name: L('部活動の補助', 'Hỗ trợ hoạt động CLB'), desc: L('活動費の一部補助（部活ごとに申請）', 'Hỗ trợ một phần chi phí hoạt động (đăng ký theo từng CLB)'), icon: 'wallet-money' }
];

/* §やること › 予定 */
var TODO_TABS = [
  { label: '今日の面談', empty: '今日の面談はありません' },
  { label: '明日の面談', empty: '明日の面談はありません' },
  { label: '過去1週間の面談履歴', empty: '過去1週間の面談履歴はありません' }
];
var TODO_ACTIONS = [
  { col: 'left', tone: 'orange', icon: 'calendar', title: '今日予定されているアクション', num: 0, body: L('今日期限のアクションはありません。新しいアクションは上の「＋ アクションを登録」から追加できます。', 'Không có hành động nào đến hạn hôm nay. Có thể thêm hành động mới từ nút “＋ Đăng ký hành động” ở trên.') },
  { col: 'left', tone: 'crit', icon: 'alarm', title: '期限が過ぎているアクション', num: 190, body: L('期限超過のアクションが190件あります。放置すると顧客対応の遅延につながるため優先的に確認してください。', 'Có 190 hành động đã quá hạn. Nếu để lâu sẽ làm chậm việc xử lý cho khách hàng, vui lòng ưu tiên kiểm tra.') },
  { col: 'left', tone: 'blue', icon: 'calendar-mark', title: '今後の予定アクション', num: 87, body: L('今後に予定されているアクションが87件あります。', 'Có 87 hành động đã lên lịch sắp tới.') },
  { col: 'right', tone: 'crit', icon: 'case', title: '放置されている案件', num: 220, body: L('一定期間動きのない案件が220件あります。担当者へのリマインドを検討してください。', 'Có 220 cơ hội không có chuyển động trong một thời gian. Hãy cân nhắc nhắc nhở người phụ trách.') }
];

/* §設定 */
var SETTINGS_TABS = [
  { id: 'アカウント', icon: 'user-circle' },
  { id: '表示', icon: 'palette' },
  { id: '通知', icon: 'bell' },
  { id: 'ホーム', icon: 'widget' },
  { id: 'プライバシー', icon: 'lock-keyhole' },
  { id: '連携', icon: 'link-circle' },
  { id: 'セキュリティ', icon: 'shield-keyhole' },
  { id: '権限', icon: 'key-square' },
  { id: 'データソース', icon: 'database' }
];
// ⚠ Email mẫu phải là @example.com (RFC 2606) — repo này PUBLIC, email @drjoy.jp thật bị build chặn.
var SETTINGS_ME = { name: '石松 宏章', dept: 'AI電話事業部', job: '代表取締役社長', site: 'JP（東京本社）', mail: 'ishimatsu.h@example.com' };
var NOTIFY_CHANNELS = [{ key: 'ch_drjoy', label: 'Dr.JOY', def: true }, { key: 'ch_mail', label: 'メール', def: true }, { key: 'ch_push', label: 'スマホのプッシュ', def: false }];
var NOTIFY_KINDS = [
  { key: 'k_approval', label: '承認依頼', def: true },
  { key: 'k_overdue', label: '期限切れ', def: true },
  { key: 'k_announce', label: 'お知らせ', def: true, scope: true },
  { key: 'k_deal', label: '受注速報', def: true },
  { key: 'k_health', label: '健康JOY', def: false },
  { key: 'k_mention', label: 'メンション', def: true }
];
var INTEGRATIONS = [
  { key: 'google', name: 'Google Workspace', sub: L('カレンダー・Gmail・ドライブ', 'Lịch · Gmail · Drive'), def: true, icon: 'cloud' },
  { key: 'redmine', name: 'Redmine', sub: L('チケット・要望一覧', 'Ticket · danh sách yêu cầu'), def: false, icon: 'ticket' },
  { key: 'mazrica', name: 'Mazrica', sub: L('商談・受注', 'Đàm phán · đơn hàng'), def: true, icon: 'hand-shake' },
  { key: 'drjoy', name: 'Dr.JOY', sub: L('グループ・チャット・通知', 'Nhóm · chat · thông báo'), def: true, icon: 'chat-round-line' },
  { key: 'freee', name: 'freee', sub: L('経費・勤怠', 'Chi phí · chấm công'), def: false, icon: 'wallet' }
];
var SECURITY_DEVICES = [
  { name: L('MacBook Pro（Chrome）', 'MacBook Pro (Chrome)'), place: L('東京', 'Tokyo'), last: L('現在使用中（この端末）', 'Đang sử dụng (thiết bị này)'), icon: 'laptop', current: true },
  { name: L('iPhone 15（Dr.JOY アプリ）', 'iPhone 15 (ứng dụng Dr.JOY)'), place: L('東京', 'Tokyo'), last: '2026/09/27 08:12', icon: 'smartphone' },
  { name: L('iPad（Safari）', 'iPad (Safari)'), place: L('大阪', 'Osaka'), last: '2026/09/24 19:40', icon: 'tablet' }
];
var SECURITY_HISTORY = [
  { at: '2026/09/27 09:02', place: L('東京', 'Tokyo'), device: L('MacBook Pro（Chrome）', 'MacBook Pro (Chrome)') },
  { at: '2026/09/27 08:12', place: L('東京', 'Tokyo'), device: L('iPhone 15（Dr.JOY アプリ）', 'iPhone 15 (ứng dụng Dr.JOY)') },
  { at: '2026/09/26 21:35', place: L('東京', 'Tokyo'), device: L('iPhone 15（Dr.JOY アプリ）', 'iPhone 15 (ứng dụng Dr.JOY)') },
  { at: '2026/09/24 19:40', place: L('大阪', 'Osaka'), device: L('iPad（Safari）', 'iPad (Safari)') },
  { at: '2026/09/22 10:05', place: L('ハノイ', 'Hà Nội'), device: L('MacBook Pro（Chrome）', 'MacBook Pro (Chrome)') }
];
var PERMISSION_COLS = ['受注の総額', 'MRR', 'PL', '名簿の個人情報'];
var PERMISSION_ROWS = [
  { role: '一般', marks: ['△', '×', '×', '×'] },
  { role: 'リーダー', marks: ['○', '△', '×', '△'] },
  { role: 'マネージャー', marks: ['○', '○', '△', '△'] },
  { role: '役員', marks: ['○', '○', '○', '○'] }
];

/* §全体検索 — kết quả MẪU theo từng nguồn */
var GS_CATS = [
  { id: 'menu', label: 'メニュー', icon: 'widget' },
  { id: 'customer', label: '顧客', icon: 'hospital' },
  { id: 'member', label: 'メンバー', icon: 'user-rounded' },
  { id: 'rule', label: 'ルール・マニュアル', icon: 'book-bookmark' },
  { id: 'drive', label: 'Googleドライブ', icon: 'folder-2' },
  { id: 'gmail', label: 'Gmail', icon: 'letter' },
  { id: 'drjoy', label: 'Dr.JOY', icon: 'chat-round-line' },
  { id: 'link', label: 'リンク', icon: 'link-round' }
];
var SAMPLE_RESULTS = {
  customer: [
    { title: '医療法人サンプル病院 A', sub: L('施設ID: FAC-1023｜東京都', 'Mã cơ sở: FAC-1023｜Tokyo'), keywords: ['病院', '施設', '東京'] },
    { title: 'サンプル記念病院', sub: L('施設ID: FAC-0876｜大阪府', 'Mã cơ sở: FAC-0876｜Osaka'), keywords: ['病院', '施設', '大阪'] },
    { title: 'サンプルクリニック', sub: L('施設ID: FAC-0321｜愛知県', 'Mã cơ sở: FAC-0321｜Aichi'), keywords: ['クリニック', '施設', '愛知'] }
  ],
  member: [
    { title: '石松 宏章', sub: L('代表取締役社長｜AI電話事業部', 'Tổng giám đốc (CEO)｜Khối Điện thoại AI'), keywords: ['石松', 'いしまつ', '社長', '代表取締役', 'ishimatsu'] },
    { title: 'サンプル 太郎', sub: L('AI事業開発部｜AE', 'Phòng Phát triển Kinh doanh AI｜AE'), keywords: ['太郎', 'AE'] },
    { title: 'サンプル 花子', sub: L('人材戦略部｜TA', 'Phòng Chiến lược Nhân sự｜TA'), keywords: ['花子', 'TA'] }
  ],
  rule: [
    { title: L('就業規則', 'Nội quy lao động'), sub: L('ルール ＞ 就業規則', 'Quy định › Nội quy lao động'), keywords: ['就業規則', 'ルール'] },
    { title: L('情報セキュリティ方針', 'Chính sách an ninh thông tin'), sub: L('ルール ＞ 社内規程', 'Quy định › Quy chế nội bộ'), keywords: ['セキュリティ', '社内規程', 'security'] },
    { title: L('AI電話事業部CS虎の巻', 'Toranomaki CS khối Điện thoại AI'), sub: L('ルール ＞ 業務マニュアル', 'Quy định › Hướng dẫn nghiệp vụ'), keywords: ['虎の巻', 'マニュアル', 'toranomaki'] }
  ],
  drive: [
    { title: '2026年度_事業計画.xlsx', sub: L('Googleドライブ｜10_経営戦略部', 'Google Drive｜10_経営戦略部'), keywords: ['事業計画'] },
    { title: '採用選考シート_2026.xlsx', sub: L('Googleドライブ｜03_採用', 'Google Drive｜03_採用'), keywords: ['採用', '選考'] },
    { title: '就業規則_2026年改定版.pdf', sub: L('Googleドライブ｜05_ルール', 'Google Drive｜05_ルール'), keywords: ['就業規則', 'ルール'] },
    { title: 'Redmineチケット運用ガイド.pdf', sub: L('Googleドライブ｜09_開発', 'Google Drive｜09_開発'), keywords: ['チケット', 'Redmine', '開発'] }
  ],
  gmail: [
    { title: L('【リマインド】月次締め処理について', '[Nhắc nhở] Về xử lý khóa sổ hằng tháng'), sub: L('Gmail｜経理チームより・3日前', 'Gmail｜Từ đội Kế toán · 3 ngày trước'), keywords: ['経理', '締め'] },
    { title: L('学会出展の件、ご相談', 'Trao đổi về việc triển lãm tại hội nghị'), sub: L('Gmail｜AI事業開発部より・1週間前', 'Gmail｜Từ Phòng Phát triển Kinh doanh AI · 1 tuần trước'), keywords: ['学会'] },
    { title: L('石松社長へ：来週MTGの件', 'Gửi CEO Ishimatsu: về cuộc họp tuần sau'), sub: L('Gmail｜秘書室より・2日前', 'Gmail｜Từ Phòng Thư ký · 2 ngày trước'), keywords: ['石松', '社長', '秘書室'] }
  ],
  drjoy: [
    { title: L('【全社】9月度定例MTGの議事録を共有します', '[Toàn công ty] Chia sẻ biên bản họp định kỳ tháng 9'), sub: L('Dr.JOYグループ｜経営戦略部', 'Nhóm Dr.JOY｜Phòng Chiến lược Kinh doanh'), keywords: ['議事録', '定例'] },
    { title: L('新機能「導入マップ」リリースのお知らせ', 'Thông báo phát hành tính năng mới “Bản đồ triển khai”'), sub: L('Dr.JOYグループ｜研究開発部', 'Nhóm Dr.JOY｜Phòng Nghiên cứu & Phát triển'), keywords: ['リリース', '導入マップ'] },
    { title: L('石松社長より：全社への共有事項', 'Từ CEO Ishimatsu: nội dung chia sẻ toàn công ty'), sub: L('Dr.JOYグループ｜代表取締役', 'Nhóm Dr.JOY｜Tổng giám đốc'), keywords: ['石松', '社長'] },
    { title: L('Redmineチケット対応状況の共有', 'Chia sẻ tình hình xử lý ticket Redmine'), sub: L('Dr.JOYグループ｜研究開発部', 'Nhóm Dr.JOY｜Phòng Nghiên cứu & Phát triển'), keywords: ['チケット', 'Redmine', '開発'] }
  ]
};

/* §HOME — thẻ (bật/tắt + thứ tự ở 設定 › ホーム) */
var HOME_CARD_DEFS = {
  deal: { label: '受注速報', col: 'left', icon: 'bill-check' },
  announce: { label: 'お知らせ', col: 'left', icon: 'bell' },
  newhire: { label: '今月の新入社員', col: 'left', icon: 'confetti' },
  schedule: { label: 'スケジュール', col: 'left', icon: 'calendar-date' },
  health: { label: '健康JOY', col: 'right', icon: 'ranking' },
  photos: { label: 'みんなのフォト', col: 'right', icon: 'gallery' },
  bizdays: { label: '四半期', col: 'right', icon: 'hourglass-line' },
  fx: { label: '為替', col: 'right', icon: 'round-transfer-horizontal' }
};
var HOME_CARD_DEFAULT = { left: ['deal', 'announce', 'newhire', 'schedule'], right: ['health', 'photos', 'bizdays', 'fx'] };
var BIZDAYS = [
  { q: '1Q', months: '11-1', days: 0, weeks: 0 },
  { q: '2Q', months: '2-4', days: 0, weeks: 0 },
  { q: '3Q', months: '5-7', days: 0, weeks: 0 },
  { q: '4Q', months: '8-10', days: 24, weeks: 5, current: true }
];
var FX = [
  { from: '1 USD', to: 157.54, unit: 'JPY', unitJa: '円', digits: 2 },
  { from: '1 JPY', to: 164.82, unit: 'VND', unitJa: 'VND', digits: 2 },
  { from: '1 USD', to: 25965.7, unit: 'VND', unitJa: 'VND', digits: 1 }
];
