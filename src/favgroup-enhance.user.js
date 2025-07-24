// ==UserScript==
// @name        Favorite Group Enhance
// @author      Sibyl
// @version     1.1
// @icon        https://cdn.jsdelivr.net/gh/notsibyl/danbooru@main/danbooru.svg
// @namespace   https://danbooru.donmai.us/forum_posts?search[creator_id]=817128&search[topic_id]=8502
// @homepageURL https://github.com/notsibyl/danbooru
// @downloadURL https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/favgroup-count.user.js
// @updateURL   https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/favgroup-count.user.js
// @match       *://*.donmai.us/posts/*
// @match       *://*.donmai.us/favorite_groups/*/edit
// @grant       none
// @run-at      document-end
// ==/UserScript==

const controller = document.body.dataset?.controller,
  action = document.body.dataset?.action;
if (controller === "favorite-groups" && action === "edit") {
  let textAreaLabel = document.querySelector(".favorite_group_post_ids_string > label");
  textAreaLabel.insertAdjacentHTML(
    "beforeend",
    `<span class="text-xxs text-center" style="font-weight:normal;">&nbsp;&nbsp;<a class="ids_ascending">Ascending</a>&nbsp;|&nbsp;<a class="ids_descending">Descending</a></span>`
  );
  textAreaLabel.querySelector("a.ids_ascending").addEventListener("click", () => sortIds());
  textAreaLabel.querySelector("a.ids_descending").addEventListener("click", () => sortIds(false));
  function sortIds(ascending = true) {
    let tArea = document.querySelector("#favorite_group_post_ids_string"),
      ids = tArea.value.trim(),
      idsArr = ids.split(/\s+/).filter(id => /^\d+$/.test(id));
    idsArr = [...new Set(idsArr)];
    idsArr.sort((a, b) => (ascending ? a - b : b - a));
    tArea.value = idsArr.join(" ");
    Danbooru.notice(`Sort in ${ascending ? "ascending" : "descending"} order.`);
  }
} else if (controller === "posts" && action === "show") {
  let noticeSearchBar = document.querySelector(".post-notice-search"),
    favBars = noticeSearchBar?.querySelectorAll(".favgroup-navbar") || [];
  if (favBars.length) {
    document.head.insertAdjacentHTML(
      "beforeend",
      `<style>.post-notice-search>.favgroup-navbar{display:flex;align-items:center}.favgroup-navbar>.favgroup-name{white-space:normal!important}.favgroup-navbar:hover .fav-remove-link{opacity:1}.favgroup-navbar .fav-remove-link{opacity:0}.fav-remove-link{color:var(--button-danger-background-color)}.fav-remove-link:hover{color:var(--button-danger-hover-background-color)}</style>`
    );
    const iconUri = document.querySelector("a#close-notice-link use").href.baseVal.split("#")[0];
    const postId = document.body.dataset.postId;
    favBars.forEach(fav => {
      let favName = fav.querySelector(".favgroup-name");
      let pre = favName.children[0].href;
      favName.insertAdjacentHTML(
        "beforeend",
        `&nbsp;<a class="fav-remove-link text-lg" title="Remove from this group"><svg class="icon svg-icon close-icon" viewBox="0 0 320 512"><use fill="currentColor" href="${iconUri}#xmark"></use></svg></a>`
      );
      favName.lastElementChild.addEventListener("click", () => {
        fetch(`${pre}/remove_post.js?post_id=${postId}`, {
          method: "PUT",
          headers: {
            "X-CSRF-Token": Danbooru.Utility.meta("csrf-token")
          }
        })
          .then(resp => resp.text())
          .then(text => {
            const matched = text.match(/"(Removed post from favorite group )(.+?)"\);/);
            if (matched) {
              const url = encodeURI(`/posts?tags=favgroup:"${matched[2]}"`);
              const text = matched[1] + `<a href="${url}">${matched[2]}</a>`;
              unsafeWindow.Danbooru.notice(text);
              fav.remove();
              if (noticeSearchBar.children.length === 0) noticeSearchBar.remove();
            }
          });
      });
    });
  }
}
