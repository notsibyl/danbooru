// ==UserScript==
// @name        More Search Options
// @author      Sibyl
// @version     0.1
// @icon        https://cdn.jsdelivr.net/gh/notsibyl/danbooru@main/danbooru.svg
// @namespace   https://danbooru.donmai.us/forum_posts?search[creator_id]=817128&search[topic_id]=8502
// @homepageURL https://github.com/notsibyl/danbooru
// @downloadURL https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/more-search-options.user.js
// @updateURL   https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/more-search-options.user.js
// @match       *://*.donmai.us/*
// @grant       none
// @run-at      document-end
// ==/UserScript==

const SEARCH_OPTION_CONFIG = {
  "wiki-pages": [
    { labelText: "Title regex", insertAfter: "search_title_normalize", searchName: "search[title_regex]" },
    { labelText: "Content regex", insertAfter: "search_title_or_body_matches", searchName: "search[body_regex]" }
  ],
  comments: [{ labelText: "Body regex", insertAfter: "search_body_matches", searchName: "search[body_regex]" }],
  "forum-posts": [
    { labelText: "Topic ID", type: "number", searchName: "search[topic_id]" },
    { labelText: "Title regex", insertAfter: "search_topic_title_matches", searchName: "search[topic][title_regex]" },
    { labelText: "Body regex", insertAfter: "search_body_matches", searchName: "search[body_regex]" }
  ],
  "artist-commentaries": [
    { labelText: "Translated body regex", insertAfter: "search_text_matches", searchName: "search[translated_description_regex]" },
    { labelText: "Translated title regex", insertAfter: "search_text_matches", searchName: "search[translated_title_regex]" },
    { labelText: "Body regex", insertAfter: "search_text_matches", searchName: "search[original_description_regex]" },
    { labelText: "Title regex", insertAfter: "search_text_matches", searchName: "search[original_title_regex]" }
  ],
  notes: [{ labelText: "Note regex", insertAfter: "search_body_matches", searchName: "search[body_regex]" }],
  "user-feedbacks": [{ labelText: "Message regex", insertAfter: "search_body_matches", searchName: "search[body_regex]" }],
  bans: [{ labelText: "Reason regex", insertAfter: "search_reason_matches", searchName: "search[reason_regex]" }],
  pools: [
    { labelText: "Name regex", insertAfter: "search_name_contains", searchName: "search[name_regex]" },
    { labelText: "Description regex", insertAfter: "search_description_matches", searchName: "search[description_regex]" }
  ],
  tags: [{ labelText: "Name regex", insertAfter: "search_name_or_alias_matches", searchName: "search[name_regex]" }],
  "post-appeals": [{ labelText: "Reason regex", insertAfter: "search_reason_matches", searchName: "search[reason_regex]" }],
  "post-flags": [{ labelText: "Reason regex", insertAfter: "search_reason_matches", searchName: "search[reason_regex]" }],
  "post-disapprovals": [{ labelText: "Message regex", insertAfter: "search_message_matches", searchName: "search[message_regex]" }],
  users: [{ labelText: "Name regex", insertAfter: "search_name_matches", searchName: "search[name_regex]" }],
  "favorite-groups": [{ labelText: "Name regex", insertAfter: "search_name_contains", searchName: "search[name_regex]" }],
  dmails: [
    { labelText: "Title regex", insertAfter: "search_title_matches", searchName: "search[title_regex]" },
    { labelText: "Content regex", insertAfter: "search_message_matches", searchName: "search[body_regex]" }
  ],
  uploads: [{ labelText: "Source regex", insertAfter: "search_source_ilike", searchName: "search[source_regex]" }],
  artists: [{ labelText: "Name regex", insertAfter: "search_any_name_matches", searchName: "search[name_regex]" }],
  "artist-urls": [
    { labelText: "Name regex", insertAfter: "search_artist_name", searchName: "search[artist][name_regex]" },
    { labelText: "URL regex", insertAfter: "search_url_matches", searchName: "search[url_regex]" }
  ]
};

// https://www.postgresql.org/docs/current/functions-matching.html#POSIX-CLASS-SHORTHAND-ESCAPES-TABLE
// Simple conversion from JavaScript regex to Postgres ERE
const jsRegex2PostgresERE = pattern => {
  try {
    new RegExp(pattern);
  } catch {
    return { error: "Invalid JavaScript regular expression" };
  }
  const nonGreedyRE = /(\*|\+|\?|\{\d+(?:,\d*)?\})\?/;
  if (nonGreedyRE.test(pattern)) return { error: "Non-greedy quantifiers are not supported" };

  let result = "";
  let inCharClass = false;
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === "[" && pattern[i - 1] !== "\\") {
      inCharClass = true;
      result += ch;
      continue;
    }
    if (ch === "]" && pattern[i - 1] !== "\\") {
      inCharClass = false;
      result += ch;
      continue;
    }
    if (ch === "\\" && i + 1 < pattern.length) {
      const next = pattern[i + 1];
      const map = {
        d: inCharClass ? "[:digit:]" : "[[:digit:]]",
        s: inCharClass ? "[:space:]" : "[[:space:]]",
        w: inCharClass ? "[:word:]" : "[[:word:]]",
        D: inCharClass ? "^[:digit:]" : "[^[:digit:]]",
        S: inCharClass ? "^[:space:]" : "[^[:space:]]",
        W: inCharClass ? "^[:word:]" : "[^[:word:]]"
      };
      if (map[next]) {
        result += map[next];
        i++;
        continue;
      }
    }
    result += ch;
  }

  return { result };
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

const controller = document.body.dataset.controller,
  action = document.body.dataset.action;

function addSearchOptions() {
  const searchForm = document.querySelector("form.simple_form.search-form.inline-form");
  if (!(controller in SEARCH_OPTION_CONFIG && searchForm)) return;
  for (let config of SEARCH_OPTION_CONFIG[controller]) {
    const id = config.searchName.slice(0, -1).replace(/[\[\]]+/g, "_");
    const div = createElement("div", { classList: "input stacked-input string optional " + id });
    const label = createElement("label", { innerText: config.labelText, classList: "string optional", for: id });
    const input = createElement("input", {
      type: config.type || "text",
      classList: "string optional",
      id,
      name: config.searchName,
      value: new URLSearchParams(window.location.search).get(config.searchName)
    });
    div.append(label, input);
    const referenceElement = searchForm.querySelector("div." + config.insertAfter);
    if (referenceElement) referenceElement.after(div);
    else searchForm.prepend(div);
  }
  searchForm.addEventListener("submit", e => {
    e.preventDefault();
    const fd = new FormData(searchForm);
    fd.delete("commit");
    for (let config of SEARCH_OPTION_CONFIG[controller]) {
      const name = config.searchName;
      const value = fd.get(name);
      if (!value) fd.delete(name);
      else if (name.indexOf("regex") > -1) {
        searchForm[name].nextElementSibling?.remove();
        const { error, result } = jsRegex2PostgresERE(value);
        if (error) {
          searchForm[name].parentElement.classList.add("field_with_errors");
          searchForm[name].after(createElement("span", { classList: "error", textContent: error }));
          setTimeout(() => {
            searchForm["commit"].disabled = false;
          }, 50);
          return;
        } else fd.set(name, result);
      }
    }
    const params = new URLSearchParams(fd).toString();
    window.location.href = `${searchForm.action}?${params}`;
  });
}

if (action === "index" || action === "search" || action === "gallery") addSearchOptions();
