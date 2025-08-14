// ==UserScript==
// @name          Sticky Search Bar
// @author        Sibyl
// @version       1.4
// @icon          https://cdn.jsdelivr.net/gh/notsibyl/danbooru@main/danbooru.svg
// @namespace     https://danbooru.donmai.us/forum_posts?search[creator_id]=817128&search[topic_id]=8502
// @homepageURL   https://github.com/notsibyl/danbooru
// @downloadURL   https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/sticky-search-bar.user.js
// @updateURL     https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/sticky-search-bar.user.js
// @description   Makes the search bar stick to the top of the page.
// @match         *://*.donmai.us/*
// @exclude-match *://cdn.donmai.us/*
// @run-at        document-end
// ==/UserScript==

const useAcrylicBackground = true;
const alwaysShowSearchBar = true;

const acrylicConfig = {
  b: "backdrop-filter:blur(10px);",
  bg: "background-color:rgba(255,255,255,.8);", // Body Background Color
  rbg: "background-color:rgba(225,232,255,.8);", // Responsive Menu Background Color
  rbgc: "background-color:rgba(244,246,255,.4);", // Responsive Menu Background Color Current
  sbg: "background-color:rgba(244,246,255,.8);", // Subnav Menu Background Color
  d: {
    // Dark Mode
    bg: "background-color:rgba(30,30,44,.8);",
    rbg: "background-color:rgba(44,45,63,.8);",
    rbgc: "background-color:rgba(44,45,63,.4);",
    sbg: "background-color:rgba(44,45,63,.8);"
  }
};

const isMobile = window.matchMedia("(max-width: 660px)").matches;

const createElement = (tag, props = {}) => {
  const el = document.createElement(tag);
  const { style, dataset, ..._props } = props;
  Object.assign(el, _props);
  Object.assign(el.dataset, dataset);
  if (typeof style === "string") el.style.cssText = style;
  else Object.assign(el.style, style);
  return el;
};

const addStyle = css => document.head.appendChild(createElement("style", { textContent: css }));

let searchForm = document.getElementById("search-box-form"),
  searchInput;
if (!searchForm && !alwaysShowSearchBar) return;
if (searchForm) {
  searchInput = document.getElementById("tags");
} else {
  searchForm = createElement("form", { id: "search-box-form", className: "flex", action: "/posts", "accept-charset": "UTF-8", method: "get" });
  searchInput = createElement("input", {
    type: "text",
    name: "tags",
    id: "tags",
    className: "flex-auto ui-autocomplete-input",
    autocapitalize: "none",
    autocomplete: "off",
    title: "Shortcut is q",
    dataset: {
      shortcut: "q",
      autocomplete: "tag-query"
    }
  });
  searchForm.append(searchInput);
  const iconUri = document.querySelector("a#close-notice-link use").href.baseVal.split("#")[0];
  searchForm.insertAdjacentHTML(
    "beforeend",
    `<button id="search-box-submit" type="submit"><svg class="icon svg-icon search-icon" viewBox="0 0 512 512"><use fill="currentColor" href="${iconUri}#magnifying-glass"></use></svg></button>`
  );
}
let header = document.getElementById("top"),
  div = createElement("div", { id: "search-header" });
document.body.insertBefore(div, header);
div.appendChild(searchForm);
document.getElementById("app-name").remove();
document.getElementById("search-box")?.remove();
document.querySelector('#post-sections a[href="#search-box"]')?.remove();
setTimeout(() => {
  Danbooru.Autocomplete.initialize_tag_autocomplete();
  $(searchInput).autocomplete("option", "appendTo", "#search-header");
}, 0);
const bgConfig = !useAcrylicBackground
  ? "}#search-header{background-color:var(--body-background-color)}"
  : `#top{background-color:transparent}#main-menu{${acrylicConfig.b};${acrylicConfig.rbg}}#main-menu .current{${acrylicConfig.rbgc}}#subnav-menu{${acrylicConfig.b};${acrylicConfig.sbg}}}#search-header{${acrylicConfig.b};${acrylicConfig.bg}}@media (prefers-color-scheme:dark){#search-header{${acrylicConfig.d.bg}}}@media screen and (max-width:660px) and (prefers-color-scheme:dark){#main-menu{${acrylicConfig.d.rbg}}#main-menu .current{${acrylicConfig.d.rbgc}}#subnav-menu{${acrylicConfig.d.sbg}}}`;
addStyle(
  "body{height:unset;min-height:100%}#search-header{position:sticky;top:0;z-index:11;}#search-box-form{min-width:180px;width:50vw;margin:0 30px;padding:.5rem 0}#search-box-form input{height:26px}#app-name-header{display:none}#notice{top:calc(1rem + 26px)}#main-menu a{outline-offset:-1px}header#top,header#top>nav{margin-top:0!important}@media screen and (max-width:660px){header#top{z-index:11;position:sticky;top:calc(26px + 1.5rem)}header#top>div{display:block;margin:0}#app-name-header{display:block;position:fixed;top:.3rem;left:.5rem}header#top>div>a{position:fixed;top:.7rem;right:.5rem}#search-box-form{width:70vw;transition:width 0.2s ease;margin:0 auto;padding:.75rem 0}#search-box-form:focus-within{width:90vw}#search-box-form input#tags{min-width:180px}#search-header .ui-menu{width:70vw!important}#notice{top:calc(1.5rem + 26px)}" +
    bgConfig
);
searchForm.addEventListener("focusin", () => {
  div.style.zIndex = "12";
});
searchForm.addEventListener("focusout", () => {
  div.style.zIndex = "11";
});
document.getElementById("app-logo").addEventListener("click", e => {
  e.preventDefault();
  e.currentTarget.blur();
  window.scrollTo({ top: 0, behavior: "smooth" });
});
searchInput.addEventListener("keydown", e => {
  if (e.altKey && e.key === "Enter") {
    e.preventDefault();
    const query = encodeURIComponent(searchInput.value.trim());
    if (query) {
      const searchUrl = `/posts?tags=${query}`;
      window.open(searchUrl, "_blank");
    }
  }
});
