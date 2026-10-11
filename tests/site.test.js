import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { modes } from "../public/scripts/store.js";

const root = join(import.meta.dirname, "..");
const site = join(root, "public");

const read = (path) => readFileSync(join(site, path), "utf8");

const files = (directory = "") =>
  readdirSync(join(site, directory), { withFileTypes: true }).flatMap((entry) => {
    const path = directory ? `${directory}/${entry.name}` : entry.name;
    return entry.isDirectory() ? files(path) : [path];
  });

const exists = (path) =>
  path.split("/").every((name, index, names) => readdirSync(join(site, ...names.slice(0, index))).includes(name)) &&
  statSync(join(site, path)).isFile();

const isRelative = (reference) => !/^([a-z][a-z\d+.-]*:|\/\/)/i.test(reference);

const resolve = (reference, from) => decodeURIComponent(new URL(reference, `https://site/${from}`).pathname.slice(1));

const pngSize = (path) => {
  const data = readFileSync(join(site, path));
  assert.equal(data.toString("latin1", 12, 16), "IHDR");
  return [data.readUInt32BE(16), data.readUInt32BE(20)];
};

const parseJSONC = (source) =>
  JSON.parse(
    source
      .replace(/("(?:\\.|[^"\\])*")|\/\/.*|\/\*[\s\S]*?\*\//g, (match, string) => string ?? "")
      .replace(/("(?:\\.|[^"\\])*")|,(?=\s*[}\]])/g, (match, string) => string ?? ""),
  );

const html = read("index.html");

const parseAttributes = (source) =>
  Object.fromEntries(
    [...source.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)].map(([, name, ...values]) => [
      name.toLowerCase(),
      values.find((value) => value !== undefined) ?? "",
    ]),
  );

const elements = [...html.matchAll(/<([a-z][\w-]*)([^>]*)>/gi)].map((match) => ({
  tag: match[1].toLowerCase(),
  attributes: parseAttributes(match[2]),
  start: match.index,
  end: match.index + match[0].length,
}));

const tokens = (element, name) => (element.attributes[name] ?? "").toLowerCase().split(/\s+/).filter(Boolean);

const withClass = (name, within = elements) => within.filter((element) => tokens(element, "class").includes(name));

const withRel = (name) => elements.filter((element) => tokens(element, "rel").includes(name));

const content = (element) => html.slice(element.end, html.indexOf(`</${element.tag}>`, element.end));

const children = (parent) => {
  const close = html.indexOf(`</${parent.tag}>`, parent.end);
  return elements.filter((element) => element.start > parent.start && element.start < close);
};

const source = (element) => html.slice(element.start, element.end);

const resultsIn = (mode) =>
  withClass("section")
    .filter((section) => section.attributes["data-mode"] === mode)
    .flatMap((section) => withClass("result", children(section)));

const meta = Object.fromEntries(
  elements
    .filter((element) => element.tag === "meta" && "content" in element.attributes)
    .map(({ attributes }) => [attributes.property ?? attributes.name, attributes.content]),
);

const canonical = withRel("canonical")[0]?.attributes.href;
const ogImage = meta["og:image"];
const ogImagePath = resolve(ogImage, "");

const htmlReferences = elements.flatMap((element) =>
  ["href", "src"].filter((name) => name in element.attributes).map((name) => ({ element, name, value: element.attributes[name] })),
);

const localReferences = htmlReferences.filter(({ value }) => isRelative(value)).map(({ value }) => resolve(value, "index.html"));

const stylesheets = files().filter((path) => path.endsWith(".css"));

