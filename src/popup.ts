import { send, type AgentConfig, type EngineId, type TabMessage } from "./lib/types";

const UISwitch = document.querySelector("#UISwitch") as HTMLInputElement;
const globalSwitch = document.querySelector("#globalSwitch") as HTMLInputElement;
const siteRadios = document.querySelectorAll<HTMLInputElement>("input[name=site]");
const engineRadios = document.querySelectorAll<HTMLInputElement>("input[name=engine]");
const agentRadio = document.querySelector("#engine-agent") as HTMLInputElement;
const testEngines = document.querySelector("#testEngines") as HTMLButtonElement;
const shortcut = document.querySelector("#shortcut") as HTMLButtonElement;

const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
const url = tab?.url ?? "";
const settings = await chrome.storage.sync.get(["globalSwitch", "UISwitch", "engine"]);

if (settings.globalSwitch !== false) {
  await chrome.storage.sync.set({ globalSwitch: true });
  globalSwitch.checked = true;
}
UISwitch.checked = Boolean(settings.UISwitch);

UISwitch.addEventListener("click", () => {
  chrome.storage.sync.set({ UISwitch: UISwitch.checked });
});

globalSwitch.addEventListener("click", () => {
  chrome.storage.sync.set({ globalSwitch: globalSwitch.checked });
});

/**
 * 当前站点: 跟随全局 / 开启 / 关闭 (#23).
 * 开启和关闭分别存为 true/false, 跟随全局时不存.
 */
const domain = url ? new URL(url).hostname : "";
// 本地文件需要用户在扩展详情页手动开启访问权限 (#21)
if (url.startsWith("file:")) {
  const allowed = await chrome.extension.isAllowedFileSchemeAccess();
  document.querySelector<HTMLElement>("#fileHint")!.hidden = allowed;
}
if (domain) {
  document.querySelector("#site")!.setAttribute("title", domain);
  const site = (await chrome.storage.sync.get(domain))[domain];
  const value = site === true ? "on" : site === false ? "off" : "follow";
  siteRadios.forEach((radio) => (radio.checked = radio.value === value));
  siteRadios.forEach((radio) =>
    radio.addEventListener("change", () => {
      if (radio.value === "follow") chrome.storage.sync.remove(domain);
      else chrome.storage.sync.set({ [domain]: radio.value === "on" });
    })
  );
} else {
  siteRadios.forEach((radio) => (radio.disabled = true));
}

const engine = (settings.engine as EngineId | undefined) ?? "volcengine";
engineRadios.forEach((radio) => (radio.checked = radio.value === engine));

const agent = (await chrome.storage.local.get("agent")).agent as AgentConfig | undefined;
if (!agent?.baseURL || !agent?.model) {
  agentRadio.disabled = true;
  setEngineStatus(agentRadio, "", "未配置");
}

engineRadios.forEach((radio) =>
  radio.addEventListener("change", () => {
    chrome.storage.sync.set({ engine: radio.value });
  })
);

testEngines.addEventListener("click", () => {
  engineRadios.forEach(async (radio) => {
    if (radio.disabled) return;
    setEngineStatus(radio, "", "测试中…");
    const resp = await send({ type: "test", engine: radio.value as EngineId });
    if (resp.ok) setEngineStatus(radio, "ok", `${resp.ms}ms`, resp.result);
    else setEngineStatus(radio, "error", "失败", resp.error);
  });
});

document.querySelector("#openOptions")!.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

function setEngineStatus(
  radio: HTMLInputElement,
  state: "" | "ok" | "error",
  text: string,
  detail = "",
) {
  const status = radio.nextElementSibling!.querySelector(".status")!;
  status.className = `status ${state}`;
  status.textContent = text;
  status.setAttribute("title", detail);
}

// 设置了自定义快捷键时显示自定义的, 否则是默认的 Ctrl+Alt
const commands = await chrome.commands.getAll();
const custom = commands.find((c) => c.name === "toggle-translation")?.shortcut;
shortcut.textContent = custom || "Ctrl+Alt";

shortcut.addEventListener("click", () => {
  chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
});

document.querySelector("#openDetails")!.addEventListener("click", () => {
  chrome.tabs.create({ url: `chrome://extensions/?id=${chrome.runtime.id}` });
});

/**
 * 当前标签页是 PDF 时在内置阅读器里重新打开它, 否则打开空白的阅读器 (#12).
 * 浏览器自带的 PDF 页面里也有 content script, 不带 .pdf 后缀的链接问它的 contentType.
 */
document.querySelector("#openPdf")!.addEventListener("click", async () => {
  const reader = chrome.runtime.getURL("pdf.html");
  const contentType: TabMessage = { type: "contentType" };
  const isPdf = (/^(https?|file):/.test(url) && /\.pdf$/i.test(new URL(url).pathname)) ||
    (tab?.id !== undefined &&
      await chrome.tabs.sendMessage(tab.id, contentType, { frameId: 0 })
        .then((type) => type === "application/pdf", () => false));
  if (isPdf) await chrome.tabs.update(tab!.id!, { url: `${reader}?file=${encodeURIComponent(url)}` });
  else await chrome.tabs.create({ url: reader });
  window.close();
});
