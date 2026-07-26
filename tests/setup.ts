import { config } from "dotenv";

// Local Supabase credentials (npm run db:start && npm run db:env).
config({ path: ".env.local" });

if (
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY
) {
  throw new Error(
    "Tests need a running local Supabase stack: npm run db:start && npm run db:env"
  );
}
