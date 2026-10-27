import { agent, engines, errorText, freeEngines, listModels } from "./lib/engines";
import { stripComment } from "./lib/text";
import type { EngineId, Message, Responses, TabMessage } from "./lib/types";

chrome.runtime.onInstalled.addListener(async () => {
  const { globalSwitch } = await chrome.storage.sync.get("globalSwitch");
  if (globalSwitch === undefined) await chrome.storage.sync.set({ globalSwitch: true });
});

type Handlers = {
  [K in Message["type"]]: (
    message: Extract<Message, { type: K }>,
    sender: chrome.runtime.MessageSender,
  ) => Promise<Responses[K]>;
};

const handlers: Handlers = {
  check: (_, sender) => isEnabled(sender.tab?.url),
  toggleGlobal: (_, sender) => handleDefaultShortcut(sender.tab),
  ui: async () => Boolean((await chrome.storage.sync.get("UISwitch")).UISwitch),
  translate,
  test: testEngine,
  models: ({ config }) => listModels(config),
};

chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  const handler = handlers[message.type] as
    | ((message: Message, sender: chrome.runtime.MessageSender) => Promise<unknown>)
    | undefined;
  if (!handler) return;
  handler(message, sender).then(sendResponse);
  return true;
});

/**
 * 开关划词翻译的快捷键默认是 Ctrl+Alt, 由 content script 监听;
 * 用户在扩展快捷键设置页设置了自定义快捷键后, 用它替代 Ctrl+Alt (#16, #19).
 */
chrome.commands.onCommand.addListener(handleCommand);

async function handleCommand(command: string, tab?: chrome.tabs.Tab) {
  if (command === "toggle-translation") await toggleAndTip(tab);
}

async function handleDefaultShortcut(tab?: chrome.tabs.Tab) {
  const commands = await chrome.commands.getAll();
  const custom = commands.find((c) => c.name === "toggle-translation")?.shortcut;
  if (!custom) await toggleAndTip(tab);
}

async function toggleAndTip(tab?: chrome.tabs.Tab) {
  const on = !(await chrome.storage.sync.get("globalSwitch")).globalSwitch;
  await chrome.storage.sync.set({ globalSwitch: on });
  if (tab?.id === undefined) return;
  // 只在顶层页面提示, 避免页面里的每个 iframe 都弹一次
  const tip: TabMessage = { type: "tip", on };
  await chrome.tabs.sendMessage(tab.id, tip, { frameId: 0 }).catch(() => {});
}

/**
 * 当前站点单独设置过开启/关闭时以站点为准, 否则跟随全局 (#23).
 * 站点取发出划词请求的标签页, 而不是任意窗口的活动标签页.
 */
async function isEnabled(url = "") {
  const domain = url ? new URL(url).hostname : "";
  const data = await chrome.storage.sync.get(domain ? ["globalSwitch", domain] : "globalSwitch");
  const site = domain ? data[domain] : undefined;
  return typeof site === "boolean" ? site : Boolean(data.globalSwitch);
}

async function translate({ text, from, to }: Extract<Message, { type: "translate" }>) {
  text = stripComment(text);
  const { engine = "volcengine" } = await chrome.storage.sync.get("engine") as { engine?: EngineId };
  for (const id of [engine, ...freeEngines.filter((e) => e !== engine)]) {
    try {
      const result = await engines[id](text, from, to);
      if (result) return result;
    } catch (err) {
      console.warn(`[${id}]`, err);
    }
  }
  return "翻译失败, 请检查网络后重试";
}

async function testEngine({ engine, config }: Extract<Message, { type: "test" }>) {
  const start = Date.now();
  try {
    const result = engine === "agent"
      ? await agent("Hello, world!", "en", "zh", config)
      : await engines[engine]("Hello, world!", "en", "zh");
    if (!result) throw new Error("返回结果为空");
    return { ok: true as const, ms: Date.now() - start, result };
  } catch (err) {
    return { ok: false as const, error: errorText(err) };
  }
}

// 端到端测试需要替换引擎、直接调用内部函数; 正式构建里 E2E 为 false, 这段会被删掉
if (process.env.E2E === "true") {
  Object.assign(globalThis, { engines, handleCommand, translate, stripComment });
}
