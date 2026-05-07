const pool = require('../config/db');

const CategoryModel = {
  findAll: () =>
    pool.query('SELECT * FROM menu_categories ORDER BY name')
      .then(r => r.rows),

  findById: (id) =>
    pool.query('SELECT * FROM menu_categories WHERE id=$1', [id])
      .then(r => r.rows[0] || null),

  findByName: (name) =>
    pool.query('SELECT * FROM menu_categories WHERE name=$1', [name])
      .then(r => r.rows[0] || null),

  create: (name, station) =>
    pool.query(
      'INSERT INTO menu_categories (name, station) VALUES ($1,$2) RETURNING *',
      [name, station]
    ).then(r => r.rows[0]),

  update: (id, name, station) =>
    pool.query(
      'UPDATE menu_categories SET name=$1, station=$2 WHERE id=$3 RETURNING *',
      [name, station, id]
    ).then(r => r.rows[0] || null),

  delete: async (id) => {
    // Cek apakah kategori masih dipakai menu
    const { rows } = await pool.query(
      'SELECT COUNT(*) AS c FROM menu WHERE category=(SELECT name FROM menu_categories WHERE id=$1) AND active=1',
      [id]
    );
    if (parseInt(rows[0].c) > 0) {
      throw new Error('Kategori masih digunakan oleh menu aktif, tidak bisa dihapus.');
    }
    await pool.query('DELETE FROM menu_categories WHERE id=$1', [id]);
  },
};

module.exports = CategoryModel;
