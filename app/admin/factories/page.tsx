import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createFactory } from '@/app/actions/factory'

export default async function FactoriesPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: factories } = await supabase
        .from('factories')
        .select('*, profiles(id, name)')
        .order('name')

    return (
        <div className="space-y-8 max-w-4xl">
            <h2 className="text-2xl font-bold">工場管理</h2>

            {/* Factories List */}
            <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b">
                        <tr>
                            <th scope="col" className="text-left p-4 font-semibold">工場名</th>
                            <th scope="col" className="text-left p-4 font-semibold">国</th>
                            <th scope="col" className="text-left p-4 font-semibold">連絡先</th>
                            <th scope="col" className="text-left p-4 font-semibold">担当ユーザー数</th>
                        </tr>
                    </thead>
                    <tbody>
                        {factories && factories.length > 0 ? factories.map((f) => (
                            <tr key={f.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                <td className="p-4 font-medium">{f.name}</td>
                                <td className="p-4 text-muted-foreground">{f.country}</td>
                                <td className="p-4 text-muted-foreground">{f.contact_email}</td>
                                <td className="p-4">{(f.profiles as any[])?.length ?? 0}名</td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-muted-foreground">
                                    工場が登録されていません。下のフォームから追加してください。
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add Factory Form */}
            <div className="rounded-xl border bg-card p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-4">新規工場を登録</h3>
                <form action={createFactory} className="space-y-4">
                    <div>
                        <label className="text-sm font-medium block mb-1" htmlFor="name">工場名 *</label>
                        <input
                            id="name"
                            name="name"
                            required
                            placeholder="例: 上海ABC工場"
                            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium block mb-1" htmlFor="country">国</label>
                        <select
                            id="country"
                            name="country"
                            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                        >
                            <option value="">-- 選択してください --</option>
                            <option value="China">中国</option>
                            <option value="Vietnam">ベトナム</option>
                            <option value="Japan">日本</option>
                            <option value="Other">その他</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-medium block mb-1" htmlFor="contact_email">連絡先メール</label>
                        <input
                            id="contact_email"
                            name="contact_email"
                            type="email"
                            placeholder="factory@example.com"
                            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition"
                    >
                        工場を登録する
                    </button>
                </form>
            </div>
        </div>
    )
}
