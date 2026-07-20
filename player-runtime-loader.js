/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 * Copyright (c) 2026 Luca Mari
 */

(function initSTGraphXPlayerRuntimeLoader(global) {
  const currentScript = document.currentScript;
  const scriptUrl = (() => {
    try {
      return new URL(currentScript?.src || "", global.location.href);
    } catch (_err) {
      return new URL(global.location.href);
    }
  })();
  const baseHref = scriptUrl.href.replace(/[^/]*$/u, "");

  const sourceFiles = [
    "i18n-inline.js",
    "graph-functions.js",
    "semantic.js",
    "runtime-shared.js",
    "runtime-core.js",
    "runtime-loader.js",
    "runtime-session.js",
    "runtime-controller.js",
    "headless-runtime.js",
    "player-shell.js",
  ];

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = url;
      script.async = false;
      script.onload = () => resolve(url);
      script.onerror = () => reject(new Error(`Unable to load ${url}`));
      document.head.appendChild(script);
    });
  }

  async function loadSequential(urls) {
    for (const url of urls) {
      await loadScript(url);
    }
  }

  async function loadRuntime() {
    const minifiedUrl = new URL("build/player/stgraphx-player.min.js", baseHref).href;
    const bundledUrl = new URL("build/player/stgraphx-player.js", baseHref).href;
    try {
      await loadScript(minifiedUrl);
      return { mode: "bundle-min", url: minifiedUrl };
    } catch (_minError) {
      try {
        await loadScript(bundledUrl);
        return { mode: "bundle", url: bundledUrl };
      } catch (_bundleError) {
        const sourceUrls = sourceFiles.map((file) => new URL(file, baseHref).href);
        await loadSequential(sourceUrls);
        return { mode: "sources", url: sourceUrls[sourceUrls.length - 1] };
      }
    }
  }

  global.STGraphXPlayerRuntimeReady = loadRuntime();
})(window);
