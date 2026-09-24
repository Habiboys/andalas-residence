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
            {children.map((child) => (
                <Card key={child.id} className="space-y-2 p-5">
                    <h2 className="font-semibold">
                        {child.student_profile?.user?.nama}
                    </h2>
                    <p>
                        {child.student_profile?.user?.nim_nip} ?{' '}
                        {child.student_profile?.status_huni}
                    </p>
                    {child.student_profile?.penempatan_kamar
                        ?.filter((stay) => stay.status === 'aktif')
                        .map((stay) => (
                            <p key={stay.id}>
                                {stay.kamar?.lantai?.gedung?.nama_gedung} /
                                Kamar {stay.kamar?.nomor_kamar}
                            </p>
                        ))}
                </Card>
            ))}
        </div>
    );
}
