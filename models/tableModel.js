const pool = require('../config/db');

function mapTable(row) {
  return {
    id:       row.id,
    name:     row.name,
    status:   row.status,
    openedAt: row.opened_at || null,
    kasirId:  row.kasir_id  || null,
  };
}

const TableModel = {
  findAll: () =>
    pool.query('SELECT * FROM tables_pos ORDER BY id')
      .then(r => r.rows.map(mapTable)),

  findById: (id) =>
    pool.query('SELECT * FROM tables_pos WHERE id=$1', [id])
      .then(r => r.rows[0] ? mapTable(r.rows[0]) : null),

  update: async (id, fields) => {
    const cols = [], vals = [];
    let i = 1;
    if (fields.status   !== undefined) { cols.push('status=$' + i++);    vals.push(fields.status); }
    if (fields.openedAt !== undefined) { cols.push('opened_at=$' + i++); vals.push(fields.openedAt); }
    if (fields.kasirId  !== undefined) { cols.push('kasir_id=$' + i++);  vals.push(fields.kasirId); }
    if (!cols.length) return null;
    vals.push(id);
    await pool.query('UPDATE tables_pos SET ' + cols.join(',') + ' WHERE id=$' + i, vals);
    return pool.query('SELECT * FROM tables_pos WHERE id=$1', [id])
      .then(r => mapTable(r.rows[0]));
  },
};

module.exports = TableModel;
