const express = require('express');
const router  = express.Router();
const TableController = require('../controllers/tableController');

router.get('/',       TableController.getAll);
router.get('/:id',    TableController.getOne);
router.patch('/:id',  TableController.update);

module.exports = router;
