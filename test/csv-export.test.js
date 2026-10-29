import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

function sanitizeCsvCell(value) {
  if (value === null || value === undefined) return '""'
  const str = String(value)
  // Formula Injection defense: prefix with single quote if starts with formula triggering chars
  const sanitized = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str
  return `"${sanitized.replace(/"/g, '""')}"`
}

describe('CSV Formula Injection Defense', () => {
  it('membersihkan sel yang diawali tanda sama dengan (=cmd)', () => {
    const input = '=cmd|"/C calc"!A0'
    const result = sanitizeCsvCell(input)
    assert.equal(result, `"'=cmd|""/C calc""!A0"`)
    assert.ok(result.startsWith(`"'=`))
  })

  it('membersihkan sel yang diawali tanda tambah (+)', () => {
    const input = '+123456789'
    const result = sanitizeCsvCell(input)
    assert.equal(result, `"'${input}"`)
  })

  it('membersihkan sel yang diawali tanda kurang (-)', () => {
    const input = '-5+5'
    const result = sanitizeCsvCell(input)
    assert.equal(result, `"'${input}"`)
  })

  it('membersihkan sel yang diawali karakter @', () => {
    const input = '@SUM(A1:A10)'
    const result = sanitizeCsvCell(input)
    assert.equal(result, `"'${input}"`)
  })

  it('membersihkan karakter tab atau carriage return di awal string', () => {
    const input = '\tMalicious'
    const result = sanitizeCsvCell(input)
    assert.equal(result, `"'\tMalicious"`)
  })

  it('membiarkan teks normal tanpa kutip tambahan di awal teks', () => {
    const input = 'Budi Santoso'
    const result = sanitizeCsvCell(input)
    assert.equal(result, `"Budi Santoso"`)
  })

  it('meng-escape tanda petik dua ganda di dalam teks', () => {
    const input = 'Toko "Jaya Abadi"'
    const result = sanitizeCsvCell(input)
    assert.equal(result, '"Toko ""Jaya Abadi"""')
  })

  it('menangani nilai null dan undefined secara aman', () => {
    assert.equal(sanitizeCsvCell(null), '""')
    assert.equal(sanitizeCsvCell(undefined), '""')
  })
})
