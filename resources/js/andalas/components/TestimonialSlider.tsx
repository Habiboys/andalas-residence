import { Pause, Play } from 'lucide-react';
import { useState } from 'react';
import { Modal } from './ui';

export type Testimoni = {
    id: string;
    nama: string;
    prodi: string | null;
    teks: string;
    foto: string | null;
};

const LONG_STORY_CHAR_LIMIT = 165;

function isLongStory(text: string): boolean {
    const trimmed = text.trim();

    return trimmed.length > LONG_STORY_CHAR_LIMIT || trimmed.includes('\n');
}

export default function TestimonialSlider({
    items,
    title = 'Pengalaman penghuni',
    description = 'Cerita singkat dari penghuni Andalas Residence.',
}: {
    items: Testimoni[];
    title?: string;
    description?: string;
}) {
    const [paused, setPaused] = useState(false);
    const [activeStory, setActiveStory] = useState<Testimoni | null>(null);

    if (items.length === 0) return null;

    const sliding = items.length > 1;
    // Keep each loop wider than the viewport, including with only two stories.
    const stories = sliding && items.length < 3 ? [...items, ...items] : items;
    const isPaused = paused || activeStory !== null;

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
                        {title}
                    </h2>
                    <p className="text-muted mt-5 text-sm leading-7">
                        {description}
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
                            animationPlayState: isPaused ? 'paused' : undefined,
                            animationDuration: `${stories.length * 12}s`,
                        }}
                    >
                        {(sliding ? [0, 1] : [0]).map((group) => (
                            <div
                                key={group}
                                className="testimonial-group"
                                aria-hidden={group === 1 ? true : undefined}
                            >
                                {stories.map((item, index) => {
                                    const hiddenCopy =
                                        group === 1 || index >= items.length;
                                    const longStory = isLongStory(item.teks);

                                    return (
                                        <figure
                                            key={`${item.id}-${index}`}
                                            aria-hidden={
                                                index >= items.length
                                                    ? true
                                                    : undefined
                                            }
                                            className={`testimonial-card border-base-300 bg-base-100 flex h-80 flex-col rounded-xl border p-6 ${index >= items.length ? 'testimonial-copy' : ''}`}
                                        >
                                            <span
                                                aria-hidden="true"
                                                className="text-primary/40 font-display h-8 shrink-0 text-4xl leading-none"
                                            >
                                                “
                                            </span>
                                            <div className="mt-1 flex-1 overflow-hidden">
                                                <blockquote className="text-base-content line-clamp-5 text-sm leading-6 break-words md:text-[15px] md:leading-6">
                                                    {item.teks}
                                                </blockquote>
                                                {longStory && (
                                                    <button
                                                        type="button"
                                                        tabIndex={
                                                            hiddenCopy
                                                                ? -1
                                                                : undefined
                                                        }
                                                        onClick={() =>
                                                            setActiveStory(item)
                                                        }
                                                        className="text-primary focus-visible:outline-primary mt-2 inline-flex items-center text-xs font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
                                                    >
                                                        Baca selengkapnya
                                                    </button>
                                                )}
                                            </div>
                                            <figcaption className="border-base-300 mt-4 shrink-0 border-t pt-3.5 text-sm">
                                                <span className="block truncate font-semibold">
                                                    {item.nama}
                                                </span>
                                                {item.prodi && (
                                                    <span className="text-muted mt-0.5 block truncate text-xs leading-5">
                                                        {item.prodi}
                                                    </span>
                                                )}
                                            </figcaption>
                                        </figure>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {activeStory && (
                <Modal
                    open
                    onClose={() => setActiveStory(null)}
                    title="Cerita Penghuni"
                >
                    <div className="space-y-4">
                        <span
                            aria-hidden="true"
                            className="text-primary/40 font-display block text-4xl leading-none"
                        >
                            “
                        </span>
                        <blockquote className="text-base-content text-sm leading-7 whitespace-pre-line md:text-base">
                            {activeStory.teks}
                        </blockquote>
                        <div className="border-base-200 border-t pt-3.5 text-sm">
                            <p className="font-semibold">{activeStory.nama}</p>
                            {activeStory.prodi && (
                                <p className="text-muted mt-0.5 text-xs">
                                    {activeStory.prodi}
                                </p>
                            )}
                        </div>
                    </div>
                </Modal>
            )}
        </section>
    );
}
