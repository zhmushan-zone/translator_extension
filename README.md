<p align="center">
  <img src="./public/icon_128.png" />
</p>

## 下载

- [微软商店](https://microsoftedge.microsoft.com/addons/detail/oidfnjkkpidjhkjfidpfijndijkgcilb)
- [火狐商店](https://addons.mozilla.org/en-US/firefox/addon/translate-extension)

## 开发

需要 [Bun](https://bun.sh)。

```bash
bun install
bun run build   # 构建到 chrome/ 目录，在扩展管理页用“加载解压缩的扩展”选择它
bun run check   # 类型检查和单元测试
```

推送 `v*` 格式的 tag 会自动构建并发布到 GitHub Release，附带的 `chrome.zip` 可以直接上传到扩展商店。
