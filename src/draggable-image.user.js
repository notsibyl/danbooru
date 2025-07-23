// ==UserScript==
// @name        Draggble Post Image
// @author      Sibyl
// @version     1.1
// @namespace   https://danbooru.donmai.us/forum_posts?search[creator_id]=817128&search[topic_id]=8502
// @homepageURL https://github.com/notsibyl/danbooru
// @downloadURL https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/draggable-image.user.js
// @updateURL   https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/draggable-image.user.js
// @match       *://*.donmai.us/posts/*
// @grant       none
// @run-at      document-end
// ==/UserScript==

(() => {
  let image = document.querySelector("picture > img#image");
  if (image) {
    dragElement(image);
    image.style.paddingRight = "10px";
  }
  document.querySelector("div#a-show")?.addEventListener("click", e => {
    if (e.target.classList.contains("image-view-original-link")) {
      document.querySelector("picture > img#image").classList.remove("fit-width");
    }
  });

  function dragElement(el) {
    let prevPos = [];

    const current = (x, y) => {
      const windowOffset = [
        window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft,
        window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop
      ];
      const offset = [windowOffset[0] + prevPos[0] - x, windowOffset[1] + prevPos[1] - y];
      prevPos[0] = x;
      prevPos[1] = y;
      return offset;
    };

    el.addEventListener("dragstart", () => false);

    return el.addEventListener("mousedown", e => {
      if (e.button !== 0 || e.altKey || e.ctrlKey) {
        return;
      }

      e.preventDefault();
      const pageScroller = function (e) {
        const scroll = current(e.clientX, e.clientY);
        window.scrollTo(scroll[0], scroll[1]);
        el.setAttribute("data-drag-element", "1");
        return false;
      };

      const unsetAttr = () => el.removeAttribute("data-drag-element");

      el.style.cursor = "grabbing";
      prevPos = [e.clientX, e.clientY];

      document.addEventListener("mousemove", pageScroller);

      document.addEventListener(
        "mouseup",
        () => {
          document.removeEventListener("mousemove", pageScroller);
          setTimeout(unsetAttr, 0);
          el.style.cursor = "auto";
          return false;
        },
        {
          once: true
        }
      );
      return false;
    });
  }
})();
