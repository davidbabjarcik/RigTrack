declare const __APP_VERSION__: string

/** Verzia aplikácie bez nulovej opravy: „1.0.0“ → „1.0“, „1.2.3“ ostane. */
export function displayVersion(version: string) {
  return version.replace(/^(\d+\.\d+)\.0$/, '$1')
}

export const APP_VERSION = displayVersion(__APP_VERSION__)
