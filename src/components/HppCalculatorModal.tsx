'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Calculator,
  Plus,
  Trash2,
  Check,
  Sparkles,
  ArrowRight,
  Bookmark,
  Store,
  Info,
  Layers,
  Utensils,
  Coffee,
  Package,
} from 'lucide-react';
import { HppIngredient, HppRecipe, Product, Wallet, PersonalExpense } from '@/types';
import { formatRupiah, triggerHaptic, generateUUID } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface HppCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  products?: Product[];
  wallets?: Wallet[];
  currentMemberId?: string;
  isDbConnected?: boolean;
  onRefreshFinance?: () => void;
  onProductsUpdate?: () => void;
  onApplyHpp?: (costPrice: number, sellingPrice: number, productName: string) => void;
}

// Preset Resep Praktis untuk Membantu Orang Tua Langsung Pakai
const HPP_PRESETS: {
  title: string;
  icon: string;
  type: 'recipe' | 'bulk_to_retail';
  portions: number;
  ingredients: { name: string; cost: number }[];
  suggestedSellingPrice: number;
  category: string;
}[] = [
  {
    title: 'Es Teh Manis Jumbo',
    icon: '🥤',
    type: 'recipe',
    portions: 1,
    ingredients: [
      { name: 'Teh Celup / Tubruk Wangi', cost: 500 },
      { name: 'Gula Pasir (2 sendok)', cost: 700 },
      { name: 'Es Batu Kristal', cost: 300 },
      { name: 'Cup Plastik Jumbo + Tutup + Sedotan', cost: 500 },
    ],
    suggestedSellingPrice: 4000,
    category: 'Minuman Seduh',
  },
  {
    title: 'Tahu Walik Crispy (10 Porsi)',
    icon: '🥟',
    type: 'recipe',
    portions: 10,
    ingredients: [
      { name: 'Tahu Pong Cokelat (50 biji)', cost: 15000 },
      { name: 'Daging Ayam Cincang & Tepung Tapioka', cost: 18000 },
      { name: 'Bumbu Bawang & Daun Bawang', cost: 3000 },
      { name: 'Minyak Goreng & Gas Masak', cost: 6000 },
      { name: 'Cabe Rawit & Saus Cocolan', cost: 3000 },
    ],
    suggestedSellingPrice: 8000,
    category: 'Makanan Olahan',
  },
  {
    title: 'Kerupuk Ikan 1 Bal (50 Bungkus)',
    icon: '🥨',
    type: 'bulk_to_retail',
    portions: 50,
    ingredients: [
      { name: 'Kerupuk Ikan 1 Bal Matang', cost: 50000 },
      { name: 'Plastik Pembungkus & Tali Karet', cost: 3000 },
    ],
    suggestedSellingPrice: 2000,
    category: 'Makanan',
  },
  {
    title: 'Es Batu Plastik Eceran (10 Bungkus)',
    icon: '🧊',
    type: 'bulk_to_retail',
    portions: 10,
    ingredients: [
      { name: 'Kantong Plastik Es & Karet Gelang', cost: 1500 },
      { name: 'Air Matang Bersih & Listrik Freezer', cost: 3500 },
    ],
    suggestedSellingPrice: 2000,
    category: 'Umum',
  },
  {
    title: 'Kopi Seduh Panas',
    icon: '☕',
    type: 'recipe',
    portions: 1,
    ingredients: [
      { name: 'Kopi Sachet (Kapal Api / sejenis)', cost: 1500 },
      { name: 'Gula Tambahan (opsional)', cost: 300 },
      { name: 'Air Panas Dispenser / Gas', cost: 300 },
      { name: 'Gelas Cup Kertas', cost: 400 },
    ],
    suggestedSellingPrice: 4000,
    category: 'Minuman Seduh',
  },
];

