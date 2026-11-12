import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vite-plus/test';
import Pelaporan from './Pelaporan';

it.each([0, 1, 2])(
    'shows pagination only for multiple pages (last page: %s)',
    (lastPage) => {
        const page = {
            data: [],
            total: lastPage === 0 ? 0 : lastPage === 1 ? 1 : 25,
            last_page: Math.max(1, lastPage),
            links: [
                { url: '/pelaporan?page=1', label: '1', active: true },
                ...(lastPage > 1
                    ? [{ url: '/pelaporan?page=2', label: '2', active: false }]
                    : []),
            ],
        };
        const html = renderToStaticMarkup(
            <Pelaporan
                reports={page}
                daily={page}
                logbooks={page}
                summary={{}}
                blocked_count={0}
                technicians={[]}
                buildings={[]}
                filters={{ date: '2026-11-12' }}
                today="2026-11-12"
                can_order={false}
                can_logbook={false}
                can_complain={false}
                can_report={false}
                resident_name=""
                assets={[]}
                facilities={[]}
                notifications={[]}
            />,
        );
        for (const label of [
            'Halaman logbook',
            'Halaman laporan kerusakan',
            'Halaman aktivitas teknisi',
        ]) {
            expect(html.includes(`aria-label="${label}"`)).toBe(lastPage > 1);
        }
    },
);
