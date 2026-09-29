#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Kiểm nhanh schema Supabase bằng PGlite (Postgres chạy trong Node, không cần Docker):
// dựng stub của Supabase (auth.uid, role, publication, storage) → chạy migration + seed →
// chạy các kịch bản RLS / RPC / thông báo. Lỗi ⇒ exit 1.
//
//   npm i --no-save @electric-sql/pglite @electric-sql/pglite-pgvector
//   node supabase/tests/rls-smoke.mjs
//
// ⚠ Chỉ là kiểm khói. Trước khi lên staging vẫn chạy `supabase db reset` với Supabase CLI thật.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite-pgvector';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const db = new PGlite({ extensions: { vector } });

// Stub tối thiểu của những gì Supabase có sẵn
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to authenticated, anon;
  grant execute on function auth.uid() to authenticated, anon;
  create publication supabase_realtime;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as
    $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
`);

for (const f of readdirSync(join(ROOT, 'migrations')).filter((x) => x.endsWith('.sql')).sort()) {
  try { await db.exec(readFileSync(join(ROOT, 'migrations', f), 'utf8')); } catch (e) {
    console.error('✖ migration', f, '—', e.message, e.where || ''); process.exit(1);
  }
  console.log('✔ migration', f);
}
try { await db.exec(readFileSync(join(ROOT, 'seed.sql'), 'utf8')); } catch (e) { console.error('✖ seed.sql —', e.message); process.exit(1); }
console.log('✔ seed.sql');

// ── Dữ liệu thử: 2 phòng ban, 5 người (vai trò suy ra từ 役職, chỉ admin/人事 cấp tay) ──
const U = (n) => `00000000-0000-0000-0000-00000000000${n}`;
await db.exec(`
  insert into auth.users values ('${U(1)}','ceo@example.com'),('${U(2)}','mgr@example.com'),('${U(3)}','staff@example.com'),('${U(4)}','other@example.com'),('${U(5)}','hr@example.com');
  insert into core.departments (id, code, name_ja, name_vi) values
    ('10000000-0000-0000-0000-000000000001','AIPHONE','AI電話事業部','Khối Điện thoại AI'),
    ('10000000-0000-0000-0000-000000000002','PHARMA','医薬連携事業部','Khối Liên kết Y Dược');
  insert into core.employees (id, user_id, email, name_ja, department_id, position_code, site_code) values
    ('20000000-0000-0000-0000-000000000001','${U(1)}','ceo@example.com','社長','10000000-0000-0000-0000-000000000001','ceo','JP-TKY'),
    ('20000000-0000-0000-0000-000000000002','${U(2)}','mgr@example.com','上長','10000000-0000-0000-0000-000000000001','manager','JP-TKY'),
    ('20000000-0000-0000-0000-000000000003','${U(3)}','staff@example.com','メンバー','10000000-0000-0000-0000-000000000001','member','VN-HAN'),
    ('20000000-0000-0000-0000-000000000004','${U(4)}','other@example.com','他部署','10000000-0000-0000-0000-000000000002','member','JP-TKY'),
    ('20000000-0000-0000-0000-000000000005','${U(5)}','hr@example.com','人事','10000000-0000-0000-0000-000000000002','member','JP-TKY');
  update core.employees set manager_id = '20000000-0000-0000-0000-000000000002' where id = '20000000-0000-0000-0000-000000000003';
  insert into core.user_roles (employee_id, role_code) values
    ('20000000-0000-0000-0000-000000000001','admin'), ('20000000-0000-0000-0000-000000000005','hr_admin');
  insert into app.notification_preferences (employee_id, via_drjoy, via_email, quiet_start, quiet_end)
    select id, true, false, '00:00', '00:00' from core.employees;
  insert into crm.deals (id, product_code, owner_employee_id, owner_department_id, stage) values
    ('30000000-0000-0000-0000-000000000001','ai-phone','20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','won'),
    ('30000000-0000-0000-0000-000000000002','pharma','20000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000002','won');
  insert into crm.deal_financials (deal_id, total_amount, mrr) values
    ('30000000-0000-0000-0000-000000000001', 3600000, 100000),
    ('30000000-0000-0000-0000-000000000002', 8400000, 350000);
  insert into crm.activities (owner_employee_id, kind, subject, due_on) values
    ('20000000-0000-0000-0000-000000000003','visit','商談報告：サンプル大学病院', current_date - 2);