export default function HppCalculatorModal({
  isOpen,
  onClose,
  products = [],
  wallets = [],
  currentMemberId = '',
  isDbConnected = false,
  onRefreshFinance,
  onProductsUpdate,
  onApplyHpp,
}: HppCalculatorModalProps) {
  const [calculatorMode, setCalculatorMode] = useState<'recipe' | 'bulk_to_retail'>('recipe');
  const [recipeName, setRecipeName] = useState('Es Teh Manis');
  const [portions, setPortions] = useState<number>(1);
  const [ingredients, setIngredients] = useState<HppIngredient[]>([
    { id: '1', name: 'Teh Celup / Tubruk', cost: 500 },
    { id: '2', name: 'Gula Pasir', cost: 700 },
    { id: '3', name: 'Es Batu', cost: 300 },
    { id: '4', name: 'Cup Plastik & Sedotan', cost: 500 },
  ]);
  const [sellingPrice, setSellingPrice] = useState<number>(4000);
  const [productCategory, setProductCategory] = useState<string>('Minuman Seduh');

  // Tab Tampilan di Modal: 'calculator' vs 'saved_recipes'
  const [activeModalTab, setActiveModalTab] = useState<'calculator' | 'saved_recipes'>('calculator');
  const [savedRecipes, setSavedRecipes] = useState<HppRecipe[]>([]);

  // Opsi Catat Langsung ke Kas Toko
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [isRecordingToFinance, setIsRecordingToFinance] = useState(false);

  // Load Saved Recipes dari LocalStorage saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      try {
        const stored = localStorage.getItem('warungscan_hpp_recipes');
        if (stored) {
          setSavedRecipes(JSON.parse(stored));
        }
      } catch {
        // Fallback
      }
      if (wallets.length > 0 && !selectedWalletId) {
        const shared = wallets.find((w) => !w.is_private || w.type === 'cash_warung');
        setSelectedWalletId(shared ? shared.id : wallets[0].id);
      }
    }
  }, [isOpen, wallets, selectedWalletId]);

  // Perhitungan HPP
  const totalCost = useMemo(() => {
    return ingredients.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);
  }, [ingredients]);

  const safePortions = Math.max(1, Number(portions) || 1);
  const costPerPortion = Math.round(totalCost / safePortions);
  const profitPerPortion = Number(sellingPrice || 0) - costPerPortion;
  const marginPercent =
    Number(sellingPrice || 0) > 0
      ? Math.round((profitPerPortion / Number(sellingPrice)) * 100)
      : 0;
  const totalEstimatedRevenue = Number(sellingPrice || 0) * safePortions;
  const totalEstimatedProfit = profitPerPortion * safePortions;

  if (!isOpen) return null;

  // Handler Tambah Bahan
  const handleAddIngredient = () => {
    triggerHaptic(20);
    setIngredients((prev) => [
      ...prev,
      { id: generateUUID(), name: '', cost: 0 },
    ]);
  };

  // Handler Hapus Bahan
  const handleRemoveIngredient = (id: string) => {
    triggerHaptic(20);
    setIngredients((prev) => prev.filter((i) => i.id !== id));
  };

  // Handler Update Bahan
  const handleUpdateIngredient = (id: string, field: 'name' | 'cost', value: any) => {
    setIngredients((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: value } : i))
    );
  };

  // Handler Terapkan Preset
  const handleApplyPreset = (preset: (typeof HPP_PRESETS)[0]) => {
    triggerHaptic(25);
    setRecipeName(preset.title);
    setCalculatorMode(preset.type);
    setPortions(preset.portions);
    setIngredients(
      preset.ingredients.map((item) => ({
        id: generateUUID(),
        name: item.name,
        cost: item.cost,
      }))
    );
    setSellingPrice(preset.suggestedSellingPrice);
    setProductCategory(preset.category);
  };

  // Simpan Resep HPP ke Riwayat
  const handleSaveRecipe = () => {
    triggerHaptic(30);
    if (!recipeName.trim()) {
      alert('Isi nama racikan / produk.');
      return;
    }

    const newRecipe: HppRecipe = {
      id: generateUUID(),
      name: recipeName.trim(),
      type: calculatorMode,
      portions: safePortions,
      ingredients: ingredients.filter((i) => i.name.trim()),
      total_cost: totalCost,
      cost_per_portion: costPerPortion,
      selling_price: sellingPrice,
      margin_percent: marginPercent,
      profit_per_portion: profitPerPortion,
      created_at: new Date().toISOString(),
    };

    const updated = [newRecipe, ...savedRecipes];
    setSavedRecipes(updated);
    localStorage.setItem('warungscan_hpp_recipes', JSON.stringify(updated));

    alert(`Resep & perhitungan HPP "${newRecipe.name}" berhasil disimpan.`);
  };

  // Hapus Resep Tersimpan
  const handleDeleteSavedRecipe = (id: string) => {
    triggerHaptic(25);
    const updated = savedRecipes.filter((r) => r.id !== id);
    setSavedRecipes(updated);
    localStorage.setItem('warungscan_hpp_recipes', JSON.stringify(updated));
  };

  // Load Resep Tersimpan ke Form
  const handleLoadSavedRecipe = (r: HppRecipe) => {
    triggerHaptic(25);
    setRecipeName(r.name);
    setCalculatorMode(r.type);
    setPortions(r.portions);
    setIngredients(r.ingredients);
    setSellingPrice(r.selling_price);
    setActiveModalTab('calculator');
  };

  // Terapkan ke Produk Kasir Langsung
  const handleApplyToProducts = async () => {
    triggerHaptic(35);
    const targetName = recipeName.trim();
    if (!targetName) {
      alert('Isi nama produk.');
      return;
    }

    // Jika dipanggil dari ProductsView, serahkan ke callback
    if (onApplyHpp) {
      onApplyHpp(costPerPortion, sellingPrice, targetName);
      onClose();
      return;
    }

    // Jika dibuka mandiri, langsung daftarkan / perbarui produk di katalog kasir
    try {
      const localProducts: Product[] = JSON.parse(
        localStorage.getItem('warungscan_products') || '[]'
      );
      const existingIdx = localProducts.findIndex(
        (p) => p.name.toLowerCase() === targetName.toLowerCase()
      );

      let targetId = generateUUID();

      if (existingIdx >= 0) {
        targetId = localProducts[existingIdx].id;
        localProducts[existingIdx] = {
          ...localProducts[existingIdx],
          cost_price: costPerPortion,
          selling_price: sellingPrice,
          stock: localProducts[existingIdx].stock > 0 ? localProducts[existingIdx].stock : safePortions,
          category: productCategory,
          updated_at: new Date().toISOString(),
        };
      } else {
        const newProd: Product = {
          id: targetId,
          name: targetName,
          category: productCategory,
          cost_price: costPerPortion,
          selling_price: sellingPrice,
          stock: safePortions,
          created_at: new Date().toISOString(),
        };
        localProducts.unshift(newProd);
      }

      localStorage.setItem('warungscan_products', JSON.stringify(localProducts));

      if (isDbConnected) {
        if (existingIdx >= 0) {
          await supabase
            .from('products')
            .update({
              cost_price: costPerPortion,
              selling_price: sellingPrice,
              category: productCategory,
              updated_at: new Date().toISOString(),
            })
            .eq('id', targetId);
        } else {
          await supabase.from('products').insert({
            id: targetId,
            name: targetName,
            cost_price: costPerPortion,
            selling_price: sellingPrice,
            stock: safePortions,
            category: productCategory,
          });
        }
      }

      if (onProductsUpdate) onProductsUpdate();
      onClose();

      alert(
        `Alhamdulillah! Produk "${targetName}" berhasil diperbarui di katalog Kasir dengan Modal HPP: ${formatRupiah(
          costPerPortion
        )} dan Harga Jual: ${formatRupiah(sellingPrice)}.`
      );
    } catch (err: any) {
      alert('Gagal menerapkan ke kasir: ' + err.message);
    }
  };

  // Catat Total Belanja Bahan Ini ke Kas Toko
  const handleRecordExpenseToStore = async () => {
    if (totalCost <= 0) {
      alert('Total belanja bahan masih Rp 0.');
      return;
    }
    const targetWallet = wallets.find((w) => w.id === selectedWalletId) || wallets[0];
    if (!targetWallet) {
      alert('Pilih dompet kas toko.');
      return;
    }

    triggerHaptic(35);
    setIsRecordingToFinance(true);

    try {
      const updatedBal = Number(targetWallet.balance || 0) - totalCost;
      const expenseItem: PersonalExpense = {
        id: generateUUID(),
        user_id: currentMemberId,
        wallet_id: targetWallet.id,
        wallet_name: targetWallet.name,
        type: 'expense',
        amount: totalCost,
        category: 'Operasional Warung',
        source_type: 'warung',
        description: `Belanja bahan racikan/kulakan: ${recipeName.trim()} (${safePortions} porsi/pcs)`,
        is_private: false,
        created_at: new Date().toISOString(),
      };

      const localExp: PersonalExpense[] = JSON.parse(
        localStorage.getItem('warungscan_personal_expenses') || '[]'
      );
      localExp.unshift(expenseItem);
      localStorage.setItem('warungscan_personal_expenses', JSON.stringify(localExp));

      const localWallets: Wallet[] = JSON.parse(
        localStorage.getItem('warungscan_wallets') || '[]'
      );
      const updatedW = localWallets.map((w) =>
        w.id === targetWallet.id ? { ...w, balance: updatedBal } : w
      );
      localStorage.setItem('warungscan_wallets', JSON.stringify(updatedW));

      if (isDbConnected) {
        await supabase.from('personal_expenses').insert(expenseItem);
        await supabase.from('wallets').update({ balance: updatedBal }).eq('id', targetWallet.id);
      }

      if (onRefreshFinance) onRefreshFinance();
      alert(
        `Berhasil memotong kas toko sebesar ${formatRupiah(
          totalCost
        )} dari "${targetWallet.name}" untuk belanja bahan "${recipeName}".`
      );
    } catch (err: any) {
      alert('Gagal mencatat pengeluaran: ' + err.message);
    } finally {
      setIsRecordingToFinance(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-5 max-h-[94vh] flex flex-col shadow-2xl">
        {/* HEADER MODAL */}
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-900 flex items-center justify-center shrink-0">
              <Calculator className="w-5 h-5 text-emerald-800" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Kalkulator HPP & Racikan Warung
              </h3>
              <p className="text-[11px] text-slate-500 font-semibold">
                Ketahui modal asli es teh, tahu walik, kerupuk, & es batu
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

        {/* TAB SWITCHER: KALKULATOR vs RESEP TERSIMPAN */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl my-2 border border-slate-200">
          <button
            type="button"
            onClick={() => {
              triggerHaptic(15);
              setActiveModalTab('calculator');
            }}
            className={`py-2 rounded-xl text-xs font-black text-center transition-all ${
              activeModalTab === 'calculator'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            style={{ minHeight: '40px' }}
          >
            Hitung HPP Sekarang
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic(15);
              setActiveModalTab('saved_recipes');
            }}
            className={`py-2 rounded-xl text-xs font-black text-center transition-all flex items-center justify-center space-x-1 ${
              activeModalTab === 'saved_recipes'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            style={{ minHeight: '40px' }}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Resep Tersimpan ({savedRecipes.length})</span>
          </button>
        </div>

        {activeModalTab === 'calculator' ? (
          <div className="overflow-y-auto pr-0.5 space-y-3.5 text-xs flex-1">
            {/* PILIH PRESET CEPAT RAMAH ORANG TUA */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-600 block">
                Pilih Contoh Cepat Warung:
              </span>
              <div className="flex space-x-1.5 overflow-x-auto pb-1 no-scrollbar">
                {HPP_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-900 border border-slate-200 text-slate-800 font-bold text-[11px] shrink-0 flex items-center space-x-1 transition-colors"
                  >
                    <span>{p.icon}</span>
                    <span>{p.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* FORM NAMA PRODUK & HASIL PORSI */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nama Menu / Barang
                  </label>
                  <input
                    type="text"
                    required
                    value={recipeName}
                    onChange={(e) => setRecipeName(e.target.value)}
                    placeholder="Contoh: Es Teh Manis Jumbo"
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-extrabold text-slate-900 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Menghasilkan Berapa Porsi / Bungkus?
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="1"
                      value={portions}
                      onChange={(e) => setPortions(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-black text-slate-900 bg-white text-center text-sm"
                    />
                    <span className="text-slate-600 font-bold shrink-0">Porsi/Biji</span>
                  </div>
                </div>
              </div>
            </div>

            {/* DAFTAR BAHAN BAKU */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-800 text-xs">
                  Daftar Bahan Baku & Biaya:
                </span>
                <button
                  type="button"
                  onClick={handleAddIngredient}
                  className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-900 font-bold text-[11px] flex items-center space-x-1 hover:bg-emerald-200 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Bahan</span>
                </button>
              </div>

              <div className="space-y-1.5">
                {ingredients.map((ing, idx) => (
                  <div
                    key={ing.id}
                    className="flex items-center space-x-2 p-2 bg-white rounded-xl border border-slate-200 shadow-2xs"
                  >
                    <span className="w-5 text-slate-400 font-bold text-center text-[10px]">
                      {idx + 1}.
                    </span>
                    <input
                      type="text"
                      value={ing.name}
                      onChange={(e) => handleUpdateIngredient(ing.id, 'name', e.target.value)}
                      placeholder="Nama bahan / kemasan"
                      className="flex-1 p-2 rounded-lg border border-slate-200 font-bold text-slate-900 text-xs"
                    />
                    <div className="w-28 flex items-center space-x-1 shrink-0">
                      <span className="text-slate-400 text-[10px]">Rp</span>
                      <input
                        type="number"
                        min="0"
                        value={ing.cost || ''}
                        onChange={(e) =>
                          handleUpdateIngredient(ing.id, 'cost', Number(e.target.value))
                        }
                        placeholder="0"
                        className="w-full p-2 rounded-lg border border-slate-200 font-black text-slate-900 text-right text-xs"
                      />
                    </div>
                    {ingredients.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveIngredient(ing.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* TARGET HARGA JUAL */}
            <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-extrabold text-emerald-950 block text-xs">
                    Target Harga Jual per Porsi (Rp)
                  </label>
                  <span className="text-[10px] text-emerald-700">
                    Berapa harga yang Anda pasang ke pembeli?
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  value={sellingPrice || ''}
                  onChange={(e) => setSellingPrice(Number(e.target.value))}
                  placeholder="4000"
                  className="w-32 p-2.5 rounded-xl border-2 border-emerald-500 font-black text-emerald-950 text-right text-sm bg-white"
                />
              </div>
            </div>

            {/* KARTU HASIL KALKULASI HPP LENGKAP & TRANSPARAN */}
            <div className="p-3.5 bg-slate-900 text-white rounded-2xl space-y-3 shadow-md">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                  Hasil Perhitungan HPP
                </span>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    profitPerPortion > 0
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  Margin: {marginPercent}%
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700">
                  <span className="text-[10px] text-slate-400 block font-semibold">
                    Modal Asli (HPP) / Porsi:
                  </span>
                  <span className="text-base font-black text-amber-300 block mt-0.5">
                    {formatRupiah(costPerPortion)}
                  </span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">
                    Total bahan: {formatRupiah(totalCost)}
                  </span>
                </div>

                <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700">
                  <span className="text-[10px] text-slate-400 block font-semibold">
                    Untung Bersih (Cuan) / Porsi:
                  </span>
                  <span
                    className={`text-base font-black block mt-0.5 ${
                      profitPerPortion >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {profitPerPortion >= 0 ? '+' : ''}
                    {formatRupiah(profitPerPortion)}
                  </span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">
                    Harga jual: {formatRupiah(sellingPrice)}
                  </span>
                </div>
              </div>

              <div className="pt-1 text-[11px] text-slate-300 space-y-1">
                <div className="flex justify-between">
                  <span>Estimasi Uang Masuk ({safePortions} porsi):</span>
                  <span className="font-bold text-white">
                    {formatRupiah(totalEstimatedRevenue)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Estimasi Total Keuntungan Bersih:</span>
                  <span className="font-extrabold text-emerald-400">
                    +{formatRupiah(totalEstimatedProfit)}
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION POTONG KAS TOKO (OPSIONAL) */}
            {wallets.length > 0 && (
              <div className="p-3 bg-amber-50/80 rounded-2xl border border-amber-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-amber-950 text-xs block">
                      Baru Saja Belanja Bahan Ini?
                    </span>
                    <span className="text-[10px] text-amber-800 block">
                      Potong langsung kas toko sebesar total modal bahan ({formatRupiah(totalCost)})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRecordExpenseToStore}
                    disabled={isRecordingToFinance || totalCost <= 0}
                    className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-xs transition-colors shrink-0"
                  >
                    {isRecordingToFinance ? 'Mencatat...' : 'Potong Kas Toko'}
                  </button>
                </div>
              </div>
            )}

            {/* TOMBOL AKSI UTAMA */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleApplyToProducts}
                className="py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 font-extrabold text-white text-xs shadow-xs flex items-center justify-center space-x-1.5 transition-colors"
                style={{ minHeight: '44px' }}
              >
                <Check className="w-4 h-4" />
                <span>Terapkan ke Kasir</span>
              </button>

              <button
                type="button"
                onClick={handleSaveRecipe}
                className="py-3 rounded-xl bg-slate-200 hover:bg-slate-300 font-bold text-slate-800 text-xs flex items-center justify-center space-x-1.5 transition-colors"
                style={{ minHeight: '44px' }}
              >
                <Bookmark className="w-4 h-4" />
                <span>Simpan Resep HPP</span>
              </button>
            </div>
          </div>
        ) : (
          /* TAB DAFTAR RESEP TERSIMPAN */
          <div className="overflow-y-auto space-y-2.5 flex-1 pr-0.5 text-xs">
            {savedRecipes.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                <Bookmark className="w-8 h-8 text-slate-300 mx-auto" />
                <h4 className="font-bold text-slate-700">Belum Ada Resep Tersimpan</h4>
                <p className="text-slate-500 text-[11px] max-w-xs mx-auto">
                  Hitung racikan atau kulakan Anda di tab kalkulator lalu klik "Simpan Resep HPP"
                  agar dapat dibuka kembali kapan saja.
                </p>
              </div>
            ) : (
              savedRecipes.map((r) => (
                <div
                  key={r.id}
                  className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-slate-900 text-sm">{r.name}</h4>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {r.portions} porsi/bungkus • Dibuat{' '}
                        {new Date(r.created_at).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Margin {r.margin_percent}%
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2 rounded-xl">
                    <div>
                      <span className="text-slate-500 block">Modal HPP / porsi:</span>
                      <span className="font-bold text-slate-900">
                        {formatRupiah(r.cost_per_portion)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Harga Jual / porsi:</span>
                      <span className="font-extrabold text-emerald-800">
                        {formatRupiah(r.selling_price)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => handleLoadSavedRecipe(r)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-700 text-white font-bold text-[11px] hover:bg-emerald-800 transition-colors"
                    >
                      Buka & Hitung Ulang
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSavedRecipe(r.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                      title="Hapus Resep"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
