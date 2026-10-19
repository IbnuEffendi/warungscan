'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, ShoppingCart, Check, Store, Wallet as WalletIcon, Info } from 'lucide-react';
import { Wallet, Product, PersonalExpense } from '@/types';
import { formatRupiah, triggerHaptic, generateUUID } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface ShopExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: Wallet[];
  currentMemberId: string;
  isDbConnected: boolean;
  onRefreshFinance: () => void;
  onProductsUpdate: () => void;
  initialProductName?: string;
  initialAmount?: number;
}

const PRODUCT_CATEGORIES = [
  'Makanan',
  'Minuman',
  'Sembako',
  'Minuman Seduh',
  'Makanan Olahan',
  'Rokok',
  'Kebersihan',
  'Umum',
];

export default function ShopExpenseModal({
  isOpen,
  onClose,
  wallets,
  currentMemberId,
  isDbConnected,
  onRefreshFinance,
  onProductsUpdate,
  initialProductName = '',
  initialAmount = 0,
}: ShopExpenseModalProps) {
  const [expenseName, setExpenseName] = useState(initialProductName);
  const [expenseAmount, setExpenseAmount] = useState<number>(initialAmount);
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [autoCreateProduct, setAutoCreateProduct] = useState(true);
  const [productRetailName, setProductRetailName] = useState(initialProductName);
  const [productCategory, setProductCategory] = useState('Makanan');
  const [productSellingPrice, setProductSellingPrice] = useState<number>(2000);
  const [productStock, setProductStock] = useState<number>(50);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter dompet kas toko / bersama terlebih dahulu, lalu semua dompet
  const availableWallets = useMemo(() => {
    const shared = wallets.filter((w) => !w.is_private || w.type === 'cash_warung');
    return shared.length > 0 ? shared : wallets;
  }, [wallets]);

  useEffect(() => {
    if (isOpen) {
      if (initialProductName) {
        setExpenseName(initialProductName);
        setProductRetailName(initialProductName);
      }
      if (initialAmount > 0) {
        setExpenseAmount(initialAmount);
      }
      if (availableWallets.length > 0 && !selectedWalletId) {
        setSelectedWalletId(availableWallets[0].id);
      }
    }
  }, [isOpen, initialProductName, initialAmount, availableWallets, selectedWalletId]);

  if (!isOpen) return null;

  const selectedWallet = wallets.find((w) => w.id === selectedWalletId) || availableWallets[0];

  const handleExpenseNameChange = (val: string) => {
    setExpenseName(val);
    if (!productRetailName || productRetailName === expenseName) {
      setProductRetailName(val);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseName.trim() || expenseAmount <= 0) {
      alert('Mohon isi nama kulakan dan total belanja uang kas.');
      return;
    }
    if (!selectedWallet) {
      alert('Pilih dompet kas toko sumber pembayaran.');
      return;
    }

    setIsSubmitting(true);
    triggerHaptic(35);

    const costAmount = Number(expenseAmount);
    const updatedWalletBalance = Number(selectedWallet.balance || 0) - costAmount;

    // 1. Buat catatan pengeluaran kas toko
    const expenseId = generateUUID();
    const newExpense: PersonalExpense = {
      id: expenseId,
      created_at: new Date().toISOString(),
      user_id: currentMemberId,
      wallet_id: selectedWallet.id,
      wallet_name: selectedWallet.name,
      type: 'expense',
      amount: costAmount,
      category: 'Operasional Warung',
      source_type: 'warung',
      description: `Belanja stok toko: ${expenseName.trim()} (Modal kasir Rp 0)`,
      is_private: false,
    };

    // 2. Optimistic Update Pengeluaran & Dompet di LocalStorage
    const localExp: PersonalExpense[] = JSON.parse(
      localStorage.getItem('warungscan_personal_expenses') || '[]'
    );
    localExp.unshift(newExpense);
    localStorage.setItem('warungscan_personal_expenses', JSON.stringify(localExp));

    const localWallets: Wallet[] = JSON.parse(
      localStorage.getItem('warungscan_wallets') || '[]'
    );
    const updatedWallets = localWallets.map((w) =>
      w.id === selectedWallet.id ? { ...w, balance: updatedWalletBalance } : w
    );
    localStorage.setItem('warungscan_wallets', JSON.stringify(updatedWallets));

    // 3. Tambahkan / perbarui produk di Kasir dengan modal Rp 0
    if (autoCreateProduct && productRetailName.trim()) {
      const retailName = productRetailName.trim();
      const sPrice = Number(productSellingPrice) || 0;
      const stVal = Number(productStock) || 0;

      const localProducts: Product[] = JSON.parse(
        localStorage.getItem('warungscan_products') || '[]'
      );
      const existingIndex = localProducts.findIndex(
        (p) => p.name.toLowerCase() === retailName.toLowerCase()
      );

      let targetProductId = generateUUID();

      if (existingIndex >= 0) {
        // Update produk yang sudah ada (tambahkan stok, set modal Rp 0)
        targetProductId = localProducts[existingIndex].id;
        localProducts[existingIndex] = {
          ...localProducts[existingIndex],
          cost_price: 0,
          selling_price: sPrice > 0 ? sPrice : localProducts[existingIndex].selling_price,
          stock: Number(localProducts[existingIndex].stock || 0) + stVal,
          category: productCategory,
          updated_at: new Date().toISOString(),
        };
      } else {
        // Buat produk baru dengan modal Rp 0
        const newProduct: Product = {
          id: targetProductId,
          name: retailName,
          category: productCategory,
          cost_price: 0,
          selling_price: sPrice,
          stock: stVal,
          created_at: new Date().toISOString(),
        };
        localProducts.unshift(newProduct);
      }
      localStorage.setItem('warungscan_products', JSON.stringify(localProducts));

      // Sync produk ke Supabase jika terhubung
      if (isDbConnected) {
        try {
          if (existingIndex >= 0) {
            await supabase
              .from('products')
              .update({
                cost_price: 0,
                selling_price: sPrice > 0 ? sPrice : undefined,
                stock: localProducts[existingIndex].stock,
                category: productCategory,
                updated_at: new Date().toISOString(),
              })
              .eq('id', targetProductId);
          } else {
            await supabase.from('products').insert({
              id: targetProductId,
              name: retailName,
              cost_price: 0,
              selling_price: sPrice,
              stock: stVal,
              category: productCategory,
            });
          }
        } catch (dbErr) {
          console.warn('Sync produk modal 0 notice:', dbErr);
        }
      }
    }

    // 4. Sync Pengeluaran & Dompet ke Supabase
    if (isDbConnected) {
      try {
        await supabase.from('personal_expenses').insert(newExpense);
        await supabase
          .from('wallets')
          .update({ balance: updatedWalletBalance })
          .eq('id', selectedWallet.id);
      } catch (dbErr) {
        console.warn('Sync pengeluaran kas toko notice:', dbErr);
      }
    }

    setIsSubmitting(false);
    onRefreshFinance();
    onProductsUpdate();
    onClose();

    alert(
      `Alhamdulillah! Belanja stok "${expenseName}" sebesar ${formatRupiah(
        costAmount
      )} berhasil dicatat dari ${selectedWallet.name}.\n` +
        (autoCreateProduct
          ? `Produk "${productRetailName}" siap dijual di kasir dengan Modal Rp 0.`
          : 'Uang kas toko telah dipotong sesuai pengeluaran.')
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 max-h-[92vh] flex flex-col shadow-2xl">
        {/* HEADER MODAL */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
              <Store className="w-5 h-5 text-amber-800" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Belanja Stok Toko (Modal Di Muka)
              </h3>
              <p className="text-[11px] text-slate-500 font-semibold">
                Potong kas toko langsung, jual di kasir modal Rp 0
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700"
            style={{ minWidth: '44px', minHeight: '44px' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PENJELASAN RAMAH KELUARGA / ORANG TUA */}
        <div className="my-2.5 p-3 rounded-2xl bg-amber-50/90 border border-amber-200/80 text-amber-950 flex items-start space-x-2 text-xs">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            <span className="font-black">Sangat mudah untuk orang tua:</span> Contohnya beli
            kerupuk 1 bal atau es batu balok. Uang beli langsung dicatat di pengeluaran kas toko,
            sehingga saat menjual di kasir modalnya Rp 0 tanpa perlu repot menghitung HPP per
            bungkus.
          </p>
        </div>

        {/* FORM BELANJA MODAL TOKO */}
        <form onSubmit={handleSubmit} className="overflow-y-auto pr-0.5 space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Nama Kulakan / Pembelian Stok
            </label>
            <input
              type="text"
              required
              value={expenseName}
              onChange={(e) => handleExpenseNameChange(e.target.value)}
              placeholder="Contoh: Kerupuk Ikan 1 Bal, Es Batu Balok, Minyak Jerigen"
              className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Total Biaya Belanja (Rp)
              </label>
              <input
                type="number"
                required
                min="1000"
                value={expenseAmount || ''}
                onChange={(e) => setExpenseAmount(Number(e.target.value))}
                placeholder="50000"
                className="w-full p-2.5 rounded-xl border border-slate-300 font-black text-slate-900 bg-white text-sm"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Bayar Pakai Kas / Dompet
              </label>
              <select
                value={selectedWalletId}
                onChange={(e) => setSelectedWalletId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 bg-white"
              >
                {availableWallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({formatRupiah(w.balance)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* OPSI OTOMATIS DAFTARKAN KE KASIR DENGAN MODAL RP 0 */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
            <label className="flex items-start space-x-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoCreateProduct}
                onChange={(e) => setAutoCreateProduct(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-white border-slate-300 mt-0.5"
              />
              <div>
                <span className="font-extrabold text-slate-900 text-xs block">
                  Daftarkan / Update Produk di Kasir (Modal Rp 0)
                </span>
                <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">
                  Produk langsung siap dijual di layar kasir dengan harga modal Rp 0, seluruh hasil
                  penjualan akan masuk menjadi omset kas toko.
                </span>
              </div>
            </label>

            {autoCreateProduct && (
              <div className="pt-2 border-t border-slate-200 space-y-2.5 animate-in fade-in">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nama Jual di Kasir
                  </label>
                  <input
                    type="text"
                    required={autoCreateProduct}
                    value={productRetailName}
                    onChange={(e) => setProductRetailName(e.target.value)}
                    placeholder="Contoh: Kerupuk Ikan Bungkus"
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 bg-white"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Kategori</label>
                    <select
                      value={productCategory}
                      onChange={(e) => setProductCategory(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 bg-white text-[11px]"
                    >
                      {PRODUCT_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Harga Jual (Rp)</label>
                    <input
                      type="number"
                      required={autoCreateProduct}
                      min="100"
                      value={productSellingPrice || ''}
                      onChange={(e) => setProductSellingPrice(Number(e.target.value))}
                      placeholder="2000"
                      className="w-full p-2.5 rounded-xl border border-emerald-400 font-black text-emerald-900 bg-emerald-50/40 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Jumlah Stok</label>
                    <input
                      type="number"
                      required={autoCreateProduct}
                      min="1"
                      value={productStock || ''}
                      onChange={(e) => setProductStock(Number(e.target.value))}
                      placeholder="50"
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 bg-white text-xs"
                    />
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-[11px]">
                  <span className="font-bold">Perhitungan Kasir:</span> Modal tercatat:{' '}
                  <span className="font-extrabold text-emerald-800">Rp 0</span>. Jika terjual{' '}
                  {productStock} bungkus seharga {formatRupiah(productSellingPrice)}, uang masuk kas
                  toko:{' '}
                  <span className="font-black text-emerald-900">
                    {formatRupiah(productStock * productSellingPrice)}
                  </span>
                  .
                </div>
              </div>
            )}
          </div>

          {/* TOMBOL AKSI */}
          <div className="flex space-x-2 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 font-black text-slate-950 text-xs shadow-xs flex items-center justify-center space-x-1.5 transition-colors"
              style={{ minHeight: '44px' }}
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Memproses...' : 'Simpan & Potong Kas Toko'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-colors"
              style={{ minHeight: '44px' }}
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
