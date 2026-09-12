import { Head, Link } from '@inertiajs/react';
import { ArrowRight, Building2, Users } from 'lucide-react';
import { dashboard } from '@/routes';

export default function Dashboard() {
    return (
        <>
            <Head title="Dashboard" />
            <div className="space-y-6 p-4 sm:p-6">
                <header>
                    <h1 className="text-xl font-semibold text-base-content">Dashboard</h1>
                    <p className="mt-1 text-sm text-muted">
                        Akses layanan dan pengelolaan Andalas Residence.
                    </p>
                </header>

                <div className="grid gap-4 md:grid-cols-2">
                    <section className="card rounded-box border border-base-300 bg-base-100">
                        <div className="card-body gap-3">
                            <Building2 className="size-6 text-primary" aria-hidden="true" />
                            <h2 className="card-title text-base">Panel Andalas Residence</h2>
                            <p className="text-sm text-muted">
                                Buka dashboard sesuai peran dan hak akses akun Anda.
                            </p>
                            <div className="card-actions justify-end">
                                <Link href="/app" className="btn btn-primary">
                                    Buka panel
                                    <ArrowRight className="size-4" aria-hidden="true" />
                                </Link>
                            </div>
                        </div>
                    </section>

                    <section className="card rounded-box border border-base-300 bg-base-100">
                        <div className="card-body gap-3">
                            <Users className="size-6 text-secondary" aria-hidden="true" />
                            <h2 className="card-title text-base">Pengaturan akun</h2>
                            <p className="text-sm text-muted">
                                Perbarui profil, keamanan, dan preferensi tampilan akun.
                            </p>
                            <div className="card-actions justify-end">
                                <Link href="/settings/profile" className="btn btn-outline">
                                    Kelola akun
                                </Link>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
