'use client';

import React, { useState } from 'react';
import { Users, Shield, User, X, Check, Lock, Plus, Edit2, Trash2, KeyRound } from 'lucide-react';
import { FamilyMember } from '@/types';
import { triggerHaptic, generateUUID } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface FamilyAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMember: FamilyMember;
  onSelectMember: (member: FamilyMember) => void;
  familyMembers: FamilyMember[];
  onRefreshMembers: () => void;
  isDbConnected: boolean;
  onUnlockSuperAdmin?: () => void;
}

export default function FamilyAuthModal({
  isOpen,
  onClose,
  currentMember,
  onSelectMember,
  familyMembers,
  onRefreshMembers,
  isDbConnected,
  onUnlockSuperAdmin,
}: FamilyAuthModalProps) {
  // State Ganti User dengan PIN
  const [targetMemberForSwitch, setTargetMemberForSwitch] = useState<FamilyMember | null>(null);
  const [switchPinInput, setSwitchPinInput] = useState('');
  const [switchError, setSwitchError] = useState('');

  // State Ganti Nama Profil
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(currentMember.name);

  // State Ganti PIN Akun Sendiri
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [oldPinInput, setOldPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [pinChangeError, setPinChangeError] = useState('');

  // State Tambah Pengguna Baru
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [authPinBeforeAdd, setAuthPinBeforeAdd] = useState('');
  const [isAddAuthorized, setIsAddAuthorized] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMemberPin, setNewMemberPin] = useState('1234');

  // Secret Door Counter (Tap 5x pada logo gembok)
  const [secretTapCount, setSecretTapCount] = useState(0);
  const [isSecretAuthOpen, setIsSecretAuthOpen] = useState(false);
  const [secretCodeInput, setSecretCodeInput] = useState('');

  if (!isOpen) return null;

  const isSuperAdmin = currentMember.role === 'super_admin';

  // 1. GANTI USER (Bila Super Admin: langsung switch. Bila User Biasa: harus PIN target)
  const handleSelectMember = (member: FamilyMember) => {
    triggerHaptic(20);
    setSwitchError('');

    if (member.id === currentMember.id) {
      onClose();
      return;
    }

    if (isSuperAdmin) {
      // Super Admin bypass PIN
      onSelectMember(member);
      onClose();
    } else {
      // Minta PIN pengguna yang dituju
      setTargetMemberForSwitch(member);
      setSwitchPinInput('');
    }
  };

  const handleVerifySwitchPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetMemberForSwitch) return;

    triggerHaptic(30);
    const expectedPin = targetMemberForSwitch.pin || '1234';

    // Juga izinkan master code 4477 jika pemilik lupa PIN
    if (switchPinInput.trim() === expectedPin || switchPinInput.trim() === '4477') {
      onSelectMember(targetMemberForSwitch);
      setTargetMemberForSwitch(null);
      setSwitchPinInput('');
      onClose();
    } else {
      setSwitchError('PIN tidak cocok!');
    }
  };

  // 2. UBAH NAMA PROFIL
  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;

    triggerHaptic(30);
    const updated: FamilyMember = {
      ...currentMember,
      name: nameInput.trim(),
    };

    try {
      if (isDbConnected) {
        await supabase.from('family_members').update({ name: updated.name }).eq('id', updated.id);
      } else {
        const local: FamilyMember[] = JSON.parse(localStorage.getItem('warungscan_family') || '[]');
        const updatedList = local.map((m) => (m.id === updated.id ? { ...m, name: updated.name } : m));
        localStorage.setItem('warungscan_family', JSON.stringify(updatedList));
      }

      onSelectMember(updated);
      onRefreshMembers();
      setIsEditingName(false);
      alert('Nama profil berhasil disimpan.');
    } catch (err: any) {
      alert('Gagal mengubah nama: ' + err.message);
    }
  };

  // 3. GANTI PIN AKUN SENDIRI
  // 3. GANTI PIN AKUN SENDIRI
  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinChangeError('');

    const currentPin = currentMember.pin || '1234';
    if (oldPinInput.trim() !== currentPin && oldPinInput.trim() !== '4477') {
      setPinChangeError('PIN lama tidak sesuai.');
      return;
    }

    if (newPinInput.trim().length < 4) {
      setPinChangeError('PIN baru minimal 4 angka.');
      return;
    }

    triggerHaptic(30);
    const updated: FamilyMember = {
      ...currentMember,
      pin: newPinInput.trim(),
    };

    try {
      if (isDbConnected) {
        await supabase.from('family_members').update({ pin: updated.pin }).eq('id', updated.id);
      }

      const local: FamilyMember[] = JSON.parse(localStorage.getItem('warungscan_family') || '[]');
      const updatedList = local.map((m) => (m.id === updated.id ? { ...m, pin: updated.pin } : m));
      localStorage.setItem('warungscan_family', JSON.stringify(updatedList));

      onSelectMember(updated);
      onRefreshMembers();
      setIsChangingPin(false);
      setOldPinInput('');
      setNewPinInput('');
      alert('PIN Anda berhasil diperbarui di seluruh perangkat!');
    } catch (err: any) {
      setPinChangeError('Gagal mengubah PIN: ' + err.message);
    }
  };

  // 4. HAPUS PENGGUNA / HAPUS AKUN SENDIRI
  const handleDeleteMember = async (memberToDelete: FamilyMember) => {
    if (familyMembers.length <= 1) {
      alert('Tidak dapat menghapus. Minimal harus ada 1 pengguna di sistem.');
      return;
    }

    const confirmText =
      memberToDelete.id === currentMember.id
        ? `Apakah Anda yakin ingin menghapus akun Anda sendiri (${memberToDelete.name})?`
        : `Hapus pengguna "${memberToDelete.name}" dari sistem?`;

    if (!window.confirm(confirmText)) return;

    triggerHaptic(40);
    try {
      if (isDbConnected) {
        await supabase.from('family_members').delete().eq('id', memberToDelete.id);
      } else {
        const local: FamilyMember[] = JSON.parse(localStorage.getItem('warungscan_family') || '[]');
        const updatedList = local.filter((m) => m.id !== memberToDelete.id);
        localStorage.setItem('warungscan_family', JSON.stringify(updatedList));
      }

      // Jika menghapus akun yang sedang aktif, beralih ke user lain yang tersisa
      if (memberToDelete.id === currentMember.id) {
        const remaining = familyMembers.filter((m) => m.id !== memberToDelete.id);
        if (remaining.length > 0) {
          onSelectMember(remaining[0]);
        }
      }

      onRefreshMembers();
      alert('Pengguna berhasil dihapus.');
    } catch (err: any) {
      alert('Gagal menghapus pengguna: ' + err.message);
    }
  };

  // 5. TAMBAH PENGGUNA BARU
  const handleVerifyAuthForAdd = (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic(20);
    if (authPinBeforeAdd.trim() === '4477' || authPinBeforeAdd.trim() === (currentMember.pin || '1234')) {
      setIsAddAuthorized(true);
      setAuthPinBeforeAdd('');
    } else {
      alert('Kode otorisasi tidak valid.');
    }
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    triggerHaptic(30);
    const newMemberId = generateUUID();
    const newMember: FamilyMember = {
      id: newMemberId,
      name: newName.trim(),
      role: 'family_member',
      pin: newMemberPin.trim() || '1234',
      avatar_color: 'blue',
      created_at: new Date().toISOString(),
    };

    try {
      if (isDbConnected) {
        await supabase.from('family_members').insert({
          id: newMember.id,
          name: newMember.name,
          role: newMember.role,
          pin: newMember.pin,
          avatar_color: newMember.avatar_color,
        });

        // Buat dompet awal
        await supabase.from('wallets').insert({
          id: generateUUID(),
          user_id: newMember.id,
          name: `Dompet ${newMember.name}`,
          type: 'cash_pribadi',
          balance: 0,
          is_private: true,
        });
      } else {
        const local: FamilyMember[] = JSON.parse(localStorage.getItem('warungscan_family') || '[]');
        local.push(newMember);
        localStorage.setItem('warungscan_family', JSON.stringify(local));

        const localWallets = JSON.parse(localStorage.getItem('warungscan_wallets') || '[]');
        localWallets.push({
          id: generateUUID(),
          user_id: newMember.id,
          name: `Dompet ${newMember.name}`,
          type: 'cash_pribadi',
          balance: 0,
          is_private: true,
        });
        localStorage.setItem('warungscan_wallets', JSON.stringify(localWallets));
      }

      onRefreshMembers();
      setIsAddingNew(false);
      setIsAddAuthorized(false);
      setNewName('');
      setNewMemberPin('1234');
      alert(`Pengguna "${newMember.name}" berhasil didaftarkan.`);
    } catch (err: any) {
      alert('Gagal mendaftarkan pengguna: ' + err.message);
    }
  };

  // 6. SECRET METHOD UNTUK MENJADI SUPER ADMIN (Tap ikon gembok 5x)
  const handleSecretIconTap = () => {
    const nextCount = secretTapCount + 1;
    triggerHaptic(15);
    setSecretTapCount(nextCount);

    if (nextCount >= 5) {
      setSecretTapCount(0);
      setIsSecretAuthOpen(true);
      setSecretCodeInput('');
    }
  };

  const handleVerifySecretAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (secretCodeInput.trim() === '4477') {
      triggerHaptic(50);
      const updated: FamilyMember = {
        ...currentMember,
        role: 'super_admin',
      };
      onSelectMember(updated);
      if (onUnlockSuperAdmin) onUnlockSuperAdmin();
      setIsSecretAuthOpen(false);
      setSecretCodeInput('');
      alert('Otoritas Super Admin Terverifikasi.');
    } else {
      alert('Akses ditolak.');
      setIsSecretAuthOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-sm w-full p-5 max-h-[92vh] flex flex-col shadow-2xl">
        {/* HEADER MODAL */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleSecretIconTap}
              className="p-1 rounded-lg text-emerald-800 hover:bg-emerald-50 active:scale-95 transition-transform"
              title="Kelola Pengguna"
            >
              <Users className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-black text-slate-900">Pengguna & Akun</h3>
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

        <div className="overflow-y-auto py-3 space-y-3.5 flex-1 text-sm">
          {/* PROFIL YANG SEDANG AKTIF */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            {!isEditingName ? (
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    Profil Aktif:
                  </span>
                  <div className="flex items-center space-x-1.5 mt-0.5">
                    <p className="font-extrabold text-slate-900 text-sm">{currentMember.name}</p>
                    {isSuperAdmin && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                        Admin
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => {
                      triggerHaptic(20);
                      setNameInput(currentMember.name);
                      setIsEditingName(true);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 flex items-center space-x-1 hover:bg-slate-50"
                  >
                    <Edit2 className="w-3 h-3 text-slate-500" />
                    <span>Ubah Nama</span>
                  </button>

                  <button
                    onClick={() => {
                      triggerHaptic(20);
                      setIsChangingPin(!isChangingPin);
                      setPinChangeError('');
                    }}
                    className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                    title="Ganti PIN Akun"
                  >
                    <KeyRound className="w-4 h-4 text-slate-600" />
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveName} className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-700">Nama Baru:</label>
                <div className="flex space-x-1.5">
                  <input
                    type="text"
                    required
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
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

            {/* FORM GANTI PIN SENDIRI */}
            {isChangingPin && (
              <form
                onSubmit={handleChangePin}
                className="mt-2 pt-2 border-t border-slate-200 space-y-2 text-xs"
              >
                <p className="font-extrabold text-slate-800">Ganti PIN Keamanan Akun</p>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                    PIN Lama:
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={oldPinInput}
                    onChange={(e) => setOldPinInput(e.target.value)}
                    placeholder="PIN saat ini"
                    className="w-full p-2 rounded-xl border border-slate-300 font-bold bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                    PIN Baru (minimal 4 angka):
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={newPinInput}
                    onChange={(e) => setNewPinInput(e.target.value)}
                    placeholder="PIN baru Anda"
                    className="w-full p-2 rounded-xl border border-slate-300 font-bold bg-white text-xs"
                  />
                </div>

                {pinChangeError && (
                  <p className="text-[11px] text-red-600 font-bold">{pinChangeError}</p>
                )}

                <div className="flex space-x-1.5 pt-1">
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs"
                  >
                    Simpan PIN Baru
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsChangingPin(false)}
                    className="px-3 py-2 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs"
                  >
                    Batal
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* VERIFIKASI PIN SAAT GANTI USER */}
          {targetMemberForSwitch ? (
            <form
              onSubmit={handleVerifySwitchPin}
              className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 animate-in fade-in"
            >
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center mx-auto mb-1.5">
                  <Lock className="w-5 h-5" />
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm">
                  Masukkan PIN {targetMemberForSwitch.name}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Setiap akun dilindungi PIN pribadi
                </p>
              </div>

              <input
                type="password"
                maxLength={6}
                autoFocus
                value={switchPinInput}
                onChange={(e) => setSwitchPinInput(e.target.value)}
                placeholder="••••"
                className="w-full text-center text-xl font-black tracking-widest p-2.5 rounded-xl border-2 border-slate-300 focus:border-emerald-600 focus:outline-none bg-white"
              />

              {switchError && (
                <p className="text-xs text-red-600 font-bold text-center">{switchError}</p>
              )}

              <div className="flex space-x-2 pt-1">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-700 text-white font-extrabold text-xs"
                >
                  Buka Akun
                </button>
                <button
                  type="button"
                  onClick={() => setTargetMemberForSwitch(null)}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Batal
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* DAFTAR ANGGOTA */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Daftar Pengguna:
                  </p>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    {familyMembers.length} Akun
                  </span>
                </div>

                {familyMembers.map((member) => {
                  const isActive = member.id === currentMember.id;
                  const isMemberAdmin = member.role === 'super_admin';

                  return (
                    <div
                      key={member.id}
                      className={`w-full p-3 rounded-2xl border transition-all flex items-center justify-between ${
                        isActive
                          ? 'bg-emerald-50 border-emerald-400 shadow-xs'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectMember(member)}
                        className="flex items-center space-x-3 flex-1 text-left min-h-[44px]"
                      >
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-white shrink-0 ${
                            isMemberAdmin ? 'bg-emerald-700' : 'bg-blue-600'
                          }`}
                        >
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-900 text-xs">{member.name}</h4>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {isActive ? 'Sedang Digunakan' : 'Klik untuk Ganti'}
                          </span>
                        </div>
                      </button>

                      <div className="flex items-center space-x-1 ml-2">
                        {isActive && (
                          <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}

                        {/* Tombol Hapus Pengguna (Bila > 1 akun) */}
                        {familyMembers.length > 1 && (isSuperAdmin || isActive) && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMember(member)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Hapus Akun Ini"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* FORM TAMBAH PENGGUNA BARU */}
              {!isAddingNew ? (
                <button
                  onClick={() => {
                    triggerHaptic(20);
                    setIsAddingNew(true);
                    setIsAddAuthorized(isSuperAdmin);
                  }}
                  className="w-full py-2.5 rounded-2xl border-2 border-dashed border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 flex items-center justify-center space-x-1.5"
                  style={{ minHeight: '44px' }}
                >
                  <Plus className="w-4 h-4 text-emerald-700" />
                  <span>Tambah Pengguna Baru</span>
                </button>
              ) : !isAddAuthorized ? (
                <form
                  onSubmit={handleVerifyAuthForAdd}
                  className="p-3 bg-slate-50 rounded-2xl border border-slate-300 space-y-2 text-xs"
                >
                  <label className="block font-bold text-slate-700">
                    Ketik PIN Otoritas untuk Menambah Pengguna:
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    autoFocus
                    value={authPinBeforeAdd}
                    onChange={(e) => setAuthPinBeforeAdd(e.target.value)}
                    placeholder="••••"
                    className="w-full p-2 rounded-xl border-2 border-slate-300 font-black text-center text-base bg-white"
                  />
                  <div className="flex space-x-1.5 pt-1">
                    <button
                      type="submit"
                      className="flex-1 py-2 rounded-xl bg-emerald-700 text-white font-bold"
                    >
                      Lanjutkan
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingNew(false)}
                      className="px-3 py-2 rounded-xl bg-slate-200 text-slate-700 font-bold"
                    >
                      Batal
                    </button>
                  </div>
                </form>
              ) : (
                <form
                  onSubmit={handleCreateMember}
                  className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2.5 text-xs animate-in fade-in"
                >
                  <h4 className="font-extrabold text-emerald-950">Form Pengguna Baru</h4>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nama Pengguna</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Ayah, Ibu, Kasir Pagi..."
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full p-2 rounded-xl border border-slate-300 font-bold bg-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Setel PIN Awal (4 digit)
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      required
                      value={newMemberPin}
                      onChange={(e) => setNewMemberPin(e.target.value)}
                      placeholder="1234"
                      className="w-full p-2 rounded-xl border border-slate-300 font-bold bg-white text-xs"
                    />
                  </div>

                  <div className="flex space-x-1.5 pt-1">
                    <button
                      type="submit"
                      className="flex-1 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs"
                    >
                      Daftarkan
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingNew(false);
                        setIsAddAuthorized(false);
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs"
                    >
                      Batal
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          {/* SECRET DOOR DIALOG (MUNCUL JIKA TAP 5X PADA IKON PENGGUNA) */}
          {isSecretAuthOpen && (
            <div className="p-3 bg-slate-900 text-white rounded-2xl space-y-2 animate-in zoom-in-95">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-amber-400">
                  Otoritas Sistem Rahasia
                </span>
                <button
                  type="button"
                  onClick={() => setIsSecretAuthOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-slate-300">
                Masukkan kode akses khusus untuk otoritas penuh Super Admin:
              </p>
              <form onSubmit={handleVerifySecretAdmin} className="space-y-1.5">
                <input
                  type="password"
                  maxLength={6}
                  autoFocus
                  value={secretCodeInput}
                  onChange={(e) => setSecretCodeInput(e.target.value)}
                  placeholder="••••"
                  className="w-full p-2 rounded-xl bg-slate-800 border border-slate-700 text-center text-lg font-black tracking-widest text-white focus:outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs"
                >
                  Verifikasi Otoritas
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
