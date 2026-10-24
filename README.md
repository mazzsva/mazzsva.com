# mazzsva.com

Spotlight-style [personal website](https://mazzsva.com) in HTML, CSS, and JavaScript.

<img src=".github/screenshots/devices.png" alt="The website on iPhone, Mac, and iPad: a grid of icons on iPhone, and a list of products, projects, and profiles on Mac and iPad">

Hosted on Cloudflare Workers, with no build step and no runtime dependencies.

## Quality gates

- **Loading:** The page fades in once, when it is complete, and nothing moves after.
- **Motion:** 60 frames per second on a CPU four times slower, and Reduce Motion support.
- **Layouts:** A list on Mac and iPad, and a grid of icons with a sheet on iPhone.
- **Keyboard:** The arrow keys move through the results, and Return opens a link.
- **Security:** A strict Content Security Policy, HSTS, and no cookies or third-party scripts.

## Run locally

```
npm install
npm start
```

Deploy with `npx wrangler deploy`.

Copyright © 2026 Lorenzo Mazzarotto
