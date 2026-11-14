# James Phones

## Storefront and inventory

The storefront reads active products from Supabase. The admin page at `admin.html` requires a Supabase Auth account that is authorized in `public.admin_users`; product changes are protected by the database's row-level security policies.

Admins can create, edit, publish, hide, and delete products; manage prices, stock, descriptions, category-specific specifications, and up to four photos; and set phone condition to Brand New, UK Used, or Fairly Used. Laptops are listed as Fairly Used. Product photos are stored in the Supabase `product-images` bucket. Unknown stock is kept unset rather than shown as zero, and blank specifications are omitted from customer listings.

Admins can also edit and show or hide a single store announcement. When enabled, it appears as a moving banner on public pages and is stored in the Supabase `store_announcement` table.

The admin page also manages the three homepage offer percentages and blog posts. Offer values are stored in `public.store_promotions` and update the displayed offer labels; they do not automatically change product prices. Blog posts are stored in `public.store_blog_posts`, and only published posts appear on the homepage and blog page. Both tables allow public reads only where needed and restrict management to users listed in `public.admin_users`.

## Orders

Customers can add live products to an order and see an on-card confirmation before reviewing the order and sending product details, specifications, and an optional contact number to WhatsApp. The site does not collect online payments. Product listings are loaded from Supabase without a hard-coded catalog fallback.

## Configuration and security

The browser uses the Supabase project URL and public publishable key from `js/supabase-config.js`. Never put a Supabase secret or service-role key in the frontend repository. Database schema, row-level security, authentication, and Storage policies are configured in the Supabase project; this repository contains the static frontend only.
