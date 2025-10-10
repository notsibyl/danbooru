// ==UserScript==
// @name          📕🔗🔧
// @author        Sibyl
// @version       1.5
// @icon          https://favicon.is/xiaohongshu.com
// @namespace     https://danbooru.donmai.us/forum_posts?search[creator_id]=817128&search[topic_id]=8502
// @homepageURL   https://github.com/notsibyl/danbooru
// @downloadURL   https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/fix-xhs-link.user.js
// @updateURL     https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/fix-xhs-link.user.js
// @match         https://www.xiaohongshu.com/*
// @grant         GM_registerMenuCommand
// @run-at        document-end
// ==/UserScript==

// Block error logs on xiaohongshu.com:
// -/^Error$/ -url:apm-fe.xiaohongshu.com -url:t2.xiaohongshu.com

(async () => {
  "use strict";

  if (typeof unsafeWindow === "undefined") unsafeWindow = window;

  // Non-standard base64 encode/decode
  // prettier-ignore
  const B64 = {
    _keyStr: "ZmserbBoHQtNP+wOcza/LpngG8yJq42KWYj0DSfdikx3VT16IlUAFM97hECvuRX5",
    encode: function(input) {
      let output="",chr1,chr2,chr3,enc1,enc2,enc3,enc4,i=0;
      input=unescape(encodeURIComponent(input));
      while(i<input.length){
        chr1=input.charCodeAt(i++);
        chr2=input.charCodeAt(i++);
        chr3=input.charCodeAt(i++);
        enc1=chr1>>2;
        enc2=((chr1&3)<<4)|(chr2>>4);
        enc3=((chr2&15)<<2)|(chr3>>6);
        enc4=chr3&63;
        if(isNaN(chr2))enc3=enc4=64;
        else if(isNaN(chr3))enc4=64;
        output+=this._keyStr.charAt(enc1)+this._keyStr.charAt(enc2)+
                this._keyStr.charAt(enc3)+this._keyStr.charAt(enc4);
      }
      return output;
    },
    decode: function(input) {
      let output="",chr1,chr2,chr3,enc1,enc2,enc3,enc4,i=0;
      input=input.replace(/[^A-Za-z0-9\+\/\=]/g,"");
      while(i<input.length){
        enc1=this._keyStr.indexOf(input.charAt(i++));
        enc2=this._keyStr.indexOf(input.charAt(i++));
        enc3=this._keyStr.indexOf(input.charAt(i++));
        enc4=this._keyStr.indexOf(input.charAt(i++));
        chr1=(enc1<<2)|(enc2>>4);
        chr2=((enc2&15)<<4)|(enc3>>2);
        chr3=((enc3&3)<<6)|enc4;
        output+=String.fromCharCode(chr1);
        if(enc3!=64)output+=String.fromCharCode(chr2);
        if(enc4!=64)output+=String.fromCharCode(chr3);
      }
      return decodeURIComponent(escape(output));
    }
  };

  // prettier-ignore
  const MD5=function(){function n(n,t){return n<<t|n>>>32-t}function t(n,t){const r=1073741824&n,u=1073741824&t,e=2147483648&n,o=2147483648&t,f=(1073741823&n)+(1073741823&t);return r&u?2147483648^f^e^o:r|u?1073741824&f?3221225472^f^e^o:1073741824^f^e^o:f^e^o}function r(r,u,e,o,f,c,i){return r=t(r,t(t(function(n,t,r){return n&t|~n&r}(u,e,o),f),i)),t(n(r,c),u)}function u(r,u,e,o,f,c,i){return r=t(r,t(t(function(n,t,r){return n&r|t&~r}(u,e,o),f),i)),t(n(r,c),u)}function e(r,u,e,o,f,c,i){return r=t(r,t(t(function(n,t,r){return n^t^r}(u,e,o),f),i)),t(n(r,c),u)}function o(r,u,e,o,f,c,i){return r=t(r,t(t(function(n,t,r){return t^(n|~r)}(u,e,o),f),i)),t(n(r,c),u)}function f(n){let t,r,u="",e="";for(r=0;r<=3;r++)t=n>>8*r&255,e="0"+t.toString(16),u+=e.substr(e.length-2,2);return u}return function(n){let c=function(n){let t=n.length,r=1+(t+8>>6)<<4,u=Array(r-1),e=0;for(e=0;e<r;e++)u[e]=0;for(e=0;e<t;e++)u[e>>2]|=n.charCodeAt(e)<<e%4*8;return u[e>>2]|=128<<e%4*8,u[r-2]=8*t,u}(n),i=1732584193,l=4023233417,g=2562383102,h=271733878;for(let n=0;n<c.length;n+=16){let f=i,s=l,a=g,A=h;i=r(i,l,g,h,c[n+0],7,3614090360),h=r(h,i,l,g,c[n+1],12,3905402710),g=r(g,h,i,l,c[n+2],17,606105819),l=r(l,g,h,i,c[n+3],22,3250441966),i=r(i,l,g,h,c[n+4],7,4118548399),h=r(h,i,l,g,c[n+5],12,1200080426),g=r(g,h,i,l,c[n+6],17,2821735955),l=r(l,g,h,i,c[n+7],22,4249261313),i=r(i,l,g,h,c[n+8],7,1770035416),h=r(h,i,l,g,c[n+9],12,2336552879),g=r(g,h,i,l,c[n+10],17,4294925233),l=r(l,g,h,i,c[n+11],22,2304563134),i=r(i,l,g,h,c[n+12],7,1804603682),h=r(h,i,l,g,c[n+13],12,4254626195),g=r(g,h,i,l,c[n+14],17,2792965006),l=r(l,g,h,i,c[n+15],22,1236535329),i=u(i,l,g,h,c[n+1],5,4129170786),h=u(h,i,l,g,c[n+6],9,3225465664),g=u(g,h,i,l,c[n+11],14,643717713),l=u(l,g,h,i,c[n+0],20,3921069994),i=u(i,l,g,h,c[n+5],5,3593408605),h=u(h,i,l,g,c[n+10],9,38016083),g=u(g,h,i,l,c[n+15],14,3634488961),l=u(l,g,h,i,c[n+4],20,3889429448),i=u(i,l,g,h,c[n+9],5,568446438),h=u(h,i,l,g,c[n+14],9,3275163606),g=u(g,h,i,l,c[n+3],14,4107603335),l=u(l,g,h,i,c[n+8],20,1163531501),i=u(i,l,g,h,c[n+13],5,2850285829),h=u(h,i,l,g,c[n+2],9,4243563512),g=u(g,h,i,l,c[n+7],14,1735328473),l=u(l,g,h,i,c[n+12],20,2368359562),i=e(i,l,g,h,c[n+5],4,4294588738),h=e(h,i,l,g,c[n+8],11,2272392833),g=e(g,h,i,l,c[n+11],16,1839030562),l=e(l,g,h,i,c[n+14],23,4259657740),i=e(i,l,g,h,c[n+1],4,2763975236),h=e(h,i,l,g,c[n+4],11,1272893353),g=e(g,h,i,l,c[n+7],16,4139469664),l=e(l,g,h,i,c[n+10],23,3200236656),i=e(i,l,g,h,c[n+13],4,681279174),h=e(h,i,l,g,c[n+0],11,3936430074),g=e(g,h,i,l,c[n+3],16,3572445317),l=e(l,g,h,i,c[n+6],23,76029189),i=e(i,l,g,h,c[n+9],4,3654602809),h=e(h,i,l,g,c[n+12],11,3873151461),g=e(g,h,i,l,c[n+15],16,530742520),l=e(l,g,h,i,c[n+2],23,3299628645),i=o(i,l,g,h,c[n+0],6,4096336452),h=o(h,i,l,g,c[n+7],10,1126891415),g=o(g,h,i,l,c[n+14],15,2878612391),l=o(l,g,h,i,c[n+5],21,4237533241),i=o(i,l,g,h,c[n+12],6,1700485571),h=o(h,i,l,g,c[n+3],10,2399980690),g=o(g,h,i,l,c[n+10],15,4293915773),l=o(l,g,h,i,c[n+1],21,2240044497),i=o(i,l,g,h,c[n+8],6,1873313359),h=o(h,i,l,g,c[n+15],10,4264355552),g=o(g,h,i,l,c[n+6],15,2734768916),l=o(l,g,h,i,c[n+13],21,1309151649),i=o(i,l,g,h,c[n+4],6,4149444226),h=o(h,i,l,g,c[n+11],10,3174756917),g=o(g,h,i,l,c[n+2],15,718787259),l=o(l,g,h,i,c[n+9],21,3951481745),i=t(i,f),l=t(l,s),g=t(g,a),h=t(h,A)}return f(i)+f(l)+f(g)+f(h)}}();

  const waitForValue = (path, interval = 100, timeout = 10000) => {
    const keys = path.split(".");
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const timer = setInterval(() => {
        let cur = unsafeWindow;
        for (const key of keys) {
          cur = cur?.[key];
          if (cur === undefined) break;
        }
        if (cur !== undefined) {
          clearInterval(timer);
          resolve(cur);
        } else if (Date.now() - start > timeout) {
          clearInterval(timer);
          reject(new Error(`等待 ${path} 超时`));
        }
      }, interval);
    });
  };

  const pathname = location.pathname;
  if (pathname === "/website-login/captcha" || pathname === "/404") {
    const sp = new URLSearchParams(location.search);
    let value = sp.get("redirectPath") || sp.get("source");
    let pid = value.split("/explore/")[1].split("?")[0];
    const app = document.getElementById("app");
    const observer = new MutationObserver(ms =>
      ms.forEach(m =>
        m.addedNodes.forEach(n => {
          if (n.className === "access-limit-container" || n.className === "qrcode-foot") {
            observer.disconnect();
            const button = n.querySelector(".feedback-btn");
            const newButton = document.createElement(button.tagName);
            newButton.textContent = "View Link";
            newButton.style.cursor = "pointer";
            newButton.addEventListener("click", () => {
              location.href = "/explore#" + pid;
            });
            button.parentElement.append("\u00A0", newButton);
          }
        })
      )
    );
    observer.observe(app, { subtree: true, childList: true });
    return;
  }

  let user_id = await waitForValue("__INITIAL_STATE__.user.userInfo._value.userId");
  let a1 = "";
  const b1 = localStorage.getItem("b1");
  const cookies = document.cookie.split(";");
  for (let cookie of cookies) {
    let [k, v] = cookie.split("=");
    if (k.trim() === "a1") {
      a1 = v;
      break;
    }
  }

  const platform =
    unsafeWindow.xsecplatform ||
    (() => {
      const ua = navigator.userAgent || "";
      if (ua.includes("Android")) {
        return "Android";
      }
      if (ua.includes("iPhone") || ua.includes("iPad") || ua.includes("iPod")) {
        return "iOS";
      }
      if (ua.includes("Macintosh")) {
        return "Mac OS";
      }
      if (ua.includes("Windows")) {
        return "Windows";
      }
      if (ua.includes("Linux")) {
        return "Linux";
      }
      return "PC";
    })();

  const platformCode = (() => {
    let obj = {
      Android: 1,
      iOS: 2,
      "Mac OS": 3,
      Linux: 4
    };
    return obj[e] || 5;
  })(platform);

  function xs(api, params) {
    let a = api;
    if (typeof params === "object" || typeof params === "string") a += JSON.stringify(params);
    let b = MD5(a);
    const c = {
      x0: "4.2.5", // JSON.parse(B64.decode(any_x_s_value.slice(4))).x0
      x1: unsafeWindow.xsecappid || "xhs-pc-web",
      x2: platform,
      x3: unsafeWindow.mnsv2(a, b),
      x4: typeof params
    };
    return "XYS_" + B64.encode(JSON.stringify(c));
  }

  /* function getSigCount(e) {
    var a = Number(sessionStorage.getItem('sc')) || 0;
    if (e) {
      a++;
      sessionStorage.setItem('sc', a.toString());
    }
    return a;
  } */

  // CRC32
  const x9 = (function (e) {
    for (var a = 0xedb88320, r, c, d = 256, f = []; d--; f[d] = r >>> 0) for (c = 8, r = d; c--; ) r = 1 & r ? (r >>> 1) ^ a : r >>> 1;
    return function (e) {
      if ("string" == typeof e) {
        for (var r = 0, c = -1; r < e.length; ++r) c = f[(255 & c) ^ e.charCodeAt(r)] ^ (c >>> 8);
        return -1 ^ c ^ a;
      }
      for (var r = 0, c = -1; r < e.length; ++r) c = f[(255 & c) ^ e[r]] ^ (c >>> 8);
      return -1 ^ c ^ a;
    };
  })();

  function xs_common() {
    let h = {
      s0: platformCode,
      s1: "",
      x0: localStorage.getItem("b1b1") || "1",
      // x1, x3, x4: window.o({})
      x1: "4.0.16",
      x2: platform,
      x3: unsafeWindow.xsecappid || "xhs-pc-web",
      x4: "4.76.0",
      x5: a1,
      x6: "",
      x7: "",
      x8: b1,
      x9: x9(b1),
      x10: 0,
      x11: "normal"
    };
    return B64.encode(JSON.stringify(h));
  }

  function x_trace_id() {
    for (var t = "", e = 0; e < 16; e++) t += "abcdef0123456789".charAt(Math.floor(16 * Math.random()));
    return t;
  }

  function get_sign(api, params) {
    return {
      "x-s": xs(api, params),
      "x-t": +new Date() + "",
      "x-s-common": xs_common(),
      "x-b3-traceid": x_trace_id()
    };
  }

  async function request(api, method = "GET", params) {
    let headers = get_sign(api, params),
      body;
    if (method === "POST") {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(params);
    }
    return await fetch("//edith.xiaohongshu.com" + api, {
      referrer: "https://www.xiaohongshu.com/",
      headers,
      body,
      method,
      credentials: "include"
    });
  }

  async function show_fav(note_id = "") {
    const path =
      "/api/sns/web/v2/note/collect/page?" +
      new URLSearchParams({
        num: 1,
        cursor: note_id,
        user_id
      });
    const resp = await request(path);
    note_id && console.warn(`[${resp.status}] Show favorites: ${note_id}`);
    return await resp.json();
  }

  async function unfav(note_id) {
    const resp = await request("/api/sns/web/v1/note/uncollect", "POST", { note_ids: note_id });
    console.warn(`[${resp.status}] Unfavorite: ${note_id}`);
    return await resp.json();
  }

  async function fav(note_id) {
    const resp = await request("/api/sns/web/v1/note/collect", "POST", { note_id });
    console.warn(`[${resp.status}] Favorite: ${note_id}`);
    return await resp.json();
  }

  /* unsafeWindow.B64 = B64;
  unsafeWindow.show_fav = show_fav;
  unsafeWindow.unfav = unfav;
  unsafeWindow.fav = fav; */

  const full_url = (note_id, xsec_token) => `https://www.xiaohongshu.com/explore/${note_id}?xsec_token=${xsec_token}`;

  async function get_xsec_token_url(note_id) {
    let note_in_fav = await show_fav();
    let first_note = note_in_fav?.data?.notes?.[0];
    if (note_id === first_note?.note_id) return full_url(note_id, first_note.xsec_token);
    let fav_action = await fav(note_id);
    if (fav_action.code === -7000) {
      alert(`Invalid note: ${note_id}`);
      return;
    }
    note_in_fav = await show_fav();
    first_note = note_in_fav?.data?.notes?.[0];
    if (!first_note) {
      alert(`Failed to get favorites.`);
      return;
    }
    if (note_id === first_note.note_id) {
      await unfav(note_id);
      return full_url(note_id, first_note.xsec_token);
    } else {
      await unfav(note_id);
      await fav(note_id);
      note_in_fav = await show_fav();
      let xsec_token = note_in_fav?.data?.notes?.[0]?.xsec_token;
      if (xsec_token) return full_url(note_id, xsec_token);
      else {
        alert(`Failed to get xsec_token for favorited note ${note_id}.`);
        return;
      }
    }
  }

  const hash = location.hash;
  if (/#[0-9a-f]{24}\b/.test(hash)) {
    let url = await get_xsec_token_url(hash.slice(1, 25));
    if (url) {
      location.href = url;
      return;
    } else location.hash = "";
  }
  GM_registerMenuCommand("Fix bad link", async () => {
    let input = prompt("Input note URL or note ID:");
    let note_id = input.match(/(?:\/discovery\/item\/|\/explore\/)?([0-9a-f]{24})\b/)?.[1];
    if (note_id) {
      let url = await get_xsec_token_url(note_id);
      if (url && typeof prompt("Open in new tab:", url) === "string") window.open(url, "_blank");
    }
  });
  // unsafeWindow.get_xsec_token_url = get_xsec_token_url;
})();
