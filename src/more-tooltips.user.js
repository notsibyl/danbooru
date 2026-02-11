// ==UserScript==
// @name          More Tooltips
// @author        Sibyl
// @version       2.3
// @icon          https://cdn.jsdelivr.net/gh/notsibyl/danbooru@main/danbooru.svg
// @namespace     https://danbooru.donmai.us/forum_posts?search[creator_id]=817128&search[topic_id]=8502
// @homepageURL   https://github.com/notsibyl/danbooru
// @downloadURL   https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/more-tooltips.user.js
// @updateURL     https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/more-tooltips.user.js
// @match         *://*.donmai.us/*
// @exclude-match *://cdn.donmai.us/*
// @run-at        document-end
// ==/UserScript==

// Media assets preview settings
const ASSET_PREVIEW_SIZE = 360; // 180, 720
const DISPLAY_IMAGE_HEIGHT = 240;

if (!globalThis.unsafeWindow) globalThis.unsafeWindow = window;
const isMobile = window.matchMedia("(max-width: 660px)").matches;

const createElement = (tag, props = {}) => {
  const el = document.createElement(tag);
  const { style, dataset, ..._props } = props;
  Object.assign(el, _props);
  Object.assign(el.dataset, dataset);
  if (typeof style === "string") el.style.cssText = style;
  else Object.assign(el.style, style);
  return el;
};

document.head.append(
  createElement("style", {
    textContent:
      `.stt-bubble,.stt-bubble>.stt-arrow{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box}.stt-bubble{--stt-bgcolor:var(--post-tooltip-background-color);--stt-title-bgcolor:var(--post-tooltip-header-background-color);--stt-arrow-color:var(--stt-bgcolor);background:var(--stt-bgcolor);border:1px solid var(--post-tooltip-border-color);position:absolute;text-align:center;border-radius:4px;z-index:9999;box-shadow:var(--shadow-lg)}.stt-bubble .stt-title{background:var(--stt-title-bgcolor);font-size:10px;border-radius:3px 3px 0 0}.stt-content{word-wrap:break-word;padding:.5em}.stt-bubble>.stt-arrow{position:absolute;border-width:0;pointer-events:none;left:50%;margin-left:0}.stt-bubble>.stt-arrow::after,.stt-bubble>.stt-arrow::before{content:'';position:absolute;left:0;border-style:solid;border-color:transparent}.stt-bubble.top>.stt-arrow{top:100%}.stt-bubble.top>.stt-arrow::before{top:0;border-width:7px 7px 0;border-top-color:var(--stt-arrow-color)}.stt-bubble.top>.stt-arrow::after{top:1px;border-width:7px 7px 0;border-top-color:var(--post-tooltip-border-color);z-index:-1}.stt-bubble.bottom>.stt-arrow{bottom:100%}.stt-bubble.bottom>.stt-arrow::before{bottom:0;border-width:0 7px 7px;border-bottom-color:var(--stt-arrow-color)}.stt-bubble.bottom>.stt-arrow::after{bottom:1px;border-width:0 7px 7px;border-bottom-color:var(--post-tooltip-border-color);z-index:-1}` +
      `.stt-content>div.artist-info{display:flex;flex-direction:column}.stt-content>div.artist-info>ul{max-height:240px;padding-right:.2rem;margin-bottom:.3rem;text-align:left}.stt-content>div.artist-info li{line-height:1.5;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.stt-bubble div.artist-info>p:last-of-type{display:inline-block;text-align:left;margin:0}.stt-content>div.artist-info>p>span:last-of-type{float:right;margin-right:.3rem;color:var(--muted-text-color)}` +
      `table.stt-favgroup thead tr{border-bottom:2px solid var(--table-header-border-color)}table.stt-favgroup tbody tr{border-bottom:1px solid var(--table-row-border-color)}table.stt-favgroup tbody tr:hover{background:var(--table-row-hover-background)}table.stt-favgroup tr:nth-child(2n){background:var(--table-even-row-background)}table.stt-favgroup td,table.stt-favgroup th{line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:120px;padding-right:.5rem}table.stt-favgroup th{text-align:center}table.stt-favgroup td,table.stt-favgroup th:first-child{text-align:left}` +
      `.categorized-tag-list>h3:has(+ ul:not(:has(.tag-diff-view-removed:not(.tag-diff-view-hidden)))),.categorized-tag-list>ul:not(:has(.tag-diff-view-removed:not(.tag-diff-view-hidden))){display:none}.tag-diff-view-added,.tag-diff-view-removed.tag-diff-view-reversed,.tag-diff-view-unchanged.tag-diff-view-added,table.stt-tdv tr.tdv-added.tdv-selected,table.stt-tdv tr.tdv-added:hover{background-color:var(--wiki-page-versions-diff-ins-background)}.tag-diff-view-added:hover{background-color:color-mix(in srgb,var(--wiki-page-versions-diff-ins-background) 80%,#fff)}.tag-diff-view-added.tag-diff-view-reversed,.tag-diff-view-removed,.tag-diff-view-unchanged.tag-diff-view-removed,table.stt-tdv tr.tdv-removed.tdv-selected,table.stt-tdv tr.tdv-removed:hover{background-color:var(--wiki-page-versions-diff-del-background)}.tag-diff-view-removed:hover{background-color:color-mix(in srgb,var(--wiki-page-versions-diff-del-background) 80%,#fff)}.tag-diff-view-first,.tag-diff-view-unchanged,table.stt-tdv tr.tdv-first.tdv-selected,table.stt-tdv tr.tdv-first:hover{background-color:var(--default-border-color)}.tag-diff-view-first:hover,.tag-diff-view-unchanged:hover{background-color:color-mix(in srgb,var(--default-border-color) 80%,#fff)}.tag-diff-view-dimmed{opacity:.3}.tag-diff-view.tag-diff-view-hidden{background-color:unset}.tag-diff-view-removed.tag-diff-view-hidden{display:none}.stt-bubble:has(.stt-tdv){z-index:1}table.stt-tdv thead tr{border-bottom:2px solid var(--table-header-border-color)}table.stt-tdv tbody tr{cursor:alias}table.stt-tdv :is(td,th){line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:120px;padding-right:.5rem}.tdv-added span{color:var(--forum-topic-status-approved-color)}.tdv-removed span{color:var(--forum-topic-status-new-color)}table.stt-tdv td:first-child,table.stt-tdv th{text-align:center;user-select:none}table.stt-tdv td:nth-child(2){text-align:right}table.stt-tdv td:last-child{text-align:left}table.stt-tdv a.user{display:unset}`
  })
);

