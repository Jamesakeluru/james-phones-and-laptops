# James-Phones

## Live inventory

The storefront reads active products from Supabase and keeps the existing static catalog available as a fallback. The admin page requires a Supabase Auth user listed in `public.admin_users`; database access remains protected by the project's existing row-level security policies.

The browser uses the project's public publishable key from `js/supabase-config.js`. Never put a Supabase secret or service-role key in this repository. `supabase/schema.sql` adds the nullable stock field used by the admin inventory; existing products keep stock unset until an admin enters it.