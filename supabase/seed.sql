-- ============================================================================
-- JOY START — dữ liệu MASTER ban đầu (lấy từ mockup/data.js). Chạy sau migration.
-- Phòng ban · nhân viên KHÔNG seed ở đây: nguồn gốc là Sheet「名簿_組織図_座席_会議」,
-- job đồng bộ (Edge Function) sẽ nạp vào core.departments / core.employees.
-- ============================================================================

insert into core.sites (code, country, name_ja, name_vi, timezone) values
  ('JP-TKY', 'JP', '東京本社', 'Trụ sở Tokyo',  'Asia/Tokyo'),
  ('JP-SGM', 'JP', '相模原拠点', 'Kho Sagamihara', 'Asia/Tokyo'),
  ('VN-HAN', 'VN', 'ハノイ拠点', 'Văn phòng Hà Nội', 'Asia/Ho_Chi_Minh');

insert into core.job_types (code, name_ja, name_vi, description_ja, description_vi) values
  ('AE',  'AE',  'AE',  '法人営業（Account Executive）',          'Kinh doanh doanh nghiệp (Account Executive)'),
  ('GT',  'GT',  'GT',  '見込み客育成推進（Growth Team）',         'Nuôi dưỡng khách tiềm năng (Growth Team)'),
  ('LG',  'LG',  'LG',  'リード獲得営業（Lead Generation）',       'Kinh doanh thu hút khách tiềm năng (Lead Generation)'),
  ('CS',  'CS',  'CS',  'カスタマーサクセス（Customer Success）',   'Thành công khách hàng (Customer Success)'),
  ('OB',  'OB',  'OB',  '導入支援（Onboarding）',                  'Hỗ trợ triển khai (Onboarding)'),
  ('TA',  'TA',  'TA',  '採用（Talent Acquisition）',              'Tuyển dụng nhân tài (Talent Acquisition)'),
  ('PR',  'PR',  'PR',  '広報戦略（Public Relations）',            'Chiến lược truyền thông (Public Relations)'),
  ('TS',  'TS',  'TS',  'テクニカルサポート',                      'Hỗ trợ kỹ thuật'),
  ('Dev', 'Dev', 'Dev', '開発',                                    'Phát triển'),
  ('QA',  'QA',  'QA',  '品質保証',                                'Đảm bảo chất lượng');

insert into core.products (code, name_ja, name_vi, tone, sort_order) values
  ('pharma',         '医薬連携',     'Liên kết Y Dược',       'plum',  1),
  ('hr-support',     '労務支援',     'Hỗ trợ Lao động',       'green', 2),
  ('ai-phone',       'AI電話',       'Điện thoại AI',         'blue',  3),
  ('smart-visit',    'スマート面会', 'Gặp mặt thông minh',    'rose',  4),
  ('hospital-media', '院内メディア', 'Truyền thông nội viện', 'gold',  5);

insert into core.roles (code, name_ja, name_vi, rank) values
  ('general',   '一般',         'Nhân viên',     1),
  ('leader',    'リーダー',     'Trưởng nhóm',   2),
  ('manager',   'マネージャー', 'Quản lý',       3),
  ('executive', '役員',         'Ban điều hành', 4),
  ('admin',     'システム管理者', 'Quản trị hệ thống', 9);

insert into core.permissions (code, description_ja, description_vi) values
  ('deal.amount',       '受注の総額',       'Tổng giá trị đơn hàng'),
  ('deal.mrr',          'MRR',              'MRR'),
  ('pl',                'PL（損益）',        'PL (lãi lỗ)'),
  ('directory.private', '名簿の個人情報',   'Thông tin cá nhân trong danh bạ'),
  ('report.read',       'メンバーの報告を閲覧', 'Xem báo cáo của thành viên');

-- Ma trận ○△× của 設定 › 権限 (○=all · △=own_dept · ×=none)
insert into core.role_permissions (role_code, permission_code, scope) values
  ('general',   'deal.amount', 'own_dept'), ('general',   'deal.mrr', 'none'),     ('general',   'pl', 'none'),     ('general',   'directory.private', 'none'),     ('general',   'report.read', 'none'),
  ('leader',    'deal.amount', 'all'),      ('leader',    'deal.mrr', 'own_dept'), ('leader',    'pl', 'none'),     ('leader',    'directory.private', 'own_dept'), ('leader',    'report.read', 'own_dept'),
  ('manager',   'deal.amount', 'all'),      ('manager',   'deal.mrr', 'all'),      ('manager',   'pl', 'own_dept'), ('manager',   'directory.private', 'own_dept'), ('manager',   'report.read', 'own_dept'),
  ('executive', 'deal.amount', 'all'),      ('executive', 'deal.mrr', 'all'),      ('executive', 'pl', 'all'),      ('executive', 'directory.private', 'all'),      ('executive', 'report.read', 'all');

