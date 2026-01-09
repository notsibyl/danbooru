// ==UserScript==
// @name          Better Related Tags
// @author        Sibyl
// @version       1.2
// @icon          https://cdn.jsdelivr.net/gh/notsibyl/danbooru@main/danbooru.svg
// @namespace     https://danbooru.donmai.us/forum_posts?search[creator_id]=817128&search[topic_id]=8502
// @homepageURL   https://github.com/notsibyl/danbooru
// @downloadURL   https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/better-related-tags.user.js
// @updateURL     https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/better-related-tags.user.js
// @match         *://*.donmai.us/*
// @exclude-match *://cdn.donmai.us/*
// @run-at        document-end
// ==/UserScript==

Danbooru.RelatedTag.current_tag = function () {
  let $field = $("#post_tag_string");
  let string = $field.val();
  let n = string.length;

  let start = $field.prop("selectionStart");
  let end = $field.prop("selectionEnd");

  if (start === end && start === n && /\S/.test(string)) {
    start--;
    end--;
  }

  let selected = string.slice(start, end);
  let hasWord = /\S/.test(selected);
  let a, b;

  if (hasWord) {
    a = start + 1;
    while (a > 0 && !/\s/.test(string[a - 1])) a--;
    b = end - 1;
    while (b < n && !/\s/.test(string[b])) b++;
  } else {
    a = start;
    while (a > 0 && /\s/.test(string[a])) a--;
    while (a > 0 && !/\s/.test(string[a - 1])) a--;
    b = a;
    while (b < n && /\s/.test(string[b])) b++;
    while (b < n && !/\s/.test(string[b])) b++;
  }

  return string.slice(a, b).trim().replace(/\s+/g, " ");
};

Danbooru.RelatedTag.update_current_tag = function () {
  let current_tag = Danbooru.RelatedTag.current_tag().trim();

  if (current_tag) {
    $(".general-related-tags-column").removeClass("hidden");
    $(".related-tags-current-tag").show().text(current_tag);
    $(".related-tags-current-tag").attr("href", `/posts?tags=${encodeURIComponent(current_tag)}`);
  }
};

$(document).on("selectionchange.danbooru.relatedTags", "#post_tag_string", Danbooru.RelatedTag.update_current_tag);
setTimeout(() => {
  $(document).off("click.danbooru.relatedTags", "#post_tag_string");
  $(document).on("click.danbooru.relatedTags", "#post_tag_string", Danbooru.RelatedTag.update_current_tag);
}, 50);

const createElement = (tag, props = {}) => {
  const el = document.createElement(tag);
  const { style, dataset, ..._props } = props;
  Object.assign(el, _props);
  Object.assign(el.dataset, dataset);
  if (typeof style === "string") el.style.cssText = style;
  else Object.assign(el.style, style);
  return el;
};

const tip = document.querySelector("div.post_tag_string span.hint>.desktop-only");
if (tip) {
  const a = createElement("a", { classList: "cursor-pointer", textContent: "View current tag(s) in related tags page »", href: "#" });
  tip.append(createElement("br"));
  tip.after(a);
  a.addEventListener("click", e => {
    e.preventDefault();
    const currentTag = Danbooru.RelatedTag.current_tag();
    const url = `/related_tag?search%5Border%5D=Overlap&search%5Bquery%5D=${currentTag}`;
    if (currentTag) window.open(url);
  });
}
