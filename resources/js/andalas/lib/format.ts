export const formatRupiah = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

export function mapPaymentStatus(status: string): string {
    const map: Record<string, string> = {
        menunggu_verifikasi: 'pending',
        lunas: 'terverifikasi',
        ditolak: 'ditolak',
        kadaluarsa: 'ditolak',
    };
    return map[status] ?? status;
}

export function mapTicketStatus(status: string): string {
    const map: Record<string, string> = {
        menunggu_triage: 'baru',
        didisposisikan: 'diproses',
        sedang_dikerjakan: 'diproses',
        selesai: 'selesai',
        dibatalkan: 'ditolak',
    };
    return map[status] ?? status;
}

export function mapPengajuanStatus(status: string): string {
    const map: Record<string, string> = {
        diajukan: 'pending',
        verifikasi_aset_dan_keuangan: 'pending',
        disetujui: 'disetujui',
        ditolak: 'ditolak',
        selesai_kembali: 'disetujui',
    };
    return map[status] ?? status;
}
