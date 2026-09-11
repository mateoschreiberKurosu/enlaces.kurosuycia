(function () {
  "use strict";

  function createVideoPlayer(player) {
    var videoId = player.getAttribute("data-video-id");
    var videoTitle = player.getAttribute("data-video-title") || "Video de Kurosu & Cía.";
    var videoStart = parseInt(player.getAttribute("data-video-start"), 10) || 0;

    if (!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId) || player.classList.contains("is-playing")) {
      return;
    }

    var iframe = document.createElement("iframe");
    iframe.src = "https://www.youtube-nocookie.com/embed/" + videoId + "?autoplay=1&controls=1&playsinline=1&rel=0&modestbranding=1" + (videoStart > 0 ? "&start=" + videoStart : "");
    iframe.title = videoTitle;
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen";
    iframe.allowFullscreen = true;
    iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");

    while (player.firstChild) {
      player.removeChild(player.firstChild);
    }

    player.classList.add("is-playing");
    player.appendChild(iframe);
  }

  function initializeHomeHub() {
    var videoPlayers = document.querySelectorAll("[data-ks-video]");

    Array.prototype.forEach.call(videoPlayers, function (player) {
      player.addEventListener("click", function (event) {
        var trigger = event.target.closest ? event.target.closest("[data-ks-video-trigger]") : null;

        if (!trigger || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
          return;
        }

        event.preventDefault();
        createVideoPlayer(player);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeHomeHub);
  } else {
    initializeHomeHub();
  }
}());
