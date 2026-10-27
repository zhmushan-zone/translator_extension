const UISwitch = document.querySelector(
  "#UISwitch",
) as HTMLInputElement;
const currentSiteSwitch = document.querySelector(
  "#currentSiteSwitch",
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

chrome.tabs.query({ active: true }, (tabs) => {
  const path = tabs[0].url;
  if (path) {
    const url = new URL(path);
    const domain = url.hostname;
    chrome.storage.sync.get(domain, (result) => {
      if (result[domain]) {
        currentSiteSwitch.checked = true;
      }
    });
  } else {
    currentSiteSwitch.disabled = true;
  }
});

currentSiteSwitch.addEventListener("click", () => {
  const checked = currentSiteSwitch.checked;
  chrome.tabs.query({ active: true }, (tabs) => {
    const url = new URL(tabs[0].url!);
    const domain = url.hostname;
    if (checked) {
      const data: Record<string, any> = {};
      data[domain] = true;
      chrome.storage.sync.set(data);
    } else {
      chrome.storage.sync.remove(domain);
    }
  });
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

chrome.commands.getAll((commands) => {
  const key = commands.find((c) => c.name === "toggle-translation")?.shortcut;
  shortcut.textContent = key ? `快捷键 ${key}` : "设置快捷键";
});

shortcut.addEventListener("click", () => {
  chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
});
