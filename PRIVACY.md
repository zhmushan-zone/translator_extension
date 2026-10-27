# 隐私政策 / Privacy Policy

生效日期 / Effective date: 2026-10-27

## 中文

**结论：极简翻译没有自己的服务器，开发者不会收到你的任何数据。唯一离开你设备的数据，是你划选的文字，它会被发送给你选择的翻译服务，仅用于翻译。**

### 发送给第三方的数据

当你在网页上划选文字时，扩展会把这段文字发送给当前选择的翻译引擎，并在页面上显示译文：

| 翻译引擎 | 接收方 |
|---|---|
| 火山翻译 | 火山引擎 `translate.volcengine.com` |
| 腾讯交互翻译 | 腾讯 `transmart.qq.com` |
| 必应翻译 | 微软 `cn.bing.com` |
| Agent 翻译 | 你在设置页里自行填写的大模型网关 |

- 选择的引擎请求失败时，扩展会依次改用火山翻译、腾讯交互翻译、必应翻译，确保翻译可用。
- 除划选的文字外，扩展不会读取或发送网页的其他内容，也不会记录浏览历史。
- 这些服务如何处理收到的文字，以各服务提供方的隐私政策为准。

### PDF 阅读器

- 在内置的 PDF 阅读器里打开 PDF 时，扩展会从该 PDF 的网址读取文件（或读取你拖进来的本地文件），只在本地渲染显示，不会上传到任何地方。在 PDF 里划词翻译时，同样只发送选中的文字。
- 如果你在浏览器里限制了扩展的网站访问权限，打开某个网站上的 PDF 时会请你授权访问这个域名，授权只用于读取这个 PDF。

### 保存在本地的数据

- 开关设置（全局开关、站点开关、界面风格）和所选的翻译引擎，保存在浏览器的扩展存储中。如果你开启了浏览器的同步功能，这些设置会随浏览器账号同步。开启“当前站点”开关时，会保存该网站的域名。
- Agent 翻译的配置（网关地址、API Key、模型名）只保存在本机，不会同步，只会发送给你自己填写的网关。

### 不做的事

- 不收集统计数据，不使用 Cookie 或任何追踪技术。
- 不出售、不转让用户数据，不将数据用于翻译以外的任何用途。

Firefox 版只使用火山翻译和腾讯交互翻译，没有设置页，划词开关的状态保存在当前网页的本地存储（localStorage）中。

### 联系方式

zhmushan@qq.com

## English

**In short: this extension has no server of its own, and the developer never receives any of your data. The only data that leaves your device is the text you select, which is sent to the translation service you choose, solely to translate it.**

### Data sent to third parties

When you select text on a web page, the extension sends that text to the selected translation engine and shows the translation next to the selection:

| Engine | Recipient |
|---|---|
| Volcengine | Volcengine, `translate.volcengine.com` |
| Tencent TranSmart | Tencent, `transmart.qq.com` |
| Bing | Microsoft, `cn.bing.com` |
| Agent (AI) | The AI/LLM gateway you configure yourself on the settings page |

- If the selected engine fails, the extension falls back to Volcengine, Tencent TranSmart and Bing in turn, so that translation keeps working.
- Apart from the selected text, the extension does not read or send any other page content, and does not record your browsing history.
- How these services handle the text they receive is governed by their own privacy policies.

### PDF reader

- When you open a PDF in the built-in PDF reader, the extension reads the file from the PDF's URL (or the local file you drop in) and renders it locally. The PDF is never uploaded anywhere. Selecting text in a PDF sends only the selected text, as above.
- If you have restricted the extension's site access in the browser, opening a PDF from a website asks you to allow access to that domain, which is used only to read that PDF.

### Data stored on your device

- Your switches (global, per-site, UI style) and the selected engine are saved in the browser's extension storage. If browser sync is turned on, these settings are synced with your browser account. Turning on the per-site switch saves that website's domain name.
- The Agent settings (gateway URL, API key, model name) are stored on your device only. They are never synced, and are only sent to the gateway you configured.

### What the extension does not do

- No analytics, no cookies, no tracking of any kind.
- User data is never sold or transferred, and is not used for any purpose other than translation.

The Firefox version only uses Volcengine and Tencent TranSmart. It has no settings page, and stores the on/off switch in the current web page's local storage (localStorage).

### Contact

zhmushan@qq.com
