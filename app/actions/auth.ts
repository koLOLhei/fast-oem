'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fast-oem.soara-mu.jp'

function loginErrorMessage(msg: string): string {
    if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
        return 'メールアドレスまたはパスワードが正しくありません'
    }
    if (msg.includes('Email not confirmed')) {
        return 'メールアドレスの確認が完了していません。確認メールをご確認ください'
    }
    if (msg.includes('Too many requests') || msg.includes('over_email_send_rate_limit')) {
        return 'アクセスが集中しています。しばらく時間をおいてから再度お試しください'
    }
    if (msg.includes('User not found')) {
        return 'このメールアドレスは登録されていません'
    }
    return 'ログインに失敗しました。しばらく時間をおいて再度お試しください'
}

export async function login(formData: FormData) {
    const email = (formData.get('email') as string | null)?.trim()
    const password = formData.get('password') as string | null

    if (!email || !password) {
        return redirect('/login?message=' + encodeURIComponent('メールアドレスとパスワードを入力してください'))
    }

    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
        return redirect('/login?message=' + encodeURIComponent(loginErrorMessage(error.message)))
    }

    // Use service-role client to fetch profile — bypasses RLS so we always get
    // the real role even if the anon session cookie hasn't fully propagated yet.
    const serviceClient = createServiceClient()
    const { data: profile, error: profileError } = await serviceClient
        .from('profiles')
        .select('role, is_active')
        .eq('id', data.user.id)
        .single()

    if (profileError || !profile) {
        // Profile row missing — likely a manually-created auth user without a
        // corresponding profiles row. Sign out and surface a clear message.
        await supabase.auth.signOut()
        return redirect('/login?message=' + encodeURIComponent('アカウント情報が見つかりません。管理者にお問い合わせください'))
    }

    const role = profile.role as string
    const isActive = (profile as any).is_active !== false

    if (!isActive) {
        await supabase.auth.signOut()
        return redirect('/login?message=' + encodeURIComponent('このアカウントは無効化されています。管理者にお問い合わせください'))
    }

    if (role === 'admin' || role === 'super_admin') {
        return redirect('/admin')
    } else if (role === 'factory') {
        return redirect('/factory')
    } else {
        // customer role
        return redirect('/mypage')
    }
}

export async function logout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    return redirect('/login')
}

export async function signup(formData: FormData) {
    const email = (formData.get('email') as string | null)?.trim()
    const password = formData.get('password') as string | null

    if (!email || !password) {
        return redirect('/signup?message=' + encodeURIComponent('メールアドレスとパスワードを入力してください'))
    }
    if (password.length < 8) {
        return redirect('/signup?message=' + encodeURIComponent('パスワードは8文字以上で入力してください'))
    }

    const supabase = await createClient()

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: `${SITE_URL}/mypage`,
        },
    })

    if (error) {
        const signupMsg = error.message.includes('over_email_send_rate_limit') || error.message.includes('Too many requests')
            ? 'アクセスが集中しています。しばらく時間をおいてから再度お試しください'
            : error.message.includes('already registered') || error.message.includes('already been registered')
            ? 'このメールアドレスはすでに登録されています'
            : '登録に失敗しました。しばらく時間をおいて再度お試しください'
        return redirect('/signup?message=' + encodeURIComponent(signupMsg))
    }

    // Belt-and-suspenders: ensure the profile row exists with the correct email.
    // The DB trigger does this too, but may race on cold starts.
    // ignoreDuplicates: true — never overwrite an existing row (preserves admin/factory roles
    // that were set via staff_invitation before this signup completed).
    // Use service client to bypass RLS — the new user's JWT may not be propagated yet.
    if (data.user) {
        const serviceClient = createServiceClient()
        const { error: upsertError } = await serviceClient.from('profiles').upsert(
            { id: data.user.id, email, role: 'customer' },
            { onConflict: 'id', ignoreDuplicates: true }
        )
        if (upsertError) {
            // DB trigger is a backup, but log for monitoring
            console.error('[signup] Profile upsert failed (DB trigger should recover):', upsertError)
        }
    }

    return redirect('/login?message=' + encodeURIComponent('登録確認メールを送信しました。メールを確認してからログインしてください'))
}

export async function requestPasswordReset(formData: FormData) {
    const email = (formData.get('email') as string | null)?.trim()
    if (!email) {
        return redirect('/reset-password?message=' + encodeURIComponent('メールアドレスを入力してください'))
    }
    const supabase = await createClient()

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${SITE_URL}/auth/callback?next=/reset-password/confirm`,
    })

    if (error) {
        return redirect('/reset-password?message=' + encodeURIComponent('メールの送信に失敗しました。メールアドレスをご確認ください'))
    }

    return redirect('/reset-password?sent=1')
}

export async function updatePassword(formData: FormData) {
    const password = formData.get('password') as string | null

    if (!password || password.length < 8) {
        return redirect('/reset-password/confirm?message=' + encodeURIComponent('パスワードは8文字以上で入力してください'))
    }

    const supabase = await createClient()

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
        return redirect('/reset-password/confirm?message=' + encodeURIComponent('パスワードの更新に失敗しました。リセットリンクの有効期限が切れている可能性があります'))
    }

    await supabase.auth.signOut()
    return redirect('/login?message=' + encodeURIComponent('パスワードを更新しました。新しいパスワードでログインしてください'))
}
