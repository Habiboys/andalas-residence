import { Link } from "@inertiajs/react";

type Props = {
    title: string;
    breadcrumb: string;
};

/*
 * The band is a dark surface, so its copy is built from primary/primary-content
 * rather than the gold accent: gold at the light theme's contrast-safe value is
 * a dark bronze and would disappear here. The accent is kept for interactive
 * moments on light surfaces, where it was verified.
 *
 * The breadcrumb link no longer leans on a 50% white opacity, which measured
 * below the 4.5:1 a link needs.
 */
export default function LandingPageHero({ title, breadcrumb }: Props) {
    return (
        <section className="bg-primary pt-28 pb-12 md:pb-16">
            <div className="mx-auto max-w-6xl px-6">
                <nav aria-label="Breadcrumb" className="mb-3 text-xs text-primary-content/70">
                    <Link href="/" className="transition-colors hover:text-primary-content hover:underline">
                        Beranda
                    </Link>
                    <span className="mx-2" aria-hidden="true">/</span>
                    <span>{breadcrumb}</span>
                </nav>
                <h1 className="font-serif text-4xl leading-tight text-primary-content md:text-5xl">
                    {title}
                </h1>
            </div>
        </section>
    );
}
