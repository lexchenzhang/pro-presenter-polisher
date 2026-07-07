// Fix orchestration: turn a loaded playlist into fixed `.pro` bytes.
//
// analyze() + buildPlan() (in analyzer.ts) decide *what* to change; this module
// reads the documents, applies a plan to the live tree, and serializes them back.

import { DEFAULT_TARGET_FONT } from './fonts'
import { ProDoc, setBoxFont, fixBoxFamilyMeta, setBoxSize } from './proDoc'
import {
  buildPlan,
  type FileEntry,
  type FixConfig,
  type FixEdit,
  type PlaylistReport,
} from './analyzer'
import { loadPlaylist, readProFile, savePlaylist, type LoadedPlaylist } from './playlist'

export interface BuildDocsResult {
  files: FileEntry[]
  /** documents that failed to parse (skipped, so one bad file doesn't abort the run) */
  failed: { name: string; error: string }[]
}

/** Read every `.pro` document and build its editable model. */
export async function buildDocs(pl: LoadedPlaylist): Promise<BuildDocsResult> {
  const files: FileEntry[] = []
  const failed: { name: string; error: string }[] = []
  for (const name of pl.proNames) {
    try {
      const bytes = await readProFile(pl, name)
      files.push({ name, doc: new ProDoc(bytes) })
    } catch (e) {
      failed.push({ name, error: e instanceof Error ? e.message : String(e) })
    }
  }
  return { files, failed }
}

/** The safe default: remap the brand font to a Mac font + fix family metadata, keep sizes. */
export function defaultConfig(report: PlaylistReport): FixConfig {
  return {
    sourcePsNames: report.sourcePsNames.slice(0, 1),
    remapFont: true,
    targetFont: DEFAULT_TARGET_FONT,
    fixFamilyMeta: true,
    sizePolicy: 'keep',
    globalSize: 165,
  }
}

/** Apply a plan to the live document tree (mutates the boxes in place). */
export function applyPlan(plan: FixEdit[]): void {
  for (const e of plan) {
    const fromNames = new Set(e.fromNames)
    if (e.setFont) setBoxFont(e.box, e.setFont, fromNames)
    else if (e.fixMeta) fixBoxFamilyMeta(e.box, fromNames)
    if (e.setSize != null) setBoxSize(e.box, e.setSize)
  }
}

/** Serialize (only) the documents a plan touched, keyed by entry name. */
export function serializeChangedDocs(files: FileEntry[], plan: FixEdit[]): Map<string, Uint8Array> {
  const changedFiles = new Set(plan.map((e) => e.file))
  const out = new Map<string, Uint8Array>()
  for (const { name, doc } of files) {
    if (changedFiles.has(name)) out.set(name, doc.serialize())
  }
  return out
}

export interface ProcessResult {
  blob: Blob
  plan: FixEdit[]
  changedFiles: number
}

/** End-to-end: load -> analyze -> apply config -> repackaged blob. Used by tests. */
export async function processPlaylist(
  file: Blob,
  fileName: string,
  config: FixConfig,
): Promise<ProcessResult> {
  const pl = await loadPlaylist(file, fileName)
  const { files } = await buildDocs(pl)
  const plan = buildPlan(files, config)
  applyPlan(plan)
  const updated = serializeChangedDocs(files, plan)
  const blob = await savePlaylist(pl, updated)
  return { blob, plan, changedFiles: updated.size }
}
