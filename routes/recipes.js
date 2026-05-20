const express = require('express');
const router  = express.Router();
const C = require('../controllers/recipeController');

router.get('/',                C.getAll);
router.get('/menu/:menuId',    C.getByMenu);
router.post('/sync-all',       C.syncAll);
router.post('/',               C.create);
router.put('/:id',             C.update);
router.delete('/:id',          C.delete);

module.exports = router;
