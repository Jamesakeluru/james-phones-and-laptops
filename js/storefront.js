(function () {
  "use strict";

  var section = document.getElementById("managed-inventory");
  var productsContainer = document.getElementById("managed-products");
  var status = document.getElementById("managed-status");

  function showUnavailable() {
    section.hidden = false;
    status.classList.add("error");
    status.textContent = "Live inventory is temporarily unavailable. Please contact us to check availability.";
  }

  function getSpecifications(value) {
    if (Array.isArray(value)) {
      return value.map(String);
    }
    if (value && typeof value === "object") {
      return Object.keys(value).map(function (key) {
        return key + ": " + String(value[key]);
      });
    }
    return [];
  }

  function safeImageUrl(value) {
    if (typeof value !== "string" || !value.trim()) {
      return null;
    }
    try {
      var url = new URL(value, window.location.href);
      if (url.protocol === "https:" ||
          (url.origin === window.location.origin && url.protocol === window.location.protocol)) {
        return url.href;
      }
    } catch (error) {
      console.warn("Skipping an invalid product image URL.");
    }
    return null;
  }

  function createProductCard(product) {
    var column = document.createElement("div");
    column.className = "col-sm-6 col-md-4 col-lg-3 managed-product-card";
    var card = document.createElement("div");
    card.className = "box";
    var link = document.createElement("a");
    link.href = "https://wa.me/233596460176?text=" +
      encodeURIComponent("Hello, I am interested in " + product.name + ".");
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    var imageBox = document.createElement("div");
    imageBox.className = "img-box";
    var placeholder = document.createElement("span");
    placeholder.className = "managed-image-placeholder";
    placeholder.textContent = "Image coming soon";
    var imageUrl = safeImageUrl(product.image_url);
    if (imageUrl) {
      var image = document.createElement("img");
      image.src = imageUrl;
      image.alt = product.name;
      image.loading = "lazy";
      image.addEventListener("error", function () {
        image.hidden = true;
        placeholder.hidden = false;
      });
      placeholder.hidden = true;
      imageBox.appendChild(image);
    }
    imageBox.appendChild(placeholder);

    var details = document.createElement("div");
    details.className = "detail-box";
    var category = document.createElement("p");
    category.className = "product-category";
    category.textContent = product.category;
    var name = document.createElement("h3");
    name.className = "product-name";
    name.textContent = product.name;
    details.appendChild(category);
    details.appendChild(name);

    if (product.description) {
      var description = document.createElement("p");
      description.className = "product-description";
      description.textContent = product.description;
      details.appendChild(description);
    }

    var specifications = getSpecifications(product.specifications);
    if (specifications.length) {
      var specList = document.createElement("ul");
      specList.className = "product-specs";
      specifications.forEach(function (specification) {
        var item = document.createElement("li");
        item.textContent = specification;
        specList.appendChild(item);
      });
      details.appendChild(specList);
    }

    var currency = product.currency === "GHS" ? "₵" : (product.currency || "GHS") + " ";
    var priceValue = Number(product.price);
    if (Number.isFinite(priceValue)) {
      var price = document.createElement("p");
      price.className = "product-price";
      price.appendChild(document.createTextNode("Price "));
      var priceAmount = document.createElement("strong");
      priceAmount.textContent = currency + priceValue.toLocaleString("en-GH", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      });
      price.appendChild(priceAmount);
      details.appendChild(price);
    }

    if (Number.isInteger(product.stock)) {
      var stock = document.createElement("p");
      stock.className = "product-stock";
      if (product.stock === 0) {
        stock.classList.add("out-of-stock");
        stock.textContent = "Currently out of stock";
      } else {
        stock.textContent = product.stock <= 3
          ? "Only " + product.stock + " left"
          : "In stock";
      }
      details.appendChild(stock);
    }

    var action = document.createElement("span");
    action.className = "product-cta";
    action.textContent = "Ask about this item";
    details.appendChild(action);
    link.appendChild(imageBox);
    link.appendChild(details);
    card.appendChild(link);
    column.appendChild(card);
    return column;
  }

  async function loadProducts() {
    var config = window.JAMES_PHONES_SUPABASE;
    if (!config || !config.url || !config.anonKey ||
        config.url.indexOf("YOUR_") !== -1 || config.anonKey.indexOf("YOUR_") !== -1 ||
        !window.supabase || typeof window.supabase.createClient !== "function") {
      showUnavailable();
      return;
    }

    try {
      var client = window.supabase.createClient(config.url, config.anonKey);
      var result = await client
        .from("products")
        .select("id, name, category, description, specifications, price, currency, image_url, stock")
        .eq("active", true)
        .order("created_at", { ascending: false });
      if (result.error) {
        console.error("Could not load live products.", result.error);
        showUnavailable();
        return;
      }
      if (!result.data || result.data.length === 0) {
        return;
      }

      result.data.forEach(function (product) {
        productsContainer.appendChild(createProductCard(product));
      });
      status.textContent = "";
      section.hidden = false;
    } catch (error) {
      console.error("Could not connect to live inventory.", error);
      showUnavailable();
    }
  }

  loadProducts();
}());
