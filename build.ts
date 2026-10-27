import { cp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

const outdir = "chrome";
// --e2e 时保留 background 里给端到端测试用的钩子, 正式构建会把这段代码删掉
const e2e = process.argv.includes("--e2e");

await rm(outdir, { recursive: true, force: true });

// service worker 和扩展页面用 ES 模块; content script 不支持模块, 打成 IIFE
for (
  const { entrypoints, format } of [
    { entrypoints: ["background", "popup", "options", "pdf"], format: "esm" },
    { entrypoints: ["content_script"], format: "iife" },
  ] as const
) {
  const result = await Bun.build({
    entrypoints: entrypoints.map((name) => `src/${name}.ts`),
    outdir,
    format,
    target: "browser",
    minify: true,
    define: { "process.env.E2E": JSON.stringify(String(e2e)) },
  });
  if (!result.success) {
    for (const log of result.logs) console.error(log);
    process.exit(1);
  }
}

await cp("public", outdir, { recursive: true });

/**
 * PDF 阅读器在运行时加载的 pdf.js 资源. 不包含执行 PDF 内嵌脚本的 quickjs.
 */
const pdfjs = "node_modules/pdfjs-dist";
const pdfjsOut = join(outdir, "pdfjs");
await mkdir(join(pdfjsOut, "wasm"), { recursive: true });
for (
  const [from, to] of [
    ["LICENSE", "LICENSE"],
    ["build/pdf.worker.min.mjs", "pdf.worker.min.mjs"],
    ["web/pdf_viewer.css", "pdf_viewer.css"],
    ["web/images", "images"],
    ["cmaps", "cmaps"],
    ["standard_fonts", "standard_fonts"],
    ["iccs", "iccs"],
    ["wasm/openjpeg.wasm", "wasm/openjpeg.wasm"],
    ["wasm/openjpeg_nowasm_fallback.js", "wasm/openjpeg_nowasm_fallback.js"],
    ["wasm/jbig2.wasm", "wasm/jbig2.wasm"],
    ["wasm/jbig2_nowasm_fallback.js", "wasm/jbig2_nowasm_fallback.js"],
    ["wasm/qcms_bg.wasm", "wasm/qcms_bg.wasm"],
  ]
) {
  await cp(join(pdfjs, from), join(pdfjsOut, to), { recursive: true });
}
