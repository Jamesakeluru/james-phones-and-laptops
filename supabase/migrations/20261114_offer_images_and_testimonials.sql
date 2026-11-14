alter table public.store_promotions
  add column if not exists offer_one_image_url text,
  add column if not exists offer_two_image_url text,
  add column if not exists offer_three_image_url text;

create table if not exists public.store_testimonials (
  id uuid primary key default gen_random_uuid(),
  person_name text not null check (char_length(btrim(person_name)) between 1 and 100),
  testimonial_text text not null check (char_length(btrim(testimonial_text)) between 1 and 2000),
  is_published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.store_testimonials enable row level security;

drop policy if exists "Public can read published testimonials" on public.store_testimonials;
create policy "Public can read published testimonials"
  on public.store_testimonials
  for select
  to anon, authenticated
  using (is_published or public.is_site_admin());

drop policy if exists "Store admins can manage testimonials" on public.store_testimonials;
create policy "Store admins can manage testimonials"
  on public.store_testimonials
  for all
  to authenticated
  using (public.is_site_admin())
  with check (public.is_site_admin());

grant select on public.store_testimonials to anon, authenticated;
grant insert, update, delete on public.store_testimonials to authenticated;

insert into public.store_testimonials (
  person_name,
  testimonial_text,
  is_published,
  sort_order
)
select seed.person_name, seed.testimonial_text, true, seed.sort_order
from (values
  (
    'Kelinza Mary',
    'I recently purchased a smartphone from James Phones, and I couldn''t be happier with the experience. As a tech enthusiast, I value detailed knowledge and excellent customer service. James provided insightful recommendations and made the entire purchasing process seamless. The phone arrived quickly and in perfect condition. I''m impressed with the quality and the competitive pricing. Highly recommend James Phones for anyone looking for top-notch tech products!',
    1
  ),
  (
    'Akeluru Vera',
    'I purchased a new smartphone from James Phones, and the experience was fantastic. James took the time to understand my needs and recommended the perfect phone for my business. The transaction was smooth, and the delivery was swift. The customer service was exceptional, and I felt valued as a customer. I highly recommend James Phones to anyone looking for reliable and professional service.',
    2
  ),
  (
    'Hawa...',
    'As a fellow student, I appreciate the affordability and quality of the phones available at James Phones. I bought a phone that fits my budget and meets all my academic and personal needs. James was incredibly helpful and knowledgeable, making the purchase easy and stress-free. I''m thrilled with my new phone and the excellent customer support. Thanks, James Phones!',
    3
  )
) as seed(person_name, testimonial_text, sort_order)
where not exists (
  select 1
  from public.store_testimonials
);
