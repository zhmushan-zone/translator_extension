const protocolRadios = document.querySelectorAll<HTMLInputElement>(
  "input[name=protocol]",
);
const baseURL = document.querySelector("#baseURL") as HTMLInputElement;
const baseURLHint = document.querySelector("#baseURLHint") as HTMLElement;
const apiKey = document.querySelector("#apiKey") as HTMLInputElement;
const model = document.querySelector("#model") as HTMLInputElement;
const models = document.querySelector("#models") as HTMLElement;
const detect = document.querySelector("#detect") as HTMLButtonElement;
const save = document.querySelector("#save") as HTMLButtonElement;
const test = document.querySelector("#test") as HTMLButtonElement;
const statusLine = document.querySelector("#status") as HTMLElement;

const protocolHints = {
  openai: {
    placeholder: "https://api.deepseek.com",
    hint: "只填域名时自动补全 /v1，也可以填完整路径，如 <code>https://ark.cn-beijing.volces.com/api/v3</code>",
  },
  anthropic: {
    placeholder: "https://api.anthropic.com",
    hint: "地址后会自动拼接 /v1/messages，第三方兼容网关如 <code>https://api.deepseek.com/anthropic</code>",
  },
};

chrome.storage.local.get("agent", ({ agent }: { agent?: AgentConfig }) => {
  if (agent) {
    protocolRadios.forEach((radio) => (radio.checked = radio.value === agent.protocol));
    baseURL.value = agent.baseURL;
    apiKey.value = agent.apiKey;
    model.value = agent.model;
  }
  updateHint();
});

protocolRadios.forEach((radio) =>
  radio.addEventListener("change", () => {
    updateHint();
    models.hidden = true;
  })
);

model.addEventListener("input", filterModels);

detect.addEventListener("click", () => {
  const config = readConfig();
  if (!config.baseURL) return setStatus("error", "请先填写网关地址");
  withPermission(config, () => {
    setBusy(detect, "探测中…");
    setStatus("", "");
    chrome.runtime.sendMessage(
      { type: "models", config },
      (resp: ModelsResult) => {
        setBusy(detect);
        if (!resp.ok) return setStatus("error", `探测失败: ${resp.error}`);
        renderModels(resp.models);
        setStatus(
          resp.models.length ? "ok" : "error",
          resp.models.length
            ? `探测到 ${resp.models.length} 个模型`
            : "网关没有返回任何模型，请手动填写",
        );
      },
    );
  });
});

test.addEventListener("click", () => {
  const config = readConfig();
  const missing = validate(config);
  if (missing) return setStatus("error", missing);
  withPermission(config, () => {
    setBusy(test, "测试中…");
    setStatus("", "");
    chrome.runtime.sendMessage(
      { type: "test", engine: "agent", config },
      (resp: TestResult) => {
        setBusy(test);
        if (resp.ok) {
          setStatus("ok", `连通正常 · ${resp.ms}ms · Hello, world! → ${resp.result}`);
        } else {
          setStatus("error", `连接失败: ${resp.error}`);
        }
      },
    );
  });
});

save.addEventListener("click", () => {
  const config = readConfig();
  const missing = validate(config);
  if (missing) return setStatus("error", missing);
  withPermission(config, () => {
    chrome.storage.local.set({ agent: config });
    chrome.storage.sync.set({ engine: "agent" });
    setStatus("ok", `已保存，划词翻译将使用 ${config.model}`);
  });
});

function readConfig(): AgentConfig {
  const checked = [...protocolRadios].find((radio) => radio.checked);
  return {
    protocol: checked?.value === "anthropic" ? "anthropic" : "openai",
    baseURL: baseURL.value.trim(),
    apiKey: apiKey.value.trim(),
    model: model.value.trim(),
  };
}

function validate(config: AgentConfig) {
  if (!config.baseURL) return "请先填写网关地址";
  if (!config.model) return "请先填写或探测模型";
}

/**
 * 自定义网关的域名事先未知, 按需申请访问权限.
 * 必须在点击事件里同步调用, 否则浏览器不会弹出授权.
 */
function withPermission(config: AgentConfig, then: () => void) {
  let origin: string;
  try {
    origin = new URL(config.baseURL).origin;
  } catch {
    return setStatus("error", "网关地址格式不正确，需要以 https:// 或 http:// 开头");
  }
  chrome.permissions.request({ origins: [`${origin}/*`] }, (granted) => {
    if (granted) then();
    else setStatus("error", `需要允许访问 ${origin} 才能调用这个网关`);
  });
}

function renderModels(list: string[]) {
  models.textContent = "";
  list.forEach((id, i) => {
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "modelOption";
    radio.id = `model-${i}`;
    radio.value = id;
    radio.checked = id === model.value.trim();
    radio.addEventListener("change", () => (model.value = id));
    const label = document.createElement("label");
    label.htmlFor = radio.id;
    label.textContent = id;
    models.append(radio, label);
  });
  models.hidden = list.length === 0;
}

/**
 * 模型很多时, 输入框同时充当筛选框.
 */
function filterModels() {
  const keyword = model.value.trim().toLowerCase();
  models.querySelectorAll<HTMLInputElement>("input").forEach((radio) => {
    radio.checked = radio.value === model.value.trim();
    (radio.nextElementSibling as HTMLElement).hidden = !radio.value
      .toLowerCase()
      .includes(keyword);
  });
}

function updateHint() {
  const { placeholder, hint } = protocolHints[readConfig().protocol];
  baseURL.placeholder = placeholder;
  baseURLHint.innerHTML = hint;
}

function setBusy(button: HTMLButtonElement, text?: string) {
  if (text) {
    button.dataset.text = button.textContent!;
    button.textContent = text;
  } else {
    button.textContent = button.dataset.text!;
  }
  button.disabled = Boolean(text);
}

function setStatus(state: "" | "ok" | "error", text: string) {
  statusLine.className = `status ${state}`;
  statusLine.textContent = text;
}
