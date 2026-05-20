const pool = require('../config/db');

const RecipeModel = {
  // Ambil resep untuk menu tertentu
  findByMenuId: async (menuId) => {
    const { rows } = await pool.query(`
      SELECT r.id, r.menu_id, r.yield_count, r.notes,
             m.name AS menu_name
      FROM recipes r
      JOIN menu m ON m.id = r.menu_id
      WHERE r.menu_id = $1
    `, [menuId]);
    return rows[0] || null;
  },

  // Ambil semua resep dengan ingredients
  findAllWithIngredients: async () => {
    // Ambil semua resep
    const { rows: recipes } = await pool.query(`
      SELECT r.id, r.menu_id, r.yield_count, r.notes,
             m.name AS menu_name, m.stock AS menu_stock
      FROM recipes r
      JOIN menu m ON m.id = r.menu_id
      ORDER BY m.name
    `);

    // Ambil ingredients untuk setiap resep
    for (const recipe of recipes) {
      const { rows: ingredients } = await pool.query(`
        SELECT ri.id, ri.quantity, ri.unit,
               i.id AS ingredient_id, i.name AS ingredient_name, 
               i.stock AS ingredient_stock, i.unit AS ingredient_unit
        FROM recipe_ingredients ri
        JOIN ingredients i ON i.id = ri.ingredient_id
        WHERE ri.recipe_id = $1
        ORDER BY i.name
      `, [recipe.id]);
      recipe.ingredients = ingredients;
      
      // Hitung estimated stock menu berdasarkan bahan tersedia
      if (ingredients.length > 0) {
        let minPortions = Infinity;
        for (const ing of ingredients) {
          // Berapa porsi bisa dibuat dari bahan ini
          const portions = Math.floor(ing.ingredient_stock / ing.quantity);
          if (portions < minPortions) minPortions = portions;
        }
        recipe.estimated_stock = minPortions * recipe.yield_count;
      } else {
        recipe.estimated_stock = 0;
      }
    }

    return recipes;
  },

  // Buat resep baru
  create: async (menuId, yieldCount = 1, notes = '') => {
    const { rows } = await pool.query(`
      INSERT INTO recipes (menu_id, yield_count, notes)
      VALUES ($1, $2, $3)
      RETURNING id, menu_id, yield_count, notes
    `, [menuId, yieldCount, notes]);
    return rows[0];
  },

  // Update resep
  update: async (id, fields) => {
    const cols = [], vals = [];
    let i = 1;
    if (fields.yield_count !== undefined) { cols.push(`yield_count=$${i++}`); vals.push(fields.yield_count); }
    if (fields.notes !== undefined) { cols.push(`notes=$${i++}`); vals.push(fields.notes); }
    if (!cols.length) return null;
    vals.push(id);
    await pool.query(`UPDATE recipes SET ${cols.join(',')} WHERE id=$${i}`, vals);
    const { rows } = await pool.query('SELECT * FROM recipes WHERE id = $1', [id]);
    return rows[0] || null;
  },

  // Hapus resep
  delete: async (id) => {
    const { rows } = await pool.query('DELETE FROM recipes WHERE id = $1 RETURNING id, menu_id', [id]);
    return rows[0] || null;
  },

  // Tambah ingredient ke resep
  addIngredient: async (recipeId, ingredientId, quantity, unit) => {
    const { rows } = await pool.query(`
      INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (recipe_id, ingredient_id) DO UPDATE 
      SET quantity = EXCLUDED.quantity, unit = EXCLUDED.unit
      RETURNING id, recipe_id, ingredient_id, quantity, unit
    `, [recipeId, ingredientId, quantity, unit]);
    return rows[0];
  },

  // Hapus ingredient dari resep
  removeIngredient: async (recipeId, ingredientId) => {
    const { rows } = await pool.query(`
      DELETE FROM recipe_ingredients 
      WHERE recipe_id = $1 AND ingredient_id = $2
      RETURNING id
    `, [recipeId, ingredientId]);
    return rows[0] || null;
  },

  // Ambil semua ingredients untuk resep
  getIngredients: async (recipeId) => {
    const { rows } = await pool.query(`
      SELECT ri.id, ri.quantity, ri.unit,
             i.id AS ingredient_id, i.name AS ingredient_name, 
             i.stock AS ingredient_stock, i.unit AS ingredient_unit
      FROM recipe_ingredients ri
      JOIN ingredients i ON i.id = ri.ingredient_id
      WHERE ri.recipe_id = $1
      ORDER BY i.name
    `, [recipeId]);
    return rows;
  },

  // Hitung stock menu berdasarkan bahan tersedia
  calculateMenuStock: async (menuId) => {
    const recipe = await RecipeModel.findByMenuId(menuId);
    if (!recipe) return 0;

    const ingredients = await RecipeModel.getIngredients(recipe.id);
    if (ingredients.length === 0) return 0;

    let minPortions = Infinity;
    for (const ing of ingredients) {
      const portions = Math.floor(ing.ingredient_stock / ing.quantity);
      if (portions < minPortions) minPortions = portions;
    }

    return minPortions * recipe.yield_count;
  },

  // Update stock menu berdasarkan bahan (sync)
  syncMenuStock: async (menuId) => {
    const calculatedStock = await RecipeModel.calculateMenuStock(menuId);
    await pool.query('UPDATE menu SET stock = $1 WHERE id = $2', [calculatedStock, menuId]);
    return calculatedStock;
  },

  // Sync semua menu yang menggunakan ingredient tertentu
  syncAllMenusUsingIngredient: async (ingredientId) => {
    const { rows } = await pool.query(`
      SELECT DISTINCT r.menu_id
      FROM recipe_ingredients ri
      JOIN recipes r ON r.id = ri.recipe_id
      WHERE ri.ingredient_id = $1
    `, [ingredientId]);
    for (const row of rows) {
      await RecipeModel.syncMenuStock(row.menu_id);
    }
  },

  // Kurangi stock bahan ketika menu terjual
  consumeIngredients: async (menuId, quantity = 1) => {
    const recipe = await RecipeModel.findByMenuId(menuId);
    if (!recipe) return false;

    const ingredients = await RecipeModel.getIngredients(recipe.id);
    if (ingredients.length === 0) return false;

    // Cek apakah bahan cukup
    for (const ing of ingredients) {
      const needed = ing.quantity * quantity;
      if (ing.ingredient_stock < needed) {
        throw new Error(`Bahan "${ing.ingredient_name}" tidak cukup. Dibutuhkan: ${needed} ${ing.unit}, Tersedia: ${ing.ingredient_stock} ${ing.unit}`);
      }
    }

    // Kurangi stock bahan
    for (const ing of ingredients) {
      const needed = ing.quantity * quantity;
      await pool.query(
        'UPDATE ingredients SET stock = stock - $1 WHERE id = $2',
        [needed, ing.ingredient_id]
      );
    }

    // Update stock menu
    await RecipeModel.syncMenuStock(menuId);
    return true;
  },
};

module.exports = RecipeModel;