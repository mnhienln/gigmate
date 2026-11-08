"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { need } from "@/lib/env";
import { valuesFrom, type FormState } from "@/lib/form-state";

const signUpSchema = z.object({
  role: z.enum(["musician", "venue"], { message: "Choose whether you are a musician or a venue." }),
  display_name: z
    .string()
    .trim()
    .min(1, "Tell us your name or your venue's name.")
    .max(80, "That name is a bit long. Keep it under 80 characters."),
  email: z.string().trim().toLowerCase().email("That email does not look right."),
  password: z.string().min(8, "Use at least 8 characters for your password."),
});

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = valuesFrom(formData, ["role", "display_name", "email"]);
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, values };
  }

  const { role, display_name, email, password } = parsed.data;
  const supabase = await createClient();
  // The database trigger reads role + display_name from this metadata and
  // creates the profile row. It rejects any role other than the two valid ones.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { role, display_name } },
  });

  if (error) {
    const taken = /already|registered/i.test(error.message);
    return {
      error: taken
        ? "That email already has an account. Try logging in instead."
        : "We could not create your account. Please check your details and try again.",
      values,
    };
  }

  // If email confirmation is switched on in Supabase there is no session yet.
  if (!data.session) {
    return { message: "Almost there. Check your email and tap the confirmation link, then log in.", values };
  }
  redirect("/onboarding/1");
}

const logInSchema = z.object({
  email: z.string().trim().toLowerCase().email("That email does not look right."),
  password: z.string().min(1, "Enter your password."),
});

export async function logIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = valuesFrom(formData, ["email"]);
  const parsed = logInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message, values };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    // Same message whether the email or the password was wrong, so the form
    // does not reveal which emails have accounts.
    return { error: "That email and password do not match. Try again.", values };
  }
  redirect("/home");
}

const DEMO_EMAIL = {
  musician: "demo.musician@gigmate.test",
  venue: "demo.venue@gigmate.test",
} as const;

/** One-tap demo login. Only works when DEMO_MODE=true on the server. */
export async function demoLogIn(_prev: FormState, formData: FormData): Promise<FormState> {
  if (process.env.DEMO_MODE !== "true") return { error: "Demo login is switched off." };
  const role = formData.get("role");
  if (role !== "musician" && role !== "venue") return { error: "Pick musician or venue." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: DEMO_EMAIL[role],
    password: need(process.env.DEMO_PASSWORD, "DEMO_PASSWORD"),
  });
  if (error) {
    return { error: "The demo accounts are not set up yet. Ask the team to run the demo setup." };
  }
  redirect("/home");
}

export async function logOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
