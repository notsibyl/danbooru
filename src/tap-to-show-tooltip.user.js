// ==UserScript==
// @name        Tap to show tooltip
// @author      Sibyl
// @version     0.2
// @icon        https://cdn.jsdelivr.net/gh/notsibyl/danbooru@main/danbooru.svg
// @namespace   https://danbooru.donmai.us/forum_posts?search[creator_id]=817128&search[topic_id]=8502
// @homepageURL https://github.com/notsibyl/danbooru
// @downloadURL https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/tap-to-show-tooltip.user.js
// @updateURL   https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/tap-to-show-tooltip.user.js
// @match       *://danbooru.donmai.us/*
// @grant       none
// @run-at      document-end
// ==/UserScript==

(function () {
  "use strict";

  window.matchMedia("(max-width: 660px)").matches &&
    $(document)
      .find(".post-score>a,.post-favcount>a,a.stt-style")
      .on("click", function (event) {
        const el = event.currentTarget;
        if (!el.dataset.focused) {
          event.preventDefault();
          el.dataset.focused = "true";
          el.addEventListener(
            "blur",
            () => {
              delete el.dataset.focused;
            },
            { once: true }
          );
        }
      });
})();
