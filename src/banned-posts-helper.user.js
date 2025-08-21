// ==UserScript==
// @name          Banned Posts Helper
// @author        Sibyl
// @version       0.17
// @icon          https://cdn.jsdelivr.net/gh/notsibyl/danbooru@main/danbooru.svg
// @namespace     https://danbooru.donmai.us/forum_posts?search[creator_id]=817128&search[topic_id]=8502
// @homepageURL   https://github.com/notsibyl/danbooru
// @downloadURL   https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/banned-posts-helper.user.js
// @updateURL     https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/banned-posts-helper.user.js
// @description   This post has been removed because of a takedown request.
// @match         *://*.donmai.us/*
// @exclude-match *://cdn.donmai.us/*
// @grant         none
// @run-at        document-end
// ==/UserScript==

const CUSTOM_THUMBNAIL = null; // Custom thumbnail for banned posts with media asset ID

const wait = (ms = 1e3) => new Promise(resolve => setTimeout(resolve, ms));

const formatBytes = bytes => {
  if (bytes === 0) return "0 Bytes";
  const units = ["Bytes", "KB", "MB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  const formattedValue = value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
  return `${formattedValue} ${units[i]}`;
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

const BOORU = {
  controller: document.body.dataset?.controller,
  action: document.body.dataset?.action,
  postId: document.body.dataset?.postId,
  pathname: location.pathname,
  searchParams: new URLSearchParams(location.search),
  iconUri: document.querySelector("a#close-notice-link use").href.baseVal.split("#")[0],
  async init() {
    await bannedPostsHelper.initThumbnail();
    if (document.title.startsWith("Page Removed") || this.action === "error") {
      if (this.pathname === "/posts") {
        this.controller = "posts";
        this.action = "index";
        bannedPostsHelper.handleTakedownTip();
        return;
      } else {
        const postId = this.pathname.match(/^\/posts\/(\d+)/)?.[1];
        if (postId) {
          this.postId = postId;
          this.controller = "posts";
          this.action = "show";
          await bannedPostsHelper.showBannedPost();
        }
      }
    }

    switch (this.controller) {
      case "artists":
        bannedPostsHelper.setArtistPagePostsLink();
        break;
      case "upload-media-assets":
      case "uploads":
        if (this.action === "show") easierOneUp.init();
        break;
      case "posts":
        if (this.action === "index") bannedPostsHelper.handleBannedPosts();
        else if (this.action === "show") {
          // Write your code here if you want to execute something after banned post loaded (document.write might cause some unexpected issues).
        }
        break;
      case "iqdb-queries":
        bannedPostsHelper.handleIqdbQueries();
        break;
      default:
        break;
    }
  }
};
const bannedPostsHelper = {
  thumbnailData: {
    id: 23609685,
    variants: [
      { type: "180x180", url: "https://cdn.donmai.us/180x180/3e/3c/3e3c7baac2a12a0936ba1f62a46a3478.jpg", width: 180, height: 135, file_ext: "jpg" },
      { type: "360x360", url: "https://cdn.donmai.us/360x360/3e/3c/3e3c7baac2a12a0936ba1f62a46a3478.jpg", width: 360, height: 270, file_ext: "jpg" },
      { type: "720x720", url: "https://cdn.donmai.us/720x720/3e/3c/3e3c7baac2a12a0936ba1f62a46a3478.webp", width: 720, height: 540, file_ext: "webp" }
    ]
  },
  postPreviewSize: BOORU.controller === "posts" ? Danbooru.Cookie.get("post_preview_size") || "180" : "180",
  get tipElement() {
    const p = document.querySelector("#page > p:last-child");
    return p?.innerText === "This page has been removed because of a takedown request." ? p : {};
  },
  userPerPage: Danbooru.CurrentUser.data("per-page"),
  searchParams: new URLSearchParams({ tags: "" }),
  async initThumbnail() {
    if (!CUSTOM_THUMBNAIL) return;
    let thumbnailData = JSON.parse(localStorage.getItem("banned_post_helper"));
    if (!thumbnailData || thumbnailData.id !== CUSTOM_THUMBNAIL) {
      thumbnailData = await (await fetch(`/media_assets/${CUSTOM_THUMBNAIL}.json`)).json();
      localStorage.setItem("banned_post_helper", JSON.stringify(thumbnailData));
    }
    if (thumbnailData && !thumbnailData.error) this.thumbnailData = thumbnailData;
  },
  initSearchParams() {
    let tags = BOORU.searchParams.get("tags") || "";
    let re = "\\blimit:(\\d+)\\b";
    let tagsLimit = Number(tags.match(new RegExp(re, "i"))?.[1] || Infinity);
    let searchLimit = Number(BOORU.searchParams.get("limit") || Infinity);
    let realLimit = Math.min(tagsLimit, searchLimit);
    if (realLimit !== Infinity) {
      tags = tags.replace(new RegExp(re, "gi"), "").trim() + " limit:" + realLimit;
      this.userPerPage = realLimit;
    }
    this.searchParams.set("tags", tags.trim());
    const page = BOORU.searchParams.get("page");
    if (page) this.searchParams.set("page", page);
  },
  handleTakedownTip() {
    this.initSearchParams();
    const tags = this.searchParams
      .get("tags")
      .replace(/(status|is|has|user|id|limit):\S+/gi, "")
      .trim();
    if (tags && !/\s/.test(tags)) {
      this.searchParams.set("tags", this.searchParams.get("tags") + " -1");
      this.tipElement.innerHTML =
        'This page has been removed because of <a class="dtext-wiki-link tag-type-1" href="/artists/show_or_new?name=' +
        `${tags}">${tags.replace(/_/g, " ")}</a>'s takedown request. ` +
        `<a href="/posts?${this.searchParams.toString()}#show-banned">Show page</a>.`;
    }
  },
  handleBannedPosts() {
    this.initSearchParams();
    const postContainer = document.querySelector("#posts > div.post-gallery > div.posts-container");
    if (postContainer) {
      const tags = this.searchParams.get("tags");
      if (!/\border:random\b/.test(tags)) {
        if (location.hash === "#show-banned") {
          this.fetchAllPosts(postContainer);
          document.querySelectorAll("#posts div.paginator a, #related-list a[href$='status%3Adeleted']").forEach(a => {
            a.href = a.href + "#show-banned";
          });
        } else {
          const userPerPage = this.userPerPage;
          const postCount = postContainer.children.length;
          if (postCount !== userPerPage) {
            let a = createElement("a", {
              id: "check_banned_posts",
              href: "#",
              title: "Shortcut is c",
              innerHTML: "<i>Banned</i>",
              dataset: { shortcut: "c" }
            });
            a.addEventListener("click", event => {
              event.preventDefault();
              a.innerHTML = "<i>Checking...</i>";
              this.fetchAllPosts(postContainer)
                .then(() =>
                  $(a)
                    .html('<i style="color:var(--success-color)">Finished.</i>')
                    .fadeOut("slow", function () {
                      $(this).remove();
                    })
                )
                .catch(() => $(a).html('<i style="color:var(--error-color)">Failure</i>'));
            });
            document.getElementById("show-posts-link").closest("li").insertAdjacentElement("beforeend", a);
            Danbooru.Shortcuts.initialize_data_shortcuts();
          }
        }
      }
    }
  },
  fetchAllPosts(postContainer) {
    const tags = this.searchParams.get("tags");
    const showDeleted = /\bstatus:(deleted|any|all)\b/.test(tags) || Danbooru.CurrentUser.data("show-deleted-posts");
    return fetch("/posts.json?" + this.searchParams.toString())
      .then(response => response.json())
      .then(posts => {
        let bannedPostsCount = posts.filter(post => post.is_banned === true).length;
        if (!showDeleted) posts = posts.filter(post => !post.is_deleted);
        this.insertBannedPosts(postContainer, Array.from(postContainer.children), posts, shownBannedPostsCount => {
          let msg = "";
          if (bannedPostsCount === 0 && shownBannedPostsCount === 0) msg = "No banned posts found.";
          else if (shownBannedPostsCount === 0 && bannedPostsCount > shownBannedPostsCount) {
            if (bannedPostsCount === 1) msg = "1 banned post found.";
            else msg = `${bannedPostsCount} banned posts found.`;
          } else {
            if (shownBannedPostsCount === 1) msg = "Show 1 banned post.";
            else msg = `Show ${shownBannedPostsCount} banned posts.`;
            if (bannedPostsCount != shownBannedPostsCount) {
              msg += ` ${bannedPostsCount} posts found in total.`;
            }
          }
          unsafeWindow.Danbooru.Notice.info(msg);
          this.fixBlacklist(postContainer);
        });
      })
      .catch(e => {
        console.error("Error:", e);
      });
  },
  insertBannedPosts(container, currentPosts, posts, callback) {
    const currentPostIds = currentPosts.map(el => Number(el.dataset.id));
    currentPostIds.push(0);
    let idx = 0,
      bannedToShow = 0,
      postsLength = posts.length;
    currentPostIds.forEach((pid, index) => {
      let htmlToInsert = "";
      for (; idx < postsLength; idx++) {
        let post = posts[idx].post || posts[idx];
        if (post.id !== pid) {
          if (post.is_banned) {
            htmlToInsert += this.renderPreviewData({ similarity: posts[idx].score, ...post });
            bannedToShow++;
          }
        } else break;
      }
      if (htmlToInsert) {
        if (pid === 0) {
          container.insertAdjacentHTML("beforeend", htmlToInsert);
        } else currentPosts[index].insertAdjacentHTML("beforebegin", htmlToInsert);
      }
    });
    callback?.(bannedToShow);
  },
  setArtistPagePostsLink() {
    const isBannedArtist = document.getElementsByClassName("banned-artist-label").length;
    if (isBannedArtist) {
      const a = document.getElementById("subnav-posts");
      a.href = a.href + "+-1#show-banned";
    }
  },
  fixBlacklist(container) {
    const articles = container.querySelectorAll("article:not(.blacklist-initialized)");
    if (articles.length) {
      const blacklistEl = document.getElementById("blacklist-box");
      if (!blacklistEl) return;
      const blacklistObj = blacklistEl.blacklist;
      articles.forEach(article => {
        const post = new Danbooru.Blacklist.Post(article, blacklistObj);
        post.applyRules();
        if (post.rules.size) blacklistObj.blacklistedPosts?.push(post);
        blacklistObj.posts.push(post);
      });
      blacklistEl.querySelectorAll("div:nth-child(2)>div").forEach(el => {
        let posts = el._x_dataStack?.[0]?.rule.posts;
        el._x_runEffects();
        if (posts?.size) el.children[2]._x_runEffects();
      });
      blacklistEl.querySelector("label>input")._x_runEffects();
      blacklistEl.children[0].children[1]._x_runEffects();
      blacklistObj.rules.some(rule => rule.posts.size > 0) && blacklistEl._x_doShow();
    }
  },
  handleIqdbQueries() {
    // app/logical/iqdb_client.rb
    // Priority: hash, file, url, id
    let params = ["search[hash]", "search[file]", "search[url]", "search[post_id]", "search[media_asset_id]", "hash", "file", "url", "post_id", "media_asset_id"];
    document.querySelector("#c-iqdb-queries form").addEventListener("submit", e => {
      const data = new FormData(e.currentTarget);
      for (let key of params.slice(0, 4)) {
        const val = data.get(key);
        if (val) {
          if (key === "search[file]") {
            console.warn("TODO: Find way to get file's iqdb_hash.");
          } else {
            e.preventDefault();
            location.href = `/iqdb_queries?${key}=${val}`;
            break;
          }
        }
      }
    });
    const hasParam = params.some(param => BOORU.searchParams.has(param));
    if (!hasParam) return;
    fetch("/iqdb_queries.json?" + BOORU.searchParams.toString())
      .then(resp => resp.json())
      .then(json => {
        const container = document.querySelector("div.iqdb-posts div.posts-container");
        this.insertBannedPosts(container, Array.from(container.children), json);
        this.fixBlacklist(container);
      });
  },
  renderPreviewData({ id, uploader_id, score, rating, tag_string, is_pending, is_flagged, is_deleted, has_children, parent_id, media_asset, source, similarity }) {
    const { width, height, url } = this.thumbnailData.variants.filter(info => {
      const sizeMap = {
        150: "180x180",
        180: "180x180",
        225: "360x360",
        270: "360x360",
        360: "360x360",
        720: "720x720"
      };
      return info.type === sizeMap[this.postPreviewSize];
    })[0];
    const dataFlag = is_pending ? "pending" : is_flagged ? "flagged" : is_deleted ? "deleted" : "";
    const classList = ["post-preview", "post-preview-" + this.postPreviewSize, "post-preview-fit-compact"];
    is_pending && classList.push("post-status-pending");
    is_flagged && classList.push("post-status-flagged");
    is_deleted && classList.push("post-status-deleted");
    has_children && classList.push("post-status-has-children");
    parent_id && classList.push("post-status-has-parent");

    let bottomPart = "";
    if (BOORU.controller === "posts") {
      const hideScore = Danbooru.Cookie.get("post_preview_show_votes") === "false";
      if (!hideScore) {
        classList.push("post-preview-show-votes");
        bottomPart = `<div class="post-preview-score text-sm text-center mt-1">
<span class="post-votes inline-flex gap-1" data-id="${id}">
<a class="post-upvote-link inactive-link" data-remote="true" rel="nofollow" data-method="post" href="/posts/${id}/votes?score=1">
<svg class="icon svg-icon upvote-icon" viewBox="0 0 448 512">
<use fill="currentColor" href="${BOORU.iconUri}#arrow-alt-up"></use></svg></a>
<span class="post-score inline-block text-center whitespace-nowrap align-middle min-w-4">
<a rel="nofollow" href="/post_votes?search%5Bpost_id%5D=${id}&amp;variant=compact">${score}</a></span>
<a class="post-downvote-link inactive-link" data-remote="true" rel="nofollow" data-method="post" href="/posts/${id}/votes?score=-1">
<svg class="icon svg-icon downvote-icon" viewBox="0 0 448 512">
<use fill="currentColor" href="${BOORU.iconUri}#arrow-alt-down"></use>
</svg></a></span></div>`;
      }
    } else {
      similarity && classList.push(similarity < 70 ? "iqdb-low-similarity hidden" : "iqdb-high-similarity");
      const similarityHtml = similarity ? `<div><a class="inactive-link iqdb-similarity-score" href="/iqdb_queries?post_id=${id}">${similarity.toFixed(0)}% similar</a></div>` : "";
      const { id: mid, image_width, image_height, file_size, file_ext } = media_asset;
      bottomPart = `<div class="text-xs text-center mt-1"><div>
<a rel="external noreferrer nofollow" title="${source}" class="inline-block align-top" href="${source}">
<svg class="icon svg-icon globe-icon h-4" viewBox="0 0 512 512">
<use fill="currentColor" href="${BOORU.iconUri}#globe"></use></svg></a>
<a href="/media_assets/${mid}">${formatBytes(file_size)} .${file_ext}, ${image_width}×${image_height}</a></div>${similarityHtml}</div>`;
    }

    return `<article id="post_${id}" class="${classList.join(" ")}" 
data-id="${id}" data-tags="${tag_string}" data-rating="${rating}" data-flags="${dataFlag}" data-score="${score}" data-uploader-id="${uploader_id}">
<div class="post-preview-container"><a class="post-preview-link" draggable="false" href="/posts/${id}"><picture>
<img class="post-preview-image" src="${url}" width="${width}" height="${height}" alt="post #${id}" data-title="${tag_string} rating:${rating} score:${score}" title="" draggable="false" aria-expanded="false"></picture></a></div>${bottomPart}</article>`;
  },
  async showBannedPost() {
    this.tipElement.innerText = "Fetching data....";
    try {
      let html = await (
        await fetch(location, {
          headers: { "X-CSRF-Token": Danbooru.Utility.meta("csrf-token") }
        })
      ).text();
      // rails-ujs not broken; window not working somtimes
      unsafeWindow._rails_loaded = false;
      document.open();
      document.write(html);
      document.close();
      await wait(1000);
    } catch (e) {
      console.error("Error:", e);
    }
  }
};
const easierOneUp = {
  tagsField: document.querySelector("#post_tag_string"),
  init() {
    const relatedPosts = document.querySelector("#related-posts-by-source p.fineprint a");
    if (relatedPosts) {
      const shownCount = Number(relatedPosts.innerText.split(" ")[0]);
      let container = document.querySelector("#related-posts-by-source .posts-container");
      let articles = container.children;
      const addButton = articles =>
        [...articles].forEach(el => {
          const div = document.createElement("div");
          this.addButton(el, div);
          el.querySelector(".post-preview-container").nextElementSibling.appendChild(div);
        });
      if ((articles.length === 5 && shownCount > 5) || articles.length === shownCount) addButton(articles);
      else {
        const url = new URL(relatedPosts.href);
        url.pathname = "/posts.json";
        url.searchParams.append("limit", 5);
        fetch(url)
          .then(resp => resp.json())
          .then(json => {
            bannedPostsHelper.insertBannedPosts(container, Array.from(articles), json);
            addButton(articles);
          });
      }
      bannedPostsHelper.fixBlacklist(container);
    }

    const similar = document.getElementById("iqdb-similar");
    this.observer = new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(this.process.bind(this))));
    this.observer.observe(similar, {
      subtree: true,
      childList: true
    });
  },
  async process(node) {
    if (node.className !== "iqdb-posts") return;
    let container = node.querySelector("#iqdb-similar .posts-container");
    if (container) {
      let articles = container.children;
      let shownCount = articles.length;
      let iqdbNoPostFound = shownCount === 0 && document.querySelector(".post-gallery-grid > p:only-child");
      if (!iqdbNoPostFound && shownCount !== 5) {
        let iqdbResults = await this.iqdbReq();
        if (iqdbResults.length !== shownCount) bannedPostsHelper.insertBannedPosts(container, Array.from(articles), iqdbResults);
      }
      for (const post of articles) {
        const div = post.querySelector(".iqdb-similarity-score").parentElement;
        this.addButton(post, div);
      }
      bannedPostsHelper.fixBlacklist(container);
    }
    this.observer?.disconnect();
  },
  copyTags(post, isParent) {
    const tags = post.dataset.tags.split(" ").filter(t => t === "social_commentary" || t.indexOf("commentary") == -1);
    tags.push((isParent ? "parent:" : "child:") + post.dataset.id);
    document.querySelector(`input.radio_buttons[value='${post.dataset.rating}']`).checked = true;
    this.tagsField.value = tags.join(" ") + " ";
    this.tagsField.dispatchEvent(new InputEvent("input", { bubbles: true }));
    document.querySelector(".source-tab").click();
    Danbooru.Notice.info("Successfully copied tags. Please check the commentary tags.");
  },
  addButton(post, div) {
    const setParent = createElement("a", {
      classList: "inactive-link",
      href: "#",
      textContent: "parent"
    });
    setParent.addEventListener("click", e => {
      e.preventDefault();
      this.copyTags(post, true);
    });
    const setChild = createElement("a", {
      classList: "inactive-link",
      href: "#",
      textContent: "child"
    });
    setChild.addEventListener("click", e => {
      e.preventDefault();
      this.copyTags(post, false);
    });
    div.children.length && div.append(" | ");
    div.append(setParent, " | ", setChild);
  },
  async iqdbReq() {
    try {
      let mid = document.getElementById("media_asset_id").value;
      let resp = await (await fetch(`/iqdb_queries.json?limit=5&search%5Bmedia_asset_id%5D=${mid}&search%5Bsimilarity%5D=50&search%5Bhigh_similarity%5D=70`)).json();
      if (Array.isArray(resp)) return resp;
      else throw new Error(JSON.stringify(resp));
    } catch (e) {
      console.error("Error:", e);
    }
  }
};

BOORU.init();
