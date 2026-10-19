'use client';

import React, { useState } from 'react';
import { Target, Plus, CheckCircle2, X, Sparkles, TrendingUp, DollarSign } from 'lucide-react';
import { FinancialGoal, Wallet } from '@/types';
import { formatRupiah, triggerHaptic } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface GoalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  goals: FinancialGoal[];
  wallets: Wallet[];
  onRefreshGoals: () => void;
  isDbConnected: boolean;
}

export default function GoalsModal({
  isOpen,
  onClose,
  goals,
  wallets,
  onRefreshGoals,
  isDbConnected,
}: GoalsModalProps) {
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [activeDepositGoal, setActiveDepositGoal] = useState<FinancialGoal | null>(null);

  // Form Tambah Goal
  const [goalName, setGoalName] = useState('');
  const [targetAmount, setTargetAmount] = useState<number>(0);
  const [deadline, setDeadline] = useState('');

  // Form Setor Tabungan
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [depositWalletId, setDepositWalletId] = useState<string>(wallets[0]?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalName.trim() || targetAmount <= 0) return;

    setIsSubmitting(true);
    triggerHaptic(30);

    const newGoal: FinancialGoal = {
      id: 'goal-' + Date.now(),
      name: goalName.trim(),
      target_amount: targetAmount,
      current_amount: 0,
      deadline: deadline || undefined,
      created_at: new Date().toISOString(),
    };

    try {
      if (isDbConnected) {
        await supabase.from('financial_goals').insert({
          name: newGoal.name,
          target_amount: newGoal.target_amount,
          current_amount: 0,
          deadline: newGoal.deadline || null,
        });
      } else {
        const local = JSON.parse(localStorage.getItem('warungscan_goals') || '[]');
        local.push(newGoal);
        localStorage.setItem('warungscan_goals', JSON.stringify(local));
      }

      onRefreshGoals();
      setIsAddingGoal(false);
      setGoalName('');
      setTargetAmount(0);
      setDeadline('');
    } catch (err: any) {
      alert('Gagal menambah target: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDepositGoal || depositAmount <= 0) return;

    const sourceWallet = wallets.find((w) => w.id === depositWalletId) || wallets[0];
    if (!sourceWallet) return;

    setIsSubmitting(true);
    triggerHaptic(35);

    try {
      const newGoalCurrent = Number(activeDepositGoal.current_amount) + depositAmount;
      const newWalletBal = Math.max(0, Number(sourceWallet.balance) - depositAmount);

      if (isDbConnected) {
        await supabase
          .from('financial_goals')
          .update({ current_amount: newGoalCurrent })
          .eq('id', activeDepositGoal.id);

        await supabase
          .from('wallets')
          .update({ balance: newWalletBal })
          .eq('id', sourceWallet.id);
      } else {
        const localGoals = JSON.parse(localStorage.getItem('warungscan_goals') || '[]');
        const updatedG = localGoals.map((g: FinancialGoal) =>
          g.id === activeDepositGoal.id ? { ...g, current_amount: newGoalCurrent } : g
        );
        localStorage.setItem('warungscan_goals', JSON.stringify(updatedG));

        const localWallets = JSON.parse(localStorage.getItem('warungscan_wallets') || '[]');
        const updatedW = localWallets.map((w: Wallet) =>
          w.id === sourceWallet.id ? { ...w, balance: newWalletBal } : w
        );
        localStorage.setItem('warungscan_wallets', JSON.stringify(updatedW));
      }

      alert(`Berhasil menabung ${formatRupiah(depositAmount)} untuk ${activeDepositGoal.name}!`);
      onRefreshGoals();
      setActiveDepositGoal(null);
      setDepositAmount(0);
    } catch (err: any) {
      alert('Gagal menyetor tabungan: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-sm w-full p-5 max-h-[92vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <Target className="w-5 h-5 text-purple-700" />
            <h3 className="text-lg font-black text-slate-900">Target & Tabungan Impian</h3>
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
          {/* MODAL SETOR TABUNGAN */}
          {activeDepositGoal ? (
            <form onSubmit={handleDeposit} className="p-3.5 bg-purple-50 rounded-2xl border border-purple-200 space-y-3">
              <div className="text-center">
                <Sparkles className="w-8 h-8 text-purple-600 mx-auto mb-1" />
                <h4 className="font-extrabold text-slate-900 text-sm">Setor Tabungan</h4>
                <p className="text-xs text-purple-900 font-bold">{activeDepositGoal.name}</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nominal Setoran (Rp)
                </label>
                <input
                  type="number"
                  required
                  autoFocus
                  min="5000"
                  value={depositAmount || ''}
                  onChange={(e) => setDepositAmount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  placeholder="0"
                  className="w-full p-3 rounded-xl border border-purple-300 font-black text-xl text-center text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Ambil Uang dari Dompet
                </label>
                <select
                  value={depositWalletId}
                  onChange={(e) => setDepositWalletId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-purple-300 font-bold text-xs bg-white text-slate-900"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} (Saldo: {formatRupiah(w.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-2 pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting || depositAmount <= 0}
                  className="flex-1 py-3 rounded-xl bg-purple-700 text-white font-extrabold text-xs shadow-md"
                >
                  Setor Sekarang
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDepositGoal(null)}
                  className="px-4 py-3 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Batal
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* DAFTAR TARGET TABUNGAN */}
              <div className="space-y-3">
                {goals.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-4">
                    <Target className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700 text-sm">Belum ada target tabungan.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Misal: Beli Kulkas Baru, Renovasi Warung, Tabungan Qurban, dll.
                    </p>
                  </div>
                ) : (
                  goals.map((g) => {
                    const percent = Math.min(
                      100,
                      Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100)
                    );
                    const remaining = Math.max(0, Number(g.target_amount) - Number(g.current_amount));

                    return (
                      <div
                        key={g.id}
                        className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2.5"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-black text-slate-900 text-sm">{g.name}</h4>
                            <p className="text-[11px] text-slate-500 font-medium">
                              Terkumpul {formatRupiah(g.current_amount)} dari target{' '}
                              {formatRupiah(g.target_amount)}
                            </p>
                          </div>
                          <span className="text-xs font-black text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                            {percent}%
                          </span>
                        </div>

                        {/* Progress Bar Animasi */}
                        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                          <div
                            className="bg-purple-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>

                        <div className="flex justify-between items-center pt-1">
                          <span className="text-[11px] text-slate-500">
                            Kurang: <strong>{formatRupiah(remaining)}</strong>
                          </span>

                          <button
                            onClick={() => {
                              triggerHaptic(20);
                              setActiveDepositGoal(g);
                            }}
                            className="py-1.5 px-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs shadow-xs"
                          >
                            + Nabung
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* FORM TAMBAH TARGET BARU */}
              {!isAddingGoal ? (
                <button
                  onClick={() => {
                    triggerHaptic(20);
                    setIsAddingGoal(true);
                  }}
                  className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 flex items-center justify-center space-x-1.5"
                  style={{ minHeight: '44px' }}
                >
                  <Plus className="w-4 h-4" />
                  <span>Buat Target / Goal Tabungan Baru</span>
                </button>
              ) : (
                <form
                  onSubmit={handleCreateGoal}
                  className="p-3.5 bg-slate-50 rounded-2xl border border-slate-300 space-y-3 text-xs"
                >
                  <h4 className="font-bold text-slate-900">Target Tabungan Baru</h4>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nama Target</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Kulkas Baru, Renovasi Etalase..."
                      value={goalName}
                      onChange={(e) => setGoalName(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Target Nominal (Rp)</label>
                    <input
                      type="number"
                      required
                      min="10000"
                      value={targetAmount || ''}
                      onChange={(e) =>
                        setTargetAmount(Math.max(0, parseInt(e.target.value, 10) || 0))
                      }
                      placeholder="0"
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-black text-center text-sm bg-white"
                    />
                  </div>

                  <div className="flex space-x-2 pt-1">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 py-2.5 rounded-xl bg-purple-700 text-white font-extrabold"
                    >
                      Simpan Target
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingGoal(false)}
                      className="px-3 py-2.5 rounded-xl bg-slate-200 text-slate-700 font-bold"
                    >
                      Batal
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
