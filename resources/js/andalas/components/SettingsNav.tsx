import { Link, usePage } from '@inertiajs/react';
import { Palette, ShieldCheck, User } from 'lucide-react';
import { edit as profileEdit } from '@/routes/profile';
import { edit as securityEdit } from '@/routes/security';
import { edit as appearanceEdit } from '@/routes/appearance';
import { Card } from './ui';

const LINKS = [
    { label: 'Profil', icon: User, href: profileEdit().url },
    { label: 'Keamanan & Password', icon: ShieldCheck, href: securityEdit().url },
    { label: 'Tampilan', icon: Palette, href: appearanceEdit().url },
];

function toPath(url: string): string {
    return url.replace(/^https?:\/\/[^/]+/, '');
}

export default function SettingsNav() {
    const { url } = usePage();

    return (
        <Card className="mb-4 p-2">
            <nav
                aria-label="Pengaturan akun"
                className="flex flex-wrap gap-1"
            >
                {LINKS.map((link) => {
                    const href = toPath(link.href);
                    const active = url.startsWith(href);
                    const Icon = link.icon;

                    return (
                        <Link
                            key={href}
                            href={href}
                            aria-current={active ? 'page' : undefined}
                            className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
                                active
                                    ? 'bg-primary text-primary-content'
                                    : 'text-base-content/80 hover:bg-base-200 hover:text-base-content'
                            }`}
                        >
                            <Icon className="size-4" aria-hidden="true" />
                            {link.label}
                        </Link>
                    );
                })}
            </nav>
        </Card>
    );
}
