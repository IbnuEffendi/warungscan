'use client';

import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  User,
  KeyRound,
  CheckCircle2,
  Lock,
  ArrowRight,
  Store,
  Sparkles,
} from 'lucide-react';
import { FamilyMember } from '@/types';
import { triggerHaptic, generateUUID } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface NewDeviceAuthModalProps {
  isOpen: boolean;
  familyMembers: FamilyMember[];
  onSelectMember: (member: FamilyMember) => void;
  onRefreshMembers: () => void;
  isDbConnected: boolean;
}

export default function NewDeviceAuthModal({
  isOpen,
  familyMembers,
  onSelectMember,
  onRefreshMembers,
  isDbConnected,
}: NewDeviceAuthModalProps) {
  const [activeMode, setActiveMode] = useState<'choose' | 'register'>('choose');

  // State untuk memilih akun yang sudah ada
  const [selectedTarget, setSelectedTarget] = useState<FamilyMember | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // State untuk buat akun baru
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'family_member' | 'super_admin'>('family_member');
  const [newPin, setNewPin] = useState('1234');
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  // 1. Masuk ke Akun yang Sudah Ada
  const handlePickMember = (member: FamilyMember) => {
    triggerHaptic(20);
    setSelectedTarget(member);
    setPinInput('');
    setPinError('');
  };

  const handleConfirmLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTarget) return;

    triggerHaptic(30);
    const validPin = selectedTarget.pin || '1234';

    if (pinInput.trim() === validPin || pinInput.trim() === '4477') {
      triggerHaptic(40);
      localStorage.setItem('warungscan_active_user_id', selectedTarget.id);
      onSelectMember(selectedTarget);
    } else {
      triggerHaptic(60);
      setPinError('PIN akun tidak cocok. Coba lagi atau gunakan PIN Pemilik.');
    }
  };

  // 2. Buat Akun Baru
  const handleRegisterNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsCreating(true);
    triggerHaptic(30);

    const newMemberId = generateUUID();
    const newMember: FamilyMember = {
      id: newMemberId,
      name: newName.trim(),
      role: newRole,
      pin: newPin.trim() || '1234',
      avatar_color: newRole === 'super_admin' ? 'emerald' : 'blue',
    };

    try {
      // 1. Simpan ke LocalStorage
      const localFam: FamilyMember[] = JSON.parse(
        localStorage.getItem('warungscan_family') || '[]'
      );
      localFam.push(newMember);
      localStorage.setItem('warungscan_family', JSON.stringify(localFam));

      // Buat dompet pribadi untuk user baru
      const localWallets = JSON.parse(localStorage.getItem('warungscan_wallets') || '[]');
      const newWallet = {
        id: generateUUID(),
        user_id: newMemberId,
        name: `Dompet ${newName.trim()}`,
        type: 'cash_pribadi',
        balance: 0,
        is_private: true,
      };
      localWallets.push(newWallet);
      localStorage.setItem('warungscan_wallets', JSON.stringify(localWallets));

      // 2. Simpan ke Supabase jika terhubung
      if (isDbConnected) {
        await supabase.from('family_members').insert({
          id: newMember.id,
          name: newMember.name,
          role: newMember.role,
          pin: newMember.pin,
          avatar_color: newMember.avatar_color,
        });

        await supabase.from('wallets').insert(newWallet);
      }

      // 3. Simpan ID aktif di perangkat ini
      localStorage.setItem('warungscan_active_user_id', newMember.id);
      onRefreshMembers();
      onSelectMember(newMember);
      alert(`Selamat datang, ${newMember.name}! Akun profil Anda berhasil dibuat.`);
    } catch (err: any) {
      console.warn('Register notice:', err.message);
      localStorage.setItem('warungscan_active_user_id', newMember.id);
      onSelectMember(newMember);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95 max-h-[92vh] flex flex-col">
        {/* Header Onboarding */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-xs">
            <Store className="w-6 h-6 text-emerald-700" />
          </div>
          <h2 className="text-lg font-black text-slate-900">
            Perangkat Baru Terdeteksi
          </h2>
          <p className="text-xs text-slate-500">
            Pilih cara Anda masuk ke WarungScan di perangkat HP/komputer ini:
          </p>
        </div>

        {/* Tab Pilihan Mode: Masuk Akun Lama vs Buat Baru */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              triggerHaptic(15);
              setActiveMode('choose');
              setSelectedTarget(null);
            }}
            className={`py-2.5 px-2 rounded-xl flex items-center justify-center space-x-1.5 transition-all ${
              activeMode === 'choose'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            style={{ minHeight: '42px' }}
          >
            <Users className="w-4 h-4 text-emerald-700" />
            <span>Pilih Akun Lama</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic(15);
              setActiveMode('register');
              setSelectedTarget(null);
            }}
            className={`py-2.5 px-2 rounded-xl flex items-center justify-center space-x-1.5 transition-all ${
              activeMode === 'register'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            style={{ minHeight: '42px' }}
          >
            <UserPlus className="w-4 h-4 text-amber-600" />
            <span>+ Buat Akun Baru</span>
          </button>
        </div>

        {/* MODE 1: PILIH AKUN YANG SUDAH ADA */}
        {activeMode === 'choose' && (
          <div className="flex-1 overflow-y-auto space-y-3">
            {!selectedTarget ? (
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Daftar Profil Anggota ({familyMembers.length}):
                </p>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {familyMembers.map((m) => {
                    const isSuper = m.role === 'super_admin';
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handlePickMember(m)}
                        className="w-full p-3 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 active:scale-98 flex items-center justify-between transition-all text-left bg-white shadow-2xs"
                        style={{ minHeight: '52px' }}
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-white ${
                              isSuper ? 'bg-emerald-600' : 'bg-blue-600'
                            }`}
                          >
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">
                                {m.name}
                              </h4>
                              {isSuper && (
                                <Shield className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 font-medium">
                              {isSuper ? 'Super Admin' : 'Kasir / Pengguna'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1 text-slate-400">
                          <span className="text-[11px] font-bold text-emerald-700">Pilih</span>
                          <ArrowRight className="w-4 h-4 text-emerald-600" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Masukkan PIN akun yang dipilih */
              <form onSubmit={handleConfirmLogin} className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 animate-in fade-in">
                <div className="text-center space-y-1">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center mx-auto text-sm">
                    {selectedTarget.name.charAt(0).toUpperCase()}
                  </div>
                  <h4 className="font-black text-slate-900 text-sm">
                    Masuk sebagai {selectedTarget.name}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Masukkan PIN akun untuk membuka akses di perangkat ini:
                  </p>
                </div>

                <div>
                  <input
                    type="password"
                    maxLength={6}
                    autoFocus
                    required
                    placeholder="••••"
                    value={pinInput}
                    onChange={(e) => {
                      setPinInput(e.target.value);
                      setPinError('');
                    }}
                    className="w-full p-3 rounded-xl border-2 border-slate-300 font-black text-center text-xl tracking-widest bg-white focus:outline-none focus:border-emerald-600"
                  />
                  {pinError && (
                    <p className="text-[11px] text-rose-600 font-bold mt-1 text-center">
                      {pinError}
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400 text-center mt-1">
                    Default PIN: <strong className="text-slate-600">1234</strong>
                  </p>
                </div>

                <div className="flex space-x-2 pt-1">
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs shadow-xs"
                    style={{ minHeight: '44px' }}
                  >
                    Masuk ke Profil
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTarget(null)}
                    className="px-3 py-3 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs"
                    style={{ minHeight: '44px' }}
                  >
                    Kembali
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* MODE 2: FORM DAFTAR AKUN BARU */}
        {activeMode === 'register' && (
          <form onSubmit={handleRegisterNew} className="flex-1 overflow-y-auto space-y-3 text-xs animate-in fade-in">
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 space-y-1">
              <strong className="font-black text-amber-950 text-xs block flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Buat Profil Keluarga Baru</span>
              </strong>
              <p className="text-[11px] text-amber-900 leading-relaxed">
                Setiap anggota memiliki dompet pribadi dan catatan keuangan yang terisolasi serta aman dari anggota lain.
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Nama Lengkap / Panggilan
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="Contoh: Ibu, Rian, Mbak Ana..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white text-slate-900 text-xs"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Peran / Hak Akses
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as any)}
                className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white text-slate-900 text-xs"
              >
                <option value="family_member">User Biasa (Kasir & Keuangan Pribadi)</option>
                <option value="super_admin">Super Admin (Akses Penuh Seluruh Sistem)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Buat PIN Akun Anda (Minimal 4 Digit)
              </label>
              <input
                type="password"
                maxLength={6}
                required
                placeholder="Contoh: 1234"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 font-black text-center text-base tracking-widest bg-white text-slate-900"
              />
              <span className="text-[10px] text-slate-400 block mt-0.5">
                PIN ini digunakan untuk membuka catatan keuangan pribadi Anda.
              </span>
            </div>

            <button
              type="submit"
              disabled={isCreating || !newName.trim()}
              className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs shadow-xs transition-colors disabled:opacity-50 mt-2"
              style={{ minHeight: '44px' }}
            >
              {isCreating ? 'Mendaftarkan Akun...' : 'Daftar & Masuk Sekarang'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
