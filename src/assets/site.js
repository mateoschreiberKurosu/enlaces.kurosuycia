(function () {
  "use strict";
  var menuToggle = document.getElementById("menuToggle");
  var siteNav = document.getElementById("siteNav");
  var moreButton = document.querySelector(".ks-menu-button");
  var moreMenu = document.getElementById("moreMenu");

  function setExpanded(element, value) { if (element) element.setAttribute("aria-expanded", String(value)); }
  if (menuToggle && siteNav) menuToggle.addEventListener("click", function () { var open = siteNav.classList.toggle("in"); menuToggle.classList.toggle("collapsed", !open); setExpanded(menuToggle, open); });
  if (moreButton && moreMenu) moreButton.addEventListener("click", function () { var open = moreMenu.classList.toggle("is-open"); moreButton.parentElement.classList.toggle("open", open); setExpanded(moreButton, open); });
  document.addEventListener("keydown", function (event) { if (event.key === "Escape") { if (siteNav) siteNav.classList.remove("in"); if (menuToggle) menuToggle.classList.add("collapsed"); if (moreMenu) moreMenu.classList.remove("is-open"); setExpanded(menuToggle, false); setExpanded(moreButton, false); } });

  function createVideoPlayer(player) {
    var videoId = player.getAttribute("data-video-id");
    var videoTitle = player.getAttribute("data-video-title") || "Video de Kurosu y Cía.";
    var videoStart = Number.parseInt(player.getAttribute("data-video-start") || "0", 10) || 0;
    if (!/^[A-Za-z0-9_-]{11}$/.test(videoId || "") || player.classList.contains("is-playing")) return;
    var iframe = document.createElement("iframe");
    iframe.src = "https://www.youtube-nocookie.com/embed/" + videoId + "?autoplay=1&controls=1&playsinline=1&rel=0&modestbranding=1" + (videoStart > 0 ? "&start=" + videoStart : "");
    iframe.title = videoTitle;
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen";
    iframe.allowFullscreen = true;
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

  document.querySelectorAll(".ks-page[aria-labelledby='faq-title'] details").forEach(function (item, _, items) { item.addEventListener("toggle", function () { if (item.open) items.forEach(function (other) { if (other !== item) other.open = false; }); }); });
  var form = document.querySelector(".ks-search-form"); var input = document.getElementById("searchInput"); var results = document.getElementById("searchResults");
  if (form && input && results) {
    function pageHref(url) {
      if (window.location.protocol !== "file:") return url;
      return url === "/" ? "../index.html" : "../" + url.replace(/^\/+|\/+$/g, "") + "/index.html";
    }
    function showResults(query) { var pages = window.KS_SEARCH_INDEX || []; var q = query.trim().toLocaleLowerCase("es"); var matches = q ? pages.filter(function (page) { return (page.title + " " + page.description).toLocaleLowerCase("es").includes(q); }) : []; results.innerHTML = q ? (matches.length ? `<p class="result-count">${matches.length} resultado(s) para “${query}”</p><ul class="search-results">${matches.map(function (page) { return `<li><h4><a href="${pageHref(page.url)}" target="_blank" rel="noopener noreferrer">${page.title}</a></h4><p class="fragment">${page.description}</p></li>`; }).join("")}</ul>` : `<p class="result-count">No encontramos resultados para “${query}”.</p>`) : ""; }
    var query = new URLSearchParams(window.location.search).get("q"); if (query) { input.value = query; showResults(query); }
    form.addEventListener("submit", function (event) { event.preventDefault(); var q = input.value.trim(); if (window.location.protocol !== "file:") history.replaceState(null, "", q ? "/busqueda/?q=" + encodeURIComponent(q) : "/busqueda/"); showResults(q); });
  }
}());
