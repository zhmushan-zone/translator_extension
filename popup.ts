const currentSiteSwitch = document.querySelector(
  "#currentSiteSwitch"
) as HTMLInputElement;
const globalSwitch = document.querySelector(
  "#globalSwitch"
) as HTMLInputElement;

chrome.storage.sync.get("globalSwitch", data => {
  if (data.globalSwitch !== false) {
    chrome.storage.sync.set({ globalSwitch: true });
    globalSwitch.checked = true;
  } else {
    currentSiteSwitch.disabled = true;
  }
});

globalSwitch.addEventListener("click", () => {
  chrome.storage.sync.set({ globalSwitch: globalSwitch.checked });
  currentSiteSwitch.disabled = !globalSwitch.checked;
});

chrome.tabs.query({ active: true }, tabs => {
  const path = tabs[0].url;
  if (path) {
    const url = new URL(path);
    const domain = url.hostname;
    chrome.storage.sync.get(domain, result => {
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
  chrome.tabs.query({ active: true }, tabs => {
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
