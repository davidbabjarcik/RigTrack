import { useEffect, useRef } from 'react'

/**
 * Ctrl+V so skopírovaným obrázkom (z webu, snímka obrazovky, súbor) zavolá `onImage` so súborom.
 * Text sa vkladá normálne – zachytí sa len obrázok. Vypnuté, kým `enabled` nie je true.
 */
export function usePastedImage(enabled: boolean, onImage: (file: File) => void) {
  const handler = useRef(onImage)
  useEffect(() => {
    handler.current = onImage
  }, [onImage])
  useEffect(() => {
    if (!enabled) return
    function handlePaste(event: ClipboardEvent) {
      const image = [...(event.clipboardData?.files ?? [])].find((file) => file.type.startsWith('image/'))
      if (!image) return
      event.preventDefault()
      handler.current(image)
    }
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [enabled])
}
