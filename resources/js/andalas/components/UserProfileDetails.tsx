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
        <div className="space-y-6">
            {summary.sections.map((section) => (
                <section key={section.title} className="space-y-3">
                    <h2 className="font-semibold">{section.title}</h2>
                    <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
                        {Object.entries(section.fields).map(
                            ([label, value]) => (
                                <div key={label} className="min-w-0">
                                    <dt className="text-base-content/60">
                                        {label}
                                    </dt>
                                    <dd className="mt-1 break-words">
                                        {value ||
                                            'Belum tersedia / tidak berlaku'}
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
