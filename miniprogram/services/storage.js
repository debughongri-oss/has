const IMAGE_CONFIG = require('../utils/constants').IMAGE_CONFIG

// POL-04: 有限并发上传数——平衡速度与云存储限流
const UPLOAD_CONCURRENCY = 3

const compressImage = (filePath, quality = IMAGE_CONFIG.COMPRESS_QUALITY) => {
  return new Promise((resolve) => {
    wx.compressImage({
      src: filePath,
      quality,
      success: resolve,
      fail: (err) => {
        // POL-05: 压缩失败不再静默——记录警告，降级使用原图上传
        console.warn('图片压缩失败，使用原图上传:', filePath, err)
        resolve({ tempFilePath: filePath })
      }
    })
  })
}

const uploadImage = async (filePath, cloudPath) => {
  const finalCloudPath = cloudPath || `works/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
  const res = await wx.cloud.uploadFile({
    cloudPath: finalCloudPath,
    filePath
  })
  return res.fileID
}

/**
 * 批量上传作品图片（POL-04: 有限并发，默认 3 路并行）
 * 保持输入顺序——results[index] 对应 filePaths[index]
 * @param {string[]} filePaths - 本地临时文件路径数组
 * @param {Function} onProgress - 进度回调 { current, total }
 * @returns {Promise<string[]>} fileID 数组（与输入顺序一致）
 */
const uploadWorkImages = async (filePaths, onProgress) => {
  const results = new Array(filePaths.length)
  let completed = 0
  const queue = filePaths.map((_, i) => i)

  const uploadOne = async (index) => {
    const compressed = await compressImage(filePaths[index])
    const fileID = await uploadImage(compressed.tempFilePath || filePaths[index])
    results[index] = fileID
    completed++
    if (onProgress) {
      onProgress({ current: completed, total: filePaths.length })
    }
  }

  // 有限并发池：N 个 worker 从队列消费
  const workerCount = Math.min(UPLOAD_CONCURRENCY, queue.length)
  const workers = []
  for (let w = 0; w < workerCount; w++) {
    workers.push((async () => {
      while (queue.length > 0) {
        const index = queue.shift()
        if (index === undefined) break
        await uploadOne(index)
      }
    })())
  }
  await Promise.all(workers)
  return results
}

/**
 * 批量删除云存储文件（POL-05: 失败不再静默吞掉——记录警告并返回结果）
 * @param {string[]} fileIDs - 云文件 ID 数组
 * @returns {Promise<{success: boolean, deleted: number, failed: number}>}
 */
const deleteCloudFile = async (fileIDs) => {
  if (!fileIDs || fileIDs.length === 0) return { success: true, deleted: 0, failed: 0 }
  try {
    const res = await wx.cloud.deleteFile({ fileList: fileIDs })
    // 微信 deleteFile 逐个返回结果，检查失败的项
    const failedItems = (res.fileList || []).filter(f => f.status !== 0)
    if (failedItems.length > 0) {
      console.warn('部分云文件删除失败:', failedItems.map(f => f.fileID))
    }
    return { success: failedItems.length === 0, deleted: fileIDs.length - failedItems.length, failed: failedItems.length }
  } catch (error) {
    // POL-05: 删除失败不再静默——记录详细错误，避免孤立云文件累积成本
    console.warn('删除云存储文件失败（孤立文件可能累积存储成本）:', fileIDs, error)
    return { success: false, deleted: 0, failed: fileIDs.length }
  }
}

const getTempFileURLs = async (fileIDs) => {
  if (!fileIDs || fileIDs.length === 0) return []
  try {
    const res = await wx.cloud.getTempFileURL({ fileList: fileIDs })
    return res.fileList.map(f => f.tempFileURL)
  } catch (error) {
    console.error('获取文件URL失败:', error)
    return fileIDs
  }
}

module.exports = {
  compressImage,
  uploadImage,
  uploadWorkImages,
  deleteCloudFile,
  getTempFileURLs
}
