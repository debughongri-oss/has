const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')

test('作品集采用方案 3 的标题、精选区和预约入口', () => {
  const wxml = read('miniprogram/pages/works/list.wxml')

  assert.match(wxml, /class="works-title"[^>]*>作品集</)
  assert.match(wxml, /真实客片/)
  assert.match(wxml, /本月精选/)
  assert.match(wxml, /<view class="booking-cta">/)
  assert.match(wxml, /<button class="booking-action" bindtap="goToBooking">/)
  assert.match(wxml, />去预约</)
})

test('作品列表保留分类、详情与加载更多交互', () => {
  const wxml = read('miniprogram/pages/works/list.wxml')

  assert.match(wxml, /bindtap="onCategoryChange"/)
  assert.match(wxml, /bindtap="goToDetail"/)
  assert.match(wxml, /bindtap="loadMore"/)
})

test('预约入口切换到预约 tab', () => {
  const js = read('miniprogram/pages/works/list.js')

  assert.match(js, /goToBooking:\s*function\s*\(\)/)
  assert.match(js, /wx\.switchTab\(\{\s*url:\s*['"]\/pages\/booking\/create['"]\s*\}\)/)
})

test('预约栏占满页面宽度并紧贴底部菜单', () => {
  const wxss = read('miniprogram/pages/works/list.wxss')
  const bookingRule = wxss.match(/\.booking-cta\s*\{([^}]*)\}/s)

  assert.ok(bookingRule, '缺少 booking-cta 样式')
  assert.match(bookingRule[1], /left:\s*0;/)
  assert.match(bookingRule[1], /right:\s*0;/)
  assert.match(bookingRule[1], /bottom:\s*0;/)
})
