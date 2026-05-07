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

  update: (id, { name, price, category, station, image, active }) =>
    pool.query(
      'UPDATE menu SET name=$1, price=$2, category=$3, station=$4, image=$5, active=$6 WHERE id=$7 RETURNING *',
      [name, price, category, station, image, active ?? 1, id]
    ).then(r => r.rows[0]),

  updateStock: (id, stock) =>
    pool.query('UPDATE menu SET stock=$1 WHERE id=$2 RETURNING *', [stock, id])
      .then(r => r.rows[0]),

  softDelete: (id) =>
    pool.query('UPDATE menu SET active=0 WHERE id=$1', [id]),
};

module.exports = MenuModel;
