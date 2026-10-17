export type LandingSettings = {
    hero: {
        eyebrow: string;
        title: string;
        description: string;
        image: string;
        image_alt: string;
    };
    headings: Record<string, string>;
    gallery: Array<{ title: string; image: string; category: string }>;
    steps: Array<{ title: string; text: string }>;
    categories: Array<{ title: string; text: string }>;
    services: Array<{ title: string; text: string }>;
    faqs: Array<{ q: string; a: string }>;
    site: Record<string, string>;
};

export const mediaUrl = (path?: string | null): string =>
    !path ? '' : /^(https?:\/\/|\/)/.test(path) ? path : `/storage/${path}`;
