// ==UserScript==
// @name           Banned Posts Helper
// @author         Sibyl
// @version        0.9
// @icon           https://cdn.jsdelivr.net/gh/notsibyl/danbooru@main/danbooru.svg
// @namespace      https://danbooru.donmai.us/forum_posts?search[creator_id]=817128&search[topic_id]=8502
// @homepageURL    https://github.com/notsibyl/danbooru
// @description    This post has been removed because of a takedown request.
// @match          *://*.donmai.us/*
// @exclude-match  *://cdn.donmai.us/*
// @grant          none
// @run-at         document-end
// ==/UserScript==

/* globals $ Danbooru */

const CUSTOM_THUMBNAIL_MEDIA_ASSET_ID = null;

const Utils = {
  wait: (ms = 1e3) => new Promise(resolve => setTimeout(resolve, ms)),
  createElement: (tag, props = {}) => {
    const el = document.createElement(tag);
    const { style, dataset, ..._props } = props;
    Object.assign(el, _props);
    Object.assign(el.dataset, dataset);
    if (typeof style === "string") el.style.cssText = style;
    else Object.assign(el.style, style);
    return el;
  },
  addStyle: css => document.head.appendChild(Utils.createElement("style", { textContent: css })),
  isPlural: count => (count === 1 ? "" : "s")
};

const Booru = {
  controller: document.body.dataset.controller,
  action: document.body.dataset.action,
  currentUserId: document.body.dataset.currentUserId,
  postId: document.body.dataset.postId,
  pathname: location.pathname,
  searchParams: new URLSearchParams(location.search),
  iconUri: document.querySelector("a#close-notice-link use").href.baseVal.split("#")[0],
  async initialize() {
    if (document.title.startsWith("Page Removed") && this.action === "error") {
      BannedPostsHelper.notify(false);
      if (this.pathname === "/posts" || this.pathname === "/posts.html") {
        this.controller = "posts";
        this.action = "index";
        HandlePostIndexPage.handleTakedownPage();
        return;
      } else {
        const postId = this.pathname.match(/^\/posts\/(\d+)(\.html)?/)?.[1];
        if (postId) {
          this.controller = "posts";
          this.action = "show";
          this.postId = postId;
          await HandlePostShowPage.initialize();
        }
      }
    }

    switch (this.controller) {
      case "artists":
        if (this.action === "show") await HandleArtistShowPage.initialize();
        break;
      case "iqdb-queries":
        await HandleIqdbQueryPage();
        break;
      case "posts":
        if (this.action === "index") await HandlePostIndexPage.initialize();
        else if (this.action === "show") {
        }
        break;
      case "upload-media-assets":
      case "uploads":
        if (this.action === "show") EasierOneUp.initialize();
        break;
      default:
    }
  },
  numerToHumanCount: n => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1, maximumSignificantDigits: 2 }).format(n).replace("K", "k"),
  numberToHumanSize: bytes => {
    if (bytes === 0) return "0 Bytes";
    else if (bytes === 1) return "1 Byte";
    const units = ["Bytes", "KB", "MB", "GB"];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const value = bytes / Math.pow(k, i);
    return `${Number.parseFloat(value.toPrecision(3))} ${units[i]}`;
  },
  timeAgoInWords(fromTime, toTime = new Date()) {
    const from = new Date(fromTime);
    const to = new Date(toTime);
    const distanceInSeconds = Math.abs((to - from) / 1000);
    const distanceInMinutes = Math.round(distanceInSeconds / 60);

    if (distanceInMinutes <= 1) return distanceInMinutes === 0 ? "less than a minute" : "1 minute";
    if (distanceInMinutes < 45) return `${distanceInMinutes} minutes`;
    if (distanceInMinutes < 90) return "about 1 hour";
    if (distanceInMinutes < 1440) return `about ${Math.round(distanceInMinutes / 60)} hours`;
    if (distanceInMinutes < 2520) return "1 day";
    if (distanceInMinutes < 43200) return `${Math.round(distanceInMinutes / 1440)} days`;
    if (distanceInMinutes < 86400) return "about 1 month";
    if (distanceInMinutes < 525600) return `${Math.round(distanceInMinutes / 43200)} months`;

    const isLeapYear = year => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    // Count leap years for Rails
    let leapYearsCount = 0;
    let fromYear = from.getFullYear();
    let toYear = to.getFullYear();
    if (from.getMonth() + 1 >= 3) fromYear += 1;
    if (to.getMonth() + 1 < 3) toYear -= 1;
    if (fromYear > toYear) leapYearsCount = 0;
    else {
      for (let year = fromYear; year <= toYear; year++) if (isLeapYear(year)) leapYearsCount++;
    }
    const leapMinuteOffset = leapYearsCount * 1440;
    const minutesWithOffset = distanceInMinutes - leapMinuteOffset;
    const remainder = minutesWithOffset % 525600; // 365 * 24 * 60
    const distanceInYears = Math.floor(minutesWithOffset / 525600);
    // year / 4
    if (remainder < 131400) return `about ${distanceInYears} year${Utils.isPlural(distanceInYears)}`;
    // year * 3 / 4
    if (remainder < 394200) return `over ${distanceInYears} year${Utils.isPlural(distanceInYears)}`;
    return `almost ${distanceInYears + 1} years`;
  },
  secondsToClock(totalSeconds) {
    const seconds = Math.floor(totalSeconds);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
  },
  tokenizer: (input, metatags, ignoreSpace = false) => {
    const tokens = [];
    const lowerInput = input.toLowerCase();
    let i = 0;
    while (i < input.length) {
      const char = input[i];
      if (/\s/.test(char)) {
        const start = i;
        while (i < input.length && /\s/.test(input[i])) i++;
        if (!ignoreSpace) tokens.push({ type: "whitespace", value: input.slice(start, i) });
        continue;
      }

      let negated = false;
      let or = false;
      if (input[i] === "-" && i + 1 < input.length && !/\s/.test(input[i + 1])) {
        negated = true;
        i++;
      } else if (input[i] === "~" && i + 1 < input.length && !/\s/.test(input[i + 1])) {
        or = true;
        i++;
      }
      const metaName = metatags.find(name => lowerInput.startsWith(`${name}:`, i));
      if (metaName !== undefined) {
        i += metaName.length + 1;
        let value = "",
          quoted = true;
        if (input[i] === '"' || input[i] === "'") {
          let hasEscape = false;
          quoted = "";
          value += input[i++];
          while (i < input.length) {
            quoted += input[i];
            value += input[i++];
            if (input[i - 1] === value[0]) {
              if (input[i - 2] !== "\\") {
                if (i < input.length && !/\s/.test(input[i])) quoted = false;
                else quoted = quoted.slice(0, -1);
                break;
              } else {
                hasEscape = true;
                quoted = quoted.slice(0, -2) + value[0];
              }
            }
          }
          if (!hasEscape) {
            value = value.slice(1, -1);
            quoted = false;
          }
        } else quoted = false;
        if (!quoted) {
          while (i < input.length && !/\s/.test(input[i])) {
            value += input[i++];
          }
        } else if (metaName !== "source") quoted = quoted.replace(/\s/g, "_");
        if (metaName !== "source") value = value.replace(/\s/g, "_");
        if (!["source", "newpool", "pool", "favgroup"].some(meta => metaName === meta)) value = value.toLowerCase();
        tokens.push({ type: "metatag", name: metaName, value, negated, or, quoted });
        continue;
      }
      let tag = "";
      while (i < input.length && !/\s/.test(input[i])) {
        tag += input[i++];
      }
      if (tag) {
        tokens.push({ type: "tag", value: tag.toLowerCase(), negated, or });
      }
    }
    return tokens;
  }
};

