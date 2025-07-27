<h1 align="center">
  <img src="danbooru.svg" alt="Logo" width="150"><br/>
  Danbooru Userscript Collection
</h1>

<h4 align="center"><s>Make Danbooru Great Again</s></h4>

<p align="center">
  <img src="https://img.shields.io/badge/script%20count-15-brightgreen?style=flat-square">
  &nbsp;
  <a href="https://danbooru.donmai.us/users/817128"><img src="https://img.shields.io/badge/author-Sibyl-a800aa?style=flat-square"></a>
  &nbsp;
  <img src="https://img.shields.io/github/last-commit/notsibyl/danbooru/main?style=flat-square">
</p>

## Installation

- Install [Violentmonkey](https://violentmonkey.github.io) _or_ [Tampermonkey](https://tampermonkey.net/) browser extension. If you're on a mobile platform, you can also consider using a browser that supports userscripts, such as [Via](https://viayoo.com).
- Click the userscript install link.
- An installation prompt will appear. Accept the installation.
- If you don't get a prompt, try the additional following steps.
  1. Open userscript manager.
  2. Create a new script.
  3. Copy/paste the userscript code into the text area.
  4. Save the script.

## Scripts

### 📊 Milestone Uploads Report

- Displays a user's upload milestones on their profile page.
- Supports milestone lookup for arbitrary tags on post counts page.
- Notify user when approaching the next upload milestone.

You can customize the milestone numbers, the post threshold for notifications, and the notification message by editing the code at the beginning of the script.

#### [Install](/src/milestone-report.user.js?raw=1)

### 📊 Post Source Report

Counts and visualizes the sources of a user's uploads on their profile page.\
You can also customize the tracked sources by editing the code at the beginning of the script.

#### [Install](/src/source-report.user.js?raw=1)

### :speech_balloon: More Tooltips

Shows the tooltip when hovering over artist, media asset or favgroup links.

![More Tooltips](/screenshots/more-tooltips.png)

#### [Install](/src/more-tooltips.user.js?raw=1)

### 🚫 Banned Posts Helper

This is a userscript written for members below level 37.

- Shows missing banned posts when searching.
- Shows missing banned posts when doing similar image search.
- Easier 1up + Shows similar banned posts on upload page.

#### [Install](/src/banned-posts-helper.user.js?raw=1)

### 👩‍🎨 Strikethrough for banned artists

Since banned artist names can’t be styled using simple CSS selectors, the script retrieves data for all banned artists.

You can configure the data update interval and specify which types of elements to style at the beginning of the script.

#### [Install](/src/strikethrough-banned-artists.user.js?raw=1)

### 📳 Vibrate on Vote or Favorite

> Inspired by the like vibration on Twitter mobile site.

Trigger vibration on supported devices when voting or favoriting.\
This script does not work in browsers that do not support the vibration API (e.g. Firefox).

#### [Install](/src/vote-favorite-vibrate.user.js?raw=1)

### 🔍 Sticky Search Bar

Makes the search bar stick to the top of the page.

I only recently realized this is actually a small feature from [Danbooru EX](https://danbooru.donmai.us/forum_topics/13167). However, this version includes some improvements:

* Better experience on mobile devices.
* Fixed the autocomplete dropdown menu.

[Install](/src/sticky-search-bar.user.js?raw=1)

### 💾 Auto Saver

Save the content in textboxes on the upload page automatically, including tags and translated commentary.

#### [Install](/src/auto-saver.user.js?raw=1)

### 📝 Notify on Note Box Changes

Displays position and size information while the user adjusts the note box via dragging or keyboard shortcuts.

#### [Install](/src/note-box-change-notice.user.js?raw=1)

### 🆎 DejaVu Sans

> [!TIP]
> This script is useful if your OS or browser lacks *Verdana* or forcibly aliases it to another font.\
> *DejaVu Sans* is a similar-looking open-source alternative to *Verdana*.

Replaces Danbooru’s default font *Verdana* with *DejaVu Sans*.\
While you could normally change fonts via custom CSS, this script uses the `GM_getResourceURL` API to load fonts more efficiently.

#### [Install](/src/dejavu-sans.user.js?raw=1)

### ✋ Tap to Show Tooltip

> [!TIP]
> If you've installed the [More Tooltips](#speech_balloon-more-tooltips), this one can be skipped.

> [!NOTE]
> This is a userscript optimized for touchscreen devices.

Originally, this was just a bug fix for Android System WebView-based browsers that couldn’t show tooltips on long press, unlike Firefox or Chrome for Android.\
Now, users can simply click to display the voter tooltip or favoritor tooltip and then click again to navigate to the target page.

#### [Install](/src/tap-to-show-tooltip.user.js?raw=1)

### 🌐 Full-width Character Converter

This userscript is designed for users who work with CJK characters. It automatically converts full-width characters to half-width ones (`：` → `:`, `（）` → `()`, etc.) when searching and doing tag gardening. This helps you avoid manually switching your IME or toggling between full-width and half-width modes.

#### [Install](/src/full-width-char-converter.user.js?raw=1)

### 🖼 Draggable Post Image

Makes image draggable like yande.re. Drag function was modified from [Moebooru](https://github.com/moebooru/moebooru/blob/e7bd4e98411f2b14619f1f2aa32901ec05904c39/app/javascript/src/moebooru.coffee#L10).\
You can prevent the image from moving by pressing the Ctrl or Alt key while adding a note box.

#### [Install](/src/draggable-image.user.js?raw=1)

### 💙 Favorite Group Enhance

- Hover to show a button to remove current post from favorite group at the end of favorite group navigation bar.
- Add ascending & descending button to fav group edit page.

#### [Install](/src/favgroup-enhance.user.js?raw=1)

### 💜 Show Favorite Groups Count

> [!TIP]
> If you've installed the [More Tooltips](#speech_balloon-more-tooltips), this one can be skipped.

Some users don't like adding posts to their favorites may add them to their favorite groups.\
This simple userscript shows how many public favorite groups the current post has been added to.

#### [Install](/src/favgroup-count.user.js?raw=1)
