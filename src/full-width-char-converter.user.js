// ==UserScript==
// @name          Full-width Character Converter
// @author        Sibyl
// @version       1.1
// @icon          https://cdn.jsdelivr.net/gh/notsibyl/danbooru@main/danbooru.svg
// @namespace     https://danbooru.donmai.us/forum_posts?search[creator_id]=817128&search[topic_id]=8502
// @homepageURL   https://github.com/notsibyl/danbooru
// @downloadURL   https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/full-width-char-converter.user.js
// @updateURL     https://raw.githubusercontent.com/notsibyl/danbooru/refs/heads/main/src/full-width-char-converter.user.js
// @match         https://*.donmai.us/*
// @exclude-match *://cdn.donmai.us/*
// @grant         none
// @run-at        document-end
// ==/UserScript==

function hasFullWidthSearchChar(data) {
  return (
    data &&
    (data.indexOf("\uFF1A") > -1 ||
      data.indexOf("\uFF08") > -1 ||
      data.indexOf("\uFF09") > -1 ||
      data.indexOf("\u201C") > -1 ||
      data.indexOf("\u201D") > -1 ||
      data.indexOf("\u2018") > -1 ||
      data.indexOf("\u2019") > -1 ||
      data.indexOf("\u2014\u2014") > -1)
  );
}

function replaceFullWidthChar(data) {
  return data
    .replace(/\uFF1A/g, ":")
    .replace(/\uFF08/g, "(")
    .replace(/\uFF09/g, ")")
    .replace(/\u201C|\u201D/g, '"')
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u2014\u2014/g, "_");
}

const contentEditableElements = document.querySelectorAll("input[data-autocomplete='tag-query'], textarea[data-autocomplete='tag-edit']");

contentEditableElements.forEach(el => {
  el.addEventListener("beforeinput", e => {
    const { inputType, data, target } = e;
    const { value, selectionStart, selectionEnd } = target;
    let beginning = value.slice(0, selectionStart);
    let ending = value.slice(selectionEnd);
    console.log(e);

    if (inputType === "insertFromPaste" && data && hasFullWidthSearchChar(data)) {
      let newData = replaceFullWidthChar(data);
      let cursor = beginning.length + newData.length;
      inputElement.value = beginning + newData + ending;
      inputElement.selectionStart = inputElement.selectionEnd = cursor;
      return false;
    }
  });
  el.addEventListener("input", e => {
    // data here is null if inputType is insertFromPaste in Windows Chrome.
    // So we need to replace it in beforeinput event.
    const { inputType, data, target } = e;
    const { value, selectionStart, selectionEnd } = target;
    let beginning = value.slice(0, selectionStart);
    let ending = value.slice(selectionEnd);

    if (inputType?.startsWith("insert") && data && hasFullWidthSearchChar(data)) {
      beginning = beginning.slice(0, -data.length);
      let newData = replaceFullWidthChar(data);
      let cursor = beginning.length + newData.length;
      target.value = beginning + newData + ending;

      // Android Webview and Chrome for Android has no insertCompositionText inputType.
      if (inputType === "insertCompositionText") target.hasInsertCompositionText = true;
      // An extra insertText event will be triggered in Windows Chrome.
      if (inputType === "insertText" && target.hasInsertCompositionText) {
        cursor = beginning.length;
        target.value = beginning + ending;
      }

      target.selectionStart = target.selectionEnd = cursor;
    }
  });
});