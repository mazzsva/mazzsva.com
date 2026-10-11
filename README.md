# mazzsva.com

My personal website, in the style of macOS Spotlight.

<img src=".github/screenshots/devices.png" alt="The website on iPhone, Mac, and iPad: a grid of icons on iPhone, and a list of products, projects, and profiles on Mac and iPad">

## Technologies

<table>
  <tr><td><b>Languages</b></td><td>HTML, CSS, JavaScript</td></tr>
  <tr><td><b>Hosting</b></td><td>Cloudflare Workers</td></tr>
  <tr><td><b>Testing</b></td><td>Node test runner</td></tr>
</table>

No build step and no dependencies.

## Quality

<img src=".github/screenshots/motion.webp" alt="The filters change and the panel resizes, then the arrow keys move the selection and switch the filter">

- **Loading:** The page fades in once, when it is complete, and nothing moves after.
- **Motion:** 60 frames per second on a CPU four times slower, and Reduce Motion support.
- **Layouts:** A list on Mac and iPad, and a grid of icons with a sheet on iPhone.
- **Keyboard:** The arrow keys move through the results, and Return opens a link.
- **Security:** A strict Content Security Policy, HSTS, and no cookies or third-party scripts.
- **Tests:** 12 tests cover the state of the page.

## Commands

```bash
npm start
npm test
npx wrangler deploy
```

Copyright © 2026 Lorenzo Mazzarotto
