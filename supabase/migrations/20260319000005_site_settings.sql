CREATE TABLE public.site_settings (
    key TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    value TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
-- Anyone (including receipt API with service role) can read
CREATE POLICY "Public read for site_settings" ON public.site_settings FOR SELECT USING (true);
-- Only authenticated users can update (server actions enforce admin role on top of this)
CREATE POLICY "Auth update for site_settings" ON public.site_settings FOR UPDATE USING (auth.role() = 'authenticated');

-- Seed initial values
INSERT INTO public.site_settings (key, label, value) VALUES
    ('company_name',    '会社名',                       '株式会社SOARA'),
    ('company_name_kana', '会社名（カナ）',             'カブシキガイシャソアラ'),
    ('company_address', '住所',                         '〒221-0056 神奈川県横浜市神奈川区金港町5-14 クアドリフォリオ8階'),
    ('invoice_number',  '適格請求書発行事業者番号',     'T9020001159981'),
    ('contact_email',   'お問い合わせメール',           'contact@soara-mu.com'),
    ('contact_phone',   '電話番号（表示用）',           ''),
    ('site_name',       'サイト名（ブランド名）',       'FAST OEM')
ON CONFLICT (key) DO NOTHING;
