require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const { initDB } = require('./database');

const app = express();

// ── CORS — harus dipasang PALING AWAL sebelum middleware lain ──
// Termasuk handle preflight OPTIONS secara eksplisit
const corsOptions = {
  origin: (origin, callback) => {
    // Izinkan semua origin (termasuk null untuk request lokal/Postman)
    callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
};
app.use(cors(corsOptions));

// Handle preflight OPTIONS untuk semua route secara eksplisit
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '5mb' }));

// ── Middleware: init DB sebelum setiap request (lazy init) ────
// Penting untuk Vercel serverless — tidak ada persistent process
app.use(async (req, res, next) => {
  try {
    await initDB();
    next();
  } catch (err) {
    console.error('DB init error:', err.message);
    // Pastikan CORS header sudah ada sebelum kirim error
    res.status(500).json({ error: 'Database tidak tersedia: ' + err.message });
  }
});

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/menu',       require('./routes/menu'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/tables',     require('./routes/tables'));
app.use('/api/orders',     require('./routes/orders'));
app.use('/api/bills',      require('./routes/bills'));
app.use('/api/settings',   require('./routes/settings'));
app.use('/api/void',       require('./routes/void'));
app.use('/api/station',      require('./routes/station'));
app.use('/api/ingredients',  require('./routes/ingredients'));
app.use('/api/recipes',      require('./routes/recipes'));

app.get('/api/health', async (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: `Route tidak ditemukan: ${req.method} ${req.path}` });
});

// ── Start (lokal saja — Vercel tidak pakai listen) ────────────
if (process.env.NODE_ENV !== 'production' && require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`✅ POS Cafe API running at http://localhost:${PORT}`);
  });
}

// Vercel serverless entry point
module.exports = app;