`);

let failed = 0;
function check(label, ok, got) {
  console.log((ok ? '✔ ' : '✖ ') + label + (ok ? '' : '  → ' + JSON.stringify(got)));
  if (!ok) failed++;
}
async function as(n, fn) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${U(n)}', false);`);
  try { return await fn(); } finally { await db.exec(`reset role;`); }
}
const q = async (sql, p) => (await db.query(sql, p)).rows;

// 1. Nhân viên thường không đọc được tiền trực tiếp
await as(3, async () => {
  let err = null;
  try { await q('select * from crm.deal_financials'); } catch (e) { err = e.message; }
  check('general: SELECT crm.deal_financials bị chặn', !!err, err);
  const d = await q('select product_code, total_amount, mrr from crm.list_deals() order by product_code');
  const ai = d.find((x) => x.product_code === 'ai-phone'), ph = d.find((x) => x.product_code === 'pharma');
  check('general: thấy tổng tiền deal của bộ phận mình (△)', ai && ai.total_amount !== null, d);
  check('general: KHÔNG thấy tổng tiền bộ phận khác', ph && ph.total_amount === null, d);
  check('general: KHÔNG thấy MRR (×)', d.every((x) => x.mrr === null), d);
});
await as(2, async () => {
  const d = await q('select product_code, total_amount, mrr from crm.list_deals()');
  check('manager (suy ra từ 役職, không cấp tay): thấy tổng tiền + MRR (○)', d.length === 2 && d.every((x) => x.total_amount !== null && x.mrr !== null), d);
});

// 1b. staff_master: chỉ 人事 sửa được; điều chuyển có lịch sử, hẹn ngày thì chưa áp
await as(3, async () => {
  await q(`update core.employees set name_ja = 'X' where id = private.me()`);
  const [e] = await q(`select name_ja from core.employees where id = private.me()`);
  check('general: không tự sửa được staff_master', e.name_ja === 'メンバー', e);
  let err = null;
  try { await q(`insert into core.user_roles (employee_id, role_code) values (private.me(), 'admin')`); } catch (x) { err = x.message; }
  check('general: không tự cấp quyền admin được', !!err, err);
  err = null;
  try { await q(`select core.transfer_employee(private.me(), '10000000-0000-0000-0000-000000000002', 'leader')`); } catch (x) { err = x.message; }
  check('general: không gọi được transfer_employee', !!err, err);
});
await as(5, async () => {
  await q(`select core.transfer_employee('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'leader')`);
  await q(`select core.transfer_employee('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'leader', null, current_date + 3)`);
  const [e] = await q(`select department_id, position_code from core.employees where id = '20000000-0000-0000-0000-000000000003'`);
  check('人事: thăng chức áp ngay, điều chuyển hẹn ngày chưa áp', e.position_code === 'leader' && e.department_id === '10000000-0000-0000-0000-000000000001', e);
  const h = await q(`select valid_from, valid_to from core.employee_assignments where employee_id = '20000000-0000-0000-0000-000000000003' order by valid_from`);
  check('人事: lịch sử điều chuyển có 2 dòng (1 đang mở, 1 hẹn ngày)', h.length === 2 && h[0].valid_to !== null && h[1].valid_to === null, h);
});
// giả lập 3 ngày trôi qua
await db.exec(`update core.employee_assignments set valid_from = valid_from - 3, valid_to = valid_to - 3
  where employee_id = '20000000-0000-0000-0000-000000000003';`);
const [applied] = await q(`select private.apply_due_assignments() as n`);
const [moved] = await q(`select department_id from core.employees where id = '20000000-0000-0000-0000-000000000003'`);
check('cron: tới ngày thì điều chuyển được áp', applied.n === 1 && moved.department_id === '10000000-0000-0000-0000-000000000002', { applied, moved });
await db.exec(`  -- đưa メンバー về lại phòng ban cũ cho các kịch bản sau
  delete from core.employee_assignments where employee_id = '20000000-0000-0000-0000-000000000003';
  insert into core.employee_assignments (employee_id, department_id, position_code, valid_from) values
    ('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','member', current_date);
  select private.apply_due_assignments();`);

