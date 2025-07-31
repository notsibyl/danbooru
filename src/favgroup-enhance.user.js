// ==UserScript==
// @name        Favorite Group Enhance
// @author      Sibyl
// @version     1.2
// @icon        https://cdn.jsdelivr.net/gh/notsibyl/danbooru@main/danbooru.svg
// @namespace   https://danbooru.donmai.us/forum_posts?search[creator_id]=817128&search[topic_id]=8502
// @homepageURL https://github.com/notsibyl/danbooru
// @downloadURL https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/favgroup-count.user.js
// @updateURL   https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/favgroup-count.user.js
// @match       *://*.donmai.us/posts/*
// @match       *://*.donmai.us/favorite_groups/*/edit
// @grant       GM_addStyle
// @run-at      document-end
// ==/UserScript==

const createElement = (tag, props = {}, dataset = {}) => {
  const el = document.createElement(tag);
  Object.assign(el, props);
  Object.assign(el.dataset, dataset);
  return el;
};
const decodeHtml = html => {
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
};

const controller = document.body.dataset?.controller,
  action = document.body.dataset?.action;
if (controller === "favorite-groups" && action === "edit") {
  const sortIds = (ascending = true) => {
    let tArea = document.querySelector("#favorite_group_post_ids_string"),
      ids = tArea.value.trim(),
      idsArr = ids.split(/\s+/).filter(id => /^\d+$/.test(id));
    idsArr = [...new Set(idsArr)];
    idsArr.sort((a, b) => (ascending ? a - b : b - a));
    tArea.value = idsArr.join(" ");
    Danbooru.Notice.info(`Sort in ${ascending ? "ascending" : "descending"} order.`);
  };
  const label = document.querySelector(".favorite_group_post_ids_string > label");
  const span = createElement("span", { classList: "text-xxs text-center", style: "font-weight:normal" });
  const aA = createElement("a", { textContent: "Ascending" });
  const aD = createElement("a", { textContent: "Descending" });
  span.append("  ", aA, " | ", aD);
  label.append(span);
  aA.addEventListener("click", () => sortIds());
  aD.addEventListener("click", () => sortIds(false));
} else if (controller === "posts" && action === "show") {
  const noticeSearchBar = document.querySelector(".post-notice-search"),
    favgroupBars = noticeSearchBar?.querySelectorAll(".favgroup-navbar"),
    addToAnchors = document.querySelectorAll(".add-to-favgroup");
  const iconUri = document.querySelector("a#close-notice-link use").href.baseVal.split("#")[0];
  const postId = document.body.dataset.postId;
  const handleFavgroupBar = (bar, groupName, pathname) => {
    const xEl = createElement("a", { classList: "favgroup-removal text-lg", title: "Remove from this group" });
    xEl.innerHTML = `<svg class="icon svg-icon close-icon" viewBox="0 0 320 512"><use fill="currentColor" href="${iconUri}#xmark"></use></svg>`;
    if (!bar) {
      bar = createElement("li", { classList: "favgroup-navbar" }, { selected: false });
      let nameEl = createElement("span", { classList: "favgroup-name" });
      let a = createElement("a", { href: pathname, textContent: "Favgroup: " + groupName });
      nameEl.append(a, xEl);
      bar.appendChild(nameEl);
      noticeSearchBar.appendChild(bar);
    } else {
      const nameEl = bar.querySelector(".favgroup-name");
      nameEl.appendChild(xEl);
      pathname = nameEl.children[0].pathname;
    }
    xEl.addEventListener("click", () => {
      fetch(`${pathname}/remove_post.js?post_id=${postId}`, {
        method: "PUT",
        headers: { "X-CSRF-Token": Danbooru.Utility.meta("csrf-token") }
      })
        .then(resp => resp.text())
        .then(text => {
          const matched = text.match(/"(Removed post from favorite group )(.+?)"\);/);
          if (matched) {
            const url = encodeURI(`/posts?tags=favgroup:"${matched[2]}"`);
            const text = matched[1] + `<a href="${url}">${matched[2]}</a>`;
            Danbooru.Notice.info(text);
            bar.remove();
          }
        });
    });
  };
  if (addToAnchors.length) {
    GM_addStyle(
      ".favgroup-name{white-space:normal!important}.favgroup-navbar:hover .favgroup-removal{opacity:1}.favgroup-removal{opacity:0;color:var(--button-danger-background-color);position:absolute;transform:translate(50%,-5%);cursor:pointer}.favgroup-removal:hover{color:var(--button-danger-hover-background-color)}"
    );
    const origOpen = window.XMLHttpRequest.prototype.open;
    window.XMLHttpRequest.prototype.open = function (method, url) {
      if (method === "PUT") {
        let groupId = url.match(/\/favorite_groups\/(\d+)\/add_post\.js/)?.[1];
        if (groupId)
          this.addEventListener("readystatechange", function () {
            if (this.readyState !== XMLHttpRequest.DONE) return;
            const groupName = this.response.match(/"Added post to favorite group (.+?)"/)?.[1];
            if (groupName) {
              const isShown = Array.from(favgroupBars).some(bar => bar.querySelector(".favgroup-name>a:first-of-type").pathname.split("/")[2] === groupId);
              if (!isShown) handleFavgroupBar(null, decodeHtml(groupName), `/favorite_groups/${groupId}`);
            }
          });
      }
      return origOpen.apply(this, [].slice.call(arguments));
    };
  } else return;
  if (favgroupBars.length) favgroupBars.forEach(bar => handleFavgroupBar(bar));
}
