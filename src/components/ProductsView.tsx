'use client';

import React, { useState, useMemo } from 'react';
import { Search, Plus, Edit2, Trash2, X, Check, Package, AlertTriangle, Utensils, Calculator } from 'lucide-react';
import { Product } from '@/types';
import { formatRupiah, triggerHaptic, findBestProductMatch, generateUUID } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import HppCalculatorModal from '@/components/HppCalculatorModal';

interface ProductsViewProps {
  products: Product[];
  onProductsUpdate: () => void;
  isDbConnected: boolean;
  onOpenSelfConsumption: () => void;
}

export default function ProductsView({
  products,
  onProductsUpdate,
  isDbConnected,
  onOpenSelfConsumption,
}: ProductsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isHppModalOpen, setIsHppModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Sembako');
  const [costPrice, setCostPrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [stock, setStock] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredProducts = useMemo(() => {
    return products.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  // Cek kemiripan nama barang secara real-time untuk mencegah duplikasi
  const duplicateWarning = useMemo(() => {
    if (!name.trim() || (editingProduct && editingProduct.name.toLowerCase() === name.trim().toLowerCase())) {
      return null;
    }

    const otherProducts = editingProduct
      ? products.filter((p) => p.id !== editingProduct.id)
      : products;

    const match = findBestProductMatch(name.trim(), otherProducts);
    if (match.matchedName && match.score >= 50) {
      return {
        similarName: match.matchedName,
        score: match.score,
      };
    }
    return null;
  }, [name, products, editingProduct]);

  const openAddModal = () => {
    triggerHaptic(20);
    setEditingProduct(null);
    setName('');
    setCategory('Sembako');
    setCostPrice(0);
    setSellingPrice(0);
    setStock(10);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    triggerHaptic(20);
    setEditingProduct(p);
    setName(p.name);
    setCategory(p.category || 'Sembako');
    setCostPrice(p.cost_price);
    setSellingPrice(p.selling_price);
    setStock(p.stock);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    triggerHaptic(30);

    const targetName = name.trim();
    const cPrice = Number(costPrice) || 0;
    const sPrice = Number(sellingPrice) || 0;
    const stVal = Number(stock) || 0;

    try {
      // 1. Optimistic update ke local storage agar instan muncul
      const local = JSON.parse(localStorage.getItem('warungscan_products') || '[]');
      if (editingProduct) {
        const updatedLocal = local.map((item: Product) =>
          item.id === editingProduct.id
            ? {
                ...item,
                name: targetName,
                category,
                cost_price: cPrice,
                selling_price: sPrice,
                stock: stVal,
              }
            : item
        );
        localStorage.setItem('warungscan_products', JSON.stringify(updatedLocal));
      } else {
        const newProductItem: Product = {
          id: generateUUID(),
          name: targetName,
          category,
          cost_price: cPrice,
          selling_price: sPrice,
          stock: stVal,
        };
        local.unshift(newProductItem);
        localStorage.setItem('warungscan_products', JSON.stringify(local));
      }

      // 2. Simpan ke database Supabase jika terkoneksi
      if (isDbConnected) {
        if (editingProduct) {
          const { error } = await supabase
            .from('products')
            .update({
              name: targetName,
              category,
              cost_price: cPrice,
              selling_price: sPrice,
              stock: stVal,
              updated_at: new Date().toISOString(),
            })
            .eq('id', editingProduct.id);

          if (error) {
            if (error.code === '23505') {
              throw new Error(`Nama barang "${targetName}" sudah ada di database.`);
            }
            throw error;
          }
        } else {
          const newId = generateUUID();
          const { error } = await supabase.from('products').insert({
            id: newId,
            name: targetName,
            category,
            cost_price: cPrice,
            selling_price: sPrice,
            stock: stVal,
          });

          if (error) {
            if (error.code === '23505') {
              throw new Error(`Nama barang "${targetName}" sudah ada di database.`);
            }
            throw error;
          }
        }
      }

      setIsModalOpen(false);
      onProductsUpdate();
    } catch (err: any) {
      alert('Gagal menyimpan: ' + (err.message || 'Error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, prodName: string) => {
    if (!confirm(`Hapus produk "${prodName}" dari katalog?`)) return;

    triggerHaptic(30);
    try {
      // Optimistic delete di local storage
      const local = JSON.parse(localStorage.getItem('warungscan_products') || '[]');
      const filtered = local.filter((item: Product) => item.id !== id);
      localStorage.setItem('warungscan_products', JSON.stringify(filtered));

      if (isDbConnected) {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;
      }
      onProductsUpdate();
    } catch (err: any) {
      alert('Gagal menghapus: ' + err.message);
    }
  };

  return (
    <div className="flex flex-col flex-1 p-3 pb-24 space-y-3">
      {/* Header & Tombol Cepat */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900">Katalog Barang</h2>
          <p className="text-xs text-slate-500 font-medium">
            Total {products.length} macam barang di warung
          </p>
        </div>

        <div className="flex items-center space-x-1.5">
          {/* Tombol Cepat Pakai Sendiri */}
          <button
            onClick={() => {
              triggerHaptic(20);
              onOpenSelfConsumption();
            }}
            className="py-2.5 px-3 rounded-xl bg-orange-100 hover:bg-orange-200 text-orange-900 font-bold text-xs flex items-center space-x-1 shadow-xs transition-colors"
            style={{ minHeight: '44px' }}
            title="Catat barang yang dipakai sendiri untuk masak/makan"
          >
            <Utensils className="w-4 h-4 text-orange-700" />
            <span className="hidden xs:inline">Pakai Sendiri</span>
          </button>

          {/* Tombol Tambah Barang Baru */}
          <button
            onClick={openAddModal}
            className="py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center space-x-1 shadow-xs transition-all active:scale-95"
            style={{ minHeight: '44px' }}
          >
            <Plus className="w-4 h-4" />
            <span>Tambah</span>
          </button>
        </div>
      </div>

      {/* Pencarian Barang */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari barang di katalog..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
        />
      </div>

      {/* List Produk */}
      <div className="space-y-2 flex-1">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-10 px-4 bg-white rounded-2xl border border-dashed border-slate-300 my-4">
            <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 font-medium text-sm">Barang tidak ditemukan.</p>
          </div>
        ) : (
          filteredProducts.map((p) => {
            const margin = p.selling_price - p.cost_price;
            return (
              <div
                key={p.id}
                className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between"
              >
                <div className="flex-1 pr-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 uppercase">
                      {p.category || 'Umum'}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        p.stock <= 0
                          ? 'bg-red-100 text-red-700'
                          : p.stock < 5
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      Stok: {p.stock}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-base mt-1 leading-snug">
                    {p.name}
                  </h3>

                  <div className="flex items-center space-x-3 text-xs mt-1">
                    <span className="font-extrabold text-emerald-800 text-sm">
                      {formatRupiah(p.selling_price)}
                    </span>
                    <span className="text-slate-500">
                      Modal: {formatRupiah(p.cost_price)}
                    </span>
                    <span className="text-emerald-600 font-semibold">
                      +{formatRupiah(margin)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    onClick={() => openEditModal(p)}
                    className="p-2.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-xl transition-colors"
                    title="Ubah data barang"
                    aria-label="Ubah data barang"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(p.id, p.name)}
                    className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    title="Hapus barang"
                    aria-label="Hapus barang"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* POPUP MODAL TAMBAH / UBAH BARANG */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">
                {editingProduct ? 'Ubah Data Barang' : 'Tambah Barang Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="overflow-y-auto py-3 space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Barang
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Susu UHT 110ml"
                  className="w-full p-3 rounded-xl border border-slate-300 font-bold text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />

                {/* PERINGATAN KEMIRIPAN NAMA (ANTI-DUPLIKASI) */}
                {duplicateWarning && (
                  <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start space-x-2 text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">
                        Peringatan: Mirip dengan "{duplicateWarning.similarName}"
                      </p>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        Pastikan bukan barang yang sama agar stok tidak terbagi menjadi 2 nama terpisah.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kategori
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none"
                >
                  <option value="Sembako">Sembako</option>
                  <option value="Makanan">Makanan</option>
                  <option value="Minuman">Minuman</option>
                  <option value="Rokok">Rokok</option>
                  <option value="Kebersihan">Kebersihan</option>
                  <option value="Umum">Umum</option>
                </select>
              </div>

              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Harga Modal (HPP Rp)
                  </label>
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic(15);
                        setCostPrice(0);
                      }}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-all ${
                        costPrice === 0
                          ? 'bg-amber-100 border-amber-300 text-amber-900 font-black'
                          : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
                      }`}
                      title="Untuk barang kulakan yang sudah dipotong dari kas toko (misal kerupuk 1 bal)"
                    >
                      Modal Rp 0 (Kas Toko)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic(15);
                        setIsHppModalOpen(true);
                      }}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 flex items-center space-x-1 transition-colors"
                      title="Bantu hitung HPP racikan / borongan"
                    >
                      <Calculator className="w-3 h-3 text-emerald-700" />
                      <span>Hitung HPP</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <input
                      type="number"
                      required
                      value={costPrice}
                      onChange={(e) =>
                        setCostPrice(Math.max(0, parseInt(e.target.value, 10) || 0))
                      }
                      placeholder="0"
                      className="w-full p-3 rounded-xl border border-slate-300 font-bold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none"
                    />
                    {costPrice === 0 && (
                      <span className="text-[10px] text-amber-800 font-semibold block mt-1 leading-tight">
                        Modal Rp 0: Seluruh uang penjualan dihitung 100% masuk ke omset kas toko.
                      </span>
                    )}
                  </div>

                  <div>
                    <input
                      type="number"
                      required
                      value={sellingPrice || ''}
                      onChange={(e) =>
                        setSellingPrice(Math.max(0, parseInt(e.target.value, 10) || 0))
                      }
                      placeholder="0"
                      className="w-full p-3 rounded-xl border-2 border-emerald-500 font-black text-emerald-900 bg-emerald-50/50 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Jumlah Stok Saat Ini
                </label>
                <input
                  type="number"
                  required
                  value={stock}
                  onChange={(e) =>
                    setStock(Math.max(0, parseInt(e.target.value, 10) || 0))
                  }
                  placeholder="0"
                  className="w-full p-3 rounded-xl border border-slate-300 font-bold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-base transition-colors shadow-md flex items-center justify-center space-x-1.5"
                  style={{ minHeight: '48px' }}
                >
                  <Check className="w-5 h-5" />
                  <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Barang'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KALKULATOR HPP */}
      <HppCalculatorModal
        isOpen={isHppModalOpen}
        onClose={() => setIsHppModalOpen(false)}
        products={products}
        onApplyHpp={(calculatedCost, suggestedSelling, calculatedName) => {
          setCostPrice(calculatedCost);
          if (suggestedSelling > 0) setSellingPrice(suggestedSelling);
          if (calculatedName && !name) setName(calculatedName);
        }}
        onProductsUpdate={onProductsUpdate}
        isDbConnected={isDbConnected}
      />
    </div>
  );
}
