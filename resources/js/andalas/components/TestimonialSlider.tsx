import { Pause, Play } from 'lucide-react';
import { useState } from 'react';

export type Testimoni = {
    id: string;
    nama: string;
    prodi: string | null;
    teks: string;
    foto: string | null;
};

export default function TestimonialSlider({ items }: { items: Testimoni[] }) {
    const [paused, setPaused] = useState(false);

    if (items.length === 0) return null;

    const sliding = items.length > 1;
    // Keep each loop wider than the viewport, including with only two stories.
    const stories = sliding && items.length < 3 ? [...items, ...items] : items;

    return (
        <section
            aria-labelledby="testimonial-heading"
            className="bg-base-100 py-12 md:py-20"
        >
            <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 md:px-6 lg:grid-cols-3 lg:gap-12">
                <div>
                    <p className="text-muted mb-4 text-sm">
                        Cerita dari asrama
                    </p>
                    <h2
                        id="testimonial-heading"
                        className="font-display text-2xl leading-tight md:text-3xl"
                    >
                        Pengalaman penghuni
                    </h2>
                    <p className="text-muted mt-5 text-sm leading-7">
                        Tentang keseharian, lingkungan, dan kehidupan bersama di
                        Andalas Residence.
                    </p>
                    {sliding && (
                        <button
                            type="button"
                            aria-pressed={paused}
                            onClick={() => setPaused((value) => !value)}
                            className="testimonial-control border-base-300 hover:border-primary hover:text-primary focus-visible:outline-primary mt-6 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-4"
                        >
                            {paused ? (
                                <Play size={14} aria-hidden="true" />
                            ) : (
                                <Pause size={14} aria-hidden="true" />
                            )}
                            {paused ? 'Lanjutkan geser' : 'Jeda geser'}
                        </button>
                    )}
                </div>
                <div
                    className={`testimonial-window min-w-0 lg:col-span-2 ${sliding ? 'testimonial-window--sliding' : ''}`}
                    tabIndex={sliding ? 0 : undefined}
                    role="region"
                    aria-label="Cerita penghuni; gerakan dijeda saat disorot"
                >
                    <div
                        className={`testimonial-track ${sliding ? 'testimonial-track--sliding' : ''}`}
                        style={{
                            animationPlayState: paused ? 'paused' : undefined,
                            animationDuration: `${stories.length * 12}s`,
                        }}
                    >
                        {(sliding ? [0, 1] : [0]).map((group) => (
                            <div
                                key={group}
                                className="testimonial-group"
                                aria-hidden={group === 1 ? true : undefined}
                            >
                                {stories.map((item, index) => (
                                    <figure
                                        key={`${item.id}-${index}`}
                                        aria-hidden={
                                            index >= items.length
                                                ? true
                                                : undefined
                                        }
                                        className={`testimonial-card border-base-300 bg-base-100 flex min-h-72 flex-col rounded-md border p-6 md:p-7 ${index >= items.length ? 'testimonial-copy' : ''}`}
                                    >
                                        <span
                                            aria-hidden="true"
                                            className="text-primary/40 font-display h-10 text-5xl leading-none"
                                        >
                                            “
                                        </span>
                                        <blockquote className="text-base-content mt-2 flex-1 text-base leading-7">
                                            {item.teks}
                                        </blockquote>
                                        <figcaption className="border-base-300 mt-8 border-t pt-4 text-sm">
                                            <span className="block font-medium">
                                                {item.nama}
                                            </span>
                                            {item.prodi && (
                                                <span className="text-muted mt-1 block text-xs leading-5">
                                                    {item.prodi}
                                                </span>
                                            )}
                                        </figcaption>
                                    </figure>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
