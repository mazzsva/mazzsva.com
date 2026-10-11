# mazzsva.com

My personal website, live at [mazzsva.com](https://mazzsva.com). A single page in the style of macOS Spotlight.

## Structure

| Folder | Contents |
| --- | --- |
| [public/styles](public/styles) | One stylesheet for each component, with the design tokens in `tokens.css` and the styles for browsers without JavaScript in `noscript.css`. |
| [public/scripts](public/scripts) | The state and its reducer in `store.js`, the DOM updates in `view.js`, the dot grid alignment in `grid.js`, the resize animations in `motion.js`, the sheet gesture in `drag.js`, and the events in `main.js`. |
| [public/assets](public/assets) | The app icons, the SF Symbols, the favicon, the Home Screen icon, and the link preview image. |
| [tests](tests) | The reducer tests, which use the Node test runner. |

A Cloudflare Worker serves the `public` folder as static assets, with its settings in [wrangler.jsonc](wrangler.jsonc). The security headers and the image cache time are in [public/_headers](public/_headers). A redirect rule in the Cloudflare dashboard sends www.mazzsva.com to mazzsva.com.

There is no build step and there are no dependencies.

## Run locally

```bash
npm start
```

Then open http://localhost:8000. The browser loads the scripts as modules, so the page needs a server.

## Test

```bash
npm test
```

## Deploy

```bash
npx wrangler deploy
```