const css = (path) => read(path).replace(/\/\*[\s\S]*?\*\//g, "");

const cssReferences = stylesheets.flatMap((path) =>
  [...css(path).matchAll(/url\(\s*(["']?)(.*?)\1\s*\)|@import\s+(["'])(.*?)\3/g)].map((match) => ({
    from: path,
    value: match[2] ?? match[4],
  })),
);

const imports = (path) => [...read(path).matchAll(/\b(?:from|import)\s*\(?\s*["']([^"']+)["']/g)].map(([, specifier]) => specifier);

const entries = elements
  .filter((element) => element.tag === "script" && element.attributes.src)
  .map((script) => resolve(script.attributes.src, "index.html"));

const modules = new Set();
const visit = (path) => {
  if (modules.has(path) || !exists(path)) return;
  modules.add(path);
  imports(path).forEach((specifier) => visit(resolve(specifier, path)));
};
entries.forEach(visit);

describe("references", () => {
  test("every link in the page resolves to a file with the exact case", () => {
    assert.deepEqual(
      localReferences.filter((path) => !exists(path)),
      [],
    );
  });

  test("every URL in the styles resolves to a file with the exact case", () => {
    assert.deepEqual(
      cssReferences.filter(({ from, value }) => !isRelative(value) || !exists(resolve(value, from))),
      [],
    );
  });

  test("every import resolves to a module with the exact case", () => {
    const broken = [...modules].flatMap((path) =>
      imports(path)
        .filter((specifier) => !/^\.{0,2}\//.test(specifier) || !exists(resolve(specifier, path)))
        .map((specifier) => `${path}: ${specifier}`),
    );
    assert.deepEqual(broken, []);
  });
});

describe("content security policy", () => {
  test("the page has no inline script except the JSON-LD data", () => {
    const inline = elements.filter(
      (element) =>
        element.tag === "script" &&
        (element.attributes.src ? content(element).trim() !== "" : element.attributes.type !== "application/ld+json"),
    );
    assert.deepEqual(inline.map(source), []);
  });

  test("the page has no inline style", () => {
    assert.deepEqual(elements.filter((element) => element.tag === "style" || "style" in element.attributes).map(source), []);
  });

  test("the page has no event handler attribute or javascript URL", () => {
    const unsafe = elements.flatMap((element) =>
      Object.entries(element.attributes).filter(([name, value]) => name.startsWith("on") || /^\s*javascript:/i.test(value)),
    );
    assert.deepEqual(unsafe, []);
  });

  test("the page loads every resource from its own origin", () => {
    const external = htmlReferences.filter(
      ({ element, name, value }) =>
        !isRelative(value) &&
        !(value.startsWith("https://") && ((element.tag === "a" && name === "href") || tokens(element, "rel").includes("canonical"))),
    );
    assert.deepEqual(
      external.map(({ value }) => value),
      [],
    );
  });

  test("the scripts use no API that the policy blocks", () => {
    const blocked =
      /\.(innerHTML|outerHTML|insertAdjacentHTML)\b|setAttribute\(\s*["'`]style["'`]|\beval\(|\bnew Function\(|\bset(Timeout|Interval)\(\s*["'`]|document\.write|\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\b/;
    assert.deepEqual(
      files().filter((path) => path.endsWith(".js") && blocked.test(read(path))),
      [],
    );
  });
});

describe("markup", () => {
  test("the page has every class that the scripts query", () => {
    const classes = new Set(elements.flatMap((element) => tokens(element, "class")));
    const queried = [...modules].flatMap((path) => [...read(path).matchAll(/["']\.([a-z][\w-]*)["']/gi)].map(([, name]) => name));
    assert.deepEqual(
      queried.filter((name) => !classes.has(name)),
      [],
    );
  });

  test("the filters, symbols, and sections use the modes of the store", () => {
    const modesOf = (name) => withClass(name).map((element) => element.attributes["data-mode"]);
    assert.deepEqual(modesOf("filter"), modes);
    assert.deepEqual(modesOf("bar-symbol").toSorted(), modes.toSorted());
    assert.deepEqual(modesOf("section").toSorted(), modes.filter((mode) => mode !== "all").toSorted());
  });

  test("every mode has a result", () => {
    const count = (mode) => (mode === "all" ? withClass("result") : resultsIn(mode)).length;
    assert.deepEqual(
      modes.filter((mode) => count(mode) === 0),
      [],
    );
  });
});

describe("metadata", () => {
  test("the preview image is on the canonical origin and has the stated size", () => {
    assert.ok(ogImage.startsWith(new URL(canonical).origin + "/"), ogImage);
    assert.ok(exists(ogImagePath), ogImagePath);
    assert.deepEqual(pngSize(ogImagePath), [Number(meta["og:image:width"]), Number(meta["og:image:height"])]);
  });

  test("the name is the same in the page, the title, and the metadata", () => {
    const data = elements.find((element) => element.tag === "script" && element.attributes.type === "application/ld+json");
    const name = html.match(/<h1[^>]*>([^<]*)</)[1];
    const names = [html.match(/<title>([^<]*)<\/title>/)[1], meta["og:title"], meta.author, JSON.parse(content(data)).name];
    assert.deepEqual(names, Array(names.length).fill(name));
  });

  test("the JSON-LD describes the person at the canonical URL and the profiles", () => {
    const data = elements.find((element) => element.tag === "script" && element.attributes.type === "application/ld+json");
    const person = JSON.parse(content(data));
    assert.equal(person["@type"], "Person");
    assert.equal(person.url, canonical);
    assert.equal(person.url, meta["og:url"]);
    assert.deepEqual(
      person.sameAs.toSorted(),
      withRel("me")
        .map((link) => link.attributes.href)
        .toSorted(),
    );
  });
});

describe("links", () => {
  test("each result links to its page", () => {
    const title = (link) => html.slice(link.end, html.indexOf("</a>", link.end)).match(/class="result-title">([^<]*)</)[1];
    const links = withClass("result").filter((element) => element.tag === "a");
    assert.deepEqual(Object.fromEntries(links.map((link) => [title(link), link.attributes.href])), {
      Lexicon: "https://github.com/mazzsva/Lexicon",
      "claude-skills": "https://github.com/mazzsva/claude-skills",
      GitHub: "https://github.com/mazzsva",
      LinkedIn: "https://www.linkedin.com/in/mazzsva",
    });
  });

  test("every result link opens over HTTPS in a new tab", () => {
    const links = withClass("result").filter((element) => element.tag === "a");
    assert.ok(links.length > 0);
    assert.deepEqual(
      links.filter((link) => !link.attributes.href.startsWith("https://") || link.attributes.target !== "_blank").map(source),
      [],
    );
  });

  test("every new tab opens without an opener", () => {
    assert.deepEqual(
      elements.filter((element) => element.attributes.target === "_blank" && !tokens(element, "rel").includes("noopener")).map(source),
      [],
    );
  });
});

describe("wrangler", () => {
  test("deploys the public folder to the apex and www domains only", () => {
    const config = parseJSONC(readFileSync(join(root, "wrangler.jsonc"), "utf8"));
    assert.equal(config.assets.directory, "public");
    assert.deepEqual(config.routes.map(({ pattern, custom_domain }) => [pattern, custom_domain]).toSorted(), [
      ["mazzsva.com", true],
      ["www.mazzsva.com", true],
    ]);
    assert.equal(config.workers_dev, false);
  });
});
