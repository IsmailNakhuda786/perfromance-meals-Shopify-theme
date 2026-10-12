import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const distDir = new URL("../dist/", import.meta.url);
const publicDir = new URL("../public/", import.meta.url);
const indexPath = new URL("index.html", distDir);
let html = await readFile(indexPath, "utf8");

const assets = await readdir(new URL("assets/", distDir));
const cssFile = assets.find((file) => file.endsWith(".css"));
const jsFile = assets.find((file) => file.endsWith(".js"));

if (!cssFile || !jsFile) {
  throw new Error("Expected one CSS and one JavaScript entry bundle in dist/assets.");
}

const [css, rawJs] = await Promise.all([
  readFile(new URL(`assets/${cssFile}`, distDir), "utf8"),
  readFile(new URL(`assets/${jsFile}`, distDir), "utf8"),
]);
const js = rawJs.replaceAll("</script", "<\\/script");

html = html
  .replace("<title>Figma Make App</title>", "<title>Performance Meals Prototype</title>")
  .replace(
    /<meta name="description" content="[^"]*">/,
    '<meta name="description" content="Current Performance Meals customer prototype with Ready Series, Meal Plan, checkout, and account flows.">',
  )
  .replace(
    '<meta property="og:title" content="Figma Make App">',
    '<meta property="og:title" content="Performance Meals Prototype">',
  )
  .replace(
    /<meta property="og:description" content="[^"]*">/,
    '<meta property="og:description" content="Current Performance Meals customer prototype and user flows.">',
  )
  .replace(
    /<link[^>]+rel=["']stylesheet["'][^>]*>/i,
    () => `<style>${css}</style>`,
  )
  .replace(
    /<script[^>]+type=["']module["'][^>]+src=["'][^"']+["'][^>]*><\/script>/i,
    () => `<script type="module">${js}</script>`,
  )
  .replace(
    "</head>",
    "  <!-- Generated from the current Vite production bundle. -->\n</head>",
  );

const filename = "performance-meals-prototype.html";
await Promise.all([
  writeFile(new URL(filename, publicDir), html),
  writeFile(new URL(filename, distDir), html),
]);

console.log(`Generated ${filename} from ${join("dist", "assets", jsFile)}.`);
