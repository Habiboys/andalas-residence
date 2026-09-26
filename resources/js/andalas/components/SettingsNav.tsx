import { Link, usePage } from '@inertiajs/react';
import { Palette, ShieldCheck, User } from 'lucide-react';
import { edit as profileEdit } from '@/routes/profile';
import { edit as securityEdit } from '@/routes/security';
import { edit as appearanceEdit } from '@/routes/appearance';
import { Card } from './ui';

const LINKS = [
    { label: 'Profil', icon: User, url: () => profileEdit() },
    {
        label: 'Keamanan & Password',
        icon: ShieldCheck,
        url: () => securityEdit(),
    },
    { label: 'Tampilan', icon: Palette, url: () => appearanceEdit() },
];

function toPath(url: string | { url: string }): string {
    const raw = typeof url === 'string' ? url : url.url;

    return raw.replace(/^https?:\/\/[^/]+/, '');
}

export default function SettingsNav() {
    const { url } = usePage();

    return (
        <Card className="mb-4 p-2">
            <nav aria-label="Pengaturan akun" className="flex flex-wrap gap-1">
                {LINKS.map((link) => {
                    const target = link.url();
                    const href =
                        typeof target === 'string' ? target : target.url;
                    const active = url.startsWith(toPath(target));
                    const Icon = link.icon;

                    return (
                        <Link
                            key={link.label}
                            href={href}
                            className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition-colors ${active ? 'bg-primary text-primary-content shadow-xs' : 'text-base-content/80 hover:bg-base-200 hover:text-base-content'}`}
                        >
                            <Icon className="size-[16px]" aria-hidden="true" />
                            {link.label}
                        </Link>
                    );
                })}
            </nav>
        </Card>
    );
}
