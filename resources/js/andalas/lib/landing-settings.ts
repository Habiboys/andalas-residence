export type RegistrationTrackSetting = {
    badge: string;
    title: string;
    description: string;
    points_text: string;
    cta_label: string;
    cta_href: string;
};

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
    show_auto_gallery?: boolean;
    steps: Array<{ title: string; text: string }>;
    categories: Array<{ title: string; text: string }>;
    services: Array<{ title: string; text: string }>;
    faqs: Array<{ q: string; a: string }>;
    registration_tracks?: RegistrationTrackSetting[];
    facilities?: Array<{ title: string; text: string }>;
    core_rules?: Array<{ title: string; text: string }>;
    payment_steps?: Array<{ title: string; text: string }>;
    site: Record<string, string>;
};

export const mediaUrl = (path?: string | null): string =>
    !path ? '' : /^(https?:\/\/|\/)/.test(path) ? path : `/storage/${path}`;
