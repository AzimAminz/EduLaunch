'use client';

import { useActionState, useTransition, type FormEvent } from 'react';

/**
 * Like `useActionState`, but for forms that stay on screen after saving.
 * A form given to `<form action>` is reset by React after each submit, back to the values it had when the
 * page loaded, so a saved choice would jump back to the old one. Submitting through `onSubmit` avoids that.
 */
export function useFormAction<S>(action: (previous: Awaited<S>, data: FormData) => S | Promise<S>, initial: Awaited<S>, beforeSubmit?: () => void) {
  const [state, dispatch, pending] = useActionState(action, initial);
  const [, startTransition] = useTransition();
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    beforeSubmit?.();
    const data = new FormData(event.currentTarget);
    startTransition(() => dispatch(data));
  };
  return [state, onSubmit, pending] as const;
}
