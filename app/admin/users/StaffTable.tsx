'use client'

import { useState, useTransition } from 'react'
import { updateUser, deleteUser } from '@/app/actions/users'

type Factory = {
    id: string
    name: string
    country: string | null
}

type Profile = {
    id: string
    name: string | null
    email: string | null
    role: string
    factory_id: string | null
    is_active: boolean
    created_at: string
    factories: unknown
}

const roleLabel: Record<string, string> = {
    admin: '管理者',
    factory: '工場',
    customer: '顧客',
}
const roleColor: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-800',
    factory: 'bg-blue-100 text-blue-800',
}

export function StaffTable({
    profiles,
    factories,
    currentUserId,
}: {
    profiles: Profile[]
    factories: Factory[]
    currentUserId: string
}) {
    const [editingUser, setEditingUser] = useState<Profile | null>(null)
    const [editName, setEditName] = useState('')
    const [editRole, setEditRole] = useState('')
    const [editFactoryId, setEditFactoryId] = useState('')
    const [editIsActive, setEditIsActive] = useState(true)
    const [editError, setEditError] = useState('')
    const [isPending, startTransition] = useTransition()

    function openEdit(p: Profile) {
        setEditingUser(p)
        setEditName(p.name ?? '')
        setEditRole(p.role)
        setEditFactoryId(p.factory_id ?? '')
        setEditIsActive(p.is_active)
        setEditError('')
    }

    function closeEdit() {
        setEditingUser(null)
        setEditError('')
    }

    function handleEditSave() {
        if (editRole === 'factory' && !editFactoryId) {
            setEditError('工場を選択してください')
            return
        }
        setEditError('')
        startTransition(async () => {
            try {
                await updateUser(editingUser!.id, {
                    name: editName,
                    role: editRole,
                    factory_id: editFactoryId || null,
                    is_active: editIsActive,
                })
                closeEdit()
            } catch (err) {
                setEditError((err as Error).message)
            }
        })
    }

    function handleDelete(userId: string, userName: string | null) {
        if (!confirm(`本当に削除しますか？\n\n${userName || 'このユーザー'} を削除します。\nこの操作は取り消せません。`)) return
        startTransition(async () => {
            try {
                await deleteUser(userId)
            } catch (err) {
                alert('削除に失敗しました: ' + (err as Error).message)
            }
        })
    }

    return (
        <>
            <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                    <tr>
                        <th scope="col" className="text-left p-4 font-semibold">名前 / メール</th>
                        <th scope="col" className="text-left p-4 font-semibold">ロール</th>
                        <th scope="col" className="text-left p-4 font-semibold">工場</th>
                        <th scope="col" className="text-left p-4 font-semibold">状態</th>
                        <th scope="col" className="text-left p-4 font-semibold">操作</th>
                    </tr>
                </thead>
                <tbody>
                    {profiles.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                スタッフが登録されていません
                            </td>
                        </tr>
                    ) : profiles.map((p) => (
                        <tr
                            key={p.id}
                            className={`border-b last:border-0 ${!p.is_active ? 'opacity-50 bg-muted/30' : 'hover:bg-muted/30'}`}
                        >
                            <td className="p-4">
                                <p className="font-medium">{p.name || '—'}</p>
                                <p className="text-xs text-muted-foreground">{p.email || '—'}</p>
                            </td>
                            <td className="p-4">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${roleColor[p.role] ?? 'bg-gray-100 text-gray-700'}`}>
                                    {roleLabel[p.role] ?? p.role}
                                </span>
                            </td>
                            <td className="p-4 text-sm text-muted-foreground">
                                {(p.factories as any)?.name ?? (p.role === 'factory' ? '⚠ 未設定' : '—')}
                            </td>
                            <td className="p-4">
                                <span className={`text-xs font-semibold ${p.is_active ? 'text-green-600' : 'text-red-500'}`}>
                                    {p.is_active ? '● 有効' : '● 無効'}
                                </span>
                            </td>
                            <td className="p-4">
                                <div className="flex gap-2 flex-wrap">
                                    <button
                                        onClick={() => openEdit(p)}
                                        disabled={isPending}
                                        className="text-xs px-2 py-1 border border-border rounded hover:bg-muted/50 transition disabled:opacity-50"
                                    >
                                        編集
                                    </button>
                                    {p.id !== currentUserId && (
                                        <button
                                            onClick={() => handleDelete(p.id, p.name)}
                                            disabled={isPending}
                                            className="text-xs px-2 py-1 border border-red-300 text-red-600 rounded hover:bg-red-50 transition disabled:opacity-50"
                                        >
                                            削除
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Edit Modal */}
            {editingUser && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                    onClick={closeEdit}
                >
                    <div
                        className="bg-background rounded-xl border shadow-lg w-full max-w-md mx-4 p-6 space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div>
                            <h3 className="text-base font-bold">ユーザーを編集</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">{editingUser.email}</p>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">名前</label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    placeholder="山田 太郎"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">ロール</label>
                                <select
                                    value={editRole}
                                    onChange={(e) => {
                                        setEditRole(e.target.value)
                                        if (e.target.value !== 'factory') setEditFactoryId('')
                                    }}
                                    disabled={editingUser.id === currentUserId}
                                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background disabled:opacity-50"
                                >
                                    <option value="admin">管理者</option>
                                    <option value="factory">工場</option>
                                    <option value="customer">顧客</option>
                                </select>
                                {editingUser.id === currentUserId && (
                                    <p className="text-xs text-muted-foreground mt-1">自分自身のロールは変更できません</p>
                                )}
                            </div>

                            {editRole === 'factory' && (
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground block mb-1.5">工場 *</label>
                                    <select
                                        value={editFactoryId}
                                        onChange={(e) => setEditFactoryId(e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                                    >
                                        <option value="">— 選択してください —</option>
                                        {factories.map((f) => (
                                            <option key={f.id} value={f.id}>{f.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="editIsActive"
                                    checked={editIsActive}
                                    onChange={(e) => setEditIsActive(e.target.checked)}
                                    disabled={editingUser.id === currentUserId}
                                    className="rounded"
                                />
                                <label htmlFor="editIsActive" className="text-sm">有効</label>
                                {editingUser.id === currentUserId && (
                                    <span className="text-xs text-muted-foreground ml-1">（自分自身は無効化できません）</span>
                                )}
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
        </>
    )
}
