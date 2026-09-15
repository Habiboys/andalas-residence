import { Link } from "@inertiajs/react";

type Props = {
    title: string;
    breadcrumb: string;
};

/*
 * Inner-page banner in the profile-akademik style: a deep-green hero band with
 * a thin primary accent line under the eyebrow and a Manrope display title.
 * pt-32 clears the fixed header.
 */
export default function LandingPageHero({ title, breadcrumb }: Props) {
    return (
        <section className="bg-hero pt-32 pb-12 text-white md:pb-16 md:pt-36">
            <div className="mx-auto max-w-7xl px-4 md:px-6">
                <nav aria-label="Breadcrumb" className="mb-3 text-xs text-white/70">
                    <Link href="/" className="transition-colors hover:text-white hover:underline">
                        Beranda
                    </Link>
                    <span className="mx-2" aria-hidden="true">/</span>
                    <span>{breadcrumb}</span>
                </nav>
                <span className="block h-1 w-16 bg-primary" aria-hidden="true" />
                <h1 className="mt-4 max-w-3xl font-display text-3xl leading-tight text-white md:text-5xl">
                    {title}
                </h1>
            </div>
        </section>
    );
}