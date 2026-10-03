import type { StoredImage } from './model'

export async function prepareImage(file: File, original = false): Promise<StoredImage> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type))
    throw new Error('请选择 JPG、PNG 或 WebP 图片。HEIC 照片请先转为 JPG。')
  if (file.size > 16 * 1024 * 1024) throw new Error('单张图片不能超过 16 MB，请裁剪或缩小后再添加。')
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error('无法读取这张图片，请换一张 JPG 或 PNG 图片。')
  }
  try {
    if (bitmap.width * bitmap.height > 60000000) throw new Error('图片分辨率过大，请先裁剪到题目区域。')
    let blob: Blob = file
    let width = bitmap.width,
      height = bitmap.height
    if (!original) {
      const scale = Math.min(1, 2560 / Math.max(width, height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(width * scale)
      canvas.height = Math.round(height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('当前浏览器无法处理图片，请开启“保留原图”后重试。')
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      const compressed = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/webp', 0.94),
      )
      if (compressed && compressed.size < file.size) {
        blob = compressed
        width = canvas.width
        height = canvas.height
      }
    }
    return { id: crypto.randomUUID(), blob, width, height, name: file.name.slice(0, 500) }
  } finally {
    bitmap.close()
  }
}
