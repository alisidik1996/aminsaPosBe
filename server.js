require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const { initDB } = require('./database');

const app = express();

// ── CORS ──────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

// Selalu izinkan localhost untuk development
const devOrigins = [
  'http://localhost:5500', 'http://127.0.0.1:5500',
  'http://localhost:3000', 'http://127.0.0.1:3000',
  'http://localhost:3001', 'http://127.0.0.1:3001',
];

app.use(cors({
  origin: (origin, cb) => {
    // Izinkan request tanpa origin (curl, Postman, server-to-server)
    if (!origin) return cb(null, true);
    const all = [...allowedOrigins, ...devOrigins];
    if (all.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} tidak diizinkan`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth',   require('./routes/auth'));
app.use('/api/menu',   require('./routes/menu'));
app.use('/api/tables', require('./routes/tables'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/bills',  require('./routes/bills'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: `Route tidak ditemukan: ${req.method} ${req.path}` });
});

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ POS Cafe API running at http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Gagal inisialisasi DB:', err);
    process.exit(1);
  });

module.exports = app; // untuk Vercel serverless
