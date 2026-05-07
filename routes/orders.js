const express = require('express');
const router  = express.Router();
const OrderController = require('../controllers/orderController');

router.get('/table/:tableId',        OrderController.getOpenByTable);
router.get('/table/:tableId/active', OrderController.getActiveByTable);
router.get('/:id',                   OrderController.getOne);
router.post('/',                     OrderController.create);
router.patch('/:id',                 OrderController.update);

module.exports = router;
