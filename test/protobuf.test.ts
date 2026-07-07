import { describe, it, expect } from 'vitest'
import {
  decode,
  encode,
  readVarint,
  writeVarint,
  readDouble,
  writeDouble,
  readFloat,
  writeFloat,
  utf8Decode,
  utf8Encode,
  type Field,
  type Wire,
} from '../src/lib/protobuf'

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

// Small deterministic PRNG so failures are reproducible.
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function randomFields(rand: () => number, depth: number): Field[] {
  const n = Math.floor(rand() * 6)
  const fields: Field[] = []
  for (let i = 0; i < n; i++) {
    const field = 1 + Math.floor(rand() * 500)
    const wires: Wire[] = [0, 1, 2, 5]
    const wire = wires[Math.floor(rand() * wires.length)]
    if (wire === 0) {
      // include values above Number.MAX_SAFE_INTEGER to exercise the bigint path
      const big = rand() < 0.3
      const value = big
        ? BigInt(Math.floor(rand() * 1e9)) * 1_000_000_000n + BigInt(Math.floor(rand() * 1e9))
        : BigInt(Math.floor(rand() * 1e6))
      fields.push({ field, wire, value })
    } else if (wire === 1) {
      const b = new Uint8Array(8)
      for (let j = 0; j < 8; j++) b[j] = Math.floor(rand() * 256)
      fields.push({ field, wire, value: b })
    } else if (wire === 5) {
      const b = new Uint8Array(4)
      for (let j = 0; j < 4; j++) b[j] = Math.floor(rand() * 256)
      fields.push({ field, wire, value: b })
    } else {
      // wire 2: sometimes a nested message, sometimes raw bytes
      let payload: Uint8Array
      if (depth < 3 && rand() < 0.5) {
        payload = encode(randomFields(rand, depth + 1))
      } else {
        const len = Math.floor(rand() * 20)
        payload = new Uint8Array(len)
        for (let j = 0; j < len; j++) payload[j] = Math.floor(rand() * 256)
      }
      fields.push({ field, wire, value: payload })
    }
  }
  return fields
}

describe('varint', () => {
  it('encodes 300 canonically as 0xAC 0x02', () => {
    const out: number[] = []
    writeVarint(out, 300n)
    expect(out).toEqual([0xac, 0x02])
    const [v, i] = readVarint(Uint8Array.from(out), 0)
    expect(v).toBe(300n)
    expect(i).toBe(2)
  })

  it('round-trips large 64-bit values', () => {
    const values = [0n, 1n, 127n, 128n, 16383n, 16384n, (1n << 63n) - 1n]
    for (const v of values) {
      const out: number[] = []
      writeVarint(out, v)
      const [got] = readVarint(Uint8Array.from(out), 0)
      expect(got).toBe(v)
    }
  })
})

describe('fixed floats', () => {
  it('round-trips float64', () => {
    for (const n of [0, 1, -1, 165, 3.14159, 1e-9, 1234567.89]) {
      expect(readDouble(writeDouble(n))).toBeCloseTo(n, 10)
    }
  })
  it('round-trips float32', () => {
    for (const n of [0, 1, -1, 50, 165]) {
      expect(readFloat(writeFloat(n))).toBeCloseTo(n, 3)
    }
  })
})

describe('utf-8', () => {
  it('round-trips CJK text', () => {
    const s = '赞美真神 万福之根 · Tensentype'
    expect(utf8Decode(utf8Encode(s))).toBe(s)
  })
})

describe('decode/encode round-trip', () => {
  it('is lossless for a hand-built message', () => {
    const fields: Field[] = [
      { field: 1, wire: 0, value: 300n },
      { field: 2, wire: 2, value: utf8Encode('祝祷') },
      { field: 3, wire: 5, value: writeFloat(165) },
    ]
    const buf = encode(fields)
    const round = encode(decode(buf))
    expect(bytesEqual(round, buf)).toBe(true)
  })

  it('is lossless over 500 random nested messages (encode∘decode is identity)', () => {
    const rand = mulberry32(12345)
    for (let iter = 0; iter < 500; iter++) {
      const buf = encode(randomFields(rand, 0))
      const round = encode(decode(buf))
      expect(bytesEqual(round, buf)).toBe(true)
    }
  })
})
