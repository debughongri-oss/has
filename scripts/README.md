# 云函数部署脚本

用 `miniprogram-ci` 一行命令部署云函数，不再依赖开发者工具鼠标操作。

## 一次性配置（约 3 分钟）

### 1. 安装依赖

```bash
npm install
```

### 2. 获取小程序代码上传密钥

1. 登录 [mp.weixin.qq.com](https://mp.weixin.qq.com)
2. **开发管理** → **开发设置** → 找到"小程序代码上传密钥"
3. 点"**生成**"（首次）或"**重置**"（已生成过），下载 `.key` 文件
4. 把下载的 `.key` 文件重命名为 `private.key`，放到项目的 `.deploy-key/` 目录：

   ```
   hzs/
     .deploy-key/
       private.key     ← 你的密钥文件
     scripts/
     cloudfunctions/
     ...
   ```

   > `.deploy-key/` 已经在 `.gitignore` 里，密钥不会被提交到 git。

### 3. 配置 IP 白名单（**这一步经常被忘，会导致 40001 错误**）

同页面（开发设置）下方有"**IP 白名单**"：

1. 查你的本机出口 IP：浏览器打开 [https://cip.cc](https://cip.cc) 或 [https://ifconfig.me](https://ifconfig.me)
2. 把这个 IP 加到白名单
3. 等 1-2 分钟生效

## 日常使用

### 部署单个云函数

```bash
# 命令行
node scripts/deploy-cloudfunction.js works

# 或 npm script
npm run deploy:works
```

> **部署脚本会自动同步 shared/**：每次部署前，脚本会自动把 `cloudfunctions/shared/` 的内容复制到目标云函数的 `shared/` 子目录。源代码只维护一份，副本是生成物。

可选的云函数名（脚本会自动扫描 `cloudfunctions/` 目录）：

| 命令 | 部署目标 |
|---|---|
| `npm run deploy:works` | `works`（作品、海报 QR 码） |
| `npm run deploy:login` | `login`（登录、用户信息） |
| `npm run deploy:profile` | `profile`（化妆师资料） |
| `npm run deploy:services` | `services`（服务项目） |
| `npm run deploy:bookings` | `bookings`（预约） |
| `npm run deploy:reviews` | `reviews`（评价） |
| `npm run deploy:reminder` | `booking-reminder`（订阅消息提醒） |

### 一次部署所有云函数

```bash
npm run deploy:all
```

### 手动同步 shared/（用开发者工具部署前需要跑一次）

如果你用微信开发者工具手动部署（不走本脚本），部署前请先跑一次 sync：

```bash
npm run sync
```

这会把 `cloudfunctions/shared/` 同步到每个使用它的云函数内部的 `shared/` 子目录。否则云函数在云端会报 `Cannot find module './shared/auth'`。

### 用环境变量指定密钥路径（密钥不放项目里时）

```bash
WX_DEPLOY_KEY=/Users/you/keys/wx.key node scripts/deploy-cloudfunction.js works
```

## shared/ 模块工作机制

微信云开发的云函数是**独立部署单元**，部署时只上传单个云函数目录。`cloudfunctions/shared/auth.js` 是被多个云函数 `require` 的公共代码，但它不会被自动包含进任何一个云函数的部署包。

**解决方案**：维护单一源 + 部署前物理复制。

```
源（手动维护，commit 到 git）:
  cloudfunctions/shared/auth.js

部署前生成的副本（gitignored，部署时自动 sync）:
  cloudfunctions/bookings/shared/auth.js
  cloudfunctions/profile/shared/auth.js
  cloudfunctions/services/shared/auth.js
  cloudfunctions/works/shared/auth.js
```

4 个云函数内部用 `require('./shared/auth')`（本地路径）引用。修改 `cloudfunctions/shared/auth.js` 后，跑 `npm run sync` 或直接 `npm run deploy:all`（脚本会自动 sync）即可。

## 验证部署成功

部署完后，在微信开发者工具的**云开发控制台 → 云函数**列表里应该能看到对应云函数，状态为"已部署"。也可以直接重新触发业务流程（比如点详情页"生成海报"测试 `works`）。

## 常见错误

| 错误 | 原因 | 修复 |
|---|---|---|
| `密钥文件不存在` | 没放 `.deploy-key/private.key` | 按上面步骤 2 操作 |
| `40001 invalid credential` | 密钥错或 IP 不在白名单 | 检查密钥文件内容；按步骤 3 加 IP |
| `FunctionNameAlreadyExists` | 云函数已存在（正常，会覆盖） | 通常无需处理；如失败可先在控制台删除 |
| `ENOTFOUND` / `ETIMEDOUT` | 网络问题 | 检查代理，重试 |

## 安全提示

- `.deploy-key/` 和 `*.key` 已在 `.gitignore` 中
- **永远不要**把密钥提交到 git，也不要在聊天/截图里暴露密钥内容
- 密钥泄漏的话立即去公众平台"重置"密钥
