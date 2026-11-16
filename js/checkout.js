(function () {
  "use strict";

  document.getElementById("displayYear").textContent = String(new Date().getFullYear());
  window.openNav = function () {
    document.getElementById("myNav").classList.toggle("menu_width");
    document.querySelector(".custom_menu-btn").classList.toggle("menu_btn-style");
  };

  var cartStorageKey = "james-phones-cart-v1";
  var cartList = document.getElementById("cart-items");
  var cartMessage = document.getElementById("cart-message");
  var emptyCart = document.getElementById("empty-cart");
  var orderForm = document.getElementById("order-form");
  var orderError = document.getElementById("order-error");
  var sendButton = document.getElementById("send-order-button");
  var cartTotal = document.getElementById("cart-total");
  var stickyAction = document.getElementById("checkout-sticky-action");
  var stickyCount = document.getElementById("checkout-sticky-count");
  var stickyTotal = document.getElementById("checkout-sticky-total");
  var stickySendButton = document.getElementById("send-order-sticky-button");
  var fallbackLink = document.getElementById("whatsapp-fallback");

  function readCart() {
    var savedCart = window.localStorage.getItem(cartStorageKey);
    if (!savedCart) {
      return [];
    }
    var cart = JSON.parse(savedCart);
    if (!Array.isArray(cart) || cart.some(function (item) {
      return !item || typeof item.id !== "string" ||
        typeof item.name !== "string" || !item.name.trim() ||
        !Number.isInteger(item.quantity) || item.quantity < 1 ||
        !Number.isFinite(Number(item.price)) || Number(item.price) < 0 ||
        (item.stock !== null && item.stock !== undefined &&
          (!Number.isInteger(item.stock) || item.stock < 0));
    })) {
      throw new Error("The saved order contains invalid product data. Remove it and add the product again.");
    }
    return cart;
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

  function formatPrice(value, currency) {
    var amount = Number(value).toLocaleString("en-GH", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
    return currency === "GHS" || !currency ? "GH₵" + amount : currency + " " + amount;
  }

  function saveCart(cart) {
    window.localStorage.setItem(cartStorageKey, JSON.stringify(cart));
    renderCart();
  }

  function changeQuantity(productId, amount) {
    try {
      var cart = readCart();
      var item = cart.find(function (product) {
        return product.id === productId;
      });
      if (!item) {
        return;
      }
      var quantity = item.quantity + amount;
      if (quantity < 1) {
        return;
      }
      if (Number.isInteger(item.stock) && quantity > item.stock) {
        cartMessage.textContent = "The requested quantity is greater than the currently listed stock.";
        return;
      }
      item.quantity = quantity;
      saveCart(cart);
    } catch (error) {
      showCartError(error);
    }
  }

  function removeProduct(productId) {
    try {
      saveCart(readCart().filter(function (item) {
        return item.id !== productId;
      }));
    } catch (error) {
      showCartError(error);
    }
  }

  function showCartError(error) {
    console.error("Could not read or update the order.", error);
    cartMessage.textContent = error.message || "Could not read or update your order.";
    cartMessage.classList.add("checkout-error");
    sendButton.disabled = true;
    stickySendButton.disabled = true;
    stickyAction.hidden = true;
    document.body.classList.remove("has-checkout-sticky-action");
  }

  function renderCart() {
    cartList.replaceChildren();
    cartMessage.textContent = "";
    cartMessage.classList.remove("checkout-error");
    orderError.textContent = "";
    orderError.hidden = true;
    fallbackLink.hidden = true;

    var cart;
    try {
      cart = readCart();
    } catch (error) {
      showCartError(error);
      emptyCart.hidden = true;
      cartTotal.textContent = "—";
      return;
    }

    var quantity = cart.reduce(function (total, item) {
      return total + item.quantity;
    }, 0);
    cartMessage.textContent = quantity
      ? quantity + (quantity === 1 ? " item in your order" : " items in your order")
      : "Your order is empty.";
    emptyCart.hidden = quantity > 0;
    sendButton.disabled = quantity === 0;
    stickyCount.textContent = quantity + (quantity === 1 ? " item" : " items") + " in your order";
    stickySendButton.disabled = quantity === 0;
    stickyAction.hidden = quantity === 0;
    document.body.classList.toggle("has-checkout-sticky-action", quantity > 0);

    var total = 0;
    cart.forEach(function (product) {
      var item = document.createElement("li");
      item.className = "checkout-item";
      var details = document.createElement("div");
      details.className = "checkout-item-details";
      var name = document.createElement("h2");
      name.textContent = product.name;
      var category = document.createElement("p");
      category.className = "checkout-item-category";
      category.textContent = product.category || "Product";
      if (product.product_condition) {
        category.textContent += " · " + product.product_condition;
      }
      details.appendChild(name);
      details.appendChild(category);

      if (product.description) {
        var description = document.createElement("p");
        description.className = "checkout-item-description";
        description.textContent = product.description;
        details.appendChild(description);
      }

      var specifications = getSpecificationEntries(product.specifications);
      if (specifications.length) {
        var specList = document.createElement("dl");
        specList.className = "checkout-item-specs";
        specifications.forEach(function (specification) {
          var row = document.createElement("div");
          var label = document.createElement("dt");
          label.textContent = specification.label;
          var value = document.createElement("dd");
          value.textContent = specification.value;
          row.appendChild(label);
          row.appendChild(value);
          specList.appendChild(row);
        });
        details.appendChild(specList);
      }

      var price = Number(product.price);
      var subtotal = price * product.quantity;
      total += subtotal;
      var quantityControls = document.createElement("div");
      quantityControls.className = "checkout-quantity";
      var decreaseButton = document.createElement("button");
      decreaseButton.type = "button";
      decreaseButton.textContent = "−";
      decreaseButton.setAttribute("aria-label", "Remove one " + product.name);
      decreaseButton.disabled = product.quantity <= 1;
      decreaseButton.addEventListener("click", function () {
        changeQuantity(product.id, -1);
      });
      var quantityText = document.createElement("span");
      quantityText.textContent = String(product.quantity);
      var increaseButton = document.createElement("button");
      increaseButton.type = "button";
      increaseButton.textContent = "+";
      increaseButton.setAttribute("aria-label", "Add one " + product.name);
      increaseButton.disabled = Number.isInteger(product.stock) && product.quantity >= product.stock;
      increaseButton.addEventListener("click", function () {
        changeQuantity(product.id, 1);
      });
      quantityControls.appendChild(decreaseButton);
      quantityControls.appendChild(quantityText);
      quantityControls.appendChild(increaseButton);

      var itemFooter = document.createElement("div");
      itemFooter.className = "checkout-item-footer";
      var subtotalText = document.createElement("strong");
      subtotalText.textContent = formatPrice(subtotal, product.currency);
      var removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "checkout-remove";
      removeButton.textContent = "Remove";
      removeButton.addEventListener("click", function () {
        removeProduct(product.id);
      });
      itemFooter.appendChild(quantityControls);
      itemFooter.appendChild(subtotalText);
      itemFooter.appendChild(removeButton);

      var unitPrice = document.createElement("p");
      unitPrice.className = "checkout-unit-price";
      unitPrice.textContent = formatPrice(price, product.currency) + " each";
      item.appendChild(details);
      item.appendChild(unitPrice);
      item.appendChild(itemFooter);
      cartList.appendChild(item);
    });

    var formattedTotal = formatPrice(total, "GHS");
    cartTotal.textContent = formattedTotal;
    stickyTotal.textContent = formattedTotal;
  }

  orderForm.addEventListener("submit", function (event) {
    event.preventDefault();
    orderError.textContent = "";
    orderError.hidden = true;
    try {
      var cart = readCart();
      if (!cart.length) {
        throw new Error("Add at least one product before sending your order.");
      }
      var lines = ["Hello, I would like to place an order."];
      var customerName = orderForm.elements.customer_name.value.trim();
      var customerPhone = orderForm.elements.customer_phone.value.trim();
      if (customerName) {
        lines.push("Name: " + customerName);
      }
      if (customerPhone) {
        lines.push("Contact number: " + customerPhone);
      }
      lines.push("", "Order details:");
      var total = 0;
      cart.forEach(function (product, index) {
        var price = Number(product.price);
        var subtotal = price * product.quantity;
        total += subtotal;
        lines.push(
          "",
          (index + 1) + ". " + product.name + " × " + product.quantity,
          "Category: " + (product.category || "Product")
        );
        if (product.product_condition) {
          lines.push("Condition: " + product.product_condition);
        }
        if (product.description) {
          lines.push("Description: " + product.description);
        }
        lines.push(
          "Unit price: " + formatPrice(price, product.currency),
          "Subtotal: " + formatPrice(subtotal, product.currency)
        );
        var specifications = getSpecificationEntries(product.specifications);
        if (specifications.length) {
          lines.push("Specifications:");
          specifications.forEach(function (specification) {
            lines.push("- " + specification.label + ": " + specification.value);
          });
        }
      });
      lines.push("", "Order total: " + formatPrice(total, "GHS"));
      lines.push("Please confirm availability and delivery details.");
      var whatsappUrl = "https://wa.me/233596460176?text=" + encodeURIComponent(lines.join("\n"));
      fallbackLink.href = whatsappUrl;
      fallbackLink.hidden = false;
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      orderError.textContent = error.message || "Could not prepare your order. Please try again.";
      orderError.hidden = false;
    }
  });

  window.addEventListener("storage", function (event) {
    if (event.key === cartStorageKey) {
      renderCart();
    }
  });

  renderCart();
}());
