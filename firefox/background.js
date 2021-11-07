browser.runtime.onMessage.addListener((message, _, sendResponse) => {
  if (message.type === "fetch") fich(sendResponse, message.url);
  return true;
});

function fich(func, url) {
  fetch(url)
    .then((r) => r.text())
    .then((html) => func(html));
}
