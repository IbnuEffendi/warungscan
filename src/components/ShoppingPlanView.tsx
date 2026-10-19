'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Share2,
  Plus,
  Minus,
  CheckCircle,
  XCircle,
  RefreshCw,
  ShoppingBag,
  Check,
  CheckSquare,
  Square,
  AlertTriangle,
  Camera,
} from 'lucide-react';
import { Product, ShoppingItem } from '@/types';
import { formatRupiah, triggerHaptic, generateWhatsAppMessage } from '@/lib/utils';

interface ShoppingPlanViewProps {
  products: Product[];
  onGoToRestock: () => void;
}

export default function ShoppingPlanView({ products, onGoToRestock }: ShoppingPlanViewProps) {
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [activeSubMode, setActiveSubMode] = useState<'plan' | 'task'>('plan');
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customQty, setCustomQty] = useState(1);

  // Inisialisasi daftar belanja dari produk dengan stok menipis (<= 5)
  useEffect(() => {
    const saved = localStorage.getItem('warungscan_shopping_items');
    if (saved) {
      try {
        setShoppingItems(JSON.parse(saved));
        return;
      } catch {
        // Abaikan
      }
    }

    const initialList: ShoppingItem[] = products
      .filter((p) => p.stock <= 5)
      .map((p) => ({
        id: 'shop-' + p.id,
        product_id: p.id,
        name: p.name,
        current_stock: p.stock,
        recommended_qty: p.stock <= 0 ? 12 : Math.max(6, (6 - p.stock) * 2),
        target_qty: p.stock <= 0 ? 12 : Math.max(6, (6 - p.stock) * 2),
        is_selected: true,
        status: 'pending',
      }));

    setShoppingItems(initialList);
  }, [products]);

  const saveShoppingList = (items: ShoppingItem[]) => {
    setShoppingItems(items);
    localStorage.setItem('warungscan_shopping_items', JSON.stringify(items));
  };

  const handleRequestAiRecommendations = async () => {
    triggerHaptic(30);
    setIsLoadingAi(true);

    try {
      const res = await fetch('/api/recommend-shopping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Gagal mengambil rekomendasi AI');
      }

      const recs = data.recommendations || [];
      const updatedList = [...shoppingItems];

      recs.forEach((rec: any) => {
        const prod = products.find((p) => p.name.toLowerCase() === rec.name.toLowerCase());
        const existingIdx = updatedList.findIndex(
          (item) => item.name.toLowerCase() === rec.name.toLowerCase()
        );

        if (existingIdx >= 0) {
          updatedList[existingIdx].recommended_qty = Number(rec.recommended_qty) || 6;
          updatedList[existingIdx].target_qty = Number(rec.recommended_qty) || 6;
          updatedList[existingIdx].notes = rec.reason;
          updatedList[existingIdx].is_selected = true;
        } else {
          updatedList.push({
            id: 'rec-' + Date.now() + Math.random(),
            product_id: prod?.id,
            name: rec.name,
            current_stock: prod ? prod.stock : 0,
            recommended_qty: Number(rec.recommended_qty) || 6,
            target_qty: Number(rec.recommended_qty) || 6,
            is_selected: true,
            status: 'pending',
            notes: rec.reason,
          });
        }
      });

      saveShoppingList(updatedList);
    } catch (err: any) {
      alert('Gagal mengambil rekomendasi AI: ' + err.message);
    } finally {
      setIsLoadingAi(false);
    }
  };

  const toggleSelect = (id: string) => {
    triggerHaptic(15);
    const updated = shoppingItems.map((item) =>
      item.id === id ? { ...item, is_selected: !item.is_selected } : item
    );
    saveShoppingList(updated);
  };

  // PILIH SEMUA ITEM
  const handleSelectAll = () => {
    triggerHaptic(20);
    const updated = shoppingItems.map((item) => ({ ...item, is_selected: true }));
    saveShoppingList(updated);
  };

  // UNCENTANG SEMUA ITEM
  const handleUnselectAll = () => {
    triggerHaptic(20);
    const updated = shoppingItems.map((item) => ({ ...item, is_selected: false }));
    saveShoppingList(updated);
  };

  const updateTargetQty = (id: string, delta: number) => {
    triggerHaptic(20);
    const updated = shoppingItems.map((item) =>
      item.id === id ? { ...item, target_qty: Math.max(1, item.target_qty + delta) } : item
    );
    saveShoppingList(updated);
  };

  const setItemStatus = (id: string, status: 'bought' | 'not_found' | 'pending') => {
    triggerHaptic(25);
    const updated = shoppingItems.map((item) =>
      item.id === id ? { ...item, status } : item
    );
    saveShoppingList(updated);
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    triggerHaptic(25);
    const newItem: ShoppingItem = {
      id: 'custom-' + Date.now(),
      name: customName.trim(),
      current_stock: 0,
      recommended_qty: customQty,
      target_qty: customQty,
      is_selected: true,
      status: 'pending',
    };

    saveShoppingList([...shoppingItems, newItem]);
    setCustomName('');
    setCustomQty(1);
    setIsAddingCustom(false);
  };

  const handleShareWhatsApp = () => {
    triggerHaptic(35);
    const selected = shoppingItems.filter((item) => item.is_selected);
    if (selected.length === 0) {
      alert('Pilih setidaknya satu barang untuk dibagikan.');
      return;
    }

    const message = generateWhatsAppMessage('Daftar Belanja Warung', selected);
    window.open(`https://api.whatsapp.com/send?text=${message}`, '_blank');
  };

  const selectedItems = useMemo(
    () => shoppingItems.filter((item) => item.is_selected),
    [shoppingItems]
  );

  const areAllSelected = shoppingItems.length > 0 && selectedItems.length === shoppingItems.length;

  return (
    <div className="flex flex-col flex-1 p-3 pb-24 space-y-3.5">
      {/* Header & Sub-Mode Switcher */}
      <div className="flex items-center justify-between pb-1">
        <div>
          <h2 className="text-xl font-black text-slate-900">Rencana Belanja</h2>
          <p className="text-xs text-slate-500 font-medium">
            Rekomendasi kulakan & daftar tugas belanja
          </p>
        </div>

        <button
          onClick={handleRequestAiRecommendations}
          disabled={isLoadingAi}
          className="py-2.5 px-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs flex items-center space-x-1.5 shadow-sm transition-all"
        >
          <Sparkles className={`w-3.5 h-3.5 ${isLoadingAi ? 'animate-spin' : ''}`} />
          <span>{isLoadingAi ? 'Menganalisis...' : 'Saran AI'}</span>
        </button>
      </div>

      {/* Switcher Mode: Buat Daftar vs Jalankan Tugas */}
      <div className="grid grid-cols-2 p-1 bg-slate-200 rounded-xl">
        <button
          onClick={() => {
            triggerHaptic(20);
            setActiveSubMode('plan');
          }}
          className={`py-2.5 rounded-lg font-bold text-xs transition-colors ${
            activeSubMode === 'plan' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
          }`}
        >
          1. Atur Daftar Belanja
        </button>
        <button
          onClick={() => {
            triggerHaptic(20);
            setActiveSubMode('task');
          }}
          className={`py-2.5 rounded-lg font-bold text-xs transition-colors flex items-center justify-center space-x-1 ${
            activeSubMode === 'task' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
          }`}
        >
          <span>2. Tugas Belanja</span>
          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold flex items-center justify-center">
            {selectedItems.length}
          </span>
        </button>
      </div>

      {/* SUB-MODE 1: ATUR DAFTAR BELANJA */}
      {activeSubMode === 'plan' && (
        <div className="space-y-3">
          {/* Tombol Tambah Barang Tambahan */}
          {!isAddingCustom ? (
            <button
              onClick={() => {
                triggerHaptic(20);
                setIsAddingCustom(true);
              }}
              className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 flex items-center justify-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Barang Belanja Lain (Manual)</span>
            </button>
          ) : (
            <form
              onSubmit={handleAddCustom}
              className="bg-white p-3 rounded-2xl border border-slate-300 shadow-xs space-y-2"
            >
              <h4 className="text-xs font-bold text-slate-800">Tambah Barang Belanja</h4>
              <div className="flex space-x-2">
                <input
                  type="text"
                  required
                  placeholder="Nama barang (contoh: Plastik Kresek)..."
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="flex-1 p-2 rounded-xl border border-slate-300 text-xs font-bold bg-slate-50 focus:bg-white focus:outline-none"
                />
                <input
                  type="number"
                  min="1"
                  value={customQty}
                  onChange={(e) => setCustomQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-16 p-2 rounded-xl border border-slate-300 text-xs font-bold text-center bg-slate-50 focus:bg-white focus:outline-none"
                />
              </div>
              <div className="flex space-x-2 pt-1">
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs"
                >
                  Tambahkan
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingCustom(false)}
                  className="px-3 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs"
                >
                  Batal
                </button>
              </div>
            </form>
          )}

          {/* BAR TOMBOL PILIH SEMUA / UNCENTANG SEMUA */}
          {shoppingItems.length > 0 && (
            <div className="flex items-center justify-between px-1 py-1 text-xs">
              <span className="text-slate-500 font-semibold">
                {selectedItems.length} dari {shoppingItems.length} dipilih
              </span>

              <div className="flex items-center space-x-2">
                {areAllSelected ? (
                  <button
                    onClick={handleUnselectAll}
                    className="font-bold text-red-700 hover:text-red-900 bg-red-50 px-2.5 py-1 rounded-lg border border-red-200 transition-colors"
                  >
                    Batal Pilih Semua
                  </button>
                ) : (
                  <button
                    onClick={handleSelectAll}
                    className="font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-300 transition-colors"
                  >
                    Pilih Semua
                  </button>
                )}
              </div>
            </div>
          )}

          {/* List Barang Belanja */}
          <div className="space-y-2">
            {shoppingItems.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-300 p-4">
                <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-600 font-bold text-sm">Semua stok masih aman!</p>
                <p className="text-xs text-slate-400 mt-1">
                  Klik "Saran AI" di atas untuk memeriksa produk yang disarankan dibeli.
                </p>
              </div>
            ) : (
              shoppingItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
                    item.is_selected
                      ? 'bg-white border-emerald-300 shadow-xs'
                      : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-start space-x-2.5 flex-1 pr-2">
                    <button
                      type="button"
                      onClick={() => toggleSelect(item.id)}
                      className={`w-6 h-6 rounded-lg flex items-center justify-center border mt-0.5 transition-colors ${
                        item.is_selected
                          ? 'bg-emerald-700 border-emerald-700 text-white'
                          : 'bg-white border-slate-300'
                      }`}
                    >
                      {item.is_selected && <Check className="w-4 h-4" />}
                    </button>

                    <div>
                      <h4 className="font-bold text-slate-900 text-sm leading-snug">
                        {item.name}
                      </h4>
                      <div className="flex items-center space-x-2 text-[11px] mt-0.5">
                        <span
                          className={`font-semibold ${
                            item.current_stock <= 0 ? 'text-red-600 font-bold' : 'text-slate-500'
                          }`}
                        >
                          Stok sisa: {item.current_stock}
                        </span>
                        {item.notes && (
                          <span className="text-purple-700 font-medium">({item.notes})</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      onClick={() => updateTargetQty(item.id, -1)}
                      className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-7 text-center font-black text-sm text-slate-900">
                      {item.target_qty}
                    </span>
                    <button
                      onClick={() => updateTargetQty(item.id, 1)}
                      className="w-8 h-8 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold flex items-center justify-center"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Tombol Lanjut ke Mode Tugas */}
          {selectedItems.length > 0 && (
            <button
              onClick={() => {
                triggerHaptic(25);
                setActiveSubMode('task');
              }}
              className="w-full py-4 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-sm flex items-center justify-center space-x-2 shadow-md transition-all active:scale-98"
              style={{ minHeight: '52px' }}
            >
              <span>Lanjut ke Tugas Belanja ({selectedItems.length} Barang)</span>
            </button>
          )}
        </div>
      )}

      {/* SUB-MODE 2: TUGAS BELANJA & SHARE WA (SAAT DI PASAR) */}
      {activeSubMode === 'task' && (
        <div className="space-y-3">
          <button
            onClick={handleShareWhatsApp}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#25D366] hover:bg-[#20ba5a] active:bg-[#1da851] text-white font-black text-sm flex items-center justify-center space-x-2 shadow-md transition-all active:scale-98"
            style={{ minHeight: '48px' }}
          >
            <Share2 className="w-5 h-5" />
            <span>KIRIM TUGAS BELANJA KE WHATSAPP</span>
          </button>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>Centang barang saat sudah dibeli di pasar:</span>
            <span className="font-extrabold text-emerald-800">
              {selectedItems.filter((i) => i.status === 'bought').length} dari{' '}
              {selectedItems.length} Didapat
            </span>
          </div>

          <div className="space-y-2">
            {selectedItems.map((item) => (
              <div
                key={item.id}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                  item.status === 'bought'
                    ? 'bg-emerald-50 border-emerald-300'
                    : item.status === 'not_found'
                    ? 'bg-red-50 border-red-200 opacity-60'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex-1 pr-2">
                  <h4
                    className={`font-bold text-sm leading-snug ${
                      item.status === 'bought'
                        ? 'text-emerald-950 line-through'
                        : item.status === 'not_found'
                        ? 'text-red-950 line-through'
                        : 'text-slate-900'
                    }`}
                  >
                    {item.name}
                  </h4>
                  <p className="text-xs font-extrabold text-slate-700 mt-0.5">
                    Target Beli: {item.target_qty} unit
                  </p>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0">
                  <button
                    onClick={() =>
                      setItemStatus(item.id, item.status === 'bought' ? 'pending' : 'bought')
                    }
                    className={`px-3 py-2 rounded-xl text-xs font-black flex items-center space-x-1 transition-colors ${
                      item.status === 'bought'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                    }`}
                    style={{ minHeight: '40px' }}
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Dapat</span>
                  </button>

                  <button
                    onClick={() =>
                      setItemStatus(item.id, item.status === 'not_found' ? 'pending' : 'not_found')
                    }
                    className={`p-2 rounded-xl text-xs font-bold transition-colors ${
                      item.status === 'not_found'
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                    style={{ minHeight: '40px' }}
                    title="Barang kosong / gak dapet"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <button
              onClick={() => {
                triggerHaptic(30);
                onGoToRestock();
              }}
              className="w-full py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-sm flex items-center justify-center space-x-2 shadow-lg active:scale-98 transition-all"
              style={{ minHeight: '52px' }}
            >
              <Camera className="w-5 h-5 text-yellow-400" />
              <span>SELESAI BELANJA: FOTO STRUK KULAKAN</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
