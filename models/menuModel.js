const pool = require('../config/db');

const MenuModel = {
  findAll: (category) => {
    if (category && category !== 'Semua') {
      return pool.query(
        'SELECT * FROM menu WHERE active=1 AND category=$1 ORDER BY id',
        [category]
      ).then(r => r.rows);
    }
    return pool.query('SELECT * FROM menu WHERE active=1 ORDER BY category, id')
      .then(r => r.rows);
  },

  // Ambil semua menu termasuk nonaktif (untuk backoffice/admin)
  findAllIncludingInactive: () =>
    pool.query('SELECT * FROM menu ORDER BY category, id')
      .then(r => r.rows),

  findCategories: () =>
    pool.query('SELECT DISTINCT category FROM menu WHERE active=1 ORDER BY category')
      .then(r => ['Semua', ...r.rows.map(r => r.category)]),

  findById: (id) =>
    pool.query('SELECT * FROM menu WHERE id=$1', [id])
      .then(r => r.rows[0] || null),

  create: (name, price, category, station, stock, image) =>
    pool.query(
      'INSERT INTO menu (name, price, category, station, stock, image) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [name, price, category, station, stock, image]
    ).then(r => r.rows[0]),

  // Hanya update field yang dikirim (partial update)
  update: async (id, fields) => {
    const cols = [], vals = [];
    let i = 1;
    if (fields.name     !== undefined) { cols.push(`name=$${i++}`);     vals.push(fields.name); }
    if (fields.price    !== undefined) { cols.push(`price=$${i++}`);    vals.push(fields.price); }
    if (fields.category !== undefined) { cols.push(`category=$${i++}`); vals.push(fields.category); }
    if (fields.station  !== undefined) { cols.push(`station=$${i++}`);  vals.push(fields.station); }
    if (fields.image    !== undefined) { cols.push(`image=$${i++}`);    vals.push(fields.image); }
    if (fields.active   !== undefined) { cols.push(`active=$${i++}`);   vals.push(fields.active); }
    if (!cols.length) return pool.query('SELECT * FROM menu WHERE id=$1', [id]).then(r => r.rows[0]);
    vals.push(id);
    return pool.query(
      `UPDATE menu SET ${cols.join(',')} WHERE id=$${i} RETURNING *`,
      vals
    ).then(r => r.rows[0]);
  },

  updateStock: (id, stock) =>
    pool.query('UPDATE menu SET stock=$1 WHERE id=$2 RETURNING *', [stock, id])
      .then(r => r.rows[0]),

  softDelete: (id) =>
    pool.query('UPDATE menu SET active=0 WHERE id=$1', [id]),
};

module.exports = MenuModel;
