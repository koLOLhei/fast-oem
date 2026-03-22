import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { inviteStaffUser, updateUserRole, setUserActive, cancelInvitation } from '@/app/actions/users'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
    // Auth + role already enforced by layout. We still need user.id for the "isSelf" check.
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const service = createServiceClient()

    // Fetch all three lists in parallel
    const [
        { data: staffProfiles },
        { data: pendingInvites },
        { data: factories },
    ] = await Promise.all([
        service
            .from('profiles')
            .select('id, name, email, role, factory_id, is_active, created_at, factories(name)')
            .in('role', ['admin', 'factory'])
            .order('created_at', { ascending: false }),
        service
            .from('staff_invitations')
            .select('id, email, role, factory_id, created_at, factories(name)')
            .is('used_at', null)
            .order('created_at', { ascending: false }),
        service
            .from('factories')
            .select('id, name, country')
            .order('name'),
    ])

    const roleLabel: Record<string, string> = {
        admin: '管理者',
        factory: '工場',
        customer: '顧客',
    }
    const roleColor: Record<string, string> = {
        admin: 'bg-purple-100 text-purple-800',
        factory: 'bg-blue-100 text-blue-800',
    }

    return (
        <div className="space-y-8 max-w-5xl">
            <div>
                <h2 className="text-2xl font-bold">ユーザー管理</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    管理者・工場アカウントの招待・権限変更・無効化を行います。
                </p>
            </div>

            {/* ── Pending Invitations ──────────────────────────────── */}
            {(pendingInvites ?? []).length > 0 && (
                <div className="rounded-xl border border-yellow-200 bg-yellow-50/50 p-6 shadow-sm">
                    <h3 className="text-base font-bold text-yellow-900 mb-4">
                        📨 招待済み（未承認） — {pendingInvites!.length}件
                    </h3>
                    <div className="space-y-2">
                        {pendingInvites!.map((inv) => (
                            <div key={inv.id} className="flex items-center gap-4 bg-white rounded-lg border border-yellow-200 px-4 py-3">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{inv.email}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {roleLabel[inv.role]}
                                        {(inv.factories as any)?.name && ` — ${(inv.factories as any).name}`}
                                        　招待日: {new Date(inv.created_at).toLocaleDateString('ja-JP')}
                                    </p>
                                </div>
                                <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-bold ${roleColor[inv.role]}`}>
                                    {roleLabel[inv.role]}
                                </span>
                                <form>
                                    <input type="hidden" name="invitationId" value={inv.id} />
                                    <CancelInviteButton />
                                </form>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Staff Users List ─────────────────────────────────── */}
            <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
                <div className="p-5 border-b">
                    <h3 className="font-bold text-base">スタッフ一覧</h3>
                </div>
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
                        {(staffProfiles ?? []).length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                    スタッフが登録されていません
                                </td>
                            </tr>
                        ) : (staffProfiles ?? []).map((p) => (
                            <tr key={p.id} className={`border-b last:border-0 ${!p.is_active ? 'opacity-50 bg-muted/30' : 'hover:bg-muted/30'}`}>
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
                                        {/* Role/factory edit form */}
                                        <form className="flex gap-1 items-center">
                                            <input type="hidden" name="userId" value={p.id} />
                                            <select
                                                name="role"
                                                defaultValue={p.role}
                                                className="text-xs border border-border rounded px-2 py-1 bg-background"
                                            >
                                                <option value="admin">管理者</option>
                                                <option value="factory">工場</option>
                                                <option value="customer">顧客</option>
                                            </select>
                                            <select
                                                name="factory_id"
                                                defaultValue={p.factory_id ?? ''}
                                                className="text-xs border border-border rounded px-2 py-1 bg-background"
                                            >
                                                <option value="">工場なし</option>
                                                {(factories ?? []).map((f) => (
                                                    <option key={f.id} value={f.id}>{f.name}</option>
                                                ))}
                                            </select>
                                            <UpdateRoleButton />
                                        </form>
                                        {/* Active toggle */}
                                        <form>
                                            <input type="hidden" name="userId" value={p.id} />
                                            <input type="hidden" name="isActive" value={p.is_active ? 'false' : 'true'} />
                                            <ToggleActiveButton isActive={p.is_active} isSelf={p.id === user?.id} />
                                        </form>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* ── Invite New Staff ─────────────────────────────────── */}
            <div className="rounded-xl border bg-card p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-1">新規スタッフを招待</h3>
                <p className="text-sm text-muted-foreground mb-5">
                    招待メールが送信されます。受信者がリンクをクリックしてパスワードを設定すると、指定したロールで自動的にアカウントが作成されます。
                </p>
                <form action={inviteStaffUser} className="space-y-4 max-w-lg">
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
                                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                            >
                                <option value="">— 選択 —</option>
                                <option value="admin">管理者</option>
                                <option value="factory">工場</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">工場（工場ロールの場合）</label>
                            <select
                                name="factory_id"
                                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                            >
                                <option value="">— なし —</option>
                                {(factories ?? []).map((f) => (
                                    <option key={f.id} value={f.id}>{f.name} ({f.country})</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <button
                        type="submit"
                        className="px-5 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition"
                    >
                        📨 招待メールを送信する
                    </button>
                </form>
            </div>

            {/* ── How It Works ────────────────────────────────────── */}
            <div className="rounded-xl border bg-muted/30 p-5 text-sm text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground mb-2">📋 招待フローの説明</p>
                <p>① 上のフォームでメールアドレス・ロール・工場を指定して「招待メールを送信」</p>
                <p>② 受信者に招待メールが届く → リンクをクリックしてパスワードを設定</p>
                <p>③ 登録完了後、自動的に指定したロール（管理者/工場）でアカウントが作成される</p>
                <p>④ 管理者 → <code className="bg-muted px-1 rounded">/admin</code>、工場 → <code className="bg-muted px-1 rounded">/factory</code> にログイン後リダイレクト</p>
            </div>
        </div>
    )
}

/* ── Server Action Buttons ─────────────────────────────────────────────── */

function UpdateRoleButton() {
    return (
        <button
            type="submit"
            formAction={async (fd: FormData) => {
                'use server'
                const userId = fd.get('userId') as string
                const role = fd.get('role') as string
                const factoryId = (fd.get('factory_id') as string) || null
                const { updateUserRole } = await import('@/app/actions/users')
                await updateUserRole(userId, role, factoryId)
            }}
            className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition"
        >
            変更
        </button>
    )
}

function ToggleActiveButton({ isActive, isSelf }: { isActive: boolean; isSelf: boolean }) {
    if (isSelf) return null // Cannot deactivate yourself
    return (
        <button
            type="submit"
            formAction={async (fd: FormData) => {
                'use server'
                const userId = fd.get('userId') as string
                const next = fd.get('isActive') === 'true'
                const { setUserActive } = await import('@/app/actions/users')
                await setUserActive(userId, next)
            }}
            className={`text-xs px-2 py-1 rounded border transition ${
                isActive
                    ? 'border-red-300 text-red-600 hover:bg-red-50'
                    : 'border-green-300 text-green-600 hover:bg-green-50'
            }`}
        >
            {isActive ? '無効化' : '有効化'}
        </button>
    )
}

function CancelInviteButton() {
    return (
        <button
            type="submit"
            formAction={async (fd: FormData) => {
                'use server'
                const invitationId = fd.get('invitationId') as string
                const { cancelInvitation } = await import('@/app/actions/users')
                await cancelInvitation(invitationId)
            }}
            className="text-xs px-2 py-1 border border-red-300 text-red-600 rounded hover:bg-red-50 transition"
        >
            キャンセル
        </button>
    )
}
