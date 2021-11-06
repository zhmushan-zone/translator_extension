import { join } from "https://deno.land/std@0.113.0/path/mod.ts";

const { run, remove, lstat, copyFile } = Deno;

const outDir = "chrome";

try {
  await lstat(outDir);
  await remove(outDir, { recursive: true });
} catch { /* empty */ }

await run({
  cmd: ["npx", "tsc"],
  stdout: "piped",
}).output();

for (
  const i of [
    "blank.css",
    "icon_16.png",
    "icon_48.png",
    "icon_128.png",
    "manifest.json",
    "popup.html",
  ]
) {
  copyFile(i, join(outDir, i));
}
