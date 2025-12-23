// ==UserScript==
// @name        Fetch Commentary
// @author      Sibyl
// @version     0.2
// @icon        https://cdn.jsdelivr.net/gh/notsibyl/danbooru@main/danbooru.svg
// @namespace   https://danbooru.donmai.us/forum_posts?search[creator_id]=817128&search[topic_id]=8502
// @homepageURL https://github.com/notsibyl/danbooru
// @downloadURL https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/fetch-commentary.user.js
// @updateURL   https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/fetch-commentary.user.js
// @match       *://*.donmai.us/posts/*
// @match       *://*.donmai.us/uploads/*
// @run-at      document-end
// @grant       GM_xmlhttpRequest
// ==/UserScript==

const apiProviders = {
  Default: "",
  Cosbooru: "https://cos.lycore.co",
  AIBooru: "https://aibooru.online"
  // You can add commentary fetch API providers here
  // Localbooru: "http://localhost:3000"
};

const createElement = (tag, props = {}) => {
  const el = document.createElement(tag);
  const { style, dataset, ..._props } = props;
  Object.assign(el, _props);
  Object.assign(el.dataset, dataset);
  if (typeof style === "string") el.style.cssText = style;
  else Object.assign(el.style, style);
  return el;
};

const GM_fetch = (url, options = {}) => {
  options.data = options.body;
  delete options.body;
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      url,
      method: "GET",
      ...options,
      onload: response => resolve(response),
      onerror: error => reject(error)
    });
  });
};

const controller = document.body.dataset?.controller,
  action = document.body.dataset?.action;

const FC = {
  currentProviderOrigin: "",
  addMenu() {
    const typeSelect = document.getElementById("commentary_source_type");
    const select = createElement("select");
    for (let op in apiProviders) select.add(new Option(op, apiProviders[op]));
    select.selectedIndex = 0;
    typeSelect.after("  via  ", select);
    typeSelect.value === "Post" && select.classList.add("hidden");
    $(typeSelect).change(() => select.classList.toggle("hidden"));
    $(select).change(e => (this.currentProviderOrigin = e.target.value));
  },
  replaceFunction() {
    Danbooru.ArtistCommentary.from_source = async (source, origin, ref) => {
      let url = `${origin || this.currentProviderOrigin}/source.json?url=${encodeURIComponent(source)}`;
      if (ref) url += "&ref=" + ref;
      const response = await GM_fetch(url, { responseType: "json" });
      const data = response.response?.artist_commentary;
      return {
        original_title: data?.dtext_title || "",
        original_description: data?.dtext_description || "",
        source: source
      };
    };
  },
  init() {
    this.addMenu();
    this.replaceFunction();
  },
  initialSourceUrl: $("#post_source").val(),
  initialSourceRef: $("#post_referer_url").val(),
  fetchCommentaryOnly: false,
  async fetchSourceData(e) {
    e.preventDefault();
    const sourceUrl = $("#post_source").val().trim();
    const ref = this.initialSourceUrl === sourceUrl ? this.initialSourceRef : null;
    if (/^https?:\/\//.test(sourceUrl)) {
      $(".source-data>:not(svg)").addClass("hidden");
      $(".source-data").addClass("loading");
      try {
        if (this.fetchCommentaryOnly) {
          const resp = await Danbooru.ArtistCommentary.from_source(sourceUrl, e.target.dataset.origin, ref);
          console.log(resp);
          $("#post_artist_commentary_original_title").val(resp.original_title);
          $(".post_artist_commentary_original_description .dtext-editor").get(0).editor.dtext = resp.original_description;
        } else {
          let url = `${this.currentProviderOrigin}/source.js?url=${encodeURIComponent(sourceUrl)}`;
          if (ref) url += "&ref=" + ref;
          const resp = await GM_fetch(url, { headers: { "X-Requested-With": "XMLHttpRequest" } });
          console.log(resp.responseText);
          new Function(resp.responseText)();
        }
      } catch (e) {
        Danbooru.Notice.error("Fetching data failed.");
        console.error(e);
      }
      $(".source-data>:not(svg)").removeClass("hidden");
      $(".source-data").removeClass("loading");
    }
  },
  patchSourceDataElement(div) {
    if (div.dataset.patched) return;
    div.dataset.patched = "1";
    const a = div.querySelector("a:first-child");
    a.classList.remove("source-data-fetch");
    a.classList.add("data-fetch-switch");
    a.textContent = this.fetchCommentaryOnly ? "Fetch commentary only" : "Fetch source data";
    let nodes = [];
    for (let i in apiProviders) {
      const span = createElement("span", { textContent: nodes.length > 0 ? " | " : "  [" });
      const ap = createElement("a", { classList: "source-data-fetch-userjs", textContent: i, href: "#", dataset: { origin: apiProviders[i] } });
      nodes.push(span, ap);
    }
    a.after(...nodes, createElement("span", { textContent: "]" }));
  },
  initSourceTab() {
    this.replaceFunction();
    let sourceTab = document.querySelector(".tab-panels>.source-tab"),
      sourceDataDiv = sourceTab.querySelector(".source-data");
    if (!sourceDataDiv) {
      let a = createElement("a", { classList: "data-fetch-switch", textContent: "Fetch source data" });
      sourceDataDiv = createElement("div", { classList: "source-data card-outlined p-4 mt-4 mb-4" });
      sourceDataDiv.append(a);
      sourceTab.prepend(sourceDataDiv);
    }
    this.patchSourceDataElement(sourceDataDiv);
    $(document).on("click.danbooru", ".data-fetch-switch", e => {
      e.preventDefault();
      this.fetchCommentaryOnly = !this.fetchCommentaryOnly;
      e.target.textContent = this.fetchCommentaryOnly ? "Fetch commentary only" : "Fetch source data";
    });
    $(document).off("click.danbooru", ".source-data-fetch");
    $(document).on("click.danbooru", ".source-data-fetch-userjs", this.fetchSourceData.bind(this));

    const observer = new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(node => node.classList?.contains("source-data") && this.patchSourceDataElement(node))));
    observer.observe(sourceTab, { childList: true, subtree: false });
  }
};

if (action === "show") {
  if (controller === "posts") FC.init();
  else if (controller === "uploads" || controller === "upload-media-assets") FC.initSourceTab();
}
