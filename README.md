# 电影档案

一个面向中文用户的私人电影收集网页。用户可以搜索电影、快速加入自己的影单，并记录观后感、碎片想法和标签。

## 当前功能

- 通过 TMDB 即搜即用检索电影，不在本地维护电影库
- 搜索结果显示片名、年份和海报，点击即可加入影单
- 3D 影单陈列与海报网格
- 游客试用与第 4 部绑定引导原型
- 电影详情记录区
- 感受标记：无感 / 值得 / 热爱 / 神作
- 主记录、碎片记录、标签
- 可选 BGM 开关

## 配置 TMDB

1. 打开 https://www.themoviedb.org/settings/api 注册并申请 API。
2. 优先复制 `API Read Access Token`。
3. 新建 `.env.local`，填入：

```bash
TMDB_READ_ACCESS_TOKEN=你的_TMDB_Read_Access_Token
```

如果你只有 v3 API Key，也可以填：

```bash
TMDB_API_KEY=你的_TMDB_API_Key
```

`TMDB_READ_ACCESS_TOKEN` 和 `TMDB_API_KEY` 都不要提交到 Git。

## 开发

```bash
npm install
npm run dev
```

打开 http://127.0.0.1:3000 。

## 验证

```bash
npm test
npm run build
```

## 许可证

本项目使用 [Apache-2.0 license](LICENSE)。