import { logOut } from "@/app/(auth)/actions";

export function LogoutButton() {
  return (
    <form action={logOut} className="px-5 pb-8">
      <button
        type="submit"
        className="flex min-h-12 items-center rounded-full border-2 border-current px-6 font-display text-lg uppercase tracking-wide"
      >
        Log out
      </button>
    </form>
  );
}
