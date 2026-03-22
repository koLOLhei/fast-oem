'use client'

import { useState, useTransition } from 'react'
import { createFactory, updateFactory, deleteFactory } from '@/app/actions/factories'

type Factory = {
    id: string
    name: string
    country: string | null
    contact_email: string | null
    contact_name: string | null
    contact_phone: string | null
    address: string | null
    max_capacity: number | null
    is_active: boolean
    created_at: string
    profiles: { id: string }[]
}

const COUNTRY_LABELS: Record<string, string> = {
    China: '中国',
    Vietnam: 'ベトナム',
    Japan: '日本',
    Other: 'その他',
}

export function FactoriesClient({ factories }: { factories: Factory[] }) {
    const [editingFactory, setEditingFactory] = useState<Factory | null>(null)
    const [editError, setEditError] = useState('')
    const [createError, setCreateError] = useState('')
    const [isPending, startTransition] = useTransition()

    // Edit form state
    const [editName, setEditName] = useState('')
    const [editCountry, setEditCountry] = useState('')
    const [editContactEmail, setEditContactEmail] = useState('')
    const [editContactName, setEditContactName] = useState('')
    const [editContactPhone, setEditContactPhone] = useState('')
    const [editAddress, setEditAddress] = useState('')
    const [editMaxCapacity, setEditMaxCapacity] = useState('')
    const [editIsActive, setEditIsActive] = useState(true)

    function openEdit(f: Factory) {
        setEditingFactory(f)
        setEditName(f.name)
        setEditCountry(f.country ?? '')
        setEditContactEmail(f.contact_email ?? '')
        setEditContactName(f.contact_name ?? '')
        setEditContactPhone(f.contact_phone ?? '')
        setEditAddress(f.address ?? '')
        setEditMaxCapacity(f.max_capacity != null ? String(f.max_capacity) : '')
        setEditIsActive(f.is_active)
        setEditError('')
    }

    function closeEdit() {
        setEditingFactory(null)
        setEditError('')
    }

    function handleEditSave() {
        if (!editName.trim()) {
            setEditError('工場名は必須です')
            return
        }
        setEditError('')
        startTransition(async () => {
            try {
                const fd = new FormData()
                fd.set('name', editName)
                fd.set('country', editCountry)
                fd.set('contact_email', editContactEmail)
                fd.set('contact_name', editContactName)
                fd.set('contact_phone', editContactPhone)
                fd.set('address', editAddress)
                fd.set('max_capacity', editMaxCapacity)
                fd.set('is_active', String(editIsActive))
                await updateFactory(editingFactory!.id, fd)
                closeEdit()
            } catch (err) {
                setEditError((err as Error).message)
            }
        })
    }

    function handleDelete(factory: Factory) {
        if (!confirm(`本当に削除しますか？\n\n「${factory.name}」を削除します。\nこの操作は取り消せません。`)) return
        startTransition(async () => {
            try {
                await deleteFactory(factory.id)
            } catch (err) {
                alert('削除に失敗しました: ' + (err as Error).message)
            }
        })
    }

    function handleCreate(fd: FormData) {
        setCreateError('')
        startTransition(async () => {
            try {
                await createFactory(fd)
            } catch (err) {
                setCreateError((err as Error).message)
            }
        })
    }

    return (
        <div className="space-y-8 max-w-4xl">
            <h2 className="text-2xl font-bold">工場管理</h2>

            {/* Factories List */}
            <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b">
                        <tr>
                            <th scope="col" className="text-left p-4 font-semibold">工場名</th>
                            <th scope="col" className="text-left p-4 font-semibold">国</th>
                            <th scope="col" className="text-left p-4 font-semibold">連絡先</th>
                            <th scope="col" className="text-left p-4 font-semibold">担当ユーザー数</th>
                            <th scope="col" className="text-left p-4 font-semibold">状態</th>
                            <th scope="col" className="text-left p-4 font-semibold">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {factories.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                    工場が登録されていません。下のフォームから追加してください。
                                </td>
                            </tr>
                        ) : factories.map((f) => (
                            <tr
                                key={f.id}
                                className={`border-b last:border-0 transition-colors ${f.is_active ? 'hover:bg-muted/30' : 'opacity-50 bg-muted/30'}`}
                            >
                                <td className="p-4 font-medium">
                                    {f.name}
                                    {f.max_capacity && (
                                        <span className="ml-2 text-xs text-muted-foreground">（最大{f.max_capacity}個）</span>
                                    )}
                                </td>
                                <td className="p-4 text-muted-foreground">
                                    {f.country ? (COUNTRY_LABELS[f.country] ?? f.country) : '—'}
                                </td>
                                <td className="p-4 text-muted-foreground">
                                    <div>{f.contact_name ?? '—'}</div>
                                    {f.contact_email && (
                                        <div className="text-xs">{f.contact_email}</div>
                                    )}
                                    {f.contact_phone && (
                                        <div className="text-xs">{f.contact_phone}</div>
                                    )}
                                </td>
                                <td className="p-4">{(f.profiles as any[])?.length ?? 0}名</td>
                                <td className="p-4">
                                    <span className={`text-xs font-semibold ${f.is_active ? 'text-green-600' : 'text-red-500'}`}>
                                        {f.is_active ? '● 有効' : '● 無効'}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => openEdit(f)}
                                            disabled={isPending}
                                            className="text-xs px-2 py-1 border border-border rounded hover:bg-muted/50 transition disabled:opacity-50"
                                        >
                                            編集
                                        </button>
                                        <button
                                            onClick={() => handleDelete(f)}
                                            disabled={isPending}
                                            className="text-xs px-2 py-1 border border-red-300 text-red-600 rounded hover:bg-red-50 transition disabled:opacity-50"
                                        >
                                            削除
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add Factory Form */}
            <div className="rounded-xl border bg-card p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-4">新規工場を登録</h3>
                {createError && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 mb-4">
                        {createError}
                    </p>
                )}
                <form action={handleCreate} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium block mb-1" htmlFor="name">工場名 *</label>
                            <input
                                id="name"
                                name="name"
                                required
                                placeholder="例: 上海ABC工場"
                                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium block mb-1" htmlFor="country">国</label>
                            <select
                                id="country"
                                name="country"
                                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                            >
                                <option value="">-- 選択してください --</option>
                                <option value="China">中国</option>
                                <option value="Vietnam">ベトナム</option>
                                <option value="Japan">日本</option>
                                <option value="Other">その他</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium block mb-1" htmlFor="contact_email">連絡先メール</label>
                            <input
                                id="contact_email"
                                name="contact_email"
                                type="email"
                                placeholder="factory@example.com"
                                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium block mb-1" htmlFor="contact_name">担当者名</label>
                            <input
                                id="contact_name"
                                name="contact_name"
                                placeholder="李 明"
                                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={isPending}
                        className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition disabled:opacity-50"
                    >
                        工場を登録する
                    </button>
                </form>
            </div>

            {/* Edit Modal */}
            {editingFactory && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                    onClick={closeEdit}
                >
                    <div
                        className="bg-background rounded-xl border shadow-lg w-full max-w-lg mx-4 p-6 space-y-4 max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div>
                            <h3 className="text-base font-bold">工場を編集</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">{editingFactory.name}</p>
                        </div>

                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground block mb-1.5">工場名 *</label>
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        placeholder="上海ABC工場"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground block mb-1.5">国</label>
                                    <select
                                        value={editCountry}
                                        onChange={(e) => setEditCountry(e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                                    >
                                        <option value="">-- 選択 --</option>
                                        <option value="China">中国</option>
                                        <option value="Vietnam">ベトナム</option>
                                        <option value="Japan">日本</option>
                                        <option value="Other">その他</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground block mb-1.5">担当者名</label>
                                    <input
                                        type="text"
                                        value={editContactName}
                                        onChange={(e) => setEditContactName(e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        placeholder="李 明"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground block mb-1.5">電話番号</label>
                                    <input
                                        type="text"
                                        value={editContactPhone}
                                        onChange={(e) => setEditContactPhone(e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        placeholder="+86 21 1234 5678"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">連絡先メール</label>
                                <input
                                    type="email"
                                    value={editContactEmail}
                                    onChange={(e) => setEditContactEmail(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    placeholder="factory@example.com"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">住所</label>
                                <input
                                    type="text"
                                    value={editAddress}
                                    onChange={(e) => setEditAddress(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    placeholder="上海市浦東新区 ..."
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">最大生産能力（個/月）</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={editMaxCapacity}
                                    onChange={(e) => setEditMaxCapacity(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    placeholder="10000"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="editIsActive"
                                    checked={editIsActive}
                                    onChange={(e) => setEditIsActive(e.target.checked)}
                                    className="rounded"
                                />
                                <label htmlFor="editIsActive" className="text-sm">有効</label>
                            </div>
                        </div>

                        {editError && (
                            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                                {editError}
                            </p>
                        )}

                        <div className="flex gap-2 justify-end pt-2">
                            <button
                                onClick={closeEdit}
                                disabled={isPending}
                                className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted/50 transition disabled:opacity-50"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleEditSave}
                                disabled={isPending}
                                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
                            >
                                {isPending ? '保存中...' : '保存'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
