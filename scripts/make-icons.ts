// 앱 아이콘(PNG) 생성 — 외부 이미지·글꼴 없이 도형만으로 그린다.
// 빨간 바탕 + 흰 말풍선 + 말풍선 안의 빨간 점 세 개 (대화하는 매장 중국어)
// 사용: node scripts/make-icons.ts  → public/icons/*.png
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { deflateSync } from 'node:zlib'

const RED: [number, number, number] = [0xc8, 0x10, 0x2e]
const WHITE: [number, number, number] = [0xff, 0xff, 0xff]

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(buf: Buffer): number {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}
function png(size: number, pixel: (x: number, y: number) => [number, number, number]): Buffer {
  const raw = Buffer.alloc((size * 3 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixel(x, y)
      const o = y * (size * 3 + 1) + 1 + x * 3
      raw[o] = r
      raw[o + 1] = g
      raw[o + 2] = b
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // 비트 깊이
  ihdr[9] = 2 // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/** scale: 그림이 차지하는 비율 (maskable 아이콘은 가장자리가 잘려도 되도록 작게) */
function icon(size: number, scale: number): Buffer {
  const SS = 4 // 가장자리를 부드럽게 (4×4 슈퍼샘플링)
  const inBubble = (u: number, v: number) => {
    // u, v: 중심 기준 -1~1 좌표 (scale 반영)
    const ex = u / 0.78
    const ey = (v + 0.08) / 0.56
    if (ex * ex + ey * ey <= 1) return true
    // 말풍선 꼬리 (왼쪽 아래 삼각형)
    const ax = -0.42, ay = 0.3, bx = -0.08, by = 0.42, cx = -0.58, cy = 0.72
    const s = (px: number, py: number, qx: number, qy: number, rx: number, ry: number) => (px - rx) * (qy - ry) - (qx - rx) * (py - ry)
    const d1 = s(u, v, ax, ay, bx, by), d2 = s(u, v, bx, by, cx, cy), d3 = s(u, v, cx, cy, ax, ay)
    return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))
  }
  const inDot = (u: number, v: number) => [-0.36, 0, 0.36].some((dx) => (u - dx) ** 2 + (v + 0.08) ** 2 <= 0.11 ** 2)
  return png(size, (x, y) => {
    let white = 0
    for (let sy = 0; sy < SS; sy++)
      for (let sx = 0; sx < SS; sx++) {
        const u = (((x + (sx + 0.5) / SS) / size) * 2 - 1) / scale
        const v = (((y + (sy + 0.5) / SS) / size) * 2 - 1) / scale
        if (inBubble(u, v) && !inDot(u, v)) white++
      }
    const t = white / (SS * SS)
    return [0, 1, 2].map((i) => Math.round(RED[i] * (1 - t) + WHITE[i] * t)) as [number, number, number]
  })
}

const out = join(import.meta.dirname, '..', 'public', 'icons')
mkdirSync(out, { recursive: true })
writeFileSync(join(out, 'icon-192.png'), icon(192, 0.78))
writeFileSync(join(out, 'icon-512.png'), icon(512, 0.78))
writeFileSync(join(out, 'maskable-512.png'), icon(512, 0.6))
writeFileSync(join(out, 'apple-touch-icon.png'), icon(180, 0.72))
console.log('아이콘 생성 완료:', out)
