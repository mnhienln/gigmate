/* role="alert" makes screen readers announce the message when it appears. */
export function FormMessage({ error, message }: { error?: string; message?: string }) {
  if (!error && !message) return null;
  return (
    <p
      role={error ? "alert" : "status"}
      className={`rounded-xl border-2 px-4 py-3 text-base ${
        error ? "border-brick bg-brick/10 text-brick" : "border-ink bg-ink/5"
      }`}
    >
      {error ?? message}
    </p>
  );
}
