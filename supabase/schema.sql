-- Schema Database WarungScan Lengkap (Warung + Keuangan Pribadi & Bisnis Terisolasi + Investasi)
-- Jalankan skrip ini di SQL Editor Supabase Anda

-- 1. Tabel Produk (products)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    cost_price NUMERIC NOT NULL DEFAULT 0,
    selling_price NUMERIC NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    category VARCHAR(100) DEFAULT 'Umum',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_name ON public.products (name);

-- 2. Tabel Transaksi Penjualan (sales_transactions)
CREATE TABLE IF NOT EXISTS public.sales_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_amount NUMERIC NOT NULL DEFAULT 0,
    total_profit NUMERIC NOT NULL DEFAULT 0,
    payment_method VARCHAR(50) DEFAULT 'Tunai',
    cashier_name VARCHAR(100) DEFAULT 'Kasir',
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_sales_transactions_created_at ON public.sales_transactions (created_at DESC);

-- 3. Tabel Detail Item Penjualan (sales_items)
CREATE TABLE IF NOT EXISTS public.sales_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES public.sales_transactions(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    qty INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC NOT NULL DEFAULT 0,
    unit_cost NUMERIC NOT NULL DEFAULT 0,
    subtotal NUMERIC NOT NULL DEFAULT 0
);

-- 4. Tabel Log Kulakan / Restok (restock_logs)
CREATE TABLE IF NOT EXISTS public.restock_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    receipt_image_url TEXT,
    raw_json_extracted JSONB,
    total_expense NUMERIC NOT NULL DEFAULT 0,
    notes TEXT
);

-- 5. Tabel Konsumsi Pribadi / Pakai Sendiri (self_consumptions)
CREATE TABLE IF NOT EXISTS public.self_consumptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    qty INTEGER NOT NULL DEFAULT 1,
    cost_price NUMERIC NOT NULL DEFAULT 0,
    total_cost NUMERIC NOT NULL DEFAULT 0,
    reason VARCHAR(100) DEFAULT 'Kebutuhan Sendiri',
    user_name VARCHAR(100) DEFAULT 'Keluarga',
    notes TEXT
);

-- 6. Tabel Anggota / Pengguna (family_members)
CREATE TABLE IF NOT EXISTS public.family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'family_member', -- 'super_admin' | 'family_member'
    pin VARCHAR(20) DEFAULT '1234',
    avatar_color VARCHAR(50) DEFAULT 'blue',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Tabel Dompet Keuangan (wallets) - Terisolasi per User
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES public.family_members(id) ON DELETE CASCADE,
    type VARCHAR(50) DEFAULT 'cash_pribadi', -- 'cash_warung', 'cash_pribadi', 'bank', 'ewallet'
    balance NUMERIC NOT NULL DEFAULT 0,
    is_private BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Tabel Transaksi Keuangan (personal_expenses) - Pengeluaran & Pemasukan Terisolasi
CREATE TABLE IF NOT EXISTS public.personal_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES public.family_members(id) ON DELETE CASCADE,
    wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
    wallet_name VARCHAR(100) NOT NULL,
    type VARCHAR(20) DEFAULT 'expense', -- 'expense' | 'income'
    amount NUMERIC NOT NULL DEFAULT 0,
    category VARCHAR(100) NOT NULL,
    source_type VARCHAR(50) DEFAULT 'pribadi', -- 'pribadi' | 'warung' | 'fb_marketplace' | 'bisnis_lain'
    description TEXT,
    is_private BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_personal_expenses_user ON public.personal_expenses (user_id, created_at DESC);

