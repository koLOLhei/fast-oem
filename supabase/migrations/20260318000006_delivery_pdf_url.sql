-- Delivery PDF URL: client-generated composite (frame + positioned image) as PDF
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS delivery_pdf_url TEXT;

COMMENT ON COLUMN public.order_items.delivery_pdf_url IS '納品用PDF（枠＋配置済み画像のコンポジット）。クライアント側で生成してSupabase Storageにアップロード。';
