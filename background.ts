type Lang = "zh" | "en";
type Engine = (text: string, from: Lang, to: Lang) => Promise<string | undefined>;

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get("globalSwitch", (data) => {
    if (data.globalSwitch === undefined) {
      chrome.storage.sync.set({ globalSwitch: true });
    }
  });
});

chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
  if (message.type === "check") checkGlobalOrCurrent(sendResponse);
  else if (message.type === "toggleGlobal") toggleGlobal(sendResponse);
  else if (message.type === "ui") ui(sendResponse);
  else if (message.type === "translate") translate(sendResponse, message);
  return true;
});

/**
 * 国内无需翻墙即可直连的免费接口, 按顺序尝试, 前一个失败再换下一个.
 */
const engines: Engine[] = [volcengine, transmart];

async function translate(func: Function, { text, from, to }: {
  text: string;
  from: Lang;
  to: Lang;
}) {
  for (const engine of engines) {
    try {
      const result = await engine(text, from, to);
      if (result) return func(result);
    } catch (err) {
      console.warn(`[${engine.name}]`, err);
    }
  }
  func("翻译失败, 请检查网络后重试");
}

async function volcengine(text: string, from: Lang, to: Lang) {
  const data = await post("https://translate.volcengine.com/crx/translate/v1/", {
    source_language: from,
    target_language: to,
    text,
  });
  return data.translation as string | undefined;
}

const transmartClientKey = `browser-chrome-120.0.0-Mac_OS-${Math.random().toString(36).slice(2)}-${Date.now()}`;

async function transmart(text: string, from: Lang, to: Lang) {
  const data = await post("https://transmart.qq.com/api/imt", {
    header: { fn: "auto_translation", client_key: transmartClientKey },
    type: "plain",
    model_category: "normal",
    source: { lang: from, text_list: [text] },
    target: { lang: to },
  });
  return (data.auto_translation as string[] | undefined)?.join("\n");
}

async function post(url: string, body: unknown) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.json();
  } finally {
    clearTimeout(timer);
  }
}

function checkGlobalOrCurrent(func: Function) {
  chrome.tabs.query({ active: true }, (tabs) => {
    const domain = new URL(tabs[0].url!).hostname;
    chrome.storage.sync.get(["globalSwitch", domain], (data) => {
      let res = false;
      if (data.globalSwitch || data[domain]) res = true;
      func(res);
    });
  });
}

function toggleCurrent(func: Function) {
  chrome.tabs.query({ active: true }, (tabs) => {
    const domain = new URL(tabs[0].url!).hostname;
    chrome.storage.sync.get(domain, (data) => {
      data[domain] = !data[domain];
      chrome.storage.sync.set(data);
      func(data[domain]);
    });
  });
}

function toggleGlobal(func: Function) {
  chrome.storage.sync.get("globalSwitch", (data) => {
    data["globalSwitch"] = !data["globalSwitch"];
    chrome.storage.sync.set(data);
    func(data["globalSwitch"]);
  });
}

function ui(func: Function) {
  chrome.storage.sync.get("UISwitch", (data) => {
    let res = false;
    if (data.UISwitch) res = true;
    func(res);
  });
}
