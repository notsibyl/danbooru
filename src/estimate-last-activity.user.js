// ==UserScript==
// @name        Estimate Last Activity
// @author      Sibyl
// @version     0.3
// @icon        https://cdn.jsdelivr.net/gh/notsibyl/danbooru@main/danbooru.svg
// @namespace   https://danbooru.donmai.us/forum_posts?search[creator_id]=817128&search[topic_id]=8502
// @homepageURL https://github.com/notsibyl/danbooru
// @downloadURL https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/estimate-last-activity.user.js
// @updateURL   https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/estimate-last-activity.user.js
// @match       *://*.donmai.us/users/*
// @run-at      document-end
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
const formatTime = (fmt, ts = null) => {
  if (!fmt) return ts || new Date().getTime();
  const date = ts ? new Date(ts) : new Date();
  let o = {
    "M+": date.getUTCMonth() + 1,
    "d+": date.getUTCDate(),
    "H+": date.getUTCHours(),
    "m+": date.getUTCMinutes(),
    "s+": date.getUTCSeconds(),
    "q+": Math.floor((date.getUTCMonth() + 3) / 3),
    S: date.getUTCMilliseconds()
  };
  if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (date.getUTCFullYear() + "").slice(4 - RegExp.$1.length));
  for (let k in o) if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, RegExp.$1.length == 1 ? o[k] : ("00" + o[k]).slice(("" + o[k]).length));
  return fmt;
};

const controller = document.body.dataset?.controller,
  action = document.body.dataset?.action,
  // "2021-06-09T23:49:56.434-06:00"
  userCreatedAt = document.body.dataset?.userCreatedAt.slice(1, -1),
  userTimezone = (timeStr => {
    let s = timeStr.slice(-6, -5);
    let h = timeStr.slice(-5, -3);
    let m = timeStr.slice(-2);
    return { str: s + h + m, offset: (s === "+" ? 1 : -1) * (Number(h) * 60 + Number(m)) * 60 * 1000 };
  })(userCreatedAt);

const ELA = {
  pickTime: (obj, field = "updated_at") => new Date(obj?.[field] || obj).getTime(),
  findLatest(arr) {
    return arr.reduce((prev, curr) => (this.pickTime(curr) > this.pickTime(prev) ? curr : prev));
  },
  async estimate() {
    const userName = document.querySelector("h1>a.user").dataset.userName;

    const endpoints = [
      { url: `/post_events.json?search[creator_name]=${userName}`, only: "event_at" },
      { url: `/post_versions.json?search[updater_name]=${userName}`, bulk: true },
      { url: `/post_votes.json?search[user_name]=${userName}` },
      // No timestamp in response.
      // { url: `/favorites.json?search[user_name]=${user}` },
      // This endpoint is useless, but there's no better way to obtain timestamp related to favorites.
      { url: `/posts.json?tags=fav:${userName}+order:id_desc`, only: "created_at" },
      { url: `/artist_commentary_versions.json?search[updater_name]=${userName}`, bulk: true },
      { url: `/note_versions.json?search[updater_name]=${userName}`, bulk: true },
      { url: `/artist_versions.json?search[updater_name]=${userName}&search[order]=updated_at` },
      { url: `/wiki_page_versions.json?search[updater_name]=${userName}`, bulk: true },
      { url: `/pool_versions.json?search[updater_name]=${userName}` },
      { url: `/favorite_groups.json?search[creator_name]=${userName}&search[order]=updated_at` },
      { url: `/user_name_change_requests.json?search[user_name]=${userName}` },
      { url: `/user_feedbacks.json?search[creator_name]=${userName}`, bulk: true },
      { url: `/comments.json?search[creator_name]=${userName}&search[order]=updated_at_desc` },
      { url: `/forum_posts.json?search[creator_name]=${userName}`, bulk: true },
      { url: `/forum_post_votes.json?search[creator_name]=${userName}` },
      // Each BUR binds a forum post.
      // { url: `/bulk_update_requests.json?search[user_name]=${user}&search[order]=updated_at_desc` },
      { url: `/bulk_update_requests.json?search[approver_name]=${userName}&search[order]=updated_at_desc` },
      { url: `/tag_versions.json?search[updater_name]=${userName}` },
      { url: `/mod_actions.json?search[creator_name]=${userName}` },
      { url: `/tag_implications.json?search[approver_name]=${userName}` }
    ];

    Number(document.body.dataset.userLevel) < 40 && endpoints.splice(-1, 1);

    const tasks = endpoints.map(async ep => {
      try {
        let controller = ep.url.split(".", 1)[0].slice(1);
        let url = `${ep.url}&limit=${ep.bulk ? "200" : "1"}`;
        url += `&only=${ep.only || "updated_at" + (ep.bulk ? ",id" : "")}`;

        let data,
          result = { url: ep.url.replace(".json", ""), controller: controller.replaceAll("_", " ") };
        data = await (await fetch(url)).json();
        if (!data || !Array.isArray(data)) {
          console.warn(`Failed to check ${controller}`);
          return { error: true, ...result };
        } else if (data.length === 0) return result;

        if (ep.only) {
          return { ...result, ts: this.pickTime(data[0], ep.only) };
        } else if (ep.bulk) {
          const { updated_at, id } = this.findLatest(data);
          return { ...result, ts: this.pickTime(updated_at), url: `/${controller}?search[id]=${id}` };
        } else {
          return { ...result, ts: this.pickTime(data[0]) };
        }
      } catch (err) {
        console.error("Failed:", ep.url, err);
        return null;
      }
    });

    const results = await Promise.all(tasks);
    const filteredResults = results.filter(i => i && i.ts);
    if (filteredResults.length === 0) filteredResults.push({ ts: new Date(userCreatedAt).getTime(), controller: "users", url: `/users?search[name_matches]=${userName}` });
    const latest = filteredResults.reduce((prev, curr) => (curr.ts > prev.ts ? curr : prev));
    const checkFailedControllers = results.filter(i => i && i.error).map(i => i.controller);

    let msg;
    if (latest) {
      msg = `Estimated last activity based on <i><a href="${latest.url}" target="_blank">${latest.controller}</a></i>.`;
      if (checkFailedControllers.length) msg += `<br><br>Failed to check: <i>${checkFailedControllers.join(", ")}</i>.`;
    } else msg = "No activity data found.";
    return { ts: latest?.ts, msg };
  },
  init() {
    const table = document.querySelector("#c-users table");
    const row = table.insertRow(2);
    const th = createElement("th", { textContent: "Last Activity" });
    const td = createElement("td");
    row.append(th, td);
    const iconUri = document.querySelector("a#close-notice-link use").href.baseVal.split("#")[0];
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList = "icon svg-icon spinner-icon animate-spin hidden";
    svg.innerHTML = `<use href="${iconUri}#spinner" fill="currentColor"></use>`;
    svg.setAttribute("viewBox", "0 0 512 512");
    const span = createElement("span", { textContent: "-" });
    const a = createElement("a", { href: "", textContent: "refresh" });
    span.append(" (", a, ")");
    td.append(svg, span);
    a.onclick = e => {
      e.preventDefault();
      const notice = document.getElementById("notice").notice;
      notice.close();
      svg.classList.remove("hidden");
      span.hidden = true;
      this.estimate().then(({ ts, msg }) => {
        if (ts) span.childNodes[0].textContent = formatTime("yyyy-MM-dd HH:mm:ss " + userTimezone.str, ts + userTimezone.offset);
        span.hidden = false;
        svg.classList.add("hidden");
        notice.show(msg, false);
      });
    };
  }
};

if (controller === "users" && action === "show") ELA.init();
