// ==UserScript==
// @name        Auto Saver
// @author      Sibyl
// @version     0.3
// @icon        https://cdn.jsdelivr.net/gh/notsibyl/danbooru@main/danbooru.svg
// @namespace   https://danbooru.donmai.us/forum_posts?search[creator_id]=817128&search[topic_id]=8502
// @homepageURL https://github.com/notsibyl/danbooru
// @downloadURL https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/auto-saver.user.js
// @updateURL   https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/auto-saver.user.js
// @description Automatically save content from upload page
// @match       *://*.donmai.us/*
// @grant       none
// @run-at      document-end
// ==/UserScript==

(async () => {
  "use strict";

  const pathname = location.pathname;
  const DB_STORE_NAME = "savedContentFromUploadPage";
  let assetId, db;
  if (pathname.startsWith("/posts/") && !pathname.endsWith(".xml") && !pathname.endsWith(".json")) {
    assetId =
      document.querySelector("#related-tags-container")?.getAttribute("data-media-asset-id") ||
      document.querySelector("#post-info-size > a[href^='/media_assets/']")?.href.split("/media_assets/")[1];
    await openDB();
    remove(assetId);
  } else if (/^\/uploads\/\d+$/.test(pathname) || /^\/uploads\/\d+\/assets\/\d+/.test(pathname)) {
    const tagTextarea = document.querySelector("#post_tag_string");

    Danbooru.Autocomplete._ic = Danbooru.Autocomplete.insert_completion;
    Danbooru.Autocomplete.insert_completion = function () {
      this._ic(...arguments);
      // jQuery trigger('input') does not fire native JavaScript input event
      tagTextarea.dispatchEvent(new InputEvent("input", { bubbles: true }));
    };

    assetId = document.querySelector("#media_asset_id")?.value || document.querySelector("#related-tags-container")?.getAttribute("data-media-asset-id");

    await openDB();

    const saved = await load(assetId);
    if (saved) {
      delete saved.asset_id;
      for (let elementName in saved) {
        const value = saved[elementName];
        if (elementName === "post_rating") {
          document.querySelector(`#${elementName}_${value}`).checked = true;
        } else {
          document.querySelector(`#${elementName}`).value = value;
        }
      }
      tagTextarea.dispatchEvent(new InputEvent("input"));
    }

    document.addEventListener("input", event => {
      let el = event.target;
      let { id, value } = el;
      switch (id) {
        case "post_rating_g":
        case "post_rating_s":
        case "post_rating_q":
        case "post_rating_e":
          save({ post_rating: id.slice(-1) });
          break;
        case "post_tag_string":
          value = value.trim() + " ";
        // case "post_source":
        // case "post_artist_commentary_title":
        // case "post_artist_commentary_desc":
        case "post_translated_commentary_title":
        case "post_translated_commentary_desc":
        case "post_parent_id":
          save({ [id]: value });
          break;
        default:
          break;
      }
    });

    document.querySelector("#related-tags-container").addEventListener("click", event => {
      const el = event.target;
      if ((el.tagName === "A" || el.tagName === "INPUT") && el.closest("ul")?.className === "tag-list") {
        setTimeout(() => {
          const event = new Event("input", { bubbles: true });
          tagTextarea.dispatchEvent(event);
        });
      }
    });
  }

  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("AutoSavedDB", 1);

      request.onupgradeneeded = event => {
        db = event.target.result;
        if (!db.objectStoreNames.contains(DB_STORE_NAME)) {
          db.createObjectStore(DB_STORE_NAME, { keyPath: "asset_id" });
        }
      };

      request.onsuccess = event => {
        db = event.target.result;
        resolve();
      };

      request.onerror = event => reject(event.target.errorCode);
    });
  }

  function save(content) {
    const objectStore = db.transaction(DB_STORE_NAME, "readwrite").objectStore(DB_STORE_NAME);
    const request = objectStore.get(assetId);
    request.onsuccess = event => {
      const updatedData = Object.assign({ asset_id: assetId }, event.target.result, content);
      objectStore.put(updatedData);
    };
  }

  function load(assetId) {
    return new Promise((resolve, reject) => {
      const request = db.transaction(DB_STORE_NAME, "readonly").objectStore(DB_STORE_NAME).get(assetId);

      request.onsuccess = event => resolve(event.target.result);
      request.onerror = event => reject(event.target.errorCode);
    });
  }

  function remove(assetId) {
    db.transaction(DB_STORE_NAME, "readwrite").objectStore(DB_STORE_NAME).delete(assetId);
  }
})();
