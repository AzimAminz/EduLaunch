'use client';

import { useActionState, useEffect, useLayoutEffect, useRef, useTransition, type FormEvent } from 'react';

const RESET = Symbol('reset');

/**
 * Like `useActionState`, but for forms that stay on screen after saving.
 * A form given to `<form action>` is reset by React after each submit, back to the values it had when the
 * page loaded, so a saved choice would jump back to the old one. Submitting through `onSubmit` avoids that.
 *
 * With Cache Components, Next.js keeps a page the reader has left (hidden with React `<Activity>`) and shows it again
 * on return. The result of the last submit (an error, "Saved") is cleared when the page is hidden, so coming back
 * never shows a message from an earlier visit.
 */
export function useFormAction<S>(action: (previous: Awaited<S>, data: FormData) => S | Promise<S>, initial: Awaited<S>, beforeSubmit?: () => void) {
  const [state, dispatch, pending] = useActionState(
    async (previous: Awaited<S>, data: FormData | typeof RESET): Promise<Awaited<S>> => (data === RESET ? initial : await action(previous, data)),
    initial,
  );
  const [, startTransition] = useTransition();
  const hasResult = useRef(false);
  useEffect(() => {
    hasResult.current = state !== initial;
  }, [state, initial]);
  // Runs when Activity hides the page (and on unmount).
  useLayoutEffect(
    () => () => {
      if (hasResult.current) startTransition(() => dispatch(RESET));
    },
    [dispatch],
  );

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    beforeSubmit?.();
    // The button that was pressed sends its own name and value too (e.g. "save" or "submit").
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const data = new FormData(event.currentTarget, submitter);
    startTransition(() => dispatch(data));
  };
  return [state, onSubmit, pending] as const;
}
