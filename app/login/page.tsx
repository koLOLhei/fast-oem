import { login } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'

export default async function LoginPage(
    props: { searchParams: Promise<{ message: string }> }
) {
    const searchParams = await props.searchParams

    return (
        <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2 mx-auto min-h-[80vh]">
            <div className="flex flex-col mb-8 text-center mt-10">
                <h1 className="text-2xl font-bold">ダッシュボード ログイン</h1>
                <p className="text-sm text-muted-foreground mt-2">
                    管理者または工場のアカウントでログインしてください。
                </p>
            </div>

            <form className="animate-in flex-1 flex flex-col w-full justify-center gap-2 text-foreground mb-8">
                <label className="text-md font-semibold" htmlFor="email">
                    Email
                </label>
                <input
                    className="rounded-md px-4 py-2 bg-inherit border mb-4"
                    name="email"
                    placeholder="you@example.com"
                    required
                />
                <label className="text-md font-semibold" htmlFor="password">
                    Password
                </label>
                <input
                    className="rounded-md px-4 py-2 bg-inherit border mb-6"
                    type="password"
                    name="password"
                    placeholder="••••••••"
                    required
                />
                <Button formAction={login} className="bg-primary px-4 py-2 rounded-md mb-2">
                    ログイン
                </Button>
                {searchParams?.message && (
                    <p className="mt-4 p-4 bg-foreground/10 text-foreground text-center rounded-md">
                        {searchParams.message}
                    </p>
                )}
            </form>
        </div>
    )
}
