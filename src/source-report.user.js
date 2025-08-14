// ==UserScript==
// @name        Source Report
// @author      Sibyl
// @version     1.26
// @icon        https://cdn.jsdelivr.net/gh/notsibyl/danbooru@main/danbooru.svg
// @namespace   https://danbooru.donmai.us/forum_posts?search[creator_id]=817128&search[topic_id]=8502
// @homepageURL https://github.com/notsibyl/danbooru
// @downloadURL https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/source-report.user.js
// @updateURL   https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/source-report.user.js
// @resource    echarts.pieonly.build https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/lib/echarts.pieonly.min.js
// @match       *://*.donmai.us/users/*
// @match       *://*.donmai.us/profile
// @grant       GM_getResourceText
// @run-at      document-end
// ==/UserScript==

const sourceType = [
  {
    name: "Pixiv",
    search: "pixiv:any"
  },
  {
    name: "Twitter",
    search: "~source:*://x.com/ ~source:*://twitter.com/ ~source:*://pbs.twimg.com/"
  },
  {
    name: "Tumblr",
    search: "source:*://*.tumblr.com/"
  },
  {
    name: "Lofter",
    search: "source:*://*.lofter.com/"
  },
  {
    name: "DeviantArt",
    search: "~source:*://*.deviantart.com ~source:*://deviantart.com ~source:*://*.deviantart.net/ ~source:*://images-wixmp-*.wixmp.com/"
  },
  {
    name: "yande.re",
    search: "~source:*://yande.re ~source:*://files.yande.re"
  },
  {
    name: "Niconico",
    search: "~source:*://*.nicovideo.jp ~source:*://*.nicoseiga.jp"
  },
  {
    name: "FC2",
    search: "source:*://*.fc2.com"
  },
  {
    name: "E-hentai",
    search: "~source:*://exhentai.org/ ~source:*://e-hentai.org/ ~source:*://*.hath.network/"
  },
  {
    name: "Weibo",
    search: "~source:*://*.weibo.com/ ~source:*://weibo.com/ ~source:*://m.weibo.cn ~source:*.sinaimg.cn/"
  },
  {
    name: "Fanbox",
    search: "source:*://*.fanbox.cc"
  },
  {
    name: "Fantia",
    search: "~source:*://*.fantia.jp ~source:*://fantia.jp/"
  },
  {
    name: "Unknown",
    search: '~source:"" ~source_request'
  },
  {
    name: "Artstation",
    search: "~source:*://artstation.com ~source:*://*.artstation.com"
  },
  {
    name: "Bilibili",
    search: "~source:*://*.bilibili.com/ ~source:*://*.hdslb.com/"
  },
  {
    name: "Bluesky",
    search: "source:https://bsky.app/"
  },
  {
    name: "🇰🇷SNS",
    search: "~source:*dcinside ~source:*://*.naver.com ~source:*://arca.live"
  },
  {
    name: "Xiaohongshu",
    search: "~source:*xhslink.com ~source:*www.xiaohongshu.com"
  }
];

const createElement = (tag, props = {}) => {
  const el = document.createElement(tag);
  const { style, dataset, ..._props } = props;
  Object.assign(el, _props);
  Object.assign(el.dataset, dataset);
  if (typeof style === "string") el.style.cssText = style;
  else Object.assign(el.style, style);
  return el;
};

