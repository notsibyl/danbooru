// ==UserScript==
// @name        Sticky Search Box
// @author      Sibyl
// @version     1.1
// @icon        https://cdn.jsdelivr.net/gh/notsibyl/danbooru@main/danbooru.svg
// @namespace   https://danbooru.donmai.us/forum_posts?search[creator_id]=817128&search[topic_id]=8502
// @homepageURL https://github.com/notsibyl/danbooru
// @downloadURL https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/sticky-search-box.user.js
// @updateURL   https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/sticky-search-box.user.js
// @description Makes the search box stick to the top of the page.
// @match       *://*.donmai.us/*
// @grant       none
// @run-at      document-end
// ==/UserScript==

const useAcrylicBackground = true;

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

const searchBox = document.getElementById("search-box");
if (searchBox) {
  let searchForm = document.getElementById("search-box-form"),
    input = document.getElementById("tags"),
    header = document.getElementById("top"),
    div = document.createElement("div");
  div.id = "search-header";
  document.body.insertBefore(div, header);
  div.appendChild(searchForm);
  document.getElementById("app-name").remove();
  document.querySelector('#post-sections a[href="#search-box"]')?.remove();
  searchBox.remove();
  setTimeout(() => $(input).autocomplete("option", "appendTo", "#search-header"), 0);
  const style = document.createElement("style");
  document.head.appendChild(style);
  const bgConfig = !useAcrylicBackground
    ? "}#search-header{background-color:var(--body-background-color)}"
    : `#top{background-color:transparent}#main-menu{${acrylicConfig.b};${acrylicConfig.rbg}}#main-menu .current{${acrylicConfig.rbgc}}#subnav-menu{${acrylicConfig.b};${acrylicConfig.sbg}}}#search-header{${acrylicConfig.b};${acrylicConfig.bg}}@media (prefers-color-scheme:dark){#search-header{${acrylicConfig.d.bg}}}@media screen and (max-width:660px) and (prefers-color-scheme:dark){#main-menu{${acrylicConfig.d.rbg}}#main-menu .current{${acrylicConfig.d.rbgc}}#subnav-menu{${acrylicConfig.d.sbg}}}`;
  style.innerHTML =
    "body{height:unset}#search-header{position:sticky;top:0;z-index:2;}#search-box-form{min-width:180px;width:50vw;margin:0 30px;padding:.5rem 0}#search-box-form input{height:26px}#app-name-header{display:none}#notice{top:calc(1rem + 26px)}#main-menu a{outline-offset:-1px}header#top,header#top>nav{margin-top:0!important}@media screen and (max-width:660px){header#top{z-index:2;position:sticky;top:calc(26px + 1.5rem)}header#top>div{display:block;margin:0}#app-name-header{display:block;position:fixed;top:.3rem;left:.5rem}header#top>div>a{position:fixed;top:.7rem;right:.5rem}#search-box-form{width:70vw;margin:0 auto;padding:.75rem 0}#search-box-form input#tags{min-width:180px}#search-header .ui-menu{width:70vw!important}#notice{top:calc(1.5rem + 26px)}" +
    bgConfig;
  document.getElementById("app-logo").addEventListener("click", e => {
    e.preventDefault();
    e.currentTarget.blur();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  input.addEventListener("keydown", function (event) {
    if (event.altKey && event.key === "Enter") {
      event.preventDefault();
      const query = encodeURIComponent(this.value.trim());
      if (query) {
        const searchUrl = `/posts?tags=${query}`;
        window.open(searchUrl, "_blank");
      }
    }
  });
}