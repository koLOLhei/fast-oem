# FAST OEM サイト - セットアップガイド

2026年9月21日に、オンライン注文（カート・Stripe決済・マイページ・管理画面・AI注文API）を停止し、
**定期発注専用のLP** に作り替えました。2026年10月1日に、商品ごとの個別ページ（`/products/<slug>`）を追加しています。

## 現在の構成

| パス | 内容 |
| --- | --- |
| `/` | LP本体（`app/page.tsx`）。見積もり依頼フォームを含む静的ページ |
| `/products/<slug>` | 商品ごとの個別ページ（`app/products/[slug]/page.tsx`）。旧ECの商品URLと同じ形。フォーム付き |
| `/robots.txt` `/sitemap.xml` `/llms.txt` | SEO / AI検索向け |
| `/opengraph-image.jpg` | SNS共有画像（`app/opengraph-image.jpg`） |
| `/api/*` | 旧API。すべて `410 Gone` を返す（`app/api/[...path]/route.ts`） |
| 旧ページ（`/products` `/contact` など） | `next.config.mjs` の `redirects()` でLP内の該当セクションへ 308 リダイレクト |
| 今は無い商品のURL（`/products/plastic-bag` など） | 個別ページ側で `/#products` へ 308 リダイレクト |

- 文言・会社情報・FAQ・対応グッズ・お知らせ：`lib/site.ts`（FAQはページ表示と構造化データの両方で使用）
- 商品ごとのページの本文：`lib/product-pages.ts`
- フォームの選択肢と入力チェック：`lib/quote.ts`（テスト：`__tests__/quote.test.ts`）
- フォーム送信処理：`app/actions/quote.ts`（Server Action）
  1. 入力チェック（ハニーポットに入力があった送信は破棄せず、件名に【スパム疑い】を付けて通知する）
  2. レート制限（IP：10分5回、メール：10分3回。Upstash、未設定時はメモリ）
  3. 社内通知メール（Resend、返信先＝お客様）。どのページのフォームから来たか（送信元ページ）も載る
  4. Slack通知（`SLACK_WEBHOOK_URL` がある場合）と、お客様への自動返信メール

## 商品を追加するとき

1. `lib/site.ts` の `PRODUCTS` に追加する（`slug`・`name`・`tag`・`description`・`specs`）。
   - 写真があれば `public/images/` に置いて `image` と `alt` を指定する。無ければ省略でき、イラスト表示になる。
   - 別の呼び方で検索される商品は `alternateNames` に入れる（カード・構造化データ・llms.txt に出る）。
2. `lib/product-pages.ts` の `PRODUCT_PAGES` に、同じ `slug` で本文を追加する。これで個別ページ・サイトマップ・フッターに載る。
3. `lib/quote.ts` の `GOODS_OPTIONS` に選択肢を追加する（フォームで選べるようにする）。
4. お知らせを出すなら `lib/site.ts` の `NEWS` の先頭に1件足し、`SITE_LAST_UPDATED` を更新する。

価格・最低ロット・納期・寸法など当社固有の数値は、確認が取れているものだけ書く。
旧ECサイトには「ぬいぐるみ」「ステッカー」「レジ袋」も登録されていたが、2026年4月に販売を止めている。再開の確認なしに載せない。

## 環境変数

```bash
RESEND_API_KEY=...              # 必須：見積もり依頼メールの送信
UPSTASH_REDIS_REST_URL=...      # 推奨：フォームのレート制限
UPSTASH_REDIS_REST_TOKEN=...
SLACK_WEBHOOK_URL=...           # 任意：見積もり依頼をSlackに通知
CONTACT_EMAIL=a@example.com,b@example.com  # 任意：通知先。カンマ区切りで複数可（既定値あり）
FROM_EMAIL="FAST OEM <noreply@soara-mu.com>" # 任意：送信元（既定値あり）
```

`CONTACT_EMAIL` の先頭のアドレスが、自動返信メールの返信先になります。
共有アドレス1つだけにすると担当者が気づけないことがあるため、本番では担当者個人のアドレスも並べて指定しています。

Stripe / Supabase の環境変数は、現在のLPでは使っていません（旧EC版を戻す場合のみ必要）。

## 開発・確認

```bash
npm install
npm run dev     # https://localhost:3000
npm test        # フォーム入力チェックのテスト
npm run build
```

フォームの送信テストでは、実在の受信箱に届かないよう Resend のテスト用アドレスを使うと安全です。

```bash
CONTACT_EMAIL=delivered@resend.dev SLACK_WEBHOOK_URL= npm run start
# フォームのメールアドレス欄にも delivered@resend.dev を入力
```

## 旧EC版に戻す場合

停止直前の状態をタグ `archive/ec-site-2026-09-21` に保存しています。

```bash
git switch -c restore-ec archive/ec-site-2026-09-21   # 旧EC版の状態をブランチとして取り出す
```

EC版は Stripe・Supabase（DB / Edge Function の `stripe-webhook`）・Upstash などの設定が前提です。
復元時は当時の `SETUP.md`（タグ内）を参照してください。
