'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import Navbar, { TabType } from '@/components/Navbar';
import PosView from '@/components/PosView';
import RestockView from '@/components/RestockView';
import InventoryView from '@/components/InventoryView';
import FinanceView from '@/components/FinanceView';
import ReportsView from '@/components/ReportsView';
import DatabaseModal from '@/components/DatabaseModal';
import SettingsModal from '@/components/SettingsModal';
import SelfConsumptionModal from '@/components/SelfConsumptionModal';
import FamilyAuthModal from '@/components/FamilyAuthModal';
import AppGateLock from '@/components/AppGateLock';
import GuidebookModal from '@/components/GuidebookModal';
import {
  Product,
  CartItem,
  FamilyMember,
  Wallet,
  PersonalExpense,
  FinancialGoal,
} from '@/types';
import { supabase } from '@/lib/supabase';
import { AlertCircle, X } from 'lucide-react';

const DEFAULT_SAMPLE_PRODUCTS: Product[] = [
  // Sembako
  { id: 'sample-1', name: 'Beras Ramos 5kg', cost_price: 65000, selling_price: 72000, stock: 10, category: 'Sembako' },
  { id: 'sample-2', name: 'Minyak Goreng 1L', cost_price: 15500, selling_price: 18000, stock: 4, category: 'Sembako' },
  { id: 'sample-3', name: 'Telur Ayam 1kg', cost_price: 26000, selling_price: 29000, stock: 3, category: 'Sembako' },
  { id: 'sample-4', name: 'Gula Pasir 1kg', cost_price: 16000, selling_price: 18000, stock: 2, category: 'Sembako' },
  { id: 'sample-5', name: 'Indomie Goreng Original', cost_price: 2800, selling_price: 3500, stock: 40, category: 'Makanan' },
  { id: 'sample-6', name: 'Aqua Galon 19L', cost_price: 19000, selling_price: 22000, stock: 2, category: 'Minuman' },
  // Minuman & Makanan Olahan Warung
  { id: 'sample-7', name: 'Es Teh Manis Jumbo', cost_price: 1200, selling_price: 3000, stock: 99, category: 'Minuman Seduh' },
  { id: 'sample-8', name: 'Kopi Kapal Api Seduh Panas', cost_price: 1500, selling_price: 4000, stock: 99, category: 'Minuman Seduh' },
  { id: 'sample-9', name: 'Pop Mie Seduh Air Panas', cost_price: 5500, selling_price: 8000, stock: 20, category: 'Minuman Seduh' },
  { id: 'sample-10', name: 'Tahu Walik Crispy (1 Porsi/5 pcs)', cost_price: 3000, selling_price: 5000, stock: 30, category: 'Makanan Olahan' },
  { id: 'sample-11', name: 'Telur Rebus Matang', cost_price: 2000, selling_price: 3000, stock: 25, category: 'Makanan Olahan' },
  { id: 'sample-12', name: 'Donat Kampung Gula Halus', cost_price: 1500, selling_price: 2500, stock: 20, category: 'Makanan Olahan' },
  // Pulsa & PPOB
  { id: 'sample-13', name: 'Pulsa Reguler 10.000', cost_price: 10500, selling_price: 12000, stock: 999, category: 'Pulsa & PPOB' },
  { id: 'sample-14', name: 'Token Listrik PLN 20.000', cost_price: 20500, selling_price: 23000, stock: 999, category: 'Pulsa & PPOB' },
];

// Default akun: Hanya 1 user awal dengan format UUID valid
export const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';

const DEFAULT_FAMILY_MEMBERS: FamilyMember[] = [
  { id: DEFAULT_USER_ID, name: 'Kasir Utama', role: 'family_member', pin: '1234', avatar_color: 'blue' },
];

