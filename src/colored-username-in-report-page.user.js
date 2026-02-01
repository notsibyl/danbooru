// ==UserScript==
// @name          Colored Username in Report Page
// @author        Sibyl
// @version       1.6
// @icon          https://cdn.jsdelivr.net/gh/notsibyl/danbooru@main/danbooru.svg
// @namespace     https://danbooru.donmai.us/forum_posts?search[creator_id]=817128&search[topic_id]=8502
// @homepageURL   https://github.com/notsibyl/danbooru
// @downloadURL   https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/colored-username-in-report-page.user.js
// @updateURL     https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/colored-username-in-report-page.user.js
// @match         *://*.donmai.us/reports/*
// ==/UserScript==

const { action, controller } = document.body.dataset;

if (controller === "reports" && action === "show") {
  const table = document.querySelector("#a-show table");
  if (!table) return;
  const headerCells = table?.querySelectorAll("thead>tr>th");
  const firstCellText = headerCells[0].textContent;
  const roles = ["uploader", "approver", "creator", "user", "updater", "banner"];
  let cells;
  if (firstCellText === "Date") cells = Array.prototype.slice.call(headerCells, 1);
  else if (roles.some(role => role === firstCellText)) cells = table.querySelectorAll("tbody>tr>td:first-child");
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
  requests.forEach(request => {
    request.then(users => {
      users.forEach(({ id, name, level_string, is_banned }) => {
        const a = document.createElement("a");
        a.classList = `user user-${level_string.toLowerCase()}` + (is_banned ? " user-banned" : "");
        a.href = `/users/${id}`;
        a.textContent = name.replaceAll("_", " ");
        a.dataset.userId = id;
        cells[orders[name]].replaceChildren(a);
      });
    });
  });
}
