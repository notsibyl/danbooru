// ==UserScript==
// @name          Format Tags
// @author        Sibyl
// @version       0.4
// @icon          https://cdn.jsdelivr.net/gh/notsibyl/danbooru@main/danbooru.svg
// @namespace     https://dandonmai.us/forum_posts?search[creator_id]=817128&search[topic_id]=8502
// @homepageURL   https://github.com/notsibyl/danbooru
// @downloadURL   https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/format-tags.user.js
// @updateURL     https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/format-tags.user.js
// @match         *://*.donmai.us/*
// @exclude-match *://cdn.donmai.us/*
// @run-at        document-end
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

const formatTags = (() => {
  // prettier-ignore
  const RECLASS_METATAGS = {
    gen: 0, general: 0,
    art: 1, artist: 1,
    co: 3, copy: 3, copyright: 3,
    ch: 4, char: 4, character: 4,
    meta: 5
  };
  // prettier-ignore
  const METATAGS = [
    "parent", "-parent",
    "child", "-child",
    "rating",
    "source",
    "newpool", "pool", "-pool", "favgroup", "-favgroup",
    "fav", "-fav", 
    "upvote", "downvote",
    "disapproved",
    "status", "-status",
    ...Object.keys(RECLASS_METATAGS),
  ];
  const RATING = ["g", "s", "q", "e"];
  const TAG_CACHE = {};
  // https://github.com/hdk5/danbooru.user.js/blob/d7c9925cf54ecafa208b0e79be10e071acb6c319/dist/input-tag-highlight.user.js#L159-L209
  const tokenize = input => {
    const tokens = [];
    let i = 0;
    while (i < input.length) {
      const char = input[i];
      if (/\s/.test(char)) {
        tokens.push({ type: "whitespace", value: char });
        i++;
        continue;
      }
      const metaName = METATAGS.find(name => input.startsWith(`${name.toLowerCase()}:`, i));
      if (metaName !== undefined) {
        i += metaName.length + 1;
        let value = "";
        if (input[i] === '"' || input[i] === "'") {
          value += input[i++];
          while (i < input.length) {
            value += input[i++];
            if (input[i - 1] === value[0] && input[i - 2] !== "\\") {
              break;
            }
          }
        } else {
          while (i < input.length && !/\s/.test(input[i])) {
            value += input[i++];
          }
        }
        if (!["source", "pool", "favgroup"].some(meta => metaName.endsWith(meta))) value = value.toLowerCase();
        tokens.push({ type: "metatag", name: metaName, value });
        continue;
      }
      let tag = "";
      while (i < input.length && !/\s/.test(input[i])) {
        tag += input[i++];
      }
      if (tag) tokens.push({ type: "tag", value: tag.toLowerCase() });
    }
    return tokens;
  };
  const removeMinus = tag => (tag.startsWith("-") ? tag.slice(1) : tag);
  const fillTagCache = async tokens => {
    const missingTags = new Set();
    for (const token of tokens) {
      if (token.type === "tag") {
        const normalized = removeMinus(token.value);
        if (!(normalized in TAG_CACHE)) missingTags.add(normalized);
      }
    }
    if (missingTags.size === 0) return 0;

    const chunkSize = 1000;
    const tagsArray = [...missingTags];
    for (let i = 0; i < tagsArray.length; i += chunkSize) {
      const chunk = tagsArray.slice(i, i + chunkSize);
      const resp = await $.post("/tags.json", {
        _method: "get",
        limit: chunkSize,
        only: "name,post_count,category,is_deprecated,antecedent_alias[status,consequent_name]",
        search: { name_array: chunk }
      });
      const tagData = Object.fromEntries(resp.map(tag => [tag.name, tag]));
      for (const tagName of chunk) {
        const tag = tagData[tagName] ?? {
          name: tagName,
          post_count: 0,
          category: 0,
          is_deprecated: false
        };
        TAG_CACHE[tagName] = tag;
      }
    }
    return missingTags.size;
  };
  const sortAndClassifyTags = async textarea => {
    const text = textarea.value;
    const tokens = tokenize(text);
    await fillTagCache(tokens);

    const classified = {
      metaTags: [],
      tagsByCategory: {}, // category -> tags[]
      deprecated: [],
      unknown: []
    };
    const tagMap = new Map(); // key: NormalizedTag, value: tag: ActualTagString

    let hasRated = document.getElementById("quick-edit-div") || RATING.some(r => document.getElementById(`post_rating_${r}`)?.checked === true);

    for (const token of tokens) {
      if (token.type === "metatag") {
        let name = token.name;
        let value = token.value;
        if (name === "rating") {
          if (RATING.some(r => value.startsWith(r))) {
            hasRated = true;
            value = value.slice(0, 1);
          } else continue;
        }
        classified.metaTags.push(`${name}:${value}`);
      } else if (token.type === "tag") {
        const normalized = removeMinus(token.value);
        const hasMinus = token.value.startsWith("-");
        if (tagMap.has(normalized)) {
          const hasMinusBefore = tagMap.get(normalized).startsWith("-");
          if (hasMinus && !hasMinusBefore) tagMap.set(normalized, token.value);
        } else tagMap.set(normalized, token.value);
      }
    }

    const hasTag = tag => tagMap.get(tag) === tag,
      ignoredCategory = {
        0: false,
        1: ["artist_request", "tagme_(artist)", "official_art"].some(hasTag),
        3: ["copyright_request", "series_request"].some(hasTag),
        4: ["copyright_request", "series_request", "character_request", "tagme_(character)", "original"].some(hasTag),
        5: true
      };

    let noticeMsg = hasRated ? "" : "🔞 Rating not selected.<br>";
    let emptyTags = {};

    for (const [normalized, tag] of tagMap.entries()) {
      const tagInfo = TAG_CACHE[normalized];
      if (tagInfo.is_deprecated) classified.deprecated.push(tag);
      else if (!tagInfo || (tagInfo.post_count === 0 && tagInfo.antecedent_alias?.status !== "active")) {
        if (tagInfo?.category) {
          ignoredCategory[tagInfo.category] = true;
          emptyTags[normalized] = `<i><a class="tag-type-${tagInfo.category}" href="/posts?tags=${normalized}" target="_blank">${normalized}</a></i>`;
        }
        classified.unknown.push(tag);
      } else {
        const cat = tagInfo.category;
        if (!classified.tagsByCategory[cat]) {
          classified.tagsByCategory[cat] = [];
        }
        if (tagInfo.post_count === 0) {
          classified.tagsByCategory[cat].push(`${tag.startsWith("-") ? "-" : ""}${tagInfo.antecedent_alias.consequent_name}`);
        } else classified.tagsByCategory[cat].push(tag);
      }
    }

    const sortTags = (a, b) => {
      const aHasMinus = a.startsWith("-");
      const bHasMinus = b.startsWith("-");
      if (aHasMinus !== bHasMinus) return aHasMinus ? 1 : -1;
      const pa = removeMinus(a),
        pb = removeMinus(b);
      if (pa > pb) return 1;
      if (pa < pb) return -1;
      return 0;
    };

    classified.metaTags = [...new Set(classified.metaTags)];
    classified.metaTags.sort(sortTags);

    Object.keys(classified.tagsByCategory).forEach(category => {
      classified.tagsByCategory[category].sort(sortTags);
    });
    classified.unknown.sort(sortTags);
    classified.deprecated.sort(sortTags);

    console.log(classified);
    const categoryOrder = [1, 3, 4, 5, 0];

    let newText = "";

    for (const cat of categoryOrder) {
      let canBeIgnored = ignoredCategory[cat];
      const tags = classified.tagsByCategory[cat] || [];
      const noMinusTags = tags.filter(tag => !tag.startsWith("-"));
      if (tags.length) {
        newText += classified.tagsByCategory[cat].join(" ") + "\n";
        if (noMinusTags.length === 0) canBeIgnored = ignoredCategory[cat] || false;
        else continue;
      }
      const name = cat === 0 ? "general" : cat === 1 ? "artist" : cat === 3 ? "copyright" : "character";
      const hasCheckTag = hasTag("check_" + name);
      if (!canBeIgnored || (canBeIgnored && hasCheckTag)) {
        const checkTag = "check_" + name;
        if (hasTag(checkTag)) {
          noticeMsg += `⚠️ <i><a class="tag-type-5" href="/posts?tags=${checkTag}" target="_blank">${checkTag}</a></i> found but missing <i style="color: var(--${name}-tag-color)">${name}</i> tag.<br>`;
        } else noticeMsg += `⚠️ Missing <i style="color: var(--${name}-tag-color)">${name}</i> tag.<br>`;
      }
    }

    if (classified.metaTags.length) {
      newText += classified.metaTags.join(" ") + "\n";
    }
    if (classified.deprecated.length) {
      newText += classified.deprecated.join(" ") + "\n";
      const tags = classified.deprecated.map(tag => {
        const normalized = removeMinus(tag),
          cat = TAG_CACHE[normalized].category;
        return `<i><a class="tag-type-${cat}" href="/posts?tags=${normalized}" target="_blank">${normalized}</a></i>`;
      });
      noticeMsg += "⛔ Deprecated tag(s): " + tags.join(", ") + ".<br>";
    }
    if (classified.unknown.length) {
      newText += classified.unknown.join(" ") + "\n";
      const tags = classified.unknown.map(tag => {
        return emptyTags[removeMinus(tag)] || `<i>${removeMinus(tag)}</i>`;
      });
      noticeMsg += "💢 Empty/unknown tag(s): " + tags.join(", ") + ".<br>";
    }
    textarea.value = newText.trim() + " ";
    noticeMsg && Danbooru.Notice.notice.show(noticeMsg.slice(0, -4), false);

    return classified;
  };
  const init = () => {
    let anchor = document.querySelector("label[for=post_tag_string]");
    let a = createElement("a", { classList: "text-sm", textContent: "Sort & validate", href: "#", style: "font-style:italic;margin-right:auto;margin-left:.5em;" });
    let flexDiv = anchor.closest("div.flex");
    if (flexDiv.isEqualNode(anchor.parentNode));
    else if (flexDiv.isEqualNode(anchor.parentNode.parentNode)) anchor = anchor.parentNode;
    else {
      flexDiv = createElement("div", { classList: "flex justify-between" });
      anchor.parentNode.replaceChild(flexDiv, anchor);
      flexDiv.append(anchor);
    }
    flexDiv.style.alignItems = "baseline";
    anchor.after(a);
    a.addEventListener("click", async e => {
      e.preventDefault();
      const tagBox = document.getElementById("post_tag_string");
      if (tagBox.readOnly) return;
      Danbooru.Notice.notice.close();
      tagBox.readOnly = true;
      tagBox.style.opacity = "0.6";
      a.style.color = "var(--text-mute)";
      a.textContent = "Checking...";
      try {
        await sortAndClassifyTags(tagBox);
      } catch {
      } finally {
        tagBox.readOnly = false;
        tagBox.style.opacity = "";
        a.style.color = "";
        a.textContent = "Sort & validate";
        tagBox.dispatchEvent(new InputEvent("input", { bubbles: true }));
      }
    });
  };
  return {
    RECLASS_METATAGS,
    METATAGS,
    TAG_CACHE,
    tokenize,
    sortAndClassifyTags,
    init
  };
})();

if (((controller === "upload-media-assets" || controller === "uploads") && action === "show") || (controller === "posts" && (action === "index" || action === "show")))
  formatTags.init();
