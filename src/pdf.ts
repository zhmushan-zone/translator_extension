/**
 * 内置的 PDF 阅读器 (#12). 浏览器自带的 PDF 阅读器里注入不了脚本,
 * 这里用 pdf.js 渲染出可以选中的文字层, 划词翻译沿用页面里加载的 content_script.js.
 */
import "./lib/pdfjs-global";
import { getDocument, GlobalWorkerOptions, type PDFDocumentLoadingTask } from "pdfjs-dist";
import { EventBus, PDFLinkService, PDFViewer } from "pdfjs-dist/web/pdf_viewer.mjs";

const title = document.querySelector("#title") as HTMLElement;
const pages = document.querySelector("#pages") as HTMLElement;
const zoom = document.querySelector("#zoom") as HTMLElement;
const zoomIn = document.querySelector("#zoomIn") as HTMLButtonElement;
const zoomOut = document.querySelector("#zoomOut") as HTMLButtonElement;
const open = document.querySelector("#open") as HTMLButtonElement;
const fileInput = document.querySelector("#file") as HTMLInputElement;
const container = document.querySelector("#viewerContainer") as HTMLDivElement;
const state = document.querySelector("#state") as HTMLElement;
const message = document.querySelector("#message") as HTMLElement;
const hint = document.querySelector("#hint") as HTMLElement;
const action = document.querySelector("#action") as HTMLButtonElement;

// worker、字体、字符映射表等资源由构建脚本复制到 pdfjs/ 目录
const asset = (path: string) => chrome.runtime.getURL(`pdfjs/${path}`);
GlobalWorkerOptions.workerSrc = asset("pdf.worker.min.mjs");

const eventBus = new EventBus();
const linkService = new PDFLinkService({ eventBus });
const viewer = new PDFViewer({ container, eventBus, linkService });
linkService.setViewer(viewer);
let loadingTask: PDFDocumentLoadingTask | undefined;

eventBus.on("pagesinit", () => (viewer.currentScaleValue = "auto"));
eventBus.on("pagechanging", ({ pageNumber }: { pageNumber: number }) => {
  pages.textContent = `${pageNumber} / ${viewer.pagesCount}`;
});
eventBus.on("scalechanging", ({ scale }: { scale: number }) => {
  zoom.textContent = `${Math.round(scale * 100)}%`;
});
zoomIn.addEventListener("click", () => viewer.increaseScale());
zoomOut.addEventListener("click", () => viewer.decreaseScale());

open.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (file) openFile(file);
  fileInput.value = "";
});

window.addEventListener("dragover", (evt) => {
  evt.preventDefault();
  state.classList.add("dragging");
});
window.addEventListener("dragleave", (evt) => {
  if (!evt.relatedTarget) state.classList.remove("dragging");
});
window.addEventListener("drop", (evt) => {
  evt.preventDefault();
  state.classList.remove("dragging");
  const file = evt.dataTransfer?.files[0];
  if (file) openFile(file);
});

const file = new URLSearchParams(location.search).get("file");
if (file) openUrl(file);

async function openFile(file: File) {
  const err = await load({ data: new Uint8Array(await file.arrayBuffer()) }, file.name);
  if (err) showError(err);
}

/**
 * 打开网页上的 PDF. 划词翻译的 content script 本身就能访问所有网站, 一般可以直接读取;
 * 用户在扩展设置里限制了网站访问权限时会读取失败, 这时再请用户授权这个域名.
 */
async function openUrl(url: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return showState(`无法识别的地址：${url}`, { error: true });
  }
  const name = decodeURIComponent(parsed.pathname.split("/").pop() || "") ||
    parsed.hostname;

  if (parsed.protocol === "file:") {
    const allowed = await new Promise<boolean>((resolve) =>
      chrome.extension.isAllowedFileSchemeAccess(resolve)
    );
    if (!allowed) {
      return showState("打开本地 PDF 需要开启“允许访问文件 URL”", {
        hint: "也可以直接把文件拖到这里",
        action: ["去开启", () =>
          chrome.tabs.create({ url: `chrome://extensions/?id=${chrome.runtime.id}` })],
      });
    }
  }

  const err = await load({ url }, name);
  if (!err) return;
  // 服务器返回了错误状态或者内容不是 PDF, 都与权限无关
  if (err?.name !== "UnknownErrorException" || parsed.protocol === "file:") {
    return showError(err, url);
  }
  // 读取失败时区分是网络不通, 还是能连上但没有读取这个网站的权限
  const reachable = await fetch(url, { method: "HEAD", mode: "no-cors" })
    .then(() => true, () => false);
  if (!reachable) {
    return showState(`无法连接到 ${parsed.hostname}`, { error: true, hint: url });
  }
  const origins = [`${parsed.origin}/*`];
  showState(`需要允许访问 ${parsed.hostname} 才能打开这个 PDF`, {
    hint: "只用于读取这个 PDF 文件",
    action: ["允许访问", () =>
      chrome.permissions.request({ origins }, async (ok) => {
        const retry = ok && await load({ url }, name);
        if (retry) showError(retry, url);
      })],
  });
}

/**
 * 打开成功时返回 undefined, 失败时返回错误, 由调用方决定怎么提示.
 */
async function load(source: { url: string } | { data: Uint8Array }, name: string) {
  showState("正在打开…", { hint: name });
  try {
    const task = getDocument({
      ...source,
      cMapUrl: asset("cmaps/"),
      cMapPacked: true,
      standardFontDataUrl: asset("standard_fonts/"),
      wasmUrl: asset("wasm/"),
      iccUrl: asset("iccs/"),
      withCredentials: true,
    });
    const doc = await task.promise;
    // 打开新文件后释放上一个文件占用的 worker 和内存
    await loadingTask?.destroy();
    loadingTask = task;
    // 先显示阅读区再交给 pdf.js, 隐藏状态下量不出尺寸, 页面不会渲染
    for (const el of [container, pages, zoom, zoomIn, zoomOut]) el.hidden = false;
    state.hidden = true;
    viewer.setDocument(doc);
    linkService.setDocument(doc);
    pages.textContent = `1 / ${doc.numPages}`;
    title.textContent = document.title = name;
  } catch (err: any) {
    console.warn(err);
    return err;
  }
}

function isResponseError(err: any) {
  return typeof err?.status === "number" && err.status > 0;
}

function showError(err: any, url = "") {
  if (isResponseError(err)) {
    return showState(`服务器拒绝了请求（HTTP ${err.status}）`, { error: true, hint: url });
  }
  if (err?.name === "InvalidPDFException") {
    return showState("这不是有效的 PDF 文件", { error: true, hint: url });
  }
  if (err?.name === "PasswordException") {
    return showState("暂不支持打开有密码的 PDF", { error: true, hint: url });
  }
  showState("无法打开这个 PDF", { error: true, hint: err?.message ?? String(err) });
}

function showState(
  text: string,
  { error = false, hint: hintText = "", action: button }: {
    error?: boolean;
    hint?: string;
    action?: [string, () => void];
  } = {},
) {
  container.hidden = true;
  state.hidden = false;
  message.textContent = text;
  message.classList.toggle("error", error);
  hint.textContent = hintText;
  action.hidden = !button;
  if (button) {
    action.textContent = button[0];
    action.onclick = button[1];
  }
}
