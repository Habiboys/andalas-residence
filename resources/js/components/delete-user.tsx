import { Form } from '@inertiajs/react';
import { useRef } from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';

export default function DeleteUser() {
    const dialog = useRef<HTMLDialogElement>(null);
    const passwordInput = useRef<HTMLInputElement>(null);

    return (
        <div className="space-y-6">
            <Heading
                variant="small"
                title="Delete account"
                description="Delete your account and all of its resources"
            />
            <div className="alert alert-error alert-soft">
                <div>
                    <p className="font-medium">Warning</p>
                    <p className="text-sm">
                        Please proceed with caution, this cannot be undone.
                    </p>
                </div>
                <button
                    type="button"
                    className="btn btn-error"
                    data-test="delete-user-button"
                    onClick={() => dialog.current?.showModal()}
                >
                    Delete account
                </button>
            </div>

            <dialog ref={dialog} className="modal">
                <div className="modal-box">
                    <h2 className="text-lg font-bold">
                        Are you sure you want to delete your account?
                    </h2>
                    <p className="text-base-content/70 py-4 text-sm">
                        Once your account is deleted, all of its resources and
                        data will also be permanently deleted. Please enter your
                        password to confirm you would like to permanently delete
                        your account.
                    </p>
                    <Form
                        action={ProfileController.destroy.url()}
                        method="delete"
                        options={{ preserveScroll: true }}
                        onError={() => passwordInput.current?.focus()}
                        resetOnSuccess
                        className="space-y-6"
                    >
                        {({ resetAndClearErrors, processing, errors }) => (
                            <>
                                <label
                                    className="sr-only"
                                    htmlFor="delete_user_password"
                                >
                                    Password
                                </label>
                                <PasswordInput
                                    id="delete_user_password"
                                    name="password"
                                    ref={passwordInput}
                                    placeholder="Password"
                                    autoComplete="current-password"
                                />
                                <InputError message={errors.password} />
                                <div className="modal-action">
                                    <button
                                        type="button"
                                        className="btn"
                                        onClick={() => {
                                            resetAndClearErrors();
                                            dialog.current?.close();
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-error"
                                        disabled={processing}
                                        data-test="confirm-delete-user-button"
                                    >
                                        Delete account
                                    </button>
                                </div>
                            </>
                        )}
                    </Form>
                </div>
                <form method="dialog" className="modal-backdrop">
                    <button aria-label="Close delete account dialog">
                        close
                    </button>
                </form>
            </dialog>
        </div>
    );
}
