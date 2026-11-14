(function () {
  "use strict";

  var products = [];
  var editingId = null;
  var client = null;

  var authScreen = document.getElementById("auth-screen");
  var adminShell = document.getElementById("admin-shell");
  var authMessage = document.getElementById("auth-message");
  var loginForm = document.getElementById("login-form");
  var loginButton = document.getElementById("login-button");
  var list = document.getElementById("product-list");
  var search = document.getElementById("product-search");
  var categoryFilter = document.getElementById("category-filter");
  var emptyState = document.getElementById("empty-state");
  var dialog = document.getElementById("product-dialog");
  var form = document.getElementById("product-form");
  var formError = document.getElementById("form-error");
  var notice = document.getElementById("database-notice");

  function setNotice(message, isError) {
    notice.textContent = message;
    notice.classList.toggle("error", Boolean(isError));
  }

  function showAuth(message, isError) {
    adminShell.hidden = true;
    authScreen.hidden = false;
    authMessage.textContent = message || "";
    authMessage.classList.toggle("visible", Boolean(message));
    authMessage.classList.toggle("error", Boolean(isError));
  }

  function showAdmin() {
    authScreen.hidden = true;
    adminShell.hidden = false;
  }

  function reportError(error, action) {
    console.error(action, error);
    setNotice(action + " Please try again. " + (error && error.message ? error.message : ""), true);
  }

  async function loadProducts() {
    setNotice("Loading inventory from the database...", false);
    try {
      var result = await client
        .from("products")
        .select("id, name, category, price, stock, specifications")
        .order("created_at", { ascending: false });
      if (result.error) {
        reportError(result.error, "Could not load inventory.");
        return false;
      }

      products = result.data.map(function (product) {
        return Object.assign({}, product, {
          price: Number(product.price),
          specifications: specificationLines(product.specifications)
        });
      });
      setNotice("Connected. Inventory changes are saved to the store database.", false);
      render();
      return true;
    } catch (error) {
      reportError(error, "Could not load inventory.");
      return false;
    }
  }

  function specificationLines(value) {
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

  function parseSpecifications(text) {
    var lines = text.split(/\r?\n/).map(function (line) {
      return line.trim();
    }).filter(Boolean);
    var specifications = {};
    for (var index = 0; index < lines.length; index += 1) {
      var separator = lines[index].indexOf(":");
      if (separator <= 0 || !lines[index].slice(separator + 1).trim()) {
        throw new Error("Write each specification as “Name: value”, one per line.");
      }
      var key = lines[index].slice(0, separator).trim();
      var value = lines[index].slice(separator + 1).trim();
      if (Object.prototype.hasOwnProperty.call(specifications, key)) {
        throw new Error("Each specification name must be unique.");
      }
      Object.defineProperty(specifications, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    }
    return specifications;
  }

  function createCell(text, className) {
    var cell = document.createElement("td");
    cell.textContent = text;
    if (className) {
      cell.className = className;
    }
    return cell;
  }

  function render() {
    var query = search.value.trim().toLowerCase();
    var category = categoryFilter.value;
    var filtered = products.filter(function (product) {
      var searchable = product.name + " " + product.specifications.join(" ");
      var matchesQuery = searchable.toLowerCase().indexOf(query) !== -1;
      var matchesCategory = category === "all" || product.category === category;
      return matchesQuery && matchesCategory;
    });

    list.replaceChildren();
    filtered.forEach(function (product) {
      var row = document.createElement("tr");
      var productCell = document.createElement("td");
      var name = document.createElement("span");
      name.className = "product-name";
      name.textContent = product.name;
      productCell.appendChild(name);
      row.appendChild(productCell);
      row.appendChild(createCell(product.category, "product-category"));
      row.appendChild(createCell("GH₵" + product.price.toLocaleString("en-GH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }), "price"));
      var stockIsKnown = Number.isInteger(product.stock);
      row.appendChild(createCell(stockIsKnown ? String(product.stock) : "Not set", "stock-pill"));

      var specsCell = document.createElement("td");
      if (product.specifications.length) {
        var specs = document.createElement("details");
        specs.className = "specs-details";
        var summary = document.createElement("summary");
        summary.textContent = "View (" + product.specifications.length + ")";
        var specsList = document.createElement("ul");
        product.specifications.forEach(function (specification) {
          var item = document.createElement("li");
          item.textContent = specification;
          specsList.appendChild(item);
        });
        specs.appendChild(summary);
        specs.appendChild(specsList);
        specsCell.appendChild(specs);
      } else {
        specsCell.textContent = "—";
      }
      row.appendChild(specsCell);

      var statusCell = document.createElement("td");
      var status = document.createElement("span");
      status.className = "status-pill";
      if (!stockIsKnown) {
        status.classList.add("unknown-stock");
        status.textContent = "Not set";
      } else if (product.stock === 0) {
        status.classList.add("out-of-stock");
        status.textContent = "Out of stock";
      } else if (product.stock <= 3) {
        status.classList.add("low-stock");
        status.textContent = "Low stock";
      } else {
        status.classList.add("in-stock");
        status.textContent = "In stock";
      }
      statusCell.appendChild(status);
      row.appendChild(statusCell);

      var actionsCell = document.createElement("td");
      var actions = document.createElement("div");
      actions.className = "row-actions";
      var editButton = document.createElement("button");
      editButton.type = "button";
      editButton.dataset.action = "edit";
      editButton.dataset.id = product.id;
      editButton.textContent = "Edit";
      editButton.setAttribute("aria-label", "Edit " + product.name);
      var deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "delete-button";
      deleteButton.dataset.action = "delete";
      deleteButton.dataset.id = product.id;
      deleteButton.textContent = "Delete";
      deleteButton.setAttribute("aria-label", "Delete " + product.name);
      actions.appendChild(editButton);
      actions.appendChild(deleteButton);
      actionsCell.appendChild(actions);
      row.appendChild(actionsCell);
      list.appendChild(row);
    });

    document.getElementById("product-count").textContent = String(products.length);
    document.getElementById("stock-count").textContent = String(products.reduce(function (total, product) {
      return total + (Number.isInteger(product.stock) ? product.stock : 0);
    }, 0));
    document.getElementById("low-stock-count").textContent = String(products.filter(function (product) {
      return Number.isInteger(product.stock) && product.stock <= 3;
    }).length);
    document.getElementById("result-count").textContent = filtered.length + (filtered.length === 1 ? " product" : " products");
    emptyState.hidden = filtered.length > 0;
    emptyState.querySelector("h3").textContent = products.length === 0 ? "No products yet" : "No matching products";
    emptyState.querySelector("p").textContent = products.length === 0
      ? "Add your first product to start managing your inventory."
      : "Try another search or category, or add a new product.";
    document.getElementById("empty-add-button").hidden = products.length > 0;
  }

  function openProductDialog(product) {
    form.reset();
    formError.textContent = "";
    editingId = product ? product.id : null;
    document.getElementById("dialog-title").textContent = product ? "Edit product" : "Add a product";
    form.elements.name.value = product ? product.name : "";
    form.elements.category.value = product ? product.category : "Phone";
    form.elements.specifications.value = product ? product.specifications.join("\n") : "";
    form.elements.price.value = product ? product.price : "";
    form.elements.stock.value = product ? product.stock : "";
    dialog.showModal();
    form.elements.name.focus();
  }

  function showAuthError(error) {
    authMessage.textContent = error && error.message
      ? error.message
      : "Sign-in failed. Check your connection and try again.";
    authMessage.classList.add("visible", "error");
  }

  async function authorizeUser(user) {
    if (!user) {
      showAuth("");
      return;
    }
    var authorization = await client
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (authorization.error) {
      showAuthError(authorization.error);
      return;
    }
    if (!authorization.data) {
      try {
        var signOutResult = await client.auth.signOut();
        if (signOutResult.error) {
          console.error("Could not clear an unauthorized session.", signOutResult.error);
        }
      } catch (error) {
        console.error("Could not clear an unauthorized session.", error);
      }
      showAuth("This account is not authorized to manage the store.", true);
      return;
    }
    showAdmin();
    await loadProducts();
  }

  function initializeSupabase() {
    var config = window.JAMES_PHONES_SUPABASE;
    if (!config || !config.url || !config.anonKey ||
        config.url.indexOf("YOUR_") !== -1 || config.anonKey.indexOf("YOUR_") !== -1) {
      showAuth("Supabase is not configured. Set the project URL and public anon key in js/supabase-config.js.", true);
      loginButton.disabled = true;
      return;
    }
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      showAuth("The authentication service did not load. Check your connection and reload this page.", true);
      loginButton.disabled = true;
      return;
    }

    try {
      client = window.supabase.createClient(config.url, config.anonKey);
    } catch (error) {
      console.error("Invalid Supabase configuration.", error);
      showAuth("Supabase configuration is invalid. Check the project URL and public anon key.", true);
      loginButton.disabled = true;
      return;
    }
    client.auth.onAuthStateChange(function (event, session) {
      if (event === "SIGNED_OUT") {
        products = [];
        render();
        showAuth("");
      } else if (event === "TOKEN_REFRESHED" && session) {
        window.setTimeout(function () {
          authorizeUser(session.user).catch(showAuthError);
        }, 0);
      }
    });
    client.auth.getSession().then(async function (result) {
      if (result.error) {
        showAuthError(result.error);
        return;
      }
      if (result.data.session) {
        await authorizeUser(result.data.session.user);
      } else {
        showAuth("");
      }
    }).catch(showAuthError);
  }

  document.getElementById("add-product-button").addEventListener("click", function () {
    openProductDialog(null);
  });
  document.getElementById("empty-add-button").addEventListener("click", function () {
    openProductDialog(null);
  });
  document.getElementById("close-dialog-button").addEventListener("click", function () {
    dialog.close();
  });
  document.getElementById("cancel-dialog-button").addEventListener("click", function () {
    dialog.close();
  });
  search.addEventListener("input", render);
  categoryFilter.addEventListener("change", render);

  list.addEventListener("click", async function (event) {
    var button = event.target.closest("button[data-action]");
    if (!button) {
      return;
    }
    var product = products.find(function (item) {
      return item.id === button.dataset.id;
    });
    if (!product) {
      return;
    }
    if (button.dataset.action === "edit") {
      openProductDialog(product);
      return;
    }
    if (button.dataset.action === "delete" && window.confirm("Delete " + product.name + "?")) {
      button.disabled = true;
      try {
        var result = await client.from("products").delete().eq("id", product.id).select("id").single();
        if (result.error) {
          reportError(result.error, "Could not delete the product.");
          button.disabled = false;
          return;
        }
        await loadProducts();
      } catch (error) {
        reportError(error, "Could not delete the product.");
        button.disabled = false;
      }
    }
  });

  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    authMessage.textContent = "";
    authMessage.classList.remove("visible", "error");
    loginButton.disabled = true;
    loginButton.textContent = "Signing in...";
    try {
      var result = await client.auth.signInWithPassword({
        email: loginForm.elements.email.value.trim(),
        password: loginForm.elements.password.value
      });
      if (result.error) {
        showAuthError(result.error);
      } else {
        await authorizeUser(result.data.user);
      }
    } catch (error) {
      showAuthError(error);
    } finally {
      loginButton.disabled = false;
      loginButton.textContent = "Sign in";
    }
  });

  document.getElementById("signout-button").addEventListener("click", async function (event) {
    var button = event.currentTarget;
    button.disabled = true;
    try {
      var result = await client.auth.signOut();
      if (result.error) {
        reportError(result.error, "Could not sign out.");
        button.disabled = false;
      }
    } catch (error) {
      reportError(error, "Could not sign out.");
      button.disabled = false;
    }
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    formError.textContent = "";
    var price = Number(form.elements.price.value);
    var stock = Number(form.elements.stock.value);
    if (!Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0) {
      formError.textContent = "Enter a valid price and a whole number of units in stock.";
      return;
    }

    var product = {
      name: form.elements.name.value.trim(),
      category: form.elements.category.value,
      stock: stock,
      price: price,
    };
    if (!product.name) {
      formError.textContent = "Enter a product name.";
      return;
    }
    try {
      product.specifications = parseSpecifications(form.elements.specifications.value);
    } catch (error) {
      formError.textContent = error.message;
      return;
    }

    var submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    try {
      var result = editingId
        ? await client.from("products").update(product).eq("id", editingId).select("id").single()
        : await client.from("products").insert(product).select("id").single();
      if (result.error) {
        formError.textContent = "Could not save product. " + result.error.message;
        reportError(result.error, "Could not save product.");
        return;
      }
      dialog.close();
      await loadProducts();
    } catch (error) {
      formError.textContent = "Could not save product. Check your connection and try again.";
      reportError(error, "Could not save product.");
    } finally {
      submitButton.disabled = false;
    }
  });

  initializeSupabase();
}());
