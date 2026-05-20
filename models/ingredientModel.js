const pool = require('../config/db');

const IngredientModel = {
  // Ambil semua bahan aktif
  findAll: async () => {
    const { rows } = await pool.query(`
      SELECT id, name, unit, stock, min_stock, cost_per_unit, active
      FROM ingredients 
      WHERE active = 1
      ORDER BY name
    `);
    return rows;
  },

  // Ambil semua bahan (termasuk nonaktif)
  findAllWithInactive: async () => {
    const { rows } = await pool.query(`
      SELECT id, name, unit, stock, min_stock, cost_per_unit, active
      FROM ingredients 
      ORDER BY active DESC, name
    `);
    return rows;
  },

  // Cari by ID
  findById: async (id) => {
    const { rows } = await pool.query(`
      SELECT id, name, unit, stock, min_stock, cost_per_unit, active
      FROM ingredients WHERE id = $1
    `, [id]);
    return rows[0] || null;
  },

  // Cari by name
  findByName: async (name) => {
    const { rows } = await pool.query(`
      SELECT id, name, unit, stock, min_stock, cost_per_unit, active
      FROM ingredients WHERE name = $1
    `, [name]);
    return rows[0] || null;
  },

  // Tambah bahan baru
  create: async (name, unit, min_stock = 0, cost_per_unit = null) => {
    const { rows } = await pool.query(`
      INSERT INTO ingredients (name, unit, min_stock, cost_per_unit)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, unit, stock, min_stock, cost_per_unit, active
    `, [name, unit, min_stock, cost_per_unit]);
    return rows[0];
  },

  // Update bahan
  update: async (id, fields) => {
    const cols = [], vals = [];
    let i = 1;
    if (fields.name !== undefined) { cols.push(`name=$${i++}`); vals.push(fields.name); }
    if (fields.unit !== undefined) { cols.push(`unit=$${i++}`); vals.push(fields.unit); }
    if (fields.stock !== undefined) { cols.push(`stock=$${i++}`); vals.push(fields.stock); }
    if (fields.min_stock !== undefined) { cols.push(`min_stock=$${i++}`); vals.push(fields.min_stock); }
    if (fields.cost_per_unit !== undefined) { cols.push(`cost_per_unit=$${i++}`); vals.push(fields.cost_per_unit); }
    if (fields.active !== undefined) { cols.push(`active=$${i++}`); vals.push(fields.active); }
    if (!cols.length) return null;
    vals.push(id);
    await pool.query(`UPDATE ingredients SET ${cols.join(',')} WHERE id=$${i}`, vals);
    return IngredientModel.findById(id);
  },

  // Update stock bahan (tambah/kurang)
  updateStock: async (id, delta) => {
    const { rows } = await pool.query(`
      UPDATE ingredients 
      SET stock = GREATEST(0, stock + $1)
      WHERE id = $2
      RETURNING id, name, unit, stock, min_stock
    `, [delta, id]);
    return rows[0] || null;
  },

  // Hapus bahan (soft delete)
  delete: async (id) => {
    const { rows } = await pool.query(`
      UPDATE ingredients SET active = 0 WHERE id = $1
      RETURNING id, name
    `, [id]);
    return rows[0] || null;
  },

  // Cek apakah bahan digunakan di resep manapun
  isUsedInRecipes: async (id) => {
    const { rows } = await pool.query(`
      SELECT COUNT(*) AS count
      FROM recipe_ingredients 
      WHERE ingredient_id = $1
    `, [id]);
    return parseInt(rows[0].count) > 0;
  },
};

module.exports = IngredientModel;