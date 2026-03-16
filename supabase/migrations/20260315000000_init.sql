-- Create orders table
CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    stripe_session_id text UNIQUE NOT NULL,
    customer_info jsonb NOT NULL,
    shipping_address jsonb NOT NULL,
    total_price integer NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create order items table
CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    product_id text NOT NULL,
    product_name text NOT NULL,
    quantity integer NOT NULL,
    unit_price integer NOT NULL,
    options jsonb DEFAULT '[]'::jsonb NOT NULL,
    design_file_name text,
    design_url text,
    converted_design_url text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Allow reading orders by authenticated users (or service role)
CREATE POLICY "Enable read access for all users" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for service role" ON public.orders FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON public.order_items FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for service role" ON public.order_items FOR UPDATE USING (true);

-- Create Storage Buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('designs', 'designs', true);

-- Setup Storage RLS
CREATE POLICY "Public Access for designs" ON storage.objects FOR SELECT USING (bucket_id = 'designs');
CREATE POLICY "Public Upload to designs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'designs');
CREATE POLICY "Service Role Delete designs" ON storage.objects FOR DELETE USING (bucket_id = 'designs');
CREATE POLICY "Service Role Update designs" ON storage.objects FOR UPDATE USING (bucket_id = 'designs');
