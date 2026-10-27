import * as pdfjsLib from "pdfjs-dist";

// pdf_viewer.mjs 在模块加载时就要读取全局的 pdfjsLib, 必须在它之前执行
(globalThis as { pdfjsLib?: typeof pdfjsLib }).pdfjsLib = pdfjsLib;
