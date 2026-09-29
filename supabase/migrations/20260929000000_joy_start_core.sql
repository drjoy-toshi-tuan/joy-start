-- ============================================================================
-- JOY START — schema Supabase (BẢN NHÁP v0.1 · 2026-09-29)
--
-- Phạm vi: phần LÕI cho Phase 1–2 (xem docs/architecture.md):
--   core  : tổ chức · nhân viên · phân quyền (RBAC) · cài đặt cá nhân · お気に入り
--   app   : dữ liệu JOY START là NGUỒN GỐC — お知らせ · 申請/承認 · 報告 · インシデント ·
--           健康JOY · スケジュール · 通知 (thông báo realtime)
--   ext   : bản SAO CHỈ-ĐỌC từ hệ thống ngoài (Mazrica, Sheet 名簿…) + sổ theo dõi đồng bộ
--   ai    : JOY Pilot (hội thoại, nhật ký gọi tool, chỉ mục tài liệu pgvector)
--   audit : nhật ký thay đổi (ISMS)
--   private: hàm trợ giúp cho RLS — KHÔNG đưa vào Data API
--
-- Nguyên tắc:
--   · "データの正は1つ": bảng ext.* chỉ job đồng bộ (service_role) được ghi; người dùng chỉ đọc.
--   · Mọi bảng đều bật RLS. Quyền theo cột (MRR, tổng tiền…) tách bảng + RPC, vì RLS chỉ lọc HÀNG.
--   · Chữ hiển thị song ngữ: cột *_ja / *_vi (bản vi có thể do AI dịch → translated_by).
--   · Thao tác nhiều bước (nộp đơn, duyệt) đi qua RPC security definer, không UPDATE trực tiếp.
--
-- Supabase: thêm core, app, ext, ai vào Settings → API → Exposed schemas.
-- ============================================================================

create extension if not exists vector;

create schema if not exists core;
create schema if not exists app;
create schema if not exists ext;
create schema if not exists ai;
create schema if not exists audit;
create schema if not exists private;

-- ── Kiểu dùng chung ─────────────────────────────────────────────────────────
create type core.role_code  as enum ('general', 'leader', 'manager', 'executive', 'admin');
-- Thứ tự khai báo = thứ tự so sánh ⇒ max() ra phạm vi rộng nhất
create type core.perm_scope as enum ('none', 'own_dept', 'all');
create type core.lang       as enum ('ja', 'vi');

create or replace function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ============================================================================
-- §core — tổ chức, nhân viên
-- ============================================================================
create table core.sites (
  code      text primary key,                 -- 'JP-TKY' 東京本社 · 'JP-SGM' 相模原 · 'VN-HAN' ハノイ
  country   text not null check (country in ('JP', 'VN')),
  name_ja   text not null,
  name_vi   text not null,
  timezone  text not null                     -- 'Asia/Tokyo' · 'Asia/Ho_Chi_Minh'
);

create table core.departments (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,
  name_ja     text not null,
  name_vi     text not null,
  parent_id   uuid references core.departments (id),
  sort_order  int not null default 0,
  source      text not null default 'sheet',  -- nguồn gốc: Sheet「名簿_組織図_座席_会議」
  synced_at   timestamptz
);

create table core.job_types (                  -- 職種マスタ: AE GT LG CS OB TA PR TS Dev QA
  code            text primary key,
  name_ja         text not null,
  name_vi         text not null,
  description_ja  text,
  description_vi  text
);

create table core.products (                   -- 5 sản phẩm: 医薬連携 · 労務支援 · AI電話 · スマート面会 · 院内メディア
  code        text primary key,                -- 'pharma' 'hr-support' 'ai-phone' 'smart-visit' 'hospital-media'
  name_ja     text not null,
  name_vi     text not null,
  tone        text,
  sort_order  int not null default 0
);

create table core.employees (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid unique references auth.users (id) on delete set null,  -- nối khi đăng nhập SSO lần đầu
  employee_no    text unique,
  email          text unique not null,
  name_ja        text not null,
  name_kana      text,
  name_latin     text,
  department_id  uuid references core.departments (id),
  job_type_code  text references core.job_types (code),
  title_ja       text,                                   -- 役職
  site_code      text references core.sites (code),
  manager_id     uuid references core.employees (id),    -- 上長 ⇒ tuyến duyệt mặc định
  joined_on      date,
  left_on        date,
  status         text not null default 'active' check (status in ('active', 'leave', 'retired')),
  avatar_path    text,                                   -- Storage: avatars/<employee_id>.webp
  source         text not null default 'sheet',
  synced_at      timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index on core.employees (department_id);
create index on core.employees (manager_id);
create trigger employees_touch before update on core.employees
  for each row execute function private.touch_updated_at();

alter table core.departments add column head_id uuid references core.employees (id);

-- Thông tin cá nhân nhạy cảm tách bảng riêng (chỉ bản thân + người có quyền directory.private).
-- ⚠ KHÔNG lưu tài khoản ngân hàng / My Number ở JOY START: chuyển thẳng sang hệ thống nhân sự.
create table core.employee_private (
  employee_id        uuid primary key references core.employees (id) on delete cascade,
  birth_date         date,
  phone              text,
  address            text,
  emergency_contact  jsonb,
  updated_at         timestamptz not null default now()
);

-- ============================================================================
-- §core — phân quyền (ma trận ○△× của 設定 › 権限)
-- ============================================================================
create table core.roles (
  code     core.role_code primary key,
  name_ja  text not null,
  name_vi  text not null,
  rank     int not null
);

create table core.user_roles (
  employee_id  uuid not null references core.employees (id) on delete cascade,
  role_code    core.role_code not null references core.roles (code),
  granted_by   uuid references core.employees (id),
  granted_at   timestamptz not null default now(),
  primary key (employee_id, role_code)
);

create table core.permissions (                -- 'deal.amount' 'deal.mrr' 'pl' 'directory.private' …
  code            text primary key,
  description_ja  text not null,
  description_vi  text not null
);

create table core.role_permissions (
  role_code        core.role_code not null references core.roles (code),
  permission_code  text not null references core.permissions (code),
  scope            core.perm_scope not null,   -- ○=all · △=own_dept · ×=none
  primary key (role_code, permission_code)
);

-- ── Hàm trợ giúp cho RLS (security definer, search_path rỗng) ──
create or replace function private.me() returns uuid
language sql stable security definer set search_path = '' as $$
  select e.id from core.employees e where e.user_id = (select auth.uid())
$$;

create or replace function private.my_department() returns uuid
language sql stable security definer set search_path = '' as $$
  select e.department_id from core.employees e where e.user_id = (select auth.uid())
$$;

create or replace function private.has_role(r core.role_code) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from core.user_roles ur where ur.employee_id = private.me() and ur.role_code = r)
$$;

