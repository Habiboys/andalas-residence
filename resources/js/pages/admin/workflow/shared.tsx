import { ConfirmDialog, Button, inputClass } from '@/andalas/components/ui';
import { Form } from '@inertiajs/react';
import { useRef, useState, type ReactNode } from 'react';

export const fieldInputClass = inputClass;

export function WorkflowPanel({
    title,
    subtitle,
    children,
}: {
    title: string;
    subtitle?: string;
    children: ReactNode;
}) {
    return (
        <section className="card border-base-300 bg-base-100 space-y-4 border p-5 shadow-xs">
            <div className="space-y-0.5">
                <h2 className="text-lg font-semibold">{title}</h2>
                {subtitle && (
                    <p className="text-base-content/70 text-xs">{subtitle}</p>
                )}
            </div>
            {children}
        </section>
    );
}

export function Field({
    name,
    label,
    type = 'text',
    value,
    required = true,
    children,
}: {
    name: string;
    label: string;
    type?: string;
    value?: string;
    required?: boolean;
    children?: ReactNode;
}) {
    return (
        <label className="block space-y-1 text-sm">
            <span className="font-medium">{label}</span>
            {children ?? (
                <input
                    className={
                        type === 'file'
                            ? 'file-input file-input-bordered w-full'
                            : fieldInputClass
                    }
                    name={name}
                    type={type}
                    defaultValue={value}
                    required={required}
                    step={type === 'number' ? '0.01' : undefined}
                />
            )}
        </label>
    );
}

export function ConfirmCheckbox({
    name,
    children,
}: {
    name: string;
    children: ReactNode;
}) {
    return (
        <label className="flex items-start gap-2 text-sm">
            <input
                className="checkbox checkbox-sm mt-0.5"
                type="checkbox"
                name={name}
                value="1"
                required
            />
            <span>{children}</span>
        </label>
    );
}

export function ActionForm({
    url,
    label,
    children,
    onSuccess,
    disabled = false,
    confirmTitle,
    confirmMessage,
}: {
    url: string;
    label: string;
    onSuccess?: () => void;
    disabled?: boolean;
    confirmTitle?: string;
    confirmMessage?: string;
    children?: ReactNode;
}) {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const submitBtnRef = useRef<HTMLButtonElement>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);

    function handleTriggerClick() {
        const form = wrapperRef.current?.querySelector('form');
        if (form && !form.reportValidity()) {
            return;
        }
        setConfirmOpen(true);
    }

    return (
        <div ref={wrapperRef}>
            <Form
                action={url}
                onSuccess={onSuccess}
                method="post"
                options={{ preserveScroll: true }}
                className="space-y-3"
            >
                {({ errors, processing, recentlySuccessful }) => (
                    <>
                        {children}

                        {Object.entries(errors).map(([key, message]) => (
                            <p
                                key={key}
                                role="alert"
                                className="text-error text-sm font-medium"
                            >
                                {message}
                            </p>
                        ))}

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                            {confirmMessage ? (
                                <>
                                    <Button
                                        type="button"
                                        size="sm"
                                        disabled={processing || disabled}
                                        onClick={handleTriggerClick}
                                    >
                                        {processing ? 'Menyimpan…' : label}
                                    </Button>
                                    <button
                                        ref={submitBtnRef}
                                        type="submit"
                                        className="hidden"
                                        aria-hidden="true"
                                        tabIndex={-1}
                                    />
                                </>
                            ) : (
                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={processing || disabled}
                                >
                                    {processing ? 'Menyimpan…' : label}
                                </Button>
                            )}

                            {recentlySuccessful && (
                                <span className="text-success text-sm font-medium">
                                    Tersimpan
                                </span>
                            )}
                        </div>
                    </>
                )}
            </Form>

            {confirmOpen && (
                <ConfirmDialog
                    open
                    onClose={() => setConfirmOpen(false)}
                    onConfirm={() => {
                        setConfirmOpen(false);
                        submitBtnRef.current?.click();
                    }}
                    title={confirmTitle ?? 'Konfirmasi Tindakan'}
                    message={confirmMessage ?? 'Apakah Anda yakin ingin menyimpan tindakan ini?'}
                    confirmLabel="Ya, Lanjutkan"
                />
            )}
        </div>
    );
}