// Simple Tooltip v1.0.12 - Forked from [tipso](https://github.com/object505/tipso)
// prettier-ignore
((t,e)=>{const s="stt",i={background:null,titleBackground:null,titleContent:"",width:200,offsetX:0,absoluteY:0,content:null,fetchContentUrl:null,fetchContentBuffer:0,contentElementId:null,useTitle:!1,templateEngineFunc:null,onBeforeShow:null,onShow:null,onHide:null,trigger:"hover"};let n=null,o=0;class h{constructor(n,h){this.element=n,this.$element=t(this.element),this.doc=t(document),this.win=t(e),this.settings={...i,...h,...this.$element.data("stt")},this._title=this.$element.attr("title"),this.mode="hide",this._id=++o,this._ns=`${s}_${this._id}`,this.init()}init(){const t=this.$element;t.addClass("stt-style").removeAttr("title");let e=null,s=null;"hover"===this.settings.trigger&&t.on(`mouseover.${this._ns}`,(t=>{t.ctrlKey||t.altKey||(clearTimeout(e),clearTimeout(s),s=setTimeout((()=>this.show()),150))})).on(`mouseout.${this._ns}`,(()=>{clearTimeout(e),clearTimeout(s),e=setTimeout((()=>this.hide()),150),this.tooltip().on(`mouseenter.${this._ns}`,(()=>{this.mode="tooltipHover"})).on(`mouseleave.${this._ns}`,(()=>{this.mode="show",clearTimeout(e),e=setTimeout((()=>this.hide()),150)})).on(`contextmenu.${this._ns}`,(()=>{this.isContextMenuOpen=!0,this.win.on(`mouseover.${this._ns}`,(t=>{this.tooltip()[0].contains(t.target)||(this.isContextMenuOpen=!1,this.mode="show",this.hide())}))}))})),this.settings.fetchContentUrl&&(this.fetchContent=null)}tooltip(){return this.stt_bubble||(this.stt_bubble=t('<div class="stt-bubble"><div class="stt-title"></div><div class="stt-content"></div><div class="stt-arrow"></div></div>')),this.stt_bubble}async show(){n&&n!==this&&n.hide(!0),n=this;const t=this.tooltip(),e=this.win;if("function"==typeof this.settings.onBeforeShow&&this.settings.onBeforeShow(this.$element,this.element,this),t.css({"--stt-bgcolor":this.settings.background,"--stt-title-bgcolor":this.settings.titleBackground,width:this.settings.width||200}),this.mode="show",t.find(".stt-content").html(await this.content()),t.find(".stt-title").html(this.titleContent()),l(this),e.on(`resize.${this._ns}`,(()=>l(this))),clearTimeout(this.timeout),"hide"===this.mode)return this.hide(!0);this.timeout=setTimeout((()=>{t.appendTo("body").stop(!0,!0).fadeIn(200,(()=>{"function"==typeof this.settings.onShow&&this.settings.onShow(this.$element,this.element,this)})),"manual"===this.settings.trigger&&setTimeout((()=>{e.on(`click.${this._ns}`,(e=>{t[0].contains(e.target)||this.$element[0].contains(e.target)||this.hide(!0)}))}),0)}),200)}hide(t=!1){const e=this.tooltip(),s=t?0:50;clearTimeout(this.timeout),this.timeout=setTimeout((()=>{"tooltipHover"===this.mode||this.isContextMenuOpen||e.stop(!0,!0).fadeOut(200,(()=>{e.remove(),"function"==typeof this.settings.onHide&&"show"===this.mode&&this.settings.onHide(this.$element,this.element,this),this.mode="hide",this.win.off(`.${this._ns}`),n===this&&(n=null)}))}),s)}close(){this.hide(!0)}destroy(){this.$element.off(`.${this._ns}`).removeData(s).removeClass("stt-style").attr("title",this._title),this.win.off(`.${this._ns}`)}titleContent(){return this.settings.titleContent||this.$element.data("stt-title")}async content(){let e;return this.settings.fetchContentUrl?this._fetchContent?e=this._fetchContent:(e=await(await fetch(this.settings.fetchContentUrl)).text(),this.settings.fetchContentBuffer>0?(this._fetchContent=e,setTimeout((()=>{this._fetchContent=null}),this.settings.fetchContentBuffer)):this._fetchContent=null):e=this.settings.contentElementId?t(`#${this.settings.contentElementId}`).text():this.settings.content?this.settings.content:this.settings.useTitle?this._title:this.$element.data("stt"),this.settings.templateEngineFunc&&(e=this.settings.templateEngineFunc(e,this)),e}update(t,e){if(!e)return this.settings[t];this.settings[t]=e}}function l(e){const s=e.tooltip(),i=e.$element,n=t(window);let{width:o,height:h}=function(t){const e=t.clone().css("visibility","hidden").appendTo("body"),s=e.outerHeight(),i=e.outerWidth();return e.remove(),{width:i,height:s}}(s),l=i.offset().left+i.outerWidth()/2-o/2+e.settings.offsetX,r=i.offset().top-h-10-e.settings.absoluteY;const u=e.titleContent()?"var(--stt-title-bgcolor)":"var(--stt-bgcolor)";if(s.find(".stt-arrow").css({marginLeft:-7,marginTop:""}),r<n.scrollTop()?(r=i.offset().top+i.outerHeight()+10+e.settings.absoluteY,s.css({"--stt-arrow-color":u}).removeClass("top bottom").addClass("bottom")):s.css({"--stt-arrow-color":"var(--stt-bgcolor)"}).removeClass("top bottom").addClass("top"),l<n.scrollLeft()&&(s.find(".stt-arrow").css({marginLeft:l-7}),l=10),l+o>n.innerWidth()){const t=n.innerWidth()-(l+o);s.find(".stt-arrow").css({marginLeft:-t-7,marginTop:""}),l+=t-10}s.css({left:l,top:r})}t.fn[s]=function(e){if("object"==typeof e||void 0===e)return this.each((function(){t.data(this,`plugin_${s}`)||t.data(this,`plugin_${s}`,new h(this,e))}));if("string"==typeof e&&"_"!==e[0]&&"init"!==e){let i;return this.each((function(){const n=t.data(this,`plugin_${s}`);n instanceof h&&"function"==typeof n[e]&&(i=n[e].apply(n,Array.prototype.slice.call(arguments,1))),"destroy"===e&&t.data(this,`plugin_${s}`,null)})),void 0!==i?i:this}}})(jQuery,"undefined"!=typeof unsafeWindow&&unsafeWindow&&unsafeWindow!==window?unsafeWindow:window)

