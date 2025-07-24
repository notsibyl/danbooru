// ==UserScript==
// @name        Show fav groups count
// @author      Sibyl
// @version     0.2
// @icon        https://cdn.jsdelivr.net/gh/notsibyl/danbooru@main/danbooru.svg
// @namespace   https://danbooru.donmai.us/forum_posts?search[creator_id]=817128&search[topic_id]=8502
// @homepageURL https://github.com/notsibyl/danbooru
// @downloadURL https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/favgroup-count.user.js
// @updateURL   https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/favgroup-count.user.js
// @description Show fav groups count in post infomation column.
// @match       *://*.donmai.us/posts/*
// @grant       none
// @run-at      document-end
// ==/UserScript==

(() => {
  const HIDE_IF_NO_FAVGROUPS_YET = false;
  const postId = document.body.dataset["postId"];
  if (!postId) return;
  fetch(
    "/favorite_groups.json?only=id&limit=100&search%5Bpost_ids_include_all%5D=" +
      postId
  )
    .then(resp => resp.json())
    .then(json => {
      if (Array.isArray(json)) {
        let len = json.length;
        if (len === 0 && HIDE_IF_NO_FAVGROUPS_YET) return;
        len = len > 100 ? len + "+" : len;
        document
          .getElementById("post-info-favorites")
          ?.insertAdjacentHTML(
            "afterend",
            `<li id="post-info-favgroups">Favgroups: <a href="/favorite_groups?search%5Bpost_ids_include_all%5D=${postId}" target="_blank">${len}</a></li>`
          );
      }
    });
})();