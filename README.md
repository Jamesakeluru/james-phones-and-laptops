# James Phones

## Storefront and inventory

The storefront reads active products from Supabase. The admin page at `admin.html` requires a Supabase Auth account that is authorized in `public.admin_users`; product changes are protected by the database's row-level security policies.

Admins can create, edit, publish, hide, and delete products; manage prices, stock, descriptions, category-specific specifications, and up to four photos; and set phone condition to Brand New, UK Used, or Fairly Used. The product form narrows brand choices by category and product-name choices by brand, then suggests specifications from matching inventory while allowing new values. Phone, Laptop, and Tablet have guided specification fields; Accessories remain flexible. Admin sessions require reauthentication after 30 minutes of inactivity. Laptops are listed as Fairly Used. Product photos are stored in the Supabase `product-images` bucket. Unknown stock is kept unset rather than shown as zero, and blank specifications are omitted from customer listings.

The inventory's “Edit all prices & photos” batch editor starts with each product's saved price and gallery. Prices can be edited per item or adjusted by percentage for new phones, used phones, tablets, or laptops. Existing photos can be removed individually or all at once, and new photos can be added up to four total. Changes are staged until saved; save results identify products that could not be updated.

Public pages use the JM logo in `images/store-logo.jpg` and the generated `images/share-preview.png` for search and social link previews.

Admins can also edit and show or hide a single store announcement. When enabled, it appears as a moving banner on public pages and is stored in the Supabase `store_announcement` table. Public pages also show a phone and laptop repair contact bar with call and WhatsApp links for 0558649860.

The admin page also manages the three homepage offers, blog posts, and testimonials. Offer percentages and image URLs are stored in `public.store_promotions`; uploaded offer images use the existing `product-images` Storage bucket. Percentages update the displayed offer labels and do not automatically change product prices. Testimonials are stored in `public.store_testimonials`; admins can edit a person's name and testimonial, publish or hide it, and remove entries. Only published testimonials appear on the storefront.

## Orders

Customers can search live inventory and filter by category, new or used condition, minimum and maximum price, and price order. Product photos display uncropped in larger product cards; tapping a photo opens the original image at its native pixel size, and the admin previews link to each original file. Adding a product gives a clear on-card confirmation and briefly disables the button to prevent accidental repeat clicks. The storefront keeps a checkout button available while browsing, with quick scroll-to-top and scroll-to-bottom controls. On the order page, a persistent WhatsApp send button remains available while reviewing items. Customers can send product details, specifications, and an optional contact number to WhatsApp; the site does not collect online payments. Product listings are loaded from Supabase without a hard-coded catalog fallback.

The public pages include crawler guidance in `robots.txt`, a static-page sitemap in `sitemap.xml`, and structured business metadata on the homepage. Product-specific indexable pages and a generated product sitemap are not yet implemented.

The About page describes the shop and its phone and laptop repair services at Accra Circle.

## Database update

After the original Supabase setup, run `supabase/migrations/20261114_offer_images_and_testimonials.sql` once in the Supabase SQL Editor. It adds the three offer image URL columns, creates the testimonials table with public-read/admin-write policies, and imports the current testimonial text so the entries remain editable.

The `supabase/seeds/20261116_stock_from_shop_product_list.sql` file records the 163 inventory variants imported from the stock workbook. It uses listing prices, omits photos, and leaves quantities unknown because the workbook did not include stock counts.

## Configuration and security

The browser uses the Supabase project URL and public publishable key from `js/supabase-config.js`. Never put a Supabase secret or service-role key in the frontend repository. Database schema, row-level security, authentication, and Storage policies are configured in the Supabase project; this repository contains the static frontend only.
