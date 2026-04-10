import type { Metadata } from 'next'
import Link from 'next/link'
import { Breadcrumb, breadcrumbJsonLd } from '@/components/breadcrumb'

const BASE_URL = 'https://fast-oem.soara-mu.jp'

export const metadata: Metadata = {
    title: 'プライバシーポリシー | FAST OEM',
    description: 'FAST OEM プライバシーポリシー（個人情報の取り扱いについて）。株式会社SOARAが運営するFAST OEMにおける個人情報の取得・利用目的・第三者提供・安全管理について。',
    openGraph: {
        title: 'プライバシーポリシー | FAST OEM',
        description: 'FAST OEMのプライバシーポリシー。個人情報の取得・利用目的・第三者提供・安全管理について。',
        url: `${BASE_URL}/privacy`,
    },
    alternates: { canonical: `${BASE_URL}/privacy` },
}

export default function PrivacyPage() {
    const bcJsonLd = breadcrumbJsonLd([{ name: 'プライバシーポリシー' }])
    return (
        <>
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(bcJsonLd) }}
        />
        <div className="min-h-screen bg-background py-12">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <Breadcrumb items={[{ name: 'プライバシーポリシー' }]} />
                <h1 className="text-3xl font-bold text-foreground mb-2">プライバシーポリシー</h1>
                <p className="text-sm text-muted-foreground mb-10">最終更新日：2026年3月21日</p>

                <p className="text-sm text-muted-foreground leading-relaxed mb-8">
                    株式会社SOARA（以下「当社」）は、FAST OEM（以下「本サービス」）を通じて取得するお客様の個人情報について、
                    個人情報の保護に関する法律（個人情報保護法）および関連法令を遵守し、
                    以下のとおり適切に取り扱います。
                </p>

                <div className="space-y-10 text-sm">

                    <section>
                        <h2 className="font-bold text-foreground text-base mb-3">1. 取得する個人情報</h2>
                        <p className="text-muted-foreground leading-relaxed mb-2">
                            本サービスでは、以下の個人情報を取得します：
                        </p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                            <li>氏名・フリガナ</li>
                            <li>会社名・部署名（法人のお客様）</li>
                            <li>住所（配送先）</li>
                            <li>電話番号</li>
                            <li>メールアドレス</li>
                            <li>クレジットカード情報（Stripe社のサーバーで直接処理され、当社では保持しません）</li>
                            <li>注文履歴・デザインデータ（製造目的）</li>
                            <li>アクセスログ・Cookie情報</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="font-bold text-foreground text-base mb-3">2. 利用目的</h2>
                        <p className="text-muted-foreground leading-relaxed mb-2">
                            取得した個人情報は以下の目的で利用します：
                        </p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                            <li>ご注文商品の製造・配送</li>
                            <li>注文確認・発送通知等のメール送信（取引上必要なメールのみ）</li>
                            <li>お問い合わせへの対応</li>
                            <li>型の保管管理（再注文時の型代免除判定）</li>
                            <li>不正注文・不正アクセスの防止</li>
                            <li>サービスの改善・品質向上</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-3">
                            上記以外の目的で個人情報を利用する場合は、あらかじめお客様の同意を得るものとします。
                            広告・マーケティング目的での利用は行いません。
                        </p>
                    </section>

                    <section>
                        <h2 className="font-bold text-foreground text-base mb-3">3. 第三者への提供</h2>
                        <p className="text-muted-foreground leading-relaxed mb-2">
                            当社は、以下の場合を除き、お客様の個人情報を第三者に提供しません：
                        </p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                            <li>お客様の同意がある場合</li>
                            <li>法令に基づく場合（裁判所・警察等からの開示請求）</li>
                            <li>人の生命・身体・財産の保護のために必要で、本人同意取得が困難な場合</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-3">
                            なお、製造委託先工場（中国・ベトナム等）に対しては、製造に必要な範囲で
                            配送先・注文内容を共有します。委託先には適切な秘密保持義務を課しています。
                        </p>
                    </section>

                    <section>
                        <h2 className="font-bold text-foreground text-base mb-3">4. 業務委託先（サービス提供のための利用）</h2>
                        <p className="text-muted-foreground leading-relaxed mb-2">
                            当社はサービス提供のために以下の事業者にデータ処理を委託しています：
                        </p>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-border text-xs">
                                <thead>
                                    <tr className="bg-muted">
                                        <th className="border border-border px-3 py-2 text-left font-semibold">事業者</th>
                                        <th className="border border-border px-3 py-2 text-left font-semibold">用途</th>
                                        <th className="border border-border px-3 py-2 text-left font-semibold">所在地</th>
                                    </tr>
                                </thead>
                                <tbody className="text-muted-foreground">
                                    <tr>
                                        <td className="border border-border px-3 py-2">Stripe Inc.</td>
                                        <td className="border border-border px-3 py-2">クレジットカード決済処理</td>
                                        <td className="border border-border px-3 py-2">米国</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-border px-3 py-2">Supabase Inc.</td>
                                        <td className="border border-border px-3 py-2">データベース・ファイル管理</td>
                                        <td className="border border-border px-3 py-2">米国（東京リージョン使用）</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-border px-3 py-2">Resend Inc.</td>
                                        <td className="border border-border px-3 py-2">メール送信</td>
                                        <td className="border border-border px-3 py-2">米国</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-border px-3 py-2">Vercel Inc.</td>
                                        <td className="border border-border px-3 py-2">Webサービスホスティング</td>
                                        <td className="border border-border px-3 py-2">米国</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p className="text-muted-foreground mt-2">
                            各社のプライバシーポリシーについては各社のウェブサイトをご参照ください。
                        </p>
                    </section>

                    <section>
                        <h2 className="font-bold text-foreground text-base mb-3">5. 個人情報の保管・安全管理</h2>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                            <li>個人情報へのアクセスは業務上必要な担当者に限定しています</li>
                            <li>通信はすべてSSL/TLS暗号化により保護されています</li>
                            <li>クレジットカード情報はStripe社のサーバーで処理され、当社のデータベースには保存されません</li>
                            <li>注文情報は受注製造業務上必要な期間保管し、法令で定める保存期間終了後に適切に削除します</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="font-bold text-foreground text-base mb-3">6. Cookieの使用</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            本サービスでは、セッション管理・サービス品質向上のためにCookieを使用しています。
                            ブラウザの設定によりCookieを無効化することができますが、
                            その場合一部機能が正常に動作しない場合があります。
                            アクセス解析目的のトラッキングCookieは使用していません。
                        </p>
                    </section>

                    <section>
                        <h2 className="font-bold text-foreground text-base mb-3">7. 個人情報の開示・訂正・削除</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            お客様ご自身の個人情報の開示・訂正・削除・利用停止をご希望の場合は、
                            下記お問い合わせ先までご連絡ください。
                            本人確認のうえ、法令の定める範囲内で対応いたします。
                        </p>
                    </section>

                    <section>
                        <h2 className="font-bold text-foreground text-base mb-3">8. お問い合わせ</h2>
                        <div className="text-muted-foreground space-y-1">
                            <p>個人情報の取り扱いに関するお問い合わせは以下までご連絡ください：</p>
                            <p className="mt-2 font-medium text-foreground">株式会社SOARA 個人情報担当</p>
                            <p>〒221-0056 神奈川県横浜市神奈川区金港町5-14 クアドリフォリオ8階</p>
                            <p>
                                メール：
                                <a href="mailto:contact@soara-mu.com" className="text-primary underline">
                                    contact@soara-mu.com
                                </a>
                            </p>
                            <p className="text-xs mt-1">受付時間：平日 10:00〜18:00（土日祝除く）</p>
                        </div>
                    </section>

                </div>

                <div className="border-t border-border pt-6 mt-10 flex gap-4 text-sm">
                    <Link href="/terms" className="text-primary underline hover:text-primary/80">
                        利用規約
                    </Link>
                    <Link href="/" className="text-muted-foreground hover:text-foreground">
                        トップへ戻る
                    </Link>
                </div>
            </div>
        </div>
        </>
    )
}