// 1c. CRM: người phụ trách sửa deal của mình; general không sửa được deal bộ phận khác
await as(3, async () => {
  await q(`update crm.deals set title = 'hack' where id = '30000000-0000-0000-0000-000000000002'`);
  const [d] = await q(`select title from crm.deals where id = '30000000-0000-0000-0000-000000000002'`);
  check('CRM: general không sửa được deal của người khác', d.title !== 'hack', d);
  const [n] = await q(`insert into crm.deals (product_code, owner_employee_id, title) values ('ai-phone', private.me(), 'Mới') returning id`);
  check('CRM: tạo được deal do mình phụ trách', !!n.id, n);
  const [c] = await q('select overdue from app.inbox_counts()');
  check('通知センター: アクション quá hạn được đếm', c.overdue === 1, c);
});

// 2. Luồng 申請 → 承認 + thông báo
const reqId = await as(3, async () => {
  const [r] = await q(`insert into app.requests (type_code, applicant_id, title, amount)
                       values ('business_trip', private.me(), '出張：大阪', 42000) returning id`);
  await q(`insert into app.files (owner_table, owner_id, storage, bucket, object_path, file_name, uploaded_by)
           values ('app.requests', $1::uuid, 'supabase', 'requests', $1::text || '/receipt.pdf', 'receipt.pdf', private.me())`, [r.id]);
  await q(`insert into app.files (owner_table, owner_id, storage, drive_file_id, file_name, uploaded_by)
           values ('app.requests', $1, 'drive', '1AbCdEf', '行程表.pdf', private.me())`, [r.id]);
  const [s] = await q('select status, current_step from app.submit_request($1)', [r.id]);
  check('submit_request → in_review, bước 1', s.status === 'in_review' && s.current_step === 1, s);
  return r.id;
});
await as(4, async () => {
  const r = await q('select * from app.requests where id = $1', [reqId]);
  check('người ngoài không thấy đơn của người khác', r.length === 0, r);
  const f = await q('select * from app.files where owner_id = $1', [reqId]);
  check('người ngoài không thấy file đính kèm (Storage lẫn Drive)', f.length === 0, f);
});
await as(2, async () => {
  const [c] = await q('select * from app.inbox_counts()');
  check('上長: 通知センター 承認待ち = 1', c.approvals === 1, c);
  const f = await q('select storage from app.files where owner_id = $1', [reqId]);
  check('người duyệt thấy 2 file đính kèm', f.length === 2, f);
  const n = await q(`select kind from app.notifications where recipient_id = private.me()`);
  check('上長: có thông báo approval_request', n.some((x) => x.kind === 'approval_request'), n);
  const [st] = await q('select id from app.approval_steps where request_id = $1', [reqId]);
  const [r] = await q(`select status from app.decide_approval($1, 'approved', 'OK')`, [st.id]);
  check('decide_approval → approved', r.status === 'approved', r);
});
await as(3, async () => {
  const n = await q(`select kind, title_ja from app.notifications where recipient_id = private.me()`);
  check('người nộp nhận thông báo 承認済み', n.some((x) => x.kind === 'approval_result'), n);
  let err = null;
  try { await q(`update app.requests set status = 'approved' where id = $1`, [reqId]); } catch (e) { err = e.message; }
  const [r] = await q('select status from app.requests where id = $1', [reqId]);
  check('không tự UPDATE được đơn đã duyệt', r.status === 'approved', { err, r });
});
const del = await q(`select channel, status from app.notification_deliveries`);
check('thông báo được xếp hàng gửi Dr.JOY (email tắt ⇒ không có)', del.length > 0 && del.every((d) => d.channel === 'drjoy'), del);

// 3. お知らせ: đăng cho site VN ⇒ chỉ người ở VN nhận, đếm chưa đọc đúng
await db.exec(`
  insert into app.announcements (id, category, is_important, title_ja, body_ja, author_id, status, publish_from)
    values ('40000000-0000-0000-0000-000000000001','event',true,'ハノイ拠点BBQ','<p>…</p>','20000000-0000-0000-0000-000000000001','draft', now() - interval '1 minute');
  insert into app.announcement_audiences values ('40000000-0000-0000-0000-000000000001','site','VN-HAN');
  update app.announcements set status = 'published' where id = '40000000-0000-0000-0000-000000000001';
`);
await as(3, async () => {
  const [c] = await q('select * from app.inbox_counts()');
  check('VN: 未読のお知らせ = 1', c.unread_announcements === 1, c);
  await q(`insert into app.announcement_reads (announcement_id, employee_id) values ('40000000-0000-0000-0000-000000000001', private.me())`);
  const [c2] = await q('select * from app.inbox_counts()');
  check('VN: đọc xong ⇒ 未読 = 0', c2.unread_announcements === 0, c2);
});
await as(4, async () => {
  const a = await q('select id from app.announcements');
  check('JP (khác đối tượng): không thấy thông báo của VN', a.length === 0, a);
});

