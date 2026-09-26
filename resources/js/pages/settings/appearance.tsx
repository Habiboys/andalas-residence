import { Head } from '@inertiajs/react';
import AppearanceTabs from '@/components/appearance-tabs';
import Heading from '@/components/heading';
import SettingsNav from '@/andalas/components/SettingsNav';
import { Card } from '@/andalas/components/ui';

export default function Appearance() {
    return (
        <div className="mx-auto w-full max-w-3xl">
            <Head title="Tampilan" />

            <h1 className="sr-only">Tampilan</h1>

            <SettingsNav />

            <Card className="space-y-6 p-5">
                <Heading
                    variant="small"
                    title="Tampilan"
                    description="Atur tampilan terang atau gelap untuk akun Anda"
                />
                <AppearanceTabs />
            </Card>
        </div>
    );
}
