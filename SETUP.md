# FAST OEM サイト - セットアップガイド

## 必要な環境変数

`.env.local`ファイルを作成し、以下の環境変数を設定してください：

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# 会社情報（領収書PDF用）
COMPANY_NAME=FAST OEM株式会社
COMPANY_ADDRESS=東京都〇〇区〇〇1-2-3
INVOICE_QUALIFIED_NUMBER=T0000000000000

# Email（Resend）
RESEND_API_KEY=your_resend_api_key

# Slack通知（オプション）
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx/yyy/zzz
```

## Stripe Webhookの設定

このプロジェクトでは**Supabase Edge Functions**を使用してStripe Webhookを処理しています。

### 1. Supabase Edge Functionのデプロイ

```bash
# Supabase CLIのインストール（まだの場合）
npm install -g supabase

# Supabaseプロジェクトにログイン
supabase login

# プロジェクトIDをリンク
supabase link --project-ref your-project-ref

# Edge Functionをデプロイ
supabase functions deploy stripe-webhook
```

### 2. Supabase Secretsの設定

Edge Functionで使用する環境変数をSupabase Secretsとして設定します：

```bash
# Stripe Secret Key
supabase secrets set STRIPE_SECRET_KEY=your_stripe_secret_key

# Resend API Key（メール送信用）
supabase secrets set RESEND_API_KEY=your_resend_api_key

# Supabase設定
supabase secrets set SUPABASE_URL=your_supabase_url
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 会社情報（領収書PDF用）
supabase secrets set COMPANY_NAME="FAST OEM株式会社"
supabase secrets set COMPANY_ADDRESS="東京都〇〇区〇〇1-2-3"
supabase secrets set INVOICE_QUALIFIED_NUMBER="T0000000000000"
```

設定した環境変数を確認：
```bash
supabase secrets list
```

### 3. Stripe DashboardでWebhookを設定

**Webhook処理は二層構成です：**
- **Supabase Edge Function (primary)**: DB更新、画像処理、メール送信、アラート
- **Next.js API Route (secondary)**: Next.jsキャッシュの無効化のみ（`revalidatePath`）

#### 3a. Edge Function用Webhookエンドポイント（必須）

1. Stripe Dashboardで新しいWebhookエンドポイントを作成：
   - URL: `https://your-project-ref.supabase.co/functions/v1/stripe-webhook`
   - イベント: `checkout.session.completed`, `checkout.session.expired`, `charge.refunded`, `charge.failed`, `charge.dispute.created`
2. Webhook署名シークレットをコピーして設定：
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```

#### 3b. Next.js用Webhookエンドポイント（任意・推奨）

1. Stripe Dashboardで2つ目のWebhookエンドポイントを作成：
   - URL: `https://your-domain.com/api/webhooks/stripe`
   - イベント: 3aと同一
2. Webhook署名シークレットを`.env.local`に設定：
   ```
   STRIPE_WEBHOOK_SECRET=whsec_yyyyy
   ```
   ※ Edge FunctionとNext.jsは異なるシークレットを使用します

### 4. メール通知の設定

