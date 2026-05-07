# POS Cafe — Backend API

Node.js + Express + PostgreSQL (Supabase)

## Setup Lokal

```bash
npm install
cp .env.example .env
# Edit .env — isi DATABASE_URL dengan password Supabase
npm run dev
```

## Environment Variables

| Variable | Keterangan |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string Supabase |
| `PORT` | Port server (default: 3001) |
| `ALLOWED_ORIGINS` | CORS origins, pisah koma |

## Deploy ke Vercel

1. Push ke GitHub: `https://github.com/alisidik1996/aminsaPosBe`
2. Import repo di [vercel.com](https://vercel.com)
3. Set Environment Variables di Vercel dashboard:
   - `DATABASE_URL` = connection string Supabase
   - `ALLOWED_ORIGINS` = URL frontend Vercel
4. Deploy

## API Endpoints

| Method | Endpoint | Keterangan |
|---|---|---|
| POST | /api/auth/login | Login |
| GET | /api/menu | Semua menu |
| GET | /api/menu/categories | Kategori menu |
| PATCH | /api/menu/:id/stock | Update stok |
| GET | /api/tables | Semua meja |
| PATCH | /api/tables/:id | Update meja |
| POST | /api/orders | Buat order |
| PATCH | /api/orders/:id | Update order |
| POST | /api/bills | Buat bill |
| POST | /api/bills/:id/add-order | Tambah order ke bill |
| PATCH | /api/bills/:id | Update pembayaran |
