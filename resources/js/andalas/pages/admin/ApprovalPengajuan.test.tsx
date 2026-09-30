import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vite-plus/test';
import ApprovalPengajuan from './ApprovalPengajuan';

type Row = {
    id: string;
    nomor_pengajuan: string;
    status: string;
    legacy_verification_path?: string;
    payment_evidence_path?: string;
    bank_statement_path?: string;
    file_surat_path?: string;
    mahasiswa?: { user?: { nama: string; nim_nip: string } };
};

function renderPage(rows: Row[]) {
    return renderToStaticMarkup(
        <ApprovalPengajuan
            bebas_asrama={{
                data: rows,
                current_page: 1,
                per_page: 10,
                last_page: 1,
                total: rows.length,
            }}
        />,
    );
}

it('shows free residence applications in a table with verification actions', () => {
    const html = renderPage([
        {
            id: 'one',
            nomor_pengajuan: 'BA-ONE',
            status: 'diajukan',
            legacy_verification_path: 'alumni_paid',
            payment_evidence_path: 'proof.pdf',
            bank_statement_path: 'bank.pdf',
            mahasiswa: {
                user: { nama: 'Mahasiswa A', nim_nip: '21100001' },
            },
        },
    ]);

    for (const label of [
        'No. Pengajuan',
        'Mahasiswa A',
        '21100001',
        'Alumni, mengaku sudah lunas',
        'Verifikasi',
        'Cari nomor pengajuan, nama, atau NIM',
    ]) {
        expect(html).toContain(label);
    }
    expect(html).not.toContain('Simpan keputusan');
    expect(html).not.toContain('Lihat bukti bayar');
});

it('shows approved applications as details without a decision form', () => {
    const html = renderPage([
        {
            id: 'one',
            nomor_pengajuan: 'BA-ONE',
            status: 'disetujui',
            file_surat_path: 'letter.pdf',
        },
    ]);

    expect(html).toContain('Lihat detail');
    expect(html).not.toContain('Unduh surat');
});

it('shows an empty state when there are no applications', () => {
    expect(renderPage([])).toContain('Belum ada pengajuan bebas asrama.');
});
