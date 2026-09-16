-- ==============================================================================
-- Supabase Schema for Singh Web Creations Portfolio
-- ==============================================================================
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 1. Create the 'reviews' table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL UNIQUE CHECK (char_length(trim(username)) >= 3),
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read profiles for username login" ON public.profiles;
CREATE POLICY "Users can read profiles for username login"
ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
CREATE POLICY "Users can create their own profile"
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS mobile TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;

DROP POLICY IF EXISTS "Users can read their own orders" ON public.orders;
CREATE POLICY "Users can read their own orders"
ON public.orders FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
CREATE POLICY "Users can create their own orders"
ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 2. Create the 'reviews' table
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL CHECK (char_length(trim(name)) > 0 AND char_length(name) <= 100),
    review TEXT NOT NULL CHECK (char_length(trim(review)) > 0 AND char_length(review) <= 2000),
    rating INTEGER NOT NULL CHECK (rating >= 0 AND rating <= 5),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- 4. Policy: Public Read Access (Anyone can view reviews)
DROP POLICY IF EXISTS "Allow public read access for reviews" ON public.reviews;
CREATE POLICY "Allow public read access for reviews"
ON public.reviews
FOR SELECT
USING (true);

-- 5. Policy: Public Insert Access (Visitors can post reviews)
DROP POLICY IF EXISTS "Allow public insert for reviews" ON public.reviews;
CREATE POLICY "Allow public insert for reviews"
ON public.reviews
FOR INSERT
WITH CHECK (
    char_length(trim(name)) > 0 AND
    char_length(trim(review)) > 0 AND
    rating >= 0 AND
    rating <= 5
);

-- 6. Create index for fast chronological sorting
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews (created_at DESC);

-- ==============================================================================
-- Optional: 'messages' table for backup storage of contact inquiries
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
    email TEXT NOT NULL CHECK (char_length(trim(email)) > 0),
    phone TEXT,
    subject TEXT NOT NULL CHECK (char_length(trim(subject)) > 0),
    message TEXT NOT NULL CHECK (char_length(trim(message)) > 0),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert for messages" ON public.messages;
CREATE POLICY "Allow public insert for messages"
ON public.messages
FOR INSERT
WITH CHECK (true);
