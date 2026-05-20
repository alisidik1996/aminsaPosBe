// ===== DATABASE SCHEMA & SEED =====
require('dotenv').config();
const pool = require('./config/db');

// ── SCHEMA ────────────────────────────────────────────────────
async function createSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id       SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name     TEXT NOT NULL,
      role     TEXT NOT NULL DEFAULT 'kasir'
    );

    CREATE TABLE IF NOT EXISTS menu (
      id       SERIAL PRIMARY KEY,
      name     TEXT    NOT NULL,
      price    INTEGER NOT NULL,
      category TEXT    NOT NULL,
      station  TEXT    NOT NULL CHECK(station IN ('kitchen','bar')),
      stock    INTEGER NOT NULL DEFAULT 0,
      image    TEXT,
      active   INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS tables_pos (
      id        SERIAL PRIMARY KEY,
      name      TEXT NOT NULL,
      status    TEXT NOT NULL DEFAULT 'available',
      opened_at TEXT,
      kasir_id  INTEGER
    );

    CREATE TABLE IF NOT EXISTS orders (
      id         SERIAL PRIMARY KEY,
      table_id   INTEGER NOT NULL REFERENCES tables_pos(id),
      kasir_id   INTEGER NOT NULL,
      kasir_name TEXT    NOT NULL,
      note       TEXT    DEFAULT '',
      status     TEXT    NOT NULL DEFAULT 'open',
      created_at TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id       SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(id),
      menu_id  INTEGER NOT NULL REFERENCES menu(id),
      name     TEXT    NOT NULL,
      price    INTEGER NOT NULL,
      station  TEXT    NOT NULL,
      qty      INTEGER NOT NULL DEFAULT 1,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS bills (
      id             SERIAL PRIMARY KEY,
      order_id       INTEGER NOT NULL REFERENCES orders(id),
      order_ids      JSONB   DEFAULT '[]',
      table_id       INTEGER NOT NULL,
      table_name     TEXT    NOT NULL,
      subtotal       INTEGER NOT NULL,
      tax            INTEGER NOT NULL,
      total          INTEGER NOT NULL,
      note           TEXT    DEFAULT '',
      status         TEXT    NOT NULL DEFAULT 'unpaid',
      kasir_id       INTEGER NOT NULL,
      kasir_name     TEXT    NOT NULL,
      created_at     TEXT    NOT NULL,
      paid_at        TEXT,
      payment_method TEXT,
      payment_detail JSONB
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS menu_categories (
      id      SERIAL PRIMARY KEY,
      name    TEXT NOT NULL UNIQUE,
      station TEXT NOT NULL CHECK(station IN ('kitchen','bar'))
    );

    CREATE TABLE IF NOT EXISTS ingredients (
      id          SERIAL PRIMARY KEY,
      name        TEXT    NOT NULL UNIQUE,
      unit        TEXT    NOT NULL,
      stock       DECIMAL NOT NULL DEFAULT 0,
      min_stock   DECIMAL NOT NULL DEFAULT 0,
      cost_per_unit DECIMAL,
      active      INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS recipes (
      id          SERIAL PRIMARY KEY,
      menu_id     INTEGER NOT NULL REFERENCES menu(id) ON DELETE CASCADE,
      yield_count INTEGER NOT NULL DEFAULT 1,
      notes       TEXT,
      UNIQUE(menu_id)
    );

    CREATE TABLE IF NOT EXISTS recipe_ingredients (
      id            SERIAL PRIMARY KEY,
      recipe_id     INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      ingredient_id INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
      quantity      DECIMAL NOT NULL,
      unit          TEXT    NOT NULL,
      UNIQUE(recipe_id, ingredient_id)
    );
  `);

  // ── MIGRASI — tambah kolom yang mungkin belum ada di DB lama ──
  // ALTER TABLE ... ADD COLUMN IF NOT EXISTS aman dijalankan berulang kali
  await pool.query(`
    ALTER TABLE order_items   ADD COLUMN IF NOT EXISTS completed_at TEXT;
    ALTER TABLE bills         ADD COLUMN IF NOT EXISTS order_ids      JSONB DEFAULT '[]';
    ALTER TABLE bills         ADD COLUMN IF NOT EXISTS paid_at        TEXT;
    ALTER TABLE bills         ADD COLUMN IF NOT EXISTS payment_method TEXT;
    ALTER TABLE bills         ADD COLUMN IF NOT EXISTS payment_detail JSONB;
    ALTER TABLE menu          ADD COLUMN IF NOT EXISTS image          TEXT;
    ALTER TABLE ingredients   ADD COLUMN IF NOT EXISTS cost_per_unit  DECIMAL;
  `);
}

// ── SEED ──────────────────────────────────────────────────────
async function seed() {
  const { rows } = await pool.query('SELECT COUNT(*) AS c FROM users');
  if (parseInt(rows[0].c) > 0) return;

  console.log('🌱 Seeding database...');

  const users = [
    ['kasir1', '1234',  'Budi Santoso', 'kasir'],
    ['kasir2', '1234',  'Sari Dewi',    'kasir'],
    ['admin',  'admin', 'Admin Cafe',   'admin'],
  ];
  for (const [u, p, n, r] of users) {
    await pool.query(
      'INSERT INTO users (username, password, name, role) VALUES ($1,$2,$3,$4) ON CONFLICT (username) DO NOTHING',
      [u, p, n, r]
    );
  }

  // Seed kategori default
  const defaultCats = [
    ['Makanan', 'kitchen'],
    ['Minuman', 'bar'],
    ['Snack',   'kitchen'],
  ];
  for (const [name, station] of defaultCats) {
    await pool.query(
      'INSERT INTO menu_categories (name, station) VALUES ($1,$2) ON CONFLICT (name) DO NOTHING',
      [name, station]
    );
  }

  const menuItems = [
    ['Nasi Goreng Spesial', 35000, 'Makanan', 'kitchen', 20, 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?w=300&h=300&fit=crop'],
    ['Mie Goreng',          28000, 'Makanan', 'kitchen', 15, 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?w=300&h=300&fit=crop'],
    ['Ayam Bakar',          45000, 'Makanan', 'kitchen', 10, 'https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg?w=300&h=300&fit=crop'],
    ['Soto Ayam',           30000, 'Makanan', 'kitchen', 12, 'https://images.pexels.com/photos/699953/pexels-photo-699953.jpeg?w=300&h=300&fit=crop'],
    ['Gado-Gado',           25000, 'Makanan', 'kitchen',  8, 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?w=300&h=300&fit=crop'],
    ['Sandwich Club',       38000, 'Makanan', 'kitchen', 10, 'https://images.pexels.com/photos/1647163/pexels-photo-1647163.jpeg?w=300&h=300&fit=crop'],
    ['Pasta Carbonara',     52000, 'Makanan', 'kitchen',  6, 'https://images.pexels.com/photos/1527603/pexels-photo-1527603.jpeg?w=300&h=300&fit=crop'],
    ['Pisang Goreng',       18000, 'Makanan', 'kitchen', 25, 'https://images.pexels.com/photos/4051316/pexels-photo-4051316.jpeg?w=300&h=300&fit=crop'],
    ['Kopi Hitam',          15000, 'Minuman', 'bar',     50, 'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?w=300&h=300&fit=crop'],
    ['Cappuccino',          28000, 'Minuman', 'bar',     30, 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?w=300&h=300&fit=crop'],
    ['Latte',               30000, 'Minuman', 'bar',     30, 'https://images.pexels.com/photos/350478/pexels-photo-350478.jpeg?w=300&h=300&fit=crop'],
    ['Es Teh Manis',        10000, 'Minuman', 'bar',     40, 'https://images.pexels.com/photos/792613/pexels-photo-792613.jpeg?w=300&h=300&fit=crop'],
    ['Jus Alpukat',         22000, 'Minuman', 'bar',      5, 'https://images.pexels.com/photos/1346347/pexels-photo-1346347.jpeg?w=300&h=300&fit=crop'],
    ['Jus Jeruk',           18000, 'Minuman', 'bar',     15, 'https://images.pexels.com/photos/158053/fresh-orange-juice-squeezed-158053.jpeg?w=300&h=300&fit=crop'],
    ['Milkshake Coklat',    32000, 'Minuman', 'bar',     10, 'https://images.pexels.com/photos/3727250/pexels-photo-3727250.jpeg?w=300&h=300&fit=crop'],
    ['Air Mineral',          8000, 'Minuman', 'bar',     99, 'https://images.pexels.com/photos/1000084/pexels-photo-1000084.jpeg?w=300&h=300&fit=crop'],
    ['Kentang Goreng',      20000, 'Snack',   'kitchen', 20, 'https://images.pexels.com/photos/1583884/pexels-photo-1583884.jpeg?w=300&h=300&fit=crop'],
    ['Onion Ring',          22000, 'Snack',   'kitchen', 12, 'https://images.pexels.com/photos/2271107/pexels-photo-2271107.jpeg?w=300&h=300&fit=crop'],
    ['Chicken Wings',       35000, 'Snack',   'kitchen',  8, 'https://images.pexels.com/photos/60616/fried-chicken-chicken-fried-crunchy-60616.jpeg?w=300&h=300&fit=crop'],
    ['Nachos',              28000, 'Snack',   'kitchen', 10, 'https://images.pexels.com/photos/1108117/pexels-photo-1108117.jpeg?w=300&h=300&fit=crop'],
  ];
  for (const [name, price, cat, station, stock, image] of menuItems) {
    await pool.query(
      'INSERT INTO menu (name, price, category, station, stock, image) VALUES ($1,$2,$3,$4,$5,$6)',
      [name, price, cat, station, stock, image]
    );
  }

  for (let i = 1; i <= 12; i++) {
    await pool.query(
      "INSERT INTO tables_pos (name, status) VALUES ($1, 'available')",
      [`Meja ${i}`]
    );
  }

  console.log('✅ Seed selesai.');
}

// ── INIT — dipanggil setiap request (lazy init, idempotent karena CREATE IF NOT EXISTS) ──
// Catatan: _initialized hanya efektif di local dev (persistent process).
// Di Vercel serverless, setiap cold start akan menjalankan createSchema() lagi,
// tapi aman karena semua query pakai CREATE TABLE IF NOT EXISTS.
let _initialized = false;
async function initDB() {
  if (_initialized) return;
  await createSchema();
  await seed();
  _initialized = true;
  console.log('✅ Database ready');
}

module.exports = { pool, initDB };
