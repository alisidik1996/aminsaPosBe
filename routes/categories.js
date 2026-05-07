const express    = require('express');
const router     = express.Router();
const CategoryController = require('../controllers/categoryController');

router.get('/',     CategoryController.getAll);
router.post('/',    CategoryController.create);
router.put('/:id',  CategoryController.update);
router.delete('/:id', CategoryController.delete);

module.exports = router;
