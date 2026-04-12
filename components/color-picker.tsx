'use client'

import { useState, useCallback } from 'react'
import { Check } from 'lucide-react'

const PRESET_COLORS = [
  { hex: '#FFFFFF', name: 'ホワイト' },
  { hex: '#000000', name: 'ブラック' },
  { hex: '#FF0000', name: 'レッド' },
  { hex: '#FF6B00', name: 'オレンジ' },
  { hex: '#FFD700', name: 'イエロー' },
  { hex: '#00C853', name: 'グリーン' },
  { hex: '#00BCD4', name: 'シアン' },
  { hex: '#2196F3', name: 'ブルー' },
  { hex: '#9C27B0', name: 'パープル' },
  { hex: '#E91E63', name: 'ピンク' },
  { hex: '#795548', name: 'ブラウン' },
  { hex: '#9E9E9E', name: 'グレー' },
  { hex: '#F5F5DC', name: 'ベージュ' },
  { hex: '#FFB6C1', name: 'ライトピンク' },
  { hex: '#87CEEB', name: 'スカイブルー' },
  { hex: '#98FB98', name: 'ペールグリーン' },
  { hex: '#DDA0DD', name: 'プラム' },
  { hex: '#F0E68C', name: 'カーキ' },
  { hex: '#FF69B4', name: 'ホットピンク' },
  { hex: '#4169E1', name: 'ロイヤルブルー' },
] as const

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  // Perceived brightness formula
  return r * 0.299 + g * 0.587 + b * 0.114 > 186
}

const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/

interface ColorPickerProps {
  value: string
  onChange: (hex: string) => void
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [customHex, setCustomHex] = useState('')
  const [inputError, setInputError] = useState(false)

  const handleCustomHexChange = useCallback(
    (raw: string) => {
      // Ensure leading #
      let v = raw.startsWith('#') ? raw : `#${raw}`
      v = v.slice(0, 7) // max 7 chars (#RRGGBB)
      setCustomHex(v)
      setInputError(false)

      if (HEX_REGEX.test(v)) {
        onChange(v.toUpperCase())
      }
    },
    [onChange],
  )

  const handleCustomHexBlur = useCallback(() => {
    if (customHex && !HEX_REGEX.test(customHex)) {
      setInputError(true)
    }
  }, [customHex])

  const selectedName =
    PRESET_COLORS.find((c) => c.hex === value)?.name ?? value

  return (
    <div className="space-y-3">
      {/* Preset color grid */}
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
        {PRESET_COLORS.map(({ hex, name }) => {
          const selected = value === hex
          const light = isLightColor(hex)
          return (
            <button
              key={hex}
              type="button"
              title={name}
              onClick={() => {
                onChange(hex)
                setCustomHex('')
                setInputError(false)
              }}
              className={`relative w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center shrink-0 ${
                selected
                  ? 'border-primary ring-2 ring-primary/40 scale-110'
                  : 'border-border hover:scale-105'
              }`}
              style={{ backgroundColor: hex }}
            >
              {selected && (
                <Check
                  className={`w-4 h-4 ${light ? 'text-gray-800' : 'text-white'}`}
                  strokeWidth={3}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Selected color preview + hex display */}
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-md border border-border shrink-0"
          style={{ backgroundColor: value || '#FFFFFF' }}
        />
        <span className="text-sm font-mono text-foreground">
          {value || '--'}
        </span>
        {selectedName && selectedName !== value && (
          <span className="text-xs text-muted-foreground">({selectedName})</span>
        )}
      </div>

      {/* Custom hex input */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground shrink-0">
          カスタムカラー:
        </label>
        <input
          type="text"
          value={customHex}
          onChange={(e) => handleCustomHexChange(e.target.value)}
          onBlur={handleCustomHexBlur}
          placeholder="#FF0000"
          className={`w-28 px-2 py-1.5 text-sm font-mono border rounded-md bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 ${
            inputError ? 'border-red-400' : 'border-border'
          }`}
          maxLength={7}
        />
        {inputError && (
          <span className="text-xs text-red-500">
            正しいHEXコードを入力してください
          </span>
        )}
      </div>
    </div>
  )
}
