const UISwitch = document.querySelector(
  "#UISwitch",
) as HTMLInputElement;
const globalSwitch = document.querySelector(
  "#globalSwitch",
) as HTMLInputElement;

chrome.storage.sync.get("globalSwitch", (data) => {
  if (data.globalSwitch !== false) {
    chrome.storage.sync.set({ globalSwitch: true });
    globalSwitch.checked = true;
  }
});

chrome.storage.sync.get("UISwitch", (data) => {
  if (data.UISwitch) {
    UISwitch.checked = true;
  }
});

UISwitch.addEventListener("click", () => {
  chrome.storage.sync.set({ UISwitch: UISwitch.checked });
});

globalSwitch.addEventListener("click", () => {
  chrome.storage.sync.set({ globalSwitch: globalSwitch.checked });
});

const siteRadios = document.querySelectorAll<HTMLInputElement>(
  "input[name=site]",
);

/**
 * 当前站点: 跟随全局 / 开启 / 关闭 (#23).
 * 开启和关闭分别存为 true/false, 跟随全局时不存.
 */
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const url = tabs[0]?.url ?? "";
  // 本地文件需要用户在扩展详情页手动开启访问权限 (#21)
  if (url.startsWith("file:")) {
    chrome.extension.isAllowedFileSchemeAccess((allowed) => {
      document.querySelector<HTMLElement>("#fileHint")!.hidden = allowed;
    });
  }
  const domain = url ? new URL(url).hostname : "";
  if (!domain) {
    siteRadios.forEach((radio) => (radio.disabled = true));
    return;
  }
  document.querySelector("#site")!.setAttribute("title", domain);
  chrome.storage.sync.get(domain, (data) => {
    const value = data[domain] === true ? "on" : data[domain] === false ? "off" : "follow";
    siteRadios.forEach((radio) => (radio.checked = radio.value === value));
  });
  siteRadios.forEach((radio) =>
    radio.addEventListener("change", () => {
      if (radio.value === "follow") chrome.storage.sync.remove(domain);
      else chrome.storage.sync.set({ [domain]: radio.value === "on" });
    })
  );
});

const engineRadios = document.querySelectorAll<HTMLInputElement>(
  "input[name=engine]",
);
const agentRadio = document.querySelector("#engine-agent") as HTMLInputElement;
const testEngines = document.querySelector("#testEngines") as HTMLButtonElement;

chrome.storage.sync.get("engine", ({ engine = "volcengine" }) => {
  engineRadios.forEach((radio) => (radio.checked = radio.value === engine));
});

chrome.storage.local.get("agent", ({ agent }) => {
  if (!agent?.baseURL || !agent?.model) {
    agentRadio.disabled = true;
    setEngineStatus(agentRadio, "", "未配置");
  }
});

engineRadios.forEach((radio) =>
  radio.addEventListener("change", () => {
    chrome.storage.sync.set({ engine: radio.value });
  })
);

testEngines.addEventListener("click", () => {
  engineRadios.forEach((radio) => {
    if (radio.disabled) return;
    setEngineStatus(radio, "", "测试中…");
    chrome.runtime.sendMessage(
      { type: "test", engine: radio.value },
      (resp: TestResult) => {
        if (resp.ok) setEngineStatus(radio, "ok", `${resp.ms}ms`, resp.result);
        else setEngineStatus(radio, "error", "失败", resp.error);
      },
    );
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

const shortcut = document.querySelector("#shortcut") as HTMLButtonElement;

// 设置了自定义快捷键时显示自定义的, 否则是默认的 Ctrl+Alt
chrome.commands.getAll((commands) => {
  const custom = commands.find((c) => c.name === "toggle-translation")?.shortcut;
  shortcut.textContent = custom || "Ctrl+Alt";
});

shortcut.addEventListener("click", () => {
  chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
});

document.querySelector("#openDetails")!.addEventListener("click", () => {
  chrome.tabs.create({ url: `chrome://extensions/?id=${chrome.runtime.id}` });
});

/**
 * 当前标签页是 PDF 时在内置阅读器里重新打开它, 否则打开空白的阅读器 (#12).
 */
document.querySelector("#openPdf")!.addEventListener("click", () => {
  const reader = chrome.runtime.getURL("pdf.html");
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    const url = tab?.url ?? "";
    const isPdfUrl = /^(https?|file):/.test(url) && /\.pdf$/i.test(new URL(url).pathname);
    const openReader = (isPdf: boolean) => {
      if (isPdf) chrome.tabs.update(tab.id!, { url: `${reader}?file=${encodeURIComponent(url)}` });
      else chrome.tabs.create({ url: reader });
      window.close();
    };
    if (tab?.id === undefined || isPdfUrl) return openReader(isPdfUrl);
    chrome.tabs.sendMessage(tab.id, { type: "contentType" }, { frameId: 0 }, (type) => {
      openReader(!chrome.runtime.lastError && type === "application/pdf");
    });
  });
});
