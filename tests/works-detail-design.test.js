const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')

test('详情页保留妆前后、海报和分享能力', () => {
  const wxml = read('miniprogram/pages/works/detail.wxml')

  assert.match(wxml, /<before-after-slider[\s\S]*beforeSrc="\{\{work\.before_image\}\}"/)
  assert.match(wxml, /gallery-action-btn--poster[\s\S]*bindtap="goToPoster"/)
  assert.match(wxml, /gallery-action-btn--share[\s\S]*open-type="share"/)
})

test('详情内容层包含作品信息和对比状态下也可用的细节图', () => {
  const wxml = read('miniprogram/pages/works/detail.wxml')
  const thumbsTag = wxml.match(/<scroll-view[\s\S]*?class="detail-thumbs"[\s\S]*?>/)

  assert.match(wxml, /class="detail-body"/)
  assert.match(wxml, /class="detail-story-label">作品故事</)
  assert.match(wxml, /class="detail-thumbs"[\s\S]*wx:if="\{\{work\.images\.length > 1\}\}"/)
  assert.ok(thumbsTag, '缺少 detail-thumbs')
  assert.doesNotMatch(thumbsTag[0], /!work\.before_image/)
})

test('详情页底部操作栏全宽贴底', () => {
  const wxss = read('miniprogram/pages/works/detail.wxss')
  const rule = wxss.match(/\.detail-bar\s*\{([^}]*)\}/s)

  assert.ok(rule, '缺少 detail-bar 样式')
  assert.match(rule[1], /left:\s*0;/)
  assert.match(rule[1], /right:\s*0;/)
  assert.match(rule[1], /bottom:\s*0;/)
})

test('妆前后组件使用中文标签并把全屏控件移出右上操作区', () => {
  const wxml = read('miniprogram/components/before-after-slider/slider.wxml')
  const wxss = read('miniprogram/components/before-after-slider/slider.wxss')
  const fullscreenRule = wxss.match(/\.ba-fullscreen\s*\{([^}]*)\}/s)

  assert.match(wxml, />妆前</)
  assert.match(wxml, />妆后</)
  assert.ok(fullscreenRule, '缺少 ba-fullscreen 样式')
  assert.match(fullscreenRule[1], /bottom:/)
  assert.doesNotMatch(fullscreenRule[1], /top:/)
})

test('妆前后状态点击缩略图会预览对应细节图', () => {
  const js = read('miniprogram/pages/works/detail.js')

  assert.match(js, /onThumbTap:[\s\S]*this\.data\.work\.before_image[\s\S]*wx\.previewImage/)
})