-- 8 loại 申請. system_of_record = 'freee' ⇒ JOY START chỉ là cửa nhập, đơn thật nằm ở freee (cần chốt).
insert into app.request_types (code, name_ja, name_vi, route_template, system_of_record, is_sensitive) values
  ('attendance',    '勤怠',           'Chấm công',                  '[{"approver":"manager"}]',                                   'freee',     false),
  ('leave',         '休暇',           'Nghỉ phép',                  '[{"approver":"manager"}]',                                   'freee',     false),
  ('expense',       '経費',           'Chi phí',                    '[{"approver":"manager"},{"approver":"role","role":"admin"}]', 'freee',     false),
  ('business_trip', '出張',           'Công tác',                   '[{"approver":"manager"}]',                                   'joy_start', false),
  ('equipment',     '備品｜端末',     'Thiết bị｜Máy',              '[{"approver":"manager"},{"approver":"role","role":"admin"}]', 'joy_start', false),
  ('personal_info', '身上変更',       'Thay đổi thông tin cá nhân', '[{"approver":"role","role":"admin"}]',                       'joy_start', true),
  ('software',      'ソフトウェア利用', 'Sử dụng phần mềm',         '[{"approver":"manager"},{"approver":"role","role":"admin"}]', 'joy_start', false),
  ('announcement',  'お知らせ',       'Đăng thông báo',             '[{"approver":"role","role":"admin"}]',                       'joy_start', false);

-- 設定 › データソース (DS_ROWS của mockup). mode: sync = kéo về Supabase · live = hỏi trực tiếp khi xem · internal = JOY START là nguồn gốc
insert into ext.data_sources (id, menu_ja, menu_vi, system, mode, owner_department, frequency, configured) values
  ('ds-row-staff',        'メンバー＞名簿・組織図・座席', 'Thành viên › Danh bạ · Sơ đồ tổ chức · Chỗ ngồi', 'Google Sheets', 'sync', '人材戦略部', '月次＋手動', true),
  ('ds-row-jobtype',      '職種マスタ',                   'Danh mục vị trí',                                'Google Sheets', 'sync', '人材戦略部', '随時', true),
  ('ds-row-health',       '健康JOY',                      'Sức khỏe JOY',                                   'JOY START', 'internal', '人材戦略部', '随時', false),
  ('ds-row-cs',           '顧客対応',                     'Khách hàng',                                     'Mazrica', 'sync', 'AI事業開発部', '要確認', false),
  ('ds-row-recruit',      '採用',                         'Tuyển dụng',                                     'ATS', 'sync', '人材戦略部', '要確認', false),
  ('ds-row-apply',        '申請＞勤怠・経費',             'Đơn đề nghị › Chấm công · Chi phí',              'freee', 'sync', '経営戦略部・業務推進部', '要確認', false),
  ('ds-row-pl',           '目標｜結果＞全社＞PL',         'Mục tiêu｜Kết quả › Toàn công ty › PL',          'freee', 'sync', '経営戦略部・業務推進部', '要確認', false),
  ('ds-row-map',          '目標｜結果＞全社＞導入マップ', 'Mục tiêu｜Kết quả › Bản đồ triển khai',          'Mazrica', 'sync', '経営戦略部', '要確認', false),
  ('ds-row-dev-ticket',   '開発＞チケット',               'Phát triển › Ticket',                            'Redmine', 'sync', '研究開発部', '要確認', false),
  ('ds-row-dev',          '開発（ロードマップ・要望・リリースノート）', 'Phát triển (Lộ trình · Yêu cầu · Ghi chú phát hành)', 'JOY START', 'internal', '研究開発部', '要確認', false),
  ('ds-row-inventory',    '在庫',                         'Kho',                                            'JOY START', 'internal', '業務推進部', '要確認', false),
  ('ds-row-incident',     'インシデント台帳',             'Sổ theo dõi sự cố',                              'JOY START', 'internal', '業務推進部', '随時', false),
  ('ds-row-rule',         'ルール',                       'Quy định',                                       'Google Drive', 'sync', '人材戦略部・業務推進部', '日次（索引）', false),
  ('ds-row-train',        '研修',                         'Đào tạo',                                        'Google Drive', 'sync', '人材戦略部', '要確認', false),
  ('ds-row-search-drive', '全体検索＞Googleドライブ',     'Tìm kiếm toàn bộ › Google Drive',                'Google Drive', 'live', '業務推進部', '都度', false),
  ('ds-row-search-gmail', '全体検索＞Gmail',              'Tìm kiếm toàn bộ › Gmail',                       'Gmail', 'live', '業務推進部', '都度', false),
  ('ds-row-search-drjoy', '全体検索＞Dr.JOY',             'Tìm kiếm toàn bộ › Dr.JOY',                      'Dr.JOY MCP', 'live', 'AI事業開発部', '都度', false);
