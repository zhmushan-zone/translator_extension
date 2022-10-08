browser.webRequest.onHeadersReceived.addListener(
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
browser.runtime.onMessage.addListener((message, _, sendResponse) => {
  if (message.type === "deepl") {
    deepl(sendResponse, message);
  }
  return true;
});
let deeplIFrame = document.createElement("iframe");
document.body.appendChild(deeplIFrame);
const DeeplPage = "https://www.deepl.com/translator";
deeplIFrame.src = DeeplPage;
async function deepl(func, { text, from, to }) {
  const result = await new Promise((resolve) => {
    const listener = (msg) => {
      if (
        !msg.data.type || msg.data.type !== "zhmushan_translator_deepl_response"
      ) {
        return;
      }
      window.removeEventListener("message", listener);
      if (msg.data.status === 200) {
        resolve(msg.data.result);
      }
    };
    window.addEventListener("message", listener);
    deeplIFrame.contentWindow.postMessage({
      type: "zhmushan_translator_deepl_request",
      url: `${DeeplPage}#${from}/${to}/${encodeURIComponent(text)}`,
    }, DeeplPage);
  });
  func(result);
}
