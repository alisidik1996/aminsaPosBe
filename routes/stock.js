const express      = require('express');
const router       = express.Router();
const pool         = require('../config/db');
const RecipeModel  = require('../models/recipeModel');

/**
 * GET /api/stock/summary
 * Ringkasan stok terintegrasi: menu + bahan baku + status resep
 * Digunakan oleh backoffice untuk tampilan sinkronisasi stok
 */
router.get('/summary', async (req, res) => {
  try {
    // Ambil semua menu
    const { rows: menuItems } = await pool.query(
      'SELECT id, name, category, station, stock, active FROM menu ORDER BY category, name'
    );

    // Ambil semua bahan baku
    const { rows: ingredients } = await pool.query(
      'SELECT id, name, unit, stock, min_stock, active FROM ingredients ORDER BY name'
    );

    // Ambil semua resep dengan bahan
    const recipes = await RecipeModel.findAllWithIngredients();

    // Buat map menu_id → resep
    const recipeByMenu = {};
    recipes.forEach(r => { recipeByMenu[r.menu_id] = r; });

    // Gabungkan: setiap menu item + info resep + status bahan
    const menuWithRecipe = menuItems.map(m => {
      const recipe = recipeByMenu[m.id] || null;
      return {
        ...m,
        hasRecipe:       !!recipe,
        estimatedStock:  recipe ? recipe.estimated_stock : null,
        stockMismatch:   recipe ? (m.stock !== recipe.estimated_stock) : false,
        ingredients:     recipe ? recipe.ingredients : [],
      };
    });

    // Bahan baku dengan status stok rendah
    const lowStockIngredients = ingredients.filter(
      i => i.active && parseFloat(i.stock) <= parseFloat(i.min_stock) && parseFloat(i.min_stock) > 0
    );

    res.json({
      menu:                menuWithRecipe,
      ingredients,
      lowStockIngredients,
      totalMenu:           menuItems.length,
      totalIngredients:    ingredients.length,
      totalRecipes:        recipes.length,
      lowStockCount:       lowStockIngredients.length,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * POST /api/stock/sync-all
 * Sync ulang stok semua menu dari bahan baku (recalculate)
 */
router.post('/sync-all', async (req, res) => {
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
});

module.exports = router;
