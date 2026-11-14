(function () {
  "use strict";

  var section = document.getElementById("managed-inventory");
  var productsContainer = document.getElementById("managed-products");
  var status = document.getElementById("managed-status");
  var cartCount = document.getElementById("managed-cart-count");
  var productControls = document.getElementById("managed-product-controls");
  var productSearch = document.getElementById("managed-product-search");
  var categoryList = document.getElementById("managed-category-list");
  var resultsCount = document.getElementById("managed-results-count");
  var noResults = document.getElementById("managed-no-results");
  var cartStorageKey = "james-phones-cart-v1";
  var products = [];
  var selectedCategory = "";

  function showUnavailable() {
    section.hidden = false;
    status.classList.add("error");
    status.textContent = "Live inventory is temporarily unavailable. Please contact us to check availability.";
  }

  function getSpecificationEntries(value) {
    if (Array.isArray(value)) {
      return value.map(function (line, index) {
        var text = String(line);
        var separator = text.indexOf(":");
        return separator > 0
          ? { label: text.slice(0, separator).trim(), value: text.slice(separator + 1).trim() }
          : { label: "Details " + (index + 1), value: text };
      }).filter(function (entry) {
        return entry.label && entry.value;
      });
    }
    if (value && typeof value === "object") {
      return Object.keys(value).map(function (key) {
        return { label: key, value: String(value[key] || "").trim() };
      }).filter(function (entry) {
        return entry.label && entry.value;
      });
    }
    return [];
  }

  function appendSpecificationRows(list, specifications) {
    specifications.forEach(function (specification) {
      var row = document.createElement("div");
      var label = document.createElement("dt");
      label.textContent = specification.label;
      var value = document.createElement("dd");
      value.textContent = specification.value;
      row.appendChild(label);
      row.appendChild(value);
      list.appendChild(row);
    });
  }

  function getSearchableText(product) {
    var values = [
      product.name,
      product.category,
      product.description,
      product.product_condition
    ];
    getSpecificationEntries(product.specifications).forEach(function (specification) {
      values.push(specification.label, specification.value);
    });
    return values.filter(Boolean).join(" ").toLocaleLowerCase();
  }

  function renderCategoryFilters() {
    var categories = ["Phone", "Laptop", "Accessory", "Other"];
    var additionalCategories = [];
    var knownCategories = Object.create(null);
    categories.forEach(function (category) {
      knownCategories[category.toLocaleLowerCase()] = true;
    });
    products.forEach(function (product) {
      var category = String(product.category || "").trim();
      var key = category.toLocaleLowerCase();
      if (category && !knownCategories[key]) {
        knownCategories[key] = true;
        additionalCategories.push(category);
      }
    });
    additionalCategories.sort(function (first, second) {
      return first.localeCompare(second);
    });
    categories = categories.concat(additionalCategories);

    categoryList.textContent = "";
    [{ label: "All", value: "" }].concat(categories.map(function (category) {
      return { label: category, value: category };
    })).forEach(function (item) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "managed-category-chip";
      if (item.value.toLocaleLowerCase() === selectedCategory.toLocaleLowerCase()) {
        button.classList.add("active");
      }
      button.textContent = item.label;
      button.setAttribute("aria-pressed", String(item.value.toLocaleLowerCase() === selectedCategory.toLocaleLowerCase()));
      button.addEventListener("click", function () {
        selectedCategory = item.value;
        renderCategoryFilters();
        renderFilteredProducts();
      });
      categoryList.appendChild(button);
    });
  }

  function renderFilteredProducts() {
    var searchTerm = productSearch.value.trim().toLocaleLowerCase();
    var categoryTerm = selectedCategory.toLocaleLowerCase();
    var filteredProducts = products.filter(function (product) {
      var matchesSearch = !searchTerm || getSearchableText(product).indexOf(searchTerm) !== -1;
      var matchesCategory = !categoryTerm ||
        String(product.category || "").trim().toLocaleLowerCase() === categoryTerm;
      return matchesSearch && matchesCategory;
    });

    productsContainer.textContent = "";
    filteredProducts.forEach(function (product) {
      productsContainer.appendChild(createProductCard(product));
    });
    resultsCount.textContent = "Showing " + filteredProducts.length + " of " + products.length + " products";
    noResults.hidden = filteredProducts.length !== 0;
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

  function getProductImages(product) {
    var images = Array.isArray(product.images)
      ? product.images.filter(function (image) {
        return typeof image === "string" && image.trim();
      })
      : [];
    if (!images.length && product.image_url) {
      images.push(product.image_url);
    }
    return images.slice(0, 4).map(safeImageUrl).filter(Boolean);
  }

  function getWhatsAppMessage(product) {
    var lines = [
      "Hello, I am interested in this product:",
      product.name,
      "Category: " + product.category
    ];
    if (product.product_condition) {
      lines.push("Condition: " + product.product_condition);
    }
    if (product.price !== null && Number.isFinite(Number(product.price))) {
      lines.push("Price: GH₵" + Number(product.price).toLocaleString("en-GH", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }));
    }
    if (product.description) {
      lines.push("Description: " + product.description);
    }
    var specifications = getSpecificationEntries(product.specifications);
    if (specifications.length) {
      lines.push("Specifications:");
      specifications.forEach(function (specification) {
        lines.push("- " + specification.label + ": " + specification.value);
      });
    }
    lines.push("Please let me know if it is available.");
    return lines.join("\n");
  }

  function readCart() {
    var savedCart = window.localStorage.getItem(cartStorageKey);
    if (!savedCart) {
      return [];
    }
    var cart = JSON.parse(savedCart);
    if (!Array.isArray(cart) || cart.some(function (item) {
      return !item || typeof item.id !== "string" ||
        !Number.isInteger(item.quantity) || item.quantity < 1;
    })) {
      throw new Error("The saved order is not in a valid format.");
    }
    return cart;
  }

  function updateCartCount() {
    try {
      var quantity = readCart().reduce(function (total, item) {
        return total + item.quantity;
      }, 0);
      cartCount.textContent = String(quantity);
      return true;
    } catch (error) {
      console.error("Could not read the saved order.", error);
      cartCount.textContent = "!";
      status.classList.add("error");
      status.textContent = "Your saved order could not be read. Open the order page to review it.";
      return false;
    }
  }

  function addToCart(product, feedback, addButton) {
    addButton.disabled = true;
    try {
      var cart = readCart();
      var cartItem = cart.find(function (item) {
        return item.id === String(product.id);
      });
      if (Number.isInteger(product.stock) && product.stock === 0) {
        throw new Error("This product is currently out of stock.");
      }
      if (cartItem && Number.isInteger(product.stock) && cartItem.quantity >= product.stock) {
        throw new Error("Your order already contains all available units of this product.");
      }
      if (cartItem) {
        cartItem.quantity += 1;
      } else {
        cart.push({
          id: String(product.id),
          name: product.name,
          category: product.category,
          product_condition: product.product_condition || "",
          description: product.description || "",
          specifications: product.specifications || {},
          price: Number(product.price),
          currency: product.currency || "GHS",
          stock: Number.isInteger(product.stock) ? product.stock : null,
          quantity: 1
        });
      }
      window.localStorage.setItem(cartStorageKey, JSON.stringify(cart));
      if (!updateCartCount()) {
        throw new Error("Your order was saved, but the order summary could not be updated. Open the order page to check it.");
      }
      status.classList.remove("error");
      status.textContent = "Added " + product.name + " to your order. Review your order to send it on WhatsApp.";
      feedback.classList.remove("error");
      var orderQuantity = cart.reduce(function (total, item) {
        return total + item.quantity;
      }, 0);
      feedback.textContent = product.name + " added to your order. You now have " +
        orderQuantity + (orderQuantity === 1 ? " item" : " items") +
        ". Review your order above to continue.";
      addButton.textContent = "Added to order";
      addButton.classList.add("is-added");
      window.setTimeout(function () {
        addButton.disabled = false;
        addButton.textContent = "Add another";
        addButton.classList.remove("is-added");
      }, 2200);
      return true;
    } catch (error) {
      console.error("Could not add the product to the saved order.", error);
      status.classList.add("error");
      status.textContent = error.message || "Could not save your order. Check your browser storage settings.";
      feedback.classList.add("error");
      feedback.textContent = error.message || "Could not add this product to your order.";
      addButton.disabled = false;
      return false;
    }
  }

  function createProductCard(product) {
    var column = document.createElement("div");
    column.className = "col-sm-6 col-md-4 col-lg-3 managed-product-card";
    var card = document.createElement("div");
    card.className = "box";
    var link = document.createElement("a");
    link.className = "managed-product-link";
    link.href = "https://wa.me/233596460176?text=" + encodeURIComponent(getWhatsAppMessage(product));
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    var imageBox = document.createElement("div");
    imageBox.className = "img-box";
    var placeholder = document.createElement("span");
    placeholder.className = "managed-image-placeholder";
    placeholder.textContent = "Image coming soon";
    var imageUrls = getProductImages(product);
    if (imageUrls.length) {
      var gallery = document.createElement("div");
      gallery.className = "managed-gallery-track";
      gallery.setAttribute("aria-label", product.name + " photos");
      imageUrls.forEach(function (imageUrl, index) {
        var image = document.createElement("img");
        image.src = imageUrl;
        image.alt = product.name + " photo " + (index + 1);
        image.loading = "lazy";
        image.addEventListener("error", function () {
          image.hidden = true;
          if (!gallery.querySelector("img:not([hidden])")) {
            placeholder.hidden = false;
          }
        });
        gallery.appendChild(image);
      });
      placeholder.hidden = true;
      imageBox.appendChild(gallery);
      if (imageUrls.length > 1) {
        var photoCount = document.createElement("span");
        photoCount.className = "managed-gallery-count";
        photoCount.setAttribute("aria-live", "polite");
        photoCount.textContent = "1 / " + imageUrls.length;
        var previous = document.createElement("button");
        previous.type = "button";
        previous.className = "managed-gallery-button previous";
        previous.setAttribute("aria-label", "Previous photo");
        previous.textContent = "‹";
        var next = document.createElement("button");
        next.type = "button";
        next.className = "managed-gallery-button next";
        next.setAttribute("aria-label", "Next photo");
        next.textContent = "›";
        var currentIndex = 0;
        function moveGallery(step) {
          currentIndex = (currentIndex + step + imageUrls.length) % imageUrls.length;
          gallery.style.transform = "translateX(-" + (currentIndex * 100) + "%)";
          photoCount.textContent = (currentIndex + 1) + " / " + imageUrls.length;
        }
        previous.addEventListener("click", function () {
          moveGallery(-1);
        });
        next.addEventListener("click", function () {
          moveGallery(1);
        });
        imageBox.appendChild(previous);
        imageBox.appendChild(next);
        imageBox.appendChild(photoCount);
      }
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
    if (product.product_condition) {
      var condition = document.createElement("p");
      condition.className = "product-condition";
      condition.textContent = product.product_condition;
      details.appendChild(condition);
    }

    if (product.description) {
      var description = document.createElement("p");
      description.className = "product-description";
      description.textContent = product.description;
      details.appendChild(description);
    }

    var specifications = getSpecificationEntries(product.specifications);
    if (specifications.length) {
      var visibleSpecifications = specifications.slice(0, 4);
      var specList = document.createElement("dl");
      specList.className = "product-spec-grid";
      appendSpecificationRows(specList, visibleSpecifications);
      details.appendChild(specList);
      if (specifications.length > visibleSpecifications.length) {
        var additionalDetails = document.createElement("details");
        additionalDetails.className = "product-spec-more";
        var additionalSummary = document.createElement("summary");
        additionalSummary.textContent = "See all " + specifications.length + " specifications";
        var additionalList = document.createElement("dl");
        additionalList.className = "product-spec-grid full-spec-list";
        appendSpecificationRows(additionalList, specifications.slice(visibleSpecifications.length));
        additionalDetails.appendChild(additionalSummary);
        additionalDetails.appendChild(additionalList);
        details.appendChild(additionalDetails);
      }
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
    action.textContent = "Ask on WhatsApp";
    details.appendChild(action);
    link.appendChild(details);
    card.appendChild(imageBox);
    card.appendChild(link);
    var addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "managed-cart-add";
    addButton.textContent = Number.isInteger(product.stock) && product.stock === 0
      ? "Out of stock"
      : "Add to order";
    addButton.disabled = Number.isInteger(product.stock) && product.stock === 0;
    var feedback = document.createElement("p");
    feedback.className = "managed-cart-feedback";
    feedback.setAttribute("role", "status");
    feedback.setAttribute("aria-live", "polite");
    addButton.addEventListener("click", function () {
      addToCart(product, feedback, addButton);
    });
    card.appendChild(addButton);
    card.appendChild(feedback);
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
      var client = window.JAMES_PHONES_PUBLIC_CLIENT;
      if (!client) {
        client = window.supabase.createClient(config.url, config.anonKey);
        window.JAMES_PHONES_PUBLIC_CLIENT = client;
      }
      updateCartCount();
      var result = await client
        .from("products")
        .select("id, name, category, description, product_condition, specifications, price, currency, image_url, images, stock")
        .eq("active", true)
        .order("created_at", { ascending: false });
      if (result.error) {
        console.error("Could not load live products.", result.error);
        showUnavailable();
        return;
      }
      if (!result.data || result.data.length === 0) {
        products = [];
        productSearch.addEventListener("input", renderFilteredProducts);
        productControls.hidden = false;
        renderCategoryFilters();
        status.textContent = "No products are currently available.";
        section.hidden = false;
        return;
      }

      products = result.data;
      productSearch.addEventListener("input", renderFilteredProducts);
      productControls.hidden = false;
      renderCategoryFilters();
      renderFilteredProducts();
      if (!status.classList.contains("error")) {
        status.textContent = "";
      }
      section.hidden = false;
    } catch (error) {
      console.error("Could not connect to live inventory.", error);
      showUnavailable();
    }
  }

  loadProducts();
}());
