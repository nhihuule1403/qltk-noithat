import mysql from 'mysql2/promise';
import { config } from './config.js';

export const pool = mysql.createPool({
  ...config.db,
  connectionLimit: 10,
  timezone: '+07:00',
  dateStrings: true,      // trả DATETIME dạng chuỗi, tránh lệch múi giờ
  decimalNumbers: true,   // DECIMAL → number
  charset: 'UTF8MB4_UNICODE_CI',
});

export async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] ?? null;
}

// Gọi stored procedure, trả về result set đầu tiên (nếu có)
export async function callProc(name, params = []) {
  const placeholders = params.map(() => '?').join(', ');
  const [results] = await pool.query(`CALL ${name}(${placeholders})`, params);
  return Array.isArray(results) && Array.isArray(results[0]) ? results[0] : [];
}

export async function withTransaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
