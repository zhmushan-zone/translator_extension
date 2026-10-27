import { join } from "https://deno.land/std@0.113.0/path/mod.ts";

const { run, remove, lstat, copyFile, mkdir, readDir } = Deno;

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
    "options.html",
    "pdf.html",
    "popup.html",
  ]
) {
  copyFile(i, join(outDir, i));
}

/**
 * PDF 阅读器用到的 pdf.js 文件. 不包含执行 PDF 内嵌脚本的 quickjs.
 */
const pdfjs = "node_modules/pdfjs-dist";
const pdfjsOut = join(outDir, "pdfjs");
await mkdir(join(pdfjsOut, "wasm"), { recursive: true });
for (
  const [from, to] of [
    ["LICENSE", "LICENSE"],
    ["build/pdf.min.mjs", "pdf.min.mjs"],
    ["build/pdf.worker.min.mjs", "pdf.worker.min.mjs"],
    ["web/pdf_viewer.mjs", "pdf_viewer.mjs"],
    ["web/pdf_viewer.css", "pdf_viewer.css"],
    ["wasm/openjpeg.wasm", "wasm/openjpeg.wasm"],
    ["wasm/openjpeg_nowasm_fallback.js", "wasm/openjpeg_nowasm_fallback.js"],
    ["wasm/jbig2.wasm", "wasm/jbig2.wasm"],
    ["wasm/jbig2_nowasm_fallback.js", "wasm/jbig2_nowasm_fallback.js"],
    ["wasm/qcms_bg.wasm", "wasm/qcms_bg.wasm"],
  ]
) {
  await copyFile(join(pdfjs, from), join(pdfjsOut, to));
}
for (const [from, to] of [["cmaps", "cmaps"], ["standard_fonts", "standard_fonts"], ["iccs", "iccs"], ["web/images", "images"]]) {
  await copyDir(join(pdfjs, from), join(pdfjsOut, to));
}

async function copyDir(from: string, to: string) {
  await mkdir(to, { recursive: true });
  for await (const entry of readDir(from)) {
    if (entry.isDirectory) await copyDir(join(from, entry.name), join(to, entry.name));
    else await copyFile(join(from, entry.name), join(to, entry.name));
  }
}
