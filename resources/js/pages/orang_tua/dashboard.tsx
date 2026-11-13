import { Card, PageHeader } from '@/andalas/components/ui';
type Child = {
    id: string;
    student_profile?: {
        status_huni: string;
        user?: { nama: string; nim_nip: string };
        penempatan_kamar?: Array<{
            id: string;
            status: string;
            kamar?: {
                nomor_kamar: string;
                lantai?: { gedung?: { nama_gedung: string } };
            };
        }>;
    };
};
export default function Dashboard({ children = [] }: { children?: Child[] }) {
    return (
        <div className="space-y-4">
            <PageHeader
                title="Dashboard Orang Tua"
                subtitle="Informasi hunian mahasiswa yang ditautkan ke akun Anda."
            />
            {children.length === 0 && (
                <Card className="p-5">
                    Belum ada mahasiswa tertaut. Hubungi admin layanan untuk
                    verifikasi hubungan orang tua.
                </Card>
            )}
            {children.length === 0 ? (
                <Card className="p-6 text-center">
                    <p className="font-medium text-neutral-800">
                        Belum ada data mahasiswa terhubung
                    </p>
                    <p className="mt-1 text-sm text-neutral-500">
                        Hubungi pengelola asrama jika data perwalian belum muncul pada akun Anda.
                    </p>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {children.map((child) => {
                        const activeStays =
                            child.student_profile?.penempatan_kamar?.filter(
                                (stay) => stay.status === 'aktif',
                            ) ?? [];

                        return (
                            <Card key={child.id} className="space-y-3 p-5">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                        <h2 className="text-base font-semibold text-neutral-900">
                                            {child.student_profile?.user?.nama ?? '-'}
                                        </h2>
                                        <p className="text-sm text-neutral-500">
                                            NIM {child.student_profile?.user?.nim_nip ?? '-'}
                                        </p>
                                    </div>
                                    <StatusBadge
                                        status={child.student_profile?.status_huni ?? 'nonaktif'}
                                    />
                                </div>
                                <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-sm">
                                    <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                                        Penempatan Kamar Aktif
                                    </p>
                                    {activeStays.length > 0 ? (
                                        <div className="mt-1 space-y-1 text-neutral-800">
                                            {activeStays.map((stay) => (
                                                <p key={stay.id} className="font-medium">
                                                    {stay.kamar?.lantai?.gedung?.nama_gedung ?? '-'} / Kamar{' '}
                                                    {stay.kamar?.nomor_kamar ?? '-'}
                                                </p>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="mt-1 text-neutral-500">
                                            Belum memiliki penempatan kamar aktif.
                                        </p>
                                    )}
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
