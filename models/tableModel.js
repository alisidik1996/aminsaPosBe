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

  // Pindahkan semua data (orders + bills) dari fromId ke toId secara atomik
  switchTable: async (fromId, toId) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Ambil data kedua meja
      const { rows: fromRows } = await client.query('SELECT * FROM tables_pos WHERE id=$1', [fromId]);
      const { rows: toRows   } = await client.query('SELECT * FROM tables_pos WHERE id=$1', [toId]);
      if (!fromRows[0]) throw new Error('Meja asal tidak ditemukan.');
      if (!toRows[0])   throw new Error('Meja tujuan tidak ditemukan.');
      if (toRows[0].status !== 'available') throw new Error('Meja tujuan sedang terisi.');

      const from = fromRows[0];

      // Update table_id di semua orders aktif meja asal
      await client.query(
        "UPDATE orders SET table_id=$1 WHERE table_id=$2 AND status IN ('open','sent')",
        [toId, fromId]
      );

      // Update table_id + table_name di semua bills unpaid meja asal
      await client.query(
        "UPDATE bills SET table_id=$1, table_name=$2 WHERE table_id=$3 AND status='unpaid'",
        [toId, toRows[0].name, fromId]
      );

      // Set meja tujuan jadi occupied (salin info dari meja asal)
      await client.query(
        'UPDATE tables_pos SET status=$1, opened_at=$2, kasir_id=$3 WHERE id=$4',
        [from.status, from.opened_at, from.kasir_id, toId]
      );

      // Kosongkan meja asal
      await client.query(
        "UPDATE tables_pos SET status='available', opened_at=NULL, kasir_id=NULL WHERE id=$1",
        [fromId]
      );

      await client.query('COMMIT');

      const { rows: updatedFrom } = await client.query('SELECT * FROM tables_pos WHERE id=$1', [fromId]);
      const { rows: updatedTo   } = await client.query('SELECT * FROM tables_pos WHERE id=$1', [toId]);
      return { from: mapTable(updatedFrom[0]), to: mapTable(updatedTo[0]) };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

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
