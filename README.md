# James Phones

## Storefront and inventory

The storefront reads active products from Supabase. The admin page at `admin.html` requires a Supabase Auth account that is authorized in `public.admin_users`; product changes are protected by the database's row-level security policies.

Admins can create, edit, publish, hide, and delete products; manage prices, stock, descriptions, specifications, and up to four photos; and set phone condition to Brand New, UK Used, or Fairly Used. Laptops are listed as Fairly Used. Product photos are stored in the Supabase `product-images` bucket.

## Orders

Customers can add live products to an order and send product details, specifications, and an optional contact number to WhatsApp. The site does not collect online payments. Older catalog listings also open a WhatsApp inquiry.

## Configuration and security

The browser uses the Supabase project URL and public publishable key from `js/supabase-config.js`. Never put a Supabase secret or service-role key in the frontend repository. Database schema, row-level security, authentication, and Storage policies are configured in the Supabase project; this repository contains the static frontend only.
