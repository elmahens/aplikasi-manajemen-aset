// server.js
// Ini adalah "otak" dari aplikasi Anda. Server ini berjalan terus-menerus
// untuk melayani permintaan dari browser (frontend).

const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const app = express();
const PORT = 3000;
let db;

// --- Middleware ---
// Middleware adalah fungsi yang dijalankan untuk setiap permintaan yang masuk.
app.use(cors()); // Mengizinkan frontend (yang berjalan di domain berbeda saat development) untuk mengakses API ini.
app.use(express.json()); // Memungkinkan server untuk membaca data JSON yang dikirim dari frontend.
app.use(express.static(path.join(__dirname, 'public'))); // Menyajikan file frontend (index.html) secara statis.

// --- KONEKSI KE DATABASE SQLITE ---
// Fungsi ini dijalankan saat server pertama kali start untuk membuka koneksi ke database.
(async () => {
    try {
        db = await open({
            filename: './database.sqlite',
            driver: sqlite3.Database
        });
        console.log('Berhasil terhubung ke database SQLite.');
    } catch (err) {
        console.error('Gagal terhubung ke database:', err.message);
    }
})();


// --- DATA KATEGORI (Statis) ---
// Data ini tidak perlu disimpan di database karena jarang berubah.
const KATEGORI_DATA = {
    "Pemeliharaan Gedung dan Bangunan": {
        "Laboratorium Gabungan": 20000000, "Gedung Perkuliahan A&B": 35000000, "Gedung Perkuliahan C&D": 28000000, "Gedung Workshop": 15000000, "Gedung Aula": 12000000, "Laboratorium TIA": 18000000, "Gedung Kantor": 22000000, "Gedung Kantor Jurusan": 17000000, "Laboratorium Terintegrasi": 30000000, "Gedung Pendidikan": 25000000, "Taman dan Drainase": 9500000, "Pengelasan": 5000000, "Mushallah": 8000000, "Pos Security": 4000000, "Sek. Mahasiswa": 6000000, "Rumah Bujang": 3000000, "Toilet": 7500000, "Parkiran": 11000000, "Ruang PKM": 4500000, "Pagar": 12000000, "Kantin": 9000000, "Rumah Dinas Direktur": 14000000, "Lainnya (Gedung)": 10000000,
    },
    "Pemeliharaan Peralatan dan Mesin": {
        "Kendaraan Roda 2": 5000000, "Kendaraan Roda 4": 7000000, "Instalasi Jaringan Listrik": 45000000, "AC Split": 22500000, "Alat Laboratorium": 35000000, "Printer": 2500000, "CCTV": 15000000, "Personal Computer": 18000000, "Lainnya (Mesin)": 8000000,
    }
};

// --- API Endpoints (Titik Akses Data) ---

// Endpoint [GET] /api/data: Mengambil semua data awal yang dibutuhkan aplikasi.
app.get('/api/data', async (req, res) => {
    try {
        const budget = await db.get('SELECT * FROM budget WHERE id = 1');
        const pemeliharaan = await db.all('SELECT * FROM pemeliharaan ORDER BY id DESC');
        const auditLog = await db.all('SELECT * FROM audit_log ORDER BY id DESC');

        res.json({
            budget: budget || { total: 0, realisasi: 0 },
            kategori: KATEGORI_DATA,
            pemeliharaan: pemeliharaan || [],
            auditLog: auditLog || []
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Endpoint [POST] /api/pemeliharaan: Mengajukan rencana pemeliharaan baru.
app.post('/api/pemeliharaan', async (req, res) => {
    const { bulan, kategori, keterangan, biaya, jenis } = req.body;
    const status = 'Menunggu Persetujuan';
    
    try {
        const result = await db.run(
            'INSERT INTO pemeliharaan (bulan, kategori, keterangan, biaya, jenis, status) VALUES (?, ?, ?, ?, ?, ?)',
            [bulan, kategori, keterangan, biaya, jenis, status]
        );
        
        // Menambah log audit untuk setiap pengajuan baru
        const userMap = { pemeliharaan: "Staff Pemeliharaan" };
        const user = userMap[req.headers['x-user-role']] || 'Unknown User';
        const action = `Mengajukan rencana pemeliharaan baru: "${keterangan}"`;
        await db.run('INSERT INTO audit_log (time, user, action) VALUES (?, ?, ?)', [new Date().toLocaleString('id-ID'), user, action]);

        res.status(201).json({ id: result.lastID, ...req.body, status });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Endpoint [PUT] /api/pemeliharaan/:id/:action: Menyetujui atau menolak rencana.
app.put('/api/pemeliharaan/:id/:action', async (req, res) => {
    const { id, action } = req.params; // action bisa 'approve' atau 'reject'
    
    try {
        const plan = await db.get('SELECT * FROM pemeliharaan WHERE id = ?', id);
        if (!plan) {
            return res.status(404).json({ message: 'Rencana tidak ditemukan' });
        }

        let newStatus = plan.status;
        let logAction = '';

        if (action === 'approve') {
            newStatus = 'Disetujui';
            logAction = `Menyetujui rencana: "${plan.keterangan}"`;
            // Jika disetujui, update realisasi budget di database
            await db.run('UPDATE budget SET realisasi = realisasi + ? WHERE id = 1', plan.biaya);
        } else if (action === 'reject') {
            newStatus = 'Ditolak';
            logAction = `Menolak rencana: "${plan.keterangan}"`;
        } else {
            return res.status(400).json({ message: 'Aksi tidak valid' });
        }

        // Update status rencana di database
        await db.run('UPDATE pemeliharaan SET status = ? WHERE id = ?', [newStatus, id]);

        // Menambah log audit untuk aksi persetujuan/penolakan
        const userMap = { kasubag: "Kasubag" };
        const user = userMap[req.headers['x-user-role']] || 'Unknown User';
        await db.run('INSERT INTO audit_log (time, user, action) VALUES (?, ?, ?)', [new Date().toLocaleString('id-ID'), user, logAction]);

        res.json({ ...plan, status: newStatus });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Rute fallback: Menyajikan file HTML utama untuk semua permintaan lain.
// Ini penting untuk aplikasi single-page.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// Menjalankan server pada port yang ditentukan
app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});

