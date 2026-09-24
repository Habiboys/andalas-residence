import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vite-plus/test';
import Registration from './Registration';

it('allows drafts and rejected registrations to be submitted but blocks submitted registrations', () => {
    for (const status of ['draft', 'rejected', 'submitted']) {
        const html = renderToStaticMarkup(<Registration
            periode={[{ id: 'period', nama_periode: '2026', status: 'aktif' }]}
            registration={[{ id: 'application', status, periode_id: 'period' }]}
            initialUser={{ client_profile_category: 'local_non_kipk' }}
        />);
        expect(html).toContain('Daftar Asrama');
        const submit = html.match(/<button[^>]*type="submit"[^>]*>/)?.[0];
        expect(submit).toBeDefined();
        expect(submit?.includes('disabled')).toBe(status === 'submitted');
        expect(html).not.toContain('type="checkbox"');
    }
});

it('explains account-based KIPK placement without an unusable checkbox or room selection', () => {
    const html = renderToStaticMarkup(<Registration initialUser={{ client_profile_category: 'local_kipk' }} />);
    expect(html).toContain('Anda terdaftar sebagai peserta KIPK');
    expect(html).not.toContain('Nomor kamar');
    expect(html).not.toContain('type="checkbox"');
});
