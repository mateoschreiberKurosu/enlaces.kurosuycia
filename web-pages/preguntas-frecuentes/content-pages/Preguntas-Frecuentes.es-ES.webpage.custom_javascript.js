(function () {
  "use strict";

  function initializeFaq() {
    var faq = document.querySelector(".ks-page[aria-labelledby='faq-title']");
    var items;

    if (!faq) {
      return;
    }

    items = faq.querySelectorAll("details");

    Array.prototype.forEach.call(items, function (item) {
      item.addEventListener("toggle", function () {
        if (!item.open) {
          return;
        }

        Array.prototype.forEach.call(items, function (otherItem) {
          if (otherItem !== item && otherItem.open) {
            otherItem.open = false;
          }
        });
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeFaq);
  } else {
    initializeFaq();
  }
}());
