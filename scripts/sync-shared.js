#!/usr/bin/env node
/**
 * 把 cloudfunctions/shared/ 同步到每个云函数目录下的 shared/ 子目录
 *
 * 微信云开发的云函数是独立部署单元，部署时只上传单个云函数目录，
 * 所以 require('../shared/xxx') 在云端无效。这个脚本把 shared/ 物理复制
 * 到每个使用它的云函数内部，让 require('./shared/xxx') 在云端可用。
 *
 * 用法:
 *   node scripts/sync-shared.js           同步所有云函数
 *   node scripts/sync-shared.js works     只同步指定云函数
 *   npm run sync                           通过 npm script
 *
 * 输出的 cloudfunctions/<name>/shared/ 目录是生成物，已在 .gitignore 中排除。
 * 源代码请编辑 cloudfunctions/shared/ 下的文件，不要直接改副本。
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const SHARED_SRC = path.join(ROOT, 'cloudfunctions/shared')

/**
 * 扫描所有 require('./shared/...') 的云函数
 */
function findConsumers() {
  return fs.readdirSync(path.join(ROOT, 'cloudfunctions'))
    .filter(name => name !== 'shared')
    .filter(name => {
      const idx = path.join(ROOT, 'cloudfunctions', name, 'index.js')
      if (!fs.existsSync(idx)) return false
      const content = fs.readFileSync(idx, 'utf8')
      // 匹配 require('./shared/...') 或 require("./shared/...")
      return /require\(['"]\.\/shared\//.test(content)
    })
    .sort()
}

function syncOne(fnName) {
  const targetDir = path.join(ROOT, 'cloudfunctions', fnName, 'shared')

  // 清空目标目录，避免源删除文件后副本残留
  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true })
  }
  fs.mkdirSync(targetDir, { recursive: true })

  // 复制 SHARED_SRC 下所有文件（不递归 —— shared/ 应该是扁平结构）
  const entries = fs.readdirSync(SHARED_SRC).filter(f => fs.statSync(path.join(SHARED_SRC, f)).isFile())
  if (entries.length === 0) {
    console.error(`✗ cloudfunctions/shared/ 为空，没有可同步的文件`)
    return false
  }

  for (const entry of entries) {
    const src = path.join(SHARED_SRC, entry)
    const dst = path.join(targetDir, entry)
    fs.copyFileSync(src, dst)
    console.log(`  ${entry} → cloudfunctions/${fnName}/shared/${entry}`)
  }
  return true
}

function main() {
  const target = process.argv[2]

  if (!fs.existsSync(SHARED_SRC)) {
    console.error(`✗ 源目录不存在: ${SHARED_SRC}`)
    process.exit(1)
  }

  const targets = target ? [target] : findConsumers()

  if (targets.length === 0) {
    console.log('没有云函数引用 ./shared/，无需同步')
    return
  }

  // 校验指定参数
  const invalid = targets.find(t => !fs.existsSync(path.join(ROOT, 'cloudfunctions', t)))
  if (invalid) {
    console.error(`✗ 未知的云函数: ${invalid}`)
    process.exit(1)
  }

  console.log(`同步 cloudfunctions/shared/ → ${targets.join(', ')}\n`)
  let allOk = true
  for (const name of targets) {
    console.log(`→ ${name}`)
    const ok = syncOne(name)
    if (!ok) allOk = false
  }

  console.log(`\n${allOk ? '✓ 同步完成' : '✗ 部分同步失败'}`)
  if (!allOk) process.exit(1)
}

module.exports = { findConsumers, syncOne }

if (require.main === module) {
  main()
}
