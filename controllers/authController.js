const UserModel = require('../models/userModel');

const AuthController = {
  login: async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password)
        return res.status(400).json({ error: 'Username dan password wajib diisi.' });
      const user = await UserModel.findByCredentials(username, password);
      if (!user) return res.status(401).json({ error: 'Username atau password salah.' });
      res.json({ user });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  getUsers: async (req, res) => {
    try {
      res.json(await UserModel.findAll());
    } catch (e) {
      res.status(500).json({ error: 'Server error.' });
    }
  },

  createUser: async (req, res) => {
    try {
      const { username, password, name, role = 'kasir' } = req.body;
      if (!username || !password || !name)
        return res.status(400).json({ error: 'username, password, name wajib diisi.' });
      const user = await UserModel.create(username, password, name, role);
      res.status(201).json(user);
    } catch (e) {
      if (e.code === '23505') return res.status(400).json({ error: 'Username sudah digunakan.' });
      res.status(500).json({ error: 'Server error.' });
    }
  },

  updateUser: async (req, res) => {
    try {
      const user = await UserModel.update(req.params.id, req.body);
      if (!user) return res.status(400).json({ error: 'Tidak ada field yang diupdate.' });
      res.json(user);
    } catch (e) {
      if (e.code === '23505') return res.status(400).json({ error: 'Username sudah digunakan.' });
      res.status(500).json({ error: 'Server error.' });
    }
  },

  deleteUser: async (req, res) => {
    try {
      await UserModel.delete(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Server error.' });
    }
  },
};

module.exports = AuthController;
