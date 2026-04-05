#!/usr/bin/env node

const stdout = process.stdout
const cols = Math.min(stdout.columns || 80, 80)
const rows = Math.min(stdout.rows || 24, 24)

const chars = '01.·:*+×÷=~<>|/\\'.split('')
const drops = Array.from({ length: cols }, () => Math.random() * -rows | 0)
const grid = Array.from({ length: rows }, () => Array(cols).fill(' '))
const brightness = Array.from({ length: rows }, () => Array(cols).fill(0))

const name = 'Pierre Janineh'
const tagline = 'Making pixels behave in Software.'
const url = 'pierrejanineh.com'

const final = []
const midRow = Math.floor(rows / 2)
const addLine = (text, row) => {
  const start = Math.floor((cols - text.length) / 2)
  for (let i = 0; i < text.length; i++) {
    final.push({ r: row, c: start + i, ch: text[i] })
  }
}
addLine(name, midRow - 1)
addLine(tagline, midRow + 1)
addLine(url, midRow + 3)

const frozen = new Set()
const frozenBrightness = new Map()
let frame = 0
const freezeStart = 45
const freezeEnd = 70
const holdEnd = 130
const fadeEnd = 160

let phase = 'rain' // rain → freeze → hold → fade → done
let dropsActive = true

stdout.write('\x1b[?25l\x1b[2J')

const interval = setInterval(() => {
  frame++

  if (frame >= freezeStart && phase === 'rain') phase = 'freeze'
  if (frame >= freezeEnd && phase === 'freeze') phase = 'hold'
  if (frame >= holdEnd && phase === 'hold') { phase = 'fade'; dropsActive = false }

  // Rain drops
  if (dropsActive) {
    for (let c = 0; c < cols; c++) {
      if (drops[c] >= 0 && drops[c] < rows) {
        grid[drops[c]][c] = chars[Math.random() * chars.length | 0]
        brightness[drops[c]][c] = 3
      }
      drops[c]++
      if (drops[c] > rows + Math.random() * rows) {
        drops[c] = Math.random() * -5 | 0
      }
    }
  }

  // Fade rain trail
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (brightness[r][c] > 0 && !frozen.has(`${r},${c}`)) {
        brightness[r][c] -= 0.15
        if (brightness[r][c] <= 0) {
          grid[r][c] = ' '
          brightness[r][c] = 0
        }
      }
    }
  }

  // Freeze text in
  if (phase === 'freeze' || (phase === 'hold' && frozen.size < final.length)) {
    const progress = Math.min((frame - freezeStart) / (freezeEnd - freezeStart), 1)
    const count = Math.ceil(progress * final.length)
    for (let i = 0; i < count; i++) {
      const { r, c, ch } = final[i]
      grid[r][c] = ch
      frozen.add(`${r},${c}`)
      frozenBrightness.set(`${r},${c}`, 3)
    }
  }

  // Fade frozen text out
  if (phase === 'fade') {
    const progress = (frame - holdEnd) / (fadeEnd - holdEnd)
    for (const key of frozen) {
      frozenBrightness.set(key, 3 * (1 - progress))
    }
  }

  // Render
  stdout.write('\x1b[H')
  for (let r = 0; r < rows; r++) {
    let line = ''
    for (let c = 0; c < cols; c++) {
      const key = `${r},${c}`
      if (frozen.has(key)) {
        const fb = frozenBrightness.get(key) || 0
        if (fb > 2) {
          line += `\x1b[1;97m${grid[r][c]}\x1b[0m`
        } else if (fb > 1) {
          line += `\x1b[37m${grid[r][c]}\x1b[0m`
        } else if (fb > 0.3) {
          line += `\x1b[2;37m${grid[r][c]}\x1b[0m`
        } else {
          line += ' '
        }
      } else if (grid[r][c] !== ' ') {
        const b = brightness[r][c]
        if (b > 2.5) {
          line += `\x1b[1;92m${grid[r][c]}\x1b[0m`
        } else if (b > 1.5) {
          line += `\x1b[32m${grid[r][c]}\x1b[0m`
        } else {
          line += `\x1b[2;32m${grid[r][c]}\x1b[0m`
        }
      } else {
        line += ' '
      }
    }
    stdout.write(line + '\n')
  }

  if (frame >= fadeEnd) {
    clearInterval(interval)
    stdout.write('\x1b[?25h\x1b[2J\x1b[H')
  }
}, 55)

process.on('SIGINT', () => {
  stdout.write('\x1b[?25h\x1b[2J\x1b[H')
  process.exit()
})
