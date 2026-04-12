'use client'

import { useMemo } from 'react'
import Image from 'next/image'
import { Check, ChevronDown } from 'lucide-react'
import {
  type Product,
  type ProductOption,
  type PriceModifier,
  formatPrice,
} from '@/lib/products'
import { ColorPicker } from '@/components/color-picker'

export interface OptionSelectorProps {
  product: Product
  selectedOptions: Record<string, string>
  onOptionChange: (optionId: string, valueId: string) => void
  onCheckboxToggle: (optionId: string, valueId: string) => void
  formatPriceModifier: (modifier?: PriceModifier) => string
}

function isOptionVisible(
  opt: ProductOption,
  selectedOptions: Record<string, string>,
): boolean {
  if (!opt.parentId) return true
  const parentValue = selectedOptions[opt.parentId]
  if (!parentValue) return false
  if (!opt.showWhen || opt.showWhen.length === 0) return true
  return opt.showWhen.includes(parentValue)
}

function getDescendantIds(parentId: string, options: ProductOption[]): string[] {
  const children = options.filter((o) => o.parentId === parentId)
  const ids: string[] = []
  for (const child of children) {
    ids.push(child.id)
    ids.push(...getDescendantIds(child.id, options))
  }
  return ids
}

function getOrderedOptions(options: ProductOption[]): ProductOption[] {
  const result: ProductOption[] = []
  const topLevel = options.filter((o) => !o.parentId)
  for (const parent of topLevel) {
    result.push(parent)
    const children = options.filter((o) => o.parentId === parent.id)
    for (const child of children) {
      result.push(child)
      const grandchildren = options.filter((o) => o.parentId === child.id)
      result.push(...grandchildren)
    }
  }
  return result
}

function RequiredMark({ required }: { required?: boolean }) {
  if (required !== false) {
    return <span className="text-red-500 ml-1">*</span>
  }
  return <span className="text-xs text-muted-foreground ml-2">（任意）</span>
}

