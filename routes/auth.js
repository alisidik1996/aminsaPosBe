const express = require('express');
const router  = express.Router();
const AuthController = require('../controllers/authController');

router.post('/login',       AuthController.login);
router.get('/users',        AuthController.getUsers);
router.post('/users',       AuthController.createUser);
router.put('/users/:id',    AuthController.updateUser);
router.delete('/users/:id', AuthController.deleteUser);

module.exports = router;
