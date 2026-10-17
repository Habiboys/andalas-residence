import { Head, usePage } from '@inertiajs/react';
import LandingLayout from '@/andalas/components/LandingLayout';
import LandingPageHero from '@/andalas/components/LandingPageHero';
import { type LandingSettings } from '@/andalas/lib/landing-settings';
import '@/andalas/index.css';

export default function KontakPage() {
    const site =
        usePage<{ landingSettings: LandingSettings }>().props.landingSettings
            ?.site ?? {};
    return (
        <>
            <Head title={site.contact_title ?? 'Kontak'} />
            <LandingLayout active="kontak">
                <LandingPageHero
                    title={site.contact_title ?? 'Kontak'}
                    breadcrumb="Kontak"
                />
                <section className="py-16 md:py-24">
                    <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-2">
                        <div>
                            <h2 className="font-display text-3xl">
                                {site.name}
                            </h2>
                            <p className="text-muted mt-4 leading-7">
                                {site.contact_intro}
                            </p>
                            <dl className="mt-8 space-y-5">
                                {[
                                    ['Alamat', site.address],
                                    ['Email', site.email],
                                    ['Telepon', site.phone],
                                    ['Jam layanan', site.hours],
                                ]
                                    .filter(([, value]) => value)
                                    .map(([label, value]) => (
                                        <div key={label}>
                                            <dt className="text-sm font-semibold">
                                                {label}
                                            </dt>
                                            <dd className="text-muted mt-1 text-sm whitespace-pre-wrap">
                                                {value}
                                            </dd>
                                        </div>
                                    ))}
                            </dl>
                            {site.maps_url && (
                                <a
                                    href={site.maps_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-outline mt-6"
                                >
                                    Petunjuk lokasi
                                </a>
                            )}
                        </div>
                        <div className="space-y-6">
                            {site.map_embed && (
                                <iframe
                                    title="Peta lokasi"
                                    src={site.map_embed}
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                    className="border-base-300 h-72 w-full rounded-lg border"
                                />
                            )}
                            {site.email && (
                                <form
                                    className="space-y-4"
                                    onSubmit={(event) => {
                                        event.preventDefault();
                                        const data = new FormData(
                                            event.currentTarget,
                                        );
                                        window.location.href = `mailto:${site.email}?subject=${encodeURIComponent(String(data.get('subject') ?? ''))}&body=${encodeURIComponent(String(data.get('message') ?? ''))}`;
                                    }}
                                >
                                    <h3 className="text-lg font-semibold">
                                        Kirim pesan melalui email
                                    </h3>
                                    <label className="block text-sm">
                                        Subjek
                                        <input
                                            className="input mt-1 w-full"
                                            name="subject"
                                            required
                                        />
                                    </label>
                                    <label className="block text-sm">
                                        Pesan
                                        <textarea
                                            className="textarea mt-1 w-full"
                                            name="message"
                                            rows={4}
                                            required
                                        />
                                    </label>
                                    <p className="text-muted text-xs">
                                        Tombol ini membuka aplikasi email Anda.
                                    </p>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                    >
                                        Buka email
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </section>
            </LandingLayout>
        </>
    );
}
