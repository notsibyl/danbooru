// ==UserScript==
// @name        DejaVu Sans
// @author      Sibyl
// @version     1.0
// @icon        https://cdn.jsdelivr.net/gh/notsibyl/danbooru@main/danbooru.svg
// @namespace   https://danbooru.donmai.us/forum_posts?search[creator_id]=817128&search[topic_id]=8502
// @homepageURL https://github.com/notsibyl/danbooru
// @downloadURL https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/dejavu-sans.user.js
// @updateURL   https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/dejavu-sans.user.js
// @match       *://*.donmai.us/*
// @grant       GM_addStyle
// @grant       GM_getResourceURL
// @resource    normal https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/fonts/DejaVuSans.woff2
// @resource    bold https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/fonts/DejaVuSans-Bold.woff2
// @resource    oblique https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/fonts/DejaVuSans-Oblique.woff2
// @resource    boldoblique https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/fonts/DejaVuSans-BoldOblique.woff2
// @run-at      document-start
// ==/UserScript==

// DejaVu Sans version 2.37

GM_addStyle(`@font-face {
    font-family: 'DejaVu Sans';
    src: url('${GM_getResourceURL("normal")}') format('woff2');
    font-style: normal;
    font-display: swap
}
@font-face {
    font-family:  'DejaVu Sans';
    src: url('${GM_getResourceURL("bold")}') format('woff2');
    font-style: normal;
    font-display: swap
}
@font-face {
    font-family: 'DejaVu Sans';
    src: url('${GM_getResourceURL("oblique")}') format('woff2');
    font-style: italic;
    font-display: swap
}
@font-face {
    font-family: 'DejaVu Sans';
    src: url('${GM_getResourceURL("boldoblique")}') format('woff2');
    font-style: italic;
    font-display: swap
}
:root {
  --header-font: "DejaVu Sans", Tahoma, Verdana, var(--emoji-font), sans-serif;
  --body-font: "DejaVu Sans", Verdana, var(--emoji-font), sans-serif;
}`);
