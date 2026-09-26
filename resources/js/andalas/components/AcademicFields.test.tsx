import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vite-plus/test';
import AcademicFields, { cohortFromNim } from './AcademicFields';

it('shows only departments and program levels belonging to the selected faculty and department', () => {
    const html = renderToStaticMarkup(
        <AcademicFields
            fakultas={[
                { id: 'fti', name: 'Teknologi Informasi' },
                { id: 'law', name: 'Hukum' },
            ]}
            departemen={[
                { id: 'inf', name: 'Informatika', faculty_id: 'fti' },
                { id: 'law-dept', name: 'Departemen Hukum', faculty_id: 'law' },
            ]}
            prodi={[
                {
                    id: 's1',
                    name: 'Informatika',
                    jenjang: 'S1',
                    departemen_id: 'inf',
                },
                {
                    id: 's2',
                    name: 'Informatika',
                    jenjang: 'S2',
                    departemen_id: 'inf',
                },
                {
                    id: 'law-prodi',
                    name: 'Prodi Hukum',
                    jenjang: 'S1',
                    departemen_id: 'law-dept',
                },
            ]}
            value={{ faculty_id: 'fti', departemen_id: 'inf', prodi_id: 's1' }}
            onChange={() => {}}
        />,
    );
    expect(html).toContain('Informatika (S1)');
    expect(html).toContain('Informatika (S2)');
    expect(html).not.toContain('Departemen Hukum');
    expect(html).not.toContain('Prodi Hukum');
});

it('waits for a parent selection before offering departments and programs', () => {
    const html = renderToStaticMarkup(
        <AcademicFields
            value={{ faculty_id: '', departemen_id: '', prodi_id: '' }}
            onChange={() => {}}
        />,
    );
    expect(html.match(/<select[^>]*disabled=""/g)).toHaveLength(2);
});

it('previews cohort from the NIM and does not guess an invalid identity', () => {
    expect(cohortFromNim('2599001111')).toBe('2025');
    expect(cohortFromNim('9999001111')).toBe('1999');
    expect(cohortFromNim('INT001')).toBe('');
    expect(cohortFromNim('2')).toBe('');
});
