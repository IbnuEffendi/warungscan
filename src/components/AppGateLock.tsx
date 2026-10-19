'use client';

import React, { useState, useEffect } from 'react';
import {
  Lock,
  ShieldCheck,
  Store,
  AlertCircle,
  Users,
  Shield,
  ArrowRight,
  ArrowLeft,
  UserCheck,
} from 'lucide-react';
import { FamilyMember } from '@/types';
import { triggerHaptic } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface AppGateLockProps {
  currentMember: FamilyMember | null;
  familyMembers: FamilyMember[];
  onUnlock: (member: FamilyMember) => void;
  isDbConnected: boolean;
}

export default function AppGateLock({
  currentMember,
  familyMembers,
  onUnlock,
  isDbConnected,
}: AppGateLockProps) {
  // Jika currentMember ada di list, tampilkan form PIN untuk currentMember.
  // Jika belum ada akun tersimpan (perangkat baru), tampilkan daftar pilih akun.
  const [selectedTarget, setSelectedTarget] = useState<FamilyMember | null>(currentMember || null);
  const [viewMode, setViewMode] = useState<'enter_pin' | 'select_account'>(
    currentMember ? 'enter_pin' : 'select_account'
  );

  const [liveMembers, setLiveMembers] = useState<FamilyMember[]>(familyMembers);
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);

  // Ambil data anggota dan PIN paling fresh langsung dari Supabase saat AppGateLock dibuka
  useEffect(() => {
    let isMounted = true;
    async function fetchFreshMembers() {
      try {
        const { data, error } = await supabase.from('family_members').select('*');
        if (!error && data && data.length > 0 && isMounted) {
          setLiveMembers(data);
          localStorage.setItem('warungscan_family', JSON.stringify(data));
          if (selectedTarget) {
            const matched = data.find((m) => m.id === selectedTarget.id);
            if (matched) setSelectedTarget(matched);
          } else if (currentMember) {
            const matched = data.find((m) => m.id === currentMember.id);
            if (matched) setSelectedTarget(matched);
          }
        }
      } catch (err) {
        console.warn('AppGateLock Supabase fetch error:', err);
      }
    }
    fetchFreshMembers();
    return () => {
      isMounted = false;
    };
  }, []);

  // Sinkronisasi target jika familyMembers prop dari parent berubah
  useEffect(() => {
    if (familyMembers.length > 0) {
      setLiveMembers(familyMembers);
      if (selectedTarget) {
        const matched = familyMembers.find((m) => m.id === selectedTarget.id);
        if (matched) setSelectedTarget(matched);
      } else if (currentMember) {
        const matched = familyMembers.find((m) => m.id === currentMember.id) || currentMember;
        setSelectedTarget(matched);
      }
    }
  }, [familyMembers, currentMember]);

  // Tombol Keypad
  const handleKeypadPress = async (val: string) => {
    triggerHaptic(15);
    if (pin.length < 6) {
      const nextPin = pin + val;
      setPin(nextPin);
      setErrorMsg('');

      // Auto-submit jika sudah 4 digit
      if (selectedTarget && nextPin.length >= 4) {
        let validPin = selectedTarget.pin;
        try {
          const { data: dbMember } = await supabase
            .from('family_members')
            .select('pin')
            .eq('id', selectedTarget.id)
            .maybeSingle();
          if (dbMember?.pin) {
            validPin = dbMember.pin;
            selectedTarget.pin = dbMember.pin;
          }
        } catch {}

        if (!validPin) validPin = '1234';

        if (nextPin === validPin || nextPin === '4477') {
          handleSuccessUnlock(selectedTarget);
        }
      }
    }
  };

  const handleBackspace = () => {
    triggerHaptic(15);
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleClear = () => {
    triggerHaptic(15);
    setPin('');
    setErrorMsg('');
  };

  const handlePickAccount = (member: FamilyMember) => {
    triggerHaptic(20);
    setSelectedTarget(member);
    setPin('');
    setErrorMsg('');
    setViewMode('enter_pin');
  };

  const handleSuccessUnlock = (member: FamilyMember) => {
    triggerHaptic(40);
    sessionStorage.setItem('warungscan_gate_unlocked', 'true');
    localStorage.setItem('warungscan_active_user_id', member.id);

    if (rememberDevice) {
      localStorage.setItem(
        'warungscan_gate_remember_until',
        String(Date.now() + 7 * 24 * 60 * 60 * 1000)
      );
    }

    onUnlock(member);
  };

  const handleSubmitPin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedTarget) return;

    if (!pin) {
      setErrorMsg('Masukkan PIN akun Anda.');
      return;
    }

    triggerHaptic(30);

    // Ambil PIN paling akurat langsung dari Supabase
    let validPin = selectedTarget.pin;
    try {
      const { data: dbMember } = await supabase
        .from('family_members')
        .select('pin')
        .eq('id', selectedTarget.id)
        .maybeSingle();

      if (dbMember?.pin) {
        validPin = dbMember.pin;
        selectedTarget.pin = dbMember.pin;
      }
    } catch {}

    if (!validPin) validPin = '1234';

    // Verifikasi dengan PIN akun dari database atau kode master pemilik (4477)
    if (pin.trim() === validPin.trim() || pin.trim() === '4477') {
      handleSuccessUnlock(selectedTarget);
    } else {
      triggerHaptic(60);
      setErrorMsg(`PIN salah untuk akun ${selectedTarget.name}.`);
      setPin('');
    }
  };

  // Pastikan ada anggota yang dapat dipilih (fallback jika list masih kosong)
  const displayMembers =
    liveMembers.length > 0
      ? liveMembers
      : [
          {
            id: '00000000-0000-0000-0000-000000000001',
            name: 'Kasir Utama',
            role: 'family_member' as const,
            pin: '1234',
            avatar_color: 'blue' as const,
          },
        ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-5 sm:p-6 text-white space-y-4 sm:space-y-5 shadow-2xl animate-in zoom-in-95 max-h-[94vh] flex flex-col">
        {/* BRAND & HEADER ATAS */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 bg-emerald-600/20 border border-emerald-500/40 rounded-2xl flex items-center justify-center mx-auto text-emerald-400 mb-1 shadow-inner">
            <Store className="w-6 h-6" />
          </div>
          <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center justify-center space-x-1.5">
            <span>WarungScan</span>
          </h2>
          <p className="text-[11px] text-slate-400 leading-tight">
            Sistem Kasir & Pembukuan Keuangan Keluarga
          </p>
        </div>

        {/* TAMPILAN 1: DAFTAR PILIH AKUN (LOGIN PERANGKAT BARU / GANTI AKUN) */}
        {viewMode === 'select_account' && (
          <div className="flex-1 overflow-y-auto space-y-3">
            <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60 text-center">
              <h3 className="font-extrabold text-sm text-emerald-400 flex items-center justify-center space-x-1.5">
                <Users className="w-4 h-4" />
                <span>Pilih Akun Anda</span>
              </h3>
              <p className="text-[11px] text-slate-300 mt-1">
                Pilih profil nama Anda di bawah ini untuk masuk ke aplikasi:
              </p>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {displayMembers.map((m) => {
                const isSuper = m.role === 'super_admin';
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handlePickAccount(m)}
                    className="w-full p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 active:scale-98 flex items-center justify-between transition-all text-left shadow-2xs group"
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
                          <h4 className="font-extrabold text-white text-xs sm:text-sm group-hover:text-emerald-400 transition-colors">
                            {m.name}
                          </h4>
                          {isSuper && <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {isSuper ? 'Super Admin' : 'Kasir / Pengguna'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 text-slate-400 group-hover:text-emerald-400">
                      <span className="text-[11px] font-bold">Pilih</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
              <p className="text-[10px] text-slate-400">
                Pendaftaran akun baru hanya dapat dilakukan oleh Super Admin di menu Pengaturan.
              </p>
            </div>
          </div>
        )}

        {/* TAMPILAN 2: MASUKKAN PIN UNTUK AKUN YANG DIPILIH */}
        {viewMode === 'enter_pin' && selectedTarget && (
          <div className="flex-1 space-y-3 sm:space-y-4">
            {/* Kartu Profil Terpilih */}
            <div className="bg-slate-800/70 p-3 rounded-2xl border border-slate-700/70 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-white ${
                    selectedTarget.role === 'super_admin' ? 'bg-emerald-600' : 'bg-blue-600'
                  }`}
                >
                  {selectedTarget.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-black text-white text-xs sm:text-sm">
                      {selectedTarget.name}
                    </span>
                    {selectedTarget.role === 'super_admin' && (
                      <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    {selectedTarget.role === 'super_admin' ? 'Super Admin' : 'Kasir / Pengguna'}
                  </span>
                </div>
              </div>

              {/* Tombol Ganti Akun */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(15);
                  setViewMode('select_account');
                  setPin('');
                  setErrorMsg('');
                }}
                className="py-1.5 px-2.5 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-300 text-[11px] font-bold transition-all border border-slate-600/60"
                style={{ minHeight: '36px' }}
              >
                Ganti Akun
              </button>
            </div>

            {/* Display PIN Dots */}
            <div className="space-y-1.5">
              <div className="flex justify-center items-center space-x-3 py-2 bg-slate-950/60 rounded-2xl border border-slate-800">
                {[0, 1, 2, 3].map((idx) => {
                  const filled = pin.length > idx;
                  return (
                    <div
                      key={idx}
                      className={`w-3.5 h-3.5 rounded-full transition-all ${
                        filled
                          ? 'bg-emerald-400 scale-110 shadow-sm shadow-emerald-400/50'
                          : 'bg-slate-700/60 border border-slate-600'
                      }`}
                    />
                  );
                })}
              </div>

              {errorMsg ? (
                <div className="flex items-center space-x-1.5 text-rose-400 text-[11px] font-semibold justify-center">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              ) : (
                <p className="text-[10px] text-slate-400 text-center">
                  Masukkan PIN 4 digit akun Anda
                </p>
              )}
            </div>

            {/* Keypad Numeric */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-base font-bold select-none">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleKeypadPress(digit)}
                  className="py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 active:bg-emerald-600 active:text-white border border-slate-700/60 text-slate-200 transition-all active:scale-95 text-base sm:text-lg font-black shadow-xs"
                  style={{ minHeight: '48px' }}
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                className="py-3 rounded-2xl bg-slate-800/40 hover:bg-slate-700/60 border border-slate-800 text-slate-400 text-xs font-bold transition-all active:scale-95"
                style={{ minHeight: '48px' }}
              >
                Hapus
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress('0')}
                className="py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 active:bg-emerald-600 active:text-white border border-slate-700/60 text-slate-200 text-base sm:text-lg font-black transition-all active:scale-95 shadow-xs"
                style={{ minHeight: '48px' }}
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="py-3 rounded-2xl bg-slate-800/40 hover:bg-slate-700/60 border border-slate-800 text-slate-300 text-sm font-bold transition-all active:scale-95"
                style={{ minHeight: '48px' }}
                title="Hapus Satu Digit"
              >
                ⌫
              </button>
            </div>

            {/* Ingat Perangkat & Tombol Konfirmasi */}
            <div className="space-y-2 pt-0.5">
              <label className="flex items-center space-x-2 text-xs text-slate-400 cursor-pointer justify-center select-none">
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 bg-slate-800 border-slate-700"
                />
                <span className="text-[11px]">Ingat akun di perangkat ini (7 Hari)</span>
              </label>

              <button
                type="button"
                onClick={() => handleSubmitPin()}
                disabled={pin.length === 0}
                className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 active:scale-98 transition-all disabled:opacity-40"
                style={{ minHeight: '46px' }}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Buka Akses Profil</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
