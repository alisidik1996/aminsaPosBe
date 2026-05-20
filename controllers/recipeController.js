const RecipeModel  = require('../models/recipeModel');
const IngredientModel = require('../models/ingredientModel');

const RecipeController = {
  // GET /api/recipes — semua resep + ingredients
  getAll: async (req, res) => {
    try {
      res.json(await RecipeModel.findAllWithIngredients());
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  // GET /api/recipes/menu/:menuId — resep untuk menu tertentu
  getByMenu: async (req, res) => {
    try {
      const recipe = await RecipeModel.findByMenuId(req.params.menuId);
      if (!recipe) return res.status(404).json({ error: 'Resep tidak ditemukan.' });
      recipe.ingredients = await RecipeModel.getIngredients(recipe.id);
      res.json(recipe);
    } catch (e) {
      res.status(500).json({ error: 'Server error.' });
    }
  },

  // POST /api/recipes — buat resep baru
  create: async (req, res) => {
    try {
      const { menuId, yieldCount = 1, notes = '', ingredients = [] } = req.body;
      if (!menuId) return res.status(400).json({ error: 'menuId wajib diisi.' });

      // Cek apakah resep sudah ada
      const existing = await RecipeModel.findByMenuId(menuId);
      if (existing) return res.status(400).json({ error: 'Resep untuk menu ini sudah ada. Gunakan PUT untuk update.' });

      const recipe = await RecipeModel.create(menuId, yieldCount, notes);

      // Tambah ingredients
      for (const ing of ingredients) {
        if (!ing.ingredientId || !ing.quantity || !ing.unit) continue;
        await RecipeModel.addIngredient(recipe.id, ing.ingredientId, parseFloat(ing.quantity), ing.unit);
      }

      // Sync stock menu
      await RecipeModel.syncMenuStock(menuId);

      // Return resep lengkap
      recipe.ingredients = await RecipeModel.getIngredients(recipe.id);
      recipe.estimated_stock = await RecipeModel.calculateMenuStock(menuId);
      res.status(201).json(recipe);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  // PUT /api/recipes/:id — update resep + replace semua ingredients
  update: async (req, res) => {
    try {
      const { yieldCount, notes, ingredients = [] } = req.body;
      const id = req.params.id;

      // Update header resep
      const recipe = await RecipeModel.update(id, {
        yield_count: yieldCount !== undefined ? parseInt(yieldCount) : undefined,
        notes: notes !== undefined ? notes : undefined,
      });
      if (!recipe) return res.status(404).json({ error: 'Resep tidak ditemukan.' });

      // Hapus semua ingredients lama, ganti dengan yang baru
      const pool = require('../config/db');
      await pool.query('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [id]);

      for (const ing of ingredients) {
        if (!ing.ingredientId || !ing.quantity || !ing.unit) continue;
        await RecipeModel.addIngredient(id, ing.ingredientId, parseFloat(ing.quantity), ing.unit);
      }

      // Sync stock menu
      await RecipeModel.syncMenuStock(recipe.menu_id);

      recipe.ingredients = await RecipeModel.getIngredients(id);
      recipe.estimated_stock = await RecipeModel.calculateMenuStock(recipe.menu_id);
      res.json(recipe);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  // DELETE /api/recipes/:id
  delete: async (req, res) => {
    try {
      const deleted = await RecipeModel.delete(req.params.id);
      if (!deleted) return res.status(404).json({ error: 'Resep tidak ditemukan.' });
      res.json({ message: 'Resep berhasil dihapus.', menuId: deleted.menu_id });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  // POST /api/recipes/sync-all — sync semua stock menu dari bahan
  syncAll: async (req, res) => {
    try {
      const recipes = await RecipeModel.findAllWithIngredients();
      const results = [];
      for (const r of recipes) {
        const newStock = await RecipeModel.syncMenuStock(r.menu_id);
        results.push({ menuId: r.menu_id, menuName: r.menu_name, newStock });
      }
      res.json({ synced: results.length, results });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Server error.' });
    }
  },
};

module.exports = RecipeController;
