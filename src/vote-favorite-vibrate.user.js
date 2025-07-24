// ==UserScript==
// @name        Vibrate on Vote or Favorite
// @author      Sibyl
// @version     1.2
// @icon        https://cdn.jsdelivr.net/gh/notsibyl/danbooru@main/danbooru.svg
// @namespace   https://danbooru.donmai.us/forum_posts?search[creator_id]=817128&search[topic_id]=8502
// @homepageURL https://github.com/notsibyl/danbooru
// @downloadURL https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/vote-favorite-vibrate.user.js
// @updateURL   https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/vote-favorite-vibrate.user.js
// @match       *://*.donmai.us/*
// @grant       none
// @run-at      document-end
// ==/UserScript==

(() => {
  "use strict";

  let origOpen = window.XMLHttpRequest.prototype.open;
  window.XMLHttpRequest.prototype.open = function (method, url) {
    if (method === "POST" || method === "DELETE") {
      const patterns = [
        url => url.includes("/favorites?post_id="),
        url => /\/(comment_votes|favorites)\/\d+$/.test(url),
        url => /\/(comments|posts)\/\d+\/votes/.test(url),
        url => /\/forum_post_votes\/\d+\.js/.test(url),
        url => url.includes("/forum_post_votes.js?forum_post_id=")
      ];

      if (patterns.some(test => test(url))) {
        this.addEventListener("readystatechange", function () {
          if (this.readyState !== XMLHttpRequest.DONE) return;
          if (this.response.indexOf("Danbooru.Utility.error") === -1) {
            if (navigator.vibrate) navigator.vibrate(50);
            else Danbooru.Utility.error("Vibration API is not supported");
          }
        });
      }
    }
    return origOpen.apply(this, [].slice.call(arguments));
  };
})();
