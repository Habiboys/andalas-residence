import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { type LandingSettings, mediaUrl } from '../lib/landing-settings';

type Props = {
    title: string;
    breadcrumb: string;
};

export default function LandingPageHero({ title, breadcrumb }: Props) {
    const { landingSettings } = usePage().props as unknown as {
        landingSettings?: LandingSettings;
    };
    const image = mediaUrl(landingSettings?.hero?.image);
    const [failedImage, setFailedImage] = useState<string | null>(null);

    return (
        <section className="bg-hero relative isolate overflow-hidden text-white">
            {image && failedImage !== image && (
                <img
                    src={image}
                    alt=""
                    aria-hidden="true"
                    fetchPriority="high"
                    onError={() => setFailedImage(image)}
                    className="absolute inset-0 -z-20 h-full w-full object-cover object-center md:left-1/3 md:w-2/3"
                />
            )}
            <div
                aria-hidden="true"
                className="absolute inset-0 -z-10 bg-linear-to-r from-[#103c30] via-[#103c30]/90 to-[#103c30]/45 md:via-[#103c30]/75 md:to-[#103c30]/15"
            />
            <div className="relative mx-auto flex min-h-80 max-w-7xl flex-col justify-end px-4 pt-32 pb-10 md:min-h-96 md:px-6 md:pt-36 md:pb-14">
                <nav
                    aria-label="Breadcrumb"
                    className="mb-6 flex flex-wrap items-center gap-y-2 text-sm text-white/80"
                >
                    <Link
                        href="/"
                        className="rounded-sm transition-colors hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                    >
                        Beranda
                    </Link>
                    <span className="mx-2" aria-hidden="true">
                        /
                    </span>
                    <span
                        aria-current="page"
                        className="font-medium text-white"
                    >
                        {breadcrumb}
                    </span>
                </nav>
                <span
                    className="block h-1 w-12 rounded-full bg-emerald-400"
                    aria-hidden="true"
                />
                <h1 className="font-display mt-4 max-w-3xl text-4xl leading-tight font-semibold tracking-tight text-balance break-words text-white md:text-5xl lg:text-6xl">
                    {title}
                </h1>
            </div>
        </section>
    );
}
