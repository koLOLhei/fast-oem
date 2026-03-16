-- Create factories table
CREATE TABLE public.factories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    country text,
    contact_email text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for factories
ALTER TABLE public.factories ENABLE ROW LEVEL SECURITY;

-- Create profiles table linked to auth.users
CREATE TABLE public.profiles (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    role text NOT NULL CHECK (role IN ('admin', 'factory', 'customer')),
    factory_id uuid REFERENCES public.factories(id) ON DELETE SET NULL,
    name text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Add factory_id, status to order_items
ALTER TABLE public.order_items 
ADD COLUMN factory_id uuid REFERENCES public.factories(id) ON DELETE SET NULL,
ADD COLUMN status text NOT NULL DEFAULT 'unassigned' CHECK (status IN ('unassigned', 'assigned', 'manufacturing', 'shipped'));

-- Trigger to automatically create profile on signup (optional depending on how we handle admin creation)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, role, name)
  VALUES (new.id, 'customer', new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING ( auth.uid() = id );

CREATE POLICY "Admins can view all profiles" 
ON public.profiles FOR SELECT 
USING ( EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') );

-- Policies for factories
CREATE POLICY "Admins can manage factories" 
ON public.factories FOR ALL 
USING ( EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') );

CREATE POLICY "Factory users can view their own factory info"
ON public.factories FOR SELECT
USING ( id IN (SELECT factory_id FROM public.profiles WHERE id = auth.uid() AND role = 'factory') );

-- Update Policies for Orders & Items (Admin visibility)
CREATE POLICY "Admins can view all orders" 
ON public.orders FOR SELECT 
USING ( EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') );

CREATE POLICY "Admins can manage order items" 
ON public.order_items FOR ALL 
USING ( EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') );

-- Factory visibility (can only see assigned items)
CREATE POLICY "Factories can view assigned items" 
ON public.order_items FOR SELECT 
USING ( factory_id IN (SELECT factory_id FROM public.profiles WHERE id = auth.uid() AND role = 'factory') );

CREATE POLICY "Factories can update status" 
ON public.order_items FOR UPDATE
USING ( factory_id IN (SELECT factory_id FROM public.profiles WHERE id = auth.uid() AND role = 'factory') );
