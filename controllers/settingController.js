const SettingModel = require('../models/settingModel');

const SettingController = {
  getAll: async (req, res) => {
    try {
      res.json(await SettingModel.getAll());
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  update: async (req, res) => {
    try {
      const allowed = [
        'merchant_name', 'merchant_address', 'merchant_phone',
        'merchant_social', 'receipt_footer',
      ];
      const data = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) data[key] = req.body[key];
      }
      if (!Object.keys(data).length)
        return res.status(400).json({ error: 'Tidak ada field yang valid.' });

      await SettingModel.setMany(data);
      res.json(await SettingModel.getAll());
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Server error.' });
    }
  },
};

module.exports = SettingController;
