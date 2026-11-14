(function () {
  "use strict";

  var announcement = document.getElementById("store-announcement");
  var message = document.getElementById("store-announcement-message");
  if (!announcement || !message) {
    return;
  }

  var config = window.JAMES_PHONES_SUPABASE;
  if (!config || !config.url || !config.anonKey ||
      config.url.indexOf("YOUR_") !== -1 || config.anonKey.indexOf("YOUR_") !== -1) {
    console.error("Could not load the store announcement: Supabase is not configured.");
    return;
  }
  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    console.error("Could not load the store announcement: the Supabase client did not load.");
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
        .from("store_announcement")
        .select("message, is_active")
        .eq("id", 1)
        .single();
      if (result.error) {
        throw result.error;
      }
      if (!result.data) {
        throw new Error("The store announcement settings row was not found.");
      }
      var text = typeof result.data.message === "string" ? result.data.message.trim() : "";
      if (result.data.is_active && text) {
        message.textContent = text;
        announcement.hidden = false;
      }
    } catch (error) {
      console.error("Could not load the store announcement.", error);
    }
  }());
}());