メール送信には[Resend](https://resend.com)を使用しています：

1. Resendでアカウントを作成
2. API Keyを取得
3. 上記の`supabase secrets set RESEND_API_KEY`コマンドで設定

メール送信設定：
- **送信元ドメイン**: `soara-mu.com` で認証が必要
  - すべてのメール送信元: `contact@soara-mu.com`
- **送信先**:
  - 工場: `sales22@kd-craft.cn` （設定済み）
  - 顧客: 注文時に入力されたメールアドレス

**重要**: Resendで `soara-mu.com` ドメインを認証してください。
- Resend Dashboard → Domains → Add Domain
- ドメイン: `soara-mu.com`
- DNS設定に必要なレコード（TXT、MXなど）を追加

## Supabaseのデータベース設定

### マイグレーションの実行

`supabase/migrations/`ディレクトリにマイグレーションファイルがあります：
- `20260315000000_init.sql`: 初期テーブル作成
- `20260316000000_add_price_columns.sql`: 価格関連カラム追加

マイグレーションを実行：
```bash
# ローカル開発環境
supabase db reset

# または本番環境にプッシュ
supabase db push
```

### テーブル構造

マイグレーション実行後、以下のテーブルが作成されます：

#### `orders` テーブル
- `id`: UUID (主キー)
- `stripe_session_id`: TEXT (Stripe Checkout Session ID)
- `customer_info`: JSONB (顧客情報: 名前、メールなど)
- `shipping_address`: JSONB (配送先住所)
- `total_price`: INTEGER (合計金額、円単位)
- `status`: TEXT (注文ステータス: pending, paid, など)
- `created_at`, `updated_at`: TIMESTAMPTZ

#### `order_items` テーブル
- `id`: UUID (主キー)
- `order_id`: UUID (外部キー → orders)
- `product_id`: TEXT (商品ID)
- `product_name`: TEXT (商品名)
- `quantity`: INTEGER (数量)
- `unit_price`: INTEGER (単価、円単位)
- `total_price`: INTEGER (商品小計、円単位)
- `mold_fee`: INTEGER (型代、円単位)
- `mold_order_id`: TEXT (型再利用時の過去注文ID)
- `status`: TEXT (アイテムステータス: unassigned, assigned, など)
- `options`: JSONB (オプション情報)
- `design_file_name`: TEXT (デザインファイル名)
- `design_url`: TEXT (元デザインURL)
- `converted_design_url`: TEXT (変換後デザインURL)
- `factory_id`: UUID (割り当て工場ID、外部キー)
- `created_at`: TIMESTAMPTZ

#### `factories` テーブル
- `id`: UUID (主キー)
- `name`: TEXT (工場名)
- `country`: TEXT (国名)
- `contact_email`: TEXT (連絡先メール)
- その他工場情報

## 実装済み機能

### 1. オプションによる価格変動
- サイズ、素材、厚さなどのオプション選択で価格が変動
- 各オプションに価格差額（+¥30、+20%など）を表示
- 商品詳細ページでリアルタイムに価格更新

### 2. 型代システム
- 型が必要な商品は初回のみ型代が発生
- 過去の注文番号を入力すると型代が免除（サーバー側でバリデーション）
- カート、チェックアウト、注文詳細、メール通知、領収書PDFに型代を表示
- 型再利用時は「(再利用)」の表示

### 3. ログイン・会員機能
- ヘッダーにログイン/新規登録/マイページのリンク
- 認証状態に応じてリンクを切り替え
- マイページで注文履歴と詳細を閲覧
- 領収書PDFのダウンロード機能

### 4. 決済とDB連携
- Stripe Checkoutで決済（埋め込みモード）
- Supabase Edge Functionで注文情報を処理
- 単価、小計、型代、オプションなど全ての情報をDBに保存
- デザインファイルの自動アップロードとURLリンク

### 5. 領収書PDF
- インボイス対応の領収書PDF自動生成
- 型代を明細に含めて表示
- 税込・税抜を分けて表示
- マイページからダウンロード可能

### 6. メール通知機能
- 注文完了時に**顧客と工場**の両方にメール送信
- オプション、単価、小計、型代を全て含めた詳細な明細
- HTMLメールで見やすくフォーマット
- 工場向けメールにはデザインファイルのダウンロードリンクを含む

### 7. 管理画面
- 注文一覧と詳細の確認
- 各アイテムの単価、小計、型代を表示
- 工場割り当て機能
- オプション情報の表示

## 開発サーバーの起動

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:3000` を開く

## トラブルシューティング

### Webhookが動作しない
- Supabase Edge Functionが正しくデプロイされているか確認：
  ```bash
  supabase functions list
  ```
- Supabase Secretsが設定されているか確認：
  ```bash
  supabase secrets list
  ```
- Stripeのダッシュボードでwebhookのログを確認
- Webhook URLが正しいか確認：`https://your-project-ref.supabase.co/functions/v1/stripe-webhook`
- Supabase Edge Functionのログを確認：
  ```bash
  supabase functions logs stripe-webhook
  ```

### メール通知が送信されない
- `RESEND_API_KEY`がSupabase Secretsに設定されているか確認
- Resendで送信元ドメインが認証されているか確認
- 工場通知メール先は管理画面の商品設定（`notification_email`）または工場設定（`contact_email`）で管理
- Edge Functionのログでエラーを確認：
  ```bash
  supabase functions logs stripe-webhook --tail
  ```

### 領収書PDFが生成されない
- 会社情報の環境変数（`.env.local`）が設定されているか確認：
  - `COMPANY_NAME`
  - `COMPANY_ADDRESS`
  - `INVOICE_QUALIFIED_NUMBER`
- ユーザーがログインしているか確認
- ブラウザのコンソールでエラーを確認

### 型代が計算されない
- 商品定義で`requiresMold`と`moldFee`が設定されているか確認
- カートに型代情報が含まれているか確認：
  - ブラウザの開発者ツール → Application → Local Storage → cart
- 過去注文番号のバリデーションが失敗している可能性：
  - 正しい注文番号を入力しているか
  - その注文が同じユーザーのものか
  - その注文に同じ商品が含まれているか

### 価格が正しく表示されない
- データベースに正しく保存されているか確認：
  - `order_items`テーブルの`unit_price`, `total_price`, `mold_fee`カラムをチェック
- マイグレーション`20260316000000_add_price_columns.sql`が実行されているか確認：
  ```bash
  supabase db dump --schema public
  ```
- Stripe Checkoutのメタデータに価格情報が含まれているか確認：
  - Stripeダッシュボード → Payments → 該当のセッション → Metadata

### デプロイ後の確認事項

本番環境にデプロイした後は以下を確認：

1. **環境変数の設定**
   - Next.js（Vercel等）: `.env.example`に記載の全変数を本番環境変数に設定
   - Supabase: `supabase secrets set`コマンドで全ての秘密情報を設定

2. **Stripe Webhook（二層構成）**
   - **Edge Function（必須）**: Stripe Dashboard → Webhook URL = `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
     - イベント: `checkout.session.completed`, `checkout.session.expired`, `charge.refunded`, `charge.failed`, `charge.dispute.created`
     - シークレットは `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx` で設定
   - **Next.js（任意）**: Stripe Dashboard → 2つ目のWebhook URL = `https://<your-domain>/api/webhooks/stripe`
     - Edge Functionと同じイベントを設定（キャッシュ無効化のみ実行）
     - シークレットは `.env.local` の `STRIPE_WEBHOOK_SECRET` に設定

3. **メール送信**
   - Resendで本番ドメインを認証
   - `FROM_EMAIL`, `CONTACT_EMAIL` を Supabase Secrets に設定

4. **データベースマイグレーション**
   - 本番データベースにマイグレーションを適用：
     ```bash
     supabase db push
     ```
