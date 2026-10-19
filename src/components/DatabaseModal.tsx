'use client';

import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, Database, AlertCircle } from 'lucide-react';
import { triggerHaptic } from '@/lib/utils';

interface DatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDbConnected: boolean;
  onRefreshDb: () => void;
}

const SQL_SCHEMA = `-- Schema Database WarungScan Lengkap
-- Jalankan skrip ini di SQL Editor Supabase Anda

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

CREATE TABLE IF NOT EXISTS public.sales_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_amount NUMERIC NOT NULL DEFAULT 0,
    total_profit NUMERIC NOT NULL DEFAULT 0,
    payment_method VARCHAR(50) DEFAULT 'Tunai',
    cashier_name VARCHAR(100) DEFAULT 'Kasir',
    notes TEXT
);

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

CREATE TABLE IF NOT EXISTS public.restock_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    receipt_image_url TEXT,
    raw_json_extracted JSONB,
    total_expense NUMERIC NOT NULL DEFAULT 0,
    notes TEXT
);

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

CREATE TABLE IF NOT EXISTS public.family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'family_member',
    pin VARCHAR(20) DEFAULT '1234',
    avatar_color VARCHAR(50) DEFAULT 'blue',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES public.family_members(id) ON DELETE CASCADE,
    type VARCHAR(50) DEFAULT 'cash_pribadi',
    balance NUMERIC NOT NULL DEFAULT 0,
    is_private BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.personal_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES public.family_members(id) ON DELETE CASCADE,
    wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
    wallet_name VARCHAR(100) NOT NULL,
    type VARCHAR(20) DEFAULT 'expense',
    amount NUMERIC NOT NULL DEFAULT 0,
    category VARCHAR(100) NOT NULL,
    source_type VARCHAR(50) DEFAULT 'pribadi',
    description TEXT,
    is_private BOOLEAN DEFAULT false
);

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

CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.family_members(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    monthly_limit NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.investments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id REFERENCES public.family_members(id) ON DELETE CASCADE,
    asset_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    total_units NUMERIC NOT NULL DEFAULT 0,
    buy_price NUMERIC NOT NULL DEFAULT 0,
    current_price NUMERIC NOT NULL DEFAULT 0,
    notes TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

INSERT INTO public.family_members (id, name, role, pin, avatar_color)
VALUES ('00000000-0000-0000-0000-000000000001', 'Kasir Utama', 'family_member', '1234', 'blue')
ON CONFLICT DO NOTHING;

INSERT INTO public.wallets (id, user_id, name, type, balance, is_private)
VALUES ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Laci Kasir Warung', 'cash_warung', 500000, false)
ON CONFLICT DO NOTHING;`;

export default function DatabaseModal({
  isOpen,
  onClose,
  isDbConnected,
  onRefreshDb,
}: DatabaseModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    triggerHaptic(30);
    navigator.clipboard.writeText(SQL_SCHEMA);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-5 max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-emerald-700" />
            <h2 className="text-lg font-bold text-slate-900">Status Database</h2>
          </div>
          <button
            onClick={() => {
              triggerHaptic(20);
              onClose();
            }}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto py-3 space-y-3.5 text-sm text-slate-700">
          <div
            className={`p-3.5 rounded-xl border flex items-start space-x-2.5 ${
              isDbConnected
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            {isDbConnected ? (
              <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-bold">
                {isDbConnected
                  ? 'Database Supabase Terhubung Aktif'
                  : 'Tabel Belum Dibuat di Supabase'}
              </p>
              <p className="text-xs mt-0.5">
                {isDbConnected
                  ? 'Semua data produk, transaksi, dan riwayat kulakan tersimpan di cloud Supabase.'
                  : 'Jalankan skrip SQL di bawah ini satu kali di Supabase Dashboard untuk membuat tabel otomatis.'}
              </p>
            </div>
          </div>

          {!isDbConnected && (
            <>
              <div className="space-y-2">
                <p className="font-semibold text-slate-900 text-xs uppercase tracking-wider">
                  Cara Pasang Tabel (1 Menit):
                </p>
                <ol className="list-decimal pl-4 space-y-1 text-xs text-slate-600">
                  <li>
                    Klik tombol <strong>"Salin Skrip SQL"</strong> di bawah.
                  </li>
                  <li>
                    Buka Supabase SQL Editor lewat tombol biru di bawah.
                  </li>
                  <li>Tempel (Paste) skrip di sana, lalu klik tombol <strong>"Run"</strong> hijau.</li>
                  <li>Kembali ke aplikasi ini dan klik <strong>"Cek Ulang Database"</strong>.</li>
                </ol>
              </div>

              <div className="flex flex-col space-y-2 pt-1">
                <button
                  onClick={handleCopy}
                  className={`w-full py-3 px-4 rounded-xl font-bold flex items-center justify-center space-x-2 transition-all shadow-sm ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-98'
                  }`}
                  style={{ minHeight: '48px' }}
                >
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  <span>{copied ? 'Skrip SQL Berhasil Disalin!' : 'Salin Skrip SQL'}</span>
                </button>

                <a
                  href="https://supabase.com/dashboard/project/rttfpiypbvthxuordrac/sql/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl font-bold border-2 border-emerald-700 text-emerald-800 hover:bg-emerald-50 active:bg-emerald-100 flex items-center justify-center space-x-2 text-center"
                  style={{ minHeight: '48px' }}
                >
                  <span>Buka SQL Editor Supabase</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </>
          )}

          <div className="pt-2">
            <button
              onClick={() => {
                triggerHaptic(25);
                onRefreshDb();
              }}
              className="w-full py-3 rounded-xl bg-emerald-700 text-white font-bold hover:bg-emerald-800 active:bg-emerald-900 text-center transition-colors"
              style={{ minHeight: '48px' }}
            >
              Cek Ulang Koneksi Database
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
