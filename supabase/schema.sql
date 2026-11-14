-- The existing products table and its RLS policies are retained.
-- Existing product rows keep an unknown stock value until an admin sets it.
alter table public.products
  add column if not exists stock integer check (stock >= 0);
