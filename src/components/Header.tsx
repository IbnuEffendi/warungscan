'use client';

import React, { useEffect, useState } from 'react';
import {
  Store,
  Database,
  Download,
  Settings,
  User,
  Shield,
  TrendingUp,
  Lock,
  X,
  BookOpen,
} from 'lucide-react';
import { FamilyMember } from '@/types';
import { triggerHaptic } from '@/lib/utils';

interface HeaderProps {
  currentMember: FamilyMember;
  onOpenFamilyAuth: () => void;
  onOpenReports: () => void;
  onOpenSettings: () => void;
  isDbConnected: boolean;
  onOpenDbModal: () => void;
  onElevateSuperAdmin?: () => void;
  onOpenGuidebook: () => void;
  onLockApp: () => void;
}

export default function Header({
  currentMember,
  onOpenFamilyAuth,
  onOpenReports,
  onOpenSettings,
  isDbConnected,
  onOpenDbModal,
  onElevateSuperAdmin,
  onOpenGuidebook,
  onLockApp,
}: HeaderProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  // Secret Door Tap Counter (5 taps)
  const [secretTaps, setSecretTaps] = useState(0);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [isSecretDialogVisible, setIsSecretDialogVisible] = useState(false);
  const [secretInput, setSecretInput] = useState('');

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    triggerHaptic(30);
    if (!deferredPrompt) {
      alert(
        'Untuk memasang di HP: Buka menu browser (titik 3 di Chrome atau tombol Bagikan di Safari) lalu pilih "Tambahkan ke Layar Utama".'
      );
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  const isSuperAdmin = currentMember.role === 'super_admin';

  // Secret Tap Detection on Store Logo
  const handleLogoTap = () => {
    const now = Date.now();
    triggerHaptic(15);
    if (now - lastTapTime < 1000) {
      const next = secretTaps + 1;
      setSecretTaps(next);
      if (next >= 5) {
        setSecretTaps(0);
        setIsSecretDialogVisible(true);
        setSecretInput('');
      }
    } else {
      setSecretTaps(1);
    }
    setLastTapTime(now);
  };

  const handleSecretSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (secretInput.trim() === '4477') {
      triggerHaptic(50);
      if (onElevateSuperAdmin) onElevateSuperAdmin();
      setIsSecretDialogVisible(false);
      setSecretInput('');
      alert('Mode Super Admin Berhasil Diaktifkan.');
    } else {
      alert('Kode tidak valid.');
      setIsSecretDialogVisible(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-emerald-800 text-white w-full px-2 sm:px-3 py-1.5 sm:py-2 shadow-md">
        <div className="flex items-center justify-between w-full max-w-full gap-1">
          {/* Tombol Profil Pengguna Keluarga */}
          <button
            onClick={() => {
              triggerHaptic(20);
              onOpenFamilyAuth();
            }}
            className="flex items-center space-x-1.5 bg-emerald-900/80 hover:bg-emerald-950 py-1 sm:py-1.5 px-2 sm:px-2.5 rounded-xl border border-emerald-400/30 transition-all text-left shrink-0"
            title="Klik untuk kelola akun"
          >
            <div
              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center font-bold text-xs text-white shrink-0 ${
                isSuperAdmin ? 'bg-emerald-600' : 'bg-blue-600'
              }`}
            >
              {currentMember.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1">
                <span className="text-xs font-black text-white max-w-[90px] sm:max-w-[130px] truncate block">
                  {currentMember.name}
                </span>
                {isSuperAdmin && <Shield className="w-3 h-3 text-yellow-300 shrink-0" />}
              </div>
              <span className="text-[9px] sm:text-[10px] text-emerald-300 font-semibold block leading-tight">
                {isSuperAdmin ? 'Super Admin' : 'Kasir'}
              </span>
            </div>
          </button>

          {/* Logo / Brand Tengah (Secret 5x Tap, Tersembunyi di Layar Sempit agar Tidak Desak-desakan) */}
          <button
            type="button"
            onClick={handleLogoTap}
            className="hidden sm:flex items-center space-x-1.5 px-2 py-1 rounded-xl hover:bg-emerald-700/50 active:scale-95 transition-all text-emerald-100 shrink-0"
            title="WarungScan"
          >
            <Store className="w-4 h-4 text-emerald-300" />
            <span className="text-xs font-black tracking-wide text-white">WarungScan</span>
          </button>

          {/* Action Buttons Kanan */}
          <div className="flex items-center space-x-1 shrink-0">
            {/* Tombol Buku Panduan & FAQ Lengkap (Selalu Ada di Bar Atas) */}
            <button
              onClick={() => {
                triggerHaptic(20);
                onOpenGuidebook();
              }}
              className="py-1 sm:py-1.5 px-2 sm:px-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center space-x-1 shadow-xs transition-colors shrink-0"
              title="Buku Panduan & FAQ Bantuan Semua Fitur"
              aria-label="Panduan & FAQ"
            >
              <BookOpen className="w-3.5 h-3.5 text-slate-950" />
              <span className="hidden xs:inline">Panduan</span>
            </button>

            {/* Tombol Kunci Toko (Quick Screen Lock) */}
            <button
              onClick={() => {
                triggerHaptic(20);
                onLockApp();
              }}
              className="p-1.5 sm:p-2 rounded-xl bg-emerald-900/70 border border-emerald-400/30 text-emerald-100 hover:bg-emerald-900 hover:text-white transition-colors shrink-0"
              title="Kunci Toko (Amankan Layar Saat Ditinggal)"
              aria-label="Kunci Toko"
            >
              <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Tombol Pengaturan Data */}
            <button
              onClick={() => {
                triggerHaptic(20);
                onOpenSettings();
              }}
              className="p-1.5 sm:p-2 rounded-xl bg-emerald-900/70 border border-emerald-400/30 text-emerald-100 hover:bg-emerald-900 transition-colors shrink-0"
              title="Pengaturan Data & Ekspor/Impor"
              aria-label="Pengaturan"
            >
              <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Tombol Pasang PWA */}
            <button
              onClick={handleInstallClick}
              className="p-1.5 sm:p-2 rounded-xl bg-emerald-900/70 border border-emerald-400/30 text-emerald-100 hover:bg-emerald-900 hover:text-white transition-colors shrink-0"
              title="Pasang aplikasi di layar utama HP"
              aria-label="Pasang Aplikasi"
            >
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Secret Passcode Prompt (Discrete) */}
      {isSecretDialogVisible && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 text-white rounded-3xl max-w-xs w-full p-5 space-y-3 shadow-2xl border border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Lock className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-black uppercase text-amber-400">
                  Akses Otoritas Sistem
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsSecretDialogVisible(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Masukkan kode rahasia pemilik untuk mengaktifkan otoritas Super Admin:
            </p>

            <form onSubmit={handleSecretSubmit} className="space-y-2">
              <input
                type="password"
                maxLength={6}
                autoFocus
                value={secretInput}
                onChange={(e) => setSecretInput(e.target.value)}
                placeholder="••••"
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-center text-xl font-black tracking-widest text-white focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs"
              >
                Buka Otoritas
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
