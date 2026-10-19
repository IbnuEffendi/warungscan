export interface Product {
  id: string;
  name: string;
  cost_price: number;
  selling_price: number;
  stock: number;
  category?: string; // 'Sembako' | 'Minuman Seduh' | 'Makanan Olahan' | 'Pulsa & PPOB' | 'Umum'
  created_at?: string;
  updated_at?: string;
}

export interface CartItem {
  product: Product;
  qty: number;
}

export interface SalesTransaction {
  id: string;
  created_at: string;
  total_amount: number;
  total_profit: number;
  payment_method: string;
  cashier_name?: string;
  notes?: string;
}

export interface SalesItem {
  id: string;
  transaction_id: string;
  product_id: string;
  product_name: string;
  qty: number;
  unit_price: number;
  unit_cost: number;
  subtotal: number;
}

export interface ScannedReceiptItem {
  id?: string;
  nama_barang: string;
  qty: number; // Jumlah unit eceran akhir yang akan masuk ke stok toko
  pack_qty?: number; // Jumlah kemasan/dus/kotak di struk belanja
  isi_per_kemasan?: number; // Jumlah isi satuan per 1 kemasan (misal 24 untuk 24's)
  tipe_kemasan?: string; // 'Satuan' | 'Kotak' | 'Dus' | 'Renceng'
  harga_satuan: number; // Modal per 1 biji/eceran
  total_harga: number; // Total bayar di struk untuk item ini
  matched_product_id?: string;
  match_confidence?: number;
  new_selling_price?: number; // Harga jual eceran per 1 biji
}

export interface RestockLog {
  id: string;
  created_at: string;
  receipt_image_url?: string;
  raw_json_extracted: ScannedReceiptItem[];
  total_expense: number;
  notes?: string;
}

export interface SelfConsumption {
  id: string;
  created_at: string;
  product_id?: string;
  product_name: string;
  qty: number;
  cost_price: number;
  total_cost: number;
  reason: string;
  user_name?: string;
  notes?: string;
}

export interface ShoppingItem {
  id: string;
  product_id?: string;
  name: string;
  current_stock: number;
  recommended_qty: number;
  target_qty: number;
  unit_estimate_price?: number;
  is_selected: boolean;
  status: 'pending' | 'bought' | 'not_found';
  notes?: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  role: 'super_admin' | 'family_member';
  pin: string;
  avatar_color?: string;
  created_at?: string;
}

export interface Wallet {
  id: string;
  user_id: string; // Terisolasi per user (kecuali laci kasir warung)
  name: string;
  type: 'cash_warung' | 'cash_pribadi' | 'bank' | 'ewallet';
  balance: number;
  is_private: boolean;
}

export type ExpenseCategory =
  | 'Bensin & Transport'
  | 'Listrik & Air'
  | 'Belanja Dapur/Pasar'
  | 'Uang Jajan Anak'
  | 'Belanja Online'
  | 'Operasional Warung'
  | 'Jualan FB Marketplace'
  | 'Bisnis Lain'
  | 'Gaji & Hasil Usaha'
  | 'Lain-lain';

export interface PersonalExpense {
  id: string;
  created_at: string;
  user_id: string; // Terisolasi per user
  wallet_id: string;
  wallet_name: string;
  type: 'expense' | 'income';
  amount: number;
  category: ExpenseCategory | string;
  source_type: 'pribadi' | 'warung' | 'fb_marketplace' | 'bisnis_lain';
  description: string;
  is_private: boolean;
}

export interface Budget {
  id: string;
  user_id: string;
  category: string;
  monthly_limit: number;
  spent_amount?: number;
}

export interface FinancialGoal {
  id: string;
  user_id?: string; // Terisolasi per user
  title?: string;
  name?: string; // Backwards compatibility
  target_amount: number;
  current_amount: number;
  deadline?: string;
  notes?: string;
  is_private?: boolean;
  created_at?: string;
}

export type InvestmentCategory =
  | 'tabungan'
  | 'deposito'
  | 'emas'
  | 'btc'
  | 'reksadana'
  | 'obligasi';

export interface InvestmentAsset {
  id: string;
  user_id: string; // Terisolasi per user
  asset_name: string;
  category: InvestmentCategory;
  total_units: number; // Jumlah gram, lembar, koin, atau saldo
  buy_price: number; // Rata-rata modal per unit
  current_price: number; // Harga pasar per unit saat ini
  notes?: string;
  updated_at?: string;
}

export interface MarketplaceProduct {
  id: string;
  user_id: string; // Terisolasi per user
  name: string;
  cost_price: number; // Modal beli barang
  selling_price: number; // Harga tawar/jual patokan di FB
  stock: number;
  min_stock_alert: number;
  category?: string;
  notes?: string;
  created_at: string;
}

export interface MarketplaceSale {
  id: string;
  user_id: string; // Terisolasi per user
  product_id: string;
  product_name: string;
  qty: number;
  unit_cost: number;
  sold_price: number; // Harga riil deal setelah nego
  total_omset: number;
  total_profit: number;
  buyer_name?: string;
  destination_wallet_id?: string;
  created_at: string;
}

export interface HppIngredient {
  id: string;
  name: string;
  cost: number;
}

export interface HppRecipe {
  id: string;
  name: string;
  type: 'bulk_to_retail' | 'recipe';
  portions: number;
  ingredients: HppIngredient[];
  total_cost: number;
  cost_per_portion: number;
  selling_price: number;
  margin_percent: number;
  profit_per_portion: number;
  created_at: string;
}


