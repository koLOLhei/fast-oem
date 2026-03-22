'use client'

import { useRef, useState, useTransition } from 'react'
import { type Product, type PriceTier, type ProductOption, type OptionValue } from '@/lib/products'
import { updateProduct, toggleProductActive, createProduct, applyGlobalPriceAdjustment, uploadProductImage } from '@/app/actions/products'

interface Factory {
    id: string
    name: string
}

interface ProductsClientProps {
    initialProducts: Product[]
    factories: Factory[]
}

type Tab = 'basic' | 'price' | 'options'

const slugify = (s: string) =>
    s.toLowerCase().trim().replace(/[^a-z0-9ぁ-んァ-ヶ一-龥]+/g, '-').replace(/^-|-$/g, '') || `product-${crypto.randomUUID().slice(0, 8)}`

export function ProductsClient({ initialProducts, factories }: ProductsClientProps) {
    const [products, setProducts] = useState(initialProducts)
    const [selected, setSelected] = useState<Product | null>(null)
    const [tab, setTab] = useState<Tab>('basic')
    const [saving, startSave] = useTransition()
    const [saveMsg, setSaveMsg] = useState('')

    // New product creation state
    const [showCreate, setShowCreate] = useState(false)
    const [newName, setNewName] = useState('')
    const [newCategory, setNewCategory] = useState('other')
    const [creating, startCreate] = useTransition()
    const [createError, setCreateError] = useState('')

    // Global price adjustment state
    const [adjPercent, setAdjPercent] = useState('')
    const [adjMsg, setAdjMsg] = useState('')
    const [adjPending, startAdj] = useTransition()

    // Editable draft of the selected product
    const [draft, setDraft] = useState<Product | null>(null)

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
                    notificationEmail: (draft as any).notificationEmail ?? '',
                    defaultFactoryId: (draft as any).defaultFactoryId ?? null,
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
        setCreateError('')
        startCreate(async () => {
            try {
                const id = crypto.randomUUID()
                const slug = slugify(newName)
                const newProduct: Omit<Product, 'id'> & { id: string } = {
                    id, slug,
                    name: newName.trim(),
                    shortDescription: '',
                    description: '',
                    category: newCategory,
                    imageUrl: '',
                    features: [],
                    quantityPresets: [10, 30, 50, 100],
                    priceTiers: [{ minQuantity: 1, maxQuantity: 100, unitPrice: 1000 }],
                    options: [],
                    minQuantity: 1,
                    maxQuantity: 10000,
                    requiresMold: false,
                    moldFee: 0,
                    leadTimeDays: 14,
                    expressDeliveryFee: 0,
                }
                await createProduct(newProduct)
                const created = { ...newProduct, isActive: true } as any
                setProducts((prev) => [created, ...prev])
                setNewName('')
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
                setAdjMsg('✅ 全商品の価格を更新しました。ページを更新すると反映されます。')
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
                                    className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${(p as any).isActive !== false
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-gray-100 text-gray-500'
                                        }`}
                                >
                                    {(p as any).isActive !== false ? '公開中' : '非表示'}
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
                                {(p as any).isActive !== false ? '非表示にする' : '公開する'}
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
                                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${(draft as any).isActive !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                        {(draft as any).isActive !== false ? '公開中' : '非表示'}
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
                                        {(selected as any)?.isActive !== false ? '非表示にする' : '公開する'}
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="px-5 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition disabled:opacity-60"
                                    >
                                        {saving ? '保存中...' : '変更を保存'}
                                    </button>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="flex gap-1 bg-muted rounded-lg p-1 mb-6 w-fit">
                                {(['basic', 'price', 'options'] as Tab[]).map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setTab(t)}
                                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${tab === t ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        {t === 'basic' ? '基本情報' : t === 'price' ? '価格テーブル' : 'オプション'}
                                    </button>
                                ))}
                            </div>

                            {tab === 'basic' && <BasicTab draft={draft} setDraft={setDraft} factories={factories} />}
                            {tab === 'price' && <PriceTiersTab draft={draft} setDraft={setDraft} />}
                            {tab === 'options' && <OptionsTab draft={draft} setDraft={setDraft} />}
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
function CreateForm({
    newName, setNewName, newCategory, setNewCategory,
    createError, creating, onSubmit, onCancel,
}: {
    newName: string; setNewName: (s: string) => void
    newCategory: string; setNewCategory: (s: string) => void
    createError: string; creating: boolean
    onSubmit: () => void; onCancel: () => void
}) {
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
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">カテゴリ</label>
                    <select className={inputCls} value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
                        <option value="keychain">キーホルダー (keychain)</option>
                        <option value="badge">バッジ (badge)</option>
                        <option value="packaging">パッケージ (packaging)</option>
                        <option value="other">その他 (other)</option>
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
}

/* ------------------------------------------------------------------ */
/* Basic Info Tab                                                       */
/* ------------------------------------------------------------------ */
function BasicTab({ draft, setDraft, factories }: { draft: Product; setDraft: React.Dispatch<React.SetStateAction<Product | null>>; factories: Factory[] }) {
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

    return (
        <div className="space-y-6 max-w-2xl">
            <div className="grid grid-cols-2 gap-4">
                <Field label="商品名" required>
                    <input className={inputCls} value={draft.name} onChange={(e) => set('name', e.target.value)} />
                </Field>
                <Field label="カテゴリ">
                    <select className={inputCls} value={draft.category} onChange={(e) => set('category', e.target.value)}>
                        <option value="keychain">キーホルダー (keychain)</option>
                        <option value="badge">バッジ (badge)</option>
                        <option value="packaging">パッケージ (packaging)</option>
                        <option value="other">その他 (other)</option>
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
                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        className="w-4 h-4 accent-primary"
                        checked={!!draft.requiresMold}
                        onChange={(e) => set('requiresMold', e.target.checked)}
                    />
                    <span className="text-sm">金型が必要な商品（初回注文時に型代が発生）</span>
                </label>
                {draft.requiresMold && (
                    <Field label="型代（円・税込）">
                        <input
                            type="number"
                            className={inputCls}
                            value={draft.moldFee ?? 0}
                            onChange={(e) => set('moldFee', parseInt(e.target.value) || 0)}
                        />
                    </Field>
                )}
            </div>

            <div className="rounded-xl border bg-card p-4 space-y-3">
                <h3 className="font-semibold text-sm">⚡ 特急納期設定</h3>
                <p className="text-xs text-muted-foreground">通常2週間〜1ヶ月のところ、約10日以内でお届けする特急オプションの追加料金です。0円に設定すると特急オプションは非表示になります。</p>
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
                <h3 className="font-semibold text-sm">🏭 自動工場割り当て</h3>
                <p className="text-xs text-muted-foreground">
                    注文確定時にこの商品の注文明細を自動的に指定工場へ割り当てます。
                </p>
                <Field label="デフォルト担当工場">
                    <select
                        className={inputCls}
                        value={(draft as any).defaultFactoryId ?? ''}
                        onChange={(e) => set('defaultFactoryId' as any, e.target.value || null)}
                    >
                        <option value="">— 未設定（手動割り当て）</option>
                        {factories.map((f) => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                    </select>
                </Field>
            </div>

            <div className="rounded-xl border bg-card p-4 space-y-3">
                <h3 className="font-semibold text-sm">📧 工場発注メール</h3>
                <p className="text-xs text-muted-foreground">
                    この商品の注文が入った際に発注メールを送る宛先です。カンマ区切りで複数指定可。
                </p>
                <Field label="工場発注メールアドレス">
                    <input
                        type="text"
                        className={inputCls}
                        value={(draft as any).notificationEmail ?? ''}
                        placeholder="例: factory@example.com, ops@factory.cn"
                        onChange={(e) => set('notificationEmail' as any, e.target.value)}
                    />
                </Field>
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
        </div>
    )
}

/* ------------------------------------------------------------------ */
/* Price Tiers Tab                                                      */
/* ------------------------------------------------------------------ */
function PriceTiersTab({ draft, setDraft }: { draft: Product; setDraft: React.Dispatch<React.SetStateAction<Product | null>> }) {
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

    const basePrice = draft.priceTiers[0]?.unitPrice ?? 1

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
                        {draft.priceTiers.map((tier, i) => {
                            const discount = basePrice > tier.unitPrice
                                ? Math.round((1 - tier.unitPrice / basePrice) * 100)
                                : 0
                            return (
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
                                        {discount > 0 ? `-${discount}%` : '—'}
                                    </td>
                                    <td className="px-4 py-2">
                                        <button onClick={() => removeTier(i)} className="text-red-500 hover:text-red-700 text-xs px-2 py-1 rounded border border-red-200 hover:bg-red-50">
                                            削除
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
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
}

/* ------------------------------------------------------------------ */
/* Options Tab                                                          */
/* ------------------------------------------------------------------ */
function OptionsTab({ draft, setDraft }: { draft: Product; setDraft: React.Dispatch<React.SetStateAction<Product | null>> }) {
    const setOptions = (opts: ProductOption[]) =>
        setDraft((prev) => prev ? { ...prev, options: opts } : prev)

    const [expandedOpt, setExpandedOpt] = useState<string | null>(null)

    const addOption = () => {
        const newId = `option-${crypto.randomUUID()}`
        setOptions([...draft.options, { id: newId, name: '新しいオプション', type: 'list', values: [] }])
        setExpandedOpt(newId)
    }

    const removeOption = (optId: string) => {
        setOptions(draft.options.filter((o) => o.id !== optId))
        if (expandedOpt === optId) setExpandedOpt(null)
    }

    const updateOption = (optId: string, field: keyof ProductOption, value: any) => {
        setOptions(draft.options.map((o) => o.id === optId ? { ...o, [field]: value } : o))
    }

    const addValue = (optId: string) => {
        setOptions(draft.options.map((o) => {
            if (o.id !== optId) return o
            const newVal: OptionValue = { id: `val-${crypto.randomUUID()}`, label: '新しい値' }
            return { ...o, values: [...o.values, newVal] }
        }))
    }

    const removeValue = (optId: string, valId: string) => {
        setOptions(draft.options.map((o) => {
            if (o.id !== optId) return o
            return { ...o, values: o.values.filter((v) => v.id !== valId) }
        }))
    }

    const updateValue = (optId: string, valId: string, field: string, value: any) => {
        setOptions(draft.options.map((o) => {
            if (o.id !== optId) return o
            return {
                ...o, values: o.values.map((v) => {
                    if (v.id !== valId) return v
                    if (field === 'label') return { ...v, label: value }
                    if (field === 'modType') {
                        if (!value) return { ...v, priceModifier: undefined }
                        return { ...v, priceModifier: { type: value, value: v.priceModifier?.value ?? 0 } }
                    }
                    if (field === 'modValue') {
                        return { ...v, priceModifier: { type: v.priceModifier?.type ?? 'add', value: parseFloat(value) || 0 } }
                    }
                    return v
                })
            }
        }))
    }

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
                            onChange={(e) => updateOption(opt.id, 'type', e.target.value as any)}
                        >
                            <option value="list">リスト (list)</option>
                            <option value="grid">グリッド (grid)</option>
                            <option value="dropdown">ドロップダウン (dropdown)</option>
                        </select>
                        <button
                            onClick={() => setExpandedOpt(expandedOpt === opt.id ? null : opt.id)}
                            className="text-xs px-2 py-1 border border-border rounded hover:bg-muted"
                        >
                            {expandedOpt === opt.id ? '閉じる' : `${opt.values.length}件 ▼`}
                        </button>
                        <button onClick={() => removeOption(opt.id)} className="text-red-500 hover:text-red-700 text-xs">削除</button>
                    </div>

                    {expandedOpt === opt.id && (
                        <div className="p-4 space-y-2">
                            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground px-1 mb-1">
                                <span className="col-span-1">ID</span>
                                <span className="col-span-4">ラベル</span>
                                <span className="col-span-2">価格修正</span>
                                <span className="col-span-2">値</span>
                                <span className="col-span-3"></span>
                            </div>
                            {opt.values.map((val) => (
                                <div key={val.id} className="grid grid-cols-12 gap-2 items-center">
                                    <div className="col-span-1">
                                        <input
                                            className={`${smallInput} font-mono text-xs`}
                                            value={val.id}
                                            onChange={(e) => updateValue(opt.id, val.id, 'id', e.target.value)}
                                            placeholder="id"
                                        />
                                    </div>
                                    <div className="col-span-4">
                                        <input
                                            className={smallInput}
                                            value={val.label}
                                            onChange={(e) => updateValue(opt.id, val.id, 'label', e.target.value)}
                                            placeholder="ラベル"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <select
                                            className={`${smallInput} text-xs`}
                                            value={val.priceModifier?.type ?? ''}
                                            onChange={(e) => updateValue(opt.id, val.id, 'modType', e.target.value || null)}
                                        >
                                            <option value="">なし</option>
                                            <option value="add">加算 (+¥)</option>
                                            <option value="multiply">乗算 (×)</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        {val.priceModifier && (
                                            <input
                                                type="number"
                                                step={val.priceModifier.type === 'multiply' ? '0.01' : '1'}
                                                className={smallInput}
                                                value={val.priceModifier.value}
                                                onChange={(e) => updateValue(opt.id, val.id, 'modValue', e.target.value)}
                                                placeholder={val.priceModifier.type === 'multiply' ? '1.2' : '50'}
                                            />
                                        )}
                                    </div>
                                    <div className="col-span-3 flex justify-end">
                                        <button
                                            onClick={() => removeValue(opt.id, val.id)}
                                            className="text-red-500 hover:text-red-700 text-xs px-2 py-1 border border-red-200 rounded hover:bg-red-50"
                                        >
                                            削除
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <button
                                onClick={() => addValue(opt.id)}
                                className="mt-2 w-full text-xs px-3 py-2 border border-dashed border-border rounded-lg hover:bg-muted/50 text-muted-foreground"
                            >
                                + 値を追加
                            </button>
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
}

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
