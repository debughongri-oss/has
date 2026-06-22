#!/usr/bin/env node
/**
 * 部署云函数到微信云开发
 *
 * 用法:
 *   node scripts/deploy-cloudfunction.js <name>   部署单个云函数
 *   node scripts/deploy-cloudfunction.js all      部署所有云函数
 *   npm run deploy:works                           通过 npm script
 *
 * 前置条件（一次性配置，见 scripts/README.md）:
 *   1. 登录 https://mp.weixin.qq.com
 *   2. 开发管理 → 开发设置 → 生成"小程序代码上传密钥"（下载 .key 文件）
 *   3. 同页面"IP 白名单" → 添加本机出口 IP
 *   4. 把下载的 .key 文件放到 .deploy-key/private.key
 */

const ci = require('miniprogram-ci')
const path = require('path')
const fs = require('fs')
const { syncOne } = require('./sync-shared')

const ROOT = path.resolve(__dirname, '..')

// ============ 配置自动读取（不从代码硬编码，避免漂移）============

function readAppId() {
  const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'project.config.json'), 'utf8'))
  if (!config.appid) throw new Error('project.config.json 缺少 appid')
  return config.appid
}

function readCloudEnv() {
  const constants = fs.readFileSync(path.join(ROOT, 'miniprogram/utils/constants.js'), 'utf8')
  const match = constants.match(/CLOUD_ENV\s*=\s*['"]([^'"]+)['"]/)
  if (!match) throw new Error('miniprogram/utils/constants.js 缺少 CLOUD_ENV')
  return match[1]
}

const APP_ID = readAppId()
const ENV_ID = readCloudEnv()

// 扫描所有云函数目录（排除 shared/ —— 它是被各云函数 require 的公共模块，不是云函数本身）
const CLOUD_FUNCTIONS = fs.readdirSync(path.join(ROOT, 'cloudfunctions'))
  .filter(name => name !== 'shared')
  .filter(name => {
    const full = path.join(ROOT, 'cloudfunctions', name)
    return fs.statSync(full).isDirectory() && fs.existsSync(path.join(full, 'index.js'))
  })
  .sort()

// 密钥路径：环境变量优先，否则默认 .deploy-key/private.key
const PRIVATE_KEY_PATH = process.env.WX_DEPLOY_KEY ||
  path.join(ROOT, '.deploy-key/private.key')

// ============ 主流程 ============

async function deployOne(name) {
  const fnPath = path.join(ROOT, 'cloudfunctions', name)
  if (!fs.existsSync(fnPath)) {
    console.error(`✗ 云函数目录不存在: cloudfunctions/${name}`)
    return false
  }

  // 部署前同步 shared/ 到该云函数内部（云端 require('../shared/x') 不存在）
  // 详见 scripts/sync-shared.js
  if (name !== 'shared') {
    const idxFile = path.join(fnPath, 'index.js')
    if (fs.existsSync(idxFile) && /require\(['"]\.\/shared\//.test(fs.readFileSync(idxFile, 'utf8'))) {
      syncOne(name)
    }
  }

  process.stdout.write(`→ 部署 ${name} ... `)
  try {
    // 注意: ci.Project 必须每次新建，复用会触发"project already in use"错误
    const project = new ci.Project({
      appid: APP_ID,
      type: 'miniProgram',
      projectPath: ROOT,
      privateKeyPath: PRIVATE_KEY_PATH,
      ignores: ['node_modules/**/*', '.git/**/*', '.deploy-key/**/*'],
    })

    await ci.cloud.uploadFunction({
      project,
      env: ENV_ID,
      name,
      path: fnPath,
      remoteNpmInstall: true, // 云端安装依赖，不上传本地 node_modules
    })
    console.log('✓')
    return true
  } catch (err) {
    console.log('✗')
    const msg = (err && (err.message || err.errMsg)) || String(err)
    console.error('   ', msg)

    // 常见错误的中文友好提示
    if (/40001|invalid credential|access_token/i.test(msg)) {
      console.error('   ↳ 提示: 密钥无效或本机 IP 不在白名单')
      console.error('     去 mp.weixin.qq.com → 开发管理 → 开发设置 检查')
    } else if (/FunctionNameAlreadyExists|already exists/i.test(msg)) {
      console.error('   ↳ 提示: 云函数已存在，脚本会覆盖更新；如失败可先在云开发控制台删除')
    } else if (/ENOTFOUND|ETIMEDOUT|ECONNREFUSED/i.test(msg)) {
      console.error('   ↳ 提示: 网络异常，检查代理或重试')
    }
    return false
  }
}

async function main() {
  const target = process.argv[2]

  if (!target) {
    console.error('用法: node scripts/deploy-cloudfunction.js <name|all>')
    console.error('\n可用云函数:')
    CLOUD_FUNCTIONS.forEach(n => console.error(`  - ${n}`))
    console.error('\n或用 npm script:')
    console.error('  npm run deploy:works')
    console.error('  npm run deploy:all')
    process.exit(1)
  }

  // 密钥检查（给出明确的获取步骤，不直接抛错）
  if (!fs.existsSync(PRIVATE_KEY_PATH)) {
    console.error(`\n✗ 密钥文件不存在: ${PRIVATE_KEY_PATH}\n`)
    console.error('获取密钥步骤（一次性配置）:')
    console.error('  1. 登录 https://mp.weixin.qq.com')
    console.error('  2. 开发管理 → 开发设置 → 生成"小程序代码上传密钥"')
    console.error('  3. 同页面"IP 白名单" → 添加本机出口 IP（重要，经常被忘）')
    console.error(`  4. 把 .key 文件放到: ${PRIVATE_KEY_PATH}`)
    console.error('')
    console.error('或用环境变量指定路径:')
    console.error(`  WX_DEPLOY_KEY=/path/to.key node scripts/deploy-cloudfunction.js ${target}`)
    process.exit(1)
  }

  // 目标参数校验
  const targets = target === 'all' ? CLOUD_FUNCTIONS : [target]
  const invalid = targets.find(t => !CLOUD_FUNCTIONS.includes(t))
  if (invalid) {
    console.error(`✗ 未知的云函数: ${invalid}`)
    console.error('可用:', CLOUD_FUNCTIONS.join(', '))
    process.exit(1)
  }

  // 打印部署上下文，方便核对
  console.log('==== 部署上下文 ====')
  console.log(`AppID:   ${APP_ID}`)
  console.log(`EnvID:   ${ENV_ID}`)
  console.log(`Key:     ${PRIVATE_KEY_PATH}`)
  console.log(`Targets: ${targets.join(', ')}`)
  console.log('')

  // 顺序部署（避免并发触发微信 API 限流）
  const results = []
  for (const name of targets) {
    const ok = await deployOne(name)
    results.push({ name, ok })
  }

  // 汇总
  console.log('\n==== 汇总 ====')
  results.forEach(r => console.log(`${r.ok ? '✓' : '✗'} ${r.name}`))

  const failed = results.filter(r => !r.ok)
  if (failed.length > 0) {
    console.error(`\n${failed.length} 个云函数部署失败`)
    process.exit(1)
  }
  console.log('\n全部部署成功。')
}

main().catch(err => {
  console.error('\n部署过程异常:')
  console.error(err)
  process.exit(1)
})
