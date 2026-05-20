const express = require('express');
const router  = express.Router();
const C = require('../controllers/ingredientController');

router.get('/',              C.getAll);
router.get('/:id',           C.getOne);
router.post('/',             C.create);
router.put('/:id',           C.update);
router.patch('/:id/stock',   C.adjustStock);
router.delete('/:id',        C.delete);

module.exports = router;
