import { requestPasswordReset } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'パスワードのリセット | FAST OEM',
    robots: { index: false },
}

export default async function ResetPasswordPage(
    props: { searchParams: Promise<{ message?: string; sent?: string }> }
) {
    const searchParams = await props.searchParams
    const sent = searchParams?.sent === '1'

    return (
        <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2 mx-auto min-h-[80vh]">
            <div className="flex flex-col mb-8 text-center mt-10">
                <h1 className="text-2xl font-bold">パスワードのリセット</h1>
                <p className="text-sm text-muted-foreground mt-2">
                    登録済みのメールアドレスにリセット用リンクをお送りします。
                </p>
            </div>

            {sent ? (
                <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center space-y-3">
                    <p className="text-green-800 font-semibold">メールを送信しました</p>
                    <p className="text-sm text-green-700">
                        ご入力のメールアドレスにパスワードリセット用のリンクを送信しました。
                        メールをご確認ください。
                    </p>
                    <p className="text-xs text-muted-foreground">
                        メールが届かない場合は、迷惑メールフォルダもご確認ください。
                    </p>
                </div>
            ) : (
                <form className="flex flex-col gap-2 mb-8">
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
                    <Button formAction={requestPasswordReset} className="bg-primary px-4 py-2 rounded-md">
                        リセットメールを送信
                    </Button>
                    {searchParams?.message && (
                        <p className="mt-4 p-4 bg-red-50 text-red-800 border border-red-200 text-center rounded-md text-sm">
                            {searchParams.message}
                        </p>
                    )}
                </form>
            )}

            <p className="text-center text-sm text-muted-foreground">
                <Link href="/login" className="text-primary underline">
                    ログインページに戻る
                </Link>
            </p>
        </div>
    )
}
