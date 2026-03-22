'use client'

import { useRef, useState } from 'react'
import { inviteStaffUser } from '@/app/actions/users'

type Factory = {
    id: string
    name: string
    country: string | null
}

export function InviteForm({
    factories,
    currentUserRole,
}: {
    factories: Factory[]
    currentUserRole: string
}) {
    const formRef = useRef<HTMLFormElement>(null)
    const [selectedRole, setSelectedRole] = useState('')
    const [factoryError, setFactoryError] = useState('')
    const [serverError, setServerError] = useState('')
    const [success, setSuccess] = useState(false)
    const [pending, setPending] = useState(false)

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        const role = fd.get('role') as string
        const factoryId = fd.get('factory_id') as string

        // Client-side validation: factory is required for factory role
        if (role === 'factory' && !factoryId) {
            setFactoryError('工場を選択してください')
            return
        }

        setFactoryError('')
        setServerError('')
        setSuccess(false)
        setPending(true)

        try {
            await inviteStaffUser(fd)
            setSuccess(true)
            setSelectedRole('')
            formRef.current?.reset()
        } catch (err) {
            setServerError((err as Error).message)
        } finally {
            setPending(false)
        }
    }

    return (
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 max-w-lg">
            {success && (
                <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
                    招待メールを送信しました。
                </p>
            )}
            {serverError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                    {serverError}
                </p>
            )}

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1.5">メールアドレス *</label>
                    <input
                        name="email"
                        type="email"
                        required
                        placeholder="user@example.com"
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                </div>
                <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1.5">表示名</label>
                    <input
                        name="name"
                        type="text"
                        placeholder="山田 太郎"
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1.5">ロール *</label>
                    <select
                        name="role"
                        required
                        value={selectedRole}
                        onChange={(e) => {
                            setSelectedRole(e.target.value)
                            setFactoryError('')
                        }}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                    >
                        <option value="">— 選択 —</option>
                        {currentUserRole === 'super_admin' && (
                            <option value="super_admin">スーパー管理者</option>
                        )}
                        <option value="admin">管理者</option>
                        <option value="factory">工場</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                        工場{selectedRole === 'factory' ? ' *' : '（工場ロールの場合）'}
                    </label>
                    <select
                        name="factory_id"
                        onChange={() => setFactoryError('')}
                        className={`w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 ${
                            factoryError
                                ? 'border-red-400 focus:ring-red-200'
                                : 'border-border focus:ring-primary/20'
                        }`}
                    >
                        <option value="">— なし —</option>
                        {factories.map((f) => (
                            <option key={f.id} value={f.id}>{f.name} ({f.country})</option>
                        ))}
                    </select>
                    {factoryError && (
                        <p className="text-xs text-red-600 mt-1">{factoryError}</p>
                    )}
                </div>
            </div>

            <button
                type="submit"
                disabled={pending}
                className="px-5 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
            >
                {pending ? '送信中...' : '📨 招待メールを送信する'}
            </button>
        </form>
    )
}
