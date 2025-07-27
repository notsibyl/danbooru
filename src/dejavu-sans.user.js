// ==UserScript==
// @name          DejaVu Sans
// @author        Sibyl
// @version       1.1
// @icon          https://cdn.jsdelivr.net/gh/notsibyl/danbooru@main/danbooru.svg
// @namespace     https://danbooru.donmai.us/forum_posts?search[creator_id]=817128&search[topic_id]=8502
// @homepageURL   https://github.com/notsibyl/danbooru
// @downloadURL   https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/dejavu-sans.user.js
// @updateURL     https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/dejavu-sans.user.js
// @match         *://*.donmai.us/*
// @exclude-match *://cdn.donmai.us/*
// @grant         GM_getResourceURL
// @grant         GM_addStyle
// @resource      normal https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/fonts/DejaVuLGCSans.woff2
// @resource      bold https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/fonts/DejaVuLGCSans-Bold.woff2
// @resource      oblique https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/fonts/DejaVuLGCSans-Oblique.woff2
// @resource      boldoblique https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/fonts/DejaVuLGCSans-BoldOblique.woff2
// @run-at        document-start
// ==/UserScript==

// DejaVu Sans version 2.37

GM_addStyle(`@font-face {
    font-family: "DejaVu Sans";
    src: url('${GM_getResourceURL("normal")}') format('woff2');
    font-weight: normal;
    font-style: normal;
    font-display: swap
}
@font-face {
    font-family: "DejaVu Sans";
    src: url('${GM_getResourceURL("bold")}') format('woff2');
    font-weight: bold;
    font-style: normal;
    font-display: swap
}
@font-face {
    font-family: "DejaVu Sans";
    src: url('${GM_getResourceURL("oblique")}') format('woff2');
    font-weight: normal;
    font-style: italic;
    font-display: swap
}
@font-face {
    font-family: "DejaVu Sans";
    src: url('${GM_getResourceURL("boldoblique")}') format('woff2');
    font-weight: bold;
    font-style: italic;
    font-display: swap
}
:root {
  --header-font: "DejaVu Sans", Tahoma, Verdana, var(--emoji-font), sans-serif;
  --body-font: "DejaVu Sans", Verdana, var(--emoji-font), sans-serif;
}`);
