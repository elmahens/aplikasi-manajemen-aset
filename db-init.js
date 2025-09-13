// db-init.js
// Skrip ini untuk membuat dan mengisi database Anda untuk pertama kali.
// Jalankan skrip ini HANYA SATU KALI dengan perintah: npm run init-db

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

// Data awal yang akan dimasukkan ke dalam tabel pemeliharaan
const pemeliharaanData = [
    { id: 1, bulan: 'Januari', kategori: 'Instalasi Jaringan Listrik', keterangan: 'Perbaikan panel utama gardu induk', biaya: 45000000, status: 'Disetujui', jenis: 'Reaktif' },
    { id: 2, bulan: 'Februari', kategori: 'Gedung Perkuliahan A&B', keterangan: 'Pengecatan ulang dinding luar dan perbaikan atap', biaya: 35000000, status: 'Disetujui', jenis: 'Preventif' },
    { id: 3, bulan: 'Maret', kategori: 'AC Split', keterangan: 'Servis rutin 150 unit AC di seluruh gedung', biaya: 22500000, status: 'Disetujui', jenis: 'Preventif' },
    { id: 4, bulan: 'Maret', kategori: 'Kendaraan Roda 4', keterangan: 'Servis berkala mobil dinas rektor', biaya: 7000000, status: 'Ditolak', jenis: 'Operasional' },
    { id: 5, bulan: 'April', kategori: 'Personal Computer', keterangan: 'Upgrade RAM & SSD 20 PC lab komputer', biaya: 18000000, status: 'Menunggu Persetujuan', jenis: 'Operasional' },
    { id: 6, bulan: 'April', kategori: 'Taman dan Drainase', keterangan: 'Pembersihan saluran drainase utama kampus', biaya: 9500000, status: 'Disetujui', jenis: 'Preventif' },
    { id: 7, bulan: 'Mei', kategori: 'CCTV', keterangan: 'Penambahan 10 titik CCTV di area parkir', biaya: 15000000, status: 'Menunggu Persetujuan', jenis: 'Preventif' },
    { id: 8, bulan: 'Juni', kategori: 'Gedung Workshop', keterangan: 'Perbaikan instalasi listrik mesin workshop', biaya: 25000000, status: 'Menunggu Persetujuan', jenis: 'Operasional' },
    { id: 9, bulan: 'Juli', kategori: 'Toilet', keterangan: 'Renovasi 5 toilet gedung perkuliahan', biaya: 40000000, status: 'Ditolak', jenis: 'Tak Terduga' },
    { id: 10, bulan: 'Agustus', kategori: 'Pagar', keterangan: 'Pengecatan ulang pagar keliling kampus', biaya: 12000000, status: 'Menunggu Persetujuan', jenis: 'Preventif' }
];

// Data awal untuk riwayat aktivitas
const auditLogData = [
    { time: new Date(Date.now() - 3 * 60 * 60 * 1000).toLocaleString('id-ID'), user: 'Staff Keuangan', action: 'Mengupdate Anggaran Awal menjadi Rp 850.000.000' },
    { time: new Date(Date.now() - 2 * 60 * 60 * 1000).toLocaleString('id-ID'), user: 'Kasubag', action: 'Menyetujui rencana "Servis rutin 150 unit AC"' },
];

// db.serialize memastikan semua perintah dijalankan secara berurutan
db.serialize(() => {
    console.log('Memulai inisialisasi database...');

    // 1. Membuat tabel 'budget' jika belum ada
    db.run(`CREATE TABLE IF NOT EXISTS budget (
        id INTEGER PRIMARY KEY,
        total BIGINT,
        realisasi BIGINT
    )`, (err) => {
        if (err) console.error("Error membuat tabel budget:", err.message);
        else console.log("Tabel 'budget' berhasil dibuat/sudah ada.");
    });
    
    // 2. Membuat tabel 'pemeliharaan' jika belum ada
    db.run(`CREATE TABLE IF NOT EXISTS pemeliharaan (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bulan TEXT,
        kategori TEXT,
        keterangan TEXT,
        biaya BIGINT,
        status TEXT,
        jenis TEXT
    )`, (err) => {
        if (err) console.error("Error membuat tabel pemeliharaan:", err.message);
        else console.log("Tabel 'pemeliharaan' berhasil dibuat/sudah ada.");
    });

    // 3. Membuat tabel 'audit_log' jika belum ada
    db.run(`CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        time TEXT,
        user TEXT,
        action TEXT
    )`, (err) => {
         if (err) console.error("Error membuat tabel audit_log:", err.message);
        else console.log("Tabel 'audit_log' berhasil dibuat/sudah ada.");
    });

    // --- Mengisi data awal (hanya jika tabel kosong untuk mencegah duplikasi) ---
    
    // Mengisi tabel budget
    db.get('SELECT COUNT(*) as count FROM budget', (err, row) => {
        if (row.count === 0) {
            const stmt = db.prepare('INSERT INTO budget (id, total, realisasi) VALUES (?, ?, ?)');
            // Anggaran awal 850jt, realisasi awal 112jt (dari item yang sudah disetujui)
            stmt.run(1, 850000000, 112000000, (err) => {
                if(err) console.error("Gagal insert budget", err.message);
                else console.log('Data budget awal berhasil dimasukkan.');
            });
            stmt.finalize();
        }
    });

    // Mengisi tabel pemeliharaan
     db.get('SELECT COUNT(*) as count FROM pemeliharaan', (err, row) => {
        if (row.count === 0) {
            const stmt = db.prepare('INSERT INTO pemeliharaan (bulan, kategori, keterangan, biaya, status, jenis) VALUES (?, ?, ?, ?, ?, ?)');
            pemeliharaanData.forEach(p => stmt.run(p.bulan, p.kategori, p.keterangan, p.biaya, p.status, p.jenis));
            stmt.finalize((err) => {
                if(err) console.error("Gagal insert pemeliharaan", err.message);
                else console.log('Data pemeliharaan awal berhasil dimasukkan.');
            });
        }
    });

    // Mengisi tabel audit_log
     db.get('SELECT COUNT(*) as count FROM audit_log', (err, row) => {
        if (row.count === 0) {
            const stmt = db.prepare('INSERT INTO audit_log (time, user, action) VALUES (?, ?, ?)');
            auditLogData.forEach(log => stmt.run(log.time, log.user, log.action));
            stmt.finalize((err) => {
                if(err) console.error("Gagal insert audit_log", err.message);
                else console.log('Data audit_log awal berhasil dimasukkan.');
            });
        }
    });

    // Menutup koneksi database setelah semua selesai
    db.close((err) => {
        if (err) console.error(err.message);
        else console.log('Database ditutup. Inisialisasi selesai!');
    });
});