-- 9. Tabel Target / Goal Keuangan (financial_goals) - Terisolasi per User
CREATE TABLE IF NOT EXISTS public.financial_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.family_members(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    target_amount NUMERIC NOT NULL DEFAULT 0,
    current_amount NUMERIC NOT NULL DEFAULT 0,
    deadline DATE,
    notes TEXT,
    is_private BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Tabel Anggaran Bulanan (budgets) - Terisolasi per User
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.family_members(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    monthly_limit NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Tabel Portofolio Investasi (investments) - Terisolasi per User
CREATE TABLE IF NOT EXISTS public.investments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.family_members(id) ON DELETE CASCADE,
    asset_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'tabungan' | 'deposito' | 'emas' | 'btc' | 'reksadana' | 'obligasi'
    total_units NUMERIC NOT NULL DEFAULT 0,
    buy_price NUMERIC NOT NULL DEFAULT 0,
    current_price NUMERIC NOT NULL DEFAULT 0,
    notes TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Tabel Inventaris FB Marketplace (marketplace_products) - Terpisah dari Kasir Warung
CREATE TABLE IF NOT EXISTS public.marketplace_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.family_members(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    cost_price NUMERIC NOT NULL DEFAULT 0,
    selling_price NUMERIC NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    min_stock_alert INTEGER NOT NULL DEFAULT 2,
    category VARCHAR(100) DEFAULT 'Umum',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Tabel Transaksi Penjualan FB Marketplace (marketplace_sales)
CREATE TABLE IF NOT EXISTS public.marketplace_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.family_members(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.marketplace_products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    qty INTEGER NOT NULL DEFAULT 1,
    unit_cost NUMERIC NOT NULL DEFAULT 0,
    sold_price NUMERIC NOT NULL DEFAULT 0,
    total_omset NUMERIC NOT NULL DEFAULT 0,
    total_profit NUMERIC NOT NULL DEFAULT 0,
    buyer_name VARCHAR(100),
    destination_wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. Row Level Security & Kebijakan
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restock_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.self_consumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Akses Products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses Sales Transactions" ON public.sales_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses Sales Items" ON public.sales_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses Restock Logs" ON public.restock_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses Self Consumptions" ON public.self_consumptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses Family Members" ON public.family_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses Wallets" ON public.wallets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses Personal Expenses" ON public.personal_expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses Financial Goals" ON public.financial_goals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses Budgets" ON public.budgets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses Investments" ON public.investments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses Marketplace Products" ON public.marketplace_products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses Marketplace Sales" ON public.marketplace_sales FOR ALL USING (true) WITH CHECK (true);

-- 13. Data Awal Produk Warung Sembako, Masakan, Kopi Seduh, dan Pulsa
INSERT INTO public.products (name, cost_price, selling_price, stock, category)
VALUES
    ('Beras Ramos 5kg', 65000, 72000, 10, 'Sembako'),
    ('Minyak Goreng 1L', 15500, 18000, 24, 'Sembako'),
    ('Telur Ayam 1kg', 26000, 29000, 15, 'Sembako'),
    ('Gula Pasir 1kg', 16000, 18000, 20, 'Sembako'),
    ('Indomie Goreng Original', 2800, 3500, 40, 'Makanan'),
    ('Aqua Galon 19L', 19000, 22000, 8, 'Minuman'),
    ('Es Teh Manis Jumbo', 1200, 3000, 99, 'Minuman Seduh'),
    ('Kopi Kapal Api Seduh Panas', 1500, 4000, 99, 'Minuman Seduh'),
    ('Pop Mie Seduh Air Panas', 5500, 8000, 20, 'Minuman Seduh'),
    ('Tahu Walik Crispy (1 Porsi/5 pcs)', 3000, 5000, 30, 'Makanan Olahan'),
    ('Telur Rebus Matang', 2000, 3000, 25, 'Makanan Olahan'),
    ('Donat Kampung Gula Halus', 1500, 2500, 20, 'Makanan Olahan'),
    ('Pulsa Reguler 10.000', 10500, 12000, 999, 'Pulsa & PPOB'),
    ('Token Listrik PLN 20.000', 20500, 23000, 999, 'Pulsa & PPOB')
ON CONFLICT (name) DO NOTHING;

-- 14. Data Awal Pengguna: Hanya 1 User Awal (Kasir Utama)
INSERT INTO public.family_members (id, name, role, pin, avatar_color)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'Kasir Utama', 'family_member', '1234', 'blue')
ON CONFLICT DO NOTHING;

-- 15. Data Awal Dompet Kasir
INSERT INTO public.wallets (id, user_id, name, type, balance, is_private)
VALUES
    ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Laci Kasir Warung', 'cash_warung', 500000, false),
    ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'Dompet Pribadi', 'cash_pribadi', 200000, false)
ON CONFLICT DO NOTHING;
