'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  ShoppingCart,
  DollarSign,
  Award,
  Calendar,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Utensils,
  Trash2,
  Edit2,
  X,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { formatRupiah, formatTanggal, triggerHaptic } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { Product } from '@/types';

interface ReportsViewProps {
  isDbConnected: boolean;
  onProductsUpdate?: () => void;
}

type PeriodType = 'today' | 'week' | 'month';

export default function ReportsView({ isDbConnected, onProductsUpdate }: ReportsViewProps) {
  const [period, setPeriod] = useState<PeriodType>('today');
  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [salesItems, setSalesItems] = useState<any[]>([]);
  const [restockLogs, setRestockLogs] = useState<any[]>([]);
  const [selfConsumptions, setSelfConsumptions] = useState<any[]>([]);
  const [expandedTransId, setExpandedTransId] = useState<string | null>(null);

  // State Modal Edit Transaksi
  const [editingTransaction, setEditingTransaction] = useState<any | null>(null);
  const [editPaymentMethod, setEditPaymentMethod] = useState('Tunai');
  const [editNotes, setEditNotes] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const fetchReportData = async () => {
    setIsLoading(true);
    try {
      if (isDbConnected) {
        const { data: transData } = await supabase
          .from('sales_transactions')
          .select('*')
          .order('created_at', { ascending: false });

        const { data: itemsData } = await supabase.from('sales_items').select('*');

        const { data: restockData } = await supabase
          .from('restock_logs')
          .select('*')
          .order('created_at', { ascending: false });

        const { data: scData } = await supabase
          .from('self_consumptions')
          .select('*')
          .order('created_at', { ascending: false });

        setTransactions(transData || []);
        setSalesItems(itemsData || []);
        setRestockLogs(restockData || []);
        setSelfConsumptions(scData || []);
      } else {
        const localSales = JSON.parse(localStorage.getItem('warungscan_sales') || '[]');
        const localRestock = JSON.parse(localStorage.getItem('warungscan_restock') || '[]');
        const localSC = JSON.parse(
          localStorage.getItem('warungscan_self_consumption') || '[]'
        );
        setTransactions(localSales);
        setRestockLogs(localRestock);
        setSelfConsumptions(localSC);
      }
    } catch (err) {
      console.error('Gagal mengambil laporan:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 1. HAPUS TRANSAKSI KASIR (DENGAN ROLLBACK STOK BARANG OTOMATIS)
  const handleDeleteTransaction = async (transId: string, totalAmount: number) => {
    if (
      !confirm(
        `Batalkan transaksi senilai ${formatRupiah(
          totalAmount
        )}?\n\nSemua barang dalam transaksi ini akan otomatis DIKEMBALIKAN stoknya ke toko.`
      )
    ) {
      return;
    }

    triggerHaptic(40);
    setIsLoading(true);

    try {
      // Ambil item yang ada di transaksi ini
      const itemsInTrans = salesItems.filter((it) => it.transaction_id === transId);

      // Rollback stok di database & local storage
      const localProducts: Product[] = JSON.parse(
        localStorage.getItem('warungscan_products') || '[]'
      );

      for (const item of itemsInTrans) {
        const qtyToReturn = Number(item.qty || 1);

        // Update di Supabase jika ada product_id
        if (isDbConnected && item.product_id) {
          const { data: prodData } = await supabase
            .from('products')
            .select('stock')
            .eq('id', item.product_id)
            .single();

          if (prodData) {
            const restoredStock = Number(prodData.stock) + qtyToReturn;
            await supabase
              .from('products')
              .update({ stock: restoredStock, updated_at: new Date().toISOString() })
              .eq('id', item.product_id);
          }
        }

        // Update di localProducts
        const pIndex = localProducts.findIndex(
          (p) => p.id === item.product_id || p.name === item.product_name
        );
        if (pIndex >= 0) {
          localProducts[pIndex].stock += qtyToReturn;
        }
      }
      localStorage.setItem('warungscan_products', JSON.stringify(localProducts));

      // Hapus transaksi dari Supabase (sales_items akan terhapus cascade)
      if (isDbConnected) {
        const { error } = await supabase
          .from('sales_transactions')
          .delete()
          .eq('id', transId);
        if (error) throw error;
      }

      // Hapus dari LocalStorage
      const localSales = JSON.parse(localStorage.getItem('warungscan_sales') || '[]');
      const filteredSales = localSales.filter((s: any) => s.id !== transId);
      localStorage.setItem('warungscan_sales', JSON.stringify(filteredSales));

      // Update state
      setTransactions((prev) => prev.filter((t) => t.id !== transId));
      setSalesItems((prev) => prev.filter((it) => it.transaction_id !== transId));

      if (onProductsUpdate) onProductsUpdate();
      alert('Transaksi berhasil dibatalkan dan stok barang telah dikembalikan ke toko.');
    } catch (err: any) {
      alert('Gagal membatalkan transaksi: ' + (err.message || 'Error'));
    } finally {
      setIsLoading(false);
    }
  };

  // 2. SIMPAN EDIT TRANSAKSI KASIR
  const handleSaveEditTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;

    setIsSubmittingEdit(true);
    triggerHaptic(30);

    try {
      if (isDbConnected) {
        const { error } = await supabase
          .from('sales_transactions')
          .update({
            payment_method: editPaymentMethod,
            notes: editNotes.trim(),
          })
          .eq('id', editingTransaction.id);

        if (error) throw error;
      }

      // Update LocalStorage
      const localSales = JSON.parse(localStorage.getItem('warungscan_sales') || '[]');
      const updatedLocal = localSales.map((s: any) =>
        s.id === editingTransaction.id
          ? { ...s, payment_method: editPaymentMethod, notes: editNotes.trim() }
          : s
      );
      localStorage.setItem('warungscan_sales', JSON.stringify(updatedLocal));

      // Update State
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === editingTransaction.id
            ? { ...t, payment_method: editPaymentMethod, notes: editNotes.trim() }
            : t
        )
      );

      setEditingTransaction(null);
      alert('Perubahan transaksi kasir berhasil disimpan.');
    } catch (err: any) {
      alert('Gagal menyimpan perubahan: ' + (err.message || 'Error'));
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // 3. BATALKAN / HAPUS CATATAN PAKAI SENDIRI (ROLLBACK STOK)
  const handleDeleteSelfConsumption = async (scItem: any) => {
    if (
      !confirm(
        `Batalkan catatan pakai sendiri "${scItem.product_name} (${scItem.qty} pcs)"?\n\nStok akan dikembalikan ke toko.`
      )
    ) {
      return;
    }

    triggerHaptic(30);
    setIsLoading(true);

    try {
      const qtyToReturn = Number(scItem.qty || 1);

      // Rollback ke database
      if (isDbConnected && scItem.product_id) {
        const { data: prodData } = await supabase
          .from('products')
          .select('stock')
          .eq('id', scItem.product_id)
          .single();

        if (prodData) {
          const restoredStock = Number(prodData.stock) + qtyToReturn;
          await supabase
            .from('products')
            .update({ stock: restoredStock, updated_at: new Date().toISOString() })
            .eq('id', scItem.product_id);
        }

        await supabase.from('self_consumptions').delete().eq('id', scItem.id);
      }

      // Rollback ke LocalStorage
      const localProducts: Product[] = JSON.parse(
        localStorage.getItem('warungscan_products') || '[]'
      );
      const pIndex = localProducts.findIndex(
        (p) => p.id === scItem.product_id || p.name === scItem.product_name
      );
      if (pIndex >= 0) {
        localProducts[pIndex].stock += qtyToReturn;
        localStorage.setItem('warungscan_products', JSON.stringify(localProducts));
      }

      const localSC = JSON.parse(
        localStorage.getItem('warungscan_self_consumption') || '[]'
      );
      const filteredSC = localSC.filter((s: any) => s.id !== scItem.id);
      localStorage.setItem('warungscan_self_consumption', JSON.stringify(filteredSC));

      setSelfConsumptions((prev) => prev.filter((s) => s.id !== scItem.id));
      if (onProductsUpdate) onProductsUpdate();
      alert('Catatan pakai sendiri dibatalkan dan stok telah dikembalikan ke toko.');
    } catch (err: any) {
      alert('Gagal membatalkan: ' + (err.message || 'Error'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [isDbConnected]);

  const filterDate = useMemo(() => {
    const now = new Date();
    const start = new Date();
    if (period === 'today') {
      start.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
    } else if (period === 'month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    }
    return start;
  }, [period]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => new Date(t.created_at) >= filterDate);
  }, [transactions, filterDate]);

  const totalOmset = useMemo(() => {
    return filteredTransactions.reduce((sum, t) => sum + Number(t.total_amount || 0), 0);
  }, [filteredTransactions]);

  const totalProfit = useMemo(() => {
    return filteredTransactions.reduce((sum, t) => sum + Number(t.total_profit || 0), 0);
  }, [filteredTransactions]);

  const filteredRestock = useMemo(() => {
    return restockLogs.filter((r) => new Date(r.created_at) >= filterDate);
  }, [restockLogs, filterDate]);

  const totalExpense = useMemo(() => {
    return filteredRestock.reduce((sum, r) => sum + Number(r.total_expense || 0), 0);
  }, [filteredRestock]);

  // Konsumsi Sendiri dalam periode
  const filteredSelfCons = useMemo(() => {
    return selfConsumptions.filter((s) => new Date(s.created_at) >= filterDate);
  }, [selfConsumptions, filterDate]);

  const totalSelfCost = useMemo(() => {
    return filteredSelfCons.reduce((sum, s) => sum + Number(s.total_cost || 0), 0);
  }, [filteredSelfCons]);

  const topProducts = useMemo(() => {
    const productMap = new Map<string, { name: string; qty: number; omset: number }>();
    const validTransIds = new Set(filteredTransactions.map((t) => t.id));

    salesItems.forEach((item) => {
      if (validTransIds.has(item.transaction_id)) {
        const existing = productMap.get(item.product_name) || {
          name: item.product_name,
          qty: 0,
          omset: 0,
        };
        existing.qty += Number(item.qty || 0);
        existing.omset += Number(item.subtotal || 0);
        productMap.set(item.product_name, existing);
      }
    });

    return Array.from(productMap.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [filteredTransactions, salesItems]);

  const toggleExpand = (id: string) => {
    triggerHaptic(15);
    setExpandedTransId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="flex flex-col flex-1 p-3 pb-24 space-y-3.5">
      {/* Header & Filter Periode */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900">Laporan Keuangan</h2>
          <p className="text-xs text-slate-500 font-medium">Ringkasan hasil usaha warung</p>
        </div>

        <button
          onClick={() => {
            triggerHaptic(20);
            fetchReportData();
          }}
          className="p-2 text-slate-500 hover:text-emerald-700 bg-white rounded-xl border border-slate-200"
          title="Segarkan data"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter Waktu: Hari Ini, 7 Hari, Bulan Ini */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-200 rounded-xl">
        <button
          onClick={() => {
            triggerHaptic(20);
            setPeriod('today');
          }}
          className={`py-2 rounded-lg font-bold text-xs transition-colors ${
            period === 'today' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
          }`}
        >
          Hari Ini
        </button>
        <button
          onClick={() => {
            triggerHaptic(20);
            setPeriod('week');
          }}
          className={`py-2 rounded-lg font-bold text-xs transition-colors ${
            period === 'week' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
          }`}
        >
          7 Hari Terakhir
        </button>
        <button
          onClick={() => {
            triggerHaptic(20);
            setPeriod('month');
          }}
          className={`py-2 rounded-lg font-bold text-xs transition-colors ${
            period === 'month' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
          }`}
        >
          Bulan Ini
        </button>
      </div>

      {/* 4 KARTU METRIK UTAMA */}
      <div className="grid grid-cols-1 gap-2.5">
        {/* Omset */}
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Omset (Uang Masuk)
            </span>
            <p className="text-2xl font-black text-slate-900 mt-0.5">
              {formatRupiah(totalOmset)}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Dari {filteredTransactions.length} transaksi penjualan
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Keuntungan Bersih */}
        <div className="p-3.5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              Keuntungan Bersih (Laba)
            </span>
            <p className="text-2xl font-black text-emerald-700 mt-0.5">
              {formatRupiah(totalProfit)}
            </p>
            <p className="text-[11px] text-emerald-800/80 mt-0.5">
              Omset dikurangi modal barang terjual
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Pengeluaran Kulakan */}
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Belanja Kulakan
            </span>
            <p className="text-2xl font-black text-slate-900 mt-0.5">
              {formatRupiah(totalExpense)}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Dari {filteredRestock.length} struk belanja masuk
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <ShoppingCart className="w-6 h-6" />
          </div>
        </div>

        {/* KONSUMSI SENDIRI (DIPAKAI KELUARGA/MASAK) */}
        <div className="p-3.5 rounded-2xl bg-orange-50 border border-orange-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-orange-800 uppercase tracking-wider">
              Barang Dipakai Sendiri
            </span>
            <p className="text-xl font-black text-orange-900 mt-0.5">
              {formatRupiah(totalSelfCost)}
            </p>
            <p className="text-[11px] text-orange-700 mt-0.5">
              Total {filteredSelfCons.length} kali pengambilan keperluan rumah
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-orange-200 text-orange-800 flex items-center justify-center">
            <Utensils className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* TOP 5 PRODUK PALING LAKU */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
        <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
          <Award className="w-5 h-5 text-amber-500" />
          <h3 className="font-extrabold text-slate-900 text-sm">
            5 Produk Paling Laris
          </h3>
        </div>

        {topProducts.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-3">
            Belum ada penjualan pada periode ini.
          </p>
        ) : (
          <div className="space-y-1.5">
            {topProducts.map((p, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-extrabold flex items-center justify-center text-[10px]">
                    {idx + 1}
                  </span>
                  <span className="font-bold text-slate-800">{p.name}</span>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-emerald-700">
                    {p.qty} terjual
                  </span>
                  <span className="text-slate-400 block text-[10px]">
                    {formatRupiah(p.omset)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CATATAN PENGAMBILAN KEBUTUHAN SENDIRI */}
      {filteredSelfCons.length > 0 && (
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
            <Utensils className="w-4 h-4 text-orange-600" />
            <h3 className="font-extrabold text-slate-900 text-sm">
              Rincian Barang Dipakai Sendiri
            </h3>
          </div>
          <div className="space-y-1.5">
            {filteredSelfCons.slice(0, 10).map((sc) => (
              <div
                key={sc.id}
                className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-orange-50/50 border border-orange-100"
              >
                <div>
                  <p className="font-bold text-slate-900">
                    {sc.product_name} × {sc.qty}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {sc.reason || 'Kebutuhan sendiri'} • {formatTanggal(sc.created_at)}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-orange-900">
                    {formatRupiah(sc.total_cost)}
                  </span>
                  <button
                    onClick={() => handleDeleteSelfConsumption(sc)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Batalkan catatan pakai sendiri & kembalikan stok"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DAFTAR PENJUALAN TERAKHIR */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
        <h3 className="font-extrabold text-slate-900 text-sm">Riwayat Penjualan Terakhir</h3>

        {filteredTransactions.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-3">
            Belum ada transaksi tercatat.
          </p>
        ) : (
          <div className="space-y-2">
            {filteredTransactions.slice(0, 15).map((t) => {
              const isExpanded = expandedTransId === t.id;
              const items = salesItems.filter((item) => item.transaction_id === t.id);

              return (
                <div
                  key={t.id}
                  className="p-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-2xs"
                >
                  <div
                    onClick={() => toggleExpand(t.id)}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <p className="text-xs font-bold text-slate-800">
                          {formatTanggal(t.created_at)}
                        </p>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                          {t.payment_method || 'Tunai'}
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-600 font-semibold">
                        Untung: +{formatRupiah(t.total_profit)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-black text-slate-900 text-sm">
                        {formatRupiah(t.total_amount)}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-2.5 text-xs animate-in fade-in">
                      {/* Daftar Item Penjualan */}
                      <div className="space-y-1">
                        {items.length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic">Rincian item tidak tersedia.</p>
                        ) : (
                          items.map((it) => (
                            <div key={it.id} className="flex justify-between text-slate-600">
                              <span>
                                {it.product_name} × {it.qty}
                              </span>
                              <span className="font-bold text-slate-900">
                                {formatRupiah(it.subtotal)}
                              </span>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Catatan / Keterangan Transaksi jika ada */}
                      {t.notes && (
                        <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-xl">
                          Catatan: {t.notes}
                        </p>
                      )}

                      {/* Tombol Aksi Edit & Hapus Transaksi */}
                      <div className="flex items-center justify-end space-x-2 pt-1 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerHaptic(20);
                            setEditingTransaction(t);
                            setEditPaymentMethod(t.payment_method || 'Tunai');
                            setEditNotes(t.notes || '');
                          }}
                          className="py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center space-x-1 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit Transaksi</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTransaction(t.id, Number(t.total_amount));
                          }}
                          className="py-1.5 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs flex items-center space-x-1 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus / Batal</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL EDIT TRANSAKSI KASIR */}
      {editingTransaction && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <h3 className="font-black text-slate-900 text-sm">Edit Data Transaksi</h3>
                <p className="text-[10px] text-slate-500">
                  Total: {formatRupiah(editingTransaction.total_amount)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingTransaction(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditTransaction} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Metode Pembayaran
                </label>
                <select
                  value={editPaymentMethod}
                  onChange={(e) => setEditPaymentMethod(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white"
                >
                  <option value="Tunai">Tunai</option>
                  <option value="QRIS">QRIS</option>
                  <option value="Transfer">Transfer Bank</option>
                  <option value="Dipakai Sendiri">Dipakai Sendiri</option>
                  <option value="Hutang">Hutang / Bon</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Catatan / Keterangan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Dititipkan ke mas budi / salah ketik"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs"
                >
                  {isSubmittingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingTransaction(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
