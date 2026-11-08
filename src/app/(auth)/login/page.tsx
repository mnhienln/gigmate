import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { DemoButtons } from "@/components/auth/demo-buttons";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "Log in | GigMate" };

export default function LoginPage() {
  return (
    <AuthShell title="Welcome back" subtitle="Log in to find gigs or fill your calendar.">
      <LoginForm />
      <p className="text-base">
        New here?{" "}
        <Link href="/signup" className="inline-flex min-h-11 items-center font-bold text-brick underline underline-offset-4">
          Create an account
        </Link>
      </p>
      {process.env.DEMO_MODE === "true" && <DemoButtons />}
    </AuthShell>
  );
}
