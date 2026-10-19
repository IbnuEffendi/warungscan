'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Minus,
  ShoppingCart,
  Trash2,
  CheckCircle2,
  ArrowRight,
  X,
  AlertCircle,
  Utensils,
  Wallet,
} from 'lucide-react';
import { Product, CartItem, Wallet as WalletType } from '@/types';
import { formatRupiah, triggerHaptic } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface PosViewProps {
  products: Product[];
  onProductsUpdate: () => void;
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  isDbConnected: boolean;
  wallets?: WalletType[];
  currentMemberId?: string;
  onRefreshFinance?: () => void;
}

const SELF_CONSUMPTION_REASONS = [
  'Dimakan Sendiri / Jajan',
  'Untuk Masak Rumah',
  'Kebutuhan Rumah Tangga',
  'Rusak / Basi',
];

export default function PosView({
  products,
  onProductsUpdate,
  cart,
  setCart,
  isDbConnected,
  wallets = [],
  currentMemberId = '',
  onRefreshFinance,
}: PosViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'self_consumption'>('cash');
  const [selfReason, setSelfReason] = useState(SELF_CONSUMPTION_REASONS[0]);
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedTransaction, setCompletedTransaction] = useState<any>(null);

  // Ambil daftar kategori unik
  const categories = useMemo(() => {
    const cats = new Set<string>(['Semua']);
    products.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats);
  }, [products]);

  // Filter produk berdasarkan pencarian dan kategori
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'Semua' || p.category === selectedCategory;
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(p.selling_price).includes(searchQuery);
      return matchCat && matchSearch;
    });
  }, [products, searchQuery, selectedCategory]);

  // Hitung total belanjaan di keranjang
  const totalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.selling_price * item.qty, 0);
  }, [cart]);

  const totalCost = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.cost_price * item.qty, 0);
  }, [cart]);

  const totalItemsCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.qty, 0);
  }, [cart]);

  const changeAmount = cashAmount - totalAmount;

  const addToCart = (product: Product) => {
    triggerHaptic(20);
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    triggerHaptic(20);
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === productId);
      if (existing && existing.qty > 1) {
        return prev.map((item) =>
          item.product.id === productId ? { ...item, qty: item.qty - 1 } : item
        );
      }
      return prev.filter((item) => item.product.id !== productId);
    });
  };

  const getQtyInCart = (productId: string) => {
    return cart.find((item) => item.product.id === productId)?.qty || 0;
  };

  const handleOpenPayment = () => {
    triggerHaptic(30);
    setPaymentMode('cash');
    setCashAmount(totalAmount);
    setIsPaymentOpen(true);
  };

  const handleQuickCash = (amount: number) => {
    triggerHaptic(20);
    setCashAmount(amount);
  };

  // Simpan Transaksi (Bisa Tunai atau Dipakai Sendiri)
  const handleFinishTransaction = async () => {
    if (cart.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    triggerHaptic(40);

    const isSelf = paymentMode === 'self_consumption';
    const profit = isSelf ? 0 : totalAmount - totalCost;

    try {
      if (isDbConnected) {
        if (isSelf) {
          // 1. Simpan ke self_consumptions untuk setiap item
          const records = cart.map((item) => ({
            product_id: item.product.id,
            product_name: item.product.name,
            qty: item.qty,
            cost_price: item.product.cost_price,
            total_cost: item.product.cost_price * item.qty,
            reason: selfReason,
            created_at: new Date().toISOString(),
          }));

          await supabase.from('self_consumptions').insert(records);
        } else {
          // 1. Simpan ke sales_transactions
          const { data: transData, error: transError } = await supabase
            .from('sales_transactions')
            .insert({
              total_amount: totalAmount,
              total_profit: profit,
              payment_method: 'Tunai',
            })
            .select()
            .single();

          if (transError) throw transError;

          // 2. Simpan item ke sales_items
          const salesItemsData = cart.map((item) => ({
            transaction_id: transData.id,
            product_id: item.product.id,
            product_name: item.product.name,
            qty: item.qty,
            unit_price: item.product.selling_price,
            unit_cost: item.product.cost_price,
            subtotal: item.product.selling_price * item.qty,
          }));

          const { error: itemsError } = await supabase.from('sales_items').insert(salesItemsData);
          if (itemsError) throw itemsError;
        }

        // Potong stok produk di database
        for (const item of cart) {
          const newStock = Math.max(0, item.product.stock - item.qty);
          await supabase
            .from('products')
            .update({ stock: newStock, updated_at: new Date().toISOString() })
            .eq('id', item.product.id);
        }
      } else {
        // Mode Demo Lokal
        if (isSelf) {
          const localSC = JSON.parse(
            localStorage.getItem('warungscan_self_consumption') || '[]'
          );
          cart.forEach((item) => {
            localSC.unshift({
              id: 'sc-' + Date.now() + Math.random(),
              product_id: item.product.id,
              product_name: item.product.name,
              qty: item.qty,
              cost_price: item.product.cost_price,
              total_cost: item.product.cost_price * item.qty,
              reason: selfReason,
              created_at: new Date().toISOString(),
            });
          });
          localStorage.setItem('warungscan_self_consumption', JSON.stringify(localSC));
        } else {
          const localSales = JSON.parse(localStorage.getItem('warungscan_sales') || '[]');
          localSales.unshift({
            id: 'local-' + Date.now(),
            created_at: new Date().toISOString(),
            total_amount: totalAmount,
            total_profit: profit,
            payment_method: 'Tunai',
            items: cart,
          });
          localStorage.setItem('warungscan_sales', JSON.stringify(localSales));
        }

        const localProducts = JSON.parse(localStorage.getItem('warungscan_products') || '[]');
        const updated = localProducts.map((p: Product) => {
          const inCart = cart.find((c) => c.product.id === p.id);
          return inCart ? { ...p, stock: Math.max(0, p.stock - inCart.qty) } : p;
        });
        localStorage.setItem('warungscan_products', JSON.stringify(updated));
      }

      setCompletedTransaction({
        isSelfConsumption: isSelf,
        selfReason: isSelf ? selfReason : undefined,
        totalAmount: isSelf ? 0 : totalAmount,
        totalCost: totalCost,
        cashAmount: isSelf ? 0 : cashAmount,
        changeAmount: isSelf ? 0 : changeAmount,
        profit: isSelf ? 0 : profit,
        itemsCount: totalItemsCount,
        date: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      });

      setCart([]);
      setIsPaymentOpen(false);
      onProductsUpdate();
    } catch (err: any) {
      console.error('Gagal menyimpan transaksi:', err);
      alert('Gagal mencatat: ' + (err.message || 'Error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 pb-24">
      {/* Kolom Pencarian Cepat */}
      <div className="p-3 bg-white border-b border-slate-200 sticky top-14 z-20 shadow-xs">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ketik nama barang (contoh: beras, telur)..."
            className="w-full pl-11 pr-10 py-3 rounded-xl border border-slate-300 text-base font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent bg-slate-50"
            style={{ fontSize: '16px' }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Filter Kategori */}
        {categories.length > 1 && (
          <div className="flex space-x-2 mt-2.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  triggerHaptic(15);
                  setSelectedCategory(cat);
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-emerald-700 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Daftar Produk */}
      <div className="p-3 space-y-2.5 flex-1">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12 px-4 bg-white rounded-2xl border border-dashed border-slate-300 my-4">
            <p className="text-slate-500 font-medium">Barang tidak ditemukan.</p>
            <p className="text-xs text-slate-400 mt-1">
              Coba kata kunci lain atau tambah barang lewat menu "Barang".
            </p>
          </div>
        ) : (
          filteredProducts.map((product) => {
            const inCart = getQtyInCart(product.id);
            const isOutOfStock = product.stock <= 0;

            return (
              <div
                key={product.id}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                  inCart > 0
                    ? 'bg-emerald-50/70 border-emerald-300 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex-1 pr-3">
                  <h3 className="font-bold text-slate-900 text-base leading-snug">
                    {product.name}
                  </h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-base font-extrabold text-emerald-700">
                      {formatRupiah(product.selling_price)}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-md font-semibold ${
                        isOutOfStock
                          ? 'bg-red-100 text-red-700'
                          : product.stock < 5
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      Stok: {product.stock}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0">
                  {inCart > 0 && (
                    <>
                      <button
                        onClick={() => removeFromCart(product.id)}
                        className="w-11 h-11 rounded-xl bg-slate-200 text-slate-800 font-bold flex items-center justify-center hover:bg-slate-300 active:scale-95 transition-transform"
                        aria-label="Kurangi barang"
                      >
                        <Minus className="w-5 h-5" />
                      </button>
                      <span className="w-8 text-center font-extrabold text-lg text-emerald-900">
                        {inCart}
                      </span>
                    </>
                  )}

                  <button
                    onClick={() => addToCart(product)}
                    className="w-12 h-11 rounded-xl bg-emerald-700 text-white font-bold flex items-center justify-center hover:bg-emerald-800 active:scale-95 shadow-xs transition-transform"
                    aria-label="Tambah barang ke kasir"
                  >
                    <Plus className="w-6 h-6" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Bottom Cart Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-19 left-0 right-0 max-w-md mx-auto px-3 z-30 animate-in slide-in-from-bottom-5">
          <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-xl flex items-center justify-between border border-slate-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center font-bold text-white shrink-0">
                {totalItemsCount}
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Total Keranjang</p>
                <p className="text-lg font-extrabold text-white leading-tight">
                  {formatRupiah(totalAmount)}
                </p>
              </div>
            </div>

            <button
              onClick={handleOpenPayment}
              className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 font-extrabold text-white flex items-center space-x-2 transition-all shadow-md"
              style={{ minHeight: '48px' }}
            >
              <span>Bayar / Simpan</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* MODAL PEMBAYARAN & PILIHAN PAKAI SENDIRI */}
      {isPaymentOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 max-h-[92vh] flex flex-col shadow-2xl">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-xl font-extrabold text-slate-900">Selesaikan Transaksi</h2>
              <button
                onClick={() => {
                  triggerHaptic(20);
                  setIsPaymentOpen(false);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* TAB PILIHAN: PEMBELI BAYAR vs DIPAKAI SENDIRI */}
            <div className="grid grid-cols-2 p-1 bg-slate-200 rounded-2xl mt-3">
              <button
                onClick={() => {
                  triggerHaptic(20);
                  setPaymentMode('cash');
                }}
                className={`py-3 rounded-xl font-extrabold text-xs flex items-center justify-center space-x-1.5 transition-all ${
                  paymentMode === 'cash'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Wallet className="w-4 h-4" />
                <span>Pembeli Bayar Tunai</span>
              </button>
              <button
                onClick={() => {
                  triggerHaptic(20);
                  setPaymentMode('self_consumption');
                }}
                className={`py-3 rounded-xl font-extrabold text-xs flex items-center justify-center space-x-1.5 transition-all ${
                  paymentMode === 'self_consumption'
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Utensils className="w-4 h-4" />
                <span>Dipakai Sendiri / Rumah</span>
              </button>
            </div>

            <div className="overflow-y-auto py-3 space-y-3.5 flex-1">
              {/* Rincian Barang di Keranjang */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 max-h-32 overflow-y-auto">
                {cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex justify-between text-xs text-slate-700"
                  >
                    <span className="font-medium">
                      {item.product.name} × {item.qty}
                    </span>
                    <span className="font-bold text-slate-900">
                      {formatRupiah(item.product.selling_price * item.qty)}
                    </span>
                  </div>
                ))}
              </div>

              {/* JIKA MODE: DIPAKAI SENDIRI / KEBUTUHAN RUMAH */}
              {paymentMode === 'self_consumption' ? (
                <div className="space-y-3">
                  <div className="p-3.5 bg-orange-50 border-2 border-orange-200 rounded-2xl text-center">
                    <span className="text-xs uppercase tracking-wider text-orange-900 font-extrabold">
                      Nilai Modal Barang yang Diambil
                    </span>
                    <p className="text-3xl font-black text-orange-900 mt-0.5">
                      {formatRupiah(totalCost)}
                    </p>
                    <p className="text-[11px] text-orange-800/80 mt-1">
                      Tidak ada uang kas masuk (Rp 0). Stok barang otomatis terpotong dan dicatat
                      ke laporan pengeluaran pribadi.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Keperluan Pengambilan
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {SELF_CONSUMPTION_REASONS.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => {
                            triggerHaptic(15);
                            setSelfReason(r);
                          }}
                          className={`p-2.5 rounded-xl font-bold text-xs text-left border transition-all ${
                            selfReason === r
                              ? 'bg-orange-50 border-orange-400 text-orange-900 shadow-xs'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* JIKA MODE: PEMBELI BAYAR TUNAI */
                <div className="space-y-3.5">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
                    <span className="text-xs uppercase tracking-wider text-emerald-800 font-bold">
                      Total yang Harus Dibayar Pembeli
                    </span>
                    <p className="text-3xl font-black text-emerald-800 mt-0.5">
                      {formatRupiah(totalAmount)}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Uang Diterima dari Pembeli (Rp)
                    </label>
                    <input
                      type="number"
                      value={cashAmount || ''}
                      onChange={(e) =>
                        setCashAmount(Math.max(0, parseInt(e.target.value, 10) || 0))
                      }
                      placeholder="0"
                      className="w-full text-center text-2xl font-black p-3.5 rounded-xl border-2 border-slate-300 focus:border-emerald-600 focus:outline-none bg-white text-slate-900"
                      style={{ minHeight: '52px' }}
                    />

                    <div className="grid grid-cols-3 gap-1.5 mt-2">
                      <button
                        onClick={() => handleQuickCash(totalAmount)}
                        className="py-2.5 px-1 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-800 text-xs border border-slate-200"
                      >
                        Uang Pas
                      </button>
                      <button
                        onClick={() => handleQuickCash(10000)}
                        className="py-2.5 px-1 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-800 text-xs border border-slate-200"
                      >
                        10.000
                      </button>
                      <button
                        onClick={() => handleQuickCash(20000)}
                        className="py-2.5 px-1 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-800 text-xs border border-slate-200"
                      >
                        20.000
                      </button>
                      <button
                        onClick={() => handleQuickCash(50000)}
                        className="py-2.5 px-1 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-800 text-xs border border-slate-200"
                      >
                        50.000
                      </button>
                      <button
                        onClick={() => handleQuickCash(100000)}
                        className="py-2.5 px-1 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-800 text-xs border border-slate-200"
                      >
                        100.000
                      </button>
                      <button
                        onClick={() => handleQuickCash(200000)}
                        className="py-2.5 px-1 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-800 text-xs border border-slate-200"
                      >
                        200.000
                      </button>
                    </div>
                  </div>

                  <div
                    className={`p-3 rounded-2xl text-center border-2 ${
                      changeAmount >= 0
                        ? 'bg-slate-900 border-slate-800 text-white'
                        : 'bg-red-50 border-red-300 text-red-900'
                    }`}
                  >
                    <p className="text-xs uppercase tracking-wider font-bold opacity-80">
                      {changeAmount >= 0 ? 'Uang Kembalian' : 'Uang Masih Kurang'}
                    </p>
                    <p
                      className={`text-2xl font-black mt-0.5 ${
                        changeAmount >= 0 ? 'text-emerald-400' : 'text-red-600'
                      }`}
                    >
                      {formatRupiah(Math.abs(changeAmount))}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Tombol Simpan Final */}
            <div className="pt-2 border-t border-slate-200">
              {paymentMode === 'self_consumption' ? (
                <button
                  disabled={isSubmitting}
                  onClick={handleFinishTransaction}
                  className="w-full py-4 rounded-2xl font-black text-base bg-orange-600 hover:bg-orange-700 text-white shadow-md flex items-center justify-center space-x-2 active:scale-98 transition-all"
                  style={{ minHeight: '56px' }}
                >
                  <CheckCircle2 className="w-6 h-6" />
                  <span>{isSubmitting ? 'Mencatat...' : 'CATAT PAKAI SENDIRI'}</span>
                </button>
              ) : (
                <button
                  disabled={cashAmount < totalAmount || isSubmitting}
                  onClick={handleFinishTransaction}
                  className={`w-full py-4 rounded-2xl font-black text-base transition-all shadow-md flex items-center justify-center space-x-2 ${
                    cashAmount < totalAmount || isSubmitting
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-emerald-700 hover:bg-emerald-800 text-white active:scale-98'
                  }`}
                  style={{ minHeight: '56px' }}
                >
                  <CheckCircle2 className="w-6 h-6" />
                  <span>{isSubmitting ? 'Menyimpan...' : 'SIMPAN PENJUALAN'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STRUK TRANSAKSI SUKSES */}
      {completedTransaction && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 animate-in zoom-in-95">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${
                completedTransaction.isSelfConsumption
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h3 className="text-2xl font-extrabold text-slate-900">
              {completedTransaction.isSelfConsumption
                ? 'Dicatat Pakai Sendiri!'
                : 'Penjualan Berhasil!'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tercatat pada {completedTransaction.date}
            </p>

            <div className="bg-slate-50 p-4 rounded-2xl my-4 space-y-2 text-left border border-slate-200 text-sm">
              {completedTransaction.isSelfConsumption ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Keperluan:</span>
                    <span className="font-bold text-slate-900">
                      {completedTransaction.selfReason}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Jumlah Barang:</span>
                    <span className="font-bold text-slate-900">
                      {completedTransaction.itemsCount} pcs
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 text-base">
                    <span className="font-bold text-slate-800">Total Nilai Modal:</span>
                    <span className="font-extrabold text-orange-700">
                      {formatRupiah(completedTransaction.totalCost)}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total Belanja:</span>
                    <span className="font-bold text-slate-900">
                      {formatRupiah(completedTransaction.totalAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Uang Diterima:</span>
                    <span className="font-bold text-slate-900">
                      {formatRupiah(completedTransaction.cashAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 text-base">
                    <span className="font-bold text-slate-800">Kembalian:</span>
                    <span className="font-extrabold text-emerald-700">
                      {formatRupiah(completedTransaction.changeAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 pt-1">
                    <span>Perkiraan Keuntungan:</span>
                    <span className="font-semibold text-emerald-600">
                      +{formatRupiah(completedTransaction.profit)}
                    </span>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => {
                triggerHaptic(25);
                setCompletedTransaction(null);
              }}
              className="w-full py-4 rounded-2xl bg-emerald-700 text-white font-extrabold text-base hover:bg-emerald-800 active:scale-98 transition-all"
              style={{ minHeight: '52px' }}
            >
              Transaksi Berikutnya
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
