// ==UserScript==
// @name        LLMOP Youtube
// @namespace   Violentmonkey Scripts
// @description Summarize and timestamp YouTube videos
// @match       https://www.youtube.com/*
// @match       https://youtu.be/*
// @run-at      document-end
// @grant       GM.getValue
// @grant       GM.setValue
// @grant       GM.notification
// @grant       GM.xmlHttpRequest
// @grant       GM.fetch
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_notification
// @grant       GM_xmlHttpRequest
// @grant       GM_fetch
// @version     0.0.0
// @author      process.env.AUTHOR
// @require     https://cdn.jsdelivr.net/npm/@violentmonkey/dom@2
// @require     https://cdn.jsdelivr.net/npm/@violentmonkey/ui@0.7
// @require     https://cdn.jsdelivr.net/npm/@violentmonkey/dom@2/dist/solid.min.js
// ==/UserScript==

/**
 * Code here will be ignored on compilation. So it's a good place to leave messages to developers.
 *
 * - The `@grant`s used in your source code will be added automatically by `rollup-plugin-userscript`.
 *   However you have to add explicitly those used in required resources.
 * - `process.env.AUTHOR` will be loaded from `package.json`.
 */
