// Load and repackage a `.proPlaylist` (a ZIP) entirely in the browser.
//
// Only the `.pro` documents are ever rewritten. Every other entry (Media/,
// the `data` playlist manifest, PDF/) is copied through untouched, so
// ProPresenter still resolves documents by their original UUIDs.

import JSZip from 'jszip'

export interface LoadedPlaylist {
  fileName: string
  /** the parsed zip, retained so untouched entries pass straight through on save */
  zip: JSZip
  /** names of the `.pro` document entries, in archive order */
  proNames: string[]
}

export async function loadPlaylist(
  file: Blob | ArrayBuffer | Uint8Array,
  fileName: string,
): Promise<LoadedPlaylist> {
  const zip = await JSZip.loadAsync(file)
  const proNames = Object.keys(zip.files).filter((n) => !zip.files[n].dir && n.endsWith('.pro'))
  return { fileName, zip, proNames }
}

export async function readProFile(pl: LoadedPlaylist, name: string): Promise<Uint8Array> {
  return pl.zip.files[name].async('uint8array')
}

/**
 * Produce a new `.proPlaylist` blob, replacing the given `.pro` entries with new
 * bytes and leaving every other entry's content intact.
 */
export async function savePlaylist(
  pl: LoadedPlaylist,
  updated: Map<string, Uint8Array>,
): Promise<Blob> {
  for (const [name, bytes] of updated) {
    // preserve the original entry's metadata (date, unicode name) where possible
    const orig = pl.zip.files[name]
    pl.zip.file(name, bytes, { date: orig?.date })
  }
  return pl.zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })
}

/** Suggest an output filename: "foo.proPlaylist" -> "foo (统一字体).proPlaylist". */
export function suggestOutputName(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  const stem = dot > 0 ? fileName.slice(0, dot) : fileName
  const ext = dot > 0 ? fileName.slice(dot) : '.proPlaylist'
  return `${stem} (统一字体)${ext}`
}
