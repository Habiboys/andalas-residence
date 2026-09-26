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
                    <dl className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {Object.entries(section.fields).map(
                            ([label, value]) => (
                                <div
                                    key={label}
                                    className="bg-base-200/70 rounded-field min-w-0 px-2.5 py-2"
                                >
                                    <dt className="text-base-content/60 text-[11px] leading-snug font-medium">
                                        {label}
                                    </dt>
                                    <dd
                                        className={`mt-0.5 text-sm break-words ${value ? 'font-medium' : 'text-base-content/40'}`}
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
