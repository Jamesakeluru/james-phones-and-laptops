(function () {
  "use strict";

  var homepage = document.getElementById("home-blog-section");
  var homepagePosts = document.getElementById("home-blog-posts");
  var blogPosts = document.getElementById("blog-posts");
  var blogStatus = document.getElementById("blog-status");
  if (!homepagePosts && !blogPosts) {
    return;
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
      console.warn("Skipping an invalid blog image URL.");
    }
    return null;
  }

  function createPost(post) {
    var column = document.createElement("div");
    column.className = "col-md-6";
    var card = document.createElement("article");
    card.className = "box managed-blog-post";

    var imageUrl = safeImageUrl(post.image_url);
    if (imageUrl) {
      var imageBox = document.createElement("div");
      imageBox.className = "img-box";
      var image = document.createElement("img");
      image.src = imageUrl;
      image.alt = post.title;
      image.loading = "lazy";
      image.addEventListener("error", function () {
        imageBox.hidden = true;
      });
      imageBox.appendChild(image);
      if (post.published_at) {
        var date = new Date(post.published_at);
        if (Number.isFinite(date.getTime())) {
          var dateBadge = document.createElement("h4");
          dateBadge.className = "blog_date";
          dateBadge.textContent = date.toLocaleDateString("en-GH", {
            day: "numeric",
            month: "short"
          });
          imageBox.appendChild(dateBadge);
        }
      }
      card.appendChild(imageBox);
    }

    var details = document.createElement("div");
    details.className = "detail-box";
    var title = document.createElement("h5");
    title.textContent = post.title;
    var summary = document.createElement("p");
    summary.textContent = post.summary;
    details.appendChild(title);
    details.appendChild(summary);

    var article = document.createElement("details");
    article.className = "blog-read-more";
    var articleSummary = document.createElement("summary");
    articleSummary.textContent = "Read full post";
    var content = document.createElement("p");
    content.textContent = post.content;
    article.appendChild(articleSummary);
    article.appendChild(content);
    details.appendChild(article);
    card.appendChild(details);
    column.appendChild(card);
    return column;
  }

  function renderPosts(container, posts) {
    container.replaceChildren();
    posts.forEach(function (post) {
      container.appendChild(createPost(post));
    });
  }

  function getClient() {
    var config = window.JAMES_PHONES_SUPABASE;
    if (!config || !config.url || !config.anonKey ||
        config.url.indexOf("YOUR_") !== -1 || config.anonKey.indexOf("YOUR_") !== -1) {
      throw new Error("Supabase is not configured.");
    }
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      throw new Error("The Supabase client did not load.");
    }
    var client = window.JAMES_PHONES_PUBLIC_CLIENT;
    if (!client) {
      client = window.supabase.createClient(config.url, config.anonKey);
      window.JAMES_PHONES_PUBLIC_CLIENT = client;
    }
    return client;
  }

  (async function () {
    try {
      var result = await getClient()
        .from("store_blog_posts")
        .select("id, title, summary, content, image_url, published_at")
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(50);
      if (result.error) {
        throw result.error;
      }

      var posts = result.data || [];
      if (homepagePosts) {
        renderPosts(homepagePosts, posts.slice(0, 2));
        homepage.hidden = posts.length === 0;
      }
      if (blogPosts) {
        renderPosts(blogPosts, posts);
        blogStatus.textContent = posts.length ? "" : "No blog posts have been published yet.";
      }
    } catch (error) {
      console.error("Could not load published blog posts.", error);
      if (homepage) {
        homepage.hidden = true;
      }
      if (blogStatus) {
        blogStatus.textContent = "Blog posts are temporarily unavailable.";
      }
    }
  }());
}());