create or replace function private.perm_scope(p text) returns core.perm_scope
language sql stable security definer set search_path = '' as $$
  select coalesce(max(rp.scope), 'none'::core.perm_scope)
  from core.user_roles ur
  join core.role_permissions rp on rp.role_code = ur.role_code and rp.permission_code = p
  where ur.employee_id = private.me()
$$;

-- Phòng ban + mọi phòng ban con (△ "bộ phận mình" bao gồm cấp dưới)
create or replace function private.dept_subtree(root uuid) returns setof uuid
language sql stable security definer set search_path = '' as $$
  with recursive t(id) as (
    select root
    union all
    select d.id from core.departments d join t on d.parent_id = t.id
  )
  select id from t
$$;

create or replace function private.can_see(p text, target_dept uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select case private.perm_scope(p)
    when 'all' then true
    when 'own_dept' then target_dept in (select private.dept_subtree(private.my_department()))
    else false
  end
$$;

-- ============================================================================
-- §core — cài đặt cá nhân (thay cho localStorage joystart_* của mockup)
-- ============================================================================
create table core.user_settings (
  employee_id            uuid primary key references core.employees (id) on delete cascade,
  lang                   core.lang not null default 'ja',
  theme                  text not null default 'system' check (theme in ('system', 'light', 'dark')),
  timezone               text not null default 'Asia/Tokyo',
  date_format            text not null default 'md' check (date_format in ('md', 'dm')),
  home_cards             jsonb,                       -- {left:[…], right:[…], hidden:{…}}
  sidebar_rail           boolean not null default false,
  -- プライバシー: cột riêng vì RPC xếp hạng / ảnh đọc trực tiếp
  health_ranking_opt_in  boolean not null default true,
  health_anonymous       boolean not null default false,
  photo_tag_allowed      boolean not null default true,
  newhire_photo_allowed  boolean not null default true,
  updated_at             timestamptz not null default now()
);
create trigger user_settings_touch before update on core.user_settings
  for each row execute function private.touch_updated_at();

create table core.favorites (
  employee_id  uuid not null references core.employees (id) on delete cascade,
  page_key     text not null,                  -- khoá trang của mockup, vd 'todo/報告/上長報告'
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  primary key (employee_id, page_key)
);

-- ============================================================================
-- §app — 通知 (thông báo): 1 hàng / người nhận; Realtime đẩy hàng mới xuống trình duyệt
-- ============================================================================
create type app.notification_kind as enum
  ('approval_request', 'approval_result', 'overdue', 'announcement', 'deal_won', 'health', 'mention', 'incident', 'system');
create type app.channel as enum ('drjoy', 'email', 'push');

create table app.notification_preferences (
  employee_id          uuid primary key references core.employees (id) on delete cascade,
  via_drjoy            boolean not null default true,
  via_email            boolean not null default true,
  via_push             boolean not null default false,
  disabled_kinds       app.notification_kind[] not null default '{health}',
  announcement_scope   text not null default 'important' check (announcement_scope in ('important', 'all')),
  quiet_start          time not null default '22:00',
  quiet_end            time not null default '07:00',
  updated_at           timestamptz not null default now()
);

create table app.notifications (
  id            bigint generated always as identity primary key,
  recipient_id  uuid not null references core.employees (id) on delete cascade,
  kind          app.notification_kind not null,
  importance    smallint not null default 0,    -- 1 = 重要
  title_ja      text not null,
  title_vi      text,
  body_ja       text,
  body_vi       text,
  link          text,                           -- route của JOY START, vd '#/todo/approvals'
  source_table  text,
  source_id     text,
  created_at    timestamptz not null default now(),
  read_at       timestamptz
);
create index notifications_unread on app.notifications (recipient_id, created_at desc) where read_at is null;

-- Hàng đợi gửi ra NGOÀI app (Dr.JOY chat · mail · push). Edge Function worker lấy việc bằng
-- `select … for update skip locked` theo scheduled_at; giờ yên lặng ⇒ scheduled_at lùi tới quiet_end.
create table app.notification_deliveries (
  id                   bigint generated always as identity primary key,
  notification_id      bigint not null references app.notifications (id) on delete cascade,
  channel              app.channel not null,
  status               text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'skipped')),
  scheduled_at         timestamptz not null default now(),
  attempts             smallint not null default 0,
  last_error           text,
  provider_message_id  text,
  sent_at              timestamptz
);
create index deliveries_due on app.notification_deliveries (scheduled_at) where status = 'queued';

-- Thời điểm được phép gửi sớm nhất theo giờ yên lặng (tính theo múi giờ của người nhận)
create or replace function private.next_send_time(p_employee uuid) returns timestamptz
language plpgsql stable security definer set search_path = '' as $$
declare
  tz text; qs time; qe time; local_ts timestamp; t time; in_quiet boolean;
begin
  select coalesce(s.timezone, 'Asia/Tokyo'), p.quiet_start, p.quiet_end
    into tz, qs, qe
  from app.notification_preferences p
  left join core.user_settings s on s.employee_id = p.employee_id
  where p.employee_id = p_employee;
  if qs is null or qs = qe then return now(); end if;
  local_ts := now() at time zone tz;
  t := local_ts::time;
  in_quiet := case when qs < qe then t >= qs and t < qe else t >= qs or t < qe end;
  if not in_quiet then return now(); end if;
  -- đang trong giờ yên lặng: gửi lúc quiet_end kế tiếp
  if t >= qe then
    return ((local_ts::date + 1) + qe) at time zone tz;
  end if;
  return (local_ts::date + qe) at time zone tz;
