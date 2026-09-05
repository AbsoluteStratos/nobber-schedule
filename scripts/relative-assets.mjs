import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const dist = "dist";

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(path)));
    } else {
      files.push(path);
    }
  }
  return files;
}

function relativizeHtml(html) {
  return html
    .replaceAll('href="/2025/assets/', 'href="assets/')
    .replaceAll("href='/2025/assets/", "href='assets/")
    .replaceAll('src="/2025/assets/', 'src="assets/')
    .replaceAll("src='/2025/assets/", "src='assets/")
    .replaceAll("url('/2025/assets/", "url('./")
    .replaceAll('url("/2025/assets/', 'url("./')
    .replaceAll("url(/2025/assets/", "url(./")
    .replaceAll("url('assets/", "url('./")
    .replaceAll('url("assets/', 'url("./');
}

function relativizeCss(css) {
  return css
    .replaceAll("url('/2025/assets/", "url('./")
    .replaceAll('url("/2025/assets/', 'url("./')
    .replaceAll("url(/2025/assets/", "url(./")
    .replaceAll("url('assets/", "url('./")
    .replaceAll('url("assets/', 'url("./')
    .replaceAll("url(assets/", "url(./");
}

const files = await walk(dist);
for (const file of files) {
  if (file.endsWith(".html")) {
    const html = await readFile(file, "utf8");
    const next = relativizeHtml(html);
    if (next !== html) await writeFile(file, next);
  } else if (file.endsWith(".css")) {
    const css = await readFile(file, "utf8");
    const next = relativizeCss(css);
    if (next !== css) await writeFile(file, next);
  }
}
