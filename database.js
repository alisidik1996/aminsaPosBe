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
  if (parseInt(rows[0].c) > 0) {
    // Database sudah ada data — tetap jalankan seed bahan baku & resep
    // karena mungkin belum ada (database lama)
    await seedIngredientsAndRecipes();
    return;
  }

  console.log('🌱 Seeding database...');

  // ── Users ─────────────────────────────────────────────────
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

  // ── Kategori ──────────────────────────────────────────────
  const categories = [
    ['Makanan Berat',    'kitchen'],
    ['Snack & Gorengan', 'kitchen'],
    ['Kopi',             'bar'],
    ['Minuman Segar',    'bar'],
    ['Minuman Lainnya',  'bar'],
  ];
  for (const [name, station] of categories) {
    await pool.query(
      'INSERT INTO menu_categories (name, station) VALUES ($1,$2) ON CONFLICT (name) DO NOTHING',
      [name, station]
    );
  }

  // ── Menu Items ────────────────────────────────────────────
  const menuItems = [
    ['Nasi Goreng Spesial', 35000, 'Makanan Berat',    'kitchen', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?w=300&h=300&fit=crop'],
    ['Mie Goreng',          28000, 'Makanan Berat',    'kitchen', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?w=300&h=300&fit=crop'],
    ['Ayam Bakar',          45000, 'Makanan Berat',    'kitchen', 'https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg?w=300&h=300&fit=crop'],
    ['Soto Ayam',           30000, 'Makanan Berat',    'kitchen', 'https://images.pexels.com/photos/699953/pexels-photo-699953.jpeg?w=300&h=300&fit=crop'],
    ['Pasta Carbonara',     52000, 'Makanan Berat',    'kitchen', 'https://images.pexels.com/photos/1527603/pexels-photo-1527603.jpeg?w=300&h=300&fit=crop'],
    ['Kentang Goreng',      20000, 'Snack & Gorengan', 'kitchen', 'https://images.pexels.com/photos/1583884/pexels-photo-1583884.jpeg?w=300&h=300&fit=crop'],
    ['Pisang Goreng',       18000, 'Snack & Gorengan', 'kitchen', 'https://images.pexels.com/photos/4051316/pexels-photo-4051316.jpeg?w=300&h=300&fit=crop'],
    ['Chicken Wings',       35000, 'Snack & Gorengan', 'kitchen', 'https://images.pexels.com/photos/60616/fried-chicken-chicken-fried-crunchy-60616.jpeg?w=300&h=300&fit=crop'],
    ['Kopi Hitam',          15000, 'Kopi',             'bar',     'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?w=300&h=300&fit=crop'],
    ['Cappuccino',          28000, 'Kopi',             'bar',     'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?w=300&h=300&fit=crop'],
    ['Latte',               30000, 'Kopi',             'bar',     'https://images.pexels.com/photos/350478/pexels-photo-350478.jpeg?w=300&h=300&fit=crop'],
    ['Es Teh Manis',        10000, 'Minuman Segar',    'bar',     'https://images.pexels.com/photos/792613/pexels-photo-792613.jpeg?w=300&h=300&fit=crop'],
    ['Jus Alpukat',         22000, 'Minuman Segar',    'bar',     'https://images.pexels.com/photos/1346347/pexels-photo-1346347.jpeg?w=300&h=300&fit=crop'],
    ['Jus Jeruk',           18000, 'Minuman Segar',    'bar',     'https://images.pexels.com/photos/158053/fresh-orange-juice-squeezed-158053.jpeg?w=300&h=300&fit=crop'],
    ['Milkshake Coklat',    32000, 'Minuman Segar',    'bar',     'https://images.pexels.com/photos/3727250/pexels-photo-3727250.jpeg?w=300&h=300&fit=crop'],
    ['Air Mineral',          8000, 'Minuman Lainnya',  'bar',     'https://images.pexels.com/photos/1000084/pexels-photo-1000084.jpeg?w=300&h=300&fit=crop'],
  ];
  for (const [name, price, cat, station, image] of menuItems) {
    await pool.query(
      'INSERT INTO menu (name, price, category, station, stock, image) VALUES ($1,$2,$3,$4,0,$5)',
      [name, price, cat, station, image]
    );
  }

  // ── Meja ──────────────────────────────────────────────────
  for (let i = 1; i <= 12; i++) {
    await pool.query(
      "INSERT INTO tables_pos (name, status) VALUES ($1, 'available')",
      [`Meja ${i}`]
    );
  }

  await seedIngredientsAndRecipes();
  console.log('✅ Seed selesai.');
}

// ── SEED BAHAN BAKU & RESEP (idempotent, aman dijalankan ulang) ──
async function seedIngredientsAndRecipes() {
  // Cek apakah bahan baku sudah ada
  const { rows: ingCheck } = await pool.query('SELECT COUNT(*) AS c FROM ingredients');
  if (parseInt(ingCheck[0].c) > 0) return;  // sudah ada, skip

  console.log('🌱 Seeding bahan baku & resep...');

  // ── Bahan Baku ────────────────────────────────────────────
  const ingredientData = [
    ['Nasi Putih',           'gram',   5000, 500,  0.05],
    ['Mie Kuning',           'gram',   3000, 300,  0.08],
    ['Telur Ayam',           'butir',    60,   6,  2000],
    ['Daging Ayam',          'gram',   4000, 400,  0.08],
    ['Bawang Merah',         'gram',   1000, 100,  0.03],
    ['Bawang Putih',         'gram',    800, 100,  0.04],
    ['Kecap Manis',          'ml',     1500, 200,  0.02],
    ['Minyak Goreng',        'ml',     5000, 500,  0.01],
    ['Garam',                'gram',    500,  50,  0.01],
    ['Kentang',              'gram',   3000, 300,  0.04],
    ['Pisang',               'buah',     80,  10,  1500],
    ['Tepung Terigu',        'gram',   2000, 200,  0.02],
    ['Daging Sapi',          'gram',   2000, 200,  0.12],
    ['Pasta Spaghetti',      'gram',   2000, 200,  0.06],
    ['Keju Parmesan',        'gram',    500,  50,  0.25],
    ['Krim Masak',           'ml',     1000, 100,  0.05],
    ['Bumbu Soto',           'gram',    500,  50,  0.10],
    ['Santan',               'ml',     2000, 200,  0.03],
    ['Biji Kopi',            'gram',   2000, 200,  0.15],
    ['Susu Segar',           'ml',     5000, 500,  0.02],
    ['Gula Pasir',           'gram',   2000, 200,  0.01],
    ['Teh Celup',            'sachet',  100,  10,   500],
    ['Alpukat',              'buah',     40,   5,  5000],
    ['Jeruk',                'buah',     60,  10,  2000],
    ['Coklat Bubuk',         'gram',    500,  50,  0.20],
    ['Es Batu',              'gram',  10000, 500,  0.001],
    ['Air Mineral Galon',    'ml',    19000,2000,  0.001],
    ['Sirup Gula',           'ml',     1000, 100,  0.03],
  ];

  const ingIds = {};
  for (const [name, unit, stock, min_stock, cost] of ingredientData) {
    const { rows: r } = await pool.query(
      `INSERT INTO ingredients (name, unit, stock, min_stock, cost_per_unit)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (name) DO UPDATE SET stock=EXCLUDED.stock
       RETURNING id`,
      [name, unit, stock, min_stock, cost]
    );
    ingIds[name] = r[0].id;
  }

  // ── Resep ─────────────────────────────────────────────────
  // Ambil semua menu yang ada di DB (nama → id)
  const { rows: menuRows } = await pool.query('SELECT id, name FROM menu');
  const menuIds = {};
  menuRows.forEach(m => { menuIds[m.name] = m.id; });

  async function createRecipe(menuName, yieldCount, notes, ingredients) {
    const menuId = menuIds[menuName];
    if (!menuId) { console.warn(`⚠ Menu "${menuName}" tidak ditemukan, skip resep.`); return; }
    // Skip jika resep sudah ada
    const { rows: existing } = await pool.query('SELECT id FROM recipes WHERE menu_id=$1', [menuId]);
    if (existing.length) return;

    const { rows: r } = await pool.query(
      'INSERT INTO recipes (menu_id, yield_count, notes) VALUES ($1,$2,$3) RETURNING id',
      [menuId, yieldCount, notes]
    );
    const recipeId = r[0].id;
    for (const [ingName, qty, unit] of ingredients) {
      const ingId = ingIds[ingName];
      if (!ingId) { console.warn(`⚠ Bahan "${ingName}" tidak ditemukan, skip.`); continue; }
      await pool.query(
        `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
         VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
        [recipeId, ingId, qty, unit]
      );
    }
  }

  await createRecipe('Nasi Goreng Spesial', 1, 'Gunakan nasi dingin sehari sebelumnya', [
    ['Nasi Putih',    200, 'gram'], ['Telur Ayam',    1, 'butir'],
    ['Daging Ayam',    50, 'gram'], ['Bawang Merah', 15, 'gram'],
    ['Bawang Putih',   10, 'gram'], ['Kecap Manis',  20, 'ml'],
    ['Minyak Goreng',  30, 'ml'],   ['Garam',         3, 'gram'],
  ]);
  await createRecipe('Mie Goreng', 1, '', [
    ['Mie Kuning',    150, 'gram'], ['Telur Ayam',    1, 'butir'],
    ['Bawang Merah',   10, 'gram'], ['Bawang Putih',  8, 'gram'],
    ['Kecap Manis',    15, 'ml'],   ['Minyak Goreng',25, 'ml'],
    ['Garam',           2, 'gram'],
  ]);
  await createRecipe('Ayam Bakar', 1, 'Marinasi minimal 2 jam', [
    ['Daging Ayam',   200, 'gram'], ['Bawang Putih', 15, 'gram'],
    ['Kecap Manis',    30, 'ml'],   ['Minyak Goreng',20, 'ml'],
    ['Garam',           5, 'gram'],
  ]);
  await createRecipe('Soto Ayam', 1, '', [
    ['Daging Ayam',   150, 'gram'], ['Bumbu Soto',   20, 'gram'],
    ['Santan',        100, 'ml'],   ['Bawang Merah', 10, 'gram'],
    ['Bawang Putih',    8, 'gram'], ['Garam',         3, 'gram'],
  ]);
  await createRecipe('Pasta Carbonara', 1, 'Jangan overcook pasta', [
    ['Pasta Spaghetti',150, 'gram'], ['Daging Sapi',  80, 'gram'],
    ['Telur Ayam',       1, 'butir'],['Keju Parmesan',30, 'gram'],
    ['Krim Masak',     100, 'ml'],   ['Bawang Putih', 10, 'gram'],
    ['Garam',            3, 'gram'],
  ]);
  await createRecipe('Kentang Goreng', 1, '', [
    ['Kentang',       200, 'gram'], ['Minyak Goreng',200, 'ml'],
    ['Garam',           3, 'gram'],
  ]);
  await createRecipe('Pisang Goreng', 3, '3 buah per porsi', [
    ['Pisang',          3, 'buah'], ['Tepung Terigu', 50, 'gram'],
    ['Minyak Goreng', 150, 'ml'],   ['Gula Pasir',   10, 'gram'],
  ]);
  await createRecipe('Chicken Wings', 4, '4 potong per porsi', [
    ['Daging Ayam',   300, 'gram'], ['Tepung Terigu', 80, 'gram'],
    ['Bawang Putih',   10, 'gram'], ['Minyak Goreng',300, 'ml'],
    ['Garam',           5, 'gram'],
  ]);
  await createRecipe('Kopi Hitam', 1, '', [
    ['Biji Kopi',      15, 'gram'], ['Air Mineral Galon',200, 'ml'],
    ['Gula Pasir',     10, 'gram'],
  ]);
  await createRecipe('Cappuccino', 1, 'Rasio espresso:susu = 1:2', [
    ['Biji Kopi',      18, 'gram'], ['Susu Segar',   150, 'ml'],
    ['Air Mineral Galon',50,'ml'],
  ]);
  await createRecipe('Latte', 1, '', [
    ['Biji Kopi',      18, 'gram'], ['Susu Segar',   200, 'ml'],
    ['Sirup Gula',     15, 'ml'],
  ]);
  await createRecipe('Es Teh Manis', 1, '', [
    ['Teh Celup',       1, 'sachet'],['Gula Pasir',   20, 'gram'],
    ['Es Batu',       100, 'gram'],  ['Air Mineral Galon',200,'ml'],
  ]);
  await createRecipe('Jus Alpukat', 1, '', [
    ['Alpukat',         1, 'buah'], ['Susu Segar',   100, 'ml'],
    ['Gula Pasir',     15, 'gram'], ['Es Batu',       80, 'gram'],
  ]);
  await createRecipe('Jus Jeruk', 1, '', [
    ['Jeruk',           3, 'buah'], ['Gula Pasir',   10, 'gram'],
    ['Es Batu',        80, 'gram'], ['Air Mineral Galon',50,'ml'],
  ]);
  await createRecipe('Milkshake Coklat', 1, '', [
    ['Susu Segar',    250, 'ml'],   ['Coklat Bubuk', 25, 'gram'],
    ['Gula Pasir',     20, 'gram'], ['Es Batu',      100,'gram'],
  ]);

  // Air Mineral tidak punya resep — set stok manual
  await pool.query(
    "UPDATE menu SET stock=99 WHERE name='Air Mineral' AND stock=0"
  );

  // ── Sync stok menu dari bahan baku ────────────────────────
  const { rows: allRecipes } = await pool.query(
    'SELECT id, menu_id, yield_count FROM recipes'
  );
  for (const recipe of allRecipes) {
    const { rows: ings } = await pool.query(`
      SELECT ri.quantity, i.stock
      FROM recipe_ingredients ri
      JOIN ingredients i ON i.id = ri.ingredient_id
      WHERE ri.recipe_id = $1
    `, [recipe.id]);
    if (!ings.length) continue;
    let minPortions = Infinity;
    for (const ing of ings) {
      const p = Math.floor(parseFloat(ing.stock) / parseFloat(ing.quantity));
      if (p < minPortions) minPortions = p;
    }
    const stock = minPortions === Infinity ? 0 : minPortions * recipe.yield_count;
    await pool.query('UPDATE menu SET stock=$1 WHERE id=$2', [stock, recipe.menu_id]);
  }

  console.log('✅ Bahan baku & resep selesai di-seed, stok menu tersinkronisasi.');
}
  for (const [name, station] of categories) {
    await pool.query(
      'INSERT INTO menu_categories (name, station) VALUES ($1,$2) ON CONFLICT (name) DO NOTHING',
      [name, station]
    );
  }

  // ── Menu Items (stok awal 0 — akan dihitung dari resep) ───
  // Format: [nama, harga, kategori, station, image]
  const menuItems = [
    // Makanan Berat
    ['Nasi Goreng Spesial', 35000, 'Makanan Berat',    'kitchen', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?w=300&h=300&fit=crop'],
    ['Mie Goreng',          28000, 'Makanan Berat',    'kitchen', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?w=300&h=300&fit=crop'],
    ['Ayam Bakar',          45000, 'Makanan Berat',    'kitchen', 'https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg?w=300&h=300&fit=crop'],
    ['Soto Ayam',           30000, 'Makanan Berat',    'kitchen', 'https://images.pexels.com/photos/699953/pexels-photo-699953.jpeg?w=300&h=300&fit=crop'],
    ['Pasta Carbonara',     52000, 'Makanan Berat',    'kitchen', 'https://images.pexels.com/photos/1527603/pexels-photo-1527603.jpeg?w=300&h=300&fit=crop'],
    // Snack
    ['Kentang Goreng',      20000, 'Snack & Gorengan', 'kitchen', 'https://images.pexels.com/photos/1583884/pexels-photo-1583884.jpeg?w=300&h=300&fit=crop'],
    ['Pisang Goreng',       18000, 'Snack & Gorengan', 'kitchen', 'https://images.pexels.com/photos/4051316/pexels-photo-4051316.jpeg?w=300&h=300&fit=crop'],
    ['Chicken Wings',       35000, 'Snack & Gorengan', 'kitchen', 'https://images.pexels.com/photos/60616/fried-chicken-chicken-fried-crunchy-60616.jpeg?w=300&h=300&fit=crop'],
    // Kopi
    ['Kopi Hitam',          15000, 'Kopi',             'bar',     'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?w=300&h=300&fit=crop'],
    ['Cappuccino',          28000, 'Kopi',             'bar',     'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?w=300&h=300&fit=crop'],
    ['Latte',               30000, 'Kopi',             'bar',     'https://images.pexels.com/photos/350478/pexels-photo-350478.jpeg?w=300&h=300&fit=crop'],
    // Minuman Segar
    ['Es Teh Manis',        10000, 'Minuman Segar',    'bar',     'https://images.pexels.com/photos/792613/pexels-photo-792613.jpeg?w=300&h=300&fit=crop'],
    ['Jus Alpukat',         22000, 'Minuman Segar',    'bar',     'https://images.pexels.com/photos/1346347/pexels-photo-1346347.jpeg?w=300&h=300&fit=crop'],
    ['Jus Jeruk',           18000, 'Minuman Segar',    'bar',     'https://images.pexels.com/photos/158053/fresh-orange-juice-squeezed-158053.jpeg?w=300&h=300&fit=crop'],
    ['Milkshake Coklat',    32000, 'Minuman Segar',    'bar',     'https://images.pexels.com/photos/3727250/pexels-photo-3727250.jpeg?w=300&h=300&fit=crop'],
    // Minuman Lainnya
    ['Air Mineral',          8000, 'Minuman Lainnya',  'bar',     'https://images.pexels.com/photos/1000084/pexels-photo-1000084.jpeg?w=300&h=300&fit=crop'],
  ];

  const menuIds = {};
  for (const [name, price, cat, station, image] of menuItems) {
    const { rows: r } = await pool.query(
      'INSERT INTO menu (name, price, category, station, stock, image) VALUES ($1,$2,$3,$4,0,$5) RETURNING id',
      [name, price, cat, station, image]
    );
    menuIds[name] = r[0].id;
  }

  // ── Meja ──────────────────────────────────────────────────
  for (let i = 1; i <= 12; i++) {
    await pool.query(
      "INSERT INTO tables_pos (name, status) VALUES ($1, 'available')",
      [`Meja ${i}`]
    );
  }

  // ── Bahan Baku ────────────────────────────────────────────
  // Format: [nama, satuan, stok_awal, min_stok, harga_per_satuan]
  const ingredientData = [
    // Bahan dapur
    ['Nasi Putih',        'gram',  5000, 500,  0.05],
    ['Mie Kuning',        'gram',  3000, 300,  0.08],
    ['Telur Ayam',        'butir',   60,   6,  2000],
    ['Daging Ayam',       'gram',  4000, 400,  0.08],
    ['Bawang Merah',      'gram',  1000, 100,  0.03],
    ['Bawang Putih',      'gram',   800, 100,  0.04],
    ['Kecap Manis',       'ml',    1500, 200,  0.02],
    ['Minyak Goreng',     'ml',    5000, 500,  0.01],
    ['Garam',             'gram',   500,  50,  0.01],
    ['Kentang',           'gram',  3000, 300,  0.04],
    ['Pisang',            'buah',    80,  10,  1500],
    ['Tepung Terigu',     'gram',  2000, 200,  0.02],
    ['Daging Sapi',       'gram',  2000, 200,  0.12],
    ['Pasta Spaghetti',   'gram',  2000, 200,  0.06],
    ['Keju Parmesan',     'gram',   500,  50,  0.25],
    ['Krim Masak',        'ml',    1000, 100,  0.05],
    ['Bumbu Soto',        'gram',   500,  50,  0.10],
    ['Santan',            'ml',    2000, 200,  0.03],
    // Bahan bar
    ['Biji Kopi',         'gram',  2000, 200,  0.15],
    ['Susu Segar',        'ml',    5000, 500,  0.02],
    ['Gula Pasir',        'gram',  2000, 200,  0.01],
    ['Teh Celup',         'sachet',  100,  10,   500],
    ['Alpukat',           'buah',    40,   5,  5000],
    ['Jeruk',             'buah',    60,  10,  2000],
    ['Coklat Bubuk',      'gram',   500,  50,  0.20],
    ['Es Batu',           'gram', 10000, 500,  0.001],
    ['Air Mineral Galon', 'ml',   19000,2000,  0.001],
    ['Sirup Gula',        'ml',    1000, 100,  0.03],
  ];

  const ingIds = {};
  for (const [name, unit, stock, min_stock, cost] of ingredientData) {
    const { rows: r } = await pool.query(
      'INSERT INTO ingredients (name, unit, stock, min_stock, cost_per_unit) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [name, unit, stock, min_stock, cost]
    );
    ingIds[name] = r[0].id;
  }

  // ── Resep ─────────────────────────────────────────────────
  // Helper: buat resep + bahan sekaligus
  async function createRecipe(menuName, yieldCount, notes, ingredients) {
    const menuId = menuIds[menuName];
    if (!menuId) return;
    const { rows: r } = await pool.query(
      'INSERT INTO recipes (menu_id, yield_count, notes) VALUES ($1,$2,$3) RETURNING id',
      [menuId, yieldCount, notes]
    );
    const recipeId = r[0].id;
    for (const [ingName, qty, unit] of ingredients) {
      const ingId = ingIds[ingName];
      if (!ingId) continue;
      await pool.query(
        'INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES ($1,$2,$3,$4)',
        [recipeId, ingId, qty, unit]
      );
    }
    return recipeId;
  }

  // Nasi Goreng Spesial (1 porsi)
  await createRecipe('Nasi Goreng Spesial', 1, 'Gunakan nasi dingin sehari sebelumnya', [
    ['Nasi Putih',   200, 'gram'],
    ['Telur Ayam',     1, 'butir'],
    ['Daging Ayam',   50, 'gram'],
    ['Bawang Merah',  15, 'gram'],
    ['Bawang Putih',  10, 'gram'],
    ['Kecap Manis',   20, 'ml'],
    ['Minyak Goreng', 30, 'ml'],
    ['Garam',          3, 'gram'],
  ]);

  // Mie Goreng (1 porsi)
  await createRecipe('Mie Goreng', 1, '', [
    ['Mie Kuning',   150, 'gram'],
    ['Telur Ayam',     1, 'butir'],
    ['Bawang Merah',  10, 'gram'],
    ['Bawang Putih',   8, 'gram'],
    ['Kecap Manis',   15, 'ml'],
    ['Minyak Goreng', 25, 'ml'],
    ['Garam',          2, 'gram'],
  ]);

  // Ayam Bakar (1 porsi)
  await createRecipe('Ayam Bakar', 1, 'Marinasi minimal 2 jam', [
    ['Daging Ayam',  200, 'gram'],
    ['Bawang Putih',  15, 'gram'],
    ['Kecap Manis',   30, 'ml'],
    ['Minyak Goreng', 20, 'ml'],
    ['Garam',          5, 'gram'],
  ]);

  // Soto Ayam (1 porsi)
  await createRecipe('Soto Ayam', 1, '', [
    ['Daging Ayam',  150, 'gram'],
    ['Bumbu Soto',    20, 'gram'],
    ['Santan',       100, 'ml'],
    ['Bawang Merah',  10, 'gram'],
    ['Bawang Putih',   8, 'gram'],
    ['Garam',          3, 'gram'],
  ]);

  // Pasta Carbonara (1 porsi)
  await createRecipe('Pasta Carbonara', 1, 'Jangan overcook pasta', [
    ['Pasta Spaghetti', 150, 'gram'],
    ['Daging Sapi',      80, 'gram'],
    ['Telur Ayam',        1, 'butir'],
    ['Keju Parmesan',    30, 'gram'],
    ['Krim Masak',      100, 'ml'],
    ['Bawang Putih',     10, 'gram'],
    ['Garam',             3, 'gram'],
  ]);

  // Kentang Goreng (1 porsi)
  await createRecipe('Kentang Goreng', 1, '', [
    ['Kentang',       200, 'gram'],
    ['Minyak Goreng', 200, 'ml'],
    ['Garam',           3, 'gram'],
  ]);

  // Pisang Goreng (1 porsi = 3 buah)
  await createRecipe('Pisang Goreng', 3, '3 buah per porsi', [
    ['Pisang',          3, 'buah'],
    ['Tepung Terigu',  50, 'gram'],
    ['Minyak Goreng', 150, 'ml'],
    ['Gula Pasir',     10, 'gram'],
  ]);

  // Chicken Wings (1 porsi = 4 potong)
  await createRecipe('Chicken Wings', 4, '4 potong per porsi', [
    ['Daging Ayam',  300, 'gram'],
    ['Tepung Terigu', 80, 'gram'],
    ['Bawang Putih',  10, 'gram'],
    ['Minyak Goreng',300, 'ml'],
    ['Garam',          5, 'gram'],
  ]);

  // Kopi Hitam (1 gelas)
  await createRecipe('Kopi Hitam', 1, '', [
    ['Biji Kopi',      15, 'gram'],
    ['Air Mineral Galon', 200, 'ml'],
    ['Gula Pasir',     10, 'gram'],
  ]);

  // Cappuccino (1 gelas)
  await createRecipe('Cappuccino', 1, 'Rasio espresso:susu = 1:2', [
    ['Biji Kopi',      18, 'gram'],
    ['Susu Segar',    150, 'ml'],
    ['Air Mineral Galon', 50, 'ml'],
  ]);

  // Latte (1 gelas)
  await createRecipe('Latte', 1, '', [
    ['Biji Kopi',      18, 'gram'],
    ['Susu Segar',    200, 'ml'],
    ['Sirup Gula',     15, 'ml'],
  ]);

  // Es Teh Manis (1 gelas)
  await createRecipe('Es Teh Manis', 1, '', [
    ['Teh Celup',       1, 'sachet'],
    ['Gula Pasir',     20, 'gram'],
    ['Es Batu',       100, 'gram'],
    ['Air Mineral Galon', 200, 'ml'],
  ]);

  // Jus Alpukat (1 gelas)
  await createRecipe('Jus Alpukat', 1, '', [
    ['Alpukat',         1, 'buah'],
    ['Susu Segar',    100, 'ml'],
    ['Gula Pasir',     15, 'gram'],
    ['Es Batu',        80, 'gram'],
  ]);

  // Jus Jeruk (1 gelas)
  await createRecipe('Jus Jeruk', 1, '', [
    ['Jeruk',           3, 'buah'],
    ['Gula Pasir',     10, 'gram'],
    ['Es Batu',        80, 'gram'],
    ['Air Mineral Galon', 50, 'ml'],
  ]);

  // Milkshake Coklat (1 gelas)
  await createRecipe('Milkshake Coklat', 1, '', [
    ['Susu Segar',    250, 'ml'],
    ['Coklat Bubuk',   25, 'gram'],
    ['Gula Pasir',     20, 'gram'],
    ['Es Batu',       100, 'gram'],
  ]);

  // Air Mineral tidak punya resep (langsung jual)
  // Stok manual
  await pool.query('UPDATE menu SET stock=99 WHERE name=$1', ['Air Mineral']);

  // ── Sync stok menu dari bahan baku ────────────────────────
  // Hitung stok setiap menu berdasarkan bahan yang tersedia
  const { rows: allRecipes } = await pool.query('SELECT id, menu_id, yield_count FROM recipes');
  for (const recipe of allRecipes) {
    const { rows: ings } = await pool.query(`
      SELECT ri.quantity, i.stock
      FROM recipe_ingredients ri
      JOIN ingredients i ON i.id = ri.ingredient_id
      WHERE ri.recipe_id = $1
    `, [recipe.id]);

    if (!ings.length) continue;
    let minPortions = Infinity;
    for (const ing of ings) {
      const portions = Math.floor(parseFloat(ing.stock) / parseFloat(ing.quantity));
      if (portions < minPortions) minPortions = portions;
    }
    const calculatedStock = minPortions === Infinity ? 0 : minPortions * recipe.yield_count;
    await pool.query('UPDATE menu SET stock=$1 WHERE id=$2', [calculatedStock, recipe.menu_id]);
  }

  console.log('✅ Seed selesai — item, kategori, bahan baku, resep, dan stok tersinkronisasi.');
}

// ── INIT — dipanggil setiap request (lazy init, idempotent karena CREATE IF NOT EXISTS) ──
let _initialized = false;
async function initDB() {
  if (_initialized) return;
  await createSchema();
  await seed();
  await cleanupStaleOrders();
  _initialized = true;
  console.log('✅ Database ready');
}

// ── CLEANUP — tutup order 'sent' yang billnya sudah paid/voided/tidak ada ──
async function cleanupStaleOrders() {
  await pool.query(`
    UPDATE orders SET status = 'closed'
    WHERE status = 'sent'
      AND NOT EXISTS (
        SELECT 1 FROM bills b
        WHERE b.status = 'unpaid'
          AND (b.order_id = orders.id OR b.order_ids @> to_jsonb(orders.id))
      )
  `);
}

module.exports = { pool, initDB, seedIngredientsAndRecipes };
