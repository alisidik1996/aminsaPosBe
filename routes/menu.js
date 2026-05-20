const express = require('express');
const router  = express.Router();
const MenuController = require('../controllers/menuController');

router.get('/',              MenuController.getAll);
router.get('/all',           MenuController.getAllAdmin);
router.get('/categories',    MenuController.getCategories);
router.get('/:id',           MenuController.getOne);
router.post('/',             MenuController.create);
router.put('/:id',           MenuController.update);
router.patch('/:id/stock',   MenuController.updateStock);
router.delete('/:id',        MenuController.remove);

module.exports = router;
