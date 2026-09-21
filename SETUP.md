# FAST OEM サイト - セットアップガイド

2026年9月21日に、オンライン注文（カート・Stripe決済・マイページ・管理画面・AI注文API）を停止し、
**定期発注専用のLP（トップページ1枚）** に作り替えました。

## 現在の構成

| パス | 内容 |
| --- | --- |
| `/` | LP本体（`app/page.tsx`）。見積もり依頼フォームを含む静的ページ |
| `/robots.txt` `/sitemap.xml` `/llms.txt` | SEO / AI検索向け |
| `/opengraph-image.jpg` | SNS共有画像（`app/opengraph-image.jpg`） |
| `/api/*` | 旧API。すべて `410 Gone` を返す（`app/api/[...path]/route.ts`） |
| 旧ページ（`/products` `/contact` など） | `next.config.mjs` の `redirects()` でLP内の該当セクションへ 308 リダイレクト |

- 文言・会社情報・FAQ・対応グッズ：`lib/site.ts`（FAQはページ表示と構造化データの両方で使用）
- フォームの選択肢と入力チェック：`lib/quote.ts`（テスト：`__tests__/quote.test.ts`）
- フォーム送信処理：`app/actions/quote.ts`（Server Action）
  1. 入力チェック（ハニーポット付き）
  2. レート制限（IP：10分5回、メール：10分3回。Upstash、未設定時はメモリ）
  3. 社内通知メール（Resend、返信先＝お客様）
  4. Slack通知（`SLACK_WEBHOOK_URL` がある場合）と、お客様への自動返信メール

## 環境変数

```bash
RESEND_API_KEY=...              # 必須：見積もり依頼メールの送信
UPSTASH_REDIS_REST_URL=...      # 推奨：フォームのレート制限
UPSTASH_REDIS_REST_TOKEN=...
SLACK_WEBHOOK_URL=...           # 任意：見積もり依頼をSlackに通知
CONTACT_EMAIL=contact@soara-mu.com         # 任意：通知先（既定値あり）
FROM_EMAIL="FAST OEM <noreply@soara-mu.com>" # 任意：送信元（既定値あり）
```

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
