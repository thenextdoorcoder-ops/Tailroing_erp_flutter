/**
 * scripts/update-sw-version.js
 *
 * Automatically patches the CACHE_VERSION in sw.js with the current
 * build timestamp before every build/dev start. This ensures the
 * service worker cache is busted on every new deployment without
 * any manual changes.
 *
 * Run automatically via "prebuild" and "predev" in package.json.
 */

const fs = require('fs');
const path = require('path');

const swPath = path.join(__dirname, '../public/sw.js');
const version = `build-${Date.now()}`;

let content = fs.readFileSync(swPath, 'utf8');

// Replace the CACHE_VERSION value with the new build timestamp
content = content.replace(
    /const CACHE_VERSION = ['"`][^'"`]*['"`];/,
    `const CACHE_VERSION = '${version}';`
);

fs.writeFileSync(swPath, content, 'utf8');

console.log(`[update-sw-version] Service worker cache version set to: ${version}`);
