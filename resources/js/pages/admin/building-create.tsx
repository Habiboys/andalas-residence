import { Head } from '@inertiajs/react';
import KelolaBangunan, { type Gedung } from '@/andalas/pages/admin/KelolaBangunan';
import { show as buildingShow } from '@/routes/andalas/gedung';
import { kelolaBangunan } from '@/routes/admin';
import { kelolaBangunan as assetBuildings } from '@/routes/admin_aset';

export default function BuildingCreate({ role, building }: { role?: string; building?: Gedung } = {}) {
    return (
        <>
            <Head title={building ? "Edit Gedung" : "Tambah Gedung"} />
            <KelolaBangunan
                gedung={building ? [building] : []}
                createPage
                createReturnUrl={
                    building ? buildingShow.url(building.id) : role === 'admin_aset'
                        ? assetBuildings.url()
                        : kelolaBangunan.url()
                }
            />
        </>
    );
}
