const pool = require('../config/db');

const UserModel = {
  findByCredentials: (username, password) =>
    pool.query(
      'SELECT id, username, name, role FROM users WHERE username=$1 AND password=$2',
      [username, password]
    ).then(r => r.rows[0] || null),

  findAll: () =>
    pool.query('SELECT id, username, name, role FROM users ORDER BY id')
      .then(r => r.rows),

  create: (username, password, name, role) =>
    pool.query(
      'INSERT INTO users (username, password, name, role) VALUES ($1,$2,$3,$4) RETURNING id, username, name, role',
      [username, password, name, role]
    ).then(r => r.rows[0]),

  update: async (id, fields) => {
    const cols = [], vals = [];
    let i = 1;
    if (fields.username !== undefined) { cols.push(`username=$${i++}`); vals.push(fields.username); }
    if (fields.password)               { cols.push(`password=$${i++}`); vals.push(fields.password); }
    if (fields.name     !== undefined) { cols.push(`name=$${i++}`);     vals.push(fields.name); }
    if (fields.role     !== undefined) { cols.push(`role=$${i++}`);     vals.push(fields.role); }
    if (!cols.length) return null;
    vals.push(id);
    await pool.query(`UPDATE users SET ${cols.join(',')} WHERE id=$${i}`, vals);
    return pool.query('SELECT id, username, name, role FROM users WHERE id=$1', [id])
      .then(r => r.rows[0]);
  },

  delete: (id) =>
    pool.query('DELETE FROM users WHERE id=$1', [id]),
};

module.exports = UserModel;
