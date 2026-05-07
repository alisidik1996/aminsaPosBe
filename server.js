require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const { initDB } = require('./database');

const app = express();

// ── CORS — izinkan semua origin (bisa di-restrict setelah production stabil) ──
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
}));

app.use(express.json());

// ── Middleware: init DB sebelum setiap request (lazy init) ────
// Penting untuk Vercel serverless — tidak ada persistent process
app.use(async (req, res, next) => {
  try {
    await initDB();
    next();
  } catch (err) {
    console.error('DB init error:', err.message);
    res.status(500).json({ error: 'Database tidak tersedia: ' + err.message });
  }
});

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth',   require('./routes/auth'));
app.use('/api/menu',   require('./routes/menu'));
app.use('/api/tables', require('./routes/tables'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/bills',  require('./routes/bills'));

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
