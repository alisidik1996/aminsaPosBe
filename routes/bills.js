const express = require('express');
const router  = express.Router();
const BillController = require('../controllers/billController');

router.get('/order/:orderId',    BillController.getByOrder);
router.get('/table/:tableId',    BillController.getByTable);
router.get('/:id',               BillController.getOne);
router.post('/',                 BillController.create);
router.post('/:id/add-order',    BillController.addOrder);
router.patch('/:id',             BillController.update);

module.exports = router;
