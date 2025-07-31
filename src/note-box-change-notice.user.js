// ==UserScript==
// @name        Notify on Note Box Changes
// @author      Sibyl
// @version     0.2
// @icon        https://cdn.jsdelivr.net/gh/notsibyl/danbooru@main/danbooru.svg
// @namespace   https://danbooru.donmai.us/forum_posts?search[creator_id]=817128&search[topic_id]=8502
// @homepageURL https://github.com/notsibyl/danbooru
// @downloadURL https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/note-box-change-notice.user.js
// @updateURL   https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/note-box-change-notice.user.js
// @match       *://*.donmai.us/posts/*
// @grant       none
// @run-at      document-end
// ==/UserScript==

const hook = methodName => {
  unsafeWindow.Danbooru.Note.Box.prototype["hooked" + methodName] = unsafeWindow.Danbooru.Note.Box.prototype[methodName];
  unsafeWindow.Danbooru.Note.Box.prototype[methodName] = function () {
    this["hooked" + methodName](...arguments);
    const { id, x, y, w, h } = this.note;
    const prefix = id
      ? `<a href="/notes/${id}" target="_blank">Note #${id}</a> <a href="/note_versions?search%5Bnote_id%5D=${id}" target="_blank">»</a>`
      : "Current note";
    unsafeWindow.Danbooru.Notice.info(`${prefix} changed: <code style="background-color: transparent;">x: ${x}, y: ${y}, w: ${w}, h: ${h}</code></span>`);
  };
};

// `place_note()` shouldn't be directly hooked; otherwise, a notice will be shown every time the page loads.
hook("on_dragstop");
hook("key_nudge");
hook("key_resize");