'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const supabase = await createClient()

    // Authenticate user
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        return redirect('/login?message=Could not authenticate user')
    }

    // Fetch role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

    const role = profile?.role

    if (role === 'admin') {
        return redirect('/admin')
    } else if (role === 'factory') {
        return redirect('/factory')
    } else {
        // Customer → マイページへ
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

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/mypage`,
        },
    })

    if (error) {
        return redirect('/signup?message=' + encodeURIComponent(error.message))
    }

    return redirect('/mypage?message=登録確認メールを送信しました。メールを確認してください')
}