const globalTooltipConfig = [
  {
    selector: ".tag-type-1 a, a.dtext-wiki-link.tag-type-1, a.dtext-artist-id-link",
    options: {
      width: 360,
      fetchContentBuffer: 15e3,
      onBeforeShow: (_, el, instance) => {
        const url = new URL(el.href);
        const artist = url.searchParams.get("name") || url.searchParams.get("tags");
        if (artist) {
          return instance.update("fetchContentUrl", `/artists/show_or_new?name=${artist}`);
        } else if (url.pathname.startsWith("/artists/")) {
          const uid = url.pathname.slice(9);
          if (/^\d+$/.test(uid)) {
            return instance.update("fetchContentUrl", `/artists/${uid}`);
          }
        }
        instance.destroy();
      },
      templateEngineFunc: content => {
        const doc = new DOMParser().parseFromString(content, "text/html");
        const uid = doc.body.dataset.artistId;
        const name = doc.querySelector("a.tag-type-1")?.innerText?.replace(/ /g, "_");
        const count = doc.querySelector("div#a-show span.post-count")?.innerText;
        let p = `<p><a target="_blank" href="/artists/${uid}/edit">Edit artist</a>`;
        if (uid === "null") p = `<p><a target="_blank" href="/artists/new?artist%5Bname%5D=${name}">Create New</a>`;
        p += `&nbsp;|&nbsp;<a target="_blank" href="/post_versions?search%5Bchanged_tags%5D=${name}">Post Changes</a><span>`;
        if (count && count !== "0") p += `<a target="_blank" class="inactive-link" href="/posts?tags=status%3Aany+${name}">${count}</a>`;
        if (uid !== "null") p += `,&nbsp;<a target="_blank" class="inactive-link" href="/artist_versions?search%5Bartist_id%5D=${uid}">0</a></span>`;
        p += "</p>";
        const ul = doc.querySelector("div#a-show > *:not(.artist-wiki):not(.recent-posts) ul:not(#blacklist-list)");
        if (ul) {
          ul.classList.add("thin-scrollbar", "text-xs");
          let lis = ul.children;
          let activeCount = Array.prototype.filter.call(lis, li => !li.children[1].classList.contains("inactive-artist-url")).length;
          ul.querySelectorAll("a").forEach(a => a.setAttribute("target", "_blank"));
          return `<div class="artist-info">${ul.outerHTML}${p.replace(">0</a></span>", `>${activeCount}/${lis.length}</a></span>`)}</div>`;
        } else if (!name) {
          const p = doc.querySelector("div#page>p").textContent;
          return `<div class="artist-info"><p class="m-0 py-1 text-sm" style="text-align:center"><i>${p}</i></p></div>`;
        } else {
          const text = uid === "null" ? "No artist entry yet" : "No URLs yet";
          return `<div class="artist-info"><p class="m-0 py-1 text-sm"><i>${text}</i></p>${p}</div>`;
        }
      }
    }
  },
  {
    selector: "a.dtext-media-asset-id-link",
    options: {
      width: "auto",
      fetchContentBuffer: 15e3,
      onBeforeShow(_, el, instance) {
        const assetId = el.innerText.split("#")?.[1];
        if (assetId && /^\d+$/.test(assetId)) {
          instance.tooltip().css({ "min-width": "max-content" });
          instance.tooltip().find(".stt-title").css({
            padding: "0 1rem",
            display: "flex",
            "flex-direction": "row",
            "justify-content": "center",
            "align-items": "center",
            gap: ".2rem",
            height: "1.3rem"
          });
          return instance.update("fetchContentUrl", `/media_assets/${assetId}.json?only=md5,file_ext,file_size,image_width,image_height,duration,variants,post[id]`);
        }
        instance.destroy();
      },
      templateEngineFunc: (content, instance) => {
        let { md5, file_ext, file_size, image_width, image_height, duration, variants, post, error, message } = JSON.parse(content);
        file_size = formatBytes(file_size);
        duration = duration ? ` (${secondsToMinutes(duration)})` : "";
        let title = '<a target="_blank" class="inactive-link text-xs"';
        let meta = `${file_size} .${file_ext}, ${image_width}×${image_height}${duration}`;
        if (md5) {
          const url = variants.filter(s => s.type === "original")[0].url;
          title += ` href="${url}">${meta}`;
        } else title += error ? `>Error: ${error}` : `><s>${meta}</s>`;
        title += "</a>";
        const postId = post?.id;
        if (postId) {
          let src = md5
            ? "https://cdn.donmai.us/original/10/97/1097ebd471c28b70b4181f2dc1d44ca6.webp"
            : "https://cdn.donmai.us/original/69/3b/693ba3d904804b7e26ad1b0d831e64c9.png";
          title += `&nbsp;<a target="_blank" href="/posts/${postId}"><img class="icon h-3" src="${src}"></a>`;
        }
        instance.update("titleContent", title);
        if (!md5) return `<p class="m-0 py-1 text-sm"><i>${message || "Image unavailable."}</i></p>`;
        else {
          const { url, height } = variants.filter(s => s.type.startsWith(String(ASSET_PREVIEW_SIZE)))[0];
          return `<div class="stt-preview-container"><img style="height:${Math.min(DISPLAY_IMAGE_HEIGHT, height)}px" src="${url}"></div>`;
        }
      }
    }
  }
];

