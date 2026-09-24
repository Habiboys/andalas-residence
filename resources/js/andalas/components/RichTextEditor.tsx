import { useRef, useState } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { FontSize } from './richText/FontSize';
import { ResizableImage } from './richText/ResizableImage';

const FONT_SIZES = [
    '12px',
    '13px',
    '14px',
    '16px',
    '18px',
    '20px',
    '24px',
    '28px',
    '32px',
    '40px',
];

const TEXT_COLORS = [
    '#000000',
    '#374151',
    '#6B7280',
    '#1A3D2B',
    '#C9A227',
    '#B91C1C',
    '#1D4ED8',
    '#FFFFFF',
];

function Icon({
    path,
    className = 'w-4 h-4',
}: {
    path: string;
    className?: string;
}) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className={className}
        >
            <path strokeLinecap="round" strokeLinejoin="round" d={path} />
        </svg>
    );
}

interface ToolButtonProps {
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    title: string;
    children: React.ReactNode;
}

function ToolButton({
    onClick,
    active,
    disabled,
    title,
    children,
}: ToolButtonProps) {
    return (
        <button
            type="button"
            title={title}
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClick}
            disabled={disabled}
            className={`text-base-content flex h-8 min-w-8 items-center justify-center rounded px-2 transition-colors disabled:opacity-40 ${
                active
                    ? 'bg-primary/20 text-primary'
                    : 'hover:bg-base-content/10'
            }`}
        >
            {children}
        </button>
    );
}

function Divider() {
    return <span className="bg-base-content/15 mx-1 w-px self-stretch" />;
}

