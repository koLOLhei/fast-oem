'use client'

import React, { useCallback, useMemo, useRef, useState, useTransition } from 'react'
import { type Product, type PriceTier, type ProductOption, type OptionValue, type MoldFeeRule, type ImageView, type ComplexityRule, calculateUnitPrice, calculateMoldFee, calculateShippingModifier, formatPrice } from '@/lib/products'
import { updateProduct, toggleProductActive, createProduct, applyGlobalPriceAdjustment, uploadProductImage } from '@/app/actions/products'

interface Factory {
    id: string
    name: string
    contact_email?: string
}

interface ProductsClientProps {
    initialProducts: Product[]
    factories: Factory[]
}

type Tab = 'basic' | 'price' | 'options'

const TABS: Tab[] = ['basic', 'price', 'options']
const TAB_LABELS: Record<Tab, string> = {
    basic: '基本情報',
    price: '価格テーブル',
    options: 'オプション',
}

const CATEGORY_OPTIONS = [
    { value: 'keychain', label: 'キーホルダー (keychain)' },
    { value: 'badge', label: 'バッジ (badge)' },
    { value: 'packaging', label: 'パッケージ (packaging)' },
    { value: 'other', label: 'その他 (other)' },
] as const

const DEFAULT_QUANTITY_PRESETS = [10, 30, 50, 100] as const
const DEFAULT_PRICE_TIER: PriceTier = { minQuantity: 1, maxQuantity: 100, unitPrice: 1000 }

/** Generate a URL-safe slug from product name. Only a-z, 0-9, hyphens allowed. */
const slugify = (s: string) =>
    s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `product-${crypto.randomUUID().slice(0, 8)}`

