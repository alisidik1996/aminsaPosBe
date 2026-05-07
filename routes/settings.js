const express = require('express');
const router  = express.Router();
const SettingController = require('../controllers/settingController');

router.get('/',  SettingController.getAll);
router.put('/',  SettingController.update);

module.exports = router;
