#!/usr/bin/env node
// Stamps a fresh cache-busting version into public/sw.js before every build.
//
// Browsers only re-fetch and activate a new service worker when the script's
// bytes change — a static CACHE_NAME meant returning visitors could get
// stuck on a stale cached app shell indefinitely after a deploy, since
// nothing ever prompted the browser to notice sw.js had changed. Runs
// automatically via the "prebuild" npm lifecycle hook.
const fs = require("fs");
const path = require("path");

const swPath = path.join(__dirname, "..", "public", "sw.js");
const version = `onebasqet-${Date.now()}`;

const content = fs.readFileSync(swPath, "utf8");
const updated = content.replace(/const CACHE_NAME = "[^"]*";/, `const CACHE_NAME = "${version}";`);

if (updated === content) {
  throw new Error(`Could not find CACHE_NAME in ${swPath} — sw.js format may have changed.`);
}

fs.writeFileSync(swPath, updated);
console.log(`[bump-sw-version] sw.js cache version set to ${version}`);
