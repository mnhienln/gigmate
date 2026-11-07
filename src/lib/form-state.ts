/** What a server action hands back to a form: a message and the values to keep. */
export type FormState = {
  error?: string;
  message?: string;
  values?: Record<string, string>;
};

export function valuesFrom(formData: FormData, keys: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of keys) {
    const v = formData.get(key);
    if (typeof v === "string") out[key] = v;
  }
  return out;
}
