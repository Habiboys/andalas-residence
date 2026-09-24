import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vite-plus/test';
import Activities from './JadwalKegiatan';

it('shows the assigned building and one create action without manual date or address inputs', () => {
    const html = renderToStaticMarkup(
        <Activities
            kegiatan={[]}
            gedung={[{ id: 'w', nama_gedung: 'Asrama W' }]}
            assigned_building={{ id: 'w', nama_gedung: 'Asrama W' }}
            role="fasilitator"
            can_manage
            jenis_kegiatan={[
                { id: 'subuh', nama: 'Sholat Subuh', is_other: false },
                { id: 'other', nama: 'Lainnya', is_other: true },
            ]}
        />,
    );
    expect(html).toContain('Gedung penugasan: Asrama W');
    expect(html).toContain('Buat kegiatan &amp; QR');
    expect(html).toContain('Durasi QR (menit)');
    expect(html).not.toContain('datetime-local');
    expect(html).not.toContain('Umum - seluruh asrama');
    expect(html).not.toContain('Nama kegiatan');
});

it('explains missing assignments and disables activity creation for an unassigned facilitator', () => {
    const html = renderToStaticMarkup(
        <Activities
            kegiatan={[]}
            gedung={[]}
            jenis_kegiatan={[]}
            role="fasilitator"
            can_manage
            assigned_building={null}
        />,
    );
    expect(html).toContain('Belum ada penugasan gedung');
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Buat kegiatan &amp; QR/);
});
