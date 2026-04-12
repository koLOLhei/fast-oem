import type { Metadata } from 'next'
import { login } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { SubmitButton } from '@/components/submit-button'

export const metadata: Metadata = {
    title: 'ログイン',
    robots: { index: false, follow: false },
}

export default async function LoginPage(
    props: { searchParams: Promise<{ message?: string; error?: string }> }
) {
    const searchParams = await props.searchParams

    const errorMessage =
        searchParams?.error === 'account_disabled'
            ? 'このアカウントは無効化されています。管理者にお問い合わせください'
            : searchParams?.message ?? null

    const isSuccess = searchParams?.message?.includes('パスワードを更新しました')

    return (
        <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2 mx-auto min-h-[80vh]">
            <div className="flex flex-col mb-8 text-center mt-10">
                <h1 className="text-2xl font-bold">スタッフログイン</h1>
                <p className="text-sm text-muted-foreground mt-2">
                    管理者・工場スタッフ・マイページ共通のログインです。
                </p>
            </div>

            <form className="animate-in flex-1 flex flex-col w-full justify-center gap-2 text-foreground mb-8">
                <label className="text-sm font-semibold" htmlFor="email">
                    メールアドレス
                </label>
                <input
                    className="rounded-md px-4 py-2 bg-inherit border mb-4"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                />
                <label className="text-sm font-semibold" htmlFor="password">
                    パスワード
                </label>
                <input
                    className="rounded-md px-4 py-2 bg-inherit border mb-2"
                    type="password"
                    name="password"
                    placeholder="••••••••"
                    required
                />
                <div className="flex justify-end mb-4">
                    <Link
                        href="/reset-password"
                        className="text-xs text-muted-foreground hover:text-primary underline transition-colors"
                    >
                        パスワードをお忘れの方はこちら
                    </Link>
                </div>
                <SubmitButton formAction={login} className="bg-primary px-4 py-2 rounded-md mb-2">
                    ログイン
                </SubmitButton>
                {errorMessage && (
                    <p className={`mt-4 p-4 text-center rounded-md text-sm ${
                        isSuccess
                            ? 'bg-green-50 text-green-800 border border-green-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                        {errorMessage}
                    </p>
                )}
            </form>
        </div>
    )
}
