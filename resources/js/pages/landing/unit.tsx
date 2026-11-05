import { Head } from '@inertiajs/react';
import LandingLayout from '@/andalas/components/LandingLayout';
import ResidenceMarketplace, {
    type ResidenceListing,
} from '@/andalas/components/ResidenceMarketplace';
import '@/andalas/index.css';
export default function UnitPage({
    residenceCatalog = [],
}: {
    residenceCatalog?: ResidenceListing[];
}) {
    return (
        <>
            <Head title="Jelajahi Gedung & Kamar" />
            <LandingLayout active="unit">
                <div className="pt-20">
                    <ResidenceMarketplace listings={residenceCatalog} />
                </div>
            </LandingLayout>
        </>
    );
}