export function ProductsClient({ initialProducts, factories }: ProductsClientProps) {
    const [products, setProducts] = useState(initialProducts)
    const [selected, setSelected] = useState<Product | null>(null)
    const [tab, setTab] = useState<Tab>('basic')
    const [saving, startSave] = useTransition()
    const [saveMsg, setSaveMsg] = useState('')

    // New product creation state
    const [showCreate, setShowCreate] = useState(false)
    const [newName, setNewName] = useState('')
    const [newSlug, setNewSlug] = useState('')
    const [newCategory, setNewCategory] = useState('other')
    const [creating, startCreate] = useTransition()
    const [createError, setCreateError] = useState('')

    // Global price adjustment state
    const [adjPercent, setAdjPercent] = useState('')
    const [adjMsg, setAdjMsg] = useState('')
    const [adjPending, startAdj] = useTransition()

    // Editable draft of the selected product
    const [draft, setDraft] = useState<Product | null>(null)

    // Live preview panel
    const [showPreview, setShowPreview] = useState(false)
    const [previewOptions, setPreviewOptions] = useState<Record<string, string>>({})
    const [previewQuantity, setPreviewQuantity] = useState(100)

    // Memoized price calculation for preview panel
    const previewCalc = useMemo(() => {
        if (!draft) return null
        const unit = calculateUnitPrice(draft, previewQuantity, previewOptions)
        const mold = calculateMoldFee(draft, previewOptions, previewQuantity)
        const shipping = calculateShippingModifier(draft, previewOptions)
        const total = unit * previewQuantity + (mold.requiresMold ? mold.moldFee : 0) + shipping
        return { unit, mold, shipping, total }
    }, [draft, previewQuantity, previewOptions])

    const selectProduct = (p: Product) => {
        if (draft && selected && draft.id === selected.id) {
            if (JSON.stringify(draft) !== JSON.stringify(selected)) {
                if (!window.confirm('保存されていない変更があります。破棄して切り替えますか？')) return
            }
        }
        setSelected(p)
        setDraft(JSON.parse(JSON.stringify(p)))
        setTab('basic')
        setSaveMsg('')
        setShowCreate(false)
        // Initialize preview options with first value of each option
        const initial: Record<string, string> = {}
        p.options.forEach((opt) => {
            if (opt.type !== 'checkbox' && opt.type !== 'number' && opt.values.length > 0) {
                initial[opt.id] = opt.values[0].id
            }
        })
        setPreviewOptions(initial)
        setPreviewQuantity(p.minQuantity || 100)
    }

    const handleSave = () => {
        if (!draft) return
        setSaveMsg('')
        startSave(async () => {
            try {
                await updateProduct(draft.id, {
                    name: draft.name,
                    description: draft.description,
                    shortDescription: draft.shortDescription,
                    category: draft.category,
                    requiresMold: draft.requiresMold,
                    moldFee: draft.moldFee ?? 0,
                    leadTimeDays: draft.leadTimeDays ?? 7,
                    expressDeliveryFee: draft.expressDeliveryFee ?? 0,
                    minQuantity: draft.minQuantity,
                    maxQuantity: draft.maxQuantity,
                    imageUrl: draft.imageUrl,
                    features: draft.features,
                    quantityPresets: draft.quantityPresets,
                    priceTiers: draft.priceTiers,
                    options: draft.options,
                    notificationEmail: draft.notificationEmail ?? '',
                    defaultFactoryId: draft.defaultFactoryId ?? undefined,
                    moldFeeRules: draft.moldFeeRules ?? [],
                    is3d: draft.is3d ?? false,
                    imageViews: draft.imageViews ?? [],
                    fixedUnitPrice: draft.fixedUnitPrice ?? false,
                    complexityRules: draft.complexityRules ?? [],
                })
                setProducts((prev) => prev.map((p) => (p.id === draft.id ? draft : p)))
                setSelected(draft)
                setSaveMsg('✅ 保存しました')
            } catch (e: any) {
                setSaveMsg('❌ 保存に失敗しました。再度お試しください。')
            }
        })
    }

    const handleToggleActive = (p: Product) => {
        // isActive defaults to true if not yet set (DB default is TRUE)
        const current = p.isActive ?? true
        const next = !current
        startSave(async () => {
            try {
                await toggleProductActive(p.id, next)
                setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, isActive: next } : x)))
                if (draft?.id === p.id) setDraft((prev) => prev ? { ...prev, isActive: next } : prev)
                if (selected?.id === p.id) setSelected((prev) => prev ? { ...prev, isActive: next } : prev)
            } catch (e: any) {
                setSaveMsg(`❌ 表示切替に失敗しました: ${e?.message ?? '再度お試しください'}`)
            }
        })
    }

    const handleCreate = () => {
        if (!newName.trim()) { setCreateError('商品名を入力してください'); return }
        const finalSlug = newSlug.trim() || slugify(newName)
        if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(finalSlug) && finalSlug.length > 1) {
            setCreateError('スラッグは半角英数字とハイフンのみ使用できます（例: plush-toy）')
            return
        }
        if (products.some(p => p.slug === finalSlug)) {
            setCreateError(`スラッグ「${finalSlug}」は既に使われています`)
            return
        }
        setCreateError('')
        startCreate(async () => {
            try {
                const id = finalSlug  // slug をそのまま id として使用（短く、URLフレンドリー）
                const slug = finalSlug
                const newProduct: Omit<Product, 'id'> & { id: string } = {
                    id, slug,
                    name: newName.trim(),
                    shortDescription: '',
                    description: '',
                    category: newCategory,
                    imageUrl: '',
                    features: [],
                    quantityPresets: [...DEFAULT_QUANTITY_PRESETS],
                    priceTiers: [{ ...DEFAULT_PRICE_TIER }],
                    options: [],
                    minQuantity: 1,
                    maxQuantity: 10000,
                    requiresMold: false,
                    moldFee: 0,
                    leadTimeDays: 14,
                    expressDeliveryFee: 0,
                    isActive: true,
                }
                await createProduct(newProduct)
                const created: Product = { ...newProduct, isActive: true }
                setProducts((prev) => [created, ...prev])
                setNewName('')
                setNewSlug('')
                setNewCategory('other')
                setShowCreate(false)
                selectProduct(created)
            } catch (e: any) {
                setCreateError(e.message ?? '作成に失敗しました')
            }
        })
    }

    const handleGlobalAdj = () => {
        const pct = parseFloat(adjPercent)
        if (isNaN(pct) || pct <= 0) { setAdjMsg('❌ 正の数値を入力してください'); return }
        if (!window.confirm(`全商品の価格を ${pct}% に変更します（例: 110 = +10%、90 = -10%）。よろしいですか？`)) return
        setAdjMsg('')
        startAdj(async () => {
            try {
                await applyGlobalPriceAdjustment(pct)
                // Reload so all in-memory product state (and any open draft) re-seeds
                // from the DB. Without this, a subsequent edit-save would post the
                // stale pre-adjustment tiers and silently revert the price change.
                setAdjMsg('✅ 全商品の価格を更新しました。ページを再読み込みします…')
                window.location.reload()
            } catch (e: any) {
                setAdjMsg('❌ ' + (e.message ?? '更新に失敗しました'))
            }
        })
    }

    return (
        <div className="space-y-4">
            {/* Global price adjustment bar */}
            <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
                <span className="text-sm font-medium shrink-0">全商品価格を一括変更</span>
                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        min="1"
                        max="1000"
                        step="1"
                        className="w-24 px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                        value={adjPercent}
                        onChange={(e) => { setAdjPercent(e.target.value); setAdjMsg('') }}
                        placeholder="110"
                    />
                    <span className="text-sm text-muted-foreground">% に設定（110=+10%、90=-10%）</span>
                </div>
                <button
                    onClick={handleGlobalAdj}
                    disabled={adjPending}
                    className="px-4 py-1.5 text-sm bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg disabled:opacity-60 transition shrink-0"
                >
                    {adjPending ? '処理中...' : '一括適用'}
                </button>
                {adjMsg && (
                    <span className={`text-xs ${adjMsg.startsWith('✅') ? 'text-green-700' : 'text-red-600'}`}>
                        {adjMsg}
                    </span>
                )}
            </div>

            <div className="flex gap-6 h-[calc(100vh-240px)]">
                {/* Left: Product List */}
                <aside className="w-64 shrink-0 flex flex-col gap-2 overflow-y-auto pr-2">
                    <div className="flex items-center justify-between mb-1">
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">商品一覧</h2>
                        <button
                            onClick={() => { setShowCreate(true); setSelected(null); setDraft(null); setSaveMsg('') }}
                            className="text-xs px-2.5 py-1 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition font-semibold"
                        >
                            + 追加
                        </button>
                    </div>

                    {products.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => selectProduct(p)}
                            className={`w-full text-left px-3 py-3 rounded-xl border transition-all ${selected?.id === p.id
                                ? 'bg-primary/10 border-primary/40 text-primary font-semibold'
                                : 'bg-card border-border hover:bg-muted/50'
                                }`}
                        >
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                                <p className="text-sm font-medium truncate flex-1">{p.name}</p>
                                <span
                                    className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${p.isActive !== false
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-gray-100 text-gray-500'
                                        }`}
                                >
                                    {p.isActive !== false ? '公開中' : '非表示'}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {p.priceTiers.length}段階 ／ {p.options.length}オプション
                                {p.requiresMold && ' ／ 金型あり'}
                            </p>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleToggleActive(p) }}
                                className="mt-1.5 text-[10px] text-muted-foreground hover:text-foreground underline"
                            >
                                {p.isActive !== false ? '非表示にする' : '公開する'}
                            </button>
                        </button>
                    ))}
                </aside>

                {/* Right: Editor or Create Form */}
                <div className="flex-1 overflow-y-auto">
                    {showCreate ? (
                        <CreateForm
                            newName={newName}
                            setNewName={setNewName}
                            newSlug={newSlug}
                            setNewSlug={setNewSlug}
                            newCategory={newCategory}
                            setNewCategory={setNewCategory}
                            createError={createError}
                            creating={creating}
                            onSubmit={handleCreate}
                            onCancel={() => setShowCreate(false)}
                        />
                    ) : draft ? (
                        <>
                            {/* Header */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-xl font-bold">{draft.name}</h2>
                                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${draft.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                        {draft.isActive !== false ? '公開中' : '非表示'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    {saveMsg && (
                                        <span className={`text-sm ${saveMsg.startsWith('✅') ? 'text-green-700' : 'text-red-600'}`}>
                                            {saveMsg}
                                        </span>
                                    )}
                                    <button
                                        onClick={() => handleToggleActive(selected!)}
                                        disabled={saving}
                                        className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition disabled:opacity-60"
                                    >
                                        {selected?.isActive !== false ? '非表示にする' : '公開する'}
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="px-5 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition disabled:opacity-60"
                                    >
                                        {saving ? '保存中...' : '変更を保存'}
                                    </button>
                                    <button
                                        onClick={() => setShowPreview(!showPreview)}
                                        className={`px-4 py-2 text-sm border rounded-lg transition font-medium ${showPreview ? 'bg-violet-100 border-violet-300 text-violet-700' : 'border-border hover:bg-muted'}`}
                                    >
                                        {showPreview ? '👁 プレビュー閉じる' : '👁 プレビュー'}
                                    </button>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="flex gap-1 bg-muted rounded-lg p-1 mb-6 w-fit">
                                {TABS.map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setTab(t)}
                                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${tab === t ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        {TAB_LABELS[t]}
                                    </button>
                                ))}
                            </div>

                            <div className={showPreview ? 'flex gap-6' : ''}>
                                <div className={showPreview ? 'flex-1 min-w-0' : ''}>
                                    {tab === 'basic' && <BasicTab draft={draft} setDraft={setDraft} factories={factories} />}
                                    {tab === 'price' && <PriceTiersTab draft={draft} setDraft={setDraft} />}
                                    {tab === 'options' && <OptionsTab draft={draft} setDraft={setDraft} />}
                                </div>
                                {showPreview && (
                                    <div className="w-[420px] shrink-0">
                                        <div className="sticky top-0 space-y-4">
                                            {/* Live iframe of actual user page */}
                                            <div className="rounded-xl border bg-card shadow-lg overflow-hidden">
                                                <div className="flex items-center justify-between px-3 py-2 bg-violet-50 border-b">
                                                    <h3 className="text-xs font-bold text-violet-700">ユーザーページ プレビュー</h3>
                                                    <a
                                                        href={`/products/${draft.slug}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-[10px] text-violet-600 hover:underline"
                                                    >
                                                        別タブで開く ↗
                                                    </a>
                                                </div>
                                                <div className="relative bg-white" style={{ height: '500px' }}>
                                                    <iframe
                                                        key={draft.slug}
                                                        src={`/products/${draft.slug}`}
                                                        className="w-full h-full border-0"
                                                        style={{ transform: 'scale(0.55)', transformOrigin: 'top left', width: '182%', height: '182%' }}
                                                        title="商品ページプレビュー"
                                                    />
                                                </div>
                                                <div className="px-3 py-2 bg-muted/30 border-t">
                                                    <p className="text-[10px] text-muted-foreground">※ 保存後にプレビューが更新されます。リロードするには「プレビュー」ボタンを2回クリックしてください。</p>
                                                </div>
                                            </div>
                                            {/* Option simulator */}
                                            <div className="rounded-xl border bg-card p-4 shadow-lg space-y-3">
                                                <h4 className="text-xs font-bold text-muted-foreground uppercase">オプション切替シミュレーター</h4>
                                                {draft.options.filter(o => o.type !== 'number').map((opt) => (
                                                    <div key={opt.id}>
                                                        <label className="text-[11px] font-medium text-muted-foreground block mb-1">{opt.name}</label>
                                                        {opt.type === 'checkbox' ? (
                                                            <div className="flex flex-wrap gap-1">
                                                                {opt.values.map((v) => {
                                                                    const current = (previewOptions[opt.id] || '').split(',').filter(Boolean)
                                                                    const checked = current.includes(v.id)
                                                                    return (
                                                                        <label key={v.id} className={`text-[10px] px-2 py-1 rounded border cursor-pointer ${checked ? 'bg-primary/10 border-primary text-primary' : 'border-border'}`}>
                                                                            <input type="checkbox" className="sr-only" checked={checked} onChange={() => {
                                                                                const next = checked ? current.filter(x => x !== v.id) : [...current, v.id]
                                                                                setPreviewOptions(prev => ({ ...prev, [opt.id]: next.join(',') }))
                                                                            }} />
                                                                            {v.label}
                                                                        </label>
                                                                    )
                                                                })}
                                                            </div>
                                                        ) : (
                                                            <select
                                                                className="w-full text-xs border border-border rounded px-2 py-1.5 bg-background"
                                                                value={previewOptions[opt.id] ?? ''}
                                                                onChange={(e) => setPreviewOptions(prev => ({ ...prev, [opt.id]: e.target.value }))}
                                                            >
                                                                {opt.values.map((v) => (
                                                                    <option key={v.id} value={v.id}>{v.label}</option>
                                                                ))}
                                                            </select>
                                                        )}
                                                    </div>
                                                ))}
                                                {/* Quantity slider */}
                                                <div>
                                                    <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                                                        数量: {previewQuantity.toLocaleString()}個
                                                    </label>
                                                    <input
                                                        type="range"
                                                        min={draft.minQuantity || 1}
                                                        max={Math.min(draft.maxQuantity || 10000, 10000)}
                                                        value={previewQuantity}
                                                        onChange={(e) => setPreviewQuantity(parseInt(e.target.value))}
                                                        className="w-full accent-primary"
                                                    />
                                                </div>
                                            </div>
                                            {/* Price calculation result */}
                                            <div className="rounded-xl border bg-gradient-to-br from-green-50 to-emerald-50 p-4 shadow-lg space-y-2">
                                                <h4 className="text-xs font-bold text-green-800 uppercase">算出結果</h4>
                                                {previewCalc && (
                                                    <>
                                                        <div className="flex justify-between text-xs">
                                                            <span className="text-muted-foreground">単価</span>
                                                            <span className="font-bold">{formatPrice(previewCalc.unit)}/個</span>
                                                        </div>
                                                        <div className="flex justify-between text-xs">
                                                            <span className="text-muted-foreground">小計 ({previewQuantity}個)</span>
                                                            <span className="font-bold">{formatPrice(previewCalc.unit * previewQuantity)}</span>
                                                        </div>
                                                        {previewCalc.mold.requiresMold && (
                                                            <div className="flex justify-between text-xs">
                                                                <span className="text-orange-600">金型費</span>
                                                                <span className="font-bold text-orange-600">{formatPrice(previewCalc.mold.moldFee)}</span>
                                                            </div>
                                                        )}
                                                        {previewCalc.shipping > 0 && (
                                                            <div className="flex justify-between text-xs">
                                                                <span className="text-blue-600">送料加算</span>
                                                                <span className="font-bold text-blue-600">+{formatPrice(previewCalc.shipping)}</span>
                                                            </div>
                                                        )}
                                                        <div className="flex justify-between text-sm pt-1 border-t border-green-200">
                                                            <span className="font-bold text-green-800">合計</span>
                                                            <span className="font-black text-green-800 text-base">{formatPrice(previewCalc.total)}</span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground h-full">
                            左から商品を選択、または「+ 追加」で新規作成してください
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

/* ------------------------------------------------------------------ */
/* New Product Create Form                                             */
/* ------------------------------------------------------------------ */
const CreateForm = React.memo(function CreateForm({
    newName, setNewName, newSlug, setNewSlug, newCategory, setNewCategory,
    createError, creating, onSubmit, onCancel,
}: {
    newName: string; setNewName: (s: string) => void
    newSlug: string; setNewSlug: (s: string) => void
    newCategory: string; setNewCategory: (s: string) => void
    createError: string; creating: boolean
    onSubmit: () => void; onCancel: () => void
}) {
    const autoSlug = newName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    return (
        <div className="max-w-lg space-y-5">
            <h2 className="text-xl font-bold">新規商品を追加</h2>
            <p className="text-sm text-muted-foreground">基本情報を入力して商品を作成します。詳細はその後編集できます。</p>

            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">商品名 <span className="text-red-500">*</span></label>
                    <input
                        className={inputCls}
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="例: アクリルキーホルダー"
                        autoFocus
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                        スラッグ（URL） <span className="text-red-500">*</span>
                    </label>
                    <input
                        className={`${inputCls} font-mono`}
                        value={newSlug}
                        onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                        placeholder={autoSlug || 'acrylic-keychain'}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                        URL: /products/<strong>{newSlug || autoSlug || '...'}</strong>
                        （半角英数字とハイフンのみ。空欄なら商品名から自動生成）
                    </p>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">カテゴリ</label>
                    <select className={inputCls} value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
                        {CATEGORY_OPTIONS.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {createError && <p className="text-sm text-red-600">{createError}</p>}

            <div className="flex gap-3 pt-2">
                <button
                    onClick={onSubmit}
                    disabled={creating}
                    className="px-5 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition disabled:opacity-60"
                >
                    {creating ? '作成中...' : '商品を作成'}
                </button>
                <button
                    onClick={onCancel}
                    className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition"
                >
                    キャンセル
                </button>
            </div>
        </div>
    )
})

/* ------------------------------------------------------------------ */
/* Basic Info Tab                                                       */
/* ------------------------------------------------------------------ */
const BasicTab = React.memo(function BasicTab({ draft, setDraft, factories }: { draft: Product; setDraft: React.Dispatch<React.SetStateAction<Product | null>>; factories: Factory[] }) {
    const set = (key: keyof Product, value: any) =>
        setDraft((prev) => prev ? { ...prev, [key]: value } : prev)

    const [uploading, startUpload] = useTransition()
    const [uploadError, setUploadError] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setUploadError('')
        const formData = new FormData()
        formData.append('file', file)
        startUpload(async () => {
            try {
                const url = await uploadProductImage(formData)
                set('imageUrl', url)
            } catch (err: any) {
                setUploadError(err.message ?? 'アップロードに失敗しました')
            }
        })
        // Reset so the same file can be re-selected if needed
        e.target.value = ''
    }

    const moldOverrideSummary = useMemo(() => {
        const entries = draft.options.flatMap((o) =>
            o.values.filter((v) => v.requiresMold).map((v) => `${o.name}「${v.label}」¥${(v.moldFee ?? 0).toLocaleString()}`)
        )
        return entries.length > 0 ? entries.join('、') : null
    }, [draft.options])

    return (
        <div className="space-y-6 max-w-2xl">
            <div className="grid grid-cols-2 gap-4">
                <Field label="商品名" required>
                    <input className={inputCls} value={draft.name} onChange={(e) => set('name', e.target.value)} />
                </Field>
                <Field label="カテゴリ">
                    <select className={inputCls} value={draft.category} onChange={(e) => set('category', e.target.value)}>
                        {CATEGORY_OPTIONS.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                    </select>
                </Field>
            </div>

            <Field label="短い説明（一覧表示用）">
                <input className={inputCls} value={draft.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} />
            </Field>

            <Field label="詳細説明">
                <textarea
                    className={`${inputCls} min-h-[80px] resize-y`}
                    value={draft.description}
                    onChange={(e) => set('description', e.target.value)}
                />
            </Field>

            <div className="grid grid-cols-3 gap-4">
                <Field label="最小注文数">
                    <input type="number" className={inputCls} value={draft.minQuantity} onChange={(e) => set('minQuantity', parseInt(e.target.value) || 1)} />
                </Field>
                <Field label="最大注文数">
                    <input type="number" className={inputCls} value={draft.maxQuantity} onChange={(e) => set('maxQuantity', parseInt(e.target.value) || 1)} />
                </Field>
                <Field label="納期（営業日）">
                    <input type="number" className={inputCls} value={draft.leadTimeDays ?? 7} onChange={(e) => set('leadTimeDays', parseInt(e.target.value) || 7)} />
                </Field>
            </div>

            <div className="rounded-xl border bg-card p-4 space-y-3">
                <h3 className="font-semibold text-sm">金型設定</h3>
                <p className="text-xs text-muted-foreground">
                    オプションタブで各種類ごとに個別の金型設定が可能です。個別設定がある場合はそちらが優先されます。
                    ここでは全種類共通のデフォルト設定を行います。
                </p>
                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        className="w-4 h-4 accent-primary"
                        checked={!!draft.requiresMold}
                        onChange={(e) => set('requiresMold', e.target.checked)}
                    />
                    <span className="text-sm">金型が必要な商品（デフォルト設定）</span>
                </label>
                {draft.requiresMold && (
                    <Field label="デフォルト型代（円・税込）">
                        <input
                            type="number"
                            className={inputCls}
                            value={draft.moldFee ?? 0}
                            onChange={(e) => set('moldFee', parseInt(e.target.value) || 0)}
                        />
                    </Field>
                )}
                {moldOverrideSummary && (
                    <div className="rounded-lg bg-orange-50 border border-orange-200 px-3 py-2 text-xs text-orange-800">
                        <span className="font-bold">個別設定あり：</span>
                        {moldOverrideSummary}
                    </div>
                )}

                {/* Conditional mold fee rules */}
                <div className="mt-3 pt-3 border-t space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground">条件付き金型費</h4>
                    <p className="text-[10px] text-muted-foreground">サイズや数量に応じて金型費を変動させるルールを設定できます。</p>
                    {(draft.moldFeeRules ?? []).length > 0 && (
                        <div className="rounded-lg border overflow-hidden">
                            <table className="w-full text-xs">
                                <thead className="bg-muted/50 border-b">
                                    <tr>
                                        <th className="text-left px-3 py-2 font-semibold">条件タイプ</th>
                                        <th className="text-left px-3 py-2 font-semibold">条件値</th>
                                        <th className="text-left px-3 py-2 font-semibold">金型費（円）</th>
                                        <th className="px-3 py-2"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(draft.moldFeeRules ?? []).map((rule, i) => (
                                        <tr key={i} className="border-b last:border-0">
                                            <td className="px-3 py-1.5">
                                                <select
                                                    className={`${smallInput} text-xs`}
                                                    value={rule.conditionType}
                                                    onChange={(e) => {
                                                        const rules = [...(draft.moldFeeRules ?? [])]
                                                        rules[i] = { ...rules[i], conditionType: e.target.value as MoldFeeRule['conditionType'] }
                                                        set('moldFeeRules', rules)
                                                    }}
                                                >
                                                    <option value="size">サイズ (size)</option>
                                                    <option value="quantity">数量 (quantity)</option>
                                                    <option value="fixed">固定 (fixed)</option>
                                                </select>
                                            </td>
                                            <td className="px-3 py-1.5">
                                                <input
                                                    type="text"
                                                    className={`${smallInput} text-xs`}
                                                    value={rule.conditionValue ?? ''}
                                                    onChange={(e) => {
                                                        const rules = [...(draft.moldFeeRules ?? [])]
                                                        rules[i] = { ...rules[i], conditionValue: e.target.value || undefined }
                                                        set('moldFeeRules', rules)
                                                    }}
                                                    placeholder={rule.conditionType === 'size' ? 'オプション値ID' : rule.conditionType === 'quantity' ? '1-100' : ''}
                                                />
                                            </td>
                                            <td className="px-3 py-1.5">
                                                <input
                                                    type="number"
                                                    className={`${smallInput} text-xs`}
                                                    value={rule.moldFee}
                                                    onChange={(e) => {
                                                        const rules = [...(draft.moldFeeRules ?? [])]
                                                        rules[i] = { ...rules[i], moldFee: parseInt(e.target.value) || 0 }
                                                        set('moldFeeRules', rules)
                                                    }}
                                                    placeholder="15000"
                                                />
                                            </td>
                                            <td className="px-3 py-1.5">
                                                <button
                                                    onClick={() => {
                                                        const rules = (draft.moldFeeRules ?? []).filter((_, idx) => idx !== i)
                                                        set('moldFeeRules', rules)
                                                    }}
                                                    className="text-red-500 hover:text-red-700 text-xs px-2 py-0.5 border border-red-200 rounded hover:bg-red-50"
                                                >
                                                    削除
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <button
                        onClick={() => {
                            const rules = [...(draft.moldFeeRules ?? []), { conditionType: 'fixed' as const, moldFee: 0 }]
                            set('moldFeeRules', rules)
                        }}
                        className="text-xs px-3 py-1.5 border border-dashed border-border rounded-lg hover:bg-muted/50 text-muted-foreground"
                    >
                        ＋ ルール追加
                    </button>
                </div>
            </div>

            <div className="rounded-xl border bg-card p-4 space-y-3">
                <h3 className="font-semibold text-sm">💰 単価固定設定</h3>
                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        className="w-4 h-4 accent-primary"
                        checked={!!draft.fixedUnitPrice}
                        onChange={(e) => set('fixedUnitPrice', e.target.checked)}
                    />
                    <div>
                        <p className="text-sm font-medium">オプションによる単価変動を無効にする</p>
                        <p className="text-xs text-muted-foreground">ONにすると、どのオプションを選択しても個数毎の単価は価格テーブルの値で固定されます。オプションは表示・記録されますが金額には影響しません。</p>
                    </div>
                </label>
            </div>

            <div className="rounded-xl border bg-card p-4 space-y-3">
                <h3 className="font-semibold text-sm">⚡ 特急納期設定</h3>
                <p className="text-xs text-muted-foreground">通常15〜30営業日のところ、12営業日以内でお届けする特急オプションの追加料金です。0円に設定すると特急オプションは非表示になります。</p>
                <Field label="特急料金（円・税込、0=非表示）">
                    <input
                        type="number"
                        className={inputCls}
                        value={draft.expressDeliveryFee ?? 0}
                        onChange={(e) => set('expressDeliveryFee', parseInt(e.target.value) || 0)}
                    />
                </Field>
            </div>

            <div className="rounded-xl border bg-card p-4 space-y-3">
                <h3 className="font-semibold text-sm">🏭 担当工場 & 発注メール</h3>
                <p className="text-xs text-muted-foreground">
                    注文確定時にこの商品の注文明細を指定工場へ割り当て、工場の登録メールアドレスに発注通知を自動送信します。
                </p>
                <Field label="担当工場">
                    <select
                        className={inputCls}
                        value={draft.defaultFactoryId ?? ''}
                        onChange={(e) => set('defaultFactoryId', e.target.value || null)}
                    >
                        <option value="">— 未設定（手動割り当て）</option>
                        {factories.map((f) => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                    </select>
                </Field>
                {draft.defaultFactoryId && (() => {
                    const f = factories.find(f => f.id === draft.defaultFactoryId)
                    return f ? (
                        <p className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
                            ✓ 発注メール送信先: <strong>{f?.contact_email || '未設定'}</strong>（工場管理で登録済みのメールアドレス）
                        </p>
                    ) : null
                })()}
                <div className="border-t pt-3 mt-2">
                    <Field label="メール送信先を上書き（任意）">
                        <input
                            type="text"
                            className={inputCls}
                            value={draft.notificationEmail ?? ''}
                            placeholder="空欄なら工場の登録メールに送信"
                            onChange={(e) => set('notificationEmail', e.target.value)}
                        />
                    </Field>
                    <p className="text-[10px] text-muted-foreground mt-1">
                        ここに入力すると、工場の登録メールの代わりにこのアドレスに発注通知が送信されます。
                    </p>
                </div>
            </div>

            <Field label="数量プリセット（カンマ区切り）">
                <input
                    className={inputCls}
                    value={draft.quantityPresets.join(', ')}
                    onChange={(e) => {
                        const presets = e.target.value.split(',').map((s) => parseInt(s.trim())).filter((n) => !isNaN(n))
                        set('quantityPresets', presets)
                    }}
                />
                <p className="text-xs text-muted-foreground mt-1">例: 10, 30, 50, 100, 200</p>
            </Field>

            <Field label="特徴（改行区切り）">
                <textarea
                    className={`${inputCls} min-h-[80px] resize-y`}
                    value={draft.features.join('\n')}
                    onChange={(e) => {
                        const features = e.target.value.split('\n').map((s) => s.trim()).filter(Boolean)
                        set('features', features)
                    }}
                />
            </Field>

            {/* Image upload */}
            <div className="rounded-xl border bg-card p-4 space-y-3">
                <h3 className="font-semibold text-sm">🖼️ 商品画像</h3>
                <div className="flex gap-3 items-start">
                    <div className="flex-1">
                        <Field label="画像URL">
                            <input
                                className={inputCls}
                                value={draft.imageUrl}
                                onChange={(e) => set('imageUrl', e.target.value)}
                                placeholder="https://..."
                            />
                        </Field>
                    </div>
                    <div className="shrink-0 pt-6">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="hidden"
                            onChange={handleImageFile}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition disabled:opacity-60 whitespace-nowrap"
                        >
                            {uploading ? 'アップロード中...' : '📂 画像をアップロード'}
                        </button>
                    </div>
                </div>
                {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
                {draft.imageUrl && (
                    <img
                        src={draft.imageUrl}
                        alt="商品画像プレビュー"
                        className="mt-2 h-32 w-32 object-cover rounded-lg border"
                    />
                )}
            </div>

            {/* 3D Product Settings */}
            <div className="rounded-xl border bg-card p-4 space-y-3">
                <h3 className="font-semibold text-sm">3D商品設定</h3>
                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        className="w-4 h-4 accent-primary"
                        checked={!!draft.is3d}
                        onChange={(e) => set('is3d', e.target.checked)}
                    />
                    <span className="text-sm">3D商品（複数面のデザインアップロードが必要）</span>
                </label>
                {draft.is3d && (
                    <div className="space-y-2 mt-2">
                        <h4 className="text-xs font-semibold text-muted-foreground">画像面（Image Views）</h4>
                        {(draft.imageViews ?? []).map((view, i) => (
                            <div key={i} className="grid grid-cols-12 gap-2 items-center rounded-lg border bg-muted/20 p-2">
                                <div className="col-span-3">
                                    <label className="text-[10px] text-muted-foreground block mb-0.5">ID</label>
                                    <input
                                        type="text"
                                        className={`${smallInput} font-mono text-xs`}
                                        value={view.id}
                                        onChange={(e) => {
                                            const views = [...(draft.imageViews ?? [])]
                                            views[i] = { ...views[i], id: e.target.value }
                                            set('imageViews', views)
                                        }}
                                        placeholder="front"
                                    />
                                </div>
                                <div className="col-span-4">
                                    <label className="text-[10px] text-muted-foreground block mb-0.5">ラベル</label>
                                    <input
                                        type="text"
                                        className={smallInput}
                                        value={view.label}
                                        onChange={(e) => {
                                            const views = [...(draft.imageViews ?? [])]
                                            views[i] = { ...views[i], label: e.target.value }
                                            set('imageViews', views)
                                        }}
                                        placeholder="正面"
                                    />
                                </div>
                                <div className="col-span-3">
                                    <label className="text-[10px] text-muted-foreground block mb-0.5">必須</label>
                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="w-3.5 h-3.5 accent-primary"
                                            checked={view.required}
                                            onChange={(e) => {
                                                const views = [...(draft.imageViews ?? [])]
                                                views[i] = { ...views[i], required: e.target.checked }
                                                set('imageViews', views)
                                            }}
                                        />
                                        <span className="text-xs">必須</span>
                                    </label>
                                </div>
                                <div className="col-span-2 flex justify-end">
                                    <button
                                        onClick={() => {
                                            const views = (draft.imageViews ?? []).filter((_, idx) => idx !== i)
                                            set('imageViews', views)
                                        }}
                                        className="text-red-500 hover:text-red-700 text-xs px-2 py-1 border border-red-200 rounded hover:bg-red-50"
                                    >
                                        削除
                                    </button>
                                </div>
                            </div>
                        ))}
                        <button
                            onClick={() => {
                                const views = [...(draft.imageViews ?? []), { id: '', label: '', required: true }]
                                set('imageViews', views)
                            }}
                            className="text-xs px-3 py-1.5 border border-dashed border-border rounded-lg hover:bg-muted/50 text-muted-foreground"
                        >
                            ＋ 面を追加
                        </button>
                    </div>
                )}
            </div>

            {/* Complexity Restriction Rules */}
            <div className="rounded-xl border bg-card p-4 space-y-3">
                <h3 className="font-semibold text-sm">⚠️ 複雑度制限ルール</h3>
                <p className="text-xs text-muted-foreground">
                    デザインの複雑さと形状・サイズの組み合わせにより注文をブロックするルールを設定します。
                    型抜きや3D商品で、小さいサイズに複雑なデザインを適用できない場合に使用します。
                </p>
                {(draft.complexityRules ?? []).map((rule, idx) => (
                    <div key={rule.id} className="rounded-lg border bg-muted/20 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold">ルール {idx + 1}</span>
                            <button
                                onClick={() => {
                                    const rules = (draft.complexityRules ?? []).filter((_, i) => i !== idx)
                                    set('complexityRules', rules)
                                }}
                                className="text-red-500 hover:text-red-700 text-xs px-2 py-1 border border-red-200 rounded hover:bg-red-50"
                            >
                                削除
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[10px] text-muted-foreground block mb-0.5">ブロックする複雑度（カンマ区切り）</label>
                                <input
                                    type="text"
                                    className={smallInput}
                                    placeholder="D,E"
                                    value={rule.blockedGrades.join(',')}
                                    onChange={(e) => {
                                        const rules = [...(draft.complexityRules ?? [])]
                                        rules[idx] = { ...rules[idx], blockedGrades: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }
                                        set('complexityRules', rules)
                                    }}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-muted-foreground block mb-0.5">対象形状（空=全て、カンマ区切り）</label>
                                <input
                                    type="text"
                                    className={smallInput}
                                    placeholder="die-cut"
                                    value={(rule.shapes ?? []).join(',')}
                                    onChange={(e) => {
                                        const rules = [...(draft.complexityRules ?? [])]
                                        rules[idx] = { ...rules[idx], shapes: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }
                                        set('complexityRules', rules)
                                    }}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-muted-foreground block mb-0.5">最大サイズID（このサイズ以下でブロック、空=全サイズ）</label>
                                <input
                                    type="text"
                                    className={smallInput}
                                    placeholder="40mm"
                                    value={rule.maxSizeId ?? ''}
                                    onChange={(e) => {
                                        const rules = [...(draft.complexityRules ?? [])]
                                        rules[idx] = { ...rules[idx], maxSizeId: e.target.value || undefined }
                                        set('complexityRules', rules)
                                    }}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-muted-foreground block mb-0.5">3D商品のみ適用</label>
                                <label className="flex items-center gap-1.5 cursor-pointer mt-1">
                                    <input
                                        type="checkbox"
                                        className="w-3.5 h-3.5 accent-primary"
                                        checked={rule.applies3d ?? false}
                                        onChange={(e) => {
                                            const rules = [...(draft.complexityRules ?? [])]
                                            rules[idx] = { ...rules[idx], applies3d: e.target.checked }
                                            set('complexityRules', rules)
                                        }}
                                    />
                                    <span className="text-xs">3D商品のみ</span>
                                </label>
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] text-muted-foreground block mb-0.5">ブロック時のメッセージ</label>
                            <input
                                type="text"
                                className={smallInput}
                                placeholder="このサイズでは複雑度D以上のデザインは対応できません"
                                value={rule.message}
                                onChange={(e) => {
                                    const rules = [...(draft.complexityRules ?? [])]
                                    rules[idx] = { ...rules[idx], message: e.target.value }
                                    set('complexityRules', rules)
                                }}
                            />
                        </div>
                    </div>
                ))}
                <button
                    onClick={() => {
                        const rules = [...(draft.complexityRules ?? []), { id: crypto.randomUUID().slice(0, 8), blockedGrades: [], shapes: [], message: '' }]
                        set('complexityRules', rules)
                    }}
                    className="text-xs px-3 py-1.5 border border-dashed border-border rounded-lg hover:bg-muted/50 text-muted-foreground"
                >
                    ＋ ルールを追加
                </button>
            </div>
        </div>
    )
})

/* ------------------------------------------------------------------ */
/* Price Tiers Tab                                                      */
/* ------------------------------------------------------------------ */
const PriceTiersTab = React.memo(function PriceTiersTab({ draft, setDraft }: { draft: Product; setDraft: React.Dispatch<React.SetStateAction<Product | null>> }) {
    const setTiers = (tiers: PriceTier[]) =>
        setDraft((prev) => prev ? { ...prev, priceTiers: tiers } : prev)

    const updateTier = (index: number, field: keyof PriceTier, value: number | undefined) => {
        const next = draft.priceTiers.map((t, i) => i === index ? { ...t, [field]: value } : t)
        setTiers(next)
    }

    const addTier = () => {
        const last = draft.priceTiers[draft.priceTiers.length - 1]
        setTiers([...draft.priceTiers, {
            minQuantity: last ? last.maxQuantity + 1 : 1,
            maxQuantity: last ? last.maxQuantity + 100 : 100,
            unitPrice: last ? Math.round(last.unitPrice * 0.9) : 100,
        }])
    }

    const removeTier = (index: number) => {
        setTiers(draft.priceTiers.filter((_, i) => i !== index))
    }

    const basePrice = useMemo(() => draft.priceTiers[0]?.unitPrice ?? 1, [draft.priceTiers])

    const discounts = useMemo(() =>
        draft.priceTiers.map((tier) =>
            basePrice > tier.unitPrice ? Math.round((1 - tier.unitPrice / basePrice) * 100) : 0
        ),
        [draft.priceTiers, basePrice]
    )

    return (
        <div className="max-w-3xl">
            <p className="text-sm text-muted-foreground mb-4">数量ごとの単価を設定します。割引率は最初の段階の単価から自動計算されます。</p>

            <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b">
                        <tr>
                            <th className="text-left px-4 py-3 font-semibold">最小数量</th>
                            <th className="text-left px-4 py-3 font-semibold">最大数量</th>
                            <th className="text-left px-4 py-3 font-semibold">単価（円）</th>
                            <th className="text-left px-4 py-3 font-semibold text-green-700">割引率</th>
                            <th className="px-4 py-3"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {draft.priceTiers.map((tier, i) => (
                                <tr key={i} className="border-b last:border-0">
                                    <td className="px-4 py-2">
                                        <input type="number" className={smallInput} value={tier.minQuantity} onChange={(e) => updateTier(i, 'minQuantity', parseInt(e.target.value) || 0)} />
                                    </td>
                                    <td className="px-4 py-2">
                                        <input type="number" className={smallInput} value={tier.maxQuantity} onChange={(e) => updateTier(i, 'maxQuantity', parseInt(e.target.value) || 0)} />
                                    </td>
                                    <td className="px-4 py-2">
                                        <input type="number" className={smallInput} value={tier.unitPrice} onChange={(e) => updateTier(i, 'unitPrice', parseInt(e.target.value) || 0)} />
                                    </td>
                                    <td className="px-4 py-2 text-green-700 font-semibold">
                                        {discounts[i] > 0 ? `-${discounts[i]}%` : '—'}
                                    </td>
                                    <td className="px-4 py-2">
                                        <button onClick={() => removeTier(i)} className="text-red-500 hover:text-red-700 text-xs px-2 py-1 rounded border border-red-200 hover:bg-red-50">
                                            削除
                                        </button>
                                    </td>
                                </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <button
                onClick={addTier}
                className="mt-3 px-4 py-2 text-sm border border-dashed border-border rounded-lg hover:bg-muted/50 text-muted-foreground w-full"
            >
                + 価格帯を追加
            </button>
        </div>
    )
})

/* ------------------------------------------------------------------ */
/* Options Tab                                                          */
/* ------------------------------------------------------------------ */
const OptionsTab = React.memo(function OptionsTab({ draft, setDraft }: { draft: Product; setDraft: React.Dispatch<React.SetStateAction<Product | null>> }) {
    const setOptions = useCallback((opts: ProductOption[]) =>
        setDraft((prev) => prev ? { ...prev, options: opts } : prev), [setDraft])

    const [expandedOpt, setExpandedOpt] = useState<string | null>(null)

    const addOption = useCallback(() => {
        const newId = `option-${crypto.randomUUID()}`
        setDraft((prev) => {
            if (!prev) return prev
            return { ...prev, options: [...prev.options, { id: newId, name: '新しいオプション', type: 'list' as const, values: [] }] }
        })
        setExpandedOpt(newId)
    }, [setDraft])

    const removeOption = useCallback((optId: string) => {
        setDraft((prev) => {
            if (!prev) return prev
            return { ...prev, options: prev.options.filter((o) => o.id !== optId) }
        })
        setExpandedOpt((prev) => prev === optId ? null : prev)
    }, [setDraft])

    const updateOption = useCallback((optId: string, field: keyof ProductOption, value: any) => {
        setDraft((prev) => {
            if (!prev) return prev
            return { ...prev, options: prev.options.map((o) => o.id === optId ? { ...o, [field]: value } : o) }
        })
    }, [setDraft])

    const addValue = useCallback((optId: string) => {
        setDraft((prev) => {
            if (!prev) return prev
            return {
                ...prev, options: prev.options.map((o) => {
                    if (o.id !== optId) return o
                    const newVal: OptionValue = { id: `val-${crypto.randomUUID()}`, label: '新しい値' }
                    return { ...o, values: [...o.values, newVal] }
                })
            }
        })
    }, [setDraft])

    const removeValue = useCallback((optId: string, valId: string) => {
        setDraft((prev) => {
            if (!prev) return prev
            return {
                ...prev, options: prev.options.map((o) => {
                    if (o.id !== optId) return o
                    return { ...o, values: o.values.filter((v) => v.id !== valId) }
                })
            }
        })
    }, [setDraft])

    const updateValue = useCallback((optId: string, valId: string, field: string, value: any) => {
        setDraft((prev) => {
            if (!prev) return prev
            return {
                ...prev, options: prev.options.map((o) => {
                    if (o.id !== optId) return o
                    return {
                        ...o, values: o.values.map((v) => {
                            if (v.id !== valId) return v
                            if (field === 'label') return { ...v, label: value }
                            if (field === 'description') return { ...v, description: value || undefined }
                            if (field === 'imageUrl') return { ...v, imageUrl: value || undefined }
                            if (field === 'modType') {
                                if (!value) return { ...v, priceModifier: undefined }
                                return { ...v, priceModifier: { type: value, value: v.priceModifier?.value ?? 0 } }
                            }
                            if (field === 'modValue') {
                                return { ...v, priceModifier: { type: v.priceModifier?.type ?? 'add', value: parseFloat(value) || 0 } }
                            }
                            if (field === 'requiresMold') {
                                return { ...v, requiresMold: value, moldFee: value ? (v.moldFee ?? 0) : undefined }
                            }
                            if (field === 'moldFee') {
                                return { ...v, moldFee: parseInt(value) || 0 }
                            }
                            if (field === 'shippingModValue') {
                                const numVal = parseInt(value) || 0
                                return { ...v, shippingModifier: numVal ? { type: 'add' as const, value: numVal } : undefined }
                            }
                            if (field === 'previewColor') {
                                return { ...v, previewColor: value || undefined }
                            }
                            if (field === 'previewTexture') {
                                return { ...v, previewTexture: value || undefined }
                            }
                            if (field === 'previewOverlayUrl') {
                                if (!value) return { ...v, previewOverlay: undefined }
                                return { ...v, previewOverlay: { ...(v.previewOverlay ?? {}), imageUrl: value, position: v.previewOverlay?.position ?? 'top' } }
                            }
                            if (field === 'previewOverlayPosition') {
                                if (!v.previewOverlay) return v
                                return { ...v, previewOverlay: { ...v.previewOverlay, position: value } }
                            }
                            return v
                        })
                    }
                })
            }
        })
    }, [setDraft])

    const toggleExpanded = useCallback((optId: string) => {
        setExpandedOpt((prev) => prev === optId ? null : optId)
    }, [])

    return (
        <div className="max-w-2xl space-y-3">
            {draft.options.map((opt, optIdx) => (
                <div key={opt.id} className="rounded-xl border bg-card overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 border-b">
                        <span className="text-xs text-muted-foreground font-mono w-5">{optIdx + 1}</span>
                        <input
                            className="flex-1 text-sm font-semibold bg-transparent border-b border-transparent focus:border-primary outline-none py-0.5"
                            value={opt.name}
                            onChange={(e) => updateOption(opt.id, 'name', e.target.value)}
                            placeholder="オプション名"
                        />
                        <select
                            className="text-xs border border-border rounded px-2 py-1 bg-background"
                            value={opt.type}
                            onChange={(e) => {
                                const newType = e.target.value as ProductOption['type']
                                updateOption(opt.id, 'type', newType)
                                if (newType === 'checkbox') updateOption(opt.id, 'multiSelect', true)
                                if (newType === 'number') updateOption(opt.id, 'values', [])
                            }}
                        >
                            <option value="list">リスト (list)</option>
                            <option value="grid">グリッド (grid)</option>
                            <option value="dropdown">ドロップダウン (dropdown)</option>
                            <option value="checkbox">チェックボックス（複数選択）</option>
                            <option value="number">数値入力</option>
                            <option value="text">テキスト入力（自由記述）</option>
                            <option value="color">カラーピッカー</option>
                        </select>
                        <label className="flex items-center gap-1 text-[10px]">
                            <input
                                type="checkbox"
                                className="w-3 h-3"
                                checked={opt.required !== false}
                                onChange={(e) => updateOption(opt.id, 'required', e.target.checked)}
                            />
                            <span className={opt.required !== false ? 'text-red-600 font-medium' : 'text-muted-foreground'}>必須</span>
                        </label>
                        <button
                            onClick={() => toggleExpanded(opt.id)}
                            className="text-xs px-2 py-1 border border-border rounded hover:bg-muted"
                        >
                            {expandedOpt === opt.id ? '閉じる' : `${opt.values.length}件 ▼`}
                        </button>
                        <button onClick={() => removeOption(opt.id)} className="text-red-500 hover:text-red-700 text-xs">削除</button>
                    </div>

                    {expandedOpt === opt.id && (
                        <div className="p-4 space-y-2">
                            {/* 階層設定 */}
                            <div className="rounded-lg border bg-indigo-50/50 p-3 space-y-2 mb-3">
                                <h4 className="text-xs font-semibold text-indigo-700">階層設定（親子関係）</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] text-muted-foreground block mb-0.5">親オプション</label>
                                        <select
                                            className={`${smallInput} text-xs`}
                                            value={opt.parentId ?? ''}
                                            onChange={(e) => updateOption(opt.id, 'parentId', e.target.value || undefined)}
                                        >
                                            <option value="">なし（トップレベル）</option>
                                            {draft.options.filter(o => o.id !== opt.id && !o.parentId).map(o => (
                                                <option key={o.id} value={o.id}>{o.name} ({o.id})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-muted-foreground block mb-0.5">表示条件（親の値）</label>
                                        <input
                                            className={`${smallInput} text-xs`}
                                            value={(opt.showWhen ?? []).join(',')}
                                            onChange={(e) => updateOption(opt.id, 'showWhen', e.target.value ? e.target.value.split(',').map(s => s.trim()) : undefined)}
                                            placeholder="ball-chain,lobster"
                                            disabled={!opt.parentId}
                                        />
                                        {opt.parentId && (
                                            <p className="text-[9px] text-muted-foreground mt-0.5">
                                                親の値IDをカンマ区切りで入力（空=常に表示）
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Number type settings */}
                            {opt.type === 'number' && (
                                <div className="rounded-lg border bg-blue-50/50 p-3 space-y-2 mb-3">
                                    <h4 className="text-xs font-semibold text-blue-700">数値入力設定</h4>
                                    <div className="grid grid-cols-4 gap-2">
                                        <div>
                                            <label className="text-[10px] text-muted-foreground block mb-0.5">最小値</label>
                                            <input
                                                type="number"
                                                className={smallInput}
                                                value={opt.numberMin ?? ''}
                                                onChange={(e) => updateOption(opt.id, 'numberMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                                                placeholder="0"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-muted-foreground block mb-0.5">最大値</label>
                                            <input
                                                type="number"
                                                className={smallInput}
                                                value={opt.numberMax ?? ''}
                                                onChange={(e) => updateOption(opt.id, 'numberMax', e.target.value ? parseFloat(e.target.value) : undefined)}
                                                placeholder="1000"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-muted-foreground block mb-0.5">単位（例: mm）</label>
                                            <input
                                                type="text"
                                                className={smallInput}
                                                value={opt.numberUnit ?? ''}
                                                onChange={(e) => updateOption(opt.id, 'numberUnit', e.target.value || undefined)}
                                                placeholder="mm"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-muted-foreground block mb-0.5">1単位あたりの追加単価（円）</label>
                                            <input
                                                type="number"
                                                className={smallInput}
                                                value={opt.pricePerUnit ?? ''}
                                                onChange={(e) => updateOption(opt.id, 'pricePerUnit', e.target.value ? parseFloat(e.target.value) : undefined)}
                                                placeholder="10"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">数値入力型では選択肢（values）は使用しません。</p>
                                </div>
                            )}

                            {/* Text type settings */}
                            {opt.type === 'text' && (
                                <div className="rounded-lg border bg-purple-50/50 p-3 space-y-2 mb-3">
                                    <h4 className="text-xs font-semibold text-purple-700">テキスト入力設定</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[10px] text-muted-foreground block mb-0.5">プレースホルダー</label>
                                            <input
                                                type="text"
                                                className={smallInput}
                                                value={opt.textPlaceholder ?? ''}
                                                onChange={(e) => updateOption(opt.id, 'textPlaceholder', e.target.value || undefined)}
                                                placeholder="例: ©YourName 2026"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-muted-foreground block mb-0.5">最大文字数</label>
                                            <input
                                                type="number"
                                                className={smallInput}
                                                value={opt.textMaxLength ?? ''}
                                                onChange={(e) => updateOption(opt.id, 'textMaxLength', e.target.value ? parseInt(e.target.value) : undefined)}
                                                placeholder="80"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">テキスト入力型では選択肢（values）は使用しません。ユーザーが自由に文字入力します。</p>
                                </div>
                            )}

                            {/* Checkbox type info */}
                            {opt.type === 'checkbox' && (
                                <div className="rounded-lg border bg-green-50/50 p-3 mb-3">
                                    <p className="text-xs text-green-700">チェックボックス型: 複数選択が有効です（multiSelect = true）</p>
                                </div>
                            )}

                            {opt.type !== 'number' && opt.values.map((val) => (
                                <div key={val.id} className="rounded-lg border bg-muted/20 p-3 space-y-2">
                                    {/* Row 1: ID, Label, Price modifier */}
                                    <div className="grid grid-cols-12 gap-2 items-center">
                                        <div className="col-span-2">
                                            <label className="text-[10px] text-muted-foreground block mb-0.5">ID</label>
                                            {/* Value IDs are load-bearing (stored on orders, referenced by
                                                mold/complexity rules) and updateValue has no 'id' case, so
                                                editing here was silently discarded. Make it read-only to
                                                avoid the false impression that a rename takes effect. */}
                                            <input
                                                readOnly
                                                title="値IDは変更できません（注文・型・複雑度ルールから参照されるため）"
                                                className={`${smallInput} font-mono text-xs bg-muted/50 text-muted-foreground cursor-not-allowed`}
                                                value={val.id}
                                                placeholder="id"
                                            />
                                        </div>
                                        <div className="col-span-4">
                                            <label className="text-[10px] text-muted-foreground block mb-0.5">ラベル</label>
                                            <input
                                                className={smallInput}
                                                value={val.label}
                                                onChange={(e) => updateValue(opt.id, val.id, 'label', e.target.value)}
                                                placeholder="ラベル"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-[10px] text-muted-foreground block mb-0.5">単価加算</label>
                                            <select
                                                className={`${smallInput} text-xs`}
                                                value={val.priceModifier?.type ?? ''}
                                                onChange={(e) => updateValue(opt.id, val.id, 'modType', e.target.value || null)}
                                            >
                                                <option value="">なし</option>
                                                <option value="add">加算 (+¥)</option>
                                                <option value="multiply">加算%</option>
                                            </select>
                                        </div>
                                        <div className="col-span-2">
                                            {val.priceModifier && (
                                                <>
                                                    <label className="text-[10px] text-muted-foreground block mb-0.5">
                                                        {val.priceModifier.type === 'multiply' ? '加算%' : '値'}
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step={val.priceModifier.type === 'multiply' ? '1' : '1'}
                                                        className={smallInput}
                                                        value={val.priceModifier.type === 'multiply' ? Math.round((val.priceModifier.value - 1) * 100) : val.priceModifier.value}
                                                        onChange={(e) => {
                                                            if (val.priceModifier?.type === 'multiply') {
                                                                const pct = parseFloat(e.target.value) || 0
                                                                const multiplier = pct / 100 + 1
                                                                updateValue(opt.id, val.id, 'modValue', String(multiplier))
                                                            } else {
                                                                updateValue(opt.id, val.id, 'modValue', e.target.value)
                                                            }
                                                        }}
                                                        placeholder={val.priceModifier.type === 'multiply' ? '20' : '50'}
                                                    />
                                                </>
                                            )}
                                        </div>
                                        <div className="col-span-2 flex justify-end items-end">
                                            <button
                                                onClick={() => removeValue(opt.id, val.id)}
                                                className="text-red-500 hover:text-red-700 text-xs px-2 py-1 border border-red-200 rounded hover:bg-red-50"
                                            >
                                                削除
                                            </button>
                                        </div>
                                    </div>
                                    {/* Row 2: Image URL, Description */}
                                    <div className="grid grid-cols-12 gap-2">
                                        <div className="col-span-5">
                                            <label className="text-[10px] text-muted-foreground block mb-0.5">画像URL</label>
                                            <input
                                                className={`${smallInput} text-xs`}
                                                value={val.imageUrl ?? ''}
                                                onChange={(e) => updateValue(opt.id, val.id, 'imageUrl', e.target.value)}
                                                placeholder="https://... または /images/..."
                                            />
                                        </div>
                                        <div className="col-span-7">
                                            <label className="text-[10px] text-muted-foreground block mb-0.5">説明文（ユーザーに表示）</label>
                                            <input
                                                className={smallInput}
                                                value={val.description ?? ''}
                                                onChange={(e) => updateValue(opt.id, val.id, 'description', e.target.value)}
                                                placeholder="例：高品質な仕上がり。耐久性に優れています。"
                                            />
                                        </div>
                                    </div>
                                    {/* Row 3: Mold fee */}
                                    <div className="flex items-center gap-3 pl-1">
                                        <label className="flex items-center gap-2 cursor-pointer text-xs">
                                            <input
                                                type="checkbox"
                                                className="w-3.5 h-3.5 accent-orange-500"
                                                checked={!!val.requiresMold}
                                                onChange={(e) => updateValue(opt.id, val.id, 'requiresMold', e.target.checked)}
                                            />
                                            <span className="text-orange-700 font-medium">金型が必要</span>
                                        </label>
                                        {val.requiresMold && (
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] text-muted-foreground">型代:</span>
                                                <input
                                                    type="number"
                                                    className={`${smallInput} w-24`}
                                                    value={val.moldFee ?? 0}
                                                    onChange={(e) => updateValue(opt.id, val.id, 'moldFee', e.target.value)}
                                                    placeholder="15000"
                                                />
                                                <span className="text-[10px] text-muted-foreground">円</span>
                                            </div>
                                        )}
                                    </div>
                                    {/* Row 4: Shipping modifier */}
                                    <div className="flex items-center gap-3 pl-1">
                                        <span className="text-[10px] text-muted-foreground">送料加算額（円）:</span>
                                        <input
                                            type="number"
                                            className={`${smallInput} w-24`}
                                            value={val.shippingModifier?.value ?? ''}
                                            onChange={(e) => updateValue(opt.id, val.id, 'shippingModValue', e.target.value)}
                                            placeholder="0"
                                        />
                                        <span className="text-[10px] text-muted-foreground">円（0または空欄=影響なし）</span>
                                    </div>
                                    {/* Row 5: Preview customization */}
                                    <div className="rounded-lg bg-violet-50/50 border border-violet-200 p-2 space-y-1.5">
                                        <h5 className="text-[10px] font-semibold text-violet-700">プレビュー表示設定</h5>
                                        <div className="grid grid-cols-12 gap-2">
                                            <div className="col-span-4">
                                                <label className="text-[10px] text-muted-foreground block mb-0.5">オーバーレイ画像URL</label>
                                                <input
                                                    className={`${smallInput} text-xs`}
                                                    value={val.previewOverlay?.imageUrl ?? ''}
                                                    onChange={(e) => updateValue(opt.id, val.id, 'previewOverlayUrl', e.target.value)}
                                                    placeholder="/images/parts/chain.png"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-[10px] text-muted-foreground block mb-0.5">位置</label>
                                                <select
                                                    className={`${smallInput} text-xs`}
                                                    value={val.previewOverlay?.position ?? 'top'}
                                                    onChange={(e) => updateValue(opt.id, val.id, 'previewOverlayPosition', e.target.value)}
                                                    disabled={!val.previewOverlay}
                                                >
                                                    <option value="top">上</option>
                                                    <option value="bottom">下</option>
                                                    <option value="left">左</option>
                                                    <option value="right">右</option>
                                                    <option value="center">中央</option>
                                                    <option value="background">背景</option>
                                                </select>
                                            </div>
                                            <div className="col-span-3">
                                                <label className="text-[10px] text-muted-foreground block mb-0.5">プレビュー色</label>
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        type="color"
                                                        className="w-6 h-6 rounded cursor-pointer border border-border"
                                                        value={val.previewColor || '#999999'}
                                                        onChange={(e) => updateValue(opt.id, val.id, 'previewColor', e.target.value)}
                                                    />
                                                    <input
                                                        className={`${smallInput} text-xs flex-1`}
                                                        value={val.previewColor ?? ''}
                                                        onChange={(e) => updateValue(opt.id, val.id, 'previewColor', e.target.value)}
                                                        placeholder="#C0C0C0"
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-span-3">
                                                <label className="text-[10px] text-muted-foreground block mb-0.5">テクスチャURL</label>
                                                <input
                                                    className={`${smallInput} text-xs`}
                                                    value={val.previewTexture ?? ''}
                                                    onChange={(e) => updateValue(opt.id, val.id, 'previewTexture', e.target.value)}
                                                    placeholder="生地パターン画像"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {opt.type !== 'number' && (
                                <button
                                    onClick={() => addValue(opt.id)}
                                    className="mt-2 w-full text-xs px-3 py-2 border border-dashed border-border rounded-lg hover:bg-muted/50 text-muted-foreground"
                                >
                                    + 値を追加
                                </button>
                            )}
                        </div>
                    )}
                </div>
            ))}

            <button
                onClick={addOption}
                className="w-full text-sm px-4 py-3 border border-dashed border-border rounded-xl hover:bg-muted/50 text-muted-foreground"
            >
                + オプションを追加
            </button>
        </div>
    )
})

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                {label}{required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            {children}
        </div>
    )
}

const inputCls = 'w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary'
const smallInput = 'w-full px-2 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary'