const DEFAULT_WALLETS: Wallet[] = [
  { id: '00000000-0000-0000-0000-000000000011', user_id: DEFAULT_USER_ID, name: 'Laci Kasir Warung', type: 'cash_warung', balance: 500000, is_private: false },
  { id: '00000000-0000-0000-0000-000000000012', user_id: DEFAULT_USER_ID, name: 'Dompet Pribadi', type: 'cash_pribadi', balance: 250000, is_private: true },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('pos');
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [hasCheckedDb, setHasCheckedDb] = useState(false);

  // State Multi-User & Keluarga (Default user biasa)
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>(DEFAULT_FAMILY_MEMBERS);
  const [currentMember, setCurrentMember] = useState<FamilyMember>(DEFAULT_FAMILY_MEMBERS[0]);
  const [isFamilyAuthOpen, setIsFamilyAuthOpen] = useState(false);

  // State Dompet & Keuangan
  const [wallets, setWallets] = useState<Wallet[]>(DEFAULT_WALLETS);
  const [personalExpenses, setPersonalExpenses] = useState<PersonalExpense[]>([]);

  // State Modals
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSelfConsumptionModalOpen, setIsSelfConsumptionModalOpen] = useState(false);
  const [isGuidebookOpen, setIsGuidebookOpen] = useState(false);

  // Security Gate Lock Toko & Multi-User Pin
  const [isGateUnlocked, setIsGateUnlocked] = useState(false);
  const [hasCheckedGate, setHasCheckedGate] = useState(false);

  useEffect(() => {
    try {
      const savedUserId = localStorage.getItem('warungscan_active_user_id');
      const isSessionUnlocked = sessionStorage.getItem('warungscan_gate_unlocked') === 'true';
      const rememberUntil = Number(localStorage.getItem('warungscan_gate_remember_until') || 0);

      // Hanya otomatis terbuka jika sudah ada akun tersimpan di perangkat ini DAN sesi masih aktif
      if (savedUserId && (isSessionUnlocked || rememberUntil > Date.now())) {
        setIsGateUnlocked(true);
      } else {
        setIsGateUnlocked(false);
      }
    } catch {
      // Fallback
    } finally {
      setHasCheckedGate(true);
    }
  }, []);

  const handleLockApp = () => {
    try {
      sessionStorage.removeItem('warungscan_gate_unlocked');
      localStorage.removeItem('warungscan_gate_remember_until');
    } catch {}
    setIsGateUnlocked(false);
  };

  // Ambil Data Produk
  const loadProducts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        // Hanya tandai belum terhubung jika Supabase mengembalikan error (misal tabel belum dibuat)
        setIsDbConnected(false);
        const stored = localStorage.getItem('warungscan_products');
        if (stored) {
          setProducts(JSON.parse(stored));
        } else {
          setProducts(DEFAULT_SAMPLE_PRODUCTS);
          localStorage.setItem('warungscan_products', JSON.stringify(DEFAULT_SAMPLE_PRODUCTS));
        }
      } else {
        // Tabel produk di Supabase ada dan terhubung dengan baik!
        setIsDbConnected(true);

        if (data && data.length > 0) {
          setProducts(data);
          localStorage.setItem('warungscan_products', JSON.stringify(data));
        } else {
          // Tabel di Supabase kosong (misal baru saja di-reset)
          // Cek apakah ada data lokal yang perlu disinkronkan ke cloud
          const stored = localStorage.getItem('warungscan_products');
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setProducts(parsed);
                // Upload/sinkronkan otomatis produk lokal ke database cloud
                for (const p of parsed) {
                  await supabase.from('products').upsert(
                    {
                      name: p.name,
                      cost_price: p.cost_price || 0,
                      selling_price: p.selling_price || 0,
                      stock: p.stock || 0,
                      category: p.category || 'Umum',
                    },
                    { onConflict: 'name' }
                  );
                }
              } else {
                setProducts([]);
              }
            } catch {
              setProducts([]);
            }
          } else {
            setProducts([]);
          }
        }
      }
    } catch {
      setIsDbConnected(false);
      const stored = localStorage.getItem('warungscan_products');
      setProducts(stored ? JSON.parse(stored) : DEFAULT_SAMPLE_PRODUCTS);
    } finally {
      setHasCheckedDb(true);
    }
  }, []);

  // Ambil Data Keluarga, Dompet, Pengeluaran & Goal
  const loadFinanceData = useCallback(async () => {
    try {
      const savedUserId = localStorage.getItem('warungscan_active_user_id');

      if (isDbConnected) {
        const { data: famData } = await supabase.from('family_members').select('*');
        if (famData && famData.length > 0) {
          setFamilyMembers(famData);
          if (savedUserId) {
            const matched = famData.find((m) => m.id === savedUserId);
            if (matched) setCurrentMember(matched);
            else setCurrentMember(famData[0]);
          } else {
            // Perangkat Baru! Kunci layar untuk memilih akun
            setIsGateUnlocked(false);
          }
        }

        const { data: walData } = await supabase.from('wallets').select('*');
        if (walData && walData.length > 0) setWallets(walData);

        const { data: expData } = await supabase
          .from('personal_expenses')
          .select('*')
          .order('created_at', { ascending: false });
        if (expData) setPersonalExpenses(expData);
      } else {
        const localFam = localStorage.getItem('warungscan_family');
        if (localFam) {
          const parsed = JSON.parse(localFam);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setFamilyMembers(parsed);
            if (savedUserId) {
              const matched = parsed.find((m: any) => m.id === savedUserId);
              if (matched) setCurrentMember(matched);
              else setCurrentMember(parsed[0]);
            } else {
              setIsGateUnlocked(false);
            }
          }
        }

        const localWallets = localStorage.getItem('warungscan_wallets');
        if (localWallets) setWallets(JSON.parse(localWallets));

        const localExp = localStorage.getItem('warungscan_personal_expenses');
        if (localExp) setPersonalExpenses(JSON.parse(localExp));
      }
    } catch (err) {
      console.warn('Finance data load notice:', err);
    }
  }, [isDbConnected]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    loadFinanceData();
  }, [loadFinanceData]);

  const handleElevateSuperAdmin = () => {
    const updated: FamilyMember = {
      ...currentMember,
      role: 'super_admin',
    };
    setCurrentMember(updated);
    setFamilyMembers((prev) =>
      prev.map((m) => (m.id === updated.id ? updated : m))
    );
  };

  return (
    <main className="flex flex-col min-h-screen bg-slate-100">
      {/* Keamanan Gerbang Kunci & Login Akun Profil */}
      {hasCheckedGate && !isGateUnlocked && (
        <AppGateLock
          currentMember={currentMember}
          familyMembers={familyMembers}
          onUnlock={(member) => {
            setCurrentMember(member);
            setIsGateUnlocked(true);
          }}
          isDbConnected={isDbConnected}
        />
      )}

      {/* Header Aplikasi */}
      <Header
        currentMember={currentMember}
        onOpenFamilyAuth={() => setIsFamilyAuthOpen(true)}
        onOpenReports={() => setActiveTab('reports')}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        isDbConnected={isDbConnected}
        onOpenDbModal={() => setIsDbModalOpen(true)}
        onElevateSuperAdmin={handleElevateSuperAdmin}
        onOpenGuidebook={() => setIsGuidebookOpen(true)}
        onLockApp={handleLockApp}
      />

      {/* Banner Peringatan jika Supabase belum dipasang tabel */}
      {hasCheckedDb && !isDbConnected && (
        <div
          onClick={() => setIsDbModalOpen(true)}
          className="bg-amber-500 text-slate-900 px-3 py-1.5 text-xs font-bold flex items-center justify-between cursor-pointer border-b border-amber-600 shadow-xs"
        >
          <div className="flex items-center space-x-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Database Cloud belum dipasang tabel. Klik untuk cara pasang (1 menit).</span>
          </div>
          <span className="underline ml-1 shrink-0 font-extrabold">Pasang</span>
        </div>
      )}

      {/* Konten Halaman sesuai Tab yang Aktif */}
      <div className="flex-1 flex flex-col pb-20">
        {activeTab === 'pos' && (
          <PosView
            products={products}
            onProductsUpdate={loadProducts}
            cart={cart}
            setCart={setCart}
            isDbConnected={isDbConnected}
          />
        )}

        {activeTab === 'restock' && (
          <RestockView
            products={products}
            onProductsUpdate={loadProducts}
            isDbConnected={isDbConnected}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryView
            products={products}
            onProductsUpdate={loadProducts}
            isDbConnected={isDbConnected}
            onOpenSelfConsumption={() => setIsSelfConsumptionModalOpen(true)}
            onGoToRestock={() => setActiveTab('restock')}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            isDbConnected={isDbConnected}
            onProductsUpdate={loadProducts}
          />
        )}

        {activeTab === 'finance' && (
          <FinanceView
            currentMember={currentMember}
            wallets={wallets}
            expenses={personalExpenses}
            onRefreshFinance={loadFinanceData}
            isDbConnected={isDbConnected}
          />
        )}
      </div>

      {/* Navigasi Bar Bawah (Kasir, Kulakan, Stok & Belanja, Laporan, Keuangan) */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        cartCount={cart.reduce((sum, item) => sum + item.qty, 0)}
      />

      {/* MODAL MULTI-USER KELUARGA & PIN LOCK */}
      <FamilyAuthModal
        isOpen={isFamilyAuthOpen}
        onClose={() => setIsFamilyAuthOpen(false)}
        currentMember={currentMember}
        onSelectMember={(m) => {
          setCurrentMember(m);
          localStorage.setItem('warungscan_active_user_id', m.id);
        }}
        familyMembers={familyMembers}
        onRefreshMembers={loadFinanceData}
        isDbConnected={isDbConnected}
        onUnlockSuperAdmin={handleElevateSuperAdmin}
      />



      {/* MODAL PANDUAN DATABASE SUPABASE */}
      <DatabaseModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
        isDbConnected={isDbConnected}
        onRefreshDb={loadProducts}
      />

      {/* MODAL PENGATURAN (EXPORT, IMPORT, RESET, UPGRADE SUPER ADMIN, UBAH NAMA) */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        products={products}
        currentMember={currentMember}
        onUpdateCurrentMember={(updated) => {
          setCurrentMember(updated);
          localStorage.setItem('warungscan_active_user_id', updated.id);
          setFamilyMembers((prev) =>
            prev.map((m) => (m.id === updated.id ? updated : m))
          );
        }}
        familyMembers={familyMembers}
        onRefreshAll={() => {
          loadProducts();
          loadFinanceData();
        }}
        isDbConnected={isDbConnected}
        onLockApp={handleLockApp}
      />

      {/* MODAL CATAT PAKAI SENDIRI */}
      <SelfConsumptionModal
        isOpen={isSelfConsumptionModalOpen}
        onClose={() => setIsSelfConsumptionModalOpen(false)}
        products={products}
        onSuccess={loadProducts}
        isDbConnected={isDbConnected}
      />

      {/* BUKU PANDUAN & FAQ LENGKAP (SELALU ADA DI HEADER ATAS) */}
      <GuidebookModal
        isOpen={isGuidebookOpen}
        onClose={() => setIsGuidebookOpen(false)}
      />
    </main>
  );
}
