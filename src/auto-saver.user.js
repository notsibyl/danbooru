// ==UserScript==
// @name        Auto Saver
// @author      Sibyl
// @version     0.7
// @icon        https://cdn.jsdelivr.net/gh/notsibyl/danbooru@main/danbooru.svg
// @namespace   https://danbooru.donmai.us/forum_posts?search[creator_id]=817128&search[topic_id]=8502
// @homepageURL https://github.com/notsibyl/danbooru
// @downloadURL https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/auto-saver.user.js
// @updateURL   https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/auto-saver.user.js
// @description Automatically save content from upload page
// @match       *://*.donmai.us/posts/*
// @match       *://*.donmai.us/uploads/*
// @grant       none
// @run-at      document-end
// ==/UserScript==

/* prettier-ignore */
class SimpleIDB{constructor(e="SimpleIDB",r=1){this.dbName=e,this.version=r,this.db=null}open(e){return new Promise(((r,t)=>{const o=indexedDB.open(this.dbName,this.version);o.onupgradeneeded=r=>{this.db=r.target.result,this.db.objectStoreNames.contains(e)||this.db.createObjectStore(e)},o.onsuccess=e=>{this.db=e.target.result,r()},o.onerror=e=>t(e.target.errorCode)}))}_objectStore(e,r){return this.db.transaction(e,r).objectStore(e)}get(e,r){return new Promise(((t,o)=>{const s=this._objectStore(e,"readonly").get(r);s.onsuccess=e=>t(e.target.result),s.onerror=e=>o(e.target.errorCode)}))}set(e,r,t){return new Promise(((o,s)=>{const n=this._objectStore(e,"readwrite").put(t,r);n.onsuccess=()=>o(),n.onerror=e=>s(e.target.errorCode)}))}delete(e,r){return new Promise(((t,o)=>{const s=this._objectStore(e,"readwrite").delete(r);s.onsuccess=()=>t(),s.onerror=e=>o(e.target.errorCode)}))}clear(e){return new Promise(((r,t)=>{const o=this._objectStore(e,"readwrite").clear();o.onsuccess=()=>r(),o.onerror=e=>t(e.target.errorCode)}))}bulkSet(e,r){return new Promise(((t,o)=>{const s=this.db.transaction(e,"readwrite"),n=s.objectStore(e);r=Array.isArray(r)?r.map((e=>Array.isArray(e)?e:e&&"object"==typeof e?[e.key,e.value]:e)):Object.entries(r);for(const[e,t]of r)n.put(t,e);s.oncomplete=()=>t(),s.onerror=e=>o(e.target.errorCode),s.onabort=e=>o(e.target.errorCode)}))}}

const AutoSaver = {
  DB_STORE_NAME: "SavedContent",
  assetId: null,
  idbClient: new SimpleIDB("AutoSaver"),
  async save(content) {
    const existing = await this.idbClient.get(this.DB_STORE_NAME, this.assetId);
    const updatedData = Object.assign({}, existing, content);
    await this.idbClient.set(this.DB_STORE_NAME, this.assetId, updatedData);
  },
  async initialize(uploadingPage = true) {
    if (uploadingPage) {
      const tagBox = document.querySelector("#post_tag_string");
      this.fixInsertCompletion(tagBox);

      this.assetId = document.getElementById("media_asset_id")?.value || document.getElementById("related-tags-container").dataset.mediaAssetId;
      await this.idbClient.open(this.DB_STORE_NAME);

      const saved = await this.idbClient.get(this.DB_STORE_NAME, this.assetId);
      if (saved) {
        for (let elementName in saved) {
          const value = saved[elementName];
          if (elementName === "post_rating") {
            document.getElementById(`${elementName}_${value}`).checked = true;
          } else {
            document.getElementById(`${elementName}`).value = value;
          }
        }
        // For Chrome
        tagBox.dispatchEvent(new InputEvent("input"));
      }

      document.addEventListener("input", event => {
        let el = event.target;
        let { id, value } = el;
        switch (id) {
          case "post_rating_g":
          case "post_rating_s":
          case "post_rating_q":
          case "post_rating_e":
            this.save({ post_rating: id.slice(-1) });
            break;
          case "post_tag_string":
            value = value.trim() + " ";
          // case "post_source":
          // case "post_artist_commentary_original_title":
          // case "post_artist_commentary_original_description":
          case "post_artist_commentary_translated_title":
          case "post_artist_commentary_translated_description":
          case "post_parent_id":
            this.save({ [id]: value });
            break;
          default:
            break;
        }
      });
      document.getElementById("related-tags-container").addEventListener("click", event => {
        const el = event.target;
        if ((el.tagName === "A" || el.tagName === "INPUT") && el.closest("ul")?.className === "tag-list") {
          setTimeout(() => {
            const event = new Event("input", { bubbles: true });
            tagBox.dispatchEvent(event);
          });
        }
      });
    } else {
      this.assetId =
        document.querySelector("#related-tags-container")?.getAttribute("data-media-asset-id") ||
        document.querySelector("#post-info-size > a[href^='/media_assets/']")?.href.split("/media_assets/")[1];
      await this.idbClient.open(this.DB_STORE_NAME);
      this.idbClient.delete(this.DB_STORE_NAME, this.assetId);
    }
  },
  fixInsertCompletion(tagBox) {
    const fn = Danbooru.Autocomplete.prototype.insertCompletion;
    Danbooru.Autocomplete.prototype.insertCompletion = function () {
      fn.apply(this, arguments);
      // jQuery trigger('input') does not fire native JavaScript input event
      tagBox.dispatchEvent(new InputEvent("input", { bubbles: true }));
    };
  }
};

const dataset = document.body.dataset;
if ((dataset.controller === "uploads" || dataset.controller === "upload-media-assets") && dataset.action === "show") AutoSaver.initialize(true);
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
    if (dataset.controller === "posts" && dataset.action === "show") AutoSaver.initialize(false);
  });
