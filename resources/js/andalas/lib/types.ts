export type DashboardStats = {
    okupansi: { total_kamar: number; penuh: number; kosong: number };
    pembayaran_pending: number;
    tiket_aktif: number;
    pengajuan_pending: number;
    penghuni_aktif: number;
};

export type KeuanganStats = {
    saldo: number;
    pemasukan: number;
    pengeluaran: number;
    pembayaran_pending: number;
    pembayaran_lunas: number;
    jumlah_transaksi: number;
};
