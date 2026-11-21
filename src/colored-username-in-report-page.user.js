// ==UserScript==
// @name          Colored Username in Report Page
// @author        Sibyl
// @version       1.7
// @icon          https://cdn.jsdelivr.net/gh/notsibyl/danbooru@main/danbooru.svg
// @namespace     https://danbooru.donmai.us/forum_posts?search[creator_id]=817128&search[topic_id]=8502
// @homepageURL   https://github.com/notsibyl/danbooru
// @downloadURL   https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/colored-username-in-report-page.user.js
// @updateURL     https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/colored-username-in-report-page.user.js
// @match         *://*.donmai.us/reports/*
// ==/UserScript==

const { action, controller } = document.body.dataset;

if (controller === "reports" && action === "show") {
  const pageType = location.pathname.split("/reports/")[1];
  const table = document.querySelector("#a-show table");
  if (!table) return;
  const roles = ["uploader", "approver", "creator", "user", "updater", "banner"];
  const groupType = document.getElementById("search_group").value;
  const isGroupedByRole = roles.indexOf(groupType) > -1;
  if (!isGroupedByRole) return;
  const headerCells = table?.querySelectorAll("thead>tr>th");
  const firstCellText = headerCells[0].textContent;
  let cells;
  if (firstCellText === "Date") cells = Array.prototype.slice.call(headerCells, 1);
  else cells = table.querySelectorAll("tbody>tr>td:first-child");
  const orders = {};
  const names = [];
  cells.forEach((cell, i) => {
    let userName = cell.textContent.trim().replaceAll(" ", "_");
    orders[userName] = i;
    names.push(userName);
  });
  const chunkSize = 100;
  const requests = [];
  for (let i = 0; i < names.length; i += chunkSize) {
    const chunk = names.slice(i, i + chunkSize);
    requests.push(
      $.post("/users.json", {
        _method: "get",
        limit: chunkSize,
        only: "id,name,level_string,is_banned",
        search: { name_array: chunk }
      })
    );
  }
  const from = document.getElementById("search_from")?.value || "";
  const to = document.getElementById("search_to")?.value || "";
  const date = (from || to) ? ` date:${from}..${to}` : "";
  const buildHref = name => {
    let metatag = "";
    switch (pageType) {
      case "posts": {
        let tagInput = document.getElementById("search_tags"),
          tags = tagInput?.value?.trim();
        tags = tags ? " " + tags : "";
        if (groupType === "uploader") metatag = "user";
        if (groupType === "approver") metatag = "approver";
        return `/posts?tags=${metatag}%3A${encodeURIComponent(name)}${tags}${date}`;
      }
      /* case "post_approvals":
        metatag = "approver";
      case "post_appeals":
        metatag = "appealer";
      case "comments":
        metatag = "commenter";
      case "note_versions":
        metatag = "noteupdater";
      case "note_versions":
        metatag = "noteupdater";
        return `/posts?tags=${metatag}%3A${encodeURIComponent(name)}${date}`; */
      default:
        return `/${pageType}?search[${groupType}_name]=${encodeURIComponent(name)}`;
    }
  };
  requests.forEach(request => {
    request.then(users => {
      users.forEach(({ id, name, level_string, is_banned }) => {
        const a1 = document.createElement("a");
        a1.classList = `user user-${level_string.toLowerCase()}` + (is_banned ? " user-banned" : "");
        a1.href = `/users/${id}`;
        a1.textContent = name.replaceAll("_", " ");
        a1.dataset.userId = id;
        const a2 = document.createElement("a");
        a2.href = buildHref(name);
        a2.textContent = "»";
        a2.target = "_blank";
        cells[orders[name]].replaceChildren(a1, " ", a2);
      });
    });
  });
}
