import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/status-labels'
import { StaffTable } from './StaffTable'
import { InviteForm } from './InviteForm'
import { SubmitButton } from '@/components/submit-button'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
    // Auth + role already enforced by layout. We still need user.id for the "isSelf" check.
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const service = createServiceClient()

    // Fetch all data in parallel — wrapped in try/catch so a DB error
    // shows a graceful message instead of crashing the page.
    let currentUserRole = 'admin'
    let staffProfiles: any[] = []
    let pendingInvites: any[] = []
    let factories: any[] = []

    try {
        const [selfProfileResult, profilesResult, invitesResult, factoriesResult] = await Promise.all([
            service.from('profiles').select('role').eq('id', user?.id ?? '').single(),
            service
                .from('profiles')
                .select('id, name, email, role, factory_id, is_active, created_at, factories(name)')
                .in('role', ['super_admin', 'admin', 'factory'])
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
        if (selfProfileResult.data?.role) currentUserRole = selfProfileResult.data.role
        staffProfiles = profilesResult.data ?? []
        pendingInvites = invitesResult.data ?? []
        factories = factoriesResult.data ?? []
    } catch (err) {
        console.error('[UsersPage] Failed to fetch data:', err)
    }

    const roleLabel = ROLE_LABELS
    const roleColor = ROLE_COLORS

    return (
        <div className="space-y-8 max-w-5xl">
            <div>
                <h2 className="text-2xl font-bold">ユーザー管理</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    管理者・工場アカウントの招待・権限変更・無効化を行います。
                </p>
            </div>

            {/* ── Pending Invitations ──────────────────────────────── */}
            {pendingInvites.length > 0 && (
                <div className="rounded-xl border border-yellow-200 bg-yellow-50/50 p-6 shadow-sm">
                    <h3 className="text-base font-bold text-yellow-900 mb-4">
                        📨 招待済み（未承認） — {pendingInvites.length}件
                    </h3>
                    <div className="space-y-2">
                        {pendingInvites.map((inv) => (
                            <div key={inv.id} className="flex items-center gap-4 bg-white rounded-lg border border-yellow-200 px-4 py-3">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{inv.email}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {roleLabel[inv.role] ?? inv.role}
                                        {(inv.factories as any)?.name && ` — ${(inv.factories as any).name}`}
                                        　招待日: {new Date(inv.created_at).toLocaleDateString('ja-JP')}
                                    </p>
                                </div>
                                <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-bold ${roleColor[inv.role] ?? 'bg-gray-100 text-gray-700'}`}>
                                    {roleLabel[inv.role] ?? inv.role}
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
                <StaffTable
                    profiles={staffProfiles}
                    factories={factories}
                    currentUserId={user?.id ?? ''}
                    currentUserRole={currentUserRole}
                />
            </div>

            {/* ── Invite New Staff ─────────────────────────────────── */}
            <div className="rounded-xl border bg-card p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-1">新規スタッフを招待</h3>
                <p className="text-sm text-muted-foreground mb-5">
                    招待メールが送信されます。受信者がリンクをクリックしてパスワードを設定すると、指定したロールで自動的にアカウントが作成されます。
                </p>
                <InviteForm factories={factories} currentUserRole={currentUserRole} />
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

/* ── Server Action Button ──────────────────────────────────────────────── */

function CancelInviteButton() {
    return (
        <SubmitButton
            formAction={async (fd: FormData) => {
                'use server'
                const { redirect } = await import('next/navigation')
                const invitationId = fd.get('invitationId') as string
                const { cancelInvitation } = await import('@/app/actions/users')
                const result = await cancelInvitation(invitationId)
                if (result?.error) {
                    redirect(`/admin/users?error=${encodeURIComponent(result.error)}`)
                }
                redirect('/admin/users')
            }}
            className="text-xs px-2 py-1 border border-red-300 text-red-600 rounded hover:bg-red-50 transition"
            pendingText="処理中..."
        >
            キャンセル
        </SubmitButton>
    )
}