/* ── Shape / Type column (list-style options) ── */
function ShapeTypeColumn({
  product,
  selectedOptions,
  onOptionChange,
  onCheckboxToggle,
  formatPriceModifier,
}: OptionSelectorProps) {
  return (
    <div className="lg:col-span-2 space-y-6">
      {/* Shape / Type list options */}
      {product.options
        .filter(
          (o) =>
            (o.id === 'shape' || o.id === 'type') &&
            isOptionVisible(o, selectedOptions),
        )
        .map((option) => (
          <div
            key={option.id}
            className={
              option.parentId
                ? 'border-l-2 border-primary/30 pl-4 ml-2'
                : ''
            }
          >
            <h3 className="font-semibold text-foreground mb-3">
              {option.name}
              <RequiredMark required={option.required} />
            </h3>
            <div className="space-y-1">
              {option.values.map((value) => {
                const priceLabel = formatPriceModifier(value.priceModifier)
                return (
                  <button
                    key={value.id}
                    onClick={() => onOptionChange(option.id, value.id)}
                    className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-all ${
                      selectedOptions[option.id] === value.id
                        ? 'bg-primary/10 text-primary font-medium border border-primary/30'
                        : 'hover:bg-muted text-foreground border border-transparent'
                    }`}
                  >
                    {value.imageUrl && (
                      <Image
                        src={value.imageUrl}
                        alt={value.label}
                        width={36}
                        height={36}
                        className="rounded-md object-cover shrink-0 mt-0.5"
                      />
                    )}
                    <div
                      className={`flex items-center gap-3 flex-1 min-w-0 ${
                        !value.imageUrl ? '' : ''
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                          selectedOptions[option.id] === value.id
                            ? 'border-primary bg-primary'
                            : 'border-border'
                        }`}
                      >
                        {selectedOptions[option.id] === value.id && (
                          <Check className="w-3 h-3 text-primary-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate">{value.label}</span>
                          {priceLabel && (
                            <span className="text-xs font-semibold text-green-600 shrink-0">
                              {priceLabel}
                            </span>
                          )}
                        </div>
                        {value.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {value.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}

      {/* Dropdown Options */}
      {product.options
        .filter(
          (o) => o.type === 'dropdown' && isOptionVisible(o, selectedOptions),
        )
        .map((option) => (
          <div
            key={option.id}
            className={
              option.parentId
                ? 'border-l-2 border-primary/30 pl-4 ml-2'
                : ''
            }
          >
            <h3 className="font-semibold text-foreground mb-3">
              {option.name}
              <RequiredMark required={option.required} />
            </h3>
            <div className="relative">
              <select
                value={selectedOptions[option.id] || ''}
                onChange={(e) => onOptionChange(option.id, e.target.value)}
                className="w-full appearance-none bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-foreground pr-10 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                {option.values.map((value) => {
                  const priceLabel = formatPriceModifier(value.priceModifier)
                  return (
                    <option key={value.id} value={value.id}>
                      {value.label}
                      {priceLabel ? ` ${priceLabel}` : ''}
                    </option>
                  )
                })}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        ))}

      {/* Checkbox Options */}
      {product.options
        .filter(
          (o) => o.type === 'checkbox' && isOptionVisible(o, selectedOptions),
        )
        .map((option) => (
          <div
            key={option.id}
            className={
              option.parentId
                ? 'border-l-2 border-primary/30 pl-4 ml-2'
                : ''
            }
          >
            <h3 className="font-semibold text-foreground mb-3">
              {option.name}
              <RequiredMark required={option.required} />
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {option.values.map((v) => {
                const checked = (selectedOptions[option.id] || '')
                  .split(',')
                  .includes(v.id)
                return (
                  <label
                    key={v.id}
                    className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition ${
                      checked
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onCheckboxToggle(option.id, v.id)}
                      className="rounded"
                    />
                    <span className="text-sm">{v.label}</span>
                    {v.priceModifier && (
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatPriceModifier(v.priceModifier)}
                      </span>
                    )}
                  </label>
                )
              })}
            </div>
          </div>
        ))}

      {/* Number Options */}
      {product.options
        .filter(
          (o) => o.type === 'number' && isOptionVisible(o, selectedOptions),
        )
        .map((option) => (
          <div
            key={option.id}
            className={
              option.parentId
                ? 'border-l-2 border-primary/30 pl-4 ml-2'
                : ''
            }
          >
            <h3 className="font-semibold text-foreground mb-3">
              {option.name}
              <RequiredMark required={option.required} />
            </h3>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={option.numberMin}
                max={option.numberMax}
                value={selectedOptions[option.id] || ''}
                onChange={(e) => onOptionChange(option.id, e.target.value)}
                className="w-32 px-3 py-2 border border-border rounded-lg text-sm"
                placeholder={`${option.numberMin ?? 0}〜${option.numberMax ?? ''}`}
              />
              {option.numberUnit && (
                <span className="text-sm text-muted-foreground">
                  {option.numberUnit}
                </span>
              )}
              {option.pricePerUnit && option.pricePerUnit > 0 && (
                <span className="text-xs text-muted-foreground">
                  （1{option.numberUnit || '単位'}あたり{' '}
                  {formatPrice(option.pricePerUnit)} 加算）
                </span>
              )}
            </div>
          </div>
        ))}

      {/* Color Options */}
      {product.options
        .filter(
          (o) => o.type === 'color' && isOptionVisible(o, selectedOptions),
        )
        .map((option) => (
          <div
            key={option.id}
            className={
              option.parentId
                ? 'border-l-2 border-primary/30 pl-4 ml-2'
                : ''
            }
          >
            <h3 className="font-semibold text-foreground mb-3">
              {option.name}
              <RequiredMark required={option.required} />
            </h3>
            <ColorPicker
              value={selectedOptions[option.id] || ''}
              onChange={(hex) => onOptionChange(option.id, hex)}
            />
          </div>
        ))}
    </div>
  )
}

/* ── Material / Grid column ── */
function MaterialColumn({
  product,
  selectedOptions,
  onOptionChange,
  formatPriceModifier,
}: Omit<OptionSelectorProps, 'onCheckboxToggle'>) {
  return (
    <div className="lg:col-span-3">
      {product.options
        .filter(
          (o) =>
            (o.id === 'material' ||
              (o.type === 'grid' && o.id !== 'material')) &&
            isOptionVisible(o, selectedOptions),
        )
        .map((option) => (
          <div
            key={option.id}
            className={
              option.parentId
                ? 'border-l-2 border-primary/30 pl-4 ml-2'
                : ''
            }
          >
            <h3 className="font-semibold text-foreground mb-3">
              {option.name}
              <RequiredMark required={option.required} />
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {option.values.map((value) => {
                const priceLabel = formatPriceModifier(value.priceModifier)
                return (
                  <button
                    key={value.id}
                    onClick={() => onOptionChange(option.id, value.id)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all relative ${
                      selectedOptions[option.id] === value.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/30 bg-card'
                    }`}
                  >
                    {priceLabel && (
                      <span className="absolute top-1 right-1 text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                        {priceLabel}
                      </span>
                    )}
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-muted to-secondary flex items-center justify-center overflow-hidden">
                      {value.previewColor ? (
                        <div
                          className="w-10 h-10 rounded-lg border border-border shadow-inner"
                          style={{ backgroundColor: value.previewColor }}
                        />
                      ) : value.imageUrl ? (
                        <Image
                          src={value.imageUrl}
                          alt={value.label}
                          width={48}
                          height={48}
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/40" />
                      )}
                    </div>
                    <span className="text-xs text-center font-medium leading-tight">
                      {value.label}
                    </span>
                    {value.description && (
                      <span className="text-[10px] text-muted-foreground text-center leading-tight line-clamp-2">
                        {value.description}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
    </div>
  )
}

/* ── Size column (list) ── */
function SizeColumn({
  product,
  selectedOptions,
  onOptionChange,
  formatPriceModifier,
}: Omit<OptionSelectorProps, 'onCheckboxToggle'>) {
  return (
    <div className="lg:col-span-3">
      {product.options
        .filter(
          (o) => o.id === 'size' && isOptionVisible(o, selectedOptions),
        )
        .map((option) => (
          <div
            key={option.id}
            className={
              option.parentId
                ? 'border-l-2 border-primary/30 pl-4 ml-2'
                : ''
            }
          >
            <h3 className="font-semibold text-foreground mb-3">
              {option.name}
              <RequiredMark required={option.required} />
            </h3>
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <div className="max-h-[400px] overflow-y-auto">
                {option.values.map((value, index) => {
                  const priceLabel = formatPriceModifier(value.priceModifier)
                  return (
                    <button
                      key={value.id}
                      onClick={() => onOptionChange(option.id, value.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-all text-left ${
                        selectedOptions[option.id] === value.id
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'hover:bg-muted text-foreground'
                      } ${
                        index !== option.values.length - 1
                          ? 'border-b border-border'
                          : ''
                      }`}
                    >
                      {value.imageUrl && (
                        <Image
                          src={value.imageUrl}
                          alt={value.label}
                          width={32}
                          height={32}
                          className="rounded object-cover shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <span>{value.label}</span>
                        {value.description && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 font-normal line-clamp-1">
                            {value.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {priceLabel && (
                          <span className="text-xs font-semibold text-green-600">
                            {priceLabel}
                          </span>
                        )}
                        {selectedOptions[option.id] === value.id && (
                          <Check className="w-4 h-4" />
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        ))}
    </div>
  )
}

export function OptionSelector(props: OptionSelectorProps) {
  return (
    <>
      <ShapeTypeColumn {...props} />
      <MaterialColumn {...props} />
      <SizeColumn {...props} />
    </>
  )
}

// Re-export helpers so parent can use them
export { isOptionVisible, getDescendantIds, getOrderedOptions }
