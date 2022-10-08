chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    return ({
      responseHeaders: details.responseHeaders.map((header) =>
        /^content-security-policy$/i.test(header.name)
          ? {
            name: header.name,
            value: header.value.replaceAll(/frame-ancestors [^;]*;?/g, ""),
          }
          : header
      ),
    });
  },
  { urls: ["*://*.deepl.com/*"], types: ["main_frame", "sub_frame"] },
  ["blocking", "responseHeaders"],
);

chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
  if (message.type === "check") checkGlobalOrCurrent(sendResponse);
  else if (message.type === "fetch") fich(sendResponse, message.url);
  else if (message.type === "toggleGlobal") toggleGlobal(sendResponse);
  else if (message.type === "ui") ui(sendResponse);
  else if (message.type === "deepl") deepl(sendResponse, message);
  return true;
});

let deeplIFrame = document.createElement("iframe");
document.body.appendChild(deeplIFrame);
const DeeplPage = "https://www.deepl.com/translator";
deeplIFrame.src = DeeplPage;

async function deepl(func: Function, { text, from, to }) {
  const result = await new Promise<string>((resolve) => {
    const listener = (msg: MessageEvent) => {
      if (
        !msg.data.type || msg.data.type !== "zhmushan_translator_deepl_response"
      ) return;
      window.removeEventListener("message", listener);
      if (msg.data.status === 200) resolve(msg.data.result);
    };
    window.addEventListener("message", listener);

    deeplIFrame.contentWindow!.postMessage(
      {
        type: "zhmushan_translator_deepl_request",
        url: `${DeeplPage}#${from}/${to}/${encodeURIComponent(text)}`,
      },
      DeeplPage,
    );
  });
  func(result);
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

function fich(func: Function, url: string) {
  fetch(url)
    .then((r) => r.text())
    .then((html) => func(html));
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
