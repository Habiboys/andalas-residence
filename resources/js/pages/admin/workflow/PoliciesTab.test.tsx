import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vite-plus/test';
import PoliciesTab from './PoliciesTab';

vi.mock('@inertiajs/react', () => ({
    router: {
        reload: vi.fn(),
        post: vi.fn(),
        delete: vi.fn(),
    },
    useForm: (initial: Record<string, unknown>) => ({
        data: initial,
        errors: {},
        processing: false,
        setData: vi.fn(),
        transform: vi.fn(),
        post: vi.fn(),
        clearErrors: vi.fn(),
    }),
}));

vi.mock('@/actions/App/Http/Controllers/ResidenceWorkflowController', () => ({
    policy: { url: () => '/residence-process/policies' },
}));

it('shows Kedaluwarsa instead of Dibuka when an open policy deadline is in the past and shows Dibuka for future WIB deadline', () => {
    const html = renderToStaticMarkup(
        <PoliciesTab
            buildings={[]}
            policyCatalog={{
                local_non_kipk: [],
                local_kipk: [],
                international: [],
                summer_course: [],
                non_student: [],
            }}
            policies={[
                {
                    id: 'pol-1',
                    category: 'local_non_kipk',
                    version: 3,
                    published_at: '2026-11-10T01:00:00Z',
                    settings: {
                        open: true,
                        documents: ['perjanjian'],
                        building_ids: [],
                        rates: [],
                        month_days: 30,
                        day_basis: 'nights',
                        monthly_allowed: false,
                        registration_deadline: '2025-01-01T08:00:00+07:00',
                    },
                },
                {
                    id: 'pol-2',
                    category: 'local_kipk',
                    version: 1,
                    published_at: '2026-11-17T00:29:00Z',
                    settings: {
                        open: true,
                        documents: ['perjanjian'],
                        building_ids: [],
                        rates: [],
                        month_days: 30,
                        day_basis: 'nights',
                        monthly_allowed: false,
                        registration_deadline: '2099-11-30T07:29:00+07:00',
                    },
                },
            ]}
            masterHousingUrl={null}
        />,
    );

    expect(html).toContain('Kedaluwarsa');
    expect(html).toContain('Ditutup (Batas Waktu Berakhir)');
    expect(html).toContain('Batas waktu pendaftaran jalur ini sudah berakhir');
    expect(html).toContain('Dibuka');
    expect(html).toContain('2025-01-01 08:00 WIB');
});