const sourceReport = {
  widthQuery: window.matchMedia("(max-width: 660px)"),
  darkQuery: window.matchMedia("(prefers-color-scheme: dark)"),
  baseRichStyle: {
    fontSize: 18,
    fontWeight: "bold"
  },
  get config() {
    const textColor = this.darkQuery.matches ? "#D1D1DA" : "#000";
    const secondaryColor = this.darkQuery.matches ? "#B9B8CE" : "#666";
    const backgroundColor = this.darkQuery.matches ? "#1E1E2C" : "#FFF";
    return {
      backgroundColor,
      title: {
        text: `{${this.userLevel}|${this.userName.replace(/_/g, " ")}}'s Source Report`,
        subtext: this.chartSubtext,
        left: "center",
        textStyle: {
          ...this.baseRichStyle,
          color: textColor,
          rich: {
            admin: { color: this.darkQuery.matches ? "#FF8A8B" : "#ED2426", ...this.baseRichStyle },
            moderator: { color: this.darkQuery.matches ? "#35C64A" : "#00AB2C", ...this.baseRichStyle },
            builder: { color: this.darkQuery.matches ? "#C797FF" : "#A800AA", ...this.baseRichStyle },
            platinum: { color: this.darkQuery.matches ? "#ABABBC" : "#777892", ...this.baseRichStyle },
            gold: { color: this.darkQuery.matches ? "#EAD084" : "#FD9200", ...this.baseRichStyle },
            member: { color: this.darkQuery.matches ? "#009BE6" : "#0075F8", ...this.baseRichStyle }
          }
        },
        subtextStyle: { color: secondaryColor }
      },
      tooltip: {
        trigger: "item"
      },
      legend: {
        orient: "horizontal",
        left: this.widthQuery.matches ? "left" : "center",
        top: "bottom",
        textStyle: { color: textColor }
      },
      series: [
        {
          type: "pie",
          radius: "50%",
          center: ["50%", "50%"],
          data: this.chartData,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: "rgba(0, 0, 0, 0.5)"
            }
          },
          label: { color: this.darkQuery.matches ? "#D1D1DA" : "#000" }
        }
      ],
      toolbox: {
        show: true,
        orient: "vertical",
        left: "right",
        top: this.widthQuery.matches ? "65%" : "center",
        iconStyle: { borderColor: secondaryColor },
        emphasis: { iconStyle: { borderColor: this.darkQuery.matches ? "#009BE6" : "#3E98C5" } },
        feature: {
          dataView: { show: true },
          saveAsImage: { show: true }
        }
      }
    };
  },
  chartData: null,
  chartInstance: null,
  loadEcharts() {
    const lib = GM_getResourceText("echarts.pieonly.build");
    new Function(lib)();
    if (!this.chartData) this.fetchButton.textContent = "Counting...";
    this.chartInstance = echarts.init(this.chart);
    window.addEventListener("resize", this.chartInstance.resize);
    this.widthQuery.addEventListener("change", () => {
      this.chartInstance.setOption({ legend: this.config.legend, toolbox: this.config.toolbox });
    });
    this.darkQuery.addEventListener("change", () => {
      this.chartInstance.setOption(this.config);
    });
  },
  createModal() {
    this.container = createElement("div", {
      hidden: true,
      style: {
        position: "fixed",
        top: "0",
        left: "0",
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        zIndex: "9999"
      }
    });
    this.container.addEventListener("click", e => {
      if (e.target === this.container) {
        this.container.hidden = true;
      }
    });
    const shadowHost = document.createElement("div");
    const shadow = shadowHost.attachShadow({ mode: "open" });
    const style = `<style>button:disabled,button:not(:disabled):hover{background-color:var(--form-button-hover-background)}:root{font-size:87.5%;line-height:1.25em}h1{line-height:1.5em;margin:0;color:var(--header-color)}.count input:focus-visible{outline-offset:-2px;outline:2px solid var(--focus-ring-color);border-color:transparent}.content,.modal{max-height:90vh;color:var(--text-color);font-family:var(--body-font)}#chart,.modal{padding:10px}.modal{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background-color:var(--body-background-color);border-radius:4px;width:auto;box-shadow:0 0 20px rgba(0,0,0,.3)}.content{overflow-y:auto;overscroll-behavior-y:contain;scrollbar-width:thin;display:flex;flex-direction:column;flex-wrap:nowrap;align-items:flex-start;gap:10px}.options{display:flex;flex-direction:row;flex-wrap:nowrap;justify-content:space-between;width:100%;align-items:flex-end}button{cursor:pointer;margin-bottom:.5em;padding:.15rem 1em;border-radius:3px;border:1px solid var(--form-button-border-color);color:var(--form-button-text-color);background-color:var(--form-button-background)}button:not(:disabled):hover{box-shadow:0 0 2px var(--form-button-hover-box-shadow-color)}button:disabled{cursor:wait;color:var(--form-button-disabled-text-color)}.count{display:table;border-spacing:0 0.5em;border-collapse:separate}.count>div{display:table-row}.count label{display:table-cell;text-align:right;padding-right:.5em;font-weight:700}.count input{display:table-cell;width:100%;text-align:left;color:var(--form-input-text-color);border:1px solid var(--form-input-border-color);background-color:var(--form-input-background);font:var(--body-font)}#chart{border:1px solid #D1D1DA;border-radius:4px;align-self:center;width:min(calc(90vw - 24px),480px);height:min(60vh,320px)}@media (prefers-color-scheme:dark){.modal{border:1px solid #444}#chart{border-color:#444}}</style>`;

    shadow.innerHTML =
      style +
      '<div class="modal"><div class="content"><h1>Source Report</h1><div class="options"><div class="count"><div class="count_from"><label for="count_from">From</label> <input type="date" id="count_from"></div><div class="count_to"><label for="count_to">To</label> <input type="date" id="count_to"></div></div><button disabled>Fetching...</button></div><div id="chart"></div></div></div>';

    this.container.appendChild(shadowHost);
    document.body.appendChild(this.container);
    const countFrom = shadow.querySelector("#count_from");
    const countTo = shadow.querySelector("#count_to");
    Object.defineProperty(this, "from", {
      get() {
        return countFrom.value;
      }
    });
    Object.defineProperty(this, "to", {
      get() {
        return countTo.value;
      }
    });
    this.fetchButton = shadow.querySelector("button");
    this.chart = shadow.getElementById("chart");
    this.fetchButton.onclick = e => {
      e.preventDefault();
      this.load();
    };
  },
  showModal() {
    if (!this.chartInstance) {
      this.loadEcharts();
    }
    this.container.hidden = false;
    if (!this.chartData) this.load();
  },
  async fetchCounts(tags = "") {
    let date = "";
    if (this.from || this.to) date = ` date:${this.from}..${this.to}`;
    tags = `user:${this.userName} ${tags}${date}`;
    return new Promise(resolve => {
      fetch(`/counts/posts.json?tags=${encodeURIComponent(tags)}`)
        .then(resp => resp.json())
        .then(data => resolve(data))
        .catch(error => {
          Danbooru.Notice.error(`Failed to fetch counts: ${error}`);
          console.error(tags);
          resolve({ counts: { posts: 0 } });
        });
    });
  },
  fetchAll() {
    const promises = sourceType.map(type => {
      return this.fetchCounts(type.search).then(({ counts }) => {
        return { name: type.name, value: counts.posts };
      });
    });
    return Promise.all(promises);
  },
  load() {
    if (!this.chartInstance) this.fetchButton.textContent = "Loading ECharts...";
    else this.fetchButton.textContent = "Counting...";
    this.fetchButton.disabled = true;
    let subtextSuffix = this.from || this.to ? ` (${this.from} – ${this.to})` : "";
    this.fetchCounts().then(json => {
      this.all = json.counts.posts;
      this.chartSubtext = `Total: ${this.all} posts${subtextSuffix}`;
      this.fetchAll().then(allCounts => {
        allCounts.sort((a, b) => b.value - a.value);
        let restCounts = this.all;
        allCounts = allCounts.filter(counts => {
          const show = counts.value / this.all > 0.02;
          if (show) restCounts -= counts.value;
          return show;
        });
        if (restCounts) allCounts.push({ name: "Others", value: restCounts });
        this.chartData = allCounts;
        if (this.chartInstance) this.render();
        this.fetchButton.textContent = "Count";
        this.fetchButton.disabled = false;
      });
    });
  },
  render() {
    this.chartInstance.setOption(this.config);
    setTimeout(this.chartInstance.resize, 1000);
  },
  init() {
    const changesReport = document.querySelector('[href^="/post_versions"][href$="&search%5Bversion%5D=1&type=current"]');
    if (changesReport) {
      sourceReport.createModal();
      const nameEl = document.querySelector("#a-show>div>h1>a[data-user-name]");
      this.userName = nameEl.dataset.userName;
      const level = nameEl.dataset.userLevel;
      this.userLevel = level > 49 ? "admin" : level > 39 ? "moderator" : level > 31 ? "builder" : level > 30 ? "platinum" : level > 29 ? "gold" : "member";
      const a = createElement("a", { href: "", textContent: "source report" });
      changesReport.after(" | ", a);
      a.onclick = e => {
        e.preventDefault();
        this.showModal();
      };
    }
  }
};

const controller = document.body.dataset?.controller,
  action = document.body.dataset?.action;
if (controller === "users" && action === "show") {
  sourceReport.init();
}
