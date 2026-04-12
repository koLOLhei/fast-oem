import { updatePassword } from '@/app/actions/auth'
import Link from 'next/link'
import { SubmitButton } from '@/components/submit-button'
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: '新しいパスワードの設定',
    robots: { index: false },
}

export default async function ResetPasswordConfirmPage(
    props: { searchParams: Promise<{ message?: string }> }
) {
    const searchParams = await props.searchParams

    return (
        <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2 mx-auto min-h-[80vh]">
            <div className="flex flex-col mb-8 text-center mt-10">
                <h1 className="text-2xl font-bold">新しいパスワードの設定</h1>
                <p className="text-sm text-muted-foreground mt-2">
                    新しいパスワードを入力してください。
                </p>
            </div>

            <form className="flex flex-col gap-2 mb-8">
                <label className="text-sm font-semibold" htmlFor="password">
                    新しいパスワード（8文字以上）
                </label>
                <input
                    className="rounded-md px-4 py-2 bg-inherit border mb-4"
                    type="password"
                    name="password"
                    placeholder="••••••••"
                    minLength={8}
                    required
                />
                <SubmitButton formAction={updatePassword} className="bg-primary px-4 py-2 rounded-md">
                    パスワードを更新する
                </SubmitButton>
                {searchParams?.message && (
                    <p className="mt-4 p-4 bg-red-50 text-red-800 border border-red-200 text-center rounded-md text-sm">
                        {searchParams.message}
                    </p>
                )}
            </form>

            <p className="text-center text-sm text-muted-foreground">
                <Link href="/login" className="text-primary underline">
                    ログインページに戻る
                </Link>
            </p>
        </div>
    )
}
