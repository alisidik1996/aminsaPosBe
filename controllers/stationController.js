const StationModel = require('../models/stationModel');

const StationController = {
  // GET /api/station/:station/items
  getItems: async (req, res) => {
    try {
      const { station } = req.params;
      if (!['kitchen', 'bar'].includes(station)) {
        return res.status(400).json({ error: 'Station harus kitchen atau bar.' });
      }
      const items = await StationModel.getAllItems(station);
      res.json(items);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  // GET /api/station/:station/pending
  getPendingItems: async (req, res) => {
    try {
      const { station } = req.params;
      if (!['kitchen', 'bar'].includes(station)) {
        return res.status(400).json({ error: 'Station harus kitchen atau bar.' });
      }
      const items = await StationModel.getPendingItems(station);
      res.json(items);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  // POST /api/station/items/:id/complete
  completeItem: async (req, res) => {
    try {
      const item = await StationModel.completeItem(req.params.id);
      if (!item) return res.status(404).json({ error: 'Item tidak ditemukan.' });
      
      // Cek apakah order sudah lengkap selesai
      const isOrderComplete = await StationModel.isOrderComplete(item.order_id);
      res.json({ 
        item, 
        orderComplete: isOrderComplete,
        message: 'Item ditandai selesai.' 
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  // POST /api/station/items/:id/undo
  undoCompleteItem: async (req, res) => {
    try {
      const item = await StationModel.undoCompleteItem(req.params.id);
      if (!item) return res.status(404).json({ error: 'Item tidak ditemukan.' });
      res.json({ 
        item, 
        message: 'Item dikembalikan ke status pending.' 
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Server error.' });
    }
  },
};

module.exports = StationController;