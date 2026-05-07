const pool = require('../config/db');

const SettingModel = {
  getAll: async () => {
    const { rows } = await pool.query('SELECT key, value FROM settings ORDER BY key');
    // Ubah array rows jadi object { key: value }
    return rows.reduce((obj, r) => { obj[r.key] = r.value; return obj; }, {});
  },

  get: async (key) => {
    const { rows } = await pool.query('SELECT value FROM settings WHERE key=$1', [key]);
    return rows[0]?.value ?? null;
  },

  set: async (key, value) => {
    await pool.query(
      `INSERT INTO settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [key, value]
    );
  },

  setMany: async (data) => {
    // data = { key: value, ... }
    for (const [key, value] of Object.entries(data)) {
      await pool.query(
        `INSERT INTO settings (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [key, String(value ?? '')]
      );
    }
  },
};

module.exports = SettingModel;
