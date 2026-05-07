const express = require('express');
const router  = express.Router();
const VoidController = require('../controllers/voidController');

router.post('/table/:tableId', VoidController.voidTable);
router.post('/bill/:billId',   VoidController.voidBill);
router.get('/history',         VoidController.history);

module.exports = router;
