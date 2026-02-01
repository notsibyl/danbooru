// ==UserScript==
// @name        Tab-style Commentary
// @author      Sibyl
// @version     0.1
// @icon        https://cdn.jsdelivr.net/gh/notsibyl/danbooru@main/danbooru.svg
// @namespace   https://danbooru.donmai.us/forum_posts?search[creator_id]=817128&search[topic_id]=8502
// @homepageURL https://github.com/notsibyl/danbooru
// @downloadURL https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/tab-style-commentary.user.js
// @updateURL   https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/tab-style-commentary.user.js
// @match       *://*.donmai.us/posts/*
// @grant       none
// @run-at      document-end
// ==/UserScript==

const createElement = (tag, props = {}) => {
  const el = document.createElement(tag);
  const { style, dataset, ..._props } = props;
  Object.assign(el, _props);
  Object.assign(el.dataset, dataset);
  if (typeof style === "string") el.style.cssText = style;
  else Object.assign(el.style, style);
  return el;
};

const { action, controller } = document.body.dataset;

if (controller === "posts" && action === "show" && window.Alpine) {
  const commentary = document.getElementById("artist-commentary");
  if (!commentary) return;
  const h2 = commentary.querySelector("h2"),
    original = document.getElementById("original-artist-commentary"),
    translated = document.getElementById("translated-artist-commentary");
  h2.remove();
  commentary.classList = "tab-panel-component horizontal-tab-panel";
  commentary.setAttribute("x-data", `{ tab: '${translated ? "translated" : "original"}' }`);
  const wrapper = createElement("div", { classList: "tab-panels" });
  commentary.insertBefore(wrapper, original);
  wrapper.append(original);
  translated && wrapper.append(translated);
  original.setAttribute("x-show", "tab === 'original'");
  translated?.setAttribute("x-show", "tab === 'translated'");
  const tab = createElement("div", { classList: "tab-list thin-x-scrollbar" });
  document.getElementById("commentary-sections").replaceWith(tab);
  let tabInnerHTML = `<a class="tab original-commentary-tab" :class="{ 'active-tab': tab === 'original' }" @click.prevent="tab = 'original'" href="#">Original Commentary</a>`;
  if (translated)
    tabInnerHTML += `<a class="tab translated-commentary-tab" :class="{ 'active-tab': tab === 'translated' }" @click.prevent="tab = 'translated'" href="#">Translated Commentary</a>`;
  tab.innerHTML = tabInnerHTML;
  document.head.appendChild(createElement("style", { textContent: "div#c-posts div#a-show .tab-panel-component.horizontal-tab-panel>.tab-list { margin-bottom: .25rem }" }));
}
