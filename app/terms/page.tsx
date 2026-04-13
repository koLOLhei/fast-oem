import type { Metadata } from 'next'
import Link from 'next/link'
import { Breadcrumb, breadcrumbJsonLd } from '@/components/breadcrumb'

const BASE_URL = 'https://fast-oem.soara-mu.jp'

export const metadata: Metadata = {
    title: '利用規約',
    description: 'FAST OEMのサービス利用規約。受注製造品の性質・注文の成立・デザインデータの取り扱い・型の保管・返品キャンセルポリシーについて。',
    openGraph: {
        title: '利用規約 | FAST OEM',
        description: 'FAST OEMのサービス利用規約。受注製造品の注文成立・デザインデータ・返品キャンセルポリシーについて。',
        url: `${BASE_URL}/terms`,
        images: [{ url: '/opengraph-image.png', width: 1200, height: 630 }],
    },
    alternates: { canonical: `${BASE_URL}/terms` },
}

export default function TermsPage() {
    const bcJsonLd = breadcrumbJsonLd([{ name: '利用規約' }])
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(bcJsonLd) }}
            />
        <div className="min-h-screen bg-background py-12">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <Breadcrumb items={[{ name: '利用規約' }]} />
                <h1 className="text-3xl font-bold text-foreground mb-2">利用規約</h1>
                <p className="text-sm text-muted-foreground mb-10">最終更新日：2026年3月21日</p>

                {/* 特定商取引法 */}
                <section className="mb-12">
                    <h2 className="text-xl font-bold text-foreground mb-6 pb-2 border-b border-border">
                        特定商取引法に基づく表記
                    </h2>
                    <dl className="space-y-5 text-sm">
                        <div className="grid grid-cols-3 gap-4">
                            <dt className="font-semibold text-foreground col-span-1">販売事業者</dt>
                            <dd className="text-muted-foreground col-span-2">株式会社SOARA</dd>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <dt className="font-semibold text-foreground col-span-1">代表者</dt>
                            <dd className="text-muted-foreground col-span-2">小川 公平</dd>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <dt className="font-semibold text-foreground col-span-1">所在地</dt>
                            <dd className="text-muted-foreground col-span-2">
                                〒221-0056<br />
                                神奈川県横浜市神奈川区金港町5-14 クアドリフォリオ8階
                            </dd>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <dt className="font-semibold text-foreground col-span-1">メールアドレス</dt>
                            <dd className="text-muted-foreground col-span-2">
                                <a href="mailto:contact@soara-mu.com" className="text-primary underline">
                                    contact@soara-mu.com
                                </a>
                            </dd>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <dt className="font-semibold text-foreground col-span-1">サービス内容</dt>
                            <dd className="text-muted-foreground col-span-2">
                                OEM製品の受注製造・販売（ノベルティ・販促グッズ・オリジナル商品等）
                            </dd>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <dt className="font-semibold text-foreground col-span-1">販売価格</dt>
                            <dd className="text-muted-foreground col-span-2">
                                各商品ページに表示している価格（消費税10%込）
                            </dd>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <dt className="font-semibold text-foreground col-span-1">追加費用</dt>
                            <dd className="text-muted-foreground col-span-2">
                                初回注文時に型代が発生する場合があります（各商品ページに表示）。<br />
                                離島・沖縄・一部遠隔地への配送は別途送料が発生します。
                            </dd>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <dt className="font-semibold text-foreground col-span-1">お支払い方法</dt>
                            <dd className="text-muted-foreground col-span-2">
                                クレジットカード決済（Visa / Mastercard / American Express / JCB）
                            </dd>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <dt className="font-semibold text-foreground col-span-1">お支払い時期</dt>
                            <dd className="text-muted-foreground col-span-2">
                                ご注文時に即時決済
                            </dd>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <dt className="font-semibold text-foreground col-span-1">商品のお届け</dt>
                            <dd className="text-muted-foreground col-span-2">
                                入金確認後、通常15営業日以内に発送（特急プラン：12営業日以内）。<br />
                                製造状況により前後する場合があります。発送時に追跡番号をメールでお知らせします。
                            </dd>
                        </div>
                        <div className="grid grid-cols-3 gap-4 bg-red-50 border border-red-200 rounded-lg p-4">
                            <dt className="font-bold text-red-800 col-span-1">返品・キャンセル</dt>
                            <dd className="text-red-700 col-span-2">
                                <strong>本サービスはお客様のご指定デザイン・仕様による受注製造品のため、
                                注文確定後（決済完了後）のキャンセル・返品・返金はお受けできません。</strong><br /><br />
                                ただし、以下の場合は当社の責任において対応いたします：
                                <ul className="mt-2 space-y-1 list-disc list-inside text-sm">
                                    <li>商品に製造上の欠陥がある場合</li>
                                    <li>ご注文内容と異なる商品が届いた場合</li>
                                    <li>輸送中の破損が確認できる場合</li>
                                </ul>
                                上記に該当する場合は、商品到着後7日以内に
                                <a href="mailto:contact@soara-mu.com" className="underline">contact@soara-mu.com</a>
                                までご連絡ください。
                            </dd>
                        </div>
                    </dl>
                </section>

                {/* 利用規約本文 */}
                <section className="mb-12 space-y-8">
                    <h2 className="text-xl font-bold text-foreground mb-6 pb-2 border-b border-border">
                        サービス利用規約
                    </h2>

                    <div>
                        <h3 className="font-semibold text-foreground mb-2">第1条（適用）</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            本規約は、株式会社SOARA（以下「当社」）が提供するFAST OEM（以下「本サービス」）の利用に関する条件を定めるものです。
                            ご注文の際には本規約にご同意いただいたものとみなします。
                        </p>
                    </div>

                    <div>
                        <h3 className="font-semibold text-foreground mb-2">第2条（受注製造品の性質）</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            本サービスで提供する商品はすべてお客様のご指定に基づく受注製造品です。
                            製造開始後のキャンセル・変更・返品はお受けできません。
                            ご注文前に商品仕様・デザインデータ・数量を十分にご確認ください。
                        </p>
                    </div>

                    <div>
                        <h3 className="font-semibold text-foreground mb-2">第3条（注文の成立）</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            注文は、お客様がご注文手続きを完了し、当社がご注文を確認したときに成立します。
                            システム障害・在庫状況等によりご注文をお受けできない場合は、速やかにご連絡のうえ
                            決済の取り消しを行います。
                        </p>
                    </div>

                    <div>
                        <h3 className="font-semibold text-foreground mb-2">第4条（デザインデータの取り扱い）</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            お客様がアップロードされたデザインデータは、ご注文の製造目的のみに使用します。
                            お客様は、アップロードするデザインについて第三者の著作権・商標権等を侵害しないことを保証してください。
                            権利侵害に起因するいかなる損害についても、当社は責任を負いません。
                        </p>
                    </div>

                    <div>
                        <h3 className="font-semibold text-foreground mb-2">第5条（型の保管）</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            初回注文時に製作した型は、最終注文日から1年間保管します。
                            保管期間内の再注文では型代が不要です。保管期間終了後は型を廃棄する場合があります。
                        </p>
                    </div>

                    <div>
                        <h3 className="font-semibold text-foreground mb-2">第6条（免責事項）</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            天災・感染症・輸送会社の都合等、当社の責によらない事由による納期遅延について、
                            当社は責任を負いません。ただし、状況に応じて速やかにご連絡いたします。<br />
                            モニターの色設定等の環境差による仕上がり色の相違は、返品・交換の対象外となります。
                        </p>
                    </div>

                    <div>
                        <h3 className="font-semibold text-foreground mb-2">第7条（規約の変更）</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            当社は必要に応じて本規約を変更することができます。
                            変更後の規約はウェブサイト上に掲示した時点で効力を生じます。
                        </p>
                    </div>

                    <div>
                        <h3 className="font-semibold text-foreground mb-2">第8条（準拠法・管轄裁判所）</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            本規約の解釈および適用は日本法に準拠します。
                            本サービスに関する紛争については、横浜地方裁判所を第一審の専属的合意管轄裁判所とします。
                        </p>
                    </div>
                </section>

                <div className="border-t border-border pt-6 flex gap-4 text-sm">
                    <Link href="/privacy" className="text-primary underline hover:text-primary/80">
                        プライバシーポリシー
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
