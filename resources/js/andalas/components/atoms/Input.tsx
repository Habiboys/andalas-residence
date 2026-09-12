import type { InputHTMLAttributes } from 'react';

/*
 * One definition of a text field, shared with `inputClass`. It used to carry its
 * own border, background and focus ring in hardcoded brand colours, which is how
 * a second field style appears in a codebase.
 */
export const atomInputClass = 'input w-full';

export function AtomInput({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
    return <input className={`${atomInputClass} ${className}`} {...props} />;
}
