// Schema-less Protocol Buffers codec.
//
// ProPresenter 7 `.pro` documents are protobuf messages, but the official
// `.proto` schema is not published. A schema-based library (protobufjs) would
// silently drop any field it doesn't know about — unacceptable for an editor
// that must preserve a file it only partially understands.
//
// Instead we decode into a flat list of raw fields, preserving field order and
// the exact bytes of every value. Re-encoding an untouched message reproduces
// the original bytes exactly (verified byte-identical against real files), so we
// can rewrite only the specific leaves we care about and leave everything else
// intact.

export type Wire = 0 | 1 | 2 | 5

export interface Field {
  field: number
  wire: Wire
  /** wire 0 -> bigint varint; wire 1/2/5 -> raw bytes (8 / N / 4). */
  value: bigint | Uint8Array
}

// ---------------------------------------------------------------------------
// varint
// ---------------------------------------------------------------------------

/** Read a base-128 varint. Returns [value, nextOffset]. */
export function readVarint(buf: Uint8Array, offset: number): [bigint, number] {
  let result = 0n
  let shift = 0n
  let i = offset
  for (;;) {
    if (i >= buf.length) throw new Error('varint: unexpected end of buffer')
    const b = buf[i]
    i++
    result |= BigInt(b & 0x7f) << shift
    if ((b & 0x80) === 0) break
    shift += 7n
    if (shift > 70n) throw new Error('varint: too long')
  }
  return [result, i]
}

/** Append a non-negative varint to `out`. */
export function writeVarint(out: number[], value: bigint): void {
  let x = value
  if (x < 0n) throw new Error('writeVarint: negative value')
  do {
    let b = Number(x & 0x7fn)
    x >>= 7n
    if (x > 0n) b |= 0x80
    out.push(b)
  } while (x > 0n)
}

// ---------------------------------------------------------------------------
// decode / encode
// ---------------------------------------------------------------------------

export function decode(buf: Uint8Array): Field[] {
  const fields: Field[] = []
  let i = 0
  while (i < buf.length) {
    const [key, ki] = readVarint(buf, i)
    i = ki
    const field = Number(key >> 3n)
    const wire = Number(key & 7n) as Wire
    switch (wire) {
      case 0: {
        const [v, ni] = readVarint(buf, i)
        i = ni
        fields.push({ field, wire, value: v })
        break
      }
      case 1: {
        if (i + 8 > buf.length) throw new Error('fixed64: unexpected end')
        fields.push({ field, wire, value: buf.slice(i, i + 8) })
        i += 8
        break
      }
      case 2: {
        const [len, ni] = readVarint(buf, i)
        i = ni
        const L = Number(len)
        if (i + L > buf.length) throw new Error('length-delimited: unexpected end')
        fields.push({ field, wire, value: buf.slice(i, i + L) })
        i += L
        break
      }
      case 5: {
        if (i + 4 > buf.length) throw new Error('fixed32: unexpected end')
        fields.push({ field, wire, value: buf.slice(i, i + 4) })
        i += 4
        break
      }
      default:
        throw new Error(`unsupported wire type ${wire} for field ${field}`)
    }
  }
  return fields
}

export function encode(fields: Field[]): Uint8Array {
  const out: number[] = []
  for (const f of fields) {
    writeVarint(out, (BigInt(f.field) << 3n) | BigInt(f.wire))
    switch (f.wire) {
      case 0:
        writeVarint(out, f.value as bigint)
        break
      case 2: {
        const bytes = f.value as Uint8Array
        writeVarint(out, BigInt(bytes.length))
        for (let j = 0; j < bytes.length; j++) out.push(bytes[j])
        break
      }
      case 1:
      case 5: {
        const bytes = f.value as Uint8Array
        for (let j = 0; j < bytes.length; j++) out.push(bytes[j])
        break
      }
    }
  }
  return Uint8Array.from(out)
}

// ---------------------------------------------------------------------------
// value accessors
// ---------------------------------------------------------------------------

const textDecoder = new TextDecoder('utf-8', { fatal: false })
const textEncoder = new TextEncoder()

export function utf8Decode(bytes: Uint8Array): string {
  return textDecoder.decode(bytes)
}

export function utf8Encode(s: string): Uint8Array {
  return textEncoder.encode(s)
}

/** Interpret a wire-1 (fixed64) value as a little-endian float64. */
export function readDouble(bytes: Uint8Array): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getFloat64(0, true)
}

/** Interpret a wire-5 (fixed32) value as a little-endian float32. */
export function readFloat(bytes: Uint8Array): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getFloat32(0, true)
}

export function writeDouble(n: number): Uint8Array {
  const b = new Uint8Array(8)
  new DataView(b.buffer).setFloat64(0, n, true)
  return b
}

export function writeFloat(n: number): Uint8Array {
  const b = new Uint8Array(4)
  new DataView(b.buffer).setFloat32(0, n, true)
  return b
}

// ---------------------------------------------------------------------------
// navigation helpers (read-only convenience over a decoded Field[])
// ---------------------------------------------------------------------------

/** First field with the given number, or undefined. */
export function getField(fields: Field[], num: number): Field | undefined {
  return fields.find((f) => f.field === num)
}

/** All fields with the given number, in order (repeated fields). */
export function getFields(fields: Field[], num: number): Field[] {
  return fields.filter((f) => f.field === num)
}

/** Decode a wire-2 field's bytes as a nested message. */
export function asMessage(f: Field): Field[] {
  if (f.wire !== 2) throw new Error(`field ${f.field} is not length-delimited`)
  return decode(f.value as Uint8Array)
}

/** True if a wire-2 payload plausibly decodes as a nested protobuf message.
 *  Heuristic — used only for exploration/analysis, never for lossless editing
 *  (editing always targets known field paths). */
export function looksLikeMessage(bytes: Uint8Array): boolean {
  if (bytes.length < 2) return false
  // Valid UTF-8 strings should not be treated as messages.
  try {
    const s = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    // printable-ish string -> treat as string, not message
    if (/^[\x09\x0a\x0d\x20-￿]*$/.test(s)) return false
  } catch {
    // not valid UTF-8 -> could be a message
  }
  try {
    let i = 0
    let count = 0
    while (i < bytes.length) {
      const [key, ki] = readVarint(bytes, i)
      i = ki
      const wire = Number(key & 7n)
      if (wire === 0) {
        ;[, i] = readVarint(bytes, i)
      } else if (wire === 1) {
        i += 8
      } else if (wire === 2) {
        const [len, ni] = readVarint(bytes, i)
        i = ni + Number(len)
      } else if (wire === 5) {
        i += 4
      } else {
        return false
      }
      if (i > bytes.length) return false
      count++
    }
    return count > 0
  } catch {
    return false
  }
}
