(function () {
  "use strict";

  var section = document.getElementById("store-testimonials");
  var carousel = document.getElementById("carouselExample2Controls");
  var carouselItems = document.getElementById("testimonial-carousel-items");
  var controls = document.getElementById("testimonial-controls");
  if (!section || !carousel || !carouselItems || !controls) {
    return;
  }

  var config = window.JAMES_PHONES_SUPABASE;
  if (!config || !config.url || !config.anonKey ||
      config.url.indexOf("YOUR_") !== -1 || config.anonKey.indexOf("YOUR_") !== -1 ||
      !window.supabase || typeof window.supabase.createClient !== "function") {
    console.error("Could not load testimonials: Supabase is not configured.");
    return;
  }

  function initialsFor(name) {
    return name.trim().split(/\s+/).slice(0, 2).map(function (part) {
      return part.charAt(0);
    }).join("").toUpperCase();
  }

  function createSlide(testimonial, index) {
    var item = document.createElement("div");
    item.className = "carousel-item" + (index === 0 ? " active" : "");

    var row = document.createElement("div");
    row.className = "row";
    var column = document.createElement("div");
    column.className = "col-md-11 col-lg-10 mx-auto";
    var box = document.createElement("div");
    box.className = "box";

    var avatar = document.createElement("div");
    avatar.className = "img-box testimonial-avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = initialsFor(testimonial.person_name);

    var details = document.createElement("div");
    details.className = "detail-box";
    var name = document.createElement("div");
    name.className = "name";
    var heading = document.createElement("h6");
    heading.textContent = testimonial.person_name;
    name.appendChild(heading);
    var text = document.createElement("p");
    text.textContent = testimonial.testimonial_text;
    var quote = document.createElement("i");
    quote.className = "fa fa-quote-left";
    quote.setAttribute("aria-hidden", "true");

    details.appendChild(name);
    details.appendChild(text);
    details.appendChild(quote);
    box.appendChild(avatar);
    box.appendChild(details);
    column.appendChild(box);
    row.appendChild(column);
    item.appendChild(row);
    return item;
  }

  (async function () {
    try {
      var client = window.JAMES_PHONES_PUBLIC_CLIENT;
      if (!client) {
        client = window.supabase.createClient(config.url, config.anonKey);
        window.JAMES_PHONES_PUBLIC_CLIENT = client;
      }
      var result = await client
        .from("store_testimonials")
        .select("person_name, testimonial_text")
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (result.error) {
        throw result.error;
      }

      var publishedTestimonials = result.data || [];
      if (!publishedTestimonials.length) {
        return;
      }
      carouselItems.replaceChildren();
      publishedTestimonials.forEach(function (testimonial, index) {
        carouselItems.appendChild(createSlide(testimonial, index));
      });
      controls.hidden = publishedTestimonials.length < 2;
      section.hidden = false;

      if (window.jQuery && typeof window.jQuery.fn.carousel === "function") {
        window.jQuery(carousel).carousel(publishedTestimonials.length > 1
          ? { interval: 6000, ride: "carousel" }
          : { interval: false });
      } else if (publishedTestimonials.length > 1) {
        console.error("Could not initialize testimonial navigation: the carousel library did not load.");
      }
    } catch (error) {
      console.error("Could not load testimonials.", error);
    }
  }());
}());
