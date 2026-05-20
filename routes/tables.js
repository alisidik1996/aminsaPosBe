const express = require('express');
const router  = express.Router();
const TableController = require('../controllers/tableController');

router.post('/switch',  TableController.switchTable);
router.get('/',         TableController.getAll);
router.get('/:id',      TableController.getOne);
router.patch('/:id',    TableController.update);

module.exports = router;
