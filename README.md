# 技术早报

每天 **8:00（北京时间 / Asia/Shanghai）** 更新的中文技术资讯页。

在线地址（GitHub Pages）：https://stabey.github.io/tech-brief/

## 页面里有什么

- **今日速览**：过去 24 小时值得先看的几条
- **特别关注**：固定跟踪的 X 账号（Elon / Tibo / poteto）及互动亮点
- **社区热议**：Hacker News、Reddit、Lobsters 等
- **临时关注**：临时加账号或话题
- **播客**：每期语音（`audio/`）

## 喜欢 / 不喜欢

每条卡片上的「喜欢」「不喜欢」会：

1. 立刻写入浏览器 `localStorage`（页面马上变色）
2. 打开一个 GitHub Issue（需已登录 GitHub），title 形如 `[like] item_id`，label=`rating`

每天早报会读取这些 Issue，汇总进 `data/ratings.json`，用来调整次日搜集。

## 临时关注

在「临时关注」面板填写账号（不带 `@`）或话题、过期天数（默认 7），提交后会：

1. 本地记一份
2. 打开 Issue，title 形如 `[watch] account:@foo expires:YYYY-MM-DD`，label=`watch`

早报例行会把未过期的 watch 写回 `data/config.json` 的 `temp_watches`。

**不需要再注册其他账号**，用已有的 GitHub 账号即可。

## 数据文件

| 路径 | 说明 |
|------|------|
| `data/latest.json` | 最新一期 |
| `issues/YYYY-MM-DD.json` | 每日归档 |
| `data/config.json` | 时区、固定账号、临时关注 |
| `data/ratings.json` | 汇总后的评分 |
| `audio/YYYY-MM-DD.mp3` | 播客音频 |

## 本地预览

纯静态，无构建步骤：

```bash
cd tech-brief
python3 -m http.server 8080
# 打开 http://127.0.0.1:8080/
```

仓库根目录放有 `.nojekyll`，便于 GitHub Pages 直接托管静态文件。
