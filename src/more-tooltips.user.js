// ==UserScript==
// @name          More Tooltips
// @author        Sibyl
// @version       1.6
// @icon          https://cdn.jsdelivr.net/gh/notsibyl/danbooru@main/danbooru.svg
// @namespace     https://danbooru.donmai.us/forum_posts?search[creator_id]=817128&search[topic_id]=8502
// @homepageURL   https://github.com/notsibyl/danbooru
// @downloadURL   https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/more-tooltips.user.js
// @updateURL     https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/more-tooltips.user.js
// @match         *://*.donmai.us/*
// @exclude-match *://cdn.donmai.us/*
// @grant         GM_addStyle
// @run-at        document-end
// // ==/UserScript==

// Media assets preview settings
const ASSET_PREVIEW_SIZE = 360; // 180, 720
const DISPLAY_IMAGE_HEIGHT = 240;

if (!globalThis.unsafeWindow) globalThis.unsafeWindow = window;
const isMobile = window.matchMedia("(max-width: 660px)").matches;

GM_addStyle(
  `.stt-bubble,.stt-bubble>.stt-arrow{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box}.stt-bubble{--stt-bgcolor:var(--post-tooltip-background-color);--stt-title-bgcolor:var(--post-tooltip-header-background-color);--stt-arrow-color:var(--stt-bgcolor);background:var(--stt-bgcolor);border:1px solid var(--post-tooltip-border-color);position:absolute;text-align:center;border-radius:4px;z-index:9999;box-shadow:var(--shadow-lg)}.stt-style{cursor:help;border-bottom:1px dotted}.stt-bubble .stt-title{background:var(--stt-title-bgcolor);font-size:10px;border-radius:3px 3px 0 0}.stt-content{word-wrap:break-word;padding:.5em}.stt-bubble>.stt-arrow{position:absolute;border-width:0;pointer-events:none;left:50%;margin-left:0}.stt-bubble>.stt-arrow::after,.stt-bubble>.stt-arrow::before{content:'';position:absolute;left:0;border-style:solid;border-color:transparent}.stt-bubble.top>.stt-arrow{top:100%}.stt-bubble.top>.stt-arrow::before{top:0;border-width:7px 7px 0;border-top-color:var(--stt-arrow-color)}.stt-bubble.top>.stt-arrow::after{top:1px;border-width:7px 7px 0;border-top-color:var(--post-tooltip-border-color);z-index:-1}.stt-bubble.bottom>.stt-arrow{bottom:100%}.stt-bubble.bottom>.stt-arrow::before{bottom:0;border-width:0 7px 7px;border-bottom-color:var(--stt-arrow-color)}.stt-bubble.bottom>.stt-arrow::after{bottom:1px;border-width:0 7px 7px;border-bottom-color:var(--post-tooltip-border-color);z-index:-1}` +
    `.stt-content>div.artist-info{display:flex;flex-direction:column}.stt-content>div.artist-info>ul{max-height:240px;padding-right:.2rem;margin-bottom:.3rem;text-align:left}.stt-content>div.artist-info li{line-height:1.5;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.stt-bubble div.artist-info>p:last-of-type{display:inline-block;text-align:left;margin:0}.stt-content>div.artist-info>p>span:last-of-type{float:right;margin-right:.3rem;color:var(--muted-text-color)}` +
    `table.stt-favgroup thead tr{border-bottom:2px solid var(--table-header-border-color)}table.stt-favgroup tbody tr{border-bottom:1px solid var(--table-row-border-color)}table.stt-favgroup tbody tr:hover{background:var(--table-row-hover-background)}table.stt-favgroup tr:nth-child(2n){background:var(--table-even-row-background)}table.stt-favgroup td,table.stt-favgroup th{line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:120px;padding-right:.5rem}table.stt-favgroup th{text-align:center}table.stt-favgroup td,table.stt-favgroup th:first-child{text-align:left}`
);

