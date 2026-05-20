const express = require('express');
const router  = express.Router();
const StationController = require('../controllers/stationController');

router.get('/:station/items',      StationController.getItems);
router.get('/:station/pending',    StationController.getPendingItems);
router.post('/items/:id/complete', StationController.completeItem);
router.post('/items/:id/undo',     StationController.undoCompleteItem);

module.exports = router;