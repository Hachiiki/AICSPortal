// Verify the application's real cached font and image assets before UI captures.
export async function settleVisuals(page) {
  return page.evaluate(async () => {
    const regular = await document.fonts.load('400 16px "Geist"')
    const bold = await document.fonts.load('700 16px "Geist"')
    await document.fonts.ready
    if (!regular.length || !bold.length || [...regular, ...bold].some(face => face.status !== 'loaded')) throw new Error('Application Geist faces did not load')
    const images = Array.from(document.images).filter(image => {
      const box = image.getBoundingClientRect()
      return box.width > 0 && box.height > 0
    })
    await Promise.all(images.map(image => image.decode()))
    return {
      family: getComputedStyle(document.body).fontFamily,
      faces: Array.from(document.fonts).map(face => ({ family: face.family, weight: face.weight, status: face.status })),
      images: images.map(image => ({ src: image.currentSrc, complete: image.complete, naturalWidth: image.naturalWidth })),
    }
  })
}
