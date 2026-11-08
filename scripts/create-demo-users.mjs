// Creates (or refreshes) the two demo accounts used by the one-tap demo buttons.
// Run after migrations: npm run demo:users
// Needs NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and DEMO_PASSWORD.
// Safe to run more than once.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.DEMO_PASSWORD;
if (!url || !key || !password) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or DEMO_PASSWORD.");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const demos = [
  {
    email: "demo.musician@gigmate.test",
    role: "musician",
    display_name: "Mara Quinn",
    neighborhood: "Oregon District",
    detail: {
      table: "musician_profiles",
      row: {
        genres: ["Folk", "Indie"],
        rate_min_cents: 10000,
        rate_max_cents: 25000,
        bio: "Singer-songwriter with a loop pedal and a lot of porch songs.",
        available_tonight: true,
      },
    },
  },
  {
    email: "demo.venue@gigmate.test",
    role: "venue",
    display_name: "Front Room Bar",
    neighborhood: "Downtown",
    detail: {
      table: "venue_profiles",
      row: {
        venue_type: "Bar",
        capacity: 120,
        has_pa: true,
        stage_notes: "Small corner stage, house PA and two monitors.",
        address: "100 Example Street, Dayton, OH",
      },
    },
  },
];

async function findUserId(email) {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) throw error;
  return data.users.find((u) => u.email === email)?.id;
}

for (const d of demos) {
  let id;
  const created = await admin.auth.admin.createUser({
    email: d.email,
    password,
    email_confirm: true, // skip the confirmation email for demo accounts
    user_metadata: { role: d.role, display_name: d.display_name },
  });
  if (created.error) {
    if (!/already|registered|exists/i.test(created.error.message)) throw created.error;
    id = await findUserId(d.email);
    await admin.auth.admin.updateUserById(id, { password }); // keep password in sync with DEMO_PASSWORD
  } else {
    id = created.data.user.id;
  }

  // The signup trigger made the profile. Fill it in and mark onboarding done.
  const p = await admin
    .from("profiles")
    .update({ neighborhood: d.neighborhood, onboarded_at: new Date().toISOString() })
    .eq("id", id);
  if (p.error) throw p.error;
  const q = await admin.from(d.detail.table).update(d.detail.row).eq("profile_id", id);
  if (q.error) throw q.error;
  console.log(`ready: ${d.email} (${d.role})`);
}
