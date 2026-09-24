import { AuthField, authInputClass } from './AndalasAuthShell';

export type AcademicOptions = {
    fakultas?: Array<{ id: string; name: string }>;
    departemen?: Array<{ id: string; name: string; faculty_id: string }>;
    prodi?: Array<{
        id: string;
        name: string;
        jenjang: string;
        departemen_id: string;
    }>;
};
export type AcademicSelection = {
    faculty_id: string;
    departemen_id: string;
    prodi_id: string;
};

export function cohortFromNim(nim: string): string {
    if (!/^\d{4,50}$/.test(nim)) return '';
    const prefix = Number(nim.slice(0, 2));
    const year = (prefix >= 50 ? 1900 : 2000) + prefix;
    return year <= new Date().getFullYear() ? String(year) : '';
}

export default function AcademicFields({
    fakultas = [],
    departemen = [],
    prodi = [],
    value,
    onChange,
    errors = {},
}: AcademicOptions & {
    value: AcademicSelection;
    onChange: (value: AcademicSelection) => void;
    errors?: Partial<Record<keyof AcademicSelection, string>>;
}) {
    return (
        <>
            <AuthField label="Fakultas" error={errors.faculty_id}>
                <select
                    aria-label="Fakultas"
                    className={authInputClass}
                    required
                    value={value.faculty_id}
                    onChange={(e) =>
                        onChange({
                            faculty_id: e.target.value,
                            departemen_id: '',
                            prodi_id: '',
                        })
                    }
                >
                    <option value="">Pilih fakultas</option>
                    {fakultas.map((item) => (
                        <option key={item.id} value={item.id}>
                            {item.name}
                        </option>
                    ))}
                </select>
            </AuthField>
            <AuthField label="Departemen" error={errors.departemen_id}>
                <select
                    aria-label="Departemen"
                    className={authInputClass}
                    required
                    disabled={!value.faculty_id}
                    value={value.departemen_id}
                    onChange={(e) =>
                        onChange({
                            ...value,
                            departemen_id: e.target.value,
                            prodi_id: '',
                        })
                    }
                >
                    <option value="">Pilih departemen</option>
                    {departemen
                        .filter((item) => item.faculty_id === value.faculty_id)
                        .map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.name}
                            </option>
                        ))}
                </select>
            </AuthField>
            <AuthField label="Program studi / jenjang" error={errors.prodi_id}>
                <select
                    aria-label="Program studi / jenjang"
                    className={authInputClass}
                    required
                    disabled={!value.departemen_id}
                    value={value.prodi_id}
                    onChange={(e) =>
                        onChange({ ...value, prodi_id: e.target.value })
                    }
                >
                    <option value="">Pilih program studi</option>
                    {prodi
                        .filter(
                            (item) =>
                                item.departemen_id === value.departemen_id,
                        )
                        .map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.name} ({item.jenjang})
                            </option>
                        ))}
                </select>
            </AuthField>
        </>
    );
}
