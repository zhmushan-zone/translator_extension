browser.runtime.onMessage.addListener((message, _, sendResponse) => {
  if (message.type === "translate") {
    translate(sendResponse, message);
  }
  return true;
});
/**
 * 国内无需翻墙即可直连的免费接口, 按顺序尝试, 前一个失败再换下一个.
 */
const engines = [volcengine, transmart];
async function translate(func, { text, from, to }) {
  for (const engine of engines) {
    try {
      const result = await engine(text, from, to);
      if (result) {
        return func(result);
      }
    } catch (err) {
      console.warn(`[${engine.name}]`, err);
    }
  }
  func("翻译失败, 请检查网络后重试");
}
async function volcengine(text, from, to) {
  const data = await post("https://translate.volcengine.com/crx/translate/v1/", {
    source_language: from,
    target_language: to,
    text,
  });
  return data.translation;
}
const transmartClientKey = `browser-firefox-120.0.0-Mac_OS-${Math.random().toString(36).slice(2)}-${Date.now()}`;
async function transmart(text, from, to) {
  const data = await post("https://transmart.qq.com/api/imt", {
    header: { fn: "auto_translation", client_key: transmartClientKey },
    type: "plain",
    model_category: "normal",
    source: { lang: from, text_list: [text] },
    target: { lang: to },
  });
  return data.auto_translation?.join("\n");
}
async function post(url, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }
    return await resp.json();
  } finally {
    clearTimeout(timer);
  }
}
