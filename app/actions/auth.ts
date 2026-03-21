'use server'

import { createClient } from '@/lib/supabase/server'
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
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
        return redirect('/login?message=' + encodeURIComponent(loginErrorMessage(error.message)))
    }

    // Fetch role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', data.user.id)
        .single()

    const role = profile?.role
    const isActive = (profile as any)?.is_active !== false

    if (!isActive) {
        await supabase.auth.signOut()
        return redirect('/login?message=' + encodeURIComponent('このアカウントは無効化されています。管理者にお問い合わせください'))
    }

    if (role === 'admin') {
        return redirect('/admin')
    } else if (role === 'factory') {
        return redirect('/factory')
    } else {
        return redirect('/mypage')
    }
}

export async function logout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    return redirect('/login')
}

export async function signup(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const supabase = await createClient()

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: `${SITE_URL}/mypage`,
        },
    })

    if (error) {
        return redirect('/signup?message=' + encodeURIComponent(error.message))
    }

    // Belt-and-suspenders: ensure email is saved to profiles
    // (the DB trigger does this too, but may race on cold starts)
    if (data.user) {
        await supabase.from('profiles').upsert(
            { id: data.user.id, email, role: 'customer' },
            { onConflict: 'id', ignoreDuplicates: false }
        )
    }

    return redirect('/mypage?message=' + encodeURIComponent('登録確認メールを送信しました。メールを確認してください'))
}

export async function requestPasswordReset(formData: FormData) {
    const email = formData.get('email') as string
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
    const password = formData.get('password') as string
    const supabase = await createClient()

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
        return redirect('/reset-password/confirm?message=' + encodeURIComponent('パスワードの更新に失敗しました。リセットリンクの有効期限が切れている可能性があります'))
    }

    await supabase.auth.signOut()
    return redirect('/login?message=' + encodeURIComponent('パスワードを更新しました。新しいパスワードでログインしてください'))
}