function Toolbar({
    editor,
    onPickImages,
}: {
    editor: Editor;
    onPickImages: () => void;
}) {
    const [currentFontSize, setCurrentFontSize] = useState('16px');
    const [showColors, setShowColors] = useState(false);

    return (
        <div className="border-base-content/15 bg-base-200/70 sticky top-0 z-10 flex flex-wrap items-center gap-0.5 rounded-t-lg border-b px-2 py-1.5">
            {/* Font size */}
            <select
                title="Ukuran font"
                value={currentFontSize}
                onMouseDown={(e) => e.stopPropagation()}
                onChange={(e) => {
                    const v = e.target.value;
                    setCurrentFontSize(v);
                    editor.chain().focus().setFontSize(v).run();
                }}
                className="border-base-content/20 bg-base-100 text-base-content h-7 w-16 rounded border text-xs"
            >
                {FONT_SIZES.map((s) => (
                    <option key={s} value={s}>
                        {s.replace('px', '')}
                    </option>
                ))}
            </select>
            <Divider />

            {/* Headings */}
            <select
                title="Format"
                onMouseDown={(e) => e.stopPropagation()}
                defaultValue="paragraph"
                onChange={(e) => {
                    const v = e.target.value;
                    const chain = editor.chain().focus();
                    if (v === 'paragraph') chain.setParagraph();
                    else chain.toggleHeading({ level: Number(v) as 1 | 2 | 3 });
                    chain.run();
                }}
                className="border-base-content/20 bg-base-100 text-base-content h-7 rounded border text-xs"
            >
                <option value="paragraph">Paragraf</option>
                <option value="1">H1</option>
                <option value="2">H2</option>
                <option value="3">H3</option>
            </select>
            <Divider />

            <ToolButton
                title="Tebal"
                active={editor.isActive('bold')}
                onClick={() => editor.chain().focus().toggleBold().run()}
            >
                <Icon path="M7 5h5.2c2.1 0 3.8 1.6 3.8 3.6 0 .8-.3 1.6-.8 2.2.9.5 1.5 1.4 1.5 2.5 0 2.2-1.7 3.7-3.9 3.7H7V5zm3 5.7h1.9c.9 0 1.6-.7 1.6-1.5S12.8 7.7 12 7.7H10v3zm0 6h2.2c.9 0 1.7-.7 1.7-1.6s-.8-1.5-1.7-1.5H10v3.1z" />
            </ToolButton>
            <ToolButton
                title="Miring"
                active={editor.isActive('italic')}
                onClick={() => editor.chain().focus().toggleItalic().run()}
            >
                <Icon path="M10 4h8m-4 0L9 20M5 20h8" />
            </ToolButton>
            <ToolButton
                title="Garis bawah"
                active={editor.isActive('underline')}
                onClick={() => editor.chain().focus().toggleUnderline().run()}
            >
                <Icon path="M4 4h16M4 8h16M4 12h16M5 21h14M6 16h12" />
            </ToolButton>
            <ToolButton
                title="Coret"
                active={editor.isActive('strike')}
                onClick={() => editor.chain().focus().toggleStrike().run()}
            >
                <Icon path="M13.5 6H10a2 2 0 00-2 2c0 .7.3 1.2.8 1.6M10 18h4a2 2 0 002-2c0-.7-.3-1.2-.8-1.6M4 6h16M4 18h16" />
            </ToolButton>
            <Divider />

            {/* Text color */}
            <div className="relative">
                <button
                    type="button"
                    title="Warna teks"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setShowColors((v) => !v)}
                    className={`text-base-content hover:bg-base-content/10 flex h-8 min-w-8 items-center justify-center rounded px-2 ${showColors ? 'bg-primary/20 text-primary' : ''}`}
                >
                    <span className="flex flex-col items-center">
                        <Icon path="M12 3l7 14h-2.5L12 8l-4.5 9H5L12 3z" />
                        <span className="bg-error h-0.5 w-3 rounded" />
                    </span>
                </button>
                {showColors && (
                    <>
                        <div
                            className="fixed inset-0 z-10"
                            onClick={() => setShowColors(false)}
                        />
                        <div className="border-base-content/15 bg-base-100 absolute top-full left-0 z-20 mt-1 grid grid-cols-4 gap-1 rounded-md border p-2 shadow-lg">
                            {TEXT_COLORS.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                        editor
                                            .chain()
                                            .focus()
                                            .setColor(c)
                                            .run();
                                        setShowColors(false);
                                    }}
                                    className="h-6 w-6 rounded border border-black/10"
                                    style={{ background: c }}
                                    title={c}
                                />
                            ))}
                            {showColors && null}
                        </div>
                    </>
                )}
            </div>
            <Divider />

            {/* Alignment */}
            <ToolButton
                title="Rata kiri"
                active={editor.isActive({ textAlign: 'left' })}
                onClick={() =>
                    editor.chain().focus().setTextAlign('left').run()
                }
            >
                <Icon path="M4 6h16M4 12h10M4 18h16" />
            </ToolButton>
            <ToolButton
                title="Rata tengah"
                active={editor.isActive({ textAlign: 'center' })}
                onClick={() =>
                    editor.chain().focus().setTextAlign('center').run()
                }
            >
                <Icon path="M4 6h16M8 12h8M4 18h16" />
            </ToolButton>
            <ToolButton
                title="Rata kanan"
                active={editor.isActive({ textAlign: 'right' })}
                onClick={() =>
                    editor.chain().focus().setTextAlign('right').run()
                }
            >
                <Icon path="M4 6h16M10 12h10M4 18h16" />
            </ToolButton>
            <ToolButton
                title="Rata tengah penuh"
                active={editor.isActive({ textAlign: 'justify' })}
                onClick={() =>
                    editor.chain().focus().setTextAlign('justify').run()
                }
            >
                <Icon path="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </ToolButton>
            <Divider />

            {/* Lists */}
            <ToolButton
                title="Daftar berpoin"
                active={editor.isActive('bulletList')}
                onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
                <Icon path="M4 6.5h2M4 12h2M4 17.5h2M9 6h11M9 12h11M9 17.5h11" />
            </ToolButton>
            <ToolButton
                title="Daftar bernomor"
                active={editor.isActive('orderedList')}
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
                <Icon path="M4 6h1m0 0v-.9M4.5 6.9H5M4 12h1m0 0v-.9M4.5 12.9H5M4 18h1m0 0v-.9M4.5 18.9H5M8 6h12M8 12h12M8 18h12" />
            </ToolButton>
            <Divider />

            {/* Link */}
            <div className="relative">
                <button
                    type="button"
                    title="Tautan"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                        const href = editor.getAttributes('link').href as
                            | string
                            | undefined;
                        const url = href
                            ? window.prompt('URL tautan:', href)
                            : window.prompt('URL tautan:');
                        if (url === null) return;
                        if (url.trim() === '') {
                            editor
                                .chain()
                                .focus()
                                .extendMarkRange('link')
                                .unsetLink()
                                .run();
                        } else {
                            editor
                                .chain()
                                .focus()
                                .extendMarkRange('link')
                                .setLink({ href: url.trim() })
                                .run();
                        }
                    }}
                    className={`text-base-content hover:bg-base-content/10 flex h-8 min-w-8 items-center justify-center rounded px-2 ${editor.isActive('link') ? 'bg-primary/20 text-primary' : ''}`}
                >
                    <Icon path="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                </button>
            </div>

            {/* Image */}
            <ToolButton title="Sisipkan gambar" onClick={onPickImages}>
                <Icon path="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A1.5 1.5 0 0021.75 19.5V4.5A1.5 1.5 0 0020.25 3H3.75A1.5 1.5 0 002.25 4.5v15A1.5 1.5 0 003.75 21zM13.5 8.25a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
            </ToolButton>
            <Divider />

            <ToolButton
                title="Urungkan"
                disabled={!editor.can().chain().focus().undo().run()}
                onClick={() => editor.chain().focus().undo().run()}
            >
                <Icon path="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </ToolButton>
            <ToolButton
                title="Ulangi"
                disabled={!editor.can().chain().focus().redo().run()}
                onClick={() => editor.chain().focus().redo().run()}
            >
                <Icon path="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
            </ToolButton>
        </div>
    );
}

