// ==UserScript==
// @name          Strikethrough for banned artists
// @author        Sibyl
// @version       1.2
// @namespace     https://danbooru.donmai.us/forum_posts?search[creator_id]=817128&search[topic_id]=8502
// @homepageURL   https://github.com/notsibyl/danbooru
// @downloadURL   https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/strikethrough-banned-artists.user.js
// @updateURL     https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/strikethrough-banned-artists.user.js
// @description   Add strikethrough for banned artists.
// @match         *://*.donmai.us/*
// @exclude-match *://cdn.donmai.us/*
// @grant         GM_registerMenuCommand
// @grant         GM_unregisterMenuCommand
// ==/UserScript==

// Set your preferences here
const preference = {
  updateInterval: 7 * 24 * 60 * 60 * 1000, // 7 days, in milliseconds
  sidebarQuestionMark: true,
  dtextTag: true, // [[artist_name]]
  dtextId: true // artist #1234
};
// Set your preferences ↑↑↑

const config = JSON.parse(localStorage.getItem("s4ba_config")) || {
  lastUpdate: 0,
  autoUpdate: true
};

const saveConfig = () => localStorage.setItem("s4ba_config", JSON.stringify(config));

GM_registerMenuCommand("🗑️ Remove local CSS", () => {
  localStorage.removeItem("s4ba_css");
  applyLocalCss();
  Danbooru.Utility.notice("Local CSS removed.");
});

GM_registerMenuCommand("✍️ Manually fetch artists info", updateCustomCss);

const nextUpdateStr = () => {
  if (!config.autoUpdate) return "disabled";
  else {
    if (config.lastUpdate === 0) return `(Next: ${new Date(Date.now()).toLocaleString()})`;
    else return `(Next: ${new Date(config.lastUpdate + preference.updateInterval).toLocaleString()})`;
  }
};
let menuId = GM_registerMenuCommand((config.autoUpdate ? "✔️" : "❌") + " Auto update " + nextUpdateStr(), function toggleAutoUpdate() {
  GM_unregisterMenuCommand(menuId);
  config.autoUpdate = !config.autoUpdate;
  Danbooru.Utility.notice("Auto update banned artists info " + (config.autoUpdate ? "enabled. " + nextUpdateStr() : "disabled"));
  const prefix = config.autoUpdate ? "✔️" : "❌";
  menuId = GM_registerMenuCommand(prefix + " Auto Update " + nextUpdateStr(), toggleAutoUpdate);
  saveConfig();
});

const version = typeof GM_info === undefined ? null : GM_info?.script?.version;
if (version && config.version !== version) {
  config.version = version;
  saveConfig();
  updateCustomCss();
} else if (config.autoUpdate && Date.now() - config.lastUpdate > preference.updateInterval) updateCustomCss();

async function updateCustomCss() {
  Danbooru.notice("Fetching banned artists info...");
  const data = await fetchBannedArtistData();
  if (data.length) {
    const newCss = generateCss(data);
    localStorage.setItem("s4ba_css", newCss);
    applyLocalCss();
    Danbooru.Utility.notice(`CSS updated successfully. ${data.length} banned artists found.`);
    config.lastUpdate = Date.now();
    saveConfig();
  }
}

function applyLocalCss() {
  let css = localStorage.getItem("s4ba_css");
  let style = document.getElementById("s4ba-style");
  if (style) style.remove();
  if (css) {
    style = document.createElement("style");
    style.id = "s4ba-style";
    style.textContent = css;
    document.head.appendChild(style);
  }
}

async function fetchBannedArtistData() {
  let page = 1;
  let allData = [];
  while (true) {
    const resp = await fetch("/artists.json?search[is_banned]=true&search[order]=created_at&only=id,name&limit=200&page=" + page);
    if (!resp.ok) {
      const msg = `Failed to get artist info: ${resp.status}`;
      Danbooru.Utility.error(msg);
      throw new Error(msg);
    }
    const data = await resp.json();
    if (!Array.isArray(data)) {
      const msg = "Failed to get artist info: Expected an array in response";
      Danbooru.Utility.error(msg);
      throw new Error(msg);
    }
    allData.push(...data);
    if (data.length < 200) break;
    else page++;
  }
  return allData;
}

const sidebarSelector = name => {
  return preference.sidebarQuestionMark ? `.tag-type-1 [href*='=${name}&']` : `.tag-type-1 [href*='tags=${name}&']`;
};
const dtextTagSelector = name => `.tag-type-1[href$='=${name}']`;
const dtextIdSelector = id => `[href='/artists/${id}']`;

function generateCss(data) {
  data.forEach(i => {
    i.name = escape(i.name);
  });
  let sel = ["", "", ""];
  data.forEach(i => {
    sel[0] += sidebarSelector(i.name) + ",";
    if (preference.dtextTag) sel[1] += dtextTagSelector(i.name) + ",";
    if (preference.dtextId) sel[2] += dtextIdSelector(i.id) + ",";
  });
  return sel.join("").slice(0, -1) + "{text-decoration:line-through}";
}

applyLocalCss();