import type { ReactNode } from 'react';
import { Modal as BaseModal } from '../ui';

type Props = {
    open: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    width?: string;
};

/*
 * There were two modal implementations in this tree, with two different
 * backdrops and two close buttons. This one now defers to the single
 * implementation in `components/ui`, which is built on the native <dialog>
 * element and therefore gets Escape and the focus trap from the platform.
 */
export function Modal({ open, onClose, title, children, width = 'max-w-lg' }: Props) {
    return (
        <BaseModal open={open} onClose={onClose} title={title} width={width}>
            {children}
        </BaseModal>
    );
}