const TagListManager = {
  CAT: {
    0: "General",
    1: "Artist",
    3: "Copyright",
    4: "Character",
    5: "Meta"
  },
  async fetchTagData(tagSet, tagData = {}) {
    const chunkSize = 1000;
    const tagArray = [...tagSet];
    let tagDataArray = [];
    for (let i = 0; i < tagArray.length; i += chunkSize) {
      const chunk = tagArray.slice(i, i + chunkSize);
      const params = new URLSearchParams({
        _method: "get",
        limit: chunkSize,
        only: "name,post_count,category,is_deprecated,antecedent_implications[status,consequent_name]"
      });
      chunk.forEach(tag => params.append("search[name_array][]", tag));
      const resp = await (
        await fetch("/tags.json", {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
          },
          method: "POST",
          body: params.toString()
        })
      ).json();
      tagDataArray = tagDataArray.concat(resp);
    }
    const nextTagSet = new Set();
    const currentTagData = {};
    for (const tag of tagDataArray) currentTagData[tag.name] = tag;
    for (const tagName of tagArray) {
      const tag = currentTagData[tagName] ?? {
        name: tagName,
        post_count: 0,
        category: 0,
        is_deprecated: false,
        unknown: true
      };
      tagData[tagName] = tag;
    }
    for (let tag in tagData) {
      const { antecedent_implications: ais, category } = tagData[tag];
      if (category > 1 && ais) {
        ais.forEach(ai => {
          if (ai.status === "active" && !tagData[ai.consequent_name]) nextTagSet.add(ai.consequent_name);
        });
      }
    }
    if (nextTagSet.size) return this.fetchTagData(nextTagSet, tagData);
    return tagData;
  },
  createTagElement({ name, category, is_deprecated, post_count }, level = 0) {
    const li = Utils.createElement("li", {
      classList: `flex tag-type-${category}${level ? " tag-nesting-level-" + level : ""}`,
      dataset: { tagName: name, isDeprecated: is_deprecated }
    });
    const spanQ = Utils.createElement("span", { classList: "mr-2" });
    const href = category === 1 ? `/artists/show_or_new?name=${name}` : `/wiki_pages/${/^\d+$/.test(name) ? "~" : ""}${name}`;
    spanQ.append(Utils.createElement("a", { classList: "wiki-link", href, textContent: "?" }));
    li.append(spanQ);
    if (level)
      li.append(
        Utils.createElement("span", {
          classList: "nested-tag-icon text-muted select-none mr-1",
          style: `margin-left: ${0.75 * (level - 1)}rem`,
          textContent: "↳"
        })
      );
    const span = Utils.createElement("span");
    const tag = Utils.createElement("a", { href: `/posts?tags=${name}`, textContent: name.replace(/_/g, " ") });
    const count = Utils.createElement("span", { classList: "post-count", title: "${post_count}", textContent: Booru.numerToHumanCount(post_count) });
    span.append(tag, " ", count);
    li.append(span);
    return li;
  },
  insertTagElements(tagList, tagsToInsertData, overwrite = true, requiredTags, newLineHandler) {
    const categorizedTagMap = {};
    const getNestLevel = li => Number(Array.prototype.find.call(li.classList, n => n.startsWith("tag-nesting-level-"))?.slice(-1));
    tagList.querySelectorAll("li").forEach(li => {
      const cat = Array.prototype.find.call(li.classList, n => n.startsWith("tag-type-")).slice(-1);
      if (!categorizedTagMap[cat]) categorizedTagMap[cat] = {};
      let level = getNestLevel(li),
        compareRef = li.dataset.tagName;
      if (level) {
        let i = level,
          prevLi = li;
        while (i > 0) {
          prevLi = prevLi.previousElementSibling;
          const prevLevel = getNestLevel(prevLi) || 0;
          if (prevLevel < i) {
            compareRef = `${prevLi.dataset.tagName},${compareRef}`;
            i--;
          }
        }
      }
      categorizedTagMap[cat][compareRef] = li;
    });

    if (!requiredTags) requiredTags = Object.keys(tagsToInsertData);
    const getAllNestedTagLines = (tagName, implications, compareRef, level = 1) => {
      let lines = [];
      implications?.forEach(({ status, consequent_name }) => {
        if (status === "active") {
          compareRef = `${consequent_name},${compareRef}`;
          const nextImplications = tagsToInsertData[consequent_name].antecedent_implications;
          if (nextImplications.length) lines = lines.concat(getAllNestedTagLines(tagName, nextImplications, compareRef, level + 1));
          else lines.push({ tagName, level, compareRef }, { tagName: consequent_name, level: 0, compareRef: consequent_name });
        }
      });
      return lines;
    };
    const addToCategorizedTagMap = (li, compareRef, cat) => {
      const oldLi = categorizedTagMap[cat][compareRef];
      if (overwrite && oldLi) oldLi.remove();
      if (!oldLi || overwrite) {
        categorizedTagMap[cat][compareRef] = li;
      }
    };
    for (const tag of requiredTags) {
      const data = tagsToInsertData[tag];
      const { antecedent_implications: ais, category } = data;
      if (!categorizedTagMap[category]) {
        categorizedTagMap[category] = {};
      }
      if (category > 1 && ais.length) {
        const lines = getAllNestedTagLines(tag, ais, tag);
        if (lines.length) {
          lines.forEach(line => {
            const currentTag = line.tagName;
            if (requiredTags.indexOf(currentTag) > -1 && currentTag !== tag) return;
            const li = this.createTagElement(tagsToInsertData[currentTag], line.level);
            typeof newLineHandler === "function" && newLineHandler(li);
            addToCategorizedTagMap(li, line.compareRef, category);
          });
          continue;
        }
      }
      const li = this.createTagElement(data);
      typeof newLineHandler === "function" && newLineHandler(li);
      addToCategorizedTagMap(li, tag, category);
    }
    [1, 3, 4, 0, 5].forEach(cat => {
      const className = `${this.CAT[cat].toLowerCase()}-tag-list`;
      const tagMap = categorizedTagMap[cat];
      if (!tagMap) return;
      let h3 = tagList.querySelector(`h3.${className}`),
        ul = tagList.querySelector(`ul.${className}`);
      if (!ul) {
        h3 = Utils.createElement("h3", { classList: className, textContent: this.CAT[cat] });
        ul = Utils.createElement("ul", { classList: className });
      }
      Object.keys(tagMap)
        .sort()
        .forEach(ref => ul.append(tagMap[ref]));
      tagList.append(h3, ul);
    });
    return tagList;
  }
};