end $$;

create or replace function private.enqueue_deliveries() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  p app.notification_preferences;
  at_ts timestamptz;
begin
  select * into p from app.notification_preferences where employee_id = new.recipient_id;
  if not found then return new; end if;                       -- chưa cài ⇒ chỉ trong app
  if new.kind = any (p.disabled_kinds) then return new; end if;
  if new.kind = 'announcement' and p.announcement_scope = 'important' and new.importance = 0 then return new; end if;
  at_ts := private.next_send_time(new.recipient_id);
  insert into app.notification_deliveries (notification_id, channel, scheduled_at)
  select new.id, c, at_ts
  from unnest(array[
    case when p.via_drjoy then 'drjoy'::app.channel end,
    case when p.via_email then 'email'::app.channel end,
    case when p.via_push  then 'push'::app.channel end
  ]) as c
  where c is not null;
  return new;
end $$;
create trigger notifications_enqueue after insert on app.notifications
  for each row execute function private.enqueue_deliveries();

create or replace function private.notify(
  p_recipient uuid, p_kind app.notification_kind, p_title_ja text, p_title_vi text,
  p_link text, p_source_table text, p_source_id text, p_importance smallint default 0
) returns void
language sql security definer set search_path = '' as $$
  insert into app.notifications (recipient_id, kind, title_ja, title_vi, link, source_table, source_id, importance)
  values (p_recipient, p_kind, p_title_ja, p_title_vi, p_link, p_source_table, p_source_id, p_importance)
$$;

-- ============================================================================
-- §app — お知らせ (thông báo toàn công ty) + 既読 (đã đọc x / 353)
-- ============================================================================
create type app.announcement_category as enum
  ('company', 'hr', 'rules', 'it', 'event', 'release', 'award', 'joy_express');
  -- 全社 · 人事 · 制度・ルール · IT・システム · イベント · リリース · 表彰 · JOY Express

