'use client'

import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface QuantitySelectorProps {
  quantity: number
  minQuantity: number
  maxQuantity: number
  onQuantityChange: (quantity: number) => void
}

const PRESET_QUANTITIES = [10, 30, 50, 100, 200, 500]

export function QuantitySelector({
  quantity,
  minQuantity,
  maxQuantity,
  onQuantityChange,
}: QuantitySelectorProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10)
    if (!isNaN(value)) {
      if (value < minQuantity) {
        onQuantityChange(minQuantity)
      } else if (value > maxQuantity) {
        onQuantityChange(maxQuantity)
      } else {
        onQuantityChange(value)
      }
    }
  }

  const handleIncrement = () => {
    if (quantity < maxQuantity) {
      onQuantityChange(Math.min(maxQuantity, quantity + 10))
    }
  }

  const handleDecrement = () => {
    if (quantity > minQuantity) {
      onQuantityChange(Math.max(minQuantity, quantity - 10))
    }
  }

  const filteredPresets = PRESET_QUANTITIES.filter(
    (q) => q >= minQuantity && q <= maxQuantity
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground text-lg">数量</h3>
        <span className="text-sm text-muted-foreground">
          {minQuantity}〜{maxQuantity.toLocaleString()}個
        </span>
      </div>

      {/* Preset Quantities */}
      <div className="flex flex-wrap gap-2">
        {filteredPresets.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onQuantityChange(preset)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              quantity === preset
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {preset}個
          </button>
        ))}
      </div>

      {/* Custom Quantity Input */}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-xl flex-shrink-0"
          onClick={handleDecrement}
          disabled={quantity <= minQuantity}
        >
          <Minus className="h-4 w-4" />
          <span className="sr-only">減らす</span>
        </Button>

        <div className="relative flex-1">
          <Input
            type="number"
            value={quantity}
            onChange={handleInputChange}
            min={minQuantity}
            max={maxQuantity}
            className="h-12 text-center text-lg font-semibold rounded-xl pr-10"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            個
          </span>
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-xl flex-shrink-0"
          onClick={handleIncrement}
          disabled={quantity >= maxQuantity}
        >
          <Plus className="h-4 w-4" />
          <span className="sr-only">増やす</span>
        </Button>
      </div>
    </div>
  )
}