const BannedPostsHelper = {
  thumbnailInfo: {
    id: 23609685,
    variants: [
      { type: "180x180", url: "https://cdn.donmai.us/180x180/3e/3c/3e3c7baac2a12a0936ba1f62a46a3478.jpg", width: 180, height: 135, file_ext: "jpg" },
      { type: "360x360", url: "https://cdn.donmai.us/360x360/3e/3c/3e3c7baac2a12a0936ba1f62a46a3478.jpg", width: 360, height: 270, file_ext: "jpg" },
      { type: "720x720", url: "https://cdn.donmai.us/720x720/3e/3c/3e3c7baac2a12a0936ba1f62a46a3478.webp", width: 720, height: 540, file_ext: "webp" }
    ]
  },
  postPreviewSize: Danbooru.Cookie.get("post_preview_size") || "180",
  postPreviewSizeMap: {
    150: "180x180",
    180: "180x180",
    225: "360x360",
    270: "360x360",
    360: "360x360",
    720: "720x720"
  },
  showDeletedChildren: Danbooru.CurrentUser.data("show-deleted-children"),
  async initializeThumbnail() {
    if (!CUSTOM_THUMBNAIL_MEDIA_ASSET_ID) return localStorage.removeItem("bph_thumbnail_info");
    let thumbnailInfo = JSON.parse(localStorage.getItem("bph_thumbnail_info"));
    if (!thumbnailInfo || thumbnailInfo.id !== CUSTOM_THUMBNAIL_MEDIA_ASSET_ID) {
      thumbnailInfo = await (await fetch(`/media_assets/${CUSTOM_THUMBNAIL_MEDIA_ASSET_ID}.json`)).json();
      localStorage.setItem("bph_thumbnail_info", JSON.stringify(thumbnailInfo));
    }
    if (thumbnailInfo && !thumbnailInfo.error) this.thumbnailInfo = thumbnailInfo;
  },
  parseMedia({ md5, duration, file_ext, pixel_hash, variants, image_width: w, image_height: h }, metaTags = "", previewSize = this.postPreviewSize) {
    const isFlash = file_ext === "swf";
    const hasMd5 = !!md5 || isFlash || (duration && file_ext !== "zip");
    const res = this.postPreviewSizeMap[previewSize];
    const generateUrl = (type, md5, ext) => `https://cdn.donmai.us/${type}/${md5.slice(0, 2)}/${md5.slice(2, 4)}/${md5}.${ext}`;

    const asset = {};
    if (!isFlash) {
      const res2x = res === "180x180" ? "360x360" : res === "360x360" ? "720x720" : null;
      if (hasMd5) {
        const ext = res === "720x720" ? "webp" : "jpg";
        const longestEdge = Math.max(w, h);
        if (longestEdge <= Number(res.slice(0, 3))) Object.assign(asset, { width: w, height: h });
        else {
          const scale = previewSize / longestEdge;
          Object.assign(asset, { width: Math.floor(w * scale), height: Math.floor(h * scale) });
        }
        asset.url = generateUrl(res, md5 || pixel_hash, ext);
        if (res !== "720x720") {
          const ext2x = res === "360x360" ? "webp" : "jpg";
          asset.srcset = `${asset.url} 1x, ${generateUrl(res2x, md5 || pixel_hash, ext2x)} 2x`;
          asset.srcsetType = ext2x === "webp" ? "image/webp" : "image/jpeg";
        }
      } else {
        const samples = variants || this.thumbnailInfo.variants;
        let var1, var2;
        samples.forEach(v => {
          if (v.type === res) var1 = v;
          if (v.type === res2x) var2 = v;
        });
        Object.assign(asset, var1);
        asset.srcset = `${var1.url} 1x, ${var2.url} 2x`;
        asset.srcsetType = var2.file_ext === "webp" ? "image/webp" : "image/jpeg";
      }
    }
    if (hasMd5) asset.orig = generateUrl("original", md5 || pixel_hash, file_ext);
    return {
      isFlash,
      asset,
      hasSound: /\bsound\b/.test(metaTags),
      duration: duration ? Booru.secondsToClock(duration) : null
    };
  },
  buildPreview(
    { id, uploader_id, score, rating, tag_string, is_pending, is_flagged, is_deleted, has_children, has_visible_children, parent_id, media_asset, source },
    previewSize,
    type = 0,
    { similarity, query } = {}
  ) {
    const flags = is_pending ? "pending" : is_flagged ? "flagged" : is_deleted ? "deleted" : "";
    const classList = ["post-preview", "post-preview-" + previewSize, "post-preview-fit-compact"];
    is_pending && classList.push("post-status-pending");
    is_flagged && classList.push("post-status-flagged");
    is_deleted && classList.push("post-status-deleted");
    parent_id && classList.push("post-status-has-parent");
    ((this.showDeletedChildren && has_children) || (!this.showDeletedChildren && has_visible_children)) && classList.push("post-status-has-children");

    const article = Utils.createElement("article", {
      id: `post_${id}`,
      classList: classList.join(" "),
      dataset: {
        id,
        tags: tag_string,
        rating,
        flags,
        score,
        uploaderId: uploader_id
      }
    });
    const container = Utils.createElement("div", { classList: "post-preview-container" });
    let href = `/posts/${id}`;
    if (type === 1 && query) href += `?q=${query}`;
    const a = Utils.createElement("a", { classList: "post-preview-link", href, draggable: false });
    const { asset, hasSound, duration, isFlash } = this.parseMedia(media_asset, tag_string, previewSize);
    if (duration) {
      const div = Utils.createElement("div", { classList: "post-animation-icon absolute top-0.5 left-0.5 p-0.5 m-0.5 leading-none rounded text-xs font-arial font-bold" });
      const span = Utils.createElement("span", { classList: "post-duration align-middle", textContent: duration });
      div.append(span);
      a.append(div);
      if (hasSound)
        div.insertAdjacentHTML(
          "beforeend",
          `<svg class="icon svg-icon volume-high-icon h-3 mx-0.5" viewBox="0 0 640 512"><use fill="currentColor" href="${Booru.iconUri}#volume-high"></use></svg>`
        );
    }
    const picture = Utils.createElement("picture");
    if (asset.srcset) picture.append(Utils.createElement("source", { type: asset.srcsetType, srcset: asset.srcset }));
    const title = `${tag_string} rating:${rating} score:${score}`;
    const property = { classList: "post-preview-image", src: "/images/flash-preview.png", alt: `post #${id}`, draggable: "true" };
    if (isFlash) {
      property.title = title;
    } else
      Object.assign(property, {
        src: asset.url,
        width: asset.width,
        height: asset.height,
        title: "",
        alt: `post #${id}`,
        dataset: { title }
      });
    const img = Utils.createElement("img", property);
    picture.append(img);
    a.append(picture);
    container.append(a);
    article.append(container);

    if (type === 0) {
      article.classList.add("inline-block", "align-top", "p-2");
    }
    // Add upvote/downvote button
    else if (type === 1) {
      const hideScore = Danbooru.Cookie.get("post_preview_show_votes") === "false";
      if (!hideScore) {
        article.classList.add("post-preview-show-votes");
        article.insertAdjacentHTML(
          "beforeend",
          `<div class="post-preview-score text-sm text-center mt-1">
<span class="post-votes inline-flex gap-1" data-id="${id}">
<a class="post-upvote-link inactive-link" data-remote="true" rel="nofollow" data-method="post" href="/posts/${id}/votes?score=1">
<svg class="icon svg-icon upvote-icon" viewBox="0 0 448 512">
<use fill="currentColor" href="${Booru.iconUri}#upvote"></use></svg></a>
<span class="post-score inline-block text-center whitespace-nowrap align-middle min-w-4">
<a rel="nofollow" href="/post_votes?search%5Bpost_id%5D=${id}&amp;variant=compact">${score}</a></span>
<a class="post-downvote-link inactive-link" data-remote="true" rel="nofollow" data-method="post" href="/posts/${id}/votes?score=-1">
<svg class="icon svg-icon downvote-icon" viewBox="0 0 448 512">
<use fill="currentColor" href="${Booru.iconUri}#downvote"></use>
</svg></a></span></div>`
        );
      }
    }
    // Add similarity info
    else if (type === 2) {
      const level = similarity < 70 ? "low" : "high";
      article.classList.add(`iqdb-${level}-similarity`);
      article.setAttribute("x-data", `{"similarity":"${level}"}`);
      article.setAttribute("x-show", "similarity === 'high' || (similarity === 'low' && showLowSimilarity)");
      const similarityHtml = similarity ? `<div><a class="inactive-link iqdb-similarity-score" href="/iqdb_queries?post_id=${id}">${similarity.toFixed(0)}% similar</a></div>` : "";
      article.insertAdjacentHTML(
        "beforeend",
        `<div class="text-xs text-center mt-1"><div>
<a rel="external noreferrer nofollow" title="${source}" class="inline-block align-top" href="${source}">
<svg class="icon svg-icon globe-icon h-4" viewBox="0 0 512 512">
<use fill="currentColor" href="${Booru.iconUri}#globe"></use></svg></a>
<a href="/media_assets/${media_asset.id}">${Booru.numberToHumanSize(media_asset.file_size)} .${media_asset.file_ext}, ${media_asset.image_width}×${media_asset.image_height}</a></div>${similarityHtml}</div>`
      );
    }
    // Add nothing
    else if (type === 3);
    return article;
  },
  insertPreview(container, postDataArray, type, query = null) {
    const existingPosts = [...container.children];
    const postMap = {};
    for (const post of existingPosts) postMap[post.dataset.id] = post;
    let insertedCount = 0;
    const all = postDataArray.map(post => {
      const postInfo = post.post || post;
      const existingPost = postMap[postInfo.id];
      if (existingPost) return existingPost;
      insertedCount++;
      return this.buildPreview(postInfo, this.postPreviewSize, type, { query, similarity: post.score });
    });
    container.append(...all);
    return insertedCount;
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
  notify(loaded = false) {
    window.__bph_loaded = loaded;
    if (loaded) window.dispatchEvent(new CustomEvent("BannedContentLoaded"));
  }
};

const HandlePostShowPage = {
  /* Phase I */
  fetchPost: async () => (await fetch(`/posts/${Booru.postId}.json`)).json(),
  async buildSidebar() {
    const html = await (
      await fetch(`/posts/${Booru.postId}?variant=tooltip&preview=false`, {
        headers: { "X-CSRF-Token": Danbooru.Utility.meta("csrf-token") }
      })
    ).text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const uploader = doc.querySelector("a.user");
    uploader.classList.remove("truncate");
    const date = doc.querySelector("a.post-tooltip-date");
    date.removeAttribute("class");
    const time = date.children[0];
    time.removeAttribute("class");
    time.textContent = Booru.timeAgoInWords(time.dateTime) + " ago";
    const score = doc.querySelector("span.post-tooltip-score>span");
    const size = doc.querySelector("a.post-tooltip-dimensions");
    const source = doc.querySelector("a.post-tooltip-source");
    const ratingString = doc.querySelector("a.post-tooltip-rating").href.split("%3A")[1];
    const commentCount = doc.querySelector("span.post-tooltip-comments>span")?.textContent;

    const result = {
      commentCount: Number(commentCount) || 0
    };

    const sidebar = Utils.createElement("aside", { id: "sidebar", classList: "flex-0 break-words sm:order-2" });
    result.sidebar = sidebar;

    const sidebarSearchSection = Utils.createElement("section", { id: "search-box" });
    sidebar.append(sidebarSearchSection);
    sidebarSearchSection.innerHTML = `<h2>Search</h2><form id="search-box-form" class="flex" action="/posts" accept-charset="UTF-8"><input name="tags" id="tags" value="${Booru.searchParams.get("q") || ""}" class="flex-auto" data-shortcut="q" data-autocomplete="tag-query" autocapitalize="none"> <input type="hidden" name="z" id="z" value="5"> <button id="search-box-submit" type="submit"><svg class="icon svg-icon search-icon" viewBox="0 0 512 512"><use fill="currentColor" href="${Booru.iconUri}#search"/></svg></button></form>`;

    const sidebarTagListSection = Utils.createElement("section", { id: "tag-list" });
    sidebar.append(sidebarTagListSection);
    const sidebarTagListDiv = Utils.createElement("div", { classList: "tag-list categorized-tag-list" });
    sidebarTagListSection.append(sidebarTagListDiv);
    result.tagList = sidebarTagListDiv;

    const sidebarInfoSection = Utils.createElement("section", { id: "post-information" });
    sidebar.append(sidebarInfoSection);
    const ul = Utils.createElement("ul");
    sidebarInfoSection.append(Utils.createElement("h2", { textContent: "Information" }), ul);
    const idLine = Utils.createElement("li", { id: "post-info-id", textContent: `ID: ${Booru.postId}` });
    const uploaderLine = Utils.createElement("li", { id: "post-info-uploader" });
    uploaderLine.append("Uploader: ", uploader, " ", Utils.createElement("a", { href: `/posts?tags=user:${uploader.dataset.userName}`, textContent: "»" }));
    const dateLine = Utils.createElement("li", { id: "post-info-date" });
    dateLine.append("Date: ", date);
    const approverLine = Utils.createElement("li", { id: "post-info-approver" });
    approverLine.append("Approver: ");
    result.approverLine = approverLine;
    const sizeLine = Utils.createElement("li", { id: "post-info-size" });
    sizeLine.append("Size: ");
    result.sizeLine = sizeLine;
    result.tooltipSize = size;
    const sourceLine = Utils.createElement("li", { id: "post-info-source" });
    sourceLine.append("Source: ");
    const sourceIconClass = source.children[0].classList;
    if (!sourceIconClass.contains("link-slash-icon")) {
      if (sourceIconClass.contains("file-lines-icon") || sourceIconClass.contains("file-pen-icon")) sourceLine.append(source.title);
      else {
        sourceLine.append(Utils.createElement("a", { href: source.href, textContent: source.href.replace(/https?:\/\//, "") }, result.source));
        result.sourceLine = sourceLine;
      }
    }
    const ratingLine = Utils.createElement("li", { id: "post-info-rating", textContent: "Rating: " + ratingString });
    const scoreLine = Utils.createElement("li", { id: "post-info-score" });
    scoreLine.append("Score: ", score);
    const favLine = Utils.createElement("li", { id: "post-info-favorites" });
    result.favCount = Utils.createElement("a", { href: `/posts/${Booru.postId}/favorites`, textContent: "?" });
    const favSpan = Utils.createElement("span", { classList: "post-favcount", dataset: { id: Booru.postId } });
    favSpan.append(result.favCount);
    favLine.append("Favorites: ", favSpan);
    const statusLine = Utils.createElement("li", { id: "post-info-status", textContent: "Status: " });
    result.statusLine = statusLine;
    ul.append(idLine, uploaderLine, dateLine, approverLine, sizeLine, sourceLine, ratingLine, scoreLine, favLine, statusLine);

    const sidebarOptionSection = Utils.createElement("section", { id: "post-options" });
    sidebar.append(sidebarOptionSection);
    sidebarOptionSection.innerHTML = `<h2>Options</h2><ul><li id="post-option-find-similar"><a ref="nofollow" href="/iqdb_queries?post_id=${Booru.postId}">Find similar</a><li id="post-option-add-to-favorites"><a id="add-to-favorites" data-shortcut="f" data-remote="true" rel="nofollow" data-method="post" href="/favorites?post_id=${Booru.postId}">Favorite</a><li id="post-option-remove-from-favorites"><a id="remove-from-favorites" data-shortcut="shift+f" data-shortcut-when=":visible" style="display:none" data-remote="true" rel="nofollow" data-method="delete" href="/favorites/${Booru.postId}">Unfavorite</a><li id="post-option-add-to-pool"><a id="pool" data-shortcut="p" href="#">Add to pool</a><li id="post-option-add-commentary"><a id="add-commentary" data-shortcut="c" href="#">Add commentary</a></li><li id="post-option-add-fav-group"><a id="open-favgroup-dialog-link" data-shortcut="g" href="#">Add to fav group</a><li id="post-option-flag" style="display:none"><a data-remote="true" href="/post_flags/new?post_flag%5Bpost_id%5D=${Booru.postId}">Flag</a><li id="post-option-appeal" style="display:none"><a data-remote="true" href="/post_appeals/new?post_appeal%5Bpost_id%5D=${Booru.postId}">Appeal</a></ul>`;
    result.optionSection = sidebarOptionSection;

    const sidebarHistorySection = Utils.createElement("section", { id: "post-history" });
    sidebar.append(sidebarHistorySection);
    sidebarHistorySection.innerHTML = `<h2>History</h2><ul><li id="post-history-tags"><a href="/post_versions?search%5Bpost_id%5D=${Booru.postId}">Tags</a><li id="post-history-pools"><a href="/pool_versions?search%5Bpost_id%5D=${Booru.postId}">Pools</a><li id="post-history-notes"><a href="/note_versions?search%5Bpost_id%5D=${Booru.postId}">Notes</a><li id="post-history-moderation"><a href="/posts/${Booru.postId}/events">Moderation</a><li id="post-history-commentary"><a href="/artist_commentary_versions?search%5Bpost_id%5D=${Booru.postId}">Commentary</a></ul>`;

    return result;
  },
  async buildDialog() {
    const html = await (
      await fetch(`/posts/${Booru.postId}.js`, {
        headers: { "X-CSRF-Token": Danbooru.Utility.meta("csrf-token") }
      })
    ).text();
    document.body.insertAdjacentHTML("beforeend", html);
  },
  async buildFavButton() {
    const resp = await (await fetch(`/favorites.json?search[post_id]=${Booru.postId}&search[user_id]=${Booru.currentUserId}`)).json();
    const isFavorited = resp && Array.isArray(resp) && resp.length === 1;
    const container = Utils.createElement("div", { classList: "fav-buttons-container" });
    const token = Danbooru.Utility.meta("csrf-token");
    container.innerHTML = `<div class="fav-buttons-container"><div class="mb-2 fav-buttons fav-buttons-${isFavorited ? "true" : "false"}"><form id="add-fav-button" data-remote="true" action="/favorites?post_id=${Booru.postId}" accept-charset="UTF-8" method="post"><input type="hidden" name="authenticity_token" value="${token}"> <button name="button" type="submit" class="text-lg py-1 px-3" data-disable-with='<svg class="icon svg-icon spinner-icon animate-spin" viewBox="0 0 512 512"><use fill="currentColor" href="${Booru.iconUri}#spinner" /></svg>'><svg class="icon svg-icon empty-heart-icon" viewBox="0 0 512 512"><use fill="currentColor" href="${Booru.iconUri}#empty-heart"/></svg></button></form><form id="remove-fav-button" data-remote="true" action="/favorites/${Booru.postId}" accept-charset="UTF-8" method="post"><input type="hidden" name="_method" value="delete"><input type="hidden" name="authenticity_token" value="${token}"> <button name="button" type="submit" class="text-lg py-1 px-3" data-disable-with='<svg class="icon svg-icon spinner-icon animate-spin" viewBox="0 0 512 512"><use fill="currentColor" href="${Booru.iconUri}#spinner" /></svg>'><svg class="icon svg-icon solid-heart-icon" viewBox="0 0 512 512"><use fill="currentColor" href="${Booru.iconUri}#solid-heart"/></svg></button></form></div></div>`;
    return container;
  },
  async buildBlackListAndCommentary() {
    const html = await (await fetch(`/artist_commentaries?search[post_id]=${Booru.postId}`)).text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    // Blacklist
    const result = [doc.querySelector("#blacklist-box"), null];
    // Commentary
    const row = doc.querySelector(`#artist-commentaries-table tr[data-post-id="${Booru.postId}`);
    if (!row) return result;
    const originalCell = row.querySelector(".original-column");
    const translatedCell = row.querySelector(".translated-column");
    const hasOriginal = /\S/.test(originalCell.textContent);
    const hasTranslated = /\S/.test(translatedCell.textContent);
    const container = Utils.createElement("div", { id: "artist-commentary" });
    const title = Utils.createElement("h2", { textContent: "Artist's commentary" });
    const menu = Utils.createElement("menu", { id: "commentary-sections" });
    container.append(title, menu);
    const original = Utils.createElement("section", { id: "original-artist-commentary" });
    original.append(...originalCell.children);
    const translated = Utils.createElement("section", { id: "translated-artist-commentary" });
    translated.append(...translatedCell.children);
    if (hasOriginal && hasTranslated) {
      original.style.display = "none";
      menu.innerHTML = '<li><a href="#original">Original</a></li> | <li class="active"><a href="#translated">Translated</a>';
      container.append(original, translated);
    } else if (hasOriginal) {
      menu.innerHTML = "<li><b>Original</b></li>";
      container.append(original);
    } else if (hasTranslated) {
      menu.innerHTML = "<li><b>Translated</b></li>";
      container.append(translated);
    } else return result;
    result[1] = container;
    return result;
  },
  async buildComment() {
    const href = `/comments/new?comment[post_id]=${Booru.postId}`;
    const html = await (await fetch(href)).text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const form = doc.querySelector("form.simple_form.edit_comment");
    form.style.display = "none";
    const commentSection = Utils.createElement("section", { id: "comments" });
    const div = Utils.createElement("div", { classList: "comments-for-post", dataset: { postId: Booru.postId } });
    const commentListContainer = Utils.createElement("div", { classList: "list-of-comments list-of-messages" });
    const newCommentContainer = Utils.createElement("div", { classList: "new-comment" });
    const button = Utils.createElement("a", { classList: "expand-comment-response", href, textContent: "Leave a comment" });
    const p = Utils.createElement("p");
    p.append(button);
    newCommentContainer.append(p, form);
    div.append(commentListContainer, newCommentContainer);
    commentSection.append(div);
    return { commentSection, commentListContainer };
  },
  async buildNavbar() {
    // https://github.com/danbooru/danbooru/blob/master/app/components/post_navbar_component.rb
    /** @param {('search'|'favgroup'|'pool')} type */
    const newLine = (type = "search", selected = false, data) => {
      let classList = `${type}-navbar`;
      if (type === "pool") classList += ` pool-category-${data.category}`;
      const li = Utils.createElement("li", { classList, dataset: { selected } });
      const elements = new Array(3);
      elements[1] = Utils.createElement("span", { classList: type + "-name" });
      if (type === "search") {
        elements[0] = Utils.createElement("a", {
          rel: "nofollow prev",
          classList: "prev",
          textContent: "‹ prev",
          href: `/posts/${Booru.postId}/show_seq?q=${encodeURIComponent(data.query)}&seq=prev`,
          dataset: { shortcut: "a" }
        });
        elements[1].append("Search: ", Utils.createElement("a", { rel: "nofollow", href: `/posts?q=${encodeURIComponent(data.query)}`, textContent: data.query }));
        elements[2] = Utils.createElement("a", {
          rel: "nofollow next",
          classList: "next",
          textContent: "next ›",
          href: `/posts/${Booru.postId}/show_seq?q=${encodeURIComponent(data.query)}&seq=next`,
          dataset: { shortcut: "d" }
        });
      } else {
        elements[0] = Utils.createElement("span", { classList: "prev" });
        elements[2] = Utils.createElement("span", { classList: "next" });
        const length = data.post_ids.length;
        const index = data.post_ids.findIndex(id => id === Number(Booru.postId));
        const firstId = data.post_ids[0];
        const prevId = index === 0 ? null : data.post_ids[index - 1];
        const nextId = index === length - 1 ? null : data.post_ids[index + 1];
        const lastId = data.post_ids[length - 1];
        elements[0].append(prevId ? Utils.createElement("a", { rel: "nofollow", textContent: "‹ prev", href: `/posts/${prevId}?q=${type}:${data.id}` }) : "‹ prev");
        elements[1].append(
          Utils.createElement("a", {
            href: `/${type === "pool" ? "pools" : "favorite_groups"}/${data.id}`,
            title: `page ${index + 1}/${length}`,
            textContent: `${type === "pool" ? "Pool" : "Favgroup"}: ${data.name.replace(/_/g, " ")}`
          })
        );
        elements[2].append(nextId ? Utils.createElement("a", { rel: "nofollow", textContent: "next ›", href: `/posts/${nextId}?q=${type}:${data.id}` }) : "next ›");
        const first = Utils.createElement("span", { classList: "first" });
        first.append(prevId ? Utils.createElement("a", { rel: "nofollow", href: `/posts/${firstId}?q=${type}:${data.id}`, textContent: "«" }) : "«");
        elements.splice(0, 0, first);
        const last = Utils.createElement("span", { classList: "last" });
        last.append(nextId ? Utils.createElement("a", { rel: "nofollow", href: `/posts/${lastId}?q=${type}:${data.id}`, textContent: "»" }) : "»");
        elements.push(last);
      }
      li.append(...elements);
      return li;
    };
    const qs = Booru.searchParams.get("q")?.trim();
    let selectedType = "search",
      selectedValue;
    if (qs) {
      const metatags = ["order", "ordfav", "ordpool", "pool", "favgroup", "ordfavgroup"];
      const tags = Booru.tokenizer(qs, metatags, true);
      const tag0Matched = metatags.find(meta => tags[0].name === meta);
      if (tags.length === 1 && !tags[0].negated && !tags[0].or && tag0Matched) {
        selectedType = tag0Matched.endsWith("pool") ? "pool" : tag0Matched.endsWith("favgroup") ? "favgroup" : null;
        selectedValue = tags[0].quoted || tags[0].value;
      } else {
        const ng = ["order", "ordfav", "ordpool"];
        if (tags.find(m => ng.some(n => n === m.name))) selectedType = null;
      }
    }

    const ul = Utils.createElement("ul", { classList: "notice post-notice post-notice-search" });
    if (selectedType === "search") ul.append(newLine("search", true, { query: qs || "status:any" }));
    const all = await Promise.all([
      (await fetch(`/pools.json?search[post_ids_include_all]=${Booru.postId}`)).json(),
      (await fetch(`/favorite_groups.json?search[creator_id]=${Booru.currentUserId}&search[post_ids_include_all]=${Booru.postId}`)).json()
    ]);
    if (selectedValue) selectedValue = selectedValue.toLowerCase();
    all[0].forEach(p => {
      const isSelected = selectedType === "pool" && (p.name.toLowerCase() === selectedValue || p.id.toSring() === selectedValue);
      ul.append(newLine("pool", isSelected, p));
    });
    all[1].forEach(f => {
      const isSelected = selectedType === "favgroup" && (f.name.toLowerCase() === selectedValue || f.id.toSring() === selectedValue);
      ul.append(newLine("favgroup", isSelected, f));
    });

    if (ul.children.length === 0) return null;
    return ul;
  },
  /* Phase II */
  patchBody(postInfo) {
    const dataset = {
      controller: "posts",
      action: "show",
      layout: "sidebar"
    };
    for (let key in postInfo) {
      if (key.startsWith("tag_string")) continue;
      if (["source", "rating", "file_ext", "has_visible_children", "media_asset"].indexOf(key) > -1) continue;
      let newKey = key.replace(/_([a-z])/g, (_, $1) => $1.toUpperCase());
      dataset["post" + newKey.charAt(0).toUpperCase() + newKey.slice(1)] = postInfo[key];
    }
    Object.assign(document.body.dataset, dataset);
  },
  patchSubnavMenu() {
    const name = document.body.dataset.currentUserName;
    document
      .getElementById("nav")
      .insertAdjacentHTML(
        "beforeend",
        `<div id="subnav-menu" class="flex flex-wrap items-center px-5 sm:p-2"><a id="subnav-listing" class="py-1.5 px-3" href="/posts">Listing</a> <a id="subnav-upload" class="py-1.5 px-3" href="/uploads/new">Upload</a> <a id="subnav-hot" class="py-1.5 px-3" href="/posts?d=1&tags=order%3Arank">Hot</a> <a id="subnav-favorites" class="py-1.5 px-3" href="/posts?tags=ordfav%3A${name}">Favorites</a> <a id="subnav-fav-groups" class="py-1.5 px-3" href="/favorite_groups?search%5Bcreator_name%5D=${name}">Fav groups</a> <a id="subnav-saved-searches" class="py-1.5 px-3" href="/posts?tags=search%3Aall">Saved searches</a> <a id="subnav-changes" class="py-1.5 px-3" href="/post_versions">Changes</a> <a id="subnav-help" class="py-1.5 px-3" href="/wiki_pages/help:posts">Help</a></div>`
      );
  },
  patchSidebarInfoSection({ source, fav_count, media_asset }, { favCount, sizeLine, tooltipSize, sourceLine }) {
    favCount.textContent = fav_count;
    const { asset } = BannedPostsHelper.parseMedia(media_asset);
    const [size, res] = tooltipSize.textContent.split(", ");
    sizeLine.append(
      asset.orig ? Utils.createElement("a", { href: asset.orig, textContent: size }) : size,
      ` (${res.replace(/\s\(\d:\d{2}\)/, "")}) `,
      Utils.createElement("a", { href: tooltipSize.pathname, textContent: "»" })
    );
    sourceLine && sourceLine.append(" ", Utils.createElement("a", { href: source, textContent: "»" }));
  },
  patchSidebarBlacklist(blacklistBox, tagList) {
    blacklistBox.classList.remove("inline-flex", "sm:flex-col", "sm:w-full", "thin-x-scrollbar", "inline-blacklist");
    blacklistBox.classList.add("sidebar-blacklist");

    const header = blacklistBox.children[0];
    header.setAttribute("x-bind:class", "{ 'border-b': !blacklist.collapsed }");

    const chevron = blacklistBox.querySelector(":scope a.inactive-link.contents svg.chevron-down-icon");
    chevron.setAttribute("class", "icon svg-icon chevron-down-icon transition-transform");
    chevron.setAttribute("x-bind:class", "{ 'rotate-180' : blacklist.collapsed }");

    const rulesWrap = blacklistBox.querySelector(':scope > div[x-show="!blacklist.collapsed"]');
    if (rulesWrap) {
      rulesWrap.setAttribute("class", "thin-scrollbar max-h-360px p-2");
      rulesWrap.querySelectorAll(":scope > div").forEach(rule => rule.classList.remove("md:border-l", "md:p-2"));
    }
    tagList.insertAdjacentElement("beforebegin", blacklistBox);
  },
  async patchSidebarTagList(tagList, tags) {
    const tagData = await TagListManager.fetchTagData(tags);
    return TagListManager.insertTagElements(tagList, tagData);
  },
  async patchSidebarApprover(uid, approverLine) {
    if (uid) {
      const userInfo = await (await fetch(`/users/${uid}.json`)).json();
      let classList = "user user-" + userInfo.level_string.toLowerCase();
      if (userInfo.is_banned) classList += " user-banned";
      const user = Utils.createElement("a", {
        classList,
        dataset: {
          userId: uid,
          userName: userInfo.name,
          userLevel: userInfo.level
        },
        href: `/users/${uid}`,
        textContent: userInfo.name.replace(/_/g, " ")
      });
      const approved = Utils.createElement("a", { href: `/posts?tags=approver:${userInfo.name}`, textContent: "»" });
      approverLine.append(user, " ", approved);
    } else approverLine.remove();
    return approverLine;
  },
  async patchStatus({ is_pending, is_flagged, is_deleted }, statusLine, optionSection) {
    const actualStatus = is_pending ? "Pending" : is_flagged ? "Flagged" : is_deleted ? "Deleted" : "Active";
    let status = actualStatus;
    let classList = "notice notice-small post-notice post-notice-";
    const bannedPostNotice = Utils.createElement("div", {
      classList: classList + "banned",
      textContent: "This page has been removed because of a takedown request or rule violation."
    });
    if (status === "Active") {
      optionSection.querySelector("#post-option-flag").style.display = "unset";
      statusLine.append(`Active Banned`);
      return [bannedPostNotice];
    }

    const parseEventMessage = node => {
      if (!node) return "";
      const nodes = node.childNodes;
      let start = false;
      let buffer = [];
      nodes.forEach((child, i) => {
        let value = child.nodeValue || child.outerHTML;
        if (!start && child.nodeType === node.TEXT_NODE) {
          const n = value.indexOf("(");
          if (n > -1) {
            start = true;
            value = value.slice(n + 1);
          }
        }
        if (i == nodes.length - 1) {
          value = value.slice(0, value.lastIndexOf(")"));
        }
        start && buffer.push(value);
      });
      return buffer.join("").trim();
    };
    const parseEventInfo = row => {
      const message = parseEventMessage(row.querySelector(".event-column>div.prose"));
      const category = row.querySelector(".category-column>a").textContent;
      const user = row.querySelector(".user-column>a.user");
      const time = row.querySelector(".user-column time");
      return { message, category, user, time };
    };
    const parseEssentialEvents = async (events = [], page = 1) => {
      const html = await (await fetch(`/posts/${Booru.postId}/events?limit=200&page=${page}`)).text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const table = doc.querySelectorAll("#post-events-table>tbody>tr");
      for (const row of table) {
        const info = parseEventInfo(row);
        if (info.category === "Delete" || info.category === "Ban" || info.category === "Unban") continue;
        events.push(info);
        if (info.category === "Flag") return events;
        if (info.category === "Appeal") {
          status = "Appealed";
          return events;
        }
        if (info.category !== "Disapproval") {
          console.warn(`parseEssentialEvents: ${info.category}`);
          events.splice(-1, 0);
          return events;
        }
      }
      if (table.children.length >= 200) return parseEssentialEvents(events, page + 1);
      else return events;
    };

    const allEvents = await parseEssentialEvents();
    const lastEvents = allEvents.pop();
    statusLine.append(`${status} Banned`);
    if (status === "Deleted") optionSection.querySelector("#post-option-appeal").style.display = "unset";

    lastEvents.time.textContent = Booru.timeAgoInWords(lastEvents.time.getAttribute("datetime")) + " ago";
    const learnMore = Utils.createElement("a", { classList: "wiki-link", href: "/wiki_pages/about:mod_queue", textContent: "learn more" });
    if (status === "Pending") {
      const div = Utils.createElement("div", { classList: classList + "pending" });
      div.append("This post is pending approval. (", learnMore, ")");
      return [bannedPostNotice, div];
    }
    if (status === "Deleted") {
      const div = Utils.createElement("div", { classList: classList + "deleted" });
      const p = Utils.createElement("p", { textContent: "This post was deleted for the following reason:" });
      const span = Utils.createElement("span", { classList: "post-flag-reason prose" });
      span.insertAdjacentHTML("beforeend", lastEvents.message);
      span.append(" (", lastEvents.time, ")");
      div.append(p, span);
      return [bannedPostNotice, div];
    }
    if (status === "Appealed" || status === "Flagged") {
      const div = Utils.createElement("div", { classList: classList + "pending" });
      const firstLine = `This post was ${status.toLowerCase()} and is pending approval (`;
      const ul = Utils.createElement("ul", { classList: "list-bulleted" });
      const li = Utils.createElement("li");
      const span = Utils.createElement("span", { classList: `post-${lastEvents.category.toLowerCase()}-reason prose` });
      span.insertAdjacentHTML("beforeend", lastEvents.message || "<em>no reason</em>");
      const bracketsContent = [" (", lastEvents.user, ", ", lastEvents.time, ")"];
      if (status === "Flagged") bracketsContent.splice(1, 2);
      span.append(...bracketsContent);
      li.append(span);
      ul.append(li);
      div.append(firstLine, learnMore, ")", ul);
      const messages = [];
      const count = [0, 0, 0];
      allEvents.forEach(e => {
        if (e.category !== "Disapproval") return;
        count[0]++;
        if (e.message === "disinterest");
        else if (e.message === "breaks rules") count[1]++;
        else if (e.message === "poor quality") count[2]++;
        else messages.push(e.message);
      });
      if (!count[0]) return [bannedPostNotice, div];
      const p = Utils.createElement("p");
      let tip = `It has been reviewed by ${count[0]} approver${Utils.isPlural(count[0])}.`;
      if (count[1]) tip += ` ${count[1]} believe it breaks the rules.`;
      if (count[2]) tip += ` ${count[2]} believe it has poor quality.`;
      const length = messages.length;
      if (length === 0);
      else if (length === 1) tip += ` Message: <span class="prose">"${messages[0]}".</span>`;
      else if (length === 2) tip += ` Message: <span class="prose">"${messages.join('" and "')}".</span>`;
      else tip += ' Message: <span class="prose">"' + messages.slice(0, -1).join('", "') + '" and "' + messages[messages.length - 1] + '".</span>';
      p.insertAdjacentHTML("beforeend", tip);
      div.append(p);
      return [bannedPostNotice, div];
    }
  },
  patchPostMenu() {
    const menu = Utils.createElement("menu", { classList: "mb-4", id: "post-sections" });
    menu.insertAdjacentHTML("beforeend", '<li class="active"><a href="#comments">Comments</a><li><a href="#edit" id="post-edit-link" data-shortcut="e">Edit</a>');
    return menu;
  },
  async patchPostRelationship(parentId, hasChildren, currentPostIsDeleted) {
    let tag = parentId ? `parent:${parentId}` : "";
    if (hasChildren) {
      tag = parentId ? `~${tag} ~parent:${Booru.postId}` : `parent:${Booru.postId}`;
    }
    if (!tag) return [];
    let hasParentPosts = [];
    let hasChildrenPosts = [];
    let page = 1;
    while (true) {
      const posts = await (await fetch(`/posts.json?tags=${tag}+order:id&limit=200&page=${page}`)).json();
      posts.forEach(post => {
        if (post.id === parentId) hasParentPosts.splice(0, 0, post);
        else if (post.parent_id === Number(Booru.postId)) hasChildrenPosts.push(post);
        else if (post.id === Number(Booru.postId)) {
          parentId && hasParentPosts.push(post);
          hasChildren && hasChildrenPosts.splice(0, 0, post);
        } else if (post.parent_id === parentId) hasParentPosts.push(post);
      });
      page++;
      if (posts.length < 200) break;
    }
    if (!BannedPostsHelper.showDeletedChildren) {
      if ((!hasParentPosts.length || hasParentPosts[0].is_deleted === false) && !currentPostIsDeleted) {
        hasParentPosts = hasParentPosts.filter(post => !post.is_deleted);
        hasChildrenPosts = hasChildrenPosts.filter(post => !post.is_deleted);
      }
    }
    const containers = [];
    if (hasParentPosts.length > 1) {
      const container = Utils.createElement("div", { classList: "notice notice-small post-notice post-notice-child" });
      const preview = Utils.createElement("div", { id: "has-parent-relationship-preview" });
      let notice = [Utils.createElement("a", { href: `/posts?tags=parent:${parentId}`, textContent: "parent" })];
      const siblinsCount = hasParentPosts.length - 2;
      siblinsCount &&
        notice.push(" and has ", Utils.createElement("a", { href: `/posts?tags=parent:${parentId}`, textContent: `${siblinsCount} sibling${Utils.isPlural(siblinsCount)}` }));
      container.append(
        "This post belongs to a ",
        ...notice,
        " (",
        Utils.createElement("a", { classList: "wiki-link", href: "/wiki_pages/help:post_relationships", textContent: "learn more" }),
        ") ",
        Utils.createElement("a", { id: "has-parent-relationship-preview-link", href: "#", textContent: "« hide" }),
        preview
      );
      const gallery = Utils.createElement("div", { classList: "post-gallery post-gallery-inline post-gallery-150" });
      const previewContainer = Utils.createElement("div", { classList: "posts-container gap-2" });
      preview.append(gallery);
      gallery.append(previewContainer);
      previewContainer.append(
        ...hasParentPosts.map(post => {
          const article = BannedPostsHelper.buildPreview(post, 150);
          // if (post.id === Number(Booru.postId)) article.classList.add("current-post");
          return article;
        })
      );
      containers.push(container);
    }
    if (hasChildrenPosts.length > 1) {
      const container = Utils.createElement("div", { classList: "notice notice-small post-notice post-notice-parent" });
      const preview = Utils.createElement("div", { id: "has-children-relationship-preview" });
      const count = hasChildrenPosts.length - 1;
      container.append(
        "This post has ",
        Utils.createElement("a", { href: `/posts?tags=parent:${Booru.postId}`, textContent: `${count} ${count === 1 ? "child" : "children"}` }),
        " (",
        Utils.createElement("a", { classList: "wiki-link", href: "/wiki_pages/help:post_relationships", textContent: "learn more" }),
        ") ",
        Utils.createElement("a", { id: "has-children-relationship-preview-link", href: "#", textContent: "« hide" }),
        preview
      );
      const gallery = Utils.createElement("div", { classList: "post-gallery post-gallery-inline post-gallery-150" });
      const previewContainer = Utils.createElement("div", { classList: "posts-container gap-2" });
      preview.append(gallery);
      gallery.append(previewContainer);
      previewContainer.append(
        ...hasChildrenPosts.map(post => {
          const article = BannedPostsHelper.buildPreview(post, 150);
          // if (post.id === Number(Booru.postId)) article.classList.add("current-post");
          return article;
        })
      );
      containers.push(container);
    }
    return containers;
  },
  async patchComment(count, commentContainer) {
    if (count) {
      const times = Math.ceil(count / 200);
      const requests = [];
      for (let i = 0; i < times; i++) {
        requests.push(
          fetch(`/comments?search[order]=id_asc&search[post_id]=${Booru.postId}&page=${i + 1}`).then(async resp => {
            const html = await resp.text();
            const doc = new DOMParser().parseFromString(html, "text/html");
            const comments = doc.querySelectorAll("#p-index-by-comment article.comment.message");
            comments.forEach(c => {
              c.classList.remove("flex-1");
              const a = c.querySelector(".comment-reply>a");
              if (a) a.dataset.remote = true;
            });
            return [...comments];
          })
        );
      }
      const comments = (await Promise.all(requests)).flat();
      commentContainer.append(...comments);
    } else commentContainer.append(Utils.createElement("p", { textContent: "There are no comments." }));
    return commentContainer;
  },
  patchEditForm({ source, tag_string_artist, tag_string_copyright, tag_string_character, tag_string_meta, tag_string_general, media_asset }) {
    return `<section id="edit" style="display:none"><div class="source-data card-outlined p-4 mt-4 mb-4"><a class="source-data-fetch" href="/source">Fetch source data</a> <svg class="icon svg-icon spinner-icon animate-spin source-data-loading" viewBox="0 0 512 512"><use fill="currentColor" href="${Booru.iconUri}#spinner"/></svg></div><form class="simple_form edit_post" id="form" autocomplete="off" novalidate action="/posts" accept-charset="UTF-8" method="post"><input type="hidden" name="upload_media_asset_id" value=""><input type="hidden" name="authenticity_token" value="${Danbooru.Utility.meta("csrf-token")}"><div class="input stacked-input hidden post_q"><input name="q" value="${Booru.searchParams.get("q") || ""}" class="hidden" type="hidden"></div><div class="input stacked-input radio_buttons required post_rating radio-button-group thin-x-scrollbar text-xs"><label class="radio_buttons required"><abbr title="required">*</abbr> Rating <a class="wiki-link inactive-link" target="_blank" href="/wiki_pages/howto:rate"><svg class="icon svg-icon help-icon" viewBox="0 0 512 512"><use fill="currentColor" href="${Booru.iconUri}#help"/></svg></a></label><input type="hidden" name="post[rating]"><span class="radio radio"><input class="radio_buttons required" required type="radio" value="e" name="post[rating]" id="post_rating_e"><label class="collection_radio_buttons" for="post_rating_e">Explicit</label></span><span class="radio radio"><input class="radio_buttons required" required type="radio" value="q" name="post[rating]" id="post_rating_q"><label class="collection_radio_buttons" for="post_rating_q">Questionable</label></span><span class="radio radio"><input class="radio_buttons required" required type="radio" value="s" name="post[rating]" id="post_rating_s"><label class="collection_radio_buttons" for="post_rating_s">Sensitive</label></span><span class="radio radio"><input class="radio_buttons required" required type="radio" value="g" checked name="post[rating]" id="post_rating_g"><label class="collection_radio_buttons" for="post_rating_g">General</label></span></div><div class="input stacked-input string optional post_parent_id"><label class="string optional" for="post_parent_id">Parent</label><input class="w-full max-w-360px string optional" name="post[parent_id]" id="post_parent_id"></div><div class="input stacked-input string optional post_source"><label class="string optional" for="post_source">Source</label><input class="w-full max-w-360px string optional" value="${source}" name="post[source]" id="post_source"></div><div class="input fixed-width-container"><div class="flex justify-between"><span class="inline-flex gap-1 items-center"><label for="post_tag_string">Tags</label> <a id="open-edit-dialog" data-shortcut="shift+e" href="javascript:void(0)"><svg class="icon svg-icon external-link-icon text-xxs" viewBox="0 0 512 512"><use fill="currentColor" href="${Booru.iconUri}#external-link"/></svg></a></span><span data-tag-counter data-for="#post_tag_string" class="text-muted text-sm"><span class="tag-count"></span></span></div><div class="input stacked-input text optional post_tag_string field_with_hint"><textarea class="text optional text-sm" data-autocomplete="tag-edit" data-shortcut="e" name="post[tag_string]" id="post_tag_string">${[tag_string_artist, tag_string_copyright, tag_string_character, tag_string_meta, tag_string_general].join("\n").trim()}</textarea><span class="hint fineprint"><span class="desktop-only">Ctrl+Enter to submit</span></span></div></div><div class="input"><input type="submit" name="commit" value="Submit" class="button-primary" data-disable-with="Submit"></div><div id="related-tags-container" class="related-tags fixed-width-container flex flex-col gap-2" data-media-asset-id="${media_asset.id}"><div class="card p-2 h-fit space-y-1 general-related-tags-column hidden" x-data='{"collapsed":true}'><div class="related-tags-header flex items-center justify-between gap-2 pr-2 cursor-pointer select-none" x-on:click="collapsed = !collapsed; !collapsed && Danbooru.RelatedTag.update_related_tags($event)"><h6 class="inline-flex gap-1 items-center"><svg class="icon svg-icon spinner-icon animate-spin text-muted invisible" viewBox="0 0 512 512" x-cloak="true" x-bind:class="{ invisible: !$store.relatedTags.loading }"><use fill="currentColor" href="${Booru.iconUri}#spinner"/></svg> Related: <a class="related-tags-current-tag" x-on:click.stop="Danbooru.RelatedTag.update_related_tags($event)" href="javascript:void(0)"></a></h6><svg class="icon svg-icon chevron-down-icon link-color rotate-180" viewBox="0 0 448 512" x-cloak="true" x-show="collapsed"><use fill="currentColor" href="${Booru.iconUri}#chevron-down"/></svg> <svg class="icon svg-icon chevron-down-icon link-color" viewBox="0 0 448 512" x-cloak="true" x-show="!collapsed"><use fill="currentColor" href="${Booru.iconUri}#chevron-down"/></svg></div></div><div x-data='{"collapsed":false}' class="tag-column card p-2 h-fit space-y-1 translated-tags-related-tags-column hidden"></div><div x-data='{"collapsed":false}' class="tag-column card p-2 h-fit space-y-1 ai-tags-related-tags-column hidden hidden"></div><div x-data='{"collapsed":false}' class="tag-column card p-2 h-fit space-y-1 frequent-related-tags-column hidden"></div><div x-data='{"collapsed":false}' class="tag-column card p-2 h-fit space-y-1 recent-related-tags-column hidden"></div></div></form></section>`;
  },
  /* Phase III */
  fixDialog() {
    $("#add-to-pool-dialog").dialog({ autoOpen: false });
    $("#pool").on("click.danbooru", e => {
      e.preventDefault();
      $("#add-to-pool-dialog").dialog("open");
    });
    $("#add-to-favgroup-dialog").dialog({
      autoOpen: false,
      width: 700,
      buttons: {
        Cancel: function () {
          $(this).dialog("close");
        }
      }
    });
    $("#open-favgroup-dialog-link").on("click.danbooru", e => {
      if ($(".add-to-favgroup").length === 1) {
        let favgroup = $(".add-to-favgroup").get(0);
        favgroup.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      } else $("#add-to-favgroup-dialog").dialog("open");
      e.preventDefault();
    });
  },
  fixTagEditor({ source, media_asset }) {
    let currentUpload;
    let uploadToBooruUrl = /^https?:\/\//.test(source) ? `/uploads/new?url=${encodeURIComponent(source)}` : "/uploads/new";
    $("#post-sections li a").on("click.danbooru", async e => {
      e.preventDefault();
      if (e.target.hash === "#comments") {
        $("#comments").show();
        $("#edit").hide();
        $("#recommended").hide();
      } else if (e.target.hash === "#edit") {
        if (!currentUpload) {
          Danbooru.Notice.info("Checking upload media asset...");
          const uploads = await $.get("/uploads.json", {
            only: "upload_media_assets[id,media_asset_id]",
            "search[upload_media_assets][post][id]": Booru.postId
          });
          if (!uploads?.[0]) {
            Danbooru.Notice.error(`Upload media asset not found. Please <a target="_blank" href="${uploadToBooruUrl}">upload</a> source asset first.`);
            return;
          } else {
            Danbooru.Notice.notice.close();
            currentUpload = uploads[0].upload_media_assets;
          }
        }
        const { id } = currentUpload.find(i => i.media_asset_id == media_asset.id);
        $("#edit input[name='upload_media_asset_id']").val(id);
        $("#edit").show();
        $("#comments").hide();
        $("#post_tag_string").focus().selectEnd();
        $("#recommended").hide();
      } else if (e.target.hash === "#recommended");
      else {
        $("#edit").hide();
        $("#comments").hide();
        $("#recommended").hide();
      }
      $("#post-sections li").removeClass("active");
      $(e.target).parent("li").addClass("active");
    });
    Danbooru.Utility.keydown("ctrl+return meta+return", "submit_form", Danbooru.Shortcuts.submit_form, "#post_tag_string");
  },
  async initialize() {
    await BannedPostsHelper.initializeThumbnail();
    const post = Utils.createElement("div", { id: "c-posts" });
    const show = Utils.createElement("div", { id: "a-show" });
    const main = Utils.createElement("div", { classList: "sidebar-container flex sm:flex-col gap-3" });
    const content = Utils.createElement("section", { id: "content", classList: "flex-1 min-w-0 sm:order-1" });
    const [
      postInfo,
      { commentCount, sidebar, statusLine, optionSection, ...elements },
      ,
      favButton,
      [blacklistBox, artistCommentary],
      { commentSection, commentListContainer },
      navbar
    ] = await Promise.all([
      this.fetchPost(),
      this.buildSidebar(),
      this.buildDialog(),
      this.buildFavButton(),
      this.buildBlackListAndCommentary(),
      this.buildComment(),
      this.buildNavbar()
    ]);
    this.patchBody(postInfo);
    this.patchSubnavMenu();
    this.patchSidebarBlacklist(blacklistBox, elements.tagList.parentElement);
    this.patchSidebarInfoSection(postInfo, elements);
    const [, , , postNotice, postRelationshipContainers] = await Promise.all([
      this.patchSidebarTagList(elements.tagList, postInfo.tag_string.split(" ")),
      this.patchSidebarApprover(postInfo.approver_id, elements.approverLine),
      this.patchComment(commentCount, commentListContainer),
      this.patchStatus(postInfo, statusLine, optionSection),
      this.patchPostRelationship(postInfo.parent_id, postInfo.has_children, postInfo.is_deleted)
    ]);
    post.append(show);
    show.append(main);
    main.append(sidebar, content);
    content.append(...postNotice, ...postRelationshipContainers, favButton);
    if (artistCommentary) content.append(artistCommentary);
    if (navbar) content.append(navbar);
    content.append(this.patchPostMenu(), commentSection);
    content.insertAdjacentHTML("beforeend", this.patchEditForm(postInfo));
    document.querySelector("#notice+p").replaceWith(post);
    this.fixDialog();
    {
      document.head.append(Utils.createElement("meta", { name: "post-id", content: Booru.postId }));
      Danbooru.Post.initialize_post_relationship_previews();
      Danbooru.FavoritesTooltipComponent.initialize();
      Danbooru.ArtistCommentary.initialize_all();
      Danbooru.CommentComponent.initialize();
      Danbooru.CommentVotesTooltipComponent.initialize();
      Danbooru.Links.initializeLinks("comment");
      this.fixTagEditor(postInfo);
      Danbooru.Post.initialize_edit_dialog();
      Danbooru.TagCounter.initialize();
      Danbooru.Shortcuts.initialize_data_shortcuts();
      Danbooru.Autocomplete.initializeAll();
    }
    BannedPostsHelper.notify(true);
  }
};

const HandlePostIndexPage = {
  /* prettier-ignore */
  SEARCH_METATAGS: ["age","ai","appealer","appeals","approver","arttags","chartags","child","comm","comment","commentary","commentaryupdater","commenter","comments","copytags","date","disapproved","downvote","downvotes","duration","exif","fav","favcount","favgroup","filesize","filetype","flagger","flags","gentags","has","height","id","is","limit","md5","metatags","mpixels","note","noter","notes","noteupdater","order","ordfav","ordfavgroup","ordpool","parent","pixiv","pool","rating","ratio","replacements","score","search","source","status","tagcount","upvote","upvotes","user","width"],
  postsPerPage: Danbooru.CurrentUser.data("per-page"),
  parseSearchParams() {
    this.tokenizedTags = Booru.tokenizer(Booru.searchParams.get("tags") || "", this.SEARCH_METATAGS, true);
    const limitInTags = Number(this.tokenizedTags.find(token => token.name === "limit")?.value || Infinity);
    const limitAsParam = Number(Booru.searchParams.get("limit") || Infinity);
    const minLimit = limitAsParam ?? limitInTags;
    if (minLimit !== Infinity) this.postsPerPage = minLimit || 1;
  },
  handleTakedownPage() {
    this.parseSearchParams();
    const tag = this.tokenizedTags.filter(t => t.type === "tag")[0].value;
    const p = document.querySelector("#notice+p");
    if (p) {
      Booru.searchParams.set("tags", Booru.searchParams.get("tags") + " -1");
      p.replaceWith(
        "This page has been removed because of ",
        Utils.createElement("a", { classList: "dtext-wiki-link tag-type-1", href: `/artists/show_or_new?name=${tag}`, textContent: tag.replace(/_/g, " ") }),
        "'s takedown request. ",
        Utils.createElement("a", { href: `/posts?${Booru.searchParams.toString()}`, textContent: "Show page." })
      );
    }
    BannedPostsHelper.notify(true);
  },
  async initialize() {
    await BannedPostsHelper.initializeThumbnail();
    this.parseSearchParams();
    const container = document.querySelector("#posts > div.post-gallery > div.posts-container");
    if (container) {
      if (!this.tokenizedTags.some(t => t.name === "order" && t.value === "random")) {
        if (this.tokenizedTags.some(t => t.negated && /^\d$/.test(t.value))) await this.fetchAllPosts(container);
        else {
          const postCount = container.children.length;
          if (postCount !== this.postsPerPage) {
            const a = Utils.createElement("a", {
              id: "check_banned_posts",
              href: "#",
              innerHTML: "<i>Banned</i>",
              dataset: { shortcut: "c" }
            });
            a.addEventListener("click", event => {
              event.preventDefault();
              a.innerHTML = "<i>Checking...</i>";
              this.fetchAllPosts(container)
                .then(() =>
                  $(a)
                    .html('<i style="color:var(--success-color)">Finished.</i>')
                    .fadeOut("slow", function () {
                      $(this).remove();
                    })
                )
                .catch(() => $(a).html('<i style="color:var(--error-color)">Failure</i>'))
                .finally(() => BannedPostsHelper.notify(true));
            });
            document.getElementById("show-posts-link").closest("li").append(a);
            Danbooru.Shortcuts.initialize_data_shortcuts();
            return;
          }
        }
      }
    }
    BannedPostsHelper.notify(true);
  },
  async fetchAllPosts(postContainer) {
    let showDeleted = Danbooru.CurrentUser.data("show-deleted-posts");
    showDeleted =
      this.tokenizedTags.some(t => t.name === "status" && !t.negated && /^deleted|any|all$/.test(t.value)) ||
      this.tokenizedTags.some(t => t.name === "status" && t.negated && t.value === "deleted");
    try {
      const response = await fetch("/posts.json?" + Booru.searchParams.toString());
      let posts = await response.json();
      let bannedPostsCount = posts.filter(post => post.is_banned === true).length;
      if (!showDeleted) posts = posts.filter(post_1 => !post_1.is_deleted);
      const query = Booru.searchParams.get("tags") || "";
      const insertCount = BannedPostsHelper.insertPreview(postContainer, posts, 1, query);
      let msg = "";
      if (bannedPostsCount === 0 && insertCount === 0) msg = "No banned posts found.";
      else if (insertCount === 0 && bannedPostsCount > insertCount) {
        msg = `${bannedPostsCount} banned post${Utils.isPlural(bannedPostsCount)} found.`;
      } else {
        msg = `Show ${insertCount} banned post${Utils.isPlural(insertCount)}.`;
        if (bannedPostsCount != insertCount) {
          msg += ` ${bannedPostsCount} posts found in total.`;
        }
      }
      Danbooru.Notice.info(msg);
      BannedPostsHelper.fixBlacklist(postContainer);
    } catch (e) {
      console.error("Error:", e);
    }
  }
};

const HandleArtistShowPage = {
  async initialize() {
    await BannedPostsHelper.initializeThumbnail();
    const isBannedArtist = document.getElementsByClassName("banned-artist-label").length;
    if (isBannedArtist) {
      document.querySelectorAll("#a-show>div:first-child>a.tag-type-1,#subnav-posts").forEach(a => {
        a.href = a.href + "+-2";
      });
      const a = document.querySelector("h2.recent-posts-header>a");
      if (a) {
        const sp = new URLSearchParams(a.search);
        a.href = a.href + "+-3";
        sp.set("limit", "8");
        let posts = await (await fetch(`/posts.json?${sp.toString()}`)).json();
        posts = posts.filter(p => !p.is_deleted);
        if (posts.length) {
          const container = document.querySelector(".recent-posts .posts-container");
          BannedPostsHelper.insertPreview(container, posts, 3);
          BannedPostsHelper.fixBlacklist(container);
        }
      }
    }
    BannedPostsHelper.notify(true);
  }
};

const HandleIqdbQueryPage = async () => {
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
  const hasParam = params.some(param => Booru.searchParams.has(param));
  if (!hasParam) return BannedPostsHelper.notify(true);
  const json = await (await fetch("/iqdb_queries.json?" + Booru.searchParams.toString())).json();
  const container = document.querySelector("div.similar-images-component div.posts-container");
  const insertCount = BannedPostsHelper.insertPreview(container, json, 2);
  if (insertCount) Danbooru.Notice.info(`${insertCount} banned post${Utils.isPlural(insertCount)} found.`);
  BannedPostsHelper.fixBlacklist(container);
  BannedPostsHelper.notify(true);
};

const EasierOneUp = {
  status: 0,
  tagsField: document.querySelector("#post_tag_string"),
  async initialize() {
    await BannedPostsHelper.initializeThumbnail();
    const relatedPosts = document.querySelector("#related-posts-by-source p.fineprint a");
    if (relatedPosts) {
      const shownCount = Number(relatedPosts.innerText.split(" ")[0]);
      let container = document.querySelector("#related-posts-by-source .posts-container");
      let articles = container.children;
      const addButton = articles =>
        [...articles].forEach(el => {
          const div = Utils.createElement("div");
          this.addButton(el, div);
          el.querySelector(".post-preview-container").nextElementSibling.appendChild(div);
        });
      if ((articles.length === 5 && shownCount > 5) || articles.length === shownCount) addButton(articles);
      else {
        const url = new URL(relatedPosts.href);
        url.pathname = "/posts.json";
        url.searchParams.append("limit", 5);
        const json = await (await fetch(url)).json();
        BannedPostsHelper.insertPreview(container, json, 2);
        addButton(articles);
      }
      this.status++;
      BannedPostsHelper.notify(this.status === 2);
      BannedPostsHelper.fixBlacklist(container);
    }

    const similar = document.getElementById("iqdb-similar");
    this.observer = new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(this.process.bind(this))));
    this.observer.observe(similar, {
      subtree: true,
      childList: true
    });
  },
  async process(node) {
    if (node.className !== "iqdb-posts" && node.className !== "similar-images-component") return;
    let container = node.querySelector("#iqdb-similar .posts-container");
    if (container) {
      let articles = container.children;
      let shownCount = articles.length;
      let iqdbNoPostFound = shownCount === 0 && document.querySelector(".post-gallery-grid > p:only-child");
      if (!iqdbNoPostFound && shownCount !== 5) {
        let iqdbResults = await this.iqdbReq();
        if (iqdbResults.length !== shownCount) BannedPostsHelper.insertPreview(container, iqdbResults, 2);
      }
      for (const post of articles) {
        const div = post.querySelector(".iqdb-similarity-score").parentElement;
        this.addButton(post, div);
      }
      this.status++;
      BannedPostsHelper.notify(this.status === 2);
      BannedPostsHelper.fixBlacklist(container);
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
    const setParent = Utils.createElement("a", {
      classList: "inactive-link",
      href: "#",
      textContent: "parent"
    });
    setParent.addEventListener("click", e => {
      e.preventDefault();
      this.copyTags(post, true);
    });
    const setChild = Utils.createElement("a", {
      classList: "inactive-link",
      href: "#",
      textContent: "child"
    });
    setChild.addEventListener("click", e => {
      e.preventDefault();
      this.copyTags(post, false);
    });
    const setChildId = Utils.createElement("a", {
      classList: "inactive-link",
      href: "#",
      textContent: "«id"
    });
    setChildId.addEventListener("click", e => {
      e.preventDefault();
      this.tagsField.value = `${this.tagsField.value.trim()} child:${post.dataset.id} `;
      this.tagsField.dispatchEvent(new InputEvent("input", { bubbles: true }));
      document.querySelector(".tags-tab").click();
      Danbooru.Notice.info("Child post ID copied.");
    });
    div.children.length && div.append(" | ");
    div.append(setParent, " | ", setChild, " ", setChildId);
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

Booru.initialize();
