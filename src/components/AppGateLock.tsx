'use client';

import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, KeyRound, Eye, EyeOff, Store, AlertCircle } from 'lucide-react';
import { triggerHaptic } from '@/lib/utils';

interface AppGateLockProps {
  onUnlock: () => void;
}

export default function AppGateLock({ onUnlock }: AppGateLockProps) {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);

  // Ambil PIN Kunci Toko yang tersimpan (default: 1234)
  const getStoredPin = () => {
    if (typeof window === 'undefined') return '1234';
    return localStorage.getItem('warungscan_store_gate_pin') || '1234';
  };

  const handleKeypadPress = (val: string) => {
    triggerHaptic(15);
    if (pin.length < 6) {
      setPin((prev) => prev + val);
      setErrorMsg('');
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

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pin) return;

    triggerHaptic(30);
    const validPin = getStoredPin();

    // Bisa dibuka dengan PIN Toko atau Kode Master Pemilik (4477)
    if (pin === validPin || pin === '4477') {
      triggerHaptic(40);
      sessionStorage.setItem('warungscan_gate_unlocked', 'true');
      if (rememberDevice) {
        localStorage.setItem(
          'warungscan_gate_remember_until',
          String(Date.now() + 7 * 24 * 60 * 60 * 1000)
        );
      }
      onUnlock();
    } else {
      triggerHaptic(60);
      setErrorMsg('PIN Toko salah. Coba lagi atau gunakan PIN Pemilik.');
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 text-white space-y-5 shadow-2xl animate-in zoom-in-95">
        {/* Brand & Header */}
        <div className="text-center space-y-1.5">
          <div className="w-14 h-14 bg-emerald-600/20 border border-emerald-500/40 rounded-2xl flex items-center justify-center mx-auto text-emerald-400 mb-2 shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-black tracking-tight text-white flex items-center justify-center space-x-1.5">
            <Store className="w-5 h-5 text-emerald-400" />
            <span>WarungScan</span>
          </h2>
          <p className="text-xs text-slate-400">
            Aplikasi terproteksi. Masukkan PIN Akses Toko untuk membuka sistem kasir dan keuangan.
          </p>
        </div>

        {/* Display PIN Dots */}
        <div className="space-y-2">
          <div className="flex justify-center items-center space-x-3 py-2 bg-slate-950/60 rounded-2xl border border-slate-800">
            {[0, 1, 2, 3].map((idx) => {
              const filled = pin.length > idx;
              return (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full transition-all ${
                    filled
                      ? 'bg-emerald-400 scale-110 shadow-sm shadow-emerald-400/50'
                      : 'bg-slate-700/60 border border-slate-600'
                  }`}
                />
              );
            })}
          </div>

          {errorMsg && (
            <div className="flex items-center space-x-1.5 text-rose-400 text-xs font-semibold justify-center">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Onscreen Keypad */}
        <div className="grid grid-cols-3 gap-2 text-base font-bold select-none">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeypadPress(digit)}
              className="py-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 active:bg-emerald-600 active:text-white border border-slate-700/60 text-slate-200 transition-all active:scale-95 text-lg font-black shadow-xs"
              style={{ minHeight: '52px' }}
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="py-3.5 rounded-2xl bg-slate-800/40 hover:bg-slate-700/60 border border-slate-800 text-slate-400 text-xs font-bold transition-all active:scale-95"
            style={{ minHeight: '52px' }}
          >
            Hapus
          </button>
          <button
            type="button"
            onClick={() => handleKeypadPress('0')}
            className="py-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 active:bg-emerald-600 active:text-white border border-slate-700/60 text-slate-200 text-lg font-black transition-all active:scale-95 shadow-xs"
            style={{ minHeight: '52px' }}
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="py-3.5 rounded-2xl bg-slate-800/40 hover:bg-slate-700/60 border border-slate-800 text-slate-300 text-sm font-bold transition-all active:scale-95"
            style={{ minHeight: '52px' }}
            title="Hapus Satu Digit"
          >
            ⌫
          </button>
        </div>

        {/* Checkbox Ingat Perangkat & Tombol Masuk */}
        <div className="space-y-3 pt-1">
          <label className="flex items-center space-x-2 text-xs text-slate-400 cursor-pointer justify-center select-none">
            <input
              type="checkbox"
              checked={rememberDevice}
              onChange={(e) => setRememberDevice(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 bg-slate-800 border-slate-700"
            />
            <span>Ingat di perangkat ini (7 Hari)</span>
          </label>

          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={pin.length === 0}
            className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 active:scale-98 transition-all disabled:opacity-40"
            style={{ minHeight: '48px' }}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Buka Akses Toko</span>
          </button>

          <p className="text-[10px] text-slate-500 text-center">
            Default PIN: <strong className="text-slate-400">1234</strong> (Dapat diubah di menu Pengaturan)
          </p>
        </div>
      </div>
    </div>
  );
}
