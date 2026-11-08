import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata = { title: "Sign up | GiGmate" };

export default function SignupPage() {
  return (
    <AuthShell title="Join GiGmate" subtitle="Local musicians and venues, connected.">
      <SignupForm />
      <p className="text-base">
        Already have an account?{" "}
        <Link href="/login" className="inline-flex min-h-11 items-center font-bold text-brick underline underline-offset-4">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
