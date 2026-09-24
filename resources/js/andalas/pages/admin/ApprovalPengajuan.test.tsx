import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vite-plus/test';
import ApprovalPengajuan from './ApprovalPengajuan';

it('shows status tabs and a searchable paginated application table before opening review details', () => {
    const html = renderToStaticMarkup(
        <ApprovalPengajuan
            bebas_asrama={[
                {
                    id: 'one',
                    nomor_pengajuan: 'BA-ONE',
                    status: 'diajukan',
                    lifecycle_year: 2025,
                    mahasiswa: {
                        user: { nama: 'Mahasiswa A', nim_nip: '2599000001' },
                    },
                },
                {
                    id: 'two',
                    nomor_pengajuan: 'BA-TWO',
                    status: 'diverifikasi',
                    lifecycle_year: 2025,
                    legacy_verification_path: 'alumni_unpaid',
                },
                {
                    id: 'three',
                    status: 'disetujui',
                    file_surat_path: 'letter.pdf',
                },
                { id: 'four', status: 'ditolak' },
            ]}
        />,
    );

    for (const text of [
        'Semua (4)',
        'Menunggu verifikasi (1)',
        'Diverifikasi (1)',
        'Disetujui (1)',
        'Ditolak (1)',
        'Mahasiswa A',
        '2599000001',
        'BA-ONE',
        'Alumni belum lunas',
        'Lihat detail',
        'Aksi',
        'Baris per halaman',
        'type="search"',
    ]) {
        expect(html).toContain(text);
    }
    expect(html).not.toContain('Setujui dan terbitkan surat');
});

it('shows an empty state instead of an empty review form', () => {
    const html = renderToStaticMarkup(<ApprovalPengajuan />);
    expect(html).toContain('Tidak ada pengajuan pada status ini.');
    expect(html).toContain('Semua (0)');
    expect(html).not.toContain('Setujui dan terbitkan surat');
});
