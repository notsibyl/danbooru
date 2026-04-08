// ==UserScript==
// @name          Full-width Character Converter
// @author        Sibyl
// @version       1.2
// @icon          https://cdn.jsdelivr.net/gh/notsibyl/danbooru@main/danbooru.svg
// @namespace     https://danbooru.donmai.us/forum_posts?search[creator_id]=817128&search[topic_id]=8502
// @homepageURL   https://github.com/notsibyl/danbooru
// @downloadURL   https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/full-width-char-converter.user.js
// @updateURL     https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/full-width-char-converter.user.js
// @match         https://*.donmai.us/*
// @exclude-match *://cdn.donmai.us/*
// @grant         none
// @run-at        document-end
// ==/UserScript==

const replacementMap = new Map([
  ["——", "_"],
  ["（", "("],
  ["）", ")"],
  ["：", ":"],
  ["‘", "'"],
  ["’", "'"],
  ["“", '"'],
  ["”", '"']
]);
const maxMatchLength = Math.max(...[...replacementMap.keys()].map(k => k.length));

function main() {
  const contentEditableElements = document.querySelectorAll("input[data-autocomplete='tag-query'], textarea[data-autocomplete='tag-edit']");
  contentEditableElements.forEach(el => {
    el.addEventListener("input", function (e) {
      if (e.inputType && e.inputType.startsWith("delete")) return;
      const target = e.target;
      setTimeout(() => {
        let value = target.value;
        const cursorPos = target.selectionStart;

        for (let len = Math.min(maxMatchLength, cursorPos); len >= 1; len--) {
          const beforeStart = cursorPos - len;
          const before = value.slice(beforeStart, cursorPos);
          if (replacementMap.has(before)) {
            const replacement = replacementMap.get(before);
            const newValue = value.slice(0, beforeStart) + replacement + value.slice(cursorPos);
            if (newValue !== value) {
              target.value = newValue;
              const newCursorPos = beforeStart + replacement.length;
              target.setSelectionRange(newCursorPos, newCursorPos);
            }
            break;
          }
        }
      }, 0);
    });
  });
}

const dataset = document.body.dataset;
if (dataset.action !== "error" && dataset.controller !== "static") main();
else
  (cb => {
    if (Danbooru.CurrentUser.data("level") > 35) cb();
    else
      setTimeout(() => {
        if (typeof __bph_loaded === "boolean") {
          if (__bph_loaded) cb();
          else window.addEventListener("BannedContentLoaded", cb);
        } else cb();
      });
  })(() => {
    if (dataset.controller === "posts" && dataset.action === "show") main();
  });