function bindTooltipsToElements(container = document) {
  globalTooltipConfig.forEach(({ selector, options }) => {
    $(selector).each(function () {
      if (!$.data(this, "plugin_stt")) {
        $(this).stt(options);
      }
    });
  });
  isMobile && touchScreenTooltipFixer(container);
}

function hookDtextPreview() {
  const fn = Danbooru.DTextEditor.prototype.html;
  Danbooru.DTextEditor.prototype.html = async function () {
    const html = await fn.apply(this, arguments);
    setTimeout(() => bindTooltipsToElements(arguments[3]));
    return html;
  };
}

bindTooltipsToElements();
hookDtextPreview();

const { action, controller } = document.body.dataset;

if (controller === "posts" && action === "show") {
  {
    const postId = document.body?.dataset.postId || document.head.querySelector("meta[name='post-id']").getAttribute("content");
    fetch("/favorite_groups.json?only=id,name,creator&limit=100&search%5Bpost_ids_include_all%5D=" + postId)
      .then(resp => resp.json())
      .then(json => {
        if (Array.isArray(json)) {
          let len = json.length;
          len = len === 100 ? len + "+" : len;
          if (len !== 0)
            document
              .getElementById("post-info-favorites")
              ?.insertAdjacentHTML(
                "afterend",
                `<li id="post-info-favgroups">Favgroups: <a href="/favorite_groups?search%5Bpost_ids_include_all%5D=${postId}" target="_blank">${len}</a></li>`
              );
          $("li#post-info-favgroups > a").stt({
            width: "auto",
            content: json,
            fetchContentBuffer: 15e3,
            templateEngineFunc: (content, instance) => {
              instance.tooltip().find(".stt-content").css({
                overflow: "hidden auto",
                "max-height": "240px",
                "overscroll-behavior-x": "contain",
                "scrollbar-width": "thin"
              });
              let html = '<table class="stt-favgroup text-xs"><thead><tr><th>Group</th><th>User</th></tr></thead><tbody>';
              for (let {
                id,
                name,
                creator: { id: uid, level_string, name: un, level }
              } of content) {
                html += `<tr><td><a href="/favorite_groups/${id}" target="_blank">${name}</a></td><td><a class="user user-${level_string.toLowerCase()}"  data-user-id="${uid}" data-user-name="${un}" data-user-level="${level}" href="/users/${uid}" target="_blank">${un.replaceAll("_", " ")}</a></td></tr>`;
              }
              html += "</tbody></table>";
              return html;
            }
          });
          isMobile && touchScreenTooltipFixer("li#post-info-favgroups");
        }
      });
  }
  {
    const TDV = {
      CAT: {
        0: "General",
        1: "Artist",
        3: "Copyright",
        4: "Character",
        5: "Meta"
      },
      TAG_STATUS: {
        added: 1,
        unchanged: 0,
        removed: -1
      },
      completed: false,
      mode: 0
    };

    TDV.VERSION_CACHE = [];
    TDV.TAG_CACHE = {};
    TDV.TAG_HISTORY = {};
    TDV.VERSION_COUNT = 0;

    TDV.initialize = async function () {
      this.postId = document.body?.dataset.postId || document.head.querySelector("meta[name='post-id']").getAttribute("content");
      this.tagList = document.querySelector("section#tag-list>div.categorized-tag-list");
      // Add dataset for sort
      for (const li of this.tagList.querySelectorAll("li[data-tag-name]")) {
        const tag = li.dataset.tagName;
        if (li.querySelector("span.nested-tag-icon")) li.dataset.orderName = `${li.previousElementSibling.dataset.orderName},${tag}`;
        else li.dataset.orderName = tag;
      }
      // Add version element
      await this.fetchVersionData();
      if (this.VERSION_COUNT > 1) {
        this.classifyVersionData();
        this.applyDiff();
        this.showDiff();
        this.showVersionCount();
        this.loadTooltip();
        this.mode = 1;
        this.tagList.addEventListener("click", async e => {
          let el = e.target;
          if (el.tagName !== "LI" && el.parentElement.tagName === "LI") el = el.parentElement;
          if (el.classList.contains("tag-diff-view") && !el.classList.contains("tag-diff-view-hidden")) await $(el).stt("show");
        });
      }
    };

    TDV.showVersionCount = function () {
      const { version, updated_at } = this.VERSION_CACHE[0];
      const li = createElement("li", { id: "post-info-version", title: `Latest update: ${updated_at}` });
      const a1 = createElement("a", { href: `/post_versions?search%5Bpost_id%5D=${this.postId}`, target: "_blank", textContent: version });
      const a2 = createElement("a", { href: "#", classList: "fineprint", textContent: "Show more" });
      li.append("Versions: ", a1, " ", a2);
      document.getElementById("post-info-status").after(li);
      a2.addEventListener("click", async e => {
        e.preventDefault();
        switch (this.mode) {
          case 0:
            this.showDiff(this.completed);
            this.mode = this.completed ? 2 : 1;
            a2.textContent = this.completed ? "Hide diffs" : "Show details";
            break;
          case 1:
            a2.style.opacity = "0.6";
            a2.textContent = "Fetching details...";
            await this.loadMore();
            a2.style.opacity = "";
            if (this.completed) {
              this.showDiff(true);
              this.loadTooltip();
              this.mode = 2;
              a2.textContent = "Hide diffs";
            }
            break;
          case 2:
            this.hideDiff();
            this.mode = 0;
            a2.textContent = this.completed ? "Show details" : "Show added";
        }
      });
    };

    TDV.applyStyle = () => {
      document.head.append(
        createElement("style", {
          textContent: `.categorized-tag-list>h3:has(+ ul:not(:has(.tag-diff-view-removed:not(.tag-diff-view-hidden)))),.categorized-tag-list>ul:not(:has(.tag-diff-view-removed:not(.tag-diff-view-hidden))){display:none}.tag-diff-view-added,.tag-diff-view-removed.tag-diff-view-reversed,.tag-diff-view-unchanged.tag-diff-view-added,table.stt-tdv tr.tdv-added.tdv-selected,table.stt-tdv tr.tdv-added:hover{background-color:var(--wiki-page-versions-diff-ins-background)}.tag-diff-view-added:hover{background-color:color-mix(in srgb,var(--wiki-page-versions-diff-ins-background) 80%,#fff)}.tag-diff-view-added.tag-diff-view-reversed,.tag-diff-view-removed,.tag-diff-view-unchanged.tag-diff-view-removed,table.stt-tdv tr.tdv-removed.tdv-selected,table.stt-tdv tr.tdv-removed:hover{background-color:var(--wiki-page-versions-diff-del-background)}.tag-diff-view-removed:hover{background-color:color-mix(in srgb,var(--wiki-page-versions-diff-del-background) 80%,#fff)}.tag-diff-view-first,.tag-diff-view-unchanged,table.stt-tdv tr.tdv-first.tdv-selected,table.stt-tdv tr.tdv-first:hover{background-color:var(--default-border-color)}.tag-diff-view-first:hover,.tag-diff-view-unchanged:hover{background-color:color-mix(in srgb,var(--default-border-color) 80%,#fff)}.tag-diff-view-dimmed{opacity:.3}.tag-diff-view.tag-diff-view-hidden{background-color:unset}.tag-diff-view-removed.tag-diff-view-hidden{display:none}.stt-bubble:has(.stt-tdv){z-index:1}table.stt-tdv thead tr{border-bottom:2px solid var(--table-header-border-color)}table.stt-tdv tbody tr{cursor:alias}table.stt-tdv :is(td,th){line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:120px;padding-right:.5rem}.tdv-added span{color:var(--forum-topic-status-approved-color)}.tdv-removed span{color:var(--forum-topic-status-new-color)}table.stt-tdv td:first-child,table.stt-tdv th{text-align:center;user-select:none}table.stt-tdv td:nth-child(2){text-align:right}table.stt-tdv td:last-child{text-align:left}`
        })
      );
    };

    TDV.loadMore = async function () {
      if (this.completed) return;
      try {
        if (this.VERSION_COUNT > 21) {
          this.VERSION_CACHE.splice(-1, 1);
          await this.fetchVersionData(this.VERSION_CACHE[19].id);
          this.classifyVersionData();
          this.applyDiff();
        }
        await this.fillTagCache();
        this.insertTagElements();
        this.completed = true;
      } catch (e) {
        console.warn(e);
      }
    };

    TDV.fetchVersionData = async function (lastVersionId) {
      let url = "/post_versions.json?type=current&only=id,added_tags,removed_tags,version,updated_at,updater[id,name,level_string,is_banned]&search[post_id]=" + TDV.postId;
      if (lastVersionId === -1) {
        url += "&search[version]=1";
      } else if (lastVersionId) {
        url += "&limit=200&page=b" + lastVersionId;
      }
      return $.get(url).then(json => {
        this.VERSION_CACHE.push(...json);
        if (lastVersionId === -1) {
          // ⚠ The version order of earlier posts is out of sequence.
          this.VERSION_CACHE.sort((a, b) => b.version - a.version);
          return true;
        } else if (lastVersionId) {
          if (this.VERSION_CACHE.length === this.VERSION_COUNT) {
            this.VERSION_CACHE.sort((a, b) => b.version - a.version);
            return true;
          } else return this.fetchVersionData(json[199].id);
        } else {
          this.VERSION_COUNT = json[0].version;
          if (this.VERSION_COUNT > 20) return this.fetchVersionData(-1);
        }
      });
    };

    TDV.fillTagCache = async function () {
      const tags = new Set();
      for (let { removed_tags } of this.VERSION_CACHE) {
        for (let tag of removed_tags) {
          if (tag in this.TAG_CACHE) return;
          tags.add(tag);
        }
      }
      if (tags.size) {
        const chunkSize = 1000;
        const tagsArray = [...tags];
        for (let i = 0; i < tagsArray.length; i += chunkSize) {
          const chunk = tagsArray.slice(i, i + chunkSize);
          const resp = await $.post("/tags.json", {
            _method: "get",
            limit: chunkSize,
            only: "name,post_count,category,is_deprecated",
            search: { name_array: chunk }
          });
          const tagData = Object.fromEntries(resp.map(tag => [tag.name, tag]));
          for (const tagName of chunk) {
            this.TAG_CACHE[tagName] = tagData[tagName] ?? {
              name: tagName,
              post_count: 0,
              category: 0,
              is_deprecated: false
            };
          }
        }
      }
    };

    TDV.classifyVersionData = function () {
      this.TAG_HISTORY = {};
      this.TAG_ADDED = new Set();
      this.TAG_UNCHANGED = new Set();
      this.TAG_REMOVED = new Set();
      // post #1 version 1 updater: null
      for (let { added_tags, removed_tags, id, version, updater, updated_at } of this.VERSION_CACHE) {
        if (!updater) updater = { id: 0, name: "?", level_string: "Member", is_banned: false };
        const _detail = { id, version, updater, updated_at };
        for (let tag of added_tags) {
          if (version === 1) {
            if (this.TAG_HISTORY[tag] && this.TAG_HISTORY[tag]) {
              this.TAG_HISTORY[tag].details.push({ status: 0, ..._detail });
              this.TAG_HISTORY[tag].versions.set(version, 0);
              this.TAG_UNCHANGED.add(tag);
            }
          } else {
            const detail = { status: 1, ..._detail };
            if (this.TAG_HISTORY[tag]) {
              this.TAG_HISTORY[tag].details.push(detail);
              this.TAG_HISTORY[tag].versions.set(version, 1);
            } else {
              this.TAG_HISTORY[tag] = { details: [detail] };
              this.TAG_HISTORY[tag].versions = new Map([[version, 1]]);
              this.TAG_ADDED.add(tag);
            }
          }
        }
        this.TAG_ADDED = this.TAG_ADDED.difference(this.TAG_UNCHANGED);
        for (let tag of removed_tags) {
          const detail = { status: -1, ..._detail };
          if (this.TAG_HISTORY[tag]) {
            this.TAG_HISTORY[tag].details.push(detail);
            this.TAG_HISTORY[tag].versions.set(version, -1);
          } else {
            this.TAG_HISTORY[tag] = { details: [detail] };
            this.TAG_HISTORY[tag].versions = new Map([[version, -1]]);
            this.TAG_REMOVED.add(tag);
          }
        }
      }
    };

    TDV.renderNumber = n => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1, maximumSignificantDigits: 2 }).format(n).replace("K", "k");

    TDV.createTagElement = function (tag) {
      const info = this.TAG_CACHE[tag];
      const li = createElement("li", {
        classList: `flex tag-type-${info.category} tag-diff-view tag-diff-view-removed tag-diff-view-hidden`,
        dataset: { isDeprecated: info.is_deprecated, tagName: tag }
      });
      const span1 = createElement("span", { classList: "mr-2" });
      const span2 = createElement("span");
      const span3 = createElement("span", { classList: "post-count", title: info.post_count, textContent: this.renderNumber(info.post_count) });
      const a1 = createElement("a", { class: "wiki-link", href: "/wiki_pages/" + tag, textContent: "?" });
      const a2 = createElement("a", { classList: "search-tag", href: "/posts?tags=" + tag, textContent: tag.replaceAll("_", " ") });
      span1.append(a1);
      span2.append(a2, " ", span3);
      li.append(span1, span2);
      return li;
    };

    TDV.insertTagElements = function () {
      const removedTagElements = {};
      for (const tag of this.TAG_REMOVED) {
        const cat = this.TAG_CACHE[tag].category;
        if (removedTagElements[cat]) removedTagElements[cat].push(this.createTagElement(tag));
        else removedTagElements[cat] = [this.createTagElement(tag)];
      }
      for (const cat in removedTagElements) {
        const catName = this.CAT[cat];
        const className = catName.toLowerCase() + "-tag-list";
        let ul = this.tagList.querySelector("ul." + className);
        if (!ul) {
          const h3 = createElement("h3", { classList: className, textContent: catName });
          ul = createElement("ul", { classList: className });
          this.tagList.append(h3, ul);
        }
        ul.append(...removedTagElements[cat]);
        [...ul.children]
          .sort((a, b) => {
            const _a = a.dataset.orderName || a.dataset.tagName;
            const _b = b.dataset.orderName || b.dataset.tagName;
            if (_a > _b) return 1;
            if (_a < _b) return -1;
            return 0;
          })
          .forEach(n => ul.appendChild(n));
      }
    };

    TDV.applyDiff = function () {
      for (const tag of this.TAG_ADDED) {
        this.tagList.querySelectorAll(`li[data-tag-name="${tag}"]`).forEach(li => li.classList.add("tag-diff-view", "tag-diff-view-added"));
      }
      for (const tag of this.TAG_UNCHANGED) {
        this.tagList.querySelectorAll(`li[data-tag-name="${tag}"]`).forEach(li => li.classList.add("tag-diff-view", "tag-diff-view-unchanged"));
      }
    };

    TDV.showDiff = function (details = false) {
      let selector = ".tag-diff-view-added, .tag-diff-view-unchanged";
      if (details) selector += ", .tag-diff-view-removed";
      this.tagList.querySelectorAll(selector).forEach(li => li.classList.remove("tag-diff-view-hidden"));
    };

    TDV.hideDiff = function () {
      this.tagList.querySelectorAll(".tag-diff-view").forEach(li => li.classList.add("tag-diff-view-hidden"));
    };

    TDV.loadTooltip = function () {
      $("div.categorized-tag-list li.tag-diff-view:not(stt-style)").stt({
        width: "auto",
        offsetX: 80,
        absoluteY: -10,
        trigger: "manual",
        templateEngineFunc: (_, instance) => {
          instance.tooltip().find(".stt-content").css({
            overflow: "hidden auto",
            "max-height": "240px",
            "overscroll-behavior-x": "contain",
            "scrollbar-width": "thin"
          });
          const tag = instance.element.dataset.tagName;
          const { details } = this.TAG_HISTORY[tag];
          let html = '<table class="text-xs stt-tdv"><thead><tr><th></th><th>Ver</th><th>Updater</th></tr></thead><tbody>';
          for (let {
            id,
            status,
            version,
            updater: { id: uid, name: un, level_string, is_banned },
            updated_at
          } of details) {
            if (status === 0) {
              html += `<tr data-version="1" class="tdv-first"><td><span> </span></td><td><span title="${updated_at}">1 <a href="/post_versions?search[id]=${id}" target="_blank">»</a></span></td>`;
            } else {
              const className = status === 1 ? "tdv-added" : "tdv-removed";
              html += `<tr data-version="${version}" class="${className}"><td><span>${status === 1 ? "+" : "-"}</span></td><td><span title="${updated_at}">${version} <a href="/post_versions?search[id]=${id}" target="_blank">»</a></span></td>`;
            }
            if (uid === 0) html += `<td><i>Anonymous</i></td></tr>`;
            else {
              html += `<td><a class="user user-${level_string.toLowerCase() + (is_banned ? " user-banned" : "")}"  data-user-id="${uid}" data-user-name="${un}" href="/users/${uid}" target="_blank">${un.replaceAll("_", " ")}</a></td></tr>`;
            }
          }
          html += "</tbody></table>";
          return html;
        },
        onShow: (_, __, instance) => {
          instance
            .tooltip()
            .find(".stt-tdv>tbody")
            .on("click", e => {
              const el = e.target;
              const tbody = e.currentTarget;
              if (el.tagName === "A") return;
              const tr = el.closest("tr");
              const lastSelected = tbody.dataset.lastSelected;
              if (lastSelected) {
                const tr = tbody.querySelector(`tr[data-version="${lastSelected}"]`);
                tr.classList.remove("tdv-selected");
              }
              this.tagList.querySelectorAll("li.tag-diff-view").forEach(li => {
                li.classList.remove("tag-diff-view-dimmed", "tag-diff-view-reversed", "tag-diff-view-first");
                if (li.classList.contains("tag-diff-view-unchanged")) li.classList.remove("tag-diff-view-added", "tag-diff-view-removed");
              });
              let currentVersion = tr.dataset.version;
              if (currentVersion === lastSelected || (this.mode === 1 && tr.classList.contains("tdv-removed"))) {
                delete tbody.dataset.lastSelected;
                return;
              }
              tbody.dataset.lastSelected = currentVersion;
              currentVersion = Number(currentVersion);
              tr.classList.add("tdv-selected");
              this.tagList.querySelectorAll("li.tag-diff-view").forEach(li => {
                const tag = li.dataset.tagName;
                const { versions, details } = this.TAG_HISTORY[tag];
                if (versions.has(currentVersion)) {
                  li.classList.remove("tag-diff-view-dimmed");
                  const status = versions.get(currentVersion);
                  if (status === 0) li.classList.add("tag-diff-view-first");
                  else if (li.classList.contains("tag-diff-view-unchanged")) li.classList.add(status === 1 ? "tag-diff-view-added" : "tag-diff-view-removed");
                  else if (details[0].status === -status) li.classList.add("tag-diff-view-reversed");
                } else {
                  li.classList.add("tag-diff-view-dimmed");
                  li.classList.remove("tag-diff-view-reversed", "tag-diff-view-first");
                }
              });
            });
        },
        onHide: (_, __, instance) => {
          const tbody = instance.tooltip().find(".stt-tdv>tbody")[0];
          const lastSelected = tbody.dataset.lastSelected;
          tbody.querySelector(`tr[data-version="${lastSelected}"]`)?.classList.remove("tdv-selected");
          this.tagList.querySelectorAll("li.tag-diff-view").forEach(li => {
            li.classList.remove("tag-diff-view-dimmed", "tag-diff-view-reversed", "tag-diff-view-first");
            if (li.classList.contains("tag-diff-view-unchanged")) li.classList.remove("tag-diff-view-added", "tag-diff-view-removed");
          });
        }
      });
    };

    TDV.initialize();
  }
}

function touchScreenTooltipFixer(container) {
  $(container)
    .find("a.stt-style")
    .on("click", function (event) {
      const el = event.currentTarget;
      if (!el.dataset.focused) {
        event.preventDefault();
        el.dataset.focused = "true";
        el.addEventListener(
          "blur",
          () => {
            delete el.dataset.focused;
          },
          { once: true }
        );
      }
    });
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const units = ["Bytes", "KB", "MB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  const formattedValue = value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
  return `${formattedValue} ${units[i]}`;
}

function secondsToMinutes(seconds) {
  const minutes = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(sec).padStart(2, "0")}`.slice(0, 5);
}
