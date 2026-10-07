export type ProfileSummary = {
    category: string;
    residence: string;
    account: string;
    sections: { title: string; fields: Record<string, string | null> }[];
};

export default function UserProfileDetails({
    summary,
}: {
    summary?: ProfileSummary;
}) {
    if (!summary) return <p>Data profil belum tersedia.</p>;

    return (
        <div className="space-y-5">
            {summary.sections.map((section) => (
                <section key={section.title} className="space-y-2">
                    <h2 className="text-base-content/60 text-xs font-semibold tracking-wide uppercase">
                        {section.title}
                    </h2>
                    <dl className="divide-base-300 divide-y">
                        {Object.entries(section.fields).map(
                            ([label, value]) => (
                                <div
                                    key={label}
                                    className="grid min-w-0 gap-1 py-3 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:gap-4"
                                >
                                    <dt className="text-base-content/60 text-sm leading-relaxed">
                                        {label}
                                    </dt>
                                    <dd
                                        className={`min-w-0 text-sm leading-relaxed break-words ${value ? 'font-medium' : 'text-base-content/40'}`}
                                    >
                                        {value || 'Belum tersedia'}
                                    </dd>
                                </div>
                            ),
                        )}
                    </dl>
                </section>
            ))}
        </div>
    );
}
