// ==UserScript==
// @name          Format Tags
// @author        Sibyl
// @version       0.6
// @icon          https://cdn.jsdelivr.net/gh/notsibyl/danbooru@main/danbooru.svg
// @namespace     https://dandonmai.us/forum_posts?search[creator_id]=817128&search[topic_id]=8502
// @homepageURL   https://github.com/notsibyl/danbooru
// @downloadURL   https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/format-tags.user.js
// @updateURL     https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/format-tags.user.js
// @match         *://*.donmai.us/*
// @exclude-match *://cdn.donmai.us/*
// @grant         none
// @run-at        document-end
// ==/UserScript==

const Utils = {
  createElement(tag, props = {}) {
    const el = document.createElement(tag);
    const { style, dataset, ..._props } = props;
    Object.assign(el, _props);
    Object.assign(el.dataset, dataset);
    if (typeof style === "string") el.style.cssText = style;
    else Object.assign(el.style, style);
    return el;
  },
  isPlural: count => (count === 1 ? "" : "s")
};

const Booru = {
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

const FormatTags = (() => {
  /* prettier-ignore */
  const EDIT_METATAGS = ["art","artist","ch","char","character","child","co","copy","copyright","disapproved","downvote","fav","favgroup","gen","general","meta","newpool","parent","pool","rating","source","status","upvote"];
  const NEGATABLE_METATAGS = ["child", "favgroup", "parent", "pool", "status"];
  /* prettier-ignore */
  const RECLASS_METATAGS = {
    gen: 0, general: 0,
    art: 1, artist: 1,
    co: 3, copy: 3, copyright: 3,
    ch: 4, char: 4, character: 4,
    meta: 5
  };
  const SHORT_NAME_MAPPING = {
    gen: "general",
    art: "artist",
    copy: "copyright",
    char: "character",
    meta: "meta"
  };
  const RATING = ["g", "s", "q", "e"];
  const TAG_CACHE = {};
  const validator = tagName => {
    return ![
      t => t.length > 170,
      t => t === "",
      t => /^_+/.test(t),
      t => /\*|,/.test(t),
      t => /^[-~_`%(){}\[\]\/]/.test(t),
      t => /_$/.test(t),
      t => /__/.test(t),
      t => /[^\x20-\x7E]/.test(t),
      t => ["new", "search", "and", "or", "not"].indexOf(t) > -1
    ].some(test => test(tagName));
  };
  const removeMinus = tag => (tag.startsWith("-") ? tag.slice(1) : tag);
  const fillTagCache = async tokens => {
    const missingTags = new Set();
    for (const token of tokens) {
      if (token.type === "tag") {
        const tagName = token.value;
        if (!(tagName in TAG_CACHE)) missingTags.add(tagName);
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
      const currentTagData = {};
      for (const tag of resp) currentTagData[tag.name] = tag;
      for (const tagName of chunk) {
        const tag = currentTagData[tagName] ?? {
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
    const tokens = Booru.tokenizer(text, EDIT_METATAGS, true);

    const classified = {
      metaTags: [],
      tagsByCategory: {}, // category -> tags[]
      deprecated: [],
      unknown: [],
      invalid: []
    };
    const tagMap = new Map();
    const tokensToQuery = [];

    let hasRated = Boolean(document.getElementById("quick-edit-div")) || RATING.some(r => document.getElementById(`post_rating_${r}`)?.checked === true);

    for (const token of tokens) {
      if (token.type === "metatag") {
        let n = token.negated ? "-" : token.or ? "~" : "";
        let name = token.name;
        let value = token.value;
        let full = `${n}${name}:${value}`;
        if (name in RECLASS_METATAGS) {
          name = SHORT_NAME_MAPPING[name] || name;
          if (!validator(token.quoted || value)) {
            classified.invalid.push(full);
            continue;
          }
        } else if (name === "rating") {
          if (RATING.some(r => value.startsWith(r))) {
            hasRated = true;
            full = `${n}${name}:${value.slice(0, 1)}`;
          } else continue;
        }
        if ((token.negated && !NEGATABLE_METATAGS.some(n => n === name)) || token.or) {
          classified.invalid.push(full);
          continue;
        }
        classified.metaTags.push(full);
      } else if (token.type === "tag") {
        const n = token.negated ? "-" : "";
        const value = token.value;
        const full = `${n}${value}`;
        if (token.or) classified.invalid.push(`~${value}`);
        else if (!validator(value)) classified.invalid.push(full);
        else {
          tokensToQuery.push(token);
          if (tagMap.has(value)) {
            const negated = tagMap.get(value).startsWith("-") === "-";
            if (n && !negated) tagMap.set(value, full);
          } else tagMap.set(value, full);
        }
      }
    }

    await fillTagCache(tokensToQuery);

    let noticeMsg = hasRated ? "" : "🔞 Rating not selected.<br>";

    const hasTag = tag => tagMap.get(tag) === tag;

    const charCounterTags = [
      ["1girl", "2girls", "3girls", "4girls", "5girls", "6+girls"].filter(hasTag),
      ["1boy", "2boys", "3boys", "4boys", "5boys", "6+boys"].filter(hasTag),
      ["1other", "2others", "3others", "4others", "5others", "6+others"].filter(hasTag)
    ];
    const mutuallyExclusiveTags = [];
    charCounterTags.forEach(arr => {
      const tag = arr?.[0];
      if (tag) {
        let hasWrongMultiTag = false;
        if (tag.startsWith("1")) {
          const multiTag = `multiple_${arr[0].slice(1)}s`;
          if (hasTag(multiTag)) {
            hasWrongMultiTag = true;
            mutuallyExclusiveTags.push(multiTag);
          }
        }
        if (arr.length > 1 || hasWrongMultiTag) mutuallyExclusiveTags.push(...arr);
      }
    });
    const allCounterTags = charCounterTags.flat();
    const tagsLength = allCounterTags.length;
    if (tagsLength) {
      const noHumans = hasTag("no_humans");
      if (noHumans) {
        if (mutuallyExclusiveTags.length) mutuallyExclusiveTags.push("no_humans");
        else mutuallyExclusiveTags.push(allCounterTags[0], "no_humans");
      }
    } else {
      const specialTags = ["no_humans", "character_counter_request", "gender_request", "check_gender"].filter(hasTag);
      if (!specialTags.length) noticeMsg += `👽 Missing character counter tag.<br>`;
    }
    if (mutuallyExclusiveTags.length > 1)
      noticeMsg += `😵 Messy counter tag${Utils.isPlural(mutuallyExclusiveTags.length)}: ${mutuallyExclusiveTags.map(tag => `<i><a class="tag-type-0" href="/posts?tags=${tag}" target="_blank">${tag}</a></i>`).join(", ")}<br>`;

    const ignoredCategory = {
      0: false,
      1: ["artist_request", "tagme_(artist)", "official_art", "official_wallpaper", "novel_illustration", "promotional_art"].some(hasTag),
      3: ["copyright_request", "series_request"].some(hasTag),
      4: ["copyright_request", "series_request", "character_request", "tagme_(character)", "original"].some(hasTag),
      5: true
    };
    let emptyTags = {};

    for (const [name, tag] of tagMap.entries()) {
      const tagInfo = TAG_CACHE[name];
      if (tagInfo.is_deprecated) classified.deprecated.push(tag);
      else if (!tagInfo || (tagInfo.post_count === 0 && tagInfo.antecedent_implications?.status !== "active")) {
        if (tagInfo?.category) {
          ignoredCategory[tagInfo.category] = true;
          emptyTags[name] = `<i><a class="tag-type-${tagInfo.category}" href="/posts?tags=${name}" target="_blank">${name}</a></i>`;
        }
        classified.unknown.push(tag);
      } else {
        const cat = tagInfo.category;
        if (!classified.tagsByCategory[cat]) {
          classified.tagsByCategory[cat] = [];
        }
        if (tagInfo.post_count === 0) {
          classified.tagsByCategory[cat].push(`${tagInfo.negated ? "-" : ""}${tagInfo.antecedent_implications.consequent_name}`);
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
    classified.invalid = [...new Set(classified.invalid)];
    classified.invalid.sort(sortTags);

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
      const includedTags = tags.filter(tag => !tag.startsWith("-"));
      if (tags.length) {
        newText += classified.tagsByCategory[cat].join(" ") + "\n";
        if (includedTags.length === 0) canBeIgnored = ignoredCategory[cat] || false;
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
      noticeMsg += `⛔ Deprecated tag${Utils.isPlural(tags.length)}: ${tags.join(", ")}.<br>`;
    }
    if (classified.unknown.length) {
      newText += classified.unknown.join(" ") + "\n";
      const tags = classified.unknown.map(tag => {
        return emptyTags[removeMinus(tag)] || `<i>${removeMinus(tag)}</i>`;
      });
      noticeMsg += `💢 Empty/unknown tag${Utils.isPlural(tags.length)}: ${tags.join(", ")}.<br>`;
    }

    if (classified.invalid.length) {
      newText += classified.invalid.join(" ") + "\n";
      const tags = classified.invalid.map(tag => {
        return `<i>${tag}</i>`;
      });
      noticeMsg += `☠️ Invalid tag${Utils.isPlural(tags.length)}/syntax error${Utils.isPlural(tags.length)}: ${tags.join(", ")}.<br>`;
    }
    textarea.value = newText.trim() + " ";
    noticeMsg && Danbooru.Notice.notice.show(noticeMsg.slice(0, -4), false);

    return classified;
  };
  const initialize = () => {
    let anchor = document.querySelector("label[for=post_tag_string]");
    let a = Utils.createElement("a", { classList: "text-sm", textContent: "Sort & validate", href: "#", style: "font-style:italic;margin-right:auto;margin-left:.5em;" });
    let flexDiv = anchor.closest("div.flex");
    if (flexDiv.isEqualNode(anchor.parentNode));
    else if (flexDiv.isEqualNode(anchor.parentNode.parentNode)) anchor = anchor.parentNode;
    else {
      flexDiv = Utils.createElement("div", { classList: "flex justify-between" });
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
    TAG_CACHE,
    validator,
    sortAndClassifyTags,
    initialize
  };
})();

const dataset = document.body.dataset;

if (((dataset.controller === "upload-media-assets" || dataset.controller === "uploads") && dataset.action === "show") || (dataset.controller === "posts" && dataset.action === "index"))
  FormatTags.initialize();
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
  })(() => dataset.action === "show" && dataset.controller === "posts" && FormatTags.initialize());
