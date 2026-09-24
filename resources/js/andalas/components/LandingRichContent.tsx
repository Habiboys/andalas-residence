/** HTML is sanitized by LandingRichText on the server before reaching public pages. */
export default function LandingRichContent({
    html,
    className = '',
}: {
    html: string | null;
    className?: string;
}) {
    if (!html)
        return (
            <p className="text-base-content/70 text-sm">
                Konten belum tersedia.
            </p>
        );
    return (
        <div
            className={`landing-rich-content ${className}`}
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}
