(function () {
  "use strict";

  var products = [];
  var blogPosts = [];
  var testimonials = [];
  var editingId = null;
  var editingBlogId = null;
  var editingTestimonialId = null;
  var client = null;
  var adminUserId = null;
  var retainedImageUrls = [];
  var selectedImageFiles = [];
  var offerImageUrls = [null, null, null];
  var selectedOfferImageFiles = [null, null, null];
  var offerImageRemovalPending = [false, false, false];
  var offerImagePreviewUrls = [null, null, null];

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
  var brandInput = document.getElementById("product-brand");
  var brandCustomWrap = document.getElementById("product-brand-custom-wrap");
  var brandCustomInput = document.getElementById("product-brand-custom");
  var productNameSelect = document.getElementById("product-name-select");
  var productNameCustomWrap = document.getElementById("product-name-custom-wrap");
  var productNameInput = document.getElementById("product-name");
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
  var offerImageInputs = [
    document.getElementById("offer-one-image"),
    document.getElementById("offer-two-image"),
    document.getElementById("offer-three-image")
  ];
  var offerImagePreviews = [
    document.getElementById("offer-one-image-preview"),
    document.getElementById("offer-two-image-preview"),
    document.getElementById("offer-three-image-preview")
  ];
  var offerImageHints = [
    document.getElementById("offer-one-image-hint"),
    document.getElementById("offer-two-image-hint"),
    document.getElementById("offer-three-image-hint")
  ];
  var offerImageRemoveButtons = [
    document.getElementById("offer-one-image-remove"),
    document.getElementById("offer-two-image-remove"),
    document.getElementById("offer-three-image-remove")
  ];
  var defaultOfferImageUrls = ["13promax.png", "phone1.jpeg", "13.png"];
  var blogList = document.getElementById("blog-post-list");
  var blogEmptyState = document.getElementById("blog-empty-state");
  var blogStatus = document.getElementById("blog-admin-status");
  var blogDialog = document.getElementById("blog-dialog");
  var blogForm = document.getElementById("blog-form");
  var blogFormError = document.getElementById("blog-form-error");
  var blogSaveButton = document.getElementById("blog-save-button");
  var testimonialList = document.getElementById("testimonial-list");
  var testimonialEmptyState = document.getElementById("testimonial-empty-state");
  var testimonialStatus = document.getElementById("testimonial-admin-status");
  var testimonialDialog = document.getElementById("testimonial-dialog");
  var testimonialForm = document.getElementById("testimonial-form");
  var testimonialFormError = document.getElementById("testimonial-form-error");
  var testimonialSaveButton = document.getElementById("testimonial-save-button");
  var specificationGroups = Array.prototype.slice.call(document.querySelectorAll(".specification-group"));

  var imageBucket = "product-images";
  var maxImageCount = 4;
  var maxImageSize = 5 * 1024 * 1024;
  var allowedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
  var customChoice = "__custom__";
  var noBrandChoice = "__none__";
  var commonSpecificationSuggestions = {
    Phone: {
      "Storage capacity": ["64GB", "128GB", "256GB", "512GB", "1TB", "2TB"],
      "SIM configuration": ["Single SIM", "Dual SIM", "eSIM", "Physical SIM + eSIM"]
    },
    Laptop: {
      "RAM": ["4GB", "8GB", "12GB", "16GB", "32GB", "64GB"],
      "Storage capacity": ["64GB", "128GB", "256GB", "512GB", "1TB", "2TB"],
      "Storage type": ["SSD", "HDD", "eMMC"],
      "Display resolution": ["HD", "FHD", "QHD", "4K"],
      "Processor generation": ["8th Gen", "9th Gen", "10th Gen", "11th Gen", "12th Gen", "13th Gen", "14th Gen"]
    },
    Other: {
      "Storage capacity": ["64GB", "128GB", "256GB", "512GB", "1TB", "2TB"]
    }
  };

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

  function renderOfferImagePreview(index) {
    var hasSelectedFile = Boolean(selectedOfferImageFiles[index]);
    var useDefaultImage = offerImageRemovalPending[index] || !offerImageUrls[index];
    offerImagePreviews[index].src = hasSelectedFile
      ? offerImagePreviewUrls[index]
      : (useDefaultImage ? defaultOfferImageUrls[index] : offerImageUrls[index]);
    offerImageHints[index].textContent = hasSelectedFile
      ? "Selected image will be uploaded when you save."
      : offerImageRemovalPending[index]
        ? "The default image will be used after you save."
        : offerImageUrls[index]
          ? "Custom offer image saved."
          : "Using the default storefront image.";
    offerImageRemoveButtons[index].hidden = !hasSelectedFile && !offerImageUrls[index];
    offerImageRemoveButtons[index].textContent = hasSelectedFile
      ? "Discard selected image"
      : offerImageRemovalPending[index]
        ? "Keep current image"
        : "Use default image";
  }

  function clearOfferImagePreviewUrl(index) {
    if (offerImagePreviewUrls[index]) {
      URL.revokeObjectURL(offerImagePreviewUrls[index]);
      offerImagePreviewUrls[index] = null;
    }
  }

  async function loadPromotions() {
    setPromotionStatus("Loading offers...", false);
    try {
      var result = await client
        .from("store_promotions")
        .select("offer_one_percent, offer_two_percent, offer_three_percent, offer_one_image_url, offer_two_image_url, offer_three_image_url")
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
      offerImageUrls = [
        result.data.offer_one_image_url || null,
        result.data.offer_two_image_url || null,
        result.data.offer_three_image_url || null
      ];
      offerImageUrls.forEach(function (url, index) {
        selectedOfferImageFiles[index] = null;
        offerImageRemovalPending[index] = false;
        clearOfferImagePreviewUrl(index);
        offerImageInputs[index].value = "";
        renderOfferImagePreview(index);
      });
      setPromotionStatus("Offers loaded.", false);
      return true;
    } catch (error) {
      console.error("Could not load store offers.", error);
      setPromotionStatus("Could not load offers. " + (error.message || "Check your connection and try again."), true);
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

  function setTestimonialStatus(message, isError) {
    testimonialStatus.textContent = message;
    testimonialStatus.classList.toggle("error", Boolean(isError));
  }

  function renderTestimonials() {
    testimonialList.replaceChildren();
    testimonials.forEach(function (testimonial) {
      var row = document.createElement("tr");
      row.appendChild(createCell(testimonial.person_name, "blog-post-title"));
      var text = testimonial.testimonial_text;
      row.appendChild(createCell(text.length > 150 ? text.slice(0, 147) + "…" : text, "testimonial-excerpt"));

      var statusCell = document.createElement("td");
      var status = document.createElement("span");
      status.className = "status-pill " + (testimonial.is_published ? "published-product" : "draft-post");
      status.textContent = testimonial.is_published ? "Published" : "Draft";
      statusCell.appendChild(status);
      row.appendChild(statusCell);
      row.appendChild(createCell(formatBlogDate(testimonial.updated_at), "product-category"));

      var actionsCell = document.createElement("td");
      var actions = document.createElement("div");
      actions.className = "row-actions";
      var editButton = document.createElement("button");
      editButton.type = "button";
      editButton.dataset.testimonialAction = "edit";
      editButton.dataset.id = testimonial.id;
      editButton.textContent = "Edit";
      editButton.setAttribute("aria-label", "Edit testimonial by " + testimonial.person_name);
      var deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "delete-button";
      deleteButton.dataset.testimonialAction = "delete";
      deleteButton.dataset.id = testimonial.id;
      deleteButton.textContent = "Delete";
      deleteButton.setAttribute("aria-label", "Delete testimonial by " + testimonial.person_name);
      actions.appendChild(editButton);
      actions.appendChild(deleteButton);
      actionsCell.appendChild(actions);
      row.appendChild(actionsCell);
      testimonialList.appendChild(row);
    });
    testimonialEmptyState.hidden = testimonials.length > 0;
  }

  async function loadTestimonials() {
    setTestimonialStatus("Loading testimonials...", false);
    try {
      var result = await client
        .from("store_testimonials")
        .select("id, person_name, testimonial_text, is_published, sort_order, created_at, updated_at")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (result.error) {
        throw result.error;
      }
      testimonials = result.data || [];
      renderTestimonials();
      setTestimonialStatus(testimonials.length
        ? testimonials.length + (testimonials.length === 1 ? " testimonial loaded." : " testimonials loaded.")
        : "No testimonials yet.", false);
      return true;
    } catch (error) {
      console.error("Could not load testimonials.", error);
      setTestimonialStatus("Could not load testimonials. " + (error.message || "Check your connection and try again."), true);
      return false;
    }
  }

  function openTestimonialDialog(testimonial) {
    testimonialForm.reset();
    testimonialFormError.textContent = "";
    editingTestimonialId = testimonial ? testimonial.id : null;
    document.getElementById("testimonial-dialog-title").textContent =
      testimonial ? "Edit testimonial" : "Add a testimonial";
    testimonialForm.elements.person_name.value = testimonial ? testimonial.person_name : "";
    testimonialForm.elements.testimonial_text.value = testimonial ? testimonial.testimonial_text : "";
    testimonialForm.elements.is_published.checked = testimonial ? Boolean(testimonial.is_published) : true;
    testimonialDialog.showModal();
    testimonialForm.elements.person_name.focus();
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

  function getProductBrand(product) {
    return String(normalizeSpecifications(product.specifications).Brand || "").trim();
  }

  function getSelectedBrand() {
    if (brandInput.value === customChoice) {
      return brandCustomInput.value.trim();
    }
    return brandInput.value === noBrandChoice ? "" : brandInput.value.trim();
  }

  function configureBrandInput() {
    var isCustom = brandInput.value === customChoice;
    brandCustomWrap.hidden = !isCustom;
    brandCustomInput.required = isCustom;
    if (!isCustom) {
      brandCustomInput.value = "";
    }
  }

  function populateBrandOptions(selectedBrand, chooseNoBrand) {
    var brands = [];
    products.forEach(function (product) {
      var brand = getProductBrand(product);
      if (product.category === categoryInput.value && brand && brands.indexOf(brand) === -1) {
        brands.push(brand);
      }
    });
    brands.sort(function (left, right) {
      return left.toLowerCase().localeCompare(right.toLowerCase());
    });

    brandInput.replaceChildren(new Option("Choose a brand", ""));
    brands.forEach(function (brand) {
      brandInput.add(new Option(brand, brand));
    });
    brandInput.add(new Option("Unbranded / not specified", noBrandChoice));
    brandInput.add(new Option("Add a new brand…", customChoice));

    if (selectedBrand && brands.indexOf(selectedBrand) !== -1) {
      brandInput.value = selectedBrand;
      brandCustomInput.value = "";
    } else if (selectedBrand) {
      brandInput.value = customChoice;
      brandCustomInput.value = selectedBrand;
    } else if (chooseNoBrand) {
      brandInput.value = noBrandChoice;
      brandCustomInput.value = "";
    } else {
      brandInput.value = "";
      brandCustomInput.value = "";
    }
    configureBrandInput();
  }

  function configureProductNameInput() {
    var isCustom = productNameSelect.value === customChoice;
    productNameCustomWrap.hidden = !isCustom;
    productNameInput.required = isCustom;
    if (!isCustom && productNameSelect.value) {
      productNameInput.value = productNameSelect.value;
    } else if (!isCustom) {
      productNameInput.value = "";
    }
  }

  function populateProductNameOptions(selectedName) {
    var hasBrandChoice = brandInput.value !== "";
    var selectedBrand = getSelectedBrand();
    var names = [];
    if (hasBrandChoice && (brandInput.value !== customChoice || selectedBrand)) {
      products.forEach(function (product) {
        if (product.category === categoryInput.value &&
            getProductBrand(product) === selectedBrand &&
            names.indexOf(product.name) === -1) {
          names.push(product.name);
        }
      });
    }
    names.sort(function (left, right) {
      return left.toLowerCase().localeCompare(right.toLowerCase());
    });

    productNameSelect.replaceChildren(new Option(
      hasBrandChoice ? "Choose a product name" : "Choose a brand first",
      ""
    ));
    names.forEach(function (name) {
      productNameSelect.add(new Option(name, name));
    });
    if (hasBrandChoice) {
      productNameSelect.add(new Option("Enter a new product name…", customChoice));
    }
    productNameSelect.disabled = !hasBrandChoice;

    if (selectedName && names.indexOf(selectedName) !== -1) {
      productNameSelect.value = selectedName;
      productNameInput.value = selectedName;
    } else if (selectedName && hasBrandChoice) {
      productNameSelect.value = customChoice;
      productNameInput.value = selectedName;
    } else {
      productNameSelect.value = "";
      productNameInput.value = "";
    }
    configureProductNameInput();
  }

  function selectedProductName() {
    return productNameSelect.value === customChoice
      ? productNameInput.value.trim()
      : productNameSelect.value.trim();
  }

  function configureSpecificationSuggestions() {
    var inputs = Array.prototype.slice.call(form.querySelectorAll("[data-spec-key]"));
    inputs.forEach(function (input, index) {
      var dataList = document.createElement("datalist");
      dataList.id = "product-spec-options-" + index;
      input.setAttribute("list", dataList.id);
      form.appendChild(dataList);
    });
  }

  function refreshSpecificationSuggestions() {
    var hasBrandChoice = brandInput.value !== "";
    var selectedBrand = getSelectedBrand();
    var selectedName = productNameSelect.value === customChoice ? "" : productNameSelect.value;
    var matchingProducts = hasBrandChoice
      ? products.filter(function (product) {
        return product.category === categoryInput.value &&
          getProductBrand(product) === selectedBrand &&
          (!selectedName || product.name === selectedName);
      })
      : [];

    Array.prototype.forEach.call(form.querySelectorAll("[data-spec-key]"), function (input) {
      var dataList = document.getElementById(input.getAttribute("list"));
      var key = input.dataset.specKey;
      var values = [];
      matchingProducts.forEach(function (product) {
        var value = product.specifications[key];
        if (value && values.indexOf(value) === -1) {
          values.push(value);
        }
      });
      var categorySuggestions = commonSpecificationSuggestions[categoryInput.value] || {};
      if (!values.length && categorySuggestions[key]) {
        values = categorySuggestions[key].slice();
      }
      dataList.replaceChildren();
      values.forEach(function (value) {
        dataList.appendChild(new Option(value, value));
      });
    });
  }

  function findSelectedCatalogProduct() {
    var name = selectedProductName();
    if (!name || productNameSelect.value === customChoice) {
      return null;
    }
    return products.find(function (product) {
      return product.category === categoryInput.value &&
        product.name === name &&
        getProductBrand(product) === getSelectedBrand();
    }) || null;
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
    var brand = getSelectedBrand();
    if (brand) {
      specifications.Brand = brand;
    }
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

  function makeImagePath(file, folder) {
    var extensionByType = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/avif": "avif"
    };
    var randomId = window.crypto && typeof window.crypto.randomUUID === "function"
      ? window.crypto.randomUUID()
      : Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
    return adminUserId + "/" + (folder ? folder + "/" : "") + randomId + "." + extensionByType[file.type];
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

  async function uploadSelectedOfferImages(imageUrls, uploadedUrls) {
    for (var index = 0; index < selectedOfferImageFiles.length; index += 1) {
      var file = selectedOfferImageFiles[index];
      if (!file) {
        continue;
      }
      if (!adminUserId) {
        throw new Error("Your admin session expired. Sign in again before uploading offer images.");
      }
      var path = makeImagePath(file, "offers/" + (index + 1));
      var uploadResult = await client.storage.from(imageBucket).upload(path, file, {
        contentType: file.type,
        upsert: false
      });
      if (uploadResult.error) {
        throw uploadResult.error;
      }
      var publicUrlResult = client.storage.from(imageBucket).getPublicUrl(path);
      imageUrls[index] = publicUrlResult.data.publicUrl;
      uploadedUrls.push(imageUrls[index]);
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
    categoryInput.value = product ? product.category : "Phone";
    configureConditionOptions(product ? product.product_condition : "");
    configureSpecificationFields();
    form.elements.description.value = product ? (product.description || "") : "";
    var specifications = product ? normalizeSpecifications(product.specifications) : {};
    populateBrandOptions(specifications.Brand || "", Boolean(product && !specifications.Brand));
    populateProductNameOptions(product ? product.name : "");
    populateSpecificationFields(specifications);
    form.elements.price.value = product ? product.price : "";
    form.elements.stock.value = product && Number.isInteger(product.stock) ? product.stock : "";
    form.elements.active.checked = !product || product.active !== false;
    retainedImageUrls = product ? productImageUrls(product) : [];
    imageInput.value = "";
    renderImagePreviews();
    refreshSpecificationSuggestions();
    dialog.showModal();
    (product ? productNameSelect : categoryInput).focus();
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
    await Promise.all([loadProducts(), loadAnnouncement(), loadPromotions(), loadBlogPosts(), loadTestimonials()]);
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
        testimonials = [];
        adminUserId = null;
        announcementMessage.value = "";
        announcementActive.checked = false;
        offerInputs.forEach(function (input) {
          input.value = "";
        });
        offerImageUrls = [null, null, null];
        selectedOfferImageFiles.forEach(function (file, index) {
          selectedOfferImageFiles[index] = null;
          offerImageRemovalPending[index] = false;
          offerImageInputs[index].value = "";
          clearOfferImagePreviewUrl(index);
          renderOfferImagePreview(index);
        });
        updateAnnouncementCount();
        setAnnouncementStatus("", false);
        setPromotionStatus("", false);
        setBlogStatus("", false);
        setTestimonialStatus("", false);
        renderBlogPosts();
        renderTestimonials();
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
    configureConditionOptions("");
    configureSpecificationFields();
    populateSpecificationFields({});
    populateBrandOptions("");
    populateProductNameOptions("");
    refreshSpecificationSuggestions();
  });
  brandInput.addEventListener("change", function () {
    configureBrandInput();
    populateProductNameOptions("");
    populateSpecificationFields({});
    refreshSpecificationSuggestions();
  });
  brandCustomInput.addEventListener("input", function () {
    populateProductNameOptions("");
    populateSpecificationFields({});
    refreshSpecificationSuggestions();
  });
  productNameSelect.addEventListener("change", function () {
    if (productNameSelect.value === customChoice) {
      productNameInput.value = "";
    }
    configureProductNameInput();
    var product = findSelectedCatalogProduct();
    populateSpecificationFields(product ? product.specifications : {});
    refreshSpecificationSuggestions();
  });
  productNameInput.addEventListener("input", refreshSpecificationSuggestions);
  configureSpecificationSuggestions();

  Array.prototype.forEach.call(form.querySelectorAll("[data-spec-key]"), function (input) {
    input.addEventListener("focus", refreshSpecificationSuggestions);
  });

  offerImageInputs.forEach(function (input, index) {
    input.addEventListener("change", function () {
      var file = input.files && input.files[0];
      if (!file) {
        return;
      }
      if (allowedImageTypes.indexOf(file.type) === -1) {
        input.value = "";
        setPromotionStatus("Choose a JPEG, PNG, WebP, or AVIF image for each offer.", true);
        return;
      }
      if (file.size > maxImageSize) {
        input.value = "";
        setPromotionStatus("Each offer image must be 5 MB or smaller.", true);
        return;
      }
      clearOfferImagePreviewUrl(index);
      selectedOfferImageFiles[index] = file;
      offerImageRemovalPending[index] = false;
      offerImagePreviewUrls[index] = URL.createObjectURL(file);
      renderOfferImagePreview(index);
      setPromotionStatus("Offer image selected. Save offers to publish it.", false);
    });

    offerImageRemoveButtons[index].addEventListener("click", function () {
      if (selectedOfferImageFiles[index]) {
        selectedOfferImageFiles[index] = null;
        offerImageInputs[index].value = "";
        clearOfferImagePreviewUrl(index);
      } else {
        offerImageRemovalPending[index] = !offerImageRemovalPending[index];
      }
      renderOfferImagePreview(index);
    });
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

    var imageUrls = offerImageUrls.map(function (url, index) {
      return offerImageRemovalPending[index] ? null : url;
    });
    var uploadedImageUrls = [];
    promotionSaveButton.disabled = true;
    setPromotionStatus("Saving offers...", false);
    try {
      await uploadSelectedOfferImages(imageUrls, uploadedImageUrls);
      var result = await client
        .from("store_promotions")
        .update({
          offer_one_percent: percentages[0],
          offer_two_percent: percentages[1],
          offer_three_percent: percentages[2],
          offer_one_image_url: imageUrls[0],
          offer_two_image_url: imageUrls[1],
          offer_three_image_url: imageUrls[2],
          updated_at: new Date().toISOString()
        })
        .eq("id", 1)
        .select("id")
        .single();
      if (result.error) {
        throw result.error;
      }

      var oldImageUrls = offerImageUrls.filter(function (url, index) {
        return url && url !== imageUrls[index];
      });
      offerImageUrls = imageUrls;
      selectedOfferImageFiles.forEach(function (file, index) {
        selectedOfferImageFiles[index] = null;
        offerImageRemovalPending[index] = false;
        offerImageInputs[index].value = "";
        clearOfferImagePreviewUrl(index);
        renderOfferImagePreview(index);
      });
      if (oldImageUrls.length) {
        try {
          await removeStoredImages(oldImageUrls);
        } catch (cleanupError) {
          console.error("Offers were saved, but replaced offer images could not be removed.", cleanupError);
          setPromotionStatus("Offers were saved, but an old image could not be removed from storage. " +
            (cleanupError.message || "Contact support if storage cleanup is needed."), true);
          return;
        }
      }
      setPromotionStatus("Offers saved and updated on the homepage.", false);
    } catch (error) {
      console.error("Could not save store offers.", error);
      var cleanupMessage = "";
      if (uploadedImageUrls.length) {
        try {
          await removeStoredImages(uploadedImageUrls);
        } catch (cleanupError) {
          console.error("Could not remove images uploaded for an unsuccessful offer save.", cleanupError);
          cleanupMessage = " Uploaded image cleanup also failed: " +
            (cleanupError.message || "check the Storage bucket.");
        }
      }
      setPromotionStatus("Could not save offers. " + (error.message || "Check your connection and try again.") +
        cleanupMessage, true);
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

  document.getElementById("add-testimonial-button").addEventListener("click", function () {
    openTestimonialDialog(null);
  });
  document.getElementById("empty-add-testimonial-button").addEventListener("click", function () {
    openTestimonialDialog(null);
  });
  document.getElementById("testimonial-close-button").addEventListener("click", function () {
    testimonialDialog.close();
  });
  document.getElementById("testimonial-cancel-button").addEventListener("click", function () {
    testimonialDialog.close();
  });
  testimonialList.addEventListener("click", async function (event) {
    var button = event.target.closest("button[data-testimonial-action]");
    if (!button) {
      return;
    }
    var testimonial = testimonials.find(function (item) {
      return item.id === button.dataset.id;
    });
    if (!testimonial) {
      return;
    }
    if (button.dataset.testimonialAction === "edit") {
      openTestimonialDialog(testimonial);
      return;
    }
    if (!window.confirm("Delete the testimonial by " + testimonial.person_name + "? This cannot be undone.")) {
      return;
    }
    button.disabled = true;
    setTestimonialStatus("Deleting testimonial...", false);
    try {
      var result = await client
        .from("store_testimonials")
        .delete()
        .eq("id", testimonial.id)
        .select("id")
        .single();
      if (result.error) {
        throw result.error;
      }
      if (await loadTestimonials()) {
        setTestimonialStatus("Testimonial deleted.", false);
      }
    } catch (error) {
      console.error("Could not delete testimonial.", error);
      setTestimonialStatus("Could not delete testimonial. " + (error.message || "Check your connection and try again."), true);
      button.disabled = false;
    }
  });
  testimonialForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    testimonialFormError.textContent = "";
    var personName = testimonialForm.elements.person_name.value.trim();
    var testimonialText = testimonialForm.elements.testimonial_text.value.trim();
    var isPublished = testimonialForm.elements.is_published.checked;
    if (!personName || !testimonialText) {
      testimonialFormError.textContent = "Enter the person's name and testimonial.";
      return;
    }

    testimonialSaveButton.disabled = true;
    testimonialSaveButton.textContent = "Saving...";
    try {
      var testimonialData = {
        person_name: personName,
        testimonial_text: testimonialText,
        is_published: isPublished,
        updated_at: new Date().toISOString()
      };
      var result;
      if (editingTestimonialId) {
        result = await client
          .from("store_testimonials")
          .update(testimonialData)
          .eq("id", editingTestimonialId)
          .select("id")
          .single();
      } else {
        var nextSortOrder = testimonials.reduce(function (currentMax, item) {
          return Math.max(currentMax, Number(item.sort_order) || 0);
        }, 0) + 1;
        testimonialData.sort_order = nextSortOrder;
        result = await client.from("store_testimonials").insert(testimonialData).select("id").single();
      }
      if (result.error) {
        throw result.error;
      }
      testimonialDialog.close();
      if (await loadTestimonials()) {
        setTestimonialStatus(isPublished
          ? "Testimonial saved and published."
          : "Testimonial saved as a draft.", false);
      }
    } catch (error) {
      console.error("Could not save testimonial.", error);
      testimonialFormError.textContent = "Could not save testimonial. " +
        (error.message || "Check your connection and try again.");
      setTestimonialStatus("Could not save testimonial.", true);
    } finally {
      testimonialSaveButton.disabled = false;
      testimonialSaveButton.textContent = "Save testimonial";
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

    var name = selectedProductName();
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
