import { Head } from '@inertiajs/react';
import KelolaBangunan from '@/andalas/pages/admin/KelolaBangunan';
import { kelolaBangunan } from '@/routes/admin';
import { kelolaBangunan as assetBuildings } from '@/routes/admin_aset';

export default function BuildingCreate({ role }: { role?: string } = {}) {
    return (
        <>
            <Head title="Tambah Gedung" />
            <KelolaBangunan
                gedung={[]}
                createPage
                createReturnUrl={
                    role === 'admin_aset'
                        ? assetBuildings.url()
                        : kelolaBangunan.url()
                }
            />
        </>
    );
}
