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

// ── Dữ liệu thử: 2 phòng ban, 4 người ──
const U = (n) => `00000000-0000-0000-0000-00000000000${n}`;
await db.exec(`
  insert into auth.users values ('${U(1)}','ceo@example.com'),('${U(2)}','mgr@example.com'),('${U(3)}','staff@example.com'),('${U(4)}','other@example.com');
  insert into core.departments (id, code, name_ja, name_vi) values
    ('10000000-0000-0000-0000-000000000001','AIPHONE','AI電話事業部','Khối Điện thoại AI'),
    ('10000000-0000-0000-0000-000000000002','PHARMA','医薬連携事業部','Khối Liên kết Y Dược');
  insert into core.employees (id, user_id, email, name_ja, department_id, site_code) values
    ('20000000-0000-0000-0000-000000000001','${U(1)}','ceo@example.com','社長','10000000-0000-0000-0000-000000000001','JP-TKY'),
    ('20000000-0000-0000-0000-000000000002','${U(2)}','mgr@example.com','上長','10000000-0000-0000-0000-000000000001','JP-TKY'),
    ('20000000-0000-0000-0000-000000000003','${U(3)}','staff@example.com','メンバー','10000000-0000-0000-0000-000000000001','VN-HAN'),
    ('20000000-0000-0000-0000-000000000004','${U(4)}','other@example.com','他部署','10000000-0000-0000-0000-000000000002','JP-TKY');
  update core.employees set manager_id = '20000000-0000-0000-0000-000000000002' where id = '20000000-0000-0000-0000-000000000003';
  insert into core.user_roles (employee_id, role_code) values
    ('20000000-0000-0000-0000-000000000001','executive'),('20000000-0000-0000-0000-000000000001','admin'),
    ('20000000-0000-0000-0000-000000000002','manager'),
    ('20000000-0000-0000-0000-000000000003','general'),('20000000-0000-0000-0000-000000000004','general');
  insert into app.notification_preferences (employee_id, via_drjoy, via_email, quiet_start, quiet_end)
    select id, true, false, '00:00', '00:00' from core.employees;
  insert into ext.deals (id, product_code, owner_department_id, won_on) values
    ('30000000-0000-0000-0000-000000000001','ai-phone','10000000-0000-0000-0000-000000000001', current_date),
    ('30000000-0000-0000-0000-000000000002','pharma','10000000-0000-0000-0000-000000000002', current_date);
  insert into ext.deal_financials values
    ('30000000-0000-0000-0000-000000000001', 3600000, 100000),
    ('30000000-0000-0000-0000-000000000002', 8400000, 350000);
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
  try { await q('select * from ext.deal_financials'); } catch (e) { err = e.message; }
  check('general: SELECT ext.deal_financials bị chặn', !!err, err);
  const d = await q('select product_code, total_amount, mrr from app.list_deals() order by product_code');
  const ai = d.find((x) => x.product_code === 'ai-phone'), ph = d.find((x) => x.product_code === 'pharma');
  check('general: thấy tổng tiền deal của bộ phận mình (△)', ai && ai.total_amount !== null, d);
  check('general: KHÔNG thấy tổng tiền bộ phận khác', ph && ph.total_amount === null, d);
  check('general: KHÔNG thấy MRR (×)', d.every((x) => x.mrr === null), d);
});
await as(2, async () => {
  const d = await q('select product_code, total_amount, mrr from app.list_deals()');
  check('manager: thấy tổng tiền + MRR toàn công ty (○)', d.every((x) => x.total_amount !== null && x.mrr !== null), d);
});

// 2. Luồng 申請 → 承認 + thông báo
const reqId = await as(3, async () => {
  const [r] = await q(`insert into app.requests (type_code, applicant_id, title, amount)
                       values ('business_trip', private.me(), '出張：大阪', 42000) returning id`);
  const [s] = await q('select status, current_step from app.submit_request($1)', [r.id]);
  check('submit_request → in_review, bước 1', s.status === 'in_review' && s.current_step === 1, s);
  return r.id;
});
await as(4, async () => {
  const r = await q('select * from app.requests where id = $1', [reqId]);
  check('người ngoài không thấy đơn của người khác', r.length === 0, r);
});
await as(2, async () => {
  const [c] = await q('select * from app.inbox_counts()');
  check('上長: 通知センター 承認待ち = 1', c.approvals === 1, c);
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

// 6. Không có bảng nào quên bật RLS
const noRls = await q(`select n.nspname || '.' || c.relname as t from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where c.relkind = 'r' and n.nspname in ('core','app','ext','ai','audit') and not c.relrowsecurity`);
check('mọi bảng đều bật RLS', noRls.length === 0, noRls);
const [au] = await q(`select count(*)::int as n from audit.log`);
check('audit.log có ghi thay đổi', au.n > 0, au);

console.log(failed ? `\n✖ ${failed} kiểm tra thất bại` : '\n✔ tất cả kiểm tra đều qua');
process.exit(failed ? 1 : 0);