// Simple Tooltip v1.0.10 - Forked from [tipso](https://github.com/object505/tipso)
// prettier-ignore
((t,e)=>{const i="stt",s={background:null,titleBackground:null,titleContent:"",width:200,content:null,fetchContentUrl:null,fetchContentBuffer:0,contentElementId:null,useTitle:!1,templateEngineFunc:null,onBeforeShow:null,onShow:null,onHide:null};class n{constructor(i,n){this.element=i,this.$element=t(this.element),this.doc=t(document),this.win=t(e),this.settings={...s,...n,...this.$element.data("stt")},this._title=this.$element.attr("title"),this.mode="hide",this.init()}init(){const t=this.$element;t.addClass("stt-style").removeAttr("title");let e=null,s=null;t.on(`mouseover.${i}`,(t=>{t.ctrlKey||t.altKey||(clearTimeout(e),clearTimeout(s),s=setTimeout((()=>this.show()),150))})).on(`mouseout.${i}`,(()=>{clearTimeout(e),clearTimeout(s),e=setTimeout((()=>this.hide()),150),this.tooltip().on(`mouseenter.${i}`,(()=>{this.mode="tooltipHover"})).on(`mouseleave.${i}`,(()=>{this.mode="show",clearTimeout(e),e=setTimeout((()=>this.hide()),150)})).on(`contextmenu.${i}`,(()=>{this.isContextMenuOpen=!0,this.win.on(`mouseover.${i}`,(t=>{this.tooltip()[0].contains(t.target)||(this.isContextMenuOpen=!1,this.mode="show",this.hide())}))}))})),this.settings.fetchContentUrl&&(this.fetchContent=null)}tooltip(){return this.stt_bubble||(this.stt_bubble=t('<div class="stt-bubble"><div class="stt-title"></div><div class="stt-content"></div><div class="stt-arrow"></div></div>')),this.stt_bubble}async show(){const t=this.tooltip(),e=this.win;"function"==typeof this.settings.onBeforeShow&&this.settings.onBeforeShow(this.$element,this.element,this);const s=this.settings.width?{width:this.settings.width}:{width:200};if(t.css({"--stt-bgcolor":this.settings.background,"--stt-title-bgcolor":this.settings.titleBackground,...s}),this.mode="show",t.find(".stt-content").html(await this.content()),t.find(".stt-title").html(this.titleContent()),o(this),e.on(`resize.${i}`,(()=>o(this))),clearTimeout(this.timeout),"hide"===this.mode)return this.hide(!0);this.timeout=setTimeout((()=>{t.appendTo("body").stop(!0,!0).fadeIn(200,(()=>{"function"==typeof this.settings.onShow&&this.settings.onShow(this.$element,this.element,this)}))}),200)}hide(t=!1){const e=this.tooltip(),s=t?0:50;clearTimeout(this.timeout),this.timeout=setTimeout((()=>{"tooltipHover"===this.mode||this.isContextMenuOpen||e.stop(!0,!0).fadeOut(200,(()=>{e.remove(),"function"==typeof this.settings.onHide&&"show"===this.mode&&this.settings.onHide(this.$element,this.element,this),this.mode="hide",this.win.off(`.${i}`)}))}),s)}close(){this.hide(!0)}destroy(){this.$element.off(`.${i}`).removeData(i).removeClass("stt-style").attr("title",this._title),this.win.off(`.${i}`)}titleContent(){return this.settings.titleContent||this.$element.data("stt-title")}async content(){let e;return this.settings.fetchContentUrl?this._fetchContent?e=this._fetchContent:(e=await(await fetch(this.settings.fetchContentUrl)).text(),this.settings.fetchContentBuffer>0?(this._fetchContent=e,setTimeout((()=>{this._fetchContent=null}),this.settings.fetchContentBuffer)):this._fetchContent=null):e=this.settings.contentElementId?t(`#${this.settings.contentElementId}`).text():this.settings.content?this.settings.content:this.settings.useTitle?this._title:this.$element.data("stt"),this.settings.templateEngineFunc&&(e=this.settings.templateEngineFunc(e,this)),e}update(t,e){if(!e)return this.settings[t];this.settings[t]=e}}function o(e){const i=e.tooltip(),s=e.$element,n=t(window);let{width:o,height:h}=function(t){const e=t.clone().css("visibility","hidden").appendTo("body"),i=e.outerHeight(),s=e.outerWidth();return e.remove(),{width:s,height:i}}(i),l=s.offset().left+s.outerWidth()/2-o/2,r=s.offset().top-h-10;const c=e.titleContent()?"var(--stt-title-bgcolor)":"var(--stt-bgcolor)";if(i.find(".stt-arrow").css({marginLeft:-7,marginTop:""}),r<n.scrollTop()?(r=s.offset().top+s.outerHeight()+10,i.css({"--stt-arrow-color":c}).removeClass("top bottom").addClass("bottom")):i.css({"--stt-arrow-color":"var(--stt-bgcolor)"}).removeClass("top bottom").addClass("top"),l<n.scrollLeft()&&(i.find(".stt-arrow").css({marginLeft:l-7}),l=10),l+o>n.innerWidth()){const t=n.innerWidth()-(l+o);i.find(".stt-arrow").css({marginLeft:-t-7,marginTop:""}),l+=t-10}i.css({left:l,top:r})}t.fn[i]=function(e){if("object"==typeof e||void 0===e)return this.each((function(){t.data(this,`plugin_${i}`)||t.data(this,`plugin_${i}`,new n(this,e))}));if("string"==typeof e&&"_"!==e[0]&&"init"!==e){let s;return this.each((function(){const o=t.data(this,`plugin_${i}`);o instanceof n&&"function"==typeof o[e]&&(s=o[e].apply(o,Array.prototype.slice.call(arguments,1))),"destroy"===e&&t.data(this,`plugin_${i}`,null)})),void 0!==s?s:this}}})(jQuery,"undefined"!=typeof unsafeWindow&&unsafeWindow&&unsafeWindow!==window?unsafeWindow:window)

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
        let p = `<p><a target="_blank" href="/artists/${uid}/edit">Edit artist</a>&nbsp;|&nbsp;<a target="_blank" href="/post_versions?search%5Bchanged_tags%5D=${name}">Post Changes</a><span>`;
        if (count && count !== "0") {
          p += `<a target="_blank" class="inactive-link" href="/posts?tags=status%3Aany+${name}">${count}</a>,&nbsp;`;
        }
        p += `<a target="_blank" class="inactive-link" href="/artist_versions?search%5Bartist_id%5D=${uid}">0</a></span></p>`;
        const ul = doc.querySelector("div#a-show > *:not(.artist-wiki) ul:not(#blacklist-list)");
        if (ul) {
          ul.classList.add("thin-scrollbar", "text-xs");
          let lis = ul.children;
          let activeCount = Array.prototype.filter.call(lis, li => !li.children[1].classList.contains("inactive-artist-url")).length;
          ul.querySelectorAll("a").forEach(a => a.setAttribute("target", "_blank"));
          return `<div class="artist-info">${ul.outerHTML}${p.replace(">0</a></span>", `>${activeCount}/${lis.length}</a></span>`)}</div>`;
        } else if (!name) {
          const p = doc.querySelector("div#page>p").textContent;
          return `<div class="artist-info"><p class="m-0 py-1 text-sm" style="text-align:center"><i>${p}</i></p></div>`;
        } else return `<div class="artist-info"><p class="m-0 py-1 text-sm"><i>No URLs yet</i></p>${p}</div>`;
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

const { action, controller } = document.body?.dataset || {};

if (controller === "posts" && action === "show") {
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
              html += `<tr><td><a href="/favorite_groups/${id}" target="_blank">${name}</a></td><td><a class="user user-${level_string.toLowerCase()}"  data-user-id="${uid}" data-user-name="${un}" data-user-level="${level}" href="/users/${uid}" target="_blank">${un}</a></td></tr>`;
            }
            html += "</tbody></table>";
            return html;
          }
        });
        isMobile && touchScreenTooltipFixer("li#post-info-favgroups");
      }
    });
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
