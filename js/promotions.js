(function () {
  "use strict";

  var section = document.getElementById("store-offers");
  if (!section) {
    return;
  }

  var config = window.JAMES_PHONES_SUPABASE;
  if (!config || !config.url || !config.anonKey ||
      config.url.indexOf("YOUR_") !== -1 || config.anonKey.indexOf("YOUR_") !== -1 ||
      !window.supabase || typeof window.supabase.createClient !== "function") {
    console.error("Could not load store offers: Supabase is not configured.");
    return;
  }

  (async function () {
    try {
      var client = window.JAMES_PHONES_PUBLIC_CLIENT;
      if (!client) {
        client = window.supabase.createClient(config.url, config.anonKey);
        window.JAMES_PHONES_PUBLIC_CLIENT = client;
      }
      var result = await client
        .from("store_promotions")
        .select("offer_one_percent, offer_two_percent, offer_three_percent")
        .eq("id", 1)
        .single();
      if (result.error) {
        throw result.error;
      }
      var percentages = [
        result.data.offer_one_percent,
        result.data.offer_two_percent,
        result.data.offer_three_percent
      ];
      if (percentages.some(function (value) {
        return !Number.isInteger(value) || value < 1 || value > 100;
      })) {
        throw new Error("The store offer percentages are invalid.");
      }
      ["one", "two", "three"].forEach(function (position, index) {
        document.getElementById("offer-" + position + "-percent").textContent =
          "Up to " + percentages[index] + "% Off";
      });
      section.hidden = false;
    } catch (error) {
      console.error("Could not load store offers.", error);
    }
  }());
}());