create table app.announcements (
  id             uuid primary key default gen_random_uuid(),
  category       app.announcement_category not null,
  is_important   boolean not null default false,
  title_ja       text not null,
  title_vi       text,
  body_ja        text not null,                 -- HTML đã sanitize ở Edge Function
  body_vi        text,
  translated_by  text check (translated_by in ('human', 'ai')),
  author_id      uuid not null references core.employees (id),
  department_id  uuid references core.departments (id),    -- phòng ban phát hành
  status         text not null default 'draft' check (status in ('draft', 'pending', 'published', 'archived')),
  publish_from   timestamptz,
  publish_until  timestamptz,
  request_id     uuid,                          -- đơn「お知らせ掲載」đã duyệt (FK thêm ở dưới)
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index on app.announcements (status, publish_from desc);
create trigger announcements_touch before update on app.announcements
  for each row execute function private.touch_updated_at();

create table app.announcement_audiences (
  announcement_id  uuid not null references app.announcements (id) on delete cascade,
  audience_type    text not null check (audience_type in ('all', 'site', 'department', 'role')),
  audience_value   text not null default '*',
  primary key (announcement_id, audience_type, audience_value)
);

create table app.announcement_reads (
  announcement_id  uuid not null references app.announcements (id) on delete cascade,
  employee_id      uuid not null references core.employees (id) on delete cascade,
  read_at          timestamptz not null default now(),
  primary key (announcement_id, employee_id)
);

create or replace function private.in_audience(p_announcement uuid, p_employee uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from app.announcement_audiences a, core.employees e
    where a.announcement_id = p_announcement and e.id = p_employee
      and (   a.audience_type = 'all'
           or (a.audience_type = 'site' and a.audience_value = e.site_code)
           or (a.audience_type = 'department'
               and e.department_id in (select private.dept_subtree(a.audience_value::uuid)))
           or (a.audience_type = 'role'
               and exists (select 1 from core.user_roles ur
                           where ur.employee_id = e.id and ur.role_code::text = a.audience_value)))
  )
$$;

-- Khi chuyển sang published: tạo thông báo trong app cho từng người thuộc đối tượng
create or replace function private.on_announcement_published() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    insert into app.notifications (recipient_id, kind, importance, title_ja, title_vi, link, source_table, source_id)
    select e.id, 'announcement', case when new.is_important then 1 else 0 end,
           new.title_ja, new.title_vi, '#/announce/' || new.id, 'app.announcements', new.id::text
    from core.employees e
    where e.status = 'active' and private.in_audience(new.id, e.id);
  end if;
  return new;
end $$;
create trigger announcements_publish after insert or update of status on app.announcements
  for each row execute function private.on_announcement_published();

-- ============================================================================
-- §app — 申請 · 承認 (1 engine chung cho 8 loại đơn)
-- ============================================================================
create table app.request_types (
  code              text primary key,          -- attendance leave expense business_trip equipment personal_info software announcement
  name_ja           text not null,
  name_vi           text not null,
  form_schema       jsonb not null default '{}',   -- JSON Schema của form ⇒ UI tự dựng
  route_template    jsonb not null default '[{"approver":"manager"}]',
                                                -- [{"approver":"manager"} | {"approver":"role","role":"admin"} | {"approver":"employee","id":"…"}]
  system_of_record  text not null default 'joy_start' check (system_of_record in ('joy_start', 'freee')),
  is_sensitive      boolean not null default false,
  active            boolean not null default true
);

create type app.request_status as enum ('draft', 'submitted', 'in_review', 'approved', 'returned', 'rejected', 'withdrawn');

create table app.requests (
  id               uuid primary key default gen_random_uuid(),
  type_code        text not null references app.request_types (code),
  applicant_id     uuid not null references core.employees (id),
  title            text not null,
  status           app.request_status not null default 'draft',
  amount           numeric(12, 0),              -- 経費 · 出張: để tổng hợp được mà không mở payload
  currency         text not null default 'JPY',
  period_start     date,
  period_end       date,
  payload          jsonb not null default '{}',
  current_step     smallint,
  submitted_at     timestamptz,
  decided_at       timestamptz,
  external_system  text,                        -- 'freee' khi freee là nguồn gốc
  external_id      text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index on app.requests (applicant_id, status);
create trigger requests_touch before update on app.requests
  for each row execute function private.touch_updated_at();

alter table app.announcements
  add constraint announcements_request_fk foreign key (request_id) references app.requests (id);

create table app.approval_steps (
  id            bigint generated always as identity primary key,
  request_id    uuid not null references app.requests (id) on delete cascade,
  step_no       smallint not null,
  approver_id   uuid not null references core.employees (id),
  required_all  boolean not null default true,  -- false: 1 người trong bước duyệt là đủ (duyệt theo vai trò)
  decision      text check (decision in ('approved', 'returned', 'rejected', 'skipped')),
  comment       text,
  decided_at    timestamptz,
  unique (request_id, step_no, approver_id)
);
create index approval_pending on app.approval_steps (approver_id) where decision is null;

create table app.request_files (
  id            uuid primary key default gen_random_uuid(),
  request_id    uuid not null references app.requests (id) on delete cascade,
  storage_path  text not null,                  -- bucket 'requests': <request_id>/<file>
  file_name     text not null,
  mime          text,
  size_bytes    bigint,
  uploaded_at   timestamptz not null default now()
);

create or replace function private.is_approver(p_request uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from app.approval_steps s where s.request_id = p_request and s.approver_id = private.me())
$$;

-- RPC: nộp đơn ⇒ dựng các bước duyệt từ route_template ⇒ báo cho người duyệt bước 1
create or replace function app.submit_request(p_request uuid) returns app.requests
language plpgsql security definer set search_path = '' as $$
declare
  r app.requests; t app.request_types; step jsonb; n smallint := 0; me uuid := private.me();
begin
  select * into r from app.requests where id = p_request for update;
  if not found or r.applicant_id is distinct from me then raise exception 'not your request'; end if;
  if r.status not in ('draft', 'returned') then raise exception 'cannot submit from status %', r.status; end if;
  select * into t from app.request_types where code = r.type_code;

  delete from app.approval_steps where request_id = r.id;
  for step in select * from jsonb_array_elements(t.route_template) loop
    n := n + 1;
    if step->>'approver' = 'manager' then
      insert into app.approval_steps (request_id, step_no, approver_id)
      select r.id, n, e.manager_id from core.employees e where e.id = me and e.manager_id is not null;
    elsif step->>'approver' = 'role' then
      insert into app.approval_steps (request_id, step_no, approver_id, required_all)
      select r.id, n, ur.employee_id, false from core.user_roles ur
      where ur.role_code::text = step->>'role' and ur.employee_id <> me;
    elsif step->>'approver' = 'employee' then
      insert into app.approval_steps (request_id, step_no, approver_id) values (r.id, n, (step->>'id')::uuid);
    end if;
  end loop;
  if not exists (select 1 from app.approval_steps where request_id = r.id) then
    raise exception 'no approver resolved for %', r.type_code;
  end if;

  update app.requests
     set status = 'in_review', submitted_at = now(), decided_at = null,
         current_step = (select min(step_no) from app.approval_steps where request_id = r.id)
   where id = r.id
  returning * into r;

  perform private.notify(s.approver_id, 'approval_request', '承認依頼：' || r.title, 'Cần duyệt: ' || r.title,
                         '#/todo/approvals', 'app.requests', r.id::text)
  from app.approval_steps s where s.request_id = r.id and s.step_no = r.current_step;
  return r;
end $$;

-- RPC: quyết định một bước (承認 / 差し戻し / 却下)
create or replace function app.decide_approval(p_step bigint, p_decision text, p_comment text default null)
returns app.requests
language plpgsql security definer set search_path = '' as $$
declare
  s app.approval_steps; r app.requests; next_step smallint;
begin
  if p_decision not in ('approved', 'returned', 'rejected') then raise exception 'bad decision'; end if;
  select * into s from app.approval_steps where id = p_step for update;
  if not found or s.approver_id is distinct from private.me() then raise exception 'not your step'; end if;
  if s.decision is not null then raise exception 'already decided'; end if;
  select * into r from app.requests where id = s.request_id for update;
  if r.status <> 'in_review' or r.current_step <> s.step_no then raise exception 'step is not active'; end if;

  update app.approval_steps set decision = p_decision, comment = p_comment, decided_at = now() where id = s.id;

  if p_decision in ('returned', 'rejected') then
    update app.approval_steps set decision = 'skipped'
     where request_id = r.id and decision is null;
    update app.requests set status = p_decision::app.request_status, decided_at = now()
     where id = r.id returning * into r;
    perform private.notify(r.applicant_id, 'approval_result',
      case p_decision when 'returned' then '差し戻し：' else '却下：' end || r.title,
      case p_decision when 'returned' then 'Bị trả lại: ' else 'Bị từ chối: ' end || r.title,
      '#/todo/requests', 'app.requests', r.id::text);
    return r;
  end if;

  if not s.required_all then          -- duyệt theo vai trò: 1 người là đủ
    update app.approval_steps set decision = 'skipped'
     where request_id = r.id and step_no = s.step_no and decision is null;
  end if;
  if exists (select 1 from app.approval_steps where request_id = r.id and step_no = s.step_no and decision is null) then
    return r;                          -- bước này còn người chưa duyệt
  end if;

  select min(step_no) into next_step from app.approval_steps where request_id = r.id and step_no > s.step_no;
  if next_step is null then
    update app.requests set status = 'approved', decided_at = now() where id = r.id returning * into r;
    perform private.notify(r.applicant_id, 'approval_result', '承認済み：' || r.title, 'Đã duyệt: ' || r.title,
                           '#/todo/requests', 'app.requests', r.id::text);
  else
    update app.requests set current_step = next_step where id = r.id returning * into r;
    perform private.notify(x.approver_id, 'approval_request', '承認依頼：' || r.title, 'Cần duyệt: ' || r.title,
                           '#/todo/approvals', 'app.requests', r.id::text)
    from app.approval_steps x where x.request_id = r.id and x.step_no = next_step;
  end if;
  return r;
end $$;

-- ============================================================================
-- §app — 報告 (báo cáo) · インシデント台帳 (sổ sự cố)
-- ============================================================================
create type app.report_type as enum ('supervisor', 'sales_meeting', 'meeting', 'order', 'complaint');

create table app.reports (
  id            uuid primary key default gen_random_uuid(),
  type          app.report_type not null,
  author_id     uuid not null references core.employees (id),
  facility_id   uuid,                           -- FK tới ext.facilities (thêm ở dưới)
  deal_id       uuid,
  title         text not null,
  occurred_on   date,
  due_on        date,                           -- hạn nộp ⇒ 期限切れ ở 通知センター
  payload       jsonb not null default '{}',
  status        text not null default 'draft' check (status in ('draft', 'submitted')),
  submitted_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on app.reports (author_id, status, due_on);
create trigger reports_touch before update on app.reports
  for each row execute function private.touch_updated_at();

create type app.incident_type   as enum ('infosec', 'system', 'customer_site', 'near_miss');
create type app.incident_status as enum ('open', 'verifying', 'closed');   -- 対応中 · 有効性確認待ち · 完了

create sequence app.incident_seq;
create table app.incidents (
  id                   uuid primary key default gen_random_uuid(),
  code                 text unique not null
                         default 'INC-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('app.incident_seq')::text, 4, '0'),
  type                 app.incident_type not null,
  severity             smallint not null check (severity between 1 and 4),
  status               app.incident_status not null default 'open',
  title                text not null,
  product_code         text references core.products (code),
  facility_id          uuid,
  occurred_at          timestamptz,
  detected_at          timestamptz,
  reporter_id          uuid not null references core.employees (id),
  owner_id             uuid references core.employees (id),
  five_w2h             jsonb not null default '{}',   -- 第一報 5W2H
  root_cause           text,                          -- なぜなぜ分析
  countermeasure       text,
  effectiveness_due    date,
  closed_at            timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index on app.incidents (status, type);
create trigger incidents_touch before update on app.incidents
  for each row execute function private.touch_updated_at();

create table app.incident_events (               -- dòng thời gian (時系列)
  id           bigint generated always as identity primary key,
  incident_id  uuid not null references app.incidents (id) on delete cascade,
  at           timestamptz not null default now(),
  kind         text not null check (kind in ('timeline', 'action', 'comment', 'status_change')),
  body         text not null,
  author_id    uuid references core.employees (id)
);

-- 開発 › 障害 = cùng dữ liệu, chỉ loại "system"
create view app.v_system_outages with (security_invoker = true) as
  select * from app.incidents where type = 'system';

-- ============================================================================
-- §app — 健康JOY · スケジュール (sự kiện công ty)
-- ============================================================================
create table app.health_records (
  id           bigint generated always as identity primary key,
  employee_id  uuid not null references core.employees (id) on delete cascade,
  recorded_on  date not null,
  activity     text not null check (activity in
                 ('walking', 'running', 'strength', 'yoga', 'club', 'early_sleep', 'no_smoking', 'other')),
  points       int not null default 0 check (points >= 0),
  is_new_challenge boolean not null default false,
  note         text,
  created_at   timestamptz not null default now()
);
create index on app.health_records (recorded_on, employee_id);

create table app.events (
  id          uuid primary key default gen_random_uuid(),
  title_ja    text not null,
  title_vi    text,
  starts_at   timestamptz not null,
  ends_at     timestamptz,
  place_ja    text,
  place_vi    text,
  site_code   text references core.sites (code),     -- null = toàn công ty
  created_by  uuid references core.employees (id),
  created_at  timestamptz not null default now()
);

-- ============================================================================
-- §ext — bản sao chỉ-đọc từ hệ thống ngoài + sổ đồng bộ (設定 › データソース)
-- ============================================================================
create table ext.data_sources (
  id                text primary key,           -- 'ds-row-staff' … (khớp DS_ROWS của mockup)
  menu_ja           text not null,
  menu_vi           text not null,
  system            text not null,              -- 'Google Sheets' 'Mazrica' 'freee' 'Redmine' 'Dr.JOY MCP' …
  mode              text not null check (mode in ('sync', 'live', 'internal')),
  drive_folder_url  text,
  owner_department  text,
  frequency         text,
  configured        boolean not null default false,
  last_synced_at    timestamptz,
  last_status       text
);

create table ext.sync_runs (
  id             bigint generated always as identity primary key,
  source_id      text not null references ext.data_sources (id),
  started_at     timestamptz not null default now(),
  finished_at    timestamptz,
  status         text not null default 'running' check (status in ('running', 'ok', 'failed')),
  rows_upserted  int,
  error          text
);

create table ext.facilities (
  id                      uuid primary key default gen_random_uuid(),
  code                    text unique,          -- 'FAC-1023'
  name                    text not null,
  prefecture              text,
  city                    text,
  lat                     double precision,     -- 導入マップ
  lng                     double precision,
  is_university_hospital  boolean not null default false,
  mazrica_id              text unique,
  drjoy_org_id            text,
  synced_at               timestamptz
);

create table ext.facility_products (
  facility_id    uuid not null references ext.facilities (id) on delete cascade,
  product_code   text not null references core.products (code),
  status         text not null check (status in ('lead', 'negotiating', 'contracted', 'live', 'churned')),
  contracted_on  date,
  live_on        date,
  synced_at      timestamptz,
  primary key (facility_id, product_code)
);

-- 受注速報: phần AI CŨNG xem được (không có tiền) …
create table ext.deals (
  id                 uuid primary key default gen_random_uuid(),
  mazrica_id         text unique,
  facility_id        uuid references ext.facilities (id),
  product_code       text not null references core.products (code),
  owner_employee_id  uuid references core.employees (id),
  owner_department_id uuid references core.departments (id),
  stage              text,
  won_on             date,
  synced_at          timestamptz
);
create index on ext.deals (won_on desc);

-- … còn số tiền ở bảng riêng: KHÔNG cấp quyền đọc trực tiếp, chỉ đọc qua app.list_deals()
create table ext.deal_financials (
  deal_id       uuid primary key references ext.deals (id) on delete cascade,
  total_amount  numeric(14, 0),
  mrr           numeric(12, 0)
);

alter table app.reports   add constraint reports_facility_fk   foreign key (facility_id) references ext.facilities (id);
alter table app.reports   add constraint reports_deal_fk       foreign key (deal_id)     references ext.deals (id);
alter table app.incidents add constraint incidents_facility_fk foreign key (facility_id) references ext.facilities (id);

-- ============================================================================
-- §ai — JOY Pilot
-- ============================================================================
create table ai.conversations (
  id           uuid primary key default gen_random_uuid(),
  employee_id  uuid not null references core.employees (id) on delete cascade,
  title        text,
  created_at   timestamptz not null default now()
);

create table ai.messages (
  id               bigint generated always as identity primary key,
  conversation_id  uuid not null references ai.conversations (id) on delete cascade,
  role             text not null check (role in ('user', 'assistant', 'tool')),
  content          jsonb not null,
  created_at       timestamptz not null default now()
);

-- Mỗi lần Pilot gọi tool/MCP đều ghi lại (ai gọi, tool gì, tham số, kết quả tóm tắt) — để kiểm toán
create table ai.tool_calls (
  id           bigint generated always as identity primary key,
  message_id   bigint references ai.messages (id) on delete cascade,
  employee_id  uuid not null references core.employees (id),
  server       text not null,                   -- 'drjoy-mcp' 'google-drive' 'retention-mcp' 'joy-start' …
  tool         text not null,
  arguments    jsonb,
  ok           boolean,
  summary      text,
  created_at   timestamptz not null default now()
);

-- Chỉ mục tài liệu cho tìm kiếm ngữ nghĩa (ルール · 業務マニュアル · FAQ · リリースノート)
create table ai.documents (
  id             uuid primary key default gen_random_uuid(),
  source         text not null,                 -- 'drive' 'announcement' 'release_note'
  source_ref     text not null,                 -- Drive fileId / announcement id
  title          text not null,
  url            text,
  audience       text not null default 'all',   -- quyền xem sao chép từ nguồn
  updated_at     timestamptz,
  unique (source, source_ref)
);

create table ai.document_chunks (
  id           bigint generated always as identity primary key,
  document_id  uuid not null references ai.documents (id) on delete cascade,
  chunk_no     int not null,
  content      text not null,
  embedding    vector(1024)
);

-- ============================================================================
-- §audit — nhật ký thay đổi
-- ============================================================================
create table audit.log (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  actor       uuid,                             -- auth.uid(); null = job hệ thống
  table_name  text not null,
  op          text not null,
  row_id      text,
  old_row     jsonb,
  new_row     jsonb
);

create or replace function audit.capture() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into audit.log (actor, table_name, op, row_id, old_row, new_row)
  values ((select auth.uid()), tg_table_schema || '.' || tg_table_name, tg_op,
          coalesce(to_jsonb(new) ->> 'id', to_jsonb(old) ->> 'id'),
          case when tg_op <> 'INSERT' then to_jsonb(old) end,
          case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return coalesce(new, old);
end $$;

create trigger audit_user_roles       after insert or update or delete on core.user_roles       for each row execute function audit.capture();
create trigger audit_role_permissions after insert or update or delete on core.role_permissions for each row execute function audit.capture();
create trigger audit_employee_private after insert or update or delete on core.employee_private for each row execute function audit.capture();
create trigger audit_requests         after insert or update or delete on app.requests          for each row execute function audit.capture();
create trigger audit_approval_steps   after insert or update or delete on app.approval_steps    for each row execute function audit.capture();
create trigger audit_incidents        after insert or update or delete on app.incidents         for each row execute function audit.capture();
create trigger audit_announcements    after insert or update or delete on app.announcements     for each row execute function audit.capture();

-- ============================================================================
-- §RPC đọc (security definer, lọc/che rõ ràng bên trong)
-- ============================================================================

-- 受注速報: tiền chỉ hiện khi có quyền (○ toàn công ty / △ bộ phận của deal)
create or replace function app.list_deals(p_since date default current_date - 90)
returns table (id uuid, won_on date, facility_name text, product_code text, owner_name text,
               total_amount numeric, mrr numeric)
language sql stable security definer set search_path = '' as $$
  select d.id, d.won_on, f.name, d.product_code, e.name_ja,
         case when private.can_see('deal.amount', d.owner_department_id) then fin.total_amount end,
         case when private.can_see('deal.mrr',    d.owner_department_id) then fin.mrr end
  from ext.deals d
  left join ext.facilities f        on f.id = d.facility_id
  left join core.employees e        on e.id = d.owner_employee_id
  left join ext.deal_financials fin on fin.deal_id = d.id
  where private.me() is not null and d.won_on >= p_since
  order by d.won_on desc
$$;

-- 通知センター: 4 con số trên nút chuông
create or replace function app.inbox_counts()
returns table (approvals int, overdue int, today int, unread_announcements int)
language sql stable security definer set search_path = '' as $$
  with me as (select private.me() as id),
  tz as (select coalesce((select s.timezone from core.user_settings s, me where s.employee_id = me.id), 'Asia/Tokyo') as z)
  select
    (select count(*)::int from app.approval_steps s join app.requests r on r.id = s.request_id, me
      where s.approver_id = me.id and s.decision is null and r.status = 'in_review' and r.current_step = s.step_no),
    (select count(*)::int from app.reports x, me, tz
      where x.author_id = me.id and x.status = 'draft' and x.due_on < (now() at time zone tz.z)::date),
    (select count(*)::int from app.events ev, tz
      where (ev.starts_at at time zone tz.z)::date = (now() at time zone tz.z)::date),
    (select count(*)::int from app.announcements a, me
      where a.status = 'published' and now() >= coalesce(a.publish_from, a.created_at)
        and (a.publish_until is null or now() < a.publish_until)
        and private.in_audience(a.id, me.id)
        and not exists (select 1 from app.announcement_reads rd where rd.announcement_id = a.id and rd.employee_id = me.id))
$$;

-- 健康JOY ランキング: bỏ người không tham gia, ẩn tên người chọn ẩn danh (trừ chính mình)
create or replace function app.health_ranking(p_from date, p_to date, p_category text default 'volume', p_country text default null)
returns table (rank bigint, employee_id uuid, display_name text, score bigint)
language sql stable security definer set search_path = '' as $$
  with agg as (
    select h.employee_id,
           case p_category
             when 'volume'        then sum(h.points)
             when 'streak'        then count(distinct h.recorded_on)
             when 'new_challenge' then count(*) filter (where h.is_new_challenge)
           end as score
    from app.health_records h
    where h.recorded_on between p_from and p_to
    group by h.employee_id
  )
  select rank() over (order by a.score desc),
         case when coalesce(s.health_anonymous, false) and e.id <> private.me() then null else e.id end,
         case when coalesce(s.health_anonymous, false) and e.id <> private.me() then '匿名' else e.name_ja end,
         a.score
  from agg a
  join core.employees e on e.id = a.employee_id
  left join core.user_settings s on s.employee_id = e.id
  left join core.sites st on st.code = e.site_code
  where private.me() is not null
    and coalesce(s.health_ranking_opt_in, true)
    and a.score > 0
    and (p_country is null or st.country = p_country)
  order by 1
  limit 50
$$;

-- ============================================================================
-- §RLS — bật cho MỌI bảng; không có policy = không ai (trừ service_role) đọc được
-- ============================================================================
do $$
declare t record;
begin
  for t in select schemaname, tablename from pg_tables where schemaname in ('core', 'app', 'ext', 'ai', 'audit') loop
    execute format('alter table %I.%I enable row level security', t.schemaname, t.tablename);
  end loop;
end $$;

-- core: master + danh bạ đọc được với mọi người đã đăng nhập
create policy read_all on core.sites            for select to authenticated using (true);
create policy read_all on core.departments      for select to authenticated using (true);
create policy read_all on core.job_types        for select to authenticated using (true);
create policy read_all on core.products         for select to authenticated using (true);
create policy read_all on core.roles            for select to authenticated using (true);
create policy read_all on core.permissions      for select to authenticated using (true);
create policy read_all on core.role_permissions for select to authenticated using (true);
create policy read_all on core.employees        for select to authenticated using (status <> 'retired' or private.has_role('admin'));
create policy read_own on core.user_roles       for select to authenticated using (employee_id = private.me() or private.has_role('admin'));
create policy admin_all on core.user_roles      for all    to authenticated using (private.has_role('admin')) with check (private.has_role('admin'));
create policy admin_all on core.role_permissions for all   to authenticated using (private.has_role('admin')) with check (private.has_role('admin'));

create policy self_or_perm on core.employee_private for select to authenticated using (
  employee_id = private.me()
  or private.can_see('directory.private', (select e.department_id from core.employees e where e.id = employee_id)));
create policy self_write on core.employee_private for update to authenticated
  using (employee_id = private.me()) with check (employee_id = private.me());

-- cài đặt · お気に入り · tuỳ chọn thông báo: chỉ của chính mình
create policy own on core.user_settings            for all to authenticated using (employee_id = private.me()) with check (employee_id = private.me());
create policy own on core.favorites                for all to authenticated using (employee_id = private.me()) with check (employee_id = private.me());
create policy own on app.notification_preferences  for all to authenticated using (employee_id = private.me()) with check (employee_id = private.me());

-- 通知: đọc + đánh dấu đã đọc của chính mình (tạo mới chỉ qua trigger/RPC)
create policy own_read   on app.notifications for select to authenticated using (recipient_id = private.me());
create policy own_update on app.notifications for update to authenticated
  using (recipient_id = private.me()) with check (recipient_id = private.me());

-- お知らせ
create policy readable on app.announcements for select to authenticated using (
  author_id = private.me()
  or private.has_role('admin')
  or (status = 'published' and now() >= coalesce(publish_from, created_at)
      and (publish_until is null or now() < publish_until)
      and private.in_audience(id, private.me())));
create policy author_write on app.announcements for insert to authenticated with check (author_id = private.me() and status in ('draft', 'pending'));
create policy author_edit  on app.announcements for update to authenticated
  using (author_id = private.me() and status in ('draft', 'pending'))
  with check (author_id = private.me() and status in ('draft', 'pending'));
create policy admin_edit   on app.announcements for update to authenticated using (private.has_role('admin')) with check (true);
create policy readable on app.announcement_audiences for select to authenticated using (true);
create policy author_write on app.announcement_audiences for all to authenticated
  using (exists (select 1 from app.announcements a where a.id = announcement_id and (a.author_id = private.me() or private.has_role('admin'))))
  with check (exists (select 1 from app.announcements a where a.id = announcement_id and (a.author_id = private.me() or private.has_role('admin'))));
create policy mark_read on app.announcement_reads for insert to authenticated with check (employee_id = private.me());
create policy see_reads on app.announcement_reads for select to authenticated using (
  employee_id = private.me()
  or exists (select 1 from app.announcements a where a.id = announcement_id and (a.author_id = private.me() or private.has_role('admin'))));

-- 申請: người nộp + người duyệt; ghi chỉ khi còn nháp (nộp/duyệt đi qua RPC)
create policy readable on app.request_types for select to authenticated using (active);
create policy party on app.requests for select to authenticated using (
  applicant_id = private.me() or private.is_approver(id) or private.has_role('admin'));
create policy draft_insert on app.requests for insert to authenticated with check (applicant_id = private.me() and status = 'draft');
create policy draft_update on app.requests for update to authenticated
  using (applicant_id = private.me() and status in ('draft', 'returned'))
  with check (applicant_id = private.me() and status in ('draft', 'returned'));
create policy draft_delete on app.requests for delete to authenticated using (applicant_id = private.me() and status = 'draft');
create policy party on app.approval_steps for select to authenticated using (
  approver_id = private.me()
  or exists (select 1 from app.requests r where r.id = request_id and r.applicant_id = private.me())
  or private.has_role('admin'));
create policy party on app.request_files for select to authenticated using (
  exists (select 1 from app.requests r where r.id = request_id
          and (r.applicant_id = private.me() or private.is_approver(r.id) or private.has_role('admin'))));
create policy applicant_write on app.request_files for insert to authenticated with check (
  exists (select 1 from app.requests r where r.id = request_id and r.applicant_id = private.me() and r.status in ('draft', 'returned')));

-- 報告: tác giả + cấp trên trực tiếp + quản lý phòng ban (△)
create policy readable on app.reports for select to authenticated using (
  author_id = private.me()
  or exists (select 1 from core.employees e where e.id = author_id
             and (e.manager_id = private.me() or private.can_see('report.read', e.department_id))));
create policy own_write on app.reports for all to authenticated
  using (author_id = private.me()) with check (author_id = private.me());

-- インシデント: mọi người xem được sổ (minh bạch để phòng tái phát); sửa: người báo, người phụ trách, admin
create policy read_all on app.incidents       for select to authenticated using (true);
create policy report   on app.incidents       for insert to authenticated with check (reporter_id = private.me());
create policy handle   on app.incidents       for update to authenticated
  using (reporter_id = private.me() or owner_id = private.me() or private.has_role('admin')) with check (true);
create policy read_all on app.incident_events for select to authenticated using (true);
create policy add      on app.incident_events for insert to authenticated with check (author_id = private.me());

-- 健康JOY: bản ghi của mình (xếp hạng đi qua app.health_ranking)
create policy own on app.health_records for all to authenticated using (employee_id = private.me()) with check (employee_id = private.me());
create policy read_all on app.events for select to authenticated using (true);
create policy admin_write on app.events for all to authenticated using (private.has_role('admin')) with check (private.has_role('admin'));

-- ext: chỉ đọc (job đồng bộ dùng service_role, bỏ qua RLS). deal_financials: KHÔNG có policy ⇒ chỉ qua RPC.
create policy read_all on ext.facilities        for select to authenticated using (true);
create policy read_all on ext.facility_products for select to authenticated using (true);
create policy read_all on ext.deals             for select to authenticated using (true);
create policy admin_read on ext.data_sources    for select to authenticated using (private.has_role('admin'));
create policy admin_read on ext.sync_runs       for select to authenticated using (private.has_role('admin'));

-- ai: hội thoại của ai người nấy xem; tài liệu theo audience
create policy own on ai.conversations for all to authenticated using (employee_id = private.me()) with check (employee_id = private.me());
create policy own on ai.messages for select to authenticated using (
  exists (select 1 from ai.conversations c where c.id = conversation_id and c.employee_id = private.me()));
create policy own on ai.tool_calls for select to authenticated using (employee_id = private.me() or private.has_role('admin'));
create policy readable on ai.documents       for select to authenticated using (audience = 'all' or private.has_role('admin'));
create policy readable on ai.document_chunks for select to authenticated using (
  exists (select 1 from ai.documents d where d.id = document_id and (d.audience = 'all' or private.has_role('admin'))));

create policy admin_read on audit.log for select to authenticated using (private.has_role('admin'));

-- ============================================================================
-- §Quyền schema (Supabase không tự cấp cho schema tự tạo)
-- ============================================================================
grant usage on schema core, app, ext, ai to authenticated, service_role;
grant usage on schema audit to authenticated, service_role;
grant select, insert, update, delete on all tables in schema core, app, ai to authenticated;
grant select on all tables in schema ext, audit to authenticated;
revoke all on ext.deal_financials from authenticated;
grant usage, select on all sequences in schema core, app, ai to authenticated;
grant all on all tables in schema core, app, ext, ai, audit to service_role;
grant all on all sequences in schema core, app, ext, ai, audit to service_role;
-- Hàm private.* được RLS gọi ⇒ cần EXECUTE, nhưng schema private không đưa vào Data API
grant usage on schema private to authenticated, service_role;
revoke execute on all functions in schema private from public;
grant execute on all functions in schema private to authenticated, service_role;
revoke execute on function private.notify(uuid, app.notification_kind, text, text, text, text, text, smallint) from authenticated;
revoke execute on all functions in schema app from public;
grant execute on function app.submit_request(uuid), app.decide_approval(bigint, text, text),
  app.list_deals(date), app.inbox_counts(), app.health_ranking(date, date, text, text) to authenticated;

-- ============================================================================
-- §Realtime — bảng nào thay đổi thì đẩy xuống trình duyệt (vẫn tuân RLS)
-- ============================================================================
alter publication supabase_realtime add table
  app.notifications, app.announcements, app.approval_steps, app.incidents, ext.deals;

-- ============================================================================
-- §Storage — bucket riêng tư; đường dẫn bắt đầu bằng id của đối tượng sở hữu
-- ============================================================================
insert into storage.buckets (id, name, public) values
  ('avatars', 'avatars', false), ('announcements', 'announcements', false),
  ('requests', 'requests', false), ('photos', 'photos', false)
on conflict (id) do nothing;

create policy "avatars: logged-in read" on storage.objects for select to authenticated
  using (bucket_id = 'avatars');
create policy "announcements: logged-in read" on storage.objects for select to authenticated
  using (bucket_id = 'announcements');
create policy "requests: parties read" on storage.objects for select to authenticated using (
  bucket_id = 'requests'
  and exists (select 1 from app.requests r where r.id::text = (storage.foldername(name))[1]
              and (r.applicant_id = private.me() or private.is_approver(r.id) or private.has_role('admin'))));
create policy "requests: applicant upload" on storage.objects for insert to authenticated with check (
  bucket_id = 'requests'
  and exists (select 1 from app.requests r where r.id::text = (storage.foldername(name))[1]
              and r.applicant_id = private.me() and r.status in ('draft', 'returned')));
