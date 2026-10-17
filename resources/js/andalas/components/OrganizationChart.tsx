import { mediaUrl } from '../lib/landing-settings';
import './organization-chart.css';

export type OrganizationNode = {
    id: string;
    parent_id: string | null;
    title: string;
    name: string | null;
    photo: string | null;
    sort_order: number;
    published: boolean;
};

export default function OrganizationChart({
    positions,
    preview = false,
}: {
    positions: OrganizationNode[];
    preview?: boolean;
}) {
    const nodes = positions
        .filter((node) => preview || node.published)
        .sort(
            (a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id),
        );
    function branch(
        parent: string | null,
        ancestors: string[] = [],
    ): React.ReactNode {
        const children = nodes.filter(
            (node) => node.parent_id === parent && !ancestors.includes(node.id),
        );
        if (!children.length) return null;
        return (
            <ul>
                {children.map((node) => (
                    <li key={node.id}>
                        <div className="org-node border-base-300 bg-base-100 rounded-lg border px-4 py-4 text-center shadow-xs">
                            {node.photo && (
                                <img
                                    src={mediaUrl(node.photo)}
                                    alt={node.name ?? node.title}
                                    className="mx-auto mb-3 size-16 rounded-full object-cover"
                                    loading="lazy"
                                />
                            )}
                            <p className="text-primary text-sm font-bold">
                                {node.title}
                            </p>
                            <p className="mt-1 text-sm">
                                {node.name || 'Belum ditetapkan'}
                            </p>
                            {preview && !node.published && (
                                <span className="text-muted text-xs">
                                    Draft
                                </span>
                            )}
                        </div>
                        {branch(node.id, [...ancestors, node.id])}
                    </li>
                ))}
            </ul>
        );
    }
    return (
        <div
            className="org-tree overflow-x-auto py-4"
            role="region"
            aria-label="Bagan struktur organisasi"
            tabIndex={0}
        >
            {nodes.some((node) => node.parent_id === null) ? (
                branch(null)
            ) : (
                <p className="text-muted text-sm">
                    Bagan organisasi belum diterbitkan.
                </p>
            )}
        </div>
    );
}
