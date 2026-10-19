'use client';

import React, { useState, useRef, useMemo } from 'react';
import {
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Link as LinkIcon,
  Layers,
  Box,
  Edit3,
  Search,
  DollarSign,
} from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { Product, ScannedReceiptItem } from '@/types';
import { formatRupiah, triggerHaptic, findBestProductMatch } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface RestockViewProps {
  products: Product[];
  onProductsUpdate: () => void;
  isDbConnected: boolean;
}

const COMMON_PACK_SIZES = [
  { label: 'Satuan (1)', value: 1 },
  { label: 'Renceng (10)', value: 10 },
  { label: 'Lusin (12)', value: 12 },
  { label: 'Kotak (24)', value: 24 },
  { label: 'Dus Mie (40)', value: 40 },
];

export default function RestockView({
  products,
  onProductsUpdate,
  isDbConnected,
}: RestockViewProps) {
  // Mode: scan struk AI atau input manual tanpa struk
  const [restockMode, setRestockMode] = useState<'camera' | 'manual'>('camera');

  // State untuk Mode Kamera AI
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [draftItems, setDraftItems] = useState<ScannedReceiptItem[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [totalExpenseSaved, setTotalExpenseSaved] = useState(0);

  // State untuk Mode Input Restok Manual
  const [manualSearch, setManualSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [manualAddQty, setManualAddQty] = useState<number>(10);
  const [manualCostPrice, setManualCostPrice] = useState<number>(0);
  const [manualSellingPrice, setManualSellingPrice] = useState<number>(0);
  const [manualTotalExpense, setManualTotalExpense] = useState<number>(0);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inisialisasi data produk terpilih untuk restok manual
  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId) || products[0];
  }, [products, selectedProductId]);

  const filteredProductsForManual = useMemo(() => {
    if (!manualSearch.trim()) return products;
    return products.filter((p) =>
      p.name.toLowerCase().includes(manualSearch.toLowerCase())
    );
  }, [products, manualSearch]);

  const handleSelectProductForManual = (prod: Product) => {
    triggerHaptic(20);
    setSelectedProductId(prod.id);
    setManualCostPrice(prod.cost_price);
    setManualSellingPrice(prod.selling_price);
    setManualTotalExpense(prod.cost_price * manualAddQty);
  };

  // Kompresi dan kirim gambar ke API
  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    triggerHaptic(30);
    setIsProcessing(true);
    setProcessingStatus('Mengompresi foto struk di HP...');

    try {
      const options = {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
      };

      const compressedFile = await imageCompression(file, options);
      const reader = new FileReader();
      reader.readAsDataURL(compressedFile);

      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        setPreviewImage(base64Data);

        setProcessingStatus('Gemini AI sedang membaca rincian & kemasan struk...');

        const res = await fetch('/api/scan-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: base64Data,
            mimeType: compressedFile.type || 'image/jpeg',
          }),
        });

        const data = await res.json();

        if (!data.success) {
          throw new Error(data.error || 'Gagal mengekstrak data dari struk.');
        }

        const items: ScannedReceiptItem[] = data.items || [];

        if (items.length === 0) {
          alert(
            'AI tidak menemukan rincian barang pada foto tersebut. Pastikan foto struk terlihat jelas dan terang.'
          );
          setIsProcessing(false);
          return;
        }

        const processedItems = items.map((item) => {
          const matchResult = findBestProductMatch(item.nama_barang, products);
          let selling =
            item.new_selling_price || Math.ceil((item.harga_satuan * 1.2) / 500) * 500;

          if (matchResult.matchedId) {
            const existing = products.find((p) => p.id === matchResult.matchedId);
            if (existing && existing.selling_price > item.harga_satuan) {
              selling = existing.selling_price;
            }
          }

          return {
            ...item,
            pack_qty: item.pack_qty || 1,
            isi_per_kemasan: item.isi_per_kemasan || 1,
            matched_product_id: matchResult.matchedId,
            match_confidence: matchResult.score,
            new_selling_price: Math.max(500, selling),
          };
        });

        setDraftItems(processedItems);
        setIsProcessing(false);
      };
    } catch (err: any) {
      console.error('Error saat proses foto:', err);
      alert('Terjadi kendala: ' + (err.message || 'Gagal memproses gambar'));
      setIsProcessing(false);
    }
  };

  const setPackMultiplier = (index: number, isiPerPack: number) => {
    triggerHaptic(20);
    setDraftItems((prev) => {
      const copy = [...prev];
      const item = copy[index];
      const packQty = item.pack_qty || 1;
      const totalUnits = packQty * Math.max(1, isiPerPack);
      const totalBayar = item.total_harga || 0;
      const unitCost = Math.round(totalBayar / totalUnits);
      const rawSelling = Math.round(unitCost * 1.2);
      const suggestedSelling = Math.max(500, Math.ceil(rawSelling / 500) * 500);

      copy[index] = {
        ...item,
        isi_per_kemasan: isiPerPack,
        qty: totalUnits,
        harga_satuan: unitCost,
        new_selling_price: suggestedSelling,
      };
      return copy;
    });
  };

  const updateDraftItem = (index: number, field: keyof ScannedReceiptItem, value: any) => {
    setDraftItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };

      if (field === 'nama_barang') {
        const matchResult = findBestProductMatch(value, products);
        copy[index].matched_product_id = matchResult.matchedId;
        copy[index].match_confidence = matchResult.score;
      }

      if (field === 'pack_qty' || field === 'isi_per_kemasan') {
        const packQty = field === 'pack_qty' ? Number(value) : (copy[index].pack_qty || 1);
        const isi = field === 'isi_per_kemasan' ? Number(value) : (copy[index].isi_per_kemasan || 1);
        const totalUnits = Math.max(1, packQty * isi);
        copy[index].qty = totalUnits;

        if (copy[index].total_harga > 0) {
          copy[index].harga_satuan = Math.round(copy[index].total_harga / totalUnits);
          const rawSelling = Math.round(copy[index].harga_satuan * 1.2);
          copy[index].new_selling_price = Math.max(500, Math.ceil(rawSelling / 500) * 500);
        }
      }

      if (field === 'total_harga') {
        const total = Math.max(0, Number(value));
        const totalUnits = copy[index].qty || 1;
        copy[index].harga_satuan = Math.round(total / totalUnits);
        const rawSelling = Math.round(copy[index].harga_satuan * 1.2);
        copy[index].new_selling_price = Math.max(500, Math.ceil(rawSelling / 500) * 500);
      }

      if (field === 'harga_satuan') {
        const modal = Math.max(0, Number(value));
        copy[index].total_harga = modal * (copy[index].qty || 1);
        if (copy[index].new_selling_price && copy[index].new_selling_price <= modal) {
          copy[index].new_selling_price = Math.max(500, Math.ceil((modal * 1.2) / 500) * 500);
        }
      }

      return copy;
    });
  };

  const applyExistingName = (index: number, existingName: string, productId: string) => {
    triggerHaptic(20);
    setDraftItems((prev) => {
      const copy = [...prev];
      copy[index].nama_barang = existingName;
      copy[index].matched_product_id = productId;
      copy[index].match_confidence = 100;
      return copy;
    });
  };

  const removeDraftItem = (index: number) => {
    triggerHaptic(20);
    setDraftItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addManualItem = () => {
    triggerHaptic(20);
    setDraftItems((prev) => [
      ...prev,
      {
        nama_barang: '',
        pack_qty: 1,
        isi_per_kemasan: 1,
        qty: 1,
        harga_satuan: 0,
        total_harga: 0,
        new_selling_price: 0,
      },
    ]);
  };

  const totalExpense = draftItems.reduce((sum, item) => sum + (item.total_harga || 0), 0);

  // Konfirmasi Restok dari Hasil Scan Kamera
  const handleConfirmRestock = async () => {
    if (draftItems.length === 0) return;

    setIsProcessing(true);
    setProcessingStatus('Menyimpan perubahan stok ke database...');
    triggerHaptic(40);

    try {
      if (isDbConnected) {
        await supabase.from('restock_logs').insert({
          total_expense: totalExpense,
          raw_json_extracted: draftItems,
          notes: 'Kulakan via Gemini AI Scan & Multi-Pack Unit Converter',
        });

        for (const item of draftItems) {
          if (!item.nama_barang.trim()) continue;

          if (item.matched_product_id) {
            const existing = products.find((p) => p.id === item.matched_product_id);
            const currentStock = existing ? existing.stock : 0;
            const newStock = currentStock + Number(item.qty);

            await supabase
              .from('products')
              .update({
                stock: newStock,
                cost_price: Number(item.harga_satuan),
                selling_price: Number(item.new_selling_price || item.harga_satuan * 1.2),
                updated_at: new Date().toISOString(),
              })
              .eq('id', item.matched_product_id);
          } else {
            await supabase.from('products').insert({
              name: item.nama_barang.trim(),
              cost_price: Number(item.harga_satuan),
              selling_price: Number(item.new_selling_price || item.harga_satuan * 1.2),
              stock: Number(item.qty),
              category: 'Umum',
            });
          }
        }
      } else {
        const localLogs = JSON.parse(localStorage.getItem('warungscan_restock') || '[]');
        localLogs.unshift({
          id: 'restock-' + Date.now(),
          created_at: new Date().toISOString(),
          total_expense: totalExpense,
          items: draftItems,
        });
        localStorage.setItem('warungscan_restock', JSON.stringify(localLogs));

        const localProducts: Product[] = JSON.parse(
          localStorage.getItem('warungscan_products') || '[]'
        );

        for (const item of draftItems) {
          if (!item.nama_barang.trim()) continue;
          if (item.matched_product_id) {
            const targetIdx = localProducts.findIndex((p) => p.id === item.matched_product_id);
            if (targetIdx >= 0) {
              localProducts[targetIdx].stock += Number(item.qty);
              localProducts[targetIdx].cost_price = Number(item.harga_satuan);
              localProducts[targetIdx].selling_price = Number(
                item.new_selling_price || item.harga_satuan * 1.2
              );
            }
          } else {
            localProducts.push({
              id: 'prod-' + Date.now() + Math.random(),
              name: item.nama_barang.trim(),
              cost_price: Number(item.harga_satuan),
              selling_price: Number(item.new_selling_price || item.harga_satuan * 1.2),
              stock: Number(item.qty),
              category: 'Umum',
            });
          }
        }
        localStorage.setItem('warungscan_products', JSON.stringify(localProducts));
      }

      setTotalExpenseSaved(totalExpense);
      setIsSuccess(true);
      setDraftItems([]);
      setPreviewImage(null);
      onProductsUpdate();
    } catch (err: any) {
      console.error('Gagal menyimpan restok:', err);
      alert('Gagal menyimpan ke database: ' + (err.message || 'Error'));
    } finally {
      setIsProcessing(false);
    }
  };

  // EKSEKUSI TAMBAH STOK MANUAL (TANPA FOTO STRUK)
  const handleSaveManualRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      alert('Pilih barang terlebih dahulu.');
      return;
    }

    if (manualAddQty <= 0) {
      alert('Jumlah penambahan stok harus minimal 1.');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('Menyimpan penambahan stok manual...');
    triggerHaptic(40);

    const costPerUnit =
      manualCostPrice > 0 ? manualCostPrice : Math.round(manualTotalExpense / manualAddQty);
    const totalKeluar = manualTotalExpense > 0 ? manualTotalExpense : costPerUnit * manualAddQty;
    const newStock = selectedProduct.stock + manualAddQty;
    const finalSellingPrice =
      manualSellingPrice > 0
        ? manualSellingPrice
        : Math.max(500, Math.ceil((costPerUnit * 1.2) / 500) * 500);

    try {
      if (isDbConnected) {
        // 1. Simpan ke restock_logs agar tercatat sebagai pengeluaran belanja di Laporan
        await supabase.from('restock_logs').insert({
          total_expense: totalKeluar,
          raw_json_extracted: [
            {
              nama_barang: selectedProduct.name,
              qty: manualAddQty,
              harga_satuan: costPerUnit,
              total_harga: totalKeluar,
            },
          ],
          notes: `Restok Manual Tanpa Struk: ${selectedProduct.name} (+${manualAddQty})`,
        });

        // 2. Perbarui stok dan modal produk di tabel products
        await supabase
          .from('products')
          .update({
            stock: newStock,
            cost_price: costPerUnit,
            selling_price: finalSellingPrice,
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedProduct.id);
      } else {
        // Mode Demo Lokal
        const localLogs = JSON.parse(localStorage.getItem('warungscan_restock') || '[]');
        localLogs.unshift({
          id: 'restock-manual-' + Date.now(),
          created_at: new Date().toISOString(),
          total_expense: totalKeluar,
          items: [
            {
              nama_barang: selectedProduct.name,
              qty: manualAddQty,
              harga_satuan: costPerUnit,
              total_harga: totalKeluar,
            },
          ],
          notes: `Restok Manual Tanpa Struk: ${selectedProduct.name} (+${manualAddQty})`,
        });
        localStorage.setItem('warungscan_restock', JSON.stringify(localLogs));

        const localProducts: Product[] = JSON.parse(
          localStorage.getItem('warungscan_products') || '[]'
        );
        const targetIdx = localProducts.findIndex((p) => p.id === selectedProduct.id);
        if (targetIdx >= 0) {
          localProducts[targetIdx].stock = newStock;
          localProducts[targetIdx].cost_price = costPerUnit;
          localProducts[targetIdx].selling_price = finalSellingPrice;
          localStorage.setItem('warungscan_products', JSON.stringify(localProducts));
        }
      }

      setTotalExpenseSaved(totalKeluar);
      setIsSuccess(true);
      onProductsUpdate();
    } catch (err: any) {
      console.error('Gagal menyimpan penambahan stok:', err);
      alert('Gagal menyimpan: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 p-3 pb-24 space-y-3">
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleImageSelected}
        accept="image/*"
        capture="environment"
        className="hidden"
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageSelected}
        accept="image/*"
        className="hidden"
      />

      {/* HEADER SWITCHER: FOTO STRUK AI vs TAMBAH STOK MANUAL */}
      <div className="grid grid-cols-2 p-1 bg-slate-200 rounded-2xl">
        <button
          onClick={() => {
            triggerHaptic(20);
            setRestockMode('camera');
            setIsSuccess(false);
          }}
          className={`py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center space-x-1.5 transition-all ${
            restockMode === 'camera'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Foto Struk AI</span>
        </button>

        <button
          onClick={() => {
            triggerHaptic(20);
            setRestockMode('manual');
            setIsSuccess(false);
            if (selectedProduct) {
              setManualCostPrice(selectedProduct.cost_price);
              setManualSellingPrice(selectedProduct.selling_price);
              setManualTotalExpense(selectedProduct.cost_price * manualAddQty);
            }
          }}
          className={`py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center space-x-1.5 transition-all ${
            restockMode === 'manual'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Edit3 className="w-4 h-4" />
          <span>Tambah Stok Manual</span>
        </button>
      </div>

      {/* TAMPILAN LOADING */}
      {isProcessing && (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center shadow-md my-auto">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4 animate-spin">
            <RefreshCw className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Memproses Penambahan Stok</h3>
          <p className="text-sm font-semibold text-emerald-800">{processingStatus}</p>
        </div>
      )}

      {/* TAMPILAN BERHASIL */}
      {isSuccess && !isProcessing && (
        <div className="bg-white rounded-3xl p-6 border border-emerald-200 text-center shadow-lg my-auto animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h3 className="text-2xl font-black text-slate-900">Stok Berhasil Masuk!</h3>
          <p className="text-sm text-slate-600 mt-1">
            Pengeluaran belanja modal senilai{' '}
            <strong className="text-emerald-800">{formatRupiah(totalExpenseSaved)}</strong> telah
            tercatat di laporan kasir.
          </p>
          <button
            onClick={() => {
              triggerHaptic(20);
              setIsSuccess(false);
            }}
            className="w-full mt-6 py-4 rounded-2xl bg-emerald-700 text-white font-extrabold text-base hover:bg-emerald-800 active:scale-98 transition-all"
            style={{ minHeight: '52px' }}
          >
            {restockMode === 'manual' ? 'Tambah Stok Barang Lain' : 'Foto Struk Baru'}
          </button>
        </div>
      )}

      {/* MODE 1: RESTOK MANUAL TANPA STRUK */}
      {restockMode === 'manual' && !isProcessing && !isSuccess && (
        <form
          onSubmit={handleSaveManualRestock}
          className="bg-white p-4 rounded-3xl border border-slate-300 shadow-xs space-y-4"
        >
          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-lg font-black text-slate-900">Tambah Stok Tanpa Struk</h3>
            <p className="text-xs text-slate-500">
              Catat barang belanjaan kulakan yang tidak ada notanya agar stok bertambah dan uang keluar
              tercatat di laporan keuangan.
            </p>
          </div>

          {/* Cari & Pilih Produk */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Pilih Barang yang Mau Ditambah Stoknya
            </label>
            <div className="relative mb-2">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={manualSearch}
                onChange={(e) => setManualSearch(e.target.value)}
                placeholder="Ketik nama barang (contoh: beras, telur)..."
                className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-slate-50 focus:bg-white focus:outline-none"
              />
            </div>

            <select
              value={selectedProductId}
              onChange={(e) => {
                const prod = products.find((p) => p.id === e.target.value);
                if (prod) handleSelectProductForManual(prod);
              }}
              className="w-full p-3.5 rounded-xl border-2 border-slate-300 font-bold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none text-sm"
              style={{ minHeight: '50px' }}
            >
              {filteredProductsForManual.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Stok Saat Ini: {p.stock})
                </option>
              ))}
            </select>
          </div>

          {/* Ringkasan Stok & Harga Lama */}
          {selectedProduct && (
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Stok Sekarang</span>
                <strong className="text-slate-900 text-sm font-black">
                  {selectedProduct.stock} pcs
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Modal Lama</span>
                <strong className="text-slate-900 text-xs font-bold">
                  {formatRupiah(selectedProduct.cost_price)}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Harga Jual</span>
                <strong className="text-emerald-800 text-xs font-bold">
                  {formatRupiah(selectedProduct.selling_price)}
                </strong>
              </div>
            </div>
          )}

          {/* Input Jumlah Penambahan Stok */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Jumlah Stok yang Ditambahkan (+Qty)
            </label>
            <div className="flex items-center justify-between bg-slate-50 border-2 border-slate-200 p-2 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(20);
                  setManualAddQty((prev) => {
                    const next = Math.max(1, prev - 1);
                    setManualTotalExpense(next * (manualCostPrice || selectedProduct?.cost_price || 0));
                    return next;
                  });
                }}
                className="w-12 h-12 rounded-xl bg-slate-200 text-slate-800 font-black text-2xl flex items-center justify-center hover:bg-slate-300 active:scale-95"
              >
                <Minus className="w-5 h-5" />
              </button>

              <div className="text-center">
                <span className="text-3xl font-black text-slate-900">+{manualAddQty}</span>
                <span className="block text-xs font-bold text-emerald-800">
                  Total Jadi: {(selectedProduct?.stock || 0) + manualAddQty} pcs
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic(20);
                  setManualAddQty((prev) => {
                    const next = prev + 1;
                    setManualTotalExpense(next * (manualCostPrice || selectedProduct?.cost_price || 0));
                    return next;
                  });
                }}
                className="w-12 h-12 rounded-xl bg-emerald-700 text-white font-black text-2xl flex items-center justify-center hover:bg-emerald-800 active:scale-95"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Uang Keluar Belanja & Modal Satuan */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Modal Beli per Pcs (Rp)
              </label>
              <input
                type="number"
                min="0"
                value={manualCostPrice || ''}
                onChange={(e) => {
                  const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                  setManualCostPrice(val);
                  setManualTotalExpense(val * manualAddQty);
                  setManualSellingPrice(Math.max(500, Math.ceil((val * 1.2) / 500) * 500));
                }}
                placeholder="0"
                className="w-full p-3 rounded-xl border border-slate-300 font-bold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none text-sm text-center"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Total Uang Keluar (Rp)
              </label>
              <input
                type="number"
                min="0"
                value={manualTotalExpense || ''}
                onChange={(e) => {
                  const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                  setManualTotalExpense(val);
                  if (manualAddQty > 0) {
                    const perUnit = Math.round(val / manualAddQty);
                    setManualCostPrice(perUnit);
                    setManualSellingPrice(Math.max(500, Math.ceil((perUnit * 1.2) / 500) * 500));
                  }
                }}
                placeholder="0"
                className="w-full p-3 rounded-xl border border-slate-300 font-black text-emerald-900 bg-slate-50 focus:bg-white focus:outline-none text-sm text-center"
              />
            </div>
          </div>

          {/* Harga Jual Baru per Pcs */}
          <div>
            <label className="block text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-1">
              Harga Jual Eceran Baru di Warung (Rp)
            </label>
            <input
              type="number"
              min="0"
              value={manualSellingPrice || ''}
              onChange={(e) =>
                setManualSellingPrice(Math.max(0, parseInt(e.target.value, 10) || 0))
              }
              placeholder="0"
              className="w-full p-3 rounded-xl border-2 border-emerald-400 font-black text-emerald-900 bg-emerald-50/40 focus:bg-white focus:outline-none text-sm text-center"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Otomatis disarankan +20% dari harga modal beli terbaru.
            </p>
          </div>

          {/* Kotak Ringkasan Penambahan */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1 text-xs">
            <div className="flex justify-between text-emerald-950 font-bold">
              <span>Uang Keluar Belanja:</span>
              <span className="text-sm font-black text-emerald-800">
                {formatRupiah(manualTotalExpense)}
              </span>
            </div>
            <p className="text-[11px] text-emerald-800">
              Stok <strong>{selectedProduct?.name}</strong> akan bertambah dari{' '}
              {selectedProduct?.stock} menjadi{' '}
              <strong>{(selectedProduct?.stock || 0) + manualAddQty} pcs</strong>.
            </p>
          </div>

          {/* Tombol Simpan */}
          <button
            type="submit"
            className="w-full py-4 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-base shadow-md transition-all active:scale-98 flex items-center justify-center space-x-2"
            style={{ minHeight: '52px' }}
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>SIMPAN MASUK STOK & CATAT BELANJA</span>
          </button>
        </form>
      )}

      {/* MODE 2: RESTOK VIA FOTO STRUK KAMERA AI */}
      {restockMode === 'camera' && !isProcessing && !isSuccess && draftItems.length === 0 && (
        <div className="flex flex-col space-y-4 my-auto">
          <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 text-center shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-emerald-700 text-white flex items-center justify-center mx-auto mb-3 shadow-md">
              <Sparkles className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black text-slate-900">Restok Cepat via Foto</h2>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Foto struk dari agen/grosir. Sistem otomatis memecah kemasan dus/kotak/renceng (seperti
              Chocolatos isi 24, kopi renceng isi 10) menjadi stok eceran dan menghitung modal per biji.
            </p>
          </div>

          <button
            onClick={() => {
              triggerHaptic(30);
              cameraInputRef.current?.click();
            }}
            className="w-full py-5 px-4 rounded-2xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-black text-lg flex items-center justify-center space-x-3 shadow-md transition-all active:scale-98"
            style={{ minHeight: '64px' }}
          >
            <Camera className="w-7 h-7" />
            <span>FOTO STRUK DARI KAMERA</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic(25);
              fileInputRef.current?.click();
            }}
            className="w-full py-4 px-4 rounded-2xl bg-white border-2 border-slate-300 hover:bg-slate-50 active:bg-slate-100 text-slate-800 font-bold text-base flex items-center justify-center space-x-2 transition-all"
            style={{ minHeight: '52px' }}
          >
            <Upload className="w-5 h-5 text-slate-600" />
            <span>PILIH FOTO DARI GALERI HP</span>
          </button>
        </div>
      )}

      {/* TAMPILAN VERIFIKASI DARI HASIL SCAN FOTO */}
      {restockMode === 'camera' && !isProcessing && !isSuccess && draftItems.length > 0 && (
        <div className="flex flex-col space-y-3.5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900">Periksa Hasil Scan</h2>
              <p className="text-xs text-slate-500 font-medium">
                {draftItems.length} barang terbaca dari struk
              </p>
            </div>
            <button
              onClick={() => {
                triggerHaptic(20);
                if (confirm('Batalkan dan ulangi foto struk?')) {
                  setDraftItems([]);
                }
              }}
              className="text-xs font-bold text-red-600 hover:text-red-800 px-2.5 py-1.5 rounded-lg border border-red-200 bg-red-50"
            >
              Ulangi Foto
            </button>
          </div>

          <div className="space-y-3">
            {draftItems.map((item, idx) => {
              const matchedProd = products.find((p) => p.id === item.matched_product_id);
              const hasSimilarityMatch = !!matchedProd;
              const packQty = item.pack_qty || 1;
              const isiPerPack = item.isi_per_kemasan || 1;
              const isMultiPack = isiPerPack > 1;

              return (
                <div
                  key={idx}
                  className="bg-white p-3.5 rounded-2xl border-2 border-slate-300 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between space-x-2">
                    <div className="flex-1">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Nama Barang
                      </label>
                      <input
                        type="text"
                        value={item.nama_barang}
                        onChange={(e) => updateDraftItem(idx, 'nama_barang', e.target.value)}
                        placeholder="Nama produk..."
                        className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={() => removeDraftItem(idx)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl mt-5"
                      title="Hapus baris ini"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  {hasSimilarityMatch && (
                    <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 space-y-1.5 text-xs">
                      <div className="flex items-center space-x-1.5 text-blue-900 font-bold">
                        <LinkIcon className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>
                          Cocok dengan barang toko: <u>{matchedProd.name}</u>
                        </span>
                      </div>
                      <p className="text-[11px] text-blue-800">
                        Stok akan bertambah (+{item.qty} pcs) ke <strong>{matchedProd.name}</strong>.
                      </p>
                      {item.nama_barang !== matchedProd.name && (
                        <button
                          type="button"
                          onClick={() => applyExistingName(idx, matchedProd.name, matchedProd.id)}
                          className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold text-[11px] hover:bg-blue-700 transition-colors"
                        >
                          Samakan Nama jadi "{matchedProd.name}"
                        </button>
                      )}
                    </div>
                  )}

                  {/* Konverter Kemasan / Eceran */}
                  <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-300 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-900">
                        <Box className="w-4 h-4 text-amber-700" />
                        <span>Isi Kemasan Dijual Eceran?</span>
                      </div>
                      <span className="text-[11px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                        {isMultiPack ? `1 Kemasan isi ${isiPerPack} biji` : 'Dijual Satuan'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {COMMON_PACK_SIZES.map((pack) => (
                        <button
                          key={pack.value}
                          type="button"
                          onClick={() => setPackMultiplier(idx, pack.value)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            isiPerPack === pack.value
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'bg-white border border-amber-200 text-amber-900 hover:bg-amber-100'
                          }`}
                        >
                          {pack.label}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="block text-[10px] font-bold text-amber-900 uppercase">
                          Jumlah Kemasan di Struk
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={packQty}
                          onChange={(e) =>
                            updateDraftItem(
                              idx,
                              'pack_qty',
                              Math.max(1, parseInt(e.target.value, 10) || 1)
                            )
                          }
                          className="w-full p-2 rounded-lg border border-amber-300 font-bold text-xs bg-white text-center"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-amber-900 uppercase">
                          Isi per 1 Kemasan (Biji)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={isiPerPack}
                          onChange={(e) =>
                            updateDraftItem(
                              idx,
                              'isi_per_kemasan',
                              Math.max(1, parseInt(e.target.value, 10) || 1)
                            )
                          }
                          placeholder="Ketik isi..."
                          className="w-full p-2 rounded-lg border border-amber-300 font-black text-xs bg-white text-center text-amber-950"
                        />
                      </div>
                    </div>

                    <div className="text-[11px] text-amber-950 font-medium bg-white/80 p-2 rounded-lg border border-amber-200 flex justify-between items-center">
                      <span>Beli {packQty} kemasan × {isiPerPack} =</span>
                      <strong className="text-emerald-800 text-xs font-black">
                        {item.qty} Biji Masuk ke Stok
                      </strong>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Pilihan Simpan di Toko
                    </label>
                    <select
                      value={item.matched_product_id || ''}
                      onChange={(e) =>
                        updateDraftItem(idx, 'matched_product_id', e.target.value || undefined)
                      }
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-semibold bg-slate-50 text-slate-800 focus:bg-white focus:outline-none"
                    >
                      <option value="">+ Buat sebagai Barang Baru Terpisah</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          Update Stok ke: {p.name} (Stok skrg: {p.stock})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Total Struk (Rp)
                      </label>
                      <input
                        type="number"
                        value={item.total_harga || ''}
                        onChange={(e) =>
                          updateDraftItem(
                            idx,
                            'total_harga',
                            Math.max(0, parseInt(e.target.value, 10) || 0)
                          )
                        }
                        className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold text-xs text-center bg-slate-50 focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Modal/Biji (Rp)
                      </label>
                      <input
                        type="number"
                        value={item.harga_satuan || ''}
                        onChange={(e) =>
                          updateDraftItem(
                            idx,
                            'harga_satuan',
                            Math.max(0, parseInt(e.target.value, 10) || 0)
                          )
                        }
                        className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold text-xs text-center bg-slate-50 focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1">
                        Jual/Biji (Rp)
                      </label>
                      <input
                        type="number"
                        value={item.new_selling_price || ''}
                        onChange={(e) =>
                          updateDraftItem(
                            idx,
                            'new_selling_price',
                            Math.max(0, parseInt(e.target.value, 10) || 0)
                          )
                        }
                        className="w-full p-2.5 rounded-xl border-2 border-emerald-500 text-emerald-900 font-black text-xs text-center bg-emerald-50/50 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={addManualItem}
            className="w-full py-3 rounded-xl border-2 border-dashed border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 flex items-center justify-center space-x-1.5"
            style={{ minHeight: '44px' }}
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Barang Lain yang Terlewat</span>
          </button>

          <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-xl space-y-3 sticky bottom-20 z-20">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-slate-400 font-medium">Total Belanja Struk</p>
                <p className="text-2xl font-black text-emerald-400 leading-tight">
                  {formatRupiah(totalExpense)}
                </p>
              </div>
              <span className="text-xs bg-slate-800 px-3 py-1.5 rounded-full font-bold text-slate-300">
                {draftItems.length} Macam Barang
              </span>
            </div>

            <button
              onClick={handleConfirmRestock}
              className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 font-black text-base text-white flex items-center justify-center space-x-2 transition-all shadow-md active:scale-98"
              style={{ minHeight: '52px' }}
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>KONFIRMASI MASUK KE STOK</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
