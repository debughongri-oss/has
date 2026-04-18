const IMAGE_CONFIG = require('../utils/constants').IMAGE_CONFIG

const compressImage = (filePath, quality = IMAGE_CONFIG.COMPRESS_QUALITY) => {
  return new Promise((resolve) => {
    wx.compressImage({
      src: filePath,
      quality,
      success: resolve,
      fail: () => resolve({ tempFilePath: filePath })
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

const uploadWorkImages = async (filePaths, onProgress) => {
  const fileIDs = []
  for (let i = 0; i < filePaths.length; i++) {
    if (onProgress) {
      onProgress({ current: i + 1, total: filePaths.length })
    }
    const compressed = await compressImage(filePaths[i])
    const fileID = await uploadImage(compressed.tempFilePath || filePaths[i])
    fileIDs.push(fileID)
  }
  return fileIDs
}

const deleteCloudFile = async (fileIDs) => {
  if (!fileIDs || fileIDs.length === 0) return
  try {
    await wx.cloud.deleteFile({ fileList: fileIDs })
  } catch (error) {
    console.error('删除云存储文件失败:', error)
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
