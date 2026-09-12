import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";

const ALIGN_OPTIONS = [
  { value: "left", label: "Kiri" },
  { value: "center", label: "Tengah" },
  { value: "right", label: "Kanan" },
];

export function ResizableImageNode({ node, updateAttributes, selected }: NodeViewProps) {
  const { src, alt, title, align = "left", width = "auto" } = node.attrs as {
    src?: string;
    alt?: string;
    title?: string;
    align?: string;
    width?: string;
  };

  const numericWidth = width === "auto" ? 480 : parseInt(String(width), 10) || 480;

  return (
    <NodeViewWrapper data-drag-handle className={`resizable-img-wrap ${selected ? "is-selected" : ""}`} style={{ textAlign: align }}>
      <div className="relative inline-block max-w-full">
        <img
          src={src}
          alt={alt ?? ""}
          title={title ?? ""}
          className="rounded border border-base-content/15 select-none block max-w-full"
          style={{ width: width === "auto" ? undefined : `${numericWidth}px`, height: "auto" }}
          contentEditable={false}
          draggable={false}
        />
        {selected && (
          <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded bg-neutral px-2 py-1 text-xs text-neutral-content shadow-lg">
            <label className="flex items-center gap-1 whitespace-nowrap">
              <span className="hidden sm:inline">Lebar</span>
              <input
                type="range"
                min={80}
                max={900}
                step={10}
                value={numericWidth}
                onChange={(e) => updateAttributes({ width: `${e.target.value}px` })}
                className="w-24 accent-primary"
                contentEditable={false}
              />
              <span className="w-10 tabular-nums">{numericWidth}px</span>
            </label>
            <div className="flex items-center gap-0.5">
              {ALIGN_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  title={o.label}
                  contentEditable={false}
                  className={`rounded px-1.5 py-0.5 ${align === o.value ? "bg-primary text-primary-content" : "hover:bg-neutral-content/15"}`}
                  onClick={() => updateAttributes({ align: o.value })}
                >
                  {o.value === "left" ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h16" /></svg>
                  ) : o.value === "center" ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M8 12h8M4 18h16" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M10 12h10M4 18h16" /></svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