interface RichTextEditorProps {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
    uploadImage?: (file: File) => Promise<string>;
}

export default function RichTextEditor({
    value,
    onChange,
    placeholder,
    uploadImage,
}: RichTextEditorProps) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [imageError, setImageError] = useState('');
    const [uploading, setUploading] = useState(false);

    const editor = useEditor({
        immediatelyRender: false,
        shouldRerenderOnTransaction: true,
        extensions: [
            StarterKit.configure({
                link: {
                    openOnClick: false,
                    HTMLAttributes: { class: 'text-primary underline' },
                },
            }),
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            TextStyle,
            Color,
            FontSize,
            ResizableImage.configure({ allowBase64: !uploadImage }),
        ],
        content: value || '',
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'landing-rich-content max-w-none min-h-96 focus:outline-none px-4 py-3 text-sm text-base-content',
            },
        },
    });

    const handleFiles = async (files: FileList | null) => {
        if (!files || !editor || files.length === 0) return;
        const file = files[0];
        setImageError('');
        if (
            !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
            file.size > 2 * 1024 * 1024
        ) {
            setImageError(
                'Gunakan JPG, PNG, atau WebP dengan ukuran maksimal 2 MB.',
            );
            return;
        }
        if (uploadImage) {
            setUploading(true);
            try {
                const src = await uploadImage(file);
                editor.chain().focus().setImage({ src, alt: file.name }).run();
            } catch (error) {
                setImageError(
                    error instanceof Error
                        ? error.message
                        : 'Gambar gagal diunggah.',
                );
            } finally {
                setUploading(false);
            }
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const src = reader.result as string;
            editor.chain().focus().setImage({ src, alt: file.name }).run();
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="border-base-content/20 bg-base-100 overflow-hidden rounded-lg border">
            {editor && (
                <Toolbar
                    editor={editor}
                    onPickImages={() => {
                        if (!uploading) fileRef.current?.click();
                    }}
                />
            )}
            <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                    handleFiles(e.target.files);
                    e.target.value = '';
                }}
            />
            {uploading && (
                <p role="status" className="text-muted px-4 py-2 text-sm">
                    Mengunggah gambar…
                </p>
            )}
            {imageError && (
                <p role="alert" className="text-error px-4 py-2 text-sm">
                    {imageError}
                </p>
            )}
            <EditorContent editor={editor} />
            {!editor && (
                <div className="text-base-content/50 px-4 py-3 text-xs">
                    {placeholder ?? 'Memuat editor...'}
                </div>
            )}
        </div>
    );
}
