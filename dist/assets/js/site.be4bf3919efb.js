(function () {
  "use strict";
  var menuToggle = document.getElementById("menuToggle");
  var siteNav = document.getElementById("siteNav");
  var moreButton = document.querySelector(".ks-menu-button");
  var moreMenu = document.getElementById("moreMenu");
  var searchToggle = document.getElementById("searchToggle");
  var headerSearch = document.getElementById("headerSearch");
  var headerSearchInput = document.getElementById("headerSearchInput");

  function setExpanded(element, value) { if (element) element.setAttribute("aria-expanded", String(value)); }
  function closeMore() {
    if (moreMenu) moreMenu.classList.remove("is-open");
    if (moreButton) moreButton.parentElement.classList.remove("open");
    setExpanded(moreButton, false);
  }
  function closeSearch() {
    if (headerSearch) headerSearch.hidden = true;
    if (searchToggle) searchToggle.parentElement.classList.remove("is-search-open");
    setExpanded(searchToggle, false);
  }
  function closeNavigation() {
    if (siteNav) siteNav.classList.remove("in");
    if (menuToggle) menuToggle.classList.add("collapsed");
    setExpanded(menuToggle, false);
    closeMore();
    closeSearch();
  }

  if (menuToggle && siteNav) menuToggle.addEventListener("click", function () {
    if (siteNav.classList.contains("in")) {
      closeNavigation();
      return;
    }
    siteNav.classList.add("in");
    menuToggle.classList.remove("collapsed");
    setExpanded(menuToggle, true);
    closeMore();
    closeSearch();
  });
  if (moreButton && moreMenu) moreButton.addEventListener("click", function () {
    var open = moreMenu.classList.toggle("is-open");
    moreButton.parentElement.classList.toggle("open", open);
    setExpanded(moreButton, open);
    closeSearch();
  });
  if (searchToggle && headerSearch && headerSearchInput) searchToggle.addEventListener("click", function () {
    var open = headerSearch.hidden;
    if (!open) {
      closeSearch();
      return;
    }
    headerSearch.hidden = false;
    searchToggle.parentElement.classList.add("is-search-open");
    setExpanded(searchToggle, true);
    closeMore();
    headerSearchInput.focus();
  });
  document.addEventListener("click", function (event) {
    if (siteNav && siteNav.classList.contains("in") && !siteNav.contains(event.target) && (!menuToggle || !menuToggle.contains(event.target))) closeNavigation();
    if (moreButton && !moreButton.parentElement.contains(event.target)) closeMore();
    if (headerSearch && !headerSearch.parentElement.contains(event.target)) closeSearch();
  });
  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    closeNavigation();
  });

  function createVideoPlayer(player) {
    var videoId = player.getAttribute("data-video-id");
    var videoTitle = player.getAttribute("data-video-title") || "Video de Kurosu y Cía.";
    var videoStart = Number.parseInt(player.getAttribute("data-video-start") || "0", 10) || 0;
    if (!/^[A-Za-z0-9_-]{11}$/.test(videoId || "") || player.classList.contains("is-playing")) return;
    var iframe = document.createElement("iframe");
    iframe.src = "https://www.youtube-nocookie.com/embed/" + videoId + "?autoplay=1&controls=1&playsinline=1&rel=0&modestbranding=1" + (videoStart > 0 ? "&start=" + videoStart : "");
    iframe.title = videoTitle;
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    player.replaceChildren(iframe);
    player.classList.add("is-playing");
  }

  document.querySelectorAll("[data-ks-video]").forEach(function (player) {
    player.addEventListener("click", function (event) {
      var trigger = event.target.closest("[data-ks-video-trigger]");
      if (!trigger || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      createVideoPlayer(player);
    });
  });

  document.querySelectorAll(".ks-page[aria-labelledby='faq-title'] details").forEach(function (item, _, items) {
    item.addEventListener("toggle", function () {
      if (item.open) items.forEach(function (other) { if (other !== item) other.open = false; });
    });
  });

  function pageHref(url) {
    if (window.location.protocol !== "file:") return url;
    var prefix = window.KS_ROUTE_PREFIX || "./";
    return url === "/" ? prefix + "index.html" : prefix + url.replace(/^\/+|\/+$/g, "") + "/index.html";
  }
  function clearResults(results) { while (results.firstChild) results.removeChild(results.firstChild); }
  function showResults(query, results) {
    var q = query.trim().toLocaleLowerCase("es");
    var pages = window.KS_SEARCH_INDEX || [];
    clearResults(results);
    if (!q) return;
    pages.filter(function (page) {
      return (page.title + " " + page.description).toLocaleLowerCase("es").includes(q);
    }).forEach(function (page) {
      var item = document.createElement("article");
      var heading = document.createElement("h3");
      var link = document.createElement("a");
      var description = document.createElement("p");
      item.className = "ks-search-result";
      link.href = pageHref(page.url);
      link.textContent = page.title;
      description.textContent = page.description;
      heading.appendChild(link);
      item.appendChild(heading);
      item.appendChild(description);
      results.appendChild(item);
    });
  }
  document.querySelectorAll("[data-ks-search-input]").forEach(function (input) {
    var results = document.getElementById(input.getAttribute("data-ks-search-results-id"));
    if (!results) return;
    var form = input.closest("form");
    input.addEventListener("input", function () { showResults(input.value, results); });
    if (form) form.addEventListener("submit", function (event) { event.preventDefault(); showResults(input.value, results); });
    if (input.id === "searchInput") {
      var query = new URLSearchParams(window.location.search).get("q");
      if (query) { input.value = query; showResults(query, results); }
    }
  });
}());
