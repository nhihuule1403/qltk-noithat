// Khởi tạo CSDL trên MySQL có quản lý (Aiven, ...) – thay cho cơ chế
// /docker-entrypoint-initdb.d khi không chạy MySQL bằng Docker.
//
//   cd backend
//   DB_HOST=... DB_PORT=... DB_ADMIN_USER=avnadmin DB_ADMIN_PASSWORD=... DB_SSL=true \
//   APP_DB_USER=qltk_app APP_DB_PASSWORD=... node scripts/init-db.mjs
//
// Chạy lần lượt db/init/01..06. Bỏ qua tạo tài khoản ứng dụng nếu thiếu
// APP_DB_PASSWORD (khi đó backend dùng luôn tài khoản quản trị).
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import 'dotenv/config';

const INIT_DIR = fileURLToPath(new URL('../../db/init/', import.meta.url));

const env = (name, fallback) => {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Thiếu biến môi trường ${name}`);
  return v;
};

const onlyComments = (s) => s.split('\n').every((l) => !l.trim() || l.trim().startsWith('--'));

// Tách script theo câu lệnh, hỗ trợ DELIMITER như mysql client
function splitStatements(sql) {
  const statements = [];
  let delimiter = ';';
  let buffer = '';
  for (const line of sql.split('\n')) {
    const m = line.match(/^\s*DELIMITER\s+(\S+)\s*$/i);
    if (m) {
      delimiter = m[1];
      continue;
    }
    buffer += line + '\n';
    if (buffer.trimEnd().endsWith(delimiter)) {
      const stmt = buffer.trimEnd().slice(0, -delimiter.length).trim();
      if (!onlyComments(stmt)) statements.push(stmt);
      buffer = '';
    }
  }
  if (!onlyComments(buffer)) statements.push(buffer.trim());
  return statements;
}

// Lấy phần SQL trong heredoc của 05_security.sh để không phải viết lặp quyền
function securityStatements(appUser, appPass) {
  const sh = readFileSync(INIT_DIR + '05_security.sh', 'utf8');
  const body = sh.split('<<-EOSQL')[1].split('EOSQL')[0];
  const sql = body.replaceAll('${APP_USER}', appUser).replaceAll('${APP_PASS}', appPass.replaceAll("'", "''"));
  return splitStatements('USE QLTonKhoNoiThat;\n' + sql);
}

const conn = await mysql.createConnection({
  host: env('DB_HOST'),
  port: Number(env('DB_PORT', 3306)),
  user: env('DB_ADMIN_USER'),
  password: env('DB_ADMIN_PASSWORD'),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  charset: 'UTF8MB4_UNICODE_CI',
});

const [[exists]] = await conn.query(
  "SELECT COUNT(*) AS n FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = 'QLTonKhoNoiThat'",
);
if (exists.n > 0 && process.argv[2] !== '--force') {
  console.error('CSDL QLTonKhoNoiThat đã tồn tại. Chạy lại với --force để xóa và tạo mới.');
  process.exit(1);
}
if (exists.n > 0) await conn.query('DROP DATABASE QLTonKhoNoiThat');

const files = readdirSync(INIT_DIR).filter((f) => f.endsWith('.sql')).sort();
for (const file of files) {
  const statements = splitStatements(readFileSync(INIT_DIR + file, 'utf8'));
  process.stdout.write(`${file}: ${statements.length} câu lệnh... `);
  for (const stmt of statements) {
    try {
      await conn.query(stmt);
    } catch (err) {
      console.error(`\nLỗi khi chạy:\n${stmt.slice(0, 300)}\n→ ${err.code}: ${err.sqlMessage}`);
      if (err.code === 'ER_BINLOG_CREATE_ROUTINE_NEED_SUPER') {
        console.error(
          '\nMáy chủ MySQL không cho tài khoản này tạo trigger / function khi đang bật binlog.\n' +
          'Cần bật log_bin_trust_function_creators = 1 (hoặc dùng tài khoản có quyền SUPER).\n' +
          'Nếu nhà cung cấp không cho đổi, hãy dùng phương án máy ảo + docker-compose trong DEPLOY.md.',
        );
      }
      process.exit(1);
    }
  }
  console.log('xong');

  // Tạo tài khoản ứng dụng ngay sau phần báo cáo (đúng thứ tự 05 như khi chạy Docker)
  if (file.startsWith('04_')) {
    const appPass = process.env.APP_DB_PASSWORD;
    const appUser = process.env.APP_DB_USER || 'qltk_app';
    if (!appPass) {
      console.log('05_security: bỏ qua (không có APP_DB_PASSWORD)');
      continue;
    }
    try {
      for (const stmt of securityStatements(appUser, appPass)) await conn.query(stmt);
      console.log(`05_security: đã tạo tài khoản ${appUser}`);
    } catch (err) {
      console.warn(`05_security: không tạo được tài khoản ứng dụng (${err.sqlMessage}). Backend có thể dùng tài khoản quản trị.`);
    }
  }
}

const [[stats]] = await conn.query(
  `SELECT (SELECT COUNT(*) FROM QLTonKhoNoiThat.SanPham) AS SanPham,
          (SELECT COUNT(*) FROM QLTonKhoNoiThat.HoaDon) AS HoaDon,
          (SELECT COUNT(*) FROM QLTonKhoNoiThat.LichSuBienDong) AS LichSuBienDong`,
);
console.log('Hoàn tất:', stats);
await conn.end();
