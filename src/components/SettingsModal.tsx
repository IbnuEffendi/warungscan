'use client';

import React, { useState, useRef } from 'react';
import {
  Settings,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle,
  Database,
  FileJson,
  Shield,
  User,
  KeyRound,
  Edit2,
  Plus,
  Check,
  Lock,
} from 'lucide-react';
import { Product, FamilyMember } from '@/types';
import { triggerHaptic } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  currentMember: FamilyMember;
  onUpdateCurrentMember: (updated: FamilyMember) => void;
  familyMembers: FamilyMember[];
  onRefreshAll: () => void;
  isDbConnected: boolean;
  onLockApp?: () => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  products,
  currentMember,
  onUpdateCurrentMember,
  familyMembers,
  onRefreshAll,
  isDbConnected,
  onLockApp,
}: SettingsModalProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // State Upgrade Super Admin
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [upgradeError, setUpgradeError] = useState('');

  // State Ubah Nama Profil
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(currentMember.name);

  // State Tambah Anggota dengan PIN 4477
  const [isAddingMemberOpen, setIsAddingMemberOpen] = useState(false);
  const [memberPinCheck, setMemberPinCheck] = useState('');
  const [isMemberPinVerified, setIsMemberPinVerified] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'family_member' | 'super_admin'>('family_member');

  // State Kunci Akses Toko (Gate PIN)
  const [isEditingGatePin, setIsEditingGatePin] = useState(false);
  const [newGatePin, setNewGatePin] = useState('');
  const [gatePinSuccess, setGatePinSuccess] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // 1. UPGRADE KE SUPER ADMIN (PASSWORD: 4477)
  const handleUpgradeToAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic(30);

    if (adminPassword.trim() === '4477') {
      const updated: FamilyMember = {
        ...currentMember,
        role: 'super_admin',
      };
      onUpdateCurrentMember(updated);
      setIsUpgradeOpen(false);
      setAdminPassword('');
      setUpgradeError('');
      alert('Berhasil! Anda sekarang masuk sebagai Super Admin.');
    } else {
      setUpgradeError('Kode sandi tidak valid.');
    }
  };

  const handleDowngradeToUser = () => {
    triggerHaptic(20);
    const updated: FamilyMember = {
      ...currentMember,
      role: 'family_member',
    };
    onUpdateCurrentMember(updated);
    alert('Akses dikembalikan menjadi User Biasa (Kasir).');
  };

  // 2. UBAH NAMA PROFIL
  const handleSaveProfileName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editedName.trim()) return;

    triggerHaptic(30);
    const updated: FamilyMember = {
      ...currentMember,
      name: editedName.trim(),
    };

    try {
      if (isDbConnected) {
        await supabase
          .from('family_members')
          .update({ name: updated.name })
          .eq('id', updated.id);
      } else {
        const local = JSON.parse(localStorage.getItem('warungscan_family') || '[]');
        const updatedList = local.map((m: FamilyMember) =>
          m.id === updated.id ? { ...m, name: updated.name } : m
        );
        localStorage.setItem('warungscan_family', JSON.stringify(updatedList));
      }

      onUpdateCurrentMember(updated);
      setIsEditingName(false);
      onRefreshAll();
      alert(`Nama profil berhasil diubah menjadi "${updated.name}"`);
    } catch (err: any) {
      alert('Gagal mengubah nama: ' + err.message);
    }
  };

  // 3. TAMBAH ANGGOTA KELUARGA
  const handleVerifyMemberPin = (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic(20);
    if (memberPinCheck.trim() === '4477') {
      setIsMemberPinVerified(true);
      setMemberPinCheck('');
    } else {
      alert('Kode otorisasi tidak valid.');
    }
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    triggerHaptic(30);
    const newMember: FamilyMember = {
      id: 'fam-' + Date.now(),
      name: newMemberName.trim(),
      role: newMemberRole,
      pin: '1234',
      avatar_color: newMemberRole === 'super_admin' ? 'emerald' : 'blue',
    };

    try {
      if (isDbConnected) {
        await supabase.from('family_members').insert({
          name: newMember.name,
          role: newMember.role,
          pin: newMember.pin,
          avatar_color: newMember.avatar_color,
        });
      } else {
        const local = JSON.parse(localStorage.getItem('warungscan_family') || '[]');
        local.push(newMember);
        localStorage.setItem('warungscan_family', JSON.stringify(local));
      }

      onRefreshAll();
      setIsAddingMemberOpen(false);
      setIsMemberPinVerified(false);
      setNewMemberName('');
      alert(`Anggota keluarga "${newMember.name}" berhasil ditambahkan.`);
    } catch (err: any) {
      alert('Gagal menambah anggota: ' + err.message);
    }
  };

  // UBAH PIN AKSES TOKO (SECURITY GATE)
  const handleSaveGatePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newGatePin.trim().length < 4) {
      alert('PIN Akses Toko minimal 4 digit.');
      return;
    }
    triggerHaptic(30);
    localStorage.setItem('warungscan_store_gate_pin', newGatePin.trim());
    setIsEditingGatePin(false);
    setNewGatePin('');
    setGatePinSuccess('PIN Akses Toko berhasil diperbarui!');
    setTimeout(() => setGatePinSuccess(''), 3500);
  };

  // 4. EKSPOR DATABASE (DOWNLOAD JSON)
  const handleExportData = async () => {
    triggerHaptic(30);
    setIsExporting(true);

    try {
      let exportData: any = {
        exported_at: new Date().toISOString(),
        products: products,
        sales_transactions: [],
        sales_items: [],
        restock_logs: [],
        self_consumptions: [],
        personal_expenses: [],
        wallets: [],
      };

      if (isDbConnected) {
        const { data: sales } = await supabase.from('sales_transactions').select('*');
        const { data: items } = await supabase.from('sales_items').select('*');
        const { data: restock } = await supabase.from('restock_logs').select('*');
        const { data: selfCons } = await supabase.from('self_consumptions').select('*');
        const { data: exp } = await supabase.from('personal_expenses').select('*');
        const { data: wal } = await supabase.from('wallets').select('*');

        exportData.sales_transactions = sales || [];
        exportData.sales_items = items || [];
        exportData.restock_logs = restock || [];
        exportData.self_consumptions = selfCons || [];
        exportData.personal_expenses = exp || [];
        exportData.wallets = wal || [];
      } else {
        exportData.sales_transactions = JSON.parse(
          localStorage.getItem('warungscan_sales') || '[]'
        );
        exportData.restock_logs = JSON.parse(
          localStorage.getItem('warungscan_restock') || '[]'
        );
        exportData.self_consumptions = JSON.parse(
          localStorage.getItem('warungscan_self_consumption') || '[]'
        );
        exportData.personal_expenses = JSON.parse(
          localStorage.getItem('warungscan_personal_expenses') || '[]'
        );
        exportData.wallets = JSON.parse(
          localStorage.getItem('warungscan_wallets') || '[]'
        );
      }

      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(exportData, null, 2)
      )}`;
      const downloadAnchor = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', `warungscan-backup-${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      alert('Berhasil mengunduh backup data WarungScan!');
    } catch (err: any) {
      alert('Gagal mengekspor data: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  // 5. IMPOR DATABASE (UPLOAD FILE JSON)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    triggerHaptic(30);
    setIsImporting(true);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!parsed.products || !Array.isArray(parsed.products)) {
        throw new Error('Format file backup tidak sesuai (tidak ada data produk).');
      }

      if (isDbConnected) {
        for (const p of parsed.products) {
          await supabase.from('products').upsert(
            {
              name: p.name,
              cost_price: p.cost_price,
              selling_price: p.selling_price,
              stock: p.stock,
              category: p.category || 'Umum',
            },
            { onConflict: 'name' }
          );
        }
      } else {
        localStorage.setItem('warungscan_products', JSON.stringify(parsed.products));
        if (parsed.sales_transactions) {
          localStorage.setItem('warungscan_sales', JSON.stringify(parsed.sales_transactions));
        }
        if (parsed.restock_logs) {
          localStorage.setItem('warungscan_restock', JSON.stringify(parsed.restock_logs));
        }
      }

      alert(`Berhasil memulihkan ${parsed.products.length} barang dari file backup!`);
      onRefreshAll();
      onClose();
    } catch (err: any) {
      alert('Gagal mengimpor file: ' + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  // 6. RESET TRANSAKSI SAJA
  const handleResetTransactionsOnly = async () => {
    if (
      !confirm(
        'Hapus seluruh riwayat penjualan & kulakan? (Katalog barang dan jumlah stok saat ini TIDAK AKAN terhapus).'
      )
    ) {
      return;
    }

    triggerHaptic(35);
    try {
      if (isDbConnected) {
        await supabase.from('sales_items').delete().neq('qty', -9999);
        await supabase.from('sales_transactions').delete().neq('total_amount', -9999);
        await supabase.from('restock_logs').delete().neq('total_expense', -9999);
        await supabase.from('self_consumptions').delete().neq('qty', -9999);
      } else {
        localStorage.removeItem('warungscan_sales');
        localStorage.removeItem('warungscan_restock');
        localStorage.removeItem('warungscan_self_consumption');
      }

      alert('Riwayat penjualan dan kulakan berhasil dibersihkan.');
      onRefreshAll();
    } catch (err: any) {
      alert('Gagal mereset: ' + err.message);
    }
  };

  // 7. RESET TOTAL DATABASE
  const handleExecuteTotalReset = async () => {
    if (resetConfirmText.trim().toUpperCase() !== 'RESET') {
      alert('Ketik kata RESET dengan benar untuk konfirmasi.');
      return;
    }

    triggerHaptic(50);
    try {
      if (isDbConnected) {
        await supabase.from('sales_items').delete().neq('qty', -9999);
        await supabase.from('sales_transactions').delete().neq('total_amount', -9999);
        await supabase.from('restock_logs').delete().neq('total_expense', -9999);
        await supabase.from('self_consumptions').delete().neq('qty', -9999);
        await supabase.from('personal_expenses').delete().neq('amount', -9999);
        await supabase.from('products').delete().neq('name', '___dummy___');
      }

      localStorage.clear();

      alert('Database berhasil direset bersih.');
      setIsResetConfirmOpen(false);
      onRefreshAll();
      onClose();
    } catch (err: any) {
      alert('Gagal mereset total: ' + err.message);
    }
  };

  const isSuperAdmin = currentMember.role === 'super_admin';

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-sm w-full p-5 max-h-[92vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-slate-800" />
            <h3 className="text-lg font-black text-slate-900">Pengaturan & Akun</h3>
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

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json"
          className="hidden"
        />

        <div className="overflow-y-auto py-3 space-y-4 text-sm flex-1">
          {/* BAGIAN 1: STATUS AKUN & HAK AKSES */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Profil Aktif
              </span>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                  isSuperAdmin
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {isSuperAdmin ? 'SUPER ADMIN' : 'USER BIASA (KASIR)'}
              </span>
            </div>

            {/* Nama Profil & Tombol Ubah Nama */}
            {!isEditingName ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white font-bold flex items-center justify-center text-xs">
                    {currentMember.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {currentMember.name}
                  </span>
                </div>
                <button
                  onClick={() => {
                    triggerHaptic(20);
                    setEditedName(currentMember.name);
                    setIsEditingName(true);
                  }}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 bg-white border border-slate-200"
                  title="Ubah Nama Profil"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <form onSubmit={handleSaveProfileName} className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-600">
                  Ubah Nama Profil:
                </label>
                <div className="flex space-x-1.5">
                  <input
                    type="text"
                    required
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    placeholder="Nama Anda..."
                    className="flex-1 p-2 rounded-xl border border-slate-300 font-bold text-xs bg-white"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs"
                  >
                    Simpan
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingName(false)}
                    className="px-2.5 py-2 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold"
                  >
                    Batal
                  </button>
                </div>
              </form>
            )}

            {/* UPGRADE KE SUPER ADMIN / KEMBALI KE USER BIASA */}
            {!isSuperAdmin ? (
              !isUpgradeOpen ? (
                <button
                  onClick={() => {
                    triggerHaptic(20);
                    setIsUpgradeOpen(true);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center justify-center space-x-1.5 shadow-xs transition-colors"
                >
                  <Shield className="w-4 h-4 text-slate-950" />
                  <span>Akses Otoritas Super Admin</span>
                </button>
              ) : (
                <form
                  onSubmit={handleUpgradeToAdmin}
                  className="p-3 bg-white rounded-xl border border-amber-300 space-y-2"
                >
                  <label className="block text-[11px] font-bold text-slate-700">
                    Masukkan Kode Sandi Otoritas:
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    autoFocus
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••"
                    className="w-full p-2.5 rounded-xl border-2 border-amber-400 font-black text-center text-lg bg-amber-50 text-slate-900"
                  />
                  {upgradeError && (
                    <p className="text-[11px] text-red-600 font-bold">{upgradeError}</p>
                  )}
                  <div className="flex space-x-1.5 pt-1">
                    <button
                      type="submit"
                      className="flex-1 py-2 rounded-xl bg-emerald-700 text-white font-black text-xs"
                    >
                      Buka Super Admin
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsUpgradeOpen(false)}
                      className="px-3 py-2 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs"
                    >
                      Batal
                    </button>
                  </div>
                </form>
              )
            ) : (
              <div className="pt-1 flex items-center justify-between">
                <span className="text-[11px] text-emerald-800 font-bold">
                  Akses Penuh Super Admin Aktif
                </span>
                <button
                  onClick={handleDowngradeToUser}
                  className="text-[11px] font-extrabold text-slate-600 hover:text-slate-900 underline"
                >
                  Kembali ke User Biasa
                </button>
              </div>
            )}
          </div>

          {/* BAGIAN 2: TAMBAH ANGGOTA KELUARGA */}
          <div className="space-y-2">
            {!isAddingMemberOpen ? (
              <button
                onClick={() => {
                  triggerHaptic(20);
                  setIsAddingMemberOpen(true);
                  setIsMemberPinVerified(isSuperAdmin);
                }}
                className="w-full py-3 px-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center justify-center space-x-2"
              >
                <Plus className="w-4 h-4 text-emerald-700" />
                <span>Tambah Pengguna Baru</span>
              </button>
            ) : !isMemberPinVerified ? (
              <form
                onSubmit={handleVerifyMemberPin}
                className="p-3 bg-slate-50 rounded-2xl border border-slate-300 space-y-2"
              >
                <label className="block text-[11px] font-bold text-slate-700">
                  Masukkan Kode Otoritas:
                </label>
                <input
                  type="password"
                  maxLength={6}
                  autoFocus
                  value={memberPinCheck}
                  onChange={(e) => setMemberPinCheck(e.target.value)}
                  placeholder="••••"
                  className="w-full p-2.5 rounded-xl border-2 border-slate-300 font-black text-center text-lg bg-white text-slate-900"
                />
                <div className="flex space-x-1.5 pt-1">
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs"
                  >
                    Verifikasi
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingMemberOpen(false)}
                    className="px-3 py-2 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs"
                  >
                    Batal
                  </button>
                </div>
              </form>
            ) : (
              <form
                onSubmit={handleCreateMember}
                className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2.5 text-xs"
              >
                <h4 className="font-extrabold text-emerald-950">Form Tambah Anggota Keluarga</h4>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Anggota</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Adik, Nenek, Kasir 2..."
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Peran / Hak Akses</label>
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white"
                  >
                    <option value="family_member">User Biasa (Kasir)</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>

                <div className="flex space-x-1.5 pt-1">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-emerald-700 text-white font-bold"
                  >
                    Simpan Anggota
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingMemberOpen(false);
                      setIsMemberPinVerified(false);
                    }}
                    className="px-3 py-2.5 rounded-xl bg-slate-200 text-slate-700 font-bold"
                  >
                    Batal
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* BAGIAN KEAMANAN: KUNCI AKSES TOKO (SECURITY GATE) */}
          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Lock className="w-4 h-4 text-amber-600" />
                <h4 className="font-extrabold text-amber-950 text-xs uppercase tracking-wider">
                  Keamanan Akses Toko
                </h4>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-200 text-amber-900">
                Proteksi Hosting
              </span>
            </div>

            <p className="text-[11px] text-amber-900 leading-relaxed">
              PIN ini melindungi toko saat di-hosting live agar orang luar di internet tidak bisa masuk tanpa izin.
            </p>

            {gatePinSuccess && (
              <p className="text-[11px] font-bold text-emerald-700 bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                ✓ {gatePinSuccess}
              </p>
            )}

            {!isEditingGatePin ? (
              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block">PIN Masuk Toko:</span>
                  <span className="text-sm font-black text-slate-900 tracking-widest">••••</span>
                </div>

                <div className="flex space-x-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(20);
                      setIsEditingGatePin(true);
                      setNewGatePin('');
                    }}
                    className="py-1.5 px-3 rounded-xl bg-white border border-amber-300 text-amber-900 font-bold text-xs hover:bg-amber-100 transition-colors"
                  >
                    Ganti PIN
                  </button>

                  {onLockApp && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic(20);
                        onClose();
                        onLockApp();
                      }}
                      className="py-1.5 px-3 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors"
                      title="Kunci Layar Sekarang"
                    >
                      Kunci Sekarang
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveGatePin} className="space-y-2 pt-1">
                <label className="block text-[11px] font-bold text-amber-950">
                  Masukkan PIN Toko Baru (Minimal 4 Digit):
                </label>
                <div className="flex space-x-1.5">
                  <input
                    type="password"
                    maxLength={6}
                    autoFocus
                    required
                    placeholder="Contoh: 1234"
                    value={newGatePin}
                    onChange={(e) => setNewGatePin(e.target.value)}
                    className="flex-1 p-2 rounded-xl border border-amber-300 font-black text-center text-base tracking-widest bg-white"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs"
                  >
                    Simpan
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingGatePin(false)}
                    className="px-2.5 py-2 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs"
                  >
                    Batal
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* BAGIAN 3: CADANGAN DATA (BACKUP & RESTORE) */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Cadangan Data (Backup & Restore)
            </h4>

            <button
              onClick={handleExportData}
              disabled={isExporting}
              className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center justify-between shadow-xs transition-colors"
              style={{ minHeight: '48px' }}
            >
              <div className="flex items-center space-x-2.5">
                <Download className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-extrabold">Ekspor Data Warung (Download JSON)</span>
              </div>
              <FileJson className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={() => {
                triggerHaptic(20);
                fileInputRef.current?.click();
              }}
              disabled={isImporting}
              className="w-full py-3.5 px-4 rounded-xl border-2 border-slate-300 hover:bg-slate-50 text-slate-800 font-bold flex items-center justify-between transition-colors"
              style={{ minHeight: '48px' }}
            >
              <div className="flex items-center space-x-2.5">
                <Upload className="w-5 h-5 text-blue-600" />
                <span className="text-xs font-extrabold">Impor Data Cadangan (Upload JSON)</span>
              </div>
              <FileJson className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* BAGIAN 4: RESET DATA */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <h4 className="text-xs font-bold text-red-600 uppercase tracking-wider">
              Zona Bahaya (Reset Data)
            </h4>

            <button
              onClick={handleResetTransactionsOnly}
              className="w-full py-3 px-3.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-800 font-bold text-xs flex items-center space-x-2 text-left"
              style={{ minHeight: '44px' }}
            >
              <RotateCcw className="w-4 h-4 shrink-0 text-red-600" />
              <div>
                <p className="font-bold">Reset Riwayat Transaksi Saja</p>
                <p className="text-[10px] text-red-600/80">Katalog barang & stok tetap aman</p>
              </div>
            </button>

            <button
              onClick={() => {
                triggerHaptic(30);
                setIsResetConfirmOpen(true);
              }}
              className="w-full py-3 px-3.5 rounded-xl border border-red-300 bg-white hover:bg-red-50 text-red-700 font-bold text-xs flex items-center space-x-2 text-left"
              style={{ minHeight: '44px' }}
            >
              <Trash2 className="w-4 h-4 shrink-0 text-red-700" />
              <div>
                <p className="font-bold">Reset Total Semua Data</p>
                <p className="text-[10px] text-slate-500">Hapus semua barang dan transaksi</p>
              </div>
            </button>
          </div>

          {isResetConfirmOpen && (
            <div className="p-3.5 rounded-2xl bg-red-50 border-2 border-red-300 space-y-2.5">
              <div className="flex items-center space-x-2 text-red-900 font-bold text-xs">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                <span>Yakin ingin menghapus seluruh data?</span>
              </div>
              <p className="text-[11px] text-red-800">
                Ketik kata <strong>RESET</strong> di bawah ini untuk konfirmasi:
              </p>
              <input
                type="text"
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                placeholder="Ketik RESET"
                className="w-full p-2.5 rounded-xl border border-red-300 font-black text-center text-sm bg-white text-slate-900 uppercase"
              />
              <div className="flex space-x-2">
                <button
                  onClick={handleExecuteTotalReset}
                  className="flex-1 py-2.5 rounded-xl bg-red-700 text-white font-extrabold text-xs"
                >
                  Ya, Hapus Semua
                </button>
                <button
                  onClick={() => setIsResetConfirmOpen(false)}
                  className="px-3 py-2.5 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Batal
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
