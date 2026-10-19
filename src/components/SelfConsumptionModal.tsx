'use client';

import React, { useState, useMemo } from 'react';
import { Utensils, X, Plus, Minus, CheckCircle2, Search } from 'lucide-react';
import { Product } from '@/types';
import { formatRupiah, triggerHaptic } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface SelfConsumptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSuccess: () => void;
  isDbConnected: boolean;
}

const REASONS = [
  'Dimakan Sendiri / Jajan',
  'Untuk Masak Rumah',
  'Kebutuhan Rumah Tangga',
  'Barang Rusak / Basi',
];

export default function SelfConsumptionModal({
  isOpen,
  onClose,
  products,
  onSuccess,
  isDbConnected,
}: SelfConsumptionModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [qty, setQty] = useState<number>(1);
  const [reason, setReason] = useState<string>(REASONS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    return products.filter((p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  if (!isOpen) return null;

  const currentProduct =
    products.find((p) => p.id === selectedProductId) || filteredProducts[0] || products[0];
  const maxStock = currentProduct ? currentProduct.stock : 0;
  const totalCost = currentProduct ? currentProduct.cost_price * qty : 0;

  const handleQtyChange = (delta: number) => {
    triggerHaptic(20);
    setQty((prev) => Math.max(1, prev + delta));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProduct || isSubmitting) return;

    setIsSubmitting(true);
    triggerHaptic(40);

    try {
      const consumptionRecord = {
        product_id: currentProduct.id,
        product_name: currentProduct.name,
        qty: qty,
        cost_price: currentProduct.cost_price,
        total_cost: totalCost,
        reason: reason,
        created_at: new Date().toISOString(),
      };

      if (isDbConnected) {
        await supabase.from('self_consumptions').insert(consumptionRecord);

        const newStock = Math.max(0, currentProduct.stock - qty);
        await supabase
          .from('products')
          .update({ stock: newStock, updated_at: new Date().toISOString() })
          .eq('id', currentProduct.id);
      } else {
        const localCons = JSON.parse(
          localStorage.getItem('warungscan_self_consumption') || '[]'
        );
        localCons.unshift({ id: 'sc-' + Date.now(), ...consumptionRecord });
        localStorage.setItem('warungscan_self_consumption', JSON.stringify(localCons));

        const localProds = JSON.parse(localStorage.getItem('warungscan_products') || '[]');
        const updated = localProds.map((p: Product) =>
          p.id === currentProduct.id ? { ...p, stock: Math.max(0, p.stock - qty) } : p
        );
        localStorage.setItem('warungscan_products', JSON.stringify(updated));
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Gagal mencatat pemakaian sendiri:', err);
      alert('Gagal mencatat: ' + (err.message || 'Error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-sm w-full p-5 max-h-[92vh] flex flex-col shadow-2xl">
        {/* Header Modal */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center">
              <Utensils className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900">Catat Pakai Sendiri</h3>
          </div>
          <button
            onClick={() => {
              triggerHaptic(20);
              onClose();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto py-3 space-y-3.5 text-sm">
          {/* Kolom Cari Barang Cepat */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Cari & Pilih Barang
            </label>
            <div className="relative mb-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ketik nama barang..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-slate-50 focus:bg-white focus:outline-none"
              />
            </div>

            <select
              value={selectedProductId}
              onChange={(e) => {
                setSelectedProductId(e.target.value);
                setQty(1);
              }}
              className="w-full p-3 rounded-xl border-2 border-slate-300 font-bold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none text-sm"
              style={{ minHeight: '48px' }}
            >
              {filteredProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Sisa Stok: {p.stock})
                </option>
              ))}
            </select>
          </div>

          {/* Pengatur Kuantitas Besar */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Jumlah yang Diambil
            </label>
            <div className="flex items-center justify-between bg-slate-50 border-2 border-slate-200 p-2 rounded-2xl">
              <button
                type="button"
                onClick={() => handleQtyChange(-1)}
                className="w-12 h-12 rounded-xl bg-slate-200 text-slate-800 font-black text-2xl flex items-center justify-center hover:bg-slate-300 active:scale-95 transition-transform"
              >
                <Minus className="w-5 h-5" />
              </button>

              <div className="text-center">
                <span className="text-3xl font-black text-slate-900">{qty}</span>
                <span className="block text-xs font-semibold text-slate-500">
                  dari stok {maxStock}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleQtyChange(1)}
                className="w-12 h-12 rounded-xl bg-orange-600 text-white font-black text-2xl flex items-center justify-center hover:bg-orange-700 active:scale-95 transition-transform"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Pilihan Alasan Cepat */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Keperluan Pengambilan
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    triggerHaptic(15);
                    setReason(r);
                  }}
                  className={`p-2.5 rounded-xl font-bold text-xs text-left border transition-all ${
                    reason === r
                      ? 'bg-orange-50 border-orange-400 text-orange-900 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Kotak Ringkasan Nilai Modal */}
          <div className="p-3 bg-orange-50/80 rounded-2xl border border-orange-200 space-y-0.5 text-xs">
            <div className="flex justify-between text-orange-950">
              <span>Nilai Modal Terpakai:</span>
              <span className="font-extrabold text-sm">{formatRupiah(totalCost)}</span>
            </div>
            <p className="text-[10px] text-orange-800/80">
              Stok berkurang otomatis dan dicatat ke beban pribadi keluarga.
            </p>
          </div>

          {/* Tombol Simpan */}
          <button
            type="submit"
            disabled={isSubmitting || maxStock <= 0}
            className={`w-full py-4 rounded-2xl font-black text-base transition-all shadow-md flex items-center justify-center space-x-2 ${
              maxStock <= 0 || isSubmitting
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-orange-600 hover:bg-orange-700 text-white active:scale-98'
            }`}
            style={{ minHeight: '52px' }}
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>{isSubmitting ? 'Mencatat...' : 'CATAT PENGAMBILAN'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
