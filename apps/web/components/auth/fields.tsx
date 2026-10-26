'use client';

import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { Icon } from '@/components/ui/icon';

const INPUT = 'w-full rounded-[10px] border bg-white px-4 py-3.5 text-[15px] text-navy placeholder:text-muted/80 outline-none focus:border-navy focus:ring-2 focus:ring-navy/15';

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  name: string;
  label: string;
  error?: string;
  hint?: string;
  trailing?: ReactNode;
}

/** A labelled input. Errors are announced and linked to the input, so screen readers read them too. */
export function TextField({ label, error, hint, trailing, ...input }: FieldProps) {
  const id = useId();
  const noteId = `${id}-note`;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? noteId : undefined}
          className={`${INPUT} ${error ? 'border-red' : 'border-[#9aa3b2]'} ${trailing ? 'pr-24' : ''}`}
          {...input}
        />
        {trailing && <div className="absolute inset-y-0 right-3 flex items-center">{trailing}</div>}
      </div>
      {(error || hint) && (
        <p id={noteId} className={`text-[13px] leading-tight ${error ? 'text-red' : 'text-muted'}`}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

/** Password input with a "Show" / "Hide" switch, as in the Figma screens. */
export function PasswordField({ showLabel, hideLabel, ...props }: FieldProps & { showLabel: string; hideLabel: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      trailing={
        <button type="button" onClick={() => setVisible((v) => !v)} aria-pressed={visible} className="rounded-md px-2 py-1 text-[13px] font-semibold text-[#2f5bd3] hover:bg-blue">
          {visible ? hideLabel : showLabel}
        </button>
      }
    />
  );
}

/** Main navy button. Shows that the form is being sent and cannot be pressed twice. */
export function SubmitButton({ children, icon }: { children: ReactNode; icon?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-navy px-5 py-3.5 text-base font-semibold text-white hover:bg-navy/90 disabled:cursor-wait disabled:opacity-70"
    >
      {icon && <Icon src={icon} size={20} />}
      {children}
    </button>
  );
}

export function FormAlert({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-[10px] border border-red/40 bg-red/10 px-4 py-3 text-sm font-medium text-navy">
      {children}
    </p>
  );
}
