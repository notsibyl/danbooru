// ==UserScript==
// @name        Milestone Report
// @author      Sibyl
// @version     0.4
// @namespace   https://danbooru.donmai.us/forum_posts?search[creator_id]=817128&search[topic_id]=8502
// @homepageURL https://github.com/notsibyl/danbooru
// @downloadURL https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/milestone-report.user.js
// @updateURL   https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/milestone-report.user.js
// @match       *://*.donmai.us/posts/*
// @match       *://*.donmai.us/users/*
// @match       *://*.donmai.us/counts/posts*
// @match       *://*.donmai.us/profile
// @grant       none
// @run-at      document-end
// ==/UserScript==

const milestoneReport = {
  notifyIfFewerThan: 100, // Notify if the next milestone is less than this number of posts.
  // prettier-ignore
  prettyNumbers:  [
    123, 333, 666, 777, 888, 999,
    1111, 1234, 2222, 3333, 4444, 5555, 6666, 7777, 8888, 9999,
    11111, 12345, 22222, 33333, 44444, 55555, 66666, 77777, 88888, 99999,
    111111, 123456, 222222, 333333, 444444, 555555, 666666, 777777, 888888, 999999,
    1111111, 1234567, 2222222, 3333333, 4444444, 5555555, 6666666, 7777777, 8888888, 9999999,
    11111111, 12345678, 22222222, 33333333, 44444444, 55555555, 6666666, 77777777, 88888888, 99999999,
  ],
  notify(restCount) {
    let msg;
    if (restCount < 0) return;
    if (restCount === 0) {
      msg = `🎉 Congratulations! 🎉 You've reached your <b>${this.nextMilestone}</b>${this.getOrdinalSuffix(this.nextMilestone)} post milestone!`;
    } else if (restCount === 1) {
      msg = `Only <b>1</b> post left! 🎉 You're almost there! Let's make that final push to reach your next milestone!`;
    } else if (restCount === this.notifyIfFewerThan) {
      msg = `Exactly <b>${this.notifyIfFewerThan}</b> posts left! 😲 The countdown begins. Your goal is in sight—let's make it happen!`;
    } else if (restCount >= 2 && restCount <= 4) {
      msg = `Just <b>${restCount}</b> more. Final sprint! 🏃‍♂️💨`;
    } else if (restCount > this.notifyIfFewerThan * 0.6) {
      msg = `Still <b>${restCount}</b> to go. Just warming up! 🔧`;
    } else if (restCount > this.notifyIfFewerThan * 0.4) {
      msg = `Halfway there! <b>${restCount}</b> left. Keep it up! 🚀`;
    } else {
      msg = `Whoa, just <b>${restCount}</b> to go! 👀`;
    }
    document.getElementById("notice").notice.show(msg, false, "info");
  },
  ignoreDeleted: Number(localStorage.getItem("milestone_report_ignore_deleted")),
  nextMilestone: Number(localStorage.getItem("milestone_report_next_milestone")),
  get postCount() {
    return !this.ignoreDeleted || this.countsPage ? this._postCount : this._postCount - this.deleteCount;
  },
  set postCount(count) {
    this._postCount = count;
  },
  get milestoneData() {
    return !this.ignoreDeleted || this.countsPage ? this._milestoneData : this._milestoneDataI;
  },
  set milestoneData(data) {
    if (this.ignoreDeleted && !this.countsPage) this._milestoneDataI = data;
    else this._milestoneData = data;
  },
  tooManyPostsWarning(n) {
    if (n > 300000) Danbooru.notice("⚠ Due to the large number of posts being counted, the retrieved data may be incomplete.");
  },
  getPostIdHtml(pid) {
    return `<a class="dtext-link dtext-id-link dtext-post-id-link" href="/posts/${pid}" target="_blank">post #${pid}</a>`;
  },
  getOrdinalSuffix(n) {
    const remainder10 = n % 10;
    const remainder100 = n % 100;
    if (remainder100 >= 11 && remainder100 <= 13) return "th";
    switch (remainder10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  },
  createModal() {
    this.container = document.createElement("div");
    this.container.style.position = "fixed";
    this.container.style.top = "0";
    this.container.style.left = "0";
    this.container.style.width = "100vw";
    this.container.style.height = "100vh";
    this.container.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    this.container.style.zIndex = "1";
    this.container.hidden = true;
    this.container.addEventListener("click", e => {
      if (e.target === this.container) this.container.hidden = true;
    });

    const style = document.createElement("style");
    style.textContent = `#milestone-list td,#milestone-list th,#ordinal-number{text-align:center}#milestone-modal,#milestone-modal .content{max-height:90vh}#milestone-modal{overflow:hidden;padding:10px;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background-color:var(--body-background-color);border-radius:4px;width:min(90vw,490px);box-shadow:0 0 20px rgba(0,0,0,.3)}#milestone-modal .content{overflow-y:auto;overscroll-behavior-y:contain;scrollbar-width:thin;display:flex;flex-direction:column;flex-wrap:nowrap;align-items:flex-start;gap:10px}#milestone-modal button{width:5rem;padding:.15rem 1em}#ordinal-number{width:5rem;appearance:textfield}#ordinal-number::-webkit-inner-spin-button,#ordinal-number::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}@media (prefers-color-scheme:dark){#milestone-modal{border:1px solid #444}}`;
    document.head.appendChild(style);

    this.container.innerHTML =
      '<div id="milestone-modal"><div class="content"><h1>Milestone Report</h1><div id="milestone-subtitle">Fetching data...</div><label><input type="number" id="ordinal-number" min="0" step="1" value="100">&nbsp;<span>th</span> post is:&nbsp;</label><button>Find</button>' +
      (this.countsPage ? "" : '<label class="flex items-center gap-1"><input type="checkbox" id="toggle-report" class="toggle-switch"> Ignore deleted posts</label>') +
      `<div id="milestone-tip" class="fineprint"></div><table id="milestone-list" class="striped"><thead><tr><th>Milestone</th><th>ID</th></tr></thead><tbody></tbody></table></div></div>`;

    document.body.appendChild(this.container);
    this.subTitle = this.container.querySelector("#milestone-subtitle");
    this.ordinalInput = this.container.querySelector("#ordinal-number");
    this.ordinalInput.addEventListener("focus", () => {
      this.ordinalInput.parentElement.querySelector("a")?.remove();
    });
    this.ordinalInput.addEventListener("input", () => {
      const value = this.ordinalInput.value;
      if (!value) {
        this.ordinalInput.value = "";
        this.ordinalInput.nextElementSibling.textContent = "th";
      } else {
        if (value.indexOf(".") !== -1) this.ordinalInput.value = value.split(".")[0];
        this.ordinalInput.nextElementSibling.textContent = this.getOrdinalSuffix(Number(this.ordinalInput.value));
      }
    });
    this.findButton = this.container.querySelector("button");
    this.findButton.addEventListener("click", e => {
      e.preventDefault();
      this.findButton.disabled = true;
      this.toggleReport.disabled = true;
      let value = Number(this.ordinalInput.value);
      value = value < 1 ? 1 : value > this.postCount ? this.postCount : value;
      const suffix = this.getOrdinalSuffix(value);
      this.ordinalInput.value = value;
      this.ordinalInput.nextElementSibling.textContent = suffix;
      this.tooManyPostsWarning(value);
      this.findMilestonePost(value).then(([obj]) => {
        if (obj.pid) {
          const parent = this.ordinalInput.parentElement;
          parent.querySelector("a")?.remove();
          parent.insertAdjacentHTML("beforeend", this.getPostIdHtml(obj.pid));
        } else Danbooru.error(`Failed to find post for ${value}${this.getOrdinalSuffix(value)} post.`);
        this.toggleReport.disabled = false;
        this.findButton.disabled = false;
      });
    });
    if (this.countsPage) {
      this.toggleReport = {};
    } else {
      this.toggleReport = this.container.querySelector("#toggle-report");
      this.toggleReport.checked = this.ignoreDeleted;
      this.toggleReport.addEventListener("change", () => {
        this.ignoreDeleted = this.toggleReport.checked;
        localStorage.setItem("milestone_report_ignore_deleted", this.ignoreDeleted ? "1" : "0");
        if (!this.milestoneData) this.load();
        else this.updateModal();
      });
    }
    this.milestoneTip = this.container.querySelector("#milestone-tip");
    if (this.userName === document.body.dataset.currentUserName) {
      this.milestoneTip.insertAdjacentHTML(
        "beforebegin",
        `<label class="flex items-center gap-1"><input type="checkbox" id="milestone-notify" class="toggle-switch"> Notify me if the next milestone is fewer than ${this.notifyIfFewerThan} posts away</label>`
      );
      this.notifySetting = this.container.querySelector("#milestone-notify");
      this.notifySetting.checked = Boolean(this.nextMilestone);
      this.notifySetting.addEventListener("change", () => {
        if (this.notifySetting.checked) {
          this.nextMilestone = this.calcNextMilestone(this.postCount);
        } else this.nextMilestone = 0;
        localStorage.setItem("milestone_report_next_milestone", this.nextMilestone);
      });
    }
    this.list = this.container.querySelector("#milestone-list");
  },
  showModal() {
    this.container.hidden = false;
    if (!this.milestoneData) this.load();
  },
  updateModal() {
    let subTitle;
    if (this.countsPage) {
      const tagParts =
        this.searchedTags === ""
          ? '<a href="/posts" target="_blank">/posts</a>'
          : `<a href="/posts?tags=${encodeURIComponent(this.searchedTags)}" target="_blank">${this.searchedTags}</a>`;
      subTitle = `Post count for ${tagParts}: ${this.postCount}`;
    } else subTitle = `<b>${this.userHtml}</b> uploaded ${this.postCount} posts in total${this.ignoreDeleted ? " (not counting deleted posts)" : ""}.`;
    this.subTitle.innerHTML = subTitle;
    this.ordinalInput.parentElement.querySelector("a")?.remove();
    const nextMilestone = this.calcNextMilestone(this.postCount);
    this.milestoneTip.innerHTML = `Upload <b>${nextMilestone - this.postCount}</b> more posts to reach the <b>${nextMilestone}</b>${this.getOrdinalSuffix(
      nextMilestone
    )} post milestone.`;
    this.list.querySelector("tbody").innerHTML = "";
    this.milestoneData.forEach(({ num, pid }) => {
      const row = document.createElement("tr");
      row.innerHTML = `<td>${num}</td><td>${this.getPostIdHtml(pid)}</td>`;
      this.list.querySelector("tbody").appendChild(row);
    });
  },
  load() {
    this.subTitle.textContent = "Fetching data...";
    this.toggleReport.disabled = true;
    const pickedNumbers = this.calcMilestones(this.postCount);
    this.tooManyPostsWarning(this.postCount);
    this.findMilestonePost(pickedNumbers).then(allNumbers => {
      console.log(allNumbers);
      allNumbers = allNumbers.filter(n => n.pid);
      this.milestoneData = allNumbers;
      this.updateModal();
      this.toggleReport.disabled = false;
    });
  },
  calcMilestones(total) {
    const filteredPretty = this.prettyNumbers.filter(n => n <= total);
    const roundedMilestones = [];
    const power = Math.floor(Math.log10(total));
    for (let i = 1; i <= 9; i++) {
      for (let p = 2; p <= power; p++) {
        const value = i * Math.pow(10, p);
        if (value <= total) roundedMilestones.push(value);
      }
    }
    let allCandidates = Array.from(new Set([...filteredPretty, ...roundedMilestones]));
    allCandidates.sort((a, b) => a - b);
    allCandidates = allCandidates.slice(-7);
    if (total >= 4000) allCandidates.push(1000);
    if (total >= 4444) allCandidates.push(1234);
    if (total >= 40000) allCandidates.push(10000);
    if (total >= 44444) allCandidates.push(12345);
    if (total >= 400000) allCandidates.push(100000);
    if (total >= 444444) allCandidates.push(123456);
    if (total >= 4000000) allCandidates.push(1000000);
    if (total >= 4444444) allCandidates.push(1234567);
    if (total >= 40000000) allCandidates.push(10000000);
    if (total >= 44444444) allCandidates.push(12345678);
    allCandidates.sort((a, b) => b - a);
    return allCandidates;
  },
  calcNextMilestone(total) {
    const dynamicMilestones = new Set(this.prettyNumbers);
    for (let i = 100; i <= 40000000; i *= 10) {
      for (let j = 1; j < 10; j++) {
        const m = j * i;
        if (m <= 40000000 && m >= 500) dynamicMilestones.add(m);
      }
    }
    const allMilestones = Array.from(dynamicMilestones).sort((a, b) => a - b);
    for (let milestone of allMilestones) {
      if (milestone > total) return milestone;
    }
    return 1e6;
  },
  async findMilestonePost(milestoneNumbers, baseTags = "", baseOffset = 0) {
    if (!Array.isArray(milestoneNumbers)) {
      milestoneNumbers = [milestoneNumbers];
    }

    const PAGE_SIZE = 200;
    const MAX_PAGE = 5000;
    const MAX_COUNT = PAGE_SIZE * MAX_PAGE; // 1000000

    const currentRange = [],
      nextRange = [];
    for (const n of milestoneNumbers) {
      if (n - baseOffset <= MAX_COUNT) currentRange.push(n);
      else nextRange.push(n);
    }

    let tags;
    if (this.countsPage) tags = this.searchedTags + " order:id_asc";
    else {
      tags = `user:${this.userName} order:id_asc`;
      if (this.ignoreDeleted) tags += " -status:deleted";
    }
    tags += baseTags;

    let results = [],
      lastPostId;
    if (currentRange.length > 0) {
      const pageMap = {};
      for (const n of currentRange) {
        const localOffset = n - baseOffset;
        const page = Math.ceil(localOffset / PAGE_SIZE);
        if (!pageMap[page]) pageMap[page] = [];
        pageMap[page].push({ n, localOffset });
      }
      const promises = Object.entries(pageMap).map(async ([page, milestones]) => {
        try {
          const resp = await fetch(`/posts.json?tags=${encodeURIComponent(tags)}&limit=${PAGE_SIZE}&page=${page}&only=id`);
          const data = await resp.json();
          if (Number(page) === MAX_PAGE && nextRange.length) lastPostId = data[PAGE_SIZE - 1].id;
          return milestones.map(({ n, localOffset }) => {
            const offset = localOffset - (page - 1) * PAGE_SIZE;
            return { num: n, pid: data?.[offset - 1]?.id };
          });
        } catch (e) {
          Danbooru.error(`Failed to get post for ${milestones.map(x => x.n).join(",")}: ${e}`);
          return milestones.map(({ n }) => ({ num: n, pid: null }));
        }
      });
      const pageResults = await Promise.all(promises);
      results = results.concat(pageResults.flat());
    }

    if (nextRange.length > 0) {
      if (!lastPostId) {
        const resp = await fetch(`/posts.json?tags=${encodeURIComponent(tags)}&limit=${PAGE_SIZE}&page=${MAX_PAGE}&only=id`);
        const data = await resp.json();
        lastPostId = data?.[PAGE_SIZE - 1]?.id;
      }
      if (!lastPostId) results = results.concat(nextRange.map(n => ({ num: n, pid: null })));
      else {
        const nextResults = await this.findMilestonePost(nextRange, ` id:>${lastPostId}`, baseOffset + MAX_COUNT);
        results = results.concat(nextResults);
      }
    }

    results.sort((a, b) => b.num - a.num);
    return results;
  },
  init() {
    const changesReport = document.querySelector('[href^="/post_versions"][href$="&search%5Bversion%5D=1&type=current"]');
    if (changesReport) {
      const userEl = document.querySelector("#a-show>div>h1>a[data-user-name]");
      this.userName = userEl.dataset.userName;
      this.userHtml = userEl.outerHTML;
      this.deleteCount = Number(document.querySelector(".user-statistics a[href^='/posts?tags=status%3Adeleted+user%3A']").textContent);
      this.postCount = Number(changesReport.closest("td").querySelector("a[href^='/posts?tags=']").textContent);
      this.createModal();
      const a = document.createElement("a");
      a.href = "";
      a.textContent = "milestone report";
      changesReport.after(" | ", a);
      a.onclick = e => {
        e.preventDefault();
        this.showModal();
      };
    }
  },
  initCounts() {
    const tagsEl = document.querySelector("#c-counts>#a-posts>a");
    if (tagsEl) {
      this.countsPage = true;
      this.searchedTags = (new URL(tagsEl.href).searchParams.get("tags") || "")
        .replace(/\border:[a-z_A-Z]\b/g, "")
        .trim()
        .split(/\s+/)
        .join(" ");
      const lastNode = tagsEl.nextSibling;
      this.postCount = Number(lastNode.textContent.slice(1).trim());
      if (isNaN(this.postCount)) return;
      this.createModal();
      const a = document.createElement("a");
      a.href = "";
      a.textContent = "milestone report";
      lastNode.after(" (", a, ")");
      a.onclick = e => {
        e.preventDefault();
        this.showModal();
      };
    }
  },
  initNotification() {
    if (!this.nextMilestone) return;
    const ds = document.body.dataset;
    const me = ds.currentUserId;
    const uploader = ds.postUploaderId;
    if (me !== uploader) return;
    const lastMarkedPost = Number(localStorage.getItem("milestone_report_last_marked_post"));
    const postId = Number(ds.postId);
    if (postId <= lastMarkedPost) return;
    localStorage.setItem("milestone_report_last_marked_post", postId);
    const myName = ds.currentUserName;
    fetch(`/counts/posts.json?tags=user%3A${encodeURIComponent(myName)}+id%3A<%3D${postId}`)
      .then(resp => resp.json())
      .then(data => {
        const n = data?.counts?.posts;
        if (!n) return;
        const restCount = this.nextMilestone - n;
        if (restCount > this.notifyIfFewerThan) return;
        this.notify(restCount);
        if (restCount <= 0) {
          this.nextMilestone = this.calcNextMilestone(n);
          localStorage.setItem("milestone_report_next_milestone", this.nextMilestone);
        }
      });
  }
};

const controller = document.body.dataset?.controller,
  action = document.body.dataset?.action;
if (controller === "users" && action === "show") {
  milestoneReport.init();
} else if (controller === "counts" && action === "posts") {
  milestoneReport.initCounts();
} else if (controller === "posts" && action === "show") {
  milestoneReport.initNotification();
}