// 4. Cài đặt · お気に入り chỉ của mình
await as(3, async () => {
  await q(`insert into core.favorites (employee_id, page_key) values (private.me(), 'todo/報告/上長報告')`);
  let err = null;
  try { await q(`insert into core.favorites (employee_id, page_key) values ('20000000-0000-0000-0000-000000000004', 'x')`); } catch (e) { err = e.message; }
  check('không ghi được お気に入り hộ người khác', !!err, err);
});

// 5. Giờ yên lặng: đang trong khung ⇒ lùi giờ gửi
await db.exec(`update app.notification_preferences set quiet_start = (now() at time zone 'Asia/Tokyo')::time - interval '1 hour',
  quiet_end = (now() at time zone 'Asia/Tokyo')::time + interval '1 hour' where employee_id = '20000000-0000-0000-0000-000000000004'`);
const [qt2] = await q(`select private.next_send_time('20000000-0000-0000-0000-000000000004') > now() + interval '30 minutes' as deferred`);
check('giờ yên lặng ⇒ gửi sau quiet_end', qt2.deferred === true, qt2);

// 6. Log token/chi phí: giá tự tính, người dùng không tự ghi được, tổng hợp theo quyền
await db.exec(`
  insert into ai.model_prices (provider, model, input_per_m, cached_per_m, output_per_m, valid_from) values ('openai', 'test-small', 1, 0.5, 4, '2026-01-01');
  insert into ai.usage_events (employee_id, feature, provider, model, agent_code, input_tokens, cached_tokens, output_tokens) values
    ('20000000-0000-0000-0000-000000000003', 'pilot',   'openai',   'test-small', 'schedule', 1000000, 200000, 250000),
    ('20000000-0000-0000-0000-000000000003', 'routing', 'typesafe', 'jev',        null,       500,     0,      0),
    ('20000000-0000-0000-0000-000000000004', 'pilot',   'openai',   'test-small', 'crm',      1000000, 0,      0);`);
const [cost] = await q(`select cost_usd::float as c, department_id from ai.usage_events where agent_code = 'schedule'`);
check('chi phí tự tính: 0.8M×$1 + 0.2M×$0.5 + 0.25M×$4 = $1.9', Math.abs(cost.c - 1.9) < 1e-6 && cost.department_id === '10000000-0000-0000-0000-000000000001', cost);
await as(3, async () => {
  let err = null;
  try { await q(`insert into ai.usage_events (employee_id, feature, provider, model) values (private.me(), 'pilot', 'openai', 'x')`); } catch (x) { err = x.message; }
  check('người dùng không tự ghi được log token', !!err, err);
  const r = await q('select * from ai.usage_summary(current_date - 1, current_date)');
  check('general: tổng hợp chỉ thấy số của mình', r.length === 2 && r.every((x) => x.department_id === '10000000-0000-0000-0000-000000000001'), r);
  await q(`insert into app.usage_events (page_key, action) values ('todo/申請/経費', 'view')`);
});
await as(2, async () => {
  const r = await q('select sum(calls)::int as n from ai.usage_summary(current_date - 1, current_date)');
  check('manager: thấy tổng hợp phòng ban mình (△), không thấy phòng khác', r[0].n === 2, r);
});
await db.exec(`insert into ai.budgets (scope, monthly_usd, alert_ratio, notify_id) values ('company', 2, 0.8, '20000000-0000-0000-0000-000000000001')`);
const [bud] = await q(`select private.check_ai_budgets() as n`);
const [bud2] = await q(`select private.check_ai_budgets() as n`);
check('ngân sách: vượt 80% ⇒ báo 1 lần trong ngày', bud.n === 1 && bud2.n === 0, { bud, bud2 });

// 7. Không có bảng nào quên bật RLS
const noRls = await q(`select n.nspname || '.' || c.relname as t from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where c.relkind = 'r' and n.nspname in ('core','crm','app','ext','ai','audit') and not c.relrowsecurity`);
check('mọi bảng đều bật RLS', noRls.length === 0, noRls);
const [au] = await q(`select count(*)::int as n from audit.log`);
check('audit.log có ghi thay đổi', au.n > 0, au);

console.log(failed ? `\n✖ ${failed} kiểm tra thất bại` : '\n✔ tất cả kiểm tra đều qua');
process.exit(failed ? 1 : 0);
