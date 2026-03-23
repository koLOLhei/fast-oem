import type { Metadata } from 'next'
import { signup } from '@/app/actions/auth'
import Link from 'next/link'
import { SubmitButton } from '@/components/submit-button'

export const metadata: Metadata = {
    title: '新規会員登録',
    robots: { index: false, follow: false },
}

export default async function SignupPage(
    props: { searchParams: Promise<{ message: string }> }
) {
    const searchParams = await props.searchParams

    return (
        <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2 mx-auto min-h-[80vh]">
            <div className="flex flex-col mb-8 text-center mt-10">
                <h1 className="text-2xl font-bold">新規会員登録</h1>
                <p className="text-sm text-muted-foreground mt-2">
                    登録すると注文履歴の確認や領収書発行ができます。
                </p>
            </div>

            <form className="flex-1 flex flex-col w-full justify-center gap-2 text-foreground mb-8">
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
                    パスワード（8文字以上）
                </label>
                <input
                    className="rounded-md px-4 py-2 bg-inherit border mb-6"
                    type="password"
                    name="password"
                    placeholder="••••••••"
                    minLength={8}
                    required
                />
                <SubmitButton formAction={signup} className="bg-primary px-4 py-2 rounded-md mb-2">
                    登録する
                </SubmitButton>
                {searchParams?.message && (
                    <p className="mt-4 p-4 bg-foreground/10 text-foreground text-center rounded-md">
                        {searchParams.message}
                    </p>
                )}
            </form>

            <p className="text-center text-sm text-muted-foreground">
                すでにアカウントをお持ちですか？{' '}
                <Link href="/login" className="text-primary underline">
                    ログイン
                </Link>
            </p>
        </div>
    )
}
