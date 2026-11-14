(function () {
  "use strict";

  var products = [];
  var blogPosts = [];
  var editingId = null;
  var editingBlogId = null;
  var client = null;
  var adminUserId = null;
  var retainedImageUrls = [];
  var selectedImageFiles = [];

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
  var categoryInput = document.getElementById("product-category");
  var conditionInput = document.getElementById("product-condition");
  var conditionHint = document.getElementById("condition-hint");
  var imageInput = document.getElementById("product-images");
  var imagePreviewList = document.getElementById("image-preview-list");
  var announcementForm = document.getElementById("announcement-form");
  var announcementMessage = document.getElementById("announcement-message");
  var announcementActive = document.getElementById("announcement-active");
  var announcementCount = document.getElementById("announcement-count");
  var announcementStatus = document.getElementById("announcement-status");
  var announcementSaveButton = document.getElementById("announcement-save-button");
  var promotionForm = document.getElementById("promotion-form");
  var promotionStatus = document.getElementById("promotion-status");
  var promotionSaveButton = document.getElementById("promotion-save-button");
  var offerInputs = [
    document.getElementById("offer-one-percent"),
    document.getElementById("offer-two-percent"),
    document.getElementById("offer-three-percent")
  ];
  var blogList = document.getElementById("blog-post-list");
  var blogEmptyState = document.getElementById("blog-empty-state");
  var blogStatus = document.getElementById("blog-admin-status");
  var blogDialog = document.getElementById("blog-dialog");
  var blogForm = document.getElementById("blog-form");
  var blogFormError = document.getElementById("blog-form-error");
  var blogSaveButton = document.getElementById("blog-save-button");
  var specificationGroups = Array.prototype.slice.call(document.querySelectorAll(".specification-group"));

  var imageBucket = "product-images";
  var maxImageCount = 4;
  var maxImageSize = 5 * 1024 * 1024;
  var allowedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];

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
        .select("id, name, category, description, product_condition, images, image_url, active, price, stock, specifications")
        .order("created_at", { ascending: false });
      if (result.error) {
        reportError(result.error, "Could not load inventory.");
        return false;
      }

      products = result.data.map(function (product) {
        return Object.assign({}, product, {
          price: Number(product.price),
          stock: product.stock === null || product.stock === undefined ? null : Number(product.stock),
          specifications: normalizeSpecifications(product.specifications),
          images: productImageUrls(product)
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

  function setAnnouncementStatus(message, isError) {
    announcementStatus.textContent = message;
    announcementStatus.classList.toggle("error", Boolean(isError));
  }

  function updateAnnouncementCount() {
    announcementCount.textContent = announcementMessage.value.length + " / 280 characters";
  }

  async function loadAnnouncement() {
    setAnnouncementStatus("Loading announcement settings...", false);
    try {
      var result = await client
        .from("store_announcement")
        .select("message, is_active")
        .eq("id", 1)
        .single();
      if (result.error) {
        setAnnouncementStatus("Could not load announcement settings. " + result.error.message, true);
        console.error("Could not load announcement settings.", result.error);
        return false;
      }
      announcementMessage.value = result.data.message || "";
      announcementActive.checked = Boolean(result.data.is_active);
      updateAnnouncementCount();
      setAnnouncementStatus("Announcement settings loaded.", false);
      return true;
    } catch (error) {
      console.error("Could not load announcement settings.", error);
      setAnnouncementStatus("Could not load announcement settings. " + (error.message || "Check your connection and try again."), true);
      return false;
    }
  }

  function setPromotionStatus(message, isError) {
    promotionStatus.textContent = message;
    promotionStatus.classList.toggle("error", Boolean(isError));
  }

  async function loadPromotions() {
    setPromotionStatus("Loading offer percentages...", false);
    try {
      var result = await client
        .from("store_promotions")
        .select("offer_one_percent, offer_two_percent, offer_three_percent")
        .eq("id", 1)
        .single();
      if (result.error) {
        throw result.error;
      }
      [
        result.data.offer_one_percent,
        result.data.offer_two_percent,
        result.data.offer_three_percent
      ].forEach(function (value, index) {
        offerInputs[index].value = String(value);
      });
      setPromotionStatus("Offer percentages loaded.", false);
      return true;
    } catch (error) {
      console.error("Could not load store offer percentages.", error);
      setPromotionStatus("Could not load offer percentages. " + (error.message || "Check your connection and try again."), true);
      return false;
    }
  }

  function setBlogStatus(message, isError) {
    blogStatus.textContent = message;
    blogStatus.classList.toggle("error", Boolean(isError));
  }

  function formatBlogDate(value) {
    if (!value) {
      return "—";
    }
    var date = new Date(value);
    return Number.isFinite(date.getTime())
      ? date.toLocaleDateString("en-GH", { year: "numeric", month: "short", day: "numeric" })
      : "—";
  }

  function renderBlogPosts() {
    blogList.replaceChildren();
    blogPosts.forEach(function (post) {
      var row = document.createElement("tr");
      var titleCell = document.createElement("td");
      var title = document.createElement("span");
      title.className = "blog-post-title";
      title.textContent = post.title;
      titleCell.appendChild(title);
      row.appendChild(titleCell);

      var statusCell = document.createElement("td");
      var status = document.createElement("span");
      status.className = "status-pill " + (post.is_published ? "published-product" : "draft-post");
      status.textContent = post.is_published ? "Published" : "Draft";
      statusCell.appendChild(status);
      row.appendChild(statusCell);
      row.appendChild(createCell(formatBlogDate(post.updated_at), "product-category"));

      var actionsCell = document.createElement("td");
      var actions = document.createElement("div");
      actions.className = "row-actions";
      var editButton = document.createElement("button");
      editButton.type = "button";
      editButton.dataset.blogAction = "edit";
      editButton.dataset.id = post.id;
      editButton.textContent = "Edit";
      editButton.setAttribute("aria-label", "Edit blog post " + post.title);
      var deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "delete-button";
      deleteButton.dataset.blogAction = "delete";
      deleteButton.dataset.id = post.id;
      deleteButton.textContent = "Delete";
      deleteButton.setAttribute("aria-label", "Delete blog post " + post.title);
      actions.appendChild(editButton);
      actions.appendChild(deleteButton);
      actionsCell.appendChild(actions);
      row.appendChild(actionsCell);
      blogList.appendChild(row);
    });
    blogEmptyState.hidden = blogPosts.length > 0;
  }

  async function loadBlogPosts() {
    setBlogStatus("Loading blog posts...", false);
    try {
      var result = await client
        .from("store_blog_posts")
        .select("id, title, summary, content, image_url, is_published, published_at, created_at, updated_at")
        .order("updated_at", { ascending: false });
      if (result.error) {
        throw result.error;
      }
      blogPosts = result.data || [];
      renderBlogPosts();
      setBlogStatus(blogPosts.length
        ? blogPosts.length + (blogPosts.length === 1 ? " post loaded." : " posts loaded.")
        : "No blog posts yet.", false);
      return true;
    } catch (error) {
      console.error("Could not load blog posts.", error);
      setBlogStatus("Could not load blog posts. " + (error.message || "Check your connection and try again."), true);
      return false;
    }
  }

  function openBlogDialog(post) {
    blogForm.reset();
    blogFormError.textContent = "";
    editingBlogId = post ? post.id : null;
    document.getElementById("blog-dialog-title").textContent = post ? "Edit blog post" : "Add a blog post";
    blogForm.elements.title.value = post ? post.title : "";
    blogForm.elements.summary.value = post ? post.summary : "";
    blogForm.elements.content.value = post ? post.content : "";
    blogForm.elements.image_url.value = post ? (post.image_url || "") : "";
    blogForm.elements.is_published.checked = Boolean(post && post.is_published);
    blogDialog.showModal();
    blogForm.elements.title.focus();
  }

  function normalizeSpecifications(value) {
    var specifications = {};
    if (Array.isArray(value)) {
      value.forEach(function (line, index) {
        var text = String(line).trim();
        var separator = text.indexOf(":");
        var key = separator > 0 ? text.slice(0, separator).trim() : "Additional detail " + (index + 1);
        var detail = separator > 0 ? text.slice(separator + 1).trim() : text;
        if (key && detail) {
          specifications[key] = detail;
        }
      });
      return specifications;
    }
    if (value && typeof value === "object") {
      Object.keys(value).forEach(function (key) {
        var detail = value[key] === null || value[key] === undefined ? "" : String(value[key]).trim();
        if (key.trim() && detail) {
          specifications[key.trim()] = detail;
        }
      });
    }
    return specifications;
  }

  function specificationEntries(value) {
    var specifications = normalizeSpecifications(value);
    return Object.keys(specifications).map(function (key) {
      return { label: key, value: specifications[key] };
    });
  }

  function configureSpecificationFields() {
    specificationGroups.forEach(function (group) {
      var isGeneralGroup = group.dataset.specCategory === "Other";
      group.hidden = isGeneralGroup
        ? categoryInput.value === "Phone" || categoryInput.value === "Laptop"
        : group.dataset.specCategory !== categoryInput.value;
    });
  }

  function populateSpecificationFields(value) {
    var specifications = normalizeSpecifications(value);
    Array.prototype.forEach.call(form.querySelectorAll("[data-spec-key]"), function (input) {
      input.value = specifications[input.dataset.specKey] || "";
    });
  }

  function collectSpecificationFields() {
    var specifications = {};
    var activeGroup = specificationGroups.find(function (group) {
      return !group.hidden;
    });
    if (!activeGroup) {
      return specifications;
    }
    Array.prototype.forEach.call(activeGroup.querySelectorAll("[data-spec-key]"), function (input) {
      var value = input.value.trim();
      if (value) {
        specifications[input.dataset.specKey] = value;
      }
    });
    return specifications;
  }

  function productImageUrls(product) {
    var urls = Array.isArray(product.images)
      ? product.images.filter(function (url) {
        return typeof url === "string" && url.trim();
      })
      : [];
    if (!urls.length && typeof product.image_url === "string" && product.image_url.trim()) {
      urls.push(product.image_url);
    }
    return urls.slice(0, maxImageCount);
  }

  function configureConditionOptions(preferredValue) {
    var isLaptop = categoryInput.value === "Laptop";
    var conditions = isLaptop
      ? ["Fairly Used"]
      : ["Brand New", "UK Used", "Fairly Used"];
    conditionInput.replaceChildren(new Option("Choose condition", ""));
    conditions.forEach(function (condition) {
      conditionInput.add(new Option(condition, condition));
    });
    conditionInput.disabled = isLaptop;
    conditionInput.required = categoryInput.value === "Phone";
    conditionInput.value = conditions.indexOf(preferredValue) !== -1
      ? preferredValue
      : (isLaptop ? "Fairly Used" : "");
    conditionHint.textContent = isLaptop
      ? "Laptops are listed as fairly used."
      : categoryInput.value === "Phone"
        ? "Choose Brand New, UK Used, or Fairly Used."
        : "Choose the condition shown to customers (optional for this category).";
  }

  function clearSelectedImageFiles() {
    selectedImageFiles.forEach(function (selection) {
      URL.revokeObjectURL(selection.previewUrl);
    });
    selectedImageFiles = [];
  }

  function renderImagePreviews() {
    imagePreviewList.replaceChildren();
    var images = retainedImageUrls.map(function (url, index) {
      return { url: url, kind: "existing", index: index };
    }).concat(selectedImageFiles.map(function (selection, index) {
      return { url: selection.previewUrl, kind: "new", index: index };
    }));

    if (!images.length) {
      var empty = document.createElement("p");
      empty.className = "image-preview-empty";
      empty.textContent = "No photos selected.";
      imagePreviewList.appendChild(empty);
      return;
    }

    images.forEach(function (item, index) {
      var preview = document.createElement("div");
      preview.className = "image-preview";
      var image = document.createElement("img");
      image.src = item.url;
      image.alt = "Product photo " + (index + 1);
      var removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "image-remove-button";
      removeButton.dataset.imageKind = item.kind;
      removeButton.dataset.imageIndex = String(item.index);
      removeButton.setAttribute("aria-label", "Remove product photo " + (index + 1));
      removeButton.textContent = "×";
      preview.appendChild(image);
      preview.appendChild(removeButton);
      imagePreviewList.appendChild(preview);
    });
  }

  function getStoragePath(imageUrl) {
    try {
      var projectUrl = new URL(window.JAMES_PHONES_SUPABASE.url);
      var url = new URL(imageUrl);
      var prefix = "/storage/v1/object/public/" + imageBucket + "/";
      if (url.origin !== projectUrl.origin || url.pathname.indexOf(prefix) !== 0) {
        return null;
      }
      return url.pathname.slice(prefix.length).split("/").map(function (segment) {
        return decodeURIComponent(segment);
      }).join("/");
    } catch (error) {
      return null;
    }
  }

  async function removeStoredImages(imageUrls) {
    var paths = imageUrls.map(getStoragePath).filter(Boolean);
    if (!paths.length) {
      return;
    }
    var result = await client.storage.from(imageBucket).remove(paths);
    if (result.error) {
      throw result.error;
    }
  }

  function makeImagePath(file) {
    var extensionByType = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/avif": "avif"
    };
    var randomId = window.crypto && typeof window.crypto.randomUUID === "function"
      ? window.crypto.randomUUID()
      : Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
    return adminUserId + "/" + randomId + "." + extensionByType[file.type];
  }

  async function uploadSelectedImages(uploadedUrls) {
    if (selectedImageFiles.length && !adminUserId) {
      throw new Error("Your admin session expired. Sign in again before uploading photos.");
    }
    for (var index = 0; index < selectedImageFiles.length; index += 1) {
      var file = selectedImageFiles[index].file;
      var path = makeImagePath(file);
      var uploadResult = await client.storage.from(imageBucket).upload(path, file, {
        contentType: file.type,
        upsert: false
      });
      if (uploadResult.error) {
        throw uploadResult.error;
      }
      var publicUrlResult = client.storage.from(imageBucket).getPublicUrl(path);
      uploadedUrls.push(publicUrlResult.data.publicUrl);
    }
  }

  async function discardUploadedImages(imageUrls) {
    if (!imageUrls.length) {
      return;
    }
    try {
      await removeStoredImages(imageUrls);
    } catch (error) {
      console.error("Could not remove images uploaded for an unsuccessful product save.", error);
    }
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
      var searchable = product.name + " " + (product.description || "") + " " +
        (product.product_condition || "") + " " + specificationEntries(product.specifications).map(function (item) {
          return item.label + " " + item.value;
        }).join(" ");
      var matchesQuery = searchable.toLowerCase().indexOf(query) !== -1;
      var matchesCategory = category === "all" || product.category === category;
      return matchesQuery && matchesCategory;
    });

    list.replaceChildren();
    filtered.forEach(function (product) {
      var row = document.createElement("tr");
      var productCell = document.createElement("td");
      var thumbnailUrl = productImageUrls(product)[0];
      if (thumbnailUrl) {
        var thumbnail = document.createElement("img");
        thumbnail.className = "product-thumbnail";
        thumbnail.src = thumbnailUrl;
        thumbnail.alt = "";
        thumbnail.loading = "lazy";
        productCell.appendChild(thumbnail);
      }
      var name = document.createElement("span");
      name.className = "product-name";
      name.textContent = product.name;
      productCell.appendChild(name);
      row.appendChild(productCell);
      row.appendChild(createCell(product.category, "product-category"));
      row.appendChild(createCell(product.product_condition || "—", "product-category"));
      row.appendChild(createCell("GH₵" + product.price.toLocaleString("en-GH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }), "price"));
      var stockIsKnown = Number.isInteger(product.stock);
      row.appendChild(createCell(stockIsKnown ? String(product.stock) : "Not set", "stock-pill"));

      var specsCell = document.createElement("td");
      var specificationList = specificationEntries(product.specifications);
      if (specificationList.length) {
        var specs = document.createElement("details");
        specs.className = "specs-details";
        var summary = document.createElement("summary");
        summary.textContent = "View (" + specificationList.length + ")";
        var specsList = document.createElement("ul");
        specificationList.forEach(function (specification) {
          var item = document.createElement("li");
          item.textContent = specification.label + ": " + specification.value;
          specsList.appendChild(item);
        });
        specs.appendChild(summary);
        specs.appendChild(specsList);
        specsCell.appendChild(specs);
      } else {
        specsCell.textContent = "—";
      }
      row.appendChild(specsCell);

      var catalogCell = document.createElement("td");
      var catalogStatus = document.createElement("span");
      catalogStatus.className = "status-pill " + (product.active === false ? "hidden-product" : "published-product");
      catalogStatus.textContent = product.active === false ? "Hidden" : "Published";
      catalogCell.appendChild(catalogStatus);
      row.appendChild(catalogCell);

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
    clearSelectedImageFiles();
    editingId = product ? product.id : null;
    document.getElementById("dialog-title").textContent = product ? "Edit product" : "Add a product";
    form.elements.name.value = product ? product.name : "";
    categoryInput.value = product ? product.category : "Phone";
    configureConditionOptions(product ? product.product_condition : "");
    configureSpecificationFields();
    form.elements.description.value = product ? (product.description || "") : "";
    populateSpecificationFields(product ? product.specifications : {});
    form.elements.price.value = product ? product.price : "";
    form.elements.stock.value = product && Number.isInteger(product.stock) ? product.stock : "";
    form.elements.active.checked = !product || product.active !== false;
    retainedImageUrls = product ? productImageUrls(product) : [];
    imageInput.value = "";
    renderImagePreviews();
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
      adminUserId = null;
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
      adminUserId = null;
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
    adminUserId = user.id;
    showAdmin();
    await Promise.all([loadProducts(), loadAnnouncement(), loadPromotions(), loadBlogPosts()]);
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
        blogPosts = [];
        adminUserId = null;
        announcementMessage.value = "";
        announcementActive.checked = false;
        offerInputs.forEach(function (input) {
          input.value = "";
        });
        updateAnnouncementCount();
        setAnnouncementStatus("", false);
        setPromotionStatus("", false);
        setBlogStatus("", false);
        renderBlogPosts();
        clearSelectedImageFiles();
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
  categoryInput.addEventListener("change", function () {
    configureConditionOptions(conditionInput.value);
    configureSpecificationFields();
  });

  announcementMessage.addEventListener("input", updateAnnouncementCount);
  announcementForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    var message = announcementMessage.value.trim();
    var isActive = announcementActive.checked;
    if (isActive && !message) {
      setAnnouncementStatus("Enter announcement text or turn off the storefront display.", true);
      announcementMessage.focus();
      return;
    }

    announcementSaveButton.disabled = true;
    setAnnouncementStatus("Saving announcement...", false);
    try {
      var result = await client
        .from("store_announcement")
        .update({
          message: message,
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq("id", 1)
        .select("id")
        .single();
      if (result.error) {
        throw result.error;
      }
      announcementMessage.value = message;
      updateAnnouncementCount();
      setAnnouncementStatus(isActive ? "Announcement saved and displayed on the storefront." : "Announcement saved and hidden from the storefront.", false);
    } catch (error) {
      console.error("Could not save announcement.", error);
      setAnnouncementStatus("Could not save announcement. " + (error.message || "Check your connection and try again."), true);
    } finally {
      announcementSaveButton.disabled = false;
    }
  });

  promotionForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    var percentages = offerInputs.map(function (input) {
      return Number(input.value);
    });
    if (percentages.some(function (value) {
      return !Number.isInteger(value) || value < 1 || value > 100;
    })) {
      setPromotionStatus("Enter a whole-number percentage from 1 to 100 for each offer.", true);
      offerInputs.find(function (input, index) {
        return !Number.isInteger(percentages[index]) || percentages[index] < 1 || percentages[index] > 100;
      }).focus();
      return;
    }

    promotionSaveButton.disabled = true;
    setPromotionStatus("Saving offer percentages...", false);
    try {
      var result = await client
        .from("store_promotions")
        .update({
          offer_one_percent: percentages[0],
          offer_two_percent: percentages[1],
          offer_three_percent: percentages[2],
          updated_at: new Date().toISOString()
        })
        .eq("id", 1)
        .select("id")
        .single();
      if (result.error) {
        throw result.error;
      }
      setPromotionStatus("Offer percentages saved and updated on the homepage.", false);
    } catch (error) {
      console.error("Could not save store offer percentages.", error);
      setPromotionStatus("Could not save offer percentages. " + (error.message || "Check your connection and try again."), true);
    } finally {
      promotionSaveButton.disabled = false;
    }
  });

  document.getElementById("add-blog-post-button").addEventListener("click", function () {
    openBlogDialog(null);
  });
  document.getElementById("empty-add-blog-button").addEventListener("click", function () {
    openBlogDialog(null);
  });
  document.getElementById("blog-close-button").addEventListener("click", function () {
    blogDialog.close();
  });
  document.getElementById("blog-cancel-button").addEventListener("click", function () {
    blogDialog.close();
  });
  blogList.addEventListener("click", async function (event) {
    var button = event.target.closest("button[data-blog-action]");
    if (!button) {
      return;
    }
    var post = blogPosts.find(function (item) {
      return item.id === button.dataset.id;
    });
    if (!post) {
      return;
    }
    if (button.dataset.blogAction === "edit") {
      openBlogDialog(post);
      return;
    }
    if (!window.confirm("Delete \"" + post.title + "\"? This cannot be undone.")) {
      return;
    }
    button.disabled = true;
    setBlogStatus("Deleting blog post...", false);
    try {
      var result = await client
        .from("store_blog_posts")
        .delete()
        .eq("id", post.id)
        .select("id")
        .single();
      if (result.error) {
        throw result.error;
      }
      if (await loadBlogPosts()) {
        setBlogStatus("Blog post deleted.", false);
      }
    } catch (error) {
      console.error("Could not delete blog post.", error);
      setBlogStatus("Could not delete blog post. " + (error.message || "Check your connection and try again."), true);
      button.disabled = false;
    }
  });
  blogForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    blogFormError.textContent = "";
    var title = blogForm.elements.title.value.trim();
    var summary = blogForm.elements.summary.value.trim();
    var content = blogForm.elements.content.value.trim();
    var imageUrl = blogForm.elements.image_url.value.trim();
    var isPublished = blogForm.elements.is_published.checked;
    if (!title || !summary || !content) {
      blogFormError.textContent = "Enter a title, short summary, and article.";
      return;
    }
    if (imageUrl) {
      try {
        var parsedImageUrl = new URL(imageUrl, window.location.href);
        if (parsedImageUrl.protocol !== "https:" &&
            !(parsedImageUrl.origin === window.location.origin &&
              parsedImageUrl.protocol === window.location.protocol)) {
          throw new Error("Use an HTTPS image URL.");
        }
      } catch (error) {
        blogFormError.textContent = error.message || "Enter a valid image URL.";
        return;
      }
    }

    blogSaveButton.disabled = true;
    blogSaveButton.textContent = "Saving...";
    try {
      var existingPost = editingBlogId && blogPosts.find(function (post) {
        return post.id === editingBlogId;
      });
      var now = new Date().toISOString();
      var postData = {
        title: title,
        summary: summary,
        content: content,
        image_url: imageUrl,
        is_published: isPublished,
        published_at: isPublished
          ? (existingPost && existingPost.published_at ? existingPost.published_at : now)
          : null,
        updated_at: now
      };
      var result = editingBlogId
        ? await client.from("store_blog_posts").update(postData).eq("id", editingBlogId).select("id").single()
        : await client.from("store_blog_posts").insert(postData).select("id").single();
      if (result.error) {
        throw result.error;
      }
      blogDialog.close();
      if (await loadBlogPosts()) {
        setBlogStatus(isPublished ? "Blog post saved and published." : "Blog post saved as a draft.", false);
      }
    } catch (error) {
      console.error("Could not save blog post.", error);
      blogFormError.textContent = "Could not save blog post. " + (error.message || "Check your connection and try again.");
      setBlogStatus("Could not save blog post.", true);
    } finally {
      blogSaveButton.disabled = false;
      blogSaveButton.textContent = "Save post";
    }
  });

  imageInput.addEventListener("change", function () {
    formError.textContent = "";
    var files = Array.prototype.slice.call(imageInput.files || []);
    var availableSlots = maxImageCount - retainedImageUrls.length - selectedImageFiles.length;
    if (files.length > availableSlots) {
      formError.textContent = "A product can have up to " + maxImageCount + " photos. Remove a photo before adding another.";
      imageInput.value = "";
      return;
    }
    var invalidFile = files.find(function (file) {
      return allowedImageTypes.indexOf(file.type) === -1 || file.size > maxImageSize;
    });
    if (invalidFile) {
      formError.textContent = "Use JPEG, PNG, WebP, or AVIF images no larger than 5 MB each.";
      imageInput.value = "";
      return;
    }
    files.forEach(function (file) {
      selectedImageFiles.push({
        file: file,
        previewUrl: URL.createObjectURL(file)
      });
    });
    imageInput.value = "";
    renderImagePreviews();
  });

  imagePreviewList.addEventListener("click", function (event) {
    var button = event.target.closest("button[data-image-kind]");
    if (!button) {
      return;
    }
    var index = Number(button.dataset.imageIndex);
    if (button.dataset.imageKind === "existing") {
      retainedImageUrls.splice(index, 1);
    } else if (button.dataset.imageKind === "new") {
      var removed = selectedImageFiles.splice(index, 1)[0];
      if (removed) {
        URL.revokeObjectURL(removed.previewUrl);
      }
    }
    renderImagePreviews();
  });

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
        try {
          await removeStoredImages(productImageUrls(product));
        } catch (imageError) {
          reportError(imageError, "The product was deleted, but its stored photos could not be removed.");
          return;
        }
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
    var stockText = form.elements.stock.value.trim();
    var stock = stockText ? Number(stockText) : null;
    if (!Number.isFinite(price) || price < 0 ||
        (stock !== null && (!Number.isInteger(stock) || stock < 0))) {
      formError.textContent = "Enter a valid price and, if known, a whole number of units in stock.";
      return;
    }

    var name = form.elements.name.value.trim();
    if (!name) {
      formError.textContent = "Enter a product name.";
      return;
    }
    var category = categoryInput.value;
    var condition = category === "Laptop" ? "Fairly Used" : conditionInput.value;
    if (category === "Phone" && !condition) {
      formError.textContent = "Choose whether this phone is Brand New, UK Used, or Fairly Used.";
      return;
    }
    if (retainedImageUrls.length + selectedImageFiles.length > maxImageCount) {
      formError.textContent = "A product can have up to " + maxImageCount + " photos.";
      return;
    }
    var specifications = collectSpecificationFields();

    var submitButton = form.querySelector('button[type="submit"]');
    var uploadedImageUrls = [];
    var existingProduct = editingId && products.find(function (item) {
      return item.id === editingId;
    });
    var previousImageUrls = existingProduct ? productImageUrls(existingProduct) : [];
    var saveCompleted = false;
    submitButton.disabled = true;
    try {
      await uploadSelectedImages(uploadedImageUrls);
      var images = retainedImageUrls.concat(uploadedImageUrls);
      var product = {
        name: name,
        category: category,
        product_condition: condition || null,
        description: form.elements.description.value.trim(),
        images: images,
        image_url: images.length ? images[0] : "",
        active: form.elements.active.checked,
        stock: stock,
        price: price,
        specifications: specifications
      };
      var result = editingId
        ? await client.from("products").update(product).eq("id", editingId).select("id").single()
        : await client.from("products").insert(product).select("id").single();
      if (result.error) {
        throw result.error;
      }
      saveCompleted = true;
      var removedImageUrls = previousImageUrls.filter(function (url) {
        return images.indexOf(url) === -1;
      });
      dialog.close();
      clearSelectedImageFiles();
      await loadProducts();
      if (removedImageUrls.length) {
        try {
          await removeStoredImages(removedImageUrls);
        } catch (imageError) {
          reportError(imageError, "Product saved, but removed photos could not be deleted from storage.");
        }
      }
    } catch (error) {
      if (!saveCompleted) {
        await discardUploadedImages(uploadedImageUrls);
      }
      formError.textContent = "Could not save product. " + (error.message || "Check your connection and try again.");
      reportError(error, "Could not save product.");
    } finally {
      submitButton.disabled = false;
    }
  });

  initializeSupabase();
}());
