'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Wallet as WalletIcon,
  Plus,
  ArrowRightLeft,
  Lock,
  TrendingDown,
  TrendingUp,
  Building,
  CreditCard,
  Banknote,
  CheckCircle2,
  Trash2,
  X,
  Target,
  PiggyBank,
  LineChart as LineChartIcon,
  Calendar,
  AlertTriangle,
  Info,
  RefreshCw,
  Coins,
  ShieldCheck,
  ChevronRight,
  ShoppingBag,
  Store,
  PieChart as PieChartIcon,
  Package,
  Layers,
  ArrowUpRight,
  Check,
  Sparkles,
  Send,
  Bot,
  HelpCircle,
  Award,
  BarChart3,
  Edit2,
} from 'lucide-react';
import {
  Wallet,
  PersonalExpense,
  FamilyMember,
  FinancialGoal,
  Budget,
  InvestmentAsset,
  InvestmentCategory,
  MarketplaceProduct,
  MarketplaceSale,
} from '@/types';
import { formatRupiah, formatTanggal, triggerHaptic, generateUUID, isValidUUID } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface FinanceViewProps {
  currentMember: FamilyMember;
  wallets: Wallet[];
  expenses: PersonalExpense[];
  onRefreshFinance: () => void;
  isDbConnected: boolean;
}

const DEFAULT_FALLBACK_UUID = '00000000-0000-0000-0000-000000000001';

const EXPENSE_CATEGORIES = [
  'Bensin & Transport',
  'Listrik & Air',
  'Belanja Dapur/Pasar',
  'Uang Jajan Anak',
  'Belanja Online',
  'Operasional Warung',
  'Jualan FB Marketplace',
  'Bisnis Lain',
  'Gaji & Hasil Usaha',
  'Lain-lain',
] as const;

const CHART_PALETTE = [
  '#f59e0b', // amber-500
  '#10b981', // emerald-500
  '#3b82f6', // blue-500
  '#8b5cf6', // purple-500
  '#ec4899', // pink-500
  '#ef4444', // red-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
];

const QUICK_AI_QUESTIONS = [
  'Kapan waktu yang pas beli Bitcoin?',
  'Berapa modal awal aman buat emas?',
  'Bagaimana cara nabung rutin (DCA) dari untung warung?',
  'Apa bedanya Emas vs Deposito vs Kripto?',
];

export default function FinanceView({
  currentMember,
  wallets,
  expenses,
  onRefreshFinance,
  isDbConnected,
}: FinanceViewProps) {
  // Pastikan ID user selalu valid UUID agar Postgres tidak error 22P02
  const activeUserId = useMemo(() => {
    return isValidUUID(currentMember.id) ? currentMember.id : DEFAULT_FALLBACK_UUID;
  }, [currentMember.id]);

  // Sub-tabs Navigasi Keuangan
  const [subTab, setSubTab] = useState<
    'overview' | 'wallets' | 'fb_market' | 'budget' | 'goals' | 'invest'
  >('overview');

  // Filter Periode Ringkasan: 'day' | 'week' | 'month'
  const [periodFilter, setPeriodFilter] = useState<'day' | 'week' | 'month'>('month');

  // Filter Rentang Grafik Garis: '6m' (6 Bulan) | '1y' (1 Tahun)
  const [chartRange, setChartRange] = useState<'6m' | '1y'>('6m');

  // Filter Pie Chart: 'expense' (Pengeluaran) | 'income' (Pemasukan)
  const [pieMode, setPieMode] = useState<'expense' | 'income'>('expense');

  // Super Admin view mode toggle (Data Saya vs Semua Akun)
  const [showAllUsersData, setShowAllUsersData] = useState(false);

  // State Modals & Forms Transaksi Keuangan
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  const [isAddingWallet, setIsAddingWallet] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // Form Transaksi
  const [txType, setTxType] = useState<'expense' | 'income'>('expense');
  const [txAmount, setTxAmount] = useState<number>(0);
  const [txCategory, setTxCategory] = useState<string>('Belanja Dapur/Pasar');
  const [txSource, setTxSource] = useState<'pribadi' | 'warung' | 'fb_marketplace' | 'bisnis_lain'>(
    'pribadi'
  );
  const [txWalletId, setTxWalletId] = useState<string>('');
  const [txDesc, setTxDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Tambah Dompet
  const [newWalletName, setNewWalletName] = useState('');
  const [newWalletType, setNewWalletType] = useState<Wallet['type']>('cash_pribadi');
  const [newWalletBalance, setNewWalletBalance] = useState<number>(0);

  // Form Edit Dompet
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
  const [editWalletName, setEditWalletName] = useState('');
  const [editWalletType, setEditWalletType] = useState<Wallet['type']>('cash_pribadi');
  const [editWalletBalance, setEditWalletBalance] = useState<number>(0);
  const [editWalletRecordHistory, setEditWalletRecordHistory] = useState(true);

  // Form Transfer Dompet
  const [transferFromId, setTransferFromId] = useState('');
  const [transferToId, setTransferToId] = useState('');
  const [transferAmount, setTransferAmount] = useState<number>(0);

  // State Budgeting
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isAddingBudget, setIsAddingBudget] = useState(false);
  const [newBudgetCategory, setNewBudgetCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [newBudgetLimit, setNewBudgetLimit] = useState<number>(0);

  // State Smart Goals
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState<number>(0);
  const [newGoalDeadline, setNewGoalDeadline] = useState('');
  const [selectedGoalForDeposit, setSelectedGoalForDeposit] = useState<FinancialGoal | null>(null);
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [depositWalletId, setDepositWalletId] = useState<string>('');

  // State Portofolio Investasi
  const [investments, setInvestments] = useState<InvestmentAsset[]>([]);
  const [isAddingInvestment, setIsAddingInvestment] = useState(false);
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetCategory, setNewAssetCategory] = useState<InvestmentCategory>('emas');
  const [newAssetUnits, setNewAssetUnits] = useState<number>(0);
  const [newAssetBuyPrice, setNewAssetBuyPrice] = useState<number>(0);
  const [newAssetCurrentPrice, setNewAssetCurrentPrice] = useState<number>(0);

  // State Tanya AI Investasi (Asisten Finansial Pintar)
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // State FB Marketplace (Terpisah & Terisolasi per User)
  const [fbProducts, setFbProducts] = useState<MarketplaceProduct[]>([]);
  const [fbSales, setFbSales] = useState<MarketplaceSale[]>([]);
  const [isAddingFbProduct, setIsAddingFbProduct] = useState(false);
  const [isRecordingFbSale, setIsRecordingFbSale] = useState(false);
  const [selectedFbProductForSale, setSelectedFbProductForSale] = useState<MarketplaceProduct | null>(
    null
  );

  // Form Tambah Produk FB
  const [newFbName, setNewFbName] = useState('');
  const [newFbCostPrice, setNewFbCostPrice] = useState<number>(0);
  const [newFbSellingPrice, setNewFbSellingPrice] = useState<number>(0);
  const [newFbStock, setNewFbStock] = useState<number>(1);
  const [newFbMinAlert, setNewFbMinAlert] = useState<number>(2);

  // Form Catat Penjualan FB
  const [saleQty, setSaleQty] = useState<number>(1);
  const [dealSoldPrice, setDealSoldPrice] = useState<number>(0);
  const [buyerName, setBuyerName] = useState('');
  const [saleDestWalletId, setSaleDestWalletId] = useState<string>('');

  // State Edit Catatan Keuangan
  const [editingExpense, setEditingExpense] = useState<PersonalExpense | null>(null);
  const [editExpAmount, setEditExpAmount] = useState<number>(0);
  const [editExpDesc, setEditExpDesc] = useState('');
  const [editExpCategory, setEditExpCategory] = useState('Belanja');
  const [editExpWalletId, setEditExpWalletId] = useState('');

  // State Edit Produk FB Marketplace
  const [editingFbProduct, setEditingFbProduct] = useState<MarketplaceProduct | null>(null);
  const [editFbName, setEditFbName] = useState('');
  const [editFbCost, setEditFbCost] = useState<number>(0);
  const [editFbSelling, setEditFbSelling] = useState<number>(0);
  const [editFbStock, setEditFbStock] = useState<number>(1);
  const [editFbMinAlert, setEditFbMinAlert] = useState<number>(2);

  // Live Market Prices
  const [btcLivePrice, setBtcLivePrice] = useState<number>(1450000000);
  const [goldEstPrice] = useState<number>(1350000);
  const [isLoadingLivePrice, setIsLoadingLivePrice] = useState(false);

  // Fetch Live BTC Price dari CoinGecko
  const fetchBtcPrice = useCallback(async () => {
    try {
      setIsLoadingLivePrice(true);
      const res = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=idr'
      );
      if (res.ok) {
        const data = await res.json();
        if (data.bitcoin && data.bitcoin.idr) {
          setBtcLivePrice(data.bitcoin.idr);
        }
      }
    } catch {
      // Fallback
    } finally {
      setIsLoadingLivePrice(false);
    }
  }, []);

  useEffect(() => {
    fetchBtcPrice();
  }, [fetchBtcPrice]);

  // Load Budgets, Goals, Investments, & FB Marketplace (Terisolasi per user)
  const loadLocalUserData = useCallback(async () => {
    try {
      if (isDbConnected) {
        const { data: bData } = await supabase
          .from('budgets')
          .select('*')
          .eq('user_id', activeUserId);
        if (bData) setBudgets(bData);

        const { data: gData } = await supabase
          .from('financial_goals')
          .select('*')
          .eq('user_id', activeUserId);
        if (gData) setGoals(gData);

        const { data: iData } = await supabase
          .from('investments')
          .select('*')
          .eq('user_id', activeUserId);
        if (iData) setInvestments(iData);

        const { data: fbPData } = await supabase
          .from('marketplace_products')
          .select('*')
          .eq('user_id', activeUserId)
          .order('name', { ascending: true });
        if (fbPData) {
          setFbProducts(fbPData);
          localStorage.setItem(`warungscan_fb_products_${activeUserId}`, JSON.stringify(fbPData));
        }

        const { data: fbSData } = await supabase
          .from('marketplace_sales')
          .select('*')
          .eq('user_id', activeUserId)
          .order('created_at', { ascending: false });
        if (fbSData) {
          setFbSales(fbSData);
          localStorage.setItem(`warungscan_fb_sales_${activeUserId}`, JSON.stringify(fbSData));
        }
      } else {
        const localB = localStorage.getItem(`warungscan_budgets_${activeUserId}`);
        if (localB) setBudgets(JSON.parse(localB));
        else setBudgets([]);

        const localG = localStorage.getItem(`warungscan_goals_${activeUserId}`);
        if (localG) setGoals(JSON.parse(localG));
        else setGoals([]);

        const localI = localStorage.getItem(`warungscan_investments_${activeUserId}`);
        if (localI) setInvestments(JSON.parse(localI));
        else setInvestments([]);

        const localFbP = localStorage.getItem(`warungscan_fb_products_${activeUserId}`);
        if (localFbP) setFbProducts(JSON.parse(localFbP));
        else setFbProducts([]);

        const localFbS = localStorage.getItem(`warungscan_fb_sales_${activeUserId}`);
        if (localFbS) setFbSales(JSON.parse(localFbS));
        else setFbSales([]);
      }
    } catch (err) {
      console.warn('Load user finance data notice:', err);
    }
  }, [activeUserId, isDbConnected]);

  useEffect(() => {
    loadLocalUserData();
  }, [loadLocalUserData]);

  // 1. ISOLASI DOMPET
  const visibleWallets = useMemo(() => {
    return wallets.filter((w) => {
      if (w.type === 'cash_warung') return true;
      if (currentMember.role === 'super_admin' && showAllUsersData) return true;
      return w.user_id === activeUserId || w.user_id === currentMember.id;
    });
  }, [wallets, currentMember, showAllUsersData, activeUserId]);

  useEffect(() => {
    if (!txWalletId && visibleWallets.length > 0) {
      setTxWalletId(visibleWallets[0].id);
    }
    if (!transferFromId && visibleWallets.length > 0) {
      setTransferFromId(visibleWallets[0].id);
    }
    if (!transferToId && visibleWallets.length > 1) {
      setTransferToId(visibleWallets[1].id);
    }
    if (!depositWalletId && visibleWallets.length > 0) {
      setDepositWalletId(visibleWallets[0].id);
    }
    if (!saleDestWalletId && visibleWallets.length > 0) {
      setSaleDestWalletId(visibleWallets[0].id);
    }
  }, [visibleWallets, txWalletId, transferFromId, transferToId, depositWalletId, saleDestWalletId]);

  const totalBalance = useMemo(() => {
    return visibleWallets.reduce((sum, w) => sum + Number(w.balance || 0), 0);
  }, [visibleWallets]);

  // 2. ISOLASI TRANSAKSI KEUANGAN
  const visibleExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (currentMember.role === 'super_admin' && showAllUsersData) return true;
      return e.user_id === activeUserId || e.user_id === currentMember.id;
    });
  }, [expenses, currentMember, showAllUsersData, activeUserId]);

  // 3. FILTER PERIODE & PERBANDINGAN TREN
  const { currentExpenses, currentIncomes, prevExpenses, prevIncomes } = useMemo(() => {
    const now = new Date();
    let currentStart = new Date();
    let prevStart = new Date();
    let prevEnd = new Date();

    if (periodFilter === 'day') {
      currentStart.setHours(0, 0, 0, 0);
      prevStart.setDate(now.getDate() - 1);
      prevStart.setHours(0, 0, 0, 0);
      prevEnd.setDate(now.getDate() - 1);
      prevEnd.setHours(23, 59, 59, 999);
    } else if (periodFilter === 'week') {
      currentStart.setDate(now.getDate() - 7);
      currentStart.setHours(0, 0, 0, 0);
      prevStart.setDate(now.getDate() - 14);
      prevStart.setHours(0, 0, 0, 0);
      prevEnd.setDate(now.getDate() - 7);
      prevEnd.setHours(23, 59, 59, 999);
    } else {
      currentStart.setDate(1);
      currentStart.setHours(0, 0, 0, 0);
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    }

    const curExp: PersonalExpense[] = [];
    const curInc: PersonalExpense[] = [];
    let prvExpTotal = 0;
    let prvIncTotal = 0;

    visibleExpenses.forEach((item) => {
      const itemDate = new Date(item.created_at);
      const isExpense = (item.type || 'expense') === 'expense';

      if (itemDate >= currentStart && itemDate <= now) {
        if (isExpense) curExp.push(item);
        else curInc.push(item);
      } else if (itemDate >= prevStart && itemDate <= prevEnd) {
        if (isExpense) prvExpTotal += Number(item.amount || 0);
        else prvIncTotal += Number(item.amount || 0);
      }
    });

    return {
      currentExpenses: curExp,
      currentIncomes: curInc,
      prevExpenses: prvExpTotal,
      prevIncomes: prvIncTotal,
    };
  }, [visibleExpenses, periodFilter]);

  const totalCurrentExpense = useMemo(() => {
    return currentExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [currentExpenses]);

  const totalCurrentIncome = useMemo(() => {
    return currentIncomes.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [currentIncomes]);

  const expenseDiffPercent = useMemo(() => {
    if (prevExpenses === 0) return 0;
    return Math.round(((totalCurrentExpense - prevExpenses) / prevExpenses) * 100);
  }, [totalCurrentExpense, prevExpenses]);

  const incomeDiffPercent = useMemo(() => {
    if (prevIncomes === 0) return 0;
    return Math.round(((totalCurrentIncome - prevIncomes) / prevIncomes) * 100);
  }, [totalCurrentIncome, prevIncomes]);

  // 4. DATA GRAFIK GARIS (6 BULAN ATAU 1 TAHUN TERAKHIR)
  const lineChartData = useMemo(() => {
    const monthCount = chartRange === '6m' ? 6 : 12;
    const result: { label: string; income: number; expense: number; monthKey: string }[] = [];
    const now = new Date();

    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('id-ID', { month: 'short' });

      let inc = 0;
      let exp = 0;

      visibleExpenses.forEach((item) => {
        const itemDate = new Date(item.created_at);
        if (itemDate.getFullYear() === year && itemDate.getMonth() === month) {
          if ((item.type || 'expense') === 'expense') {
            exp += Number(item.amount || 0);
          } else {
            inc += Number(item.amount || 0);
          }
        }
      });

      result.push({ label, income: inc, expense: exp, monthKey });
    }
    return result;
  }, [visibleExpenses, chartRange]);

  const maxChartValue = useMemo(() => {
    const max = Math.max(
      ...lineChartData.map((d) => Math.max(d.income, d.expense)),
      100000
    );
    return max * 1.15;
  }, [lineChartData]);

  // 5. DATA PIE / DONUT CHART
  const pieChartData = useMemo(() => {
    const targetList = pieMode === 'expense' ? currentExpenses : currentIncomes;
    const categoryMap: { [cat: string]: number } = {};

    targetList.forEach((item) => {
      const cat = item.category || 'Lain-lain';
      categoryMap[cat] = (categoryMap[cat] || 0) + Number(item.amount || 0);
    });

    const total = Object.values(categoryMap).reduce((sum, v) => sum + v, 0);
    const sorted = Object.entries(categoryMap)
      .map(([name, amount], index) => ({
        name,
        amount,
        percent: total > 0 ? Math.round((amount / total) * 100) : 0,
        color: CHART_PALETTE[index % CHART_PALETTE.length],
      }))
      .sort((a, b) => b.amount - a.amount);

    return { total, slices: sorted };
  }, [currentExpenses, currentIncomes, pieMode]);

  // 6. METRIK FINANSIAL FB MARKETPLACE LENGKAP
  const {
    fbTotalModalMengendap,
    fbTotalOmset,
    fbTotalProfit,
    fbTopProducts,
    fbLowStockProducts,
    fbTotalUnitsSold,
  } = useMemo(() => {
    let modalMengendap = 0;
    const lowStock: MarketplaceProduct[] = [];

    fbProducts.forEach((p) => {
      modalMengendap += Number(p.stock || 0) * Number(p.cost_price || 0);
      if (Number(p.stock || 0) <= Number(p.min_stock_alert || 2)) {
        lowStock.push(p);
      }
    });

    let omset = 0;
    let profit = 0;
    let unitsSold = 0;
    const salesStats: { [name: string]: { qty: number; profit: number; omset: number } } = {};

    fbSales.forEach((s) => {
      const sQty = Number(s.qty || 1);
      const sOmset = Number(s.total_omset || 0);
      const sProfit = Number(s.total_profit || 0);

      omset += sOmset;
      profit += sProfit;
      unitsSold += sQty;

      if (!salesStats[s.product_name]) {
        salesStats[s.product_name] = { qty: 0, profit: 0, omset: 0 };
      }
      salesStats[s.product_name].qty += sQty;
      salesStats[s.product_name].profit += sProfit;
      salesStats[s.product_name].omset += sOmset;
    });

    const topList = Object.entries(salesStats)
      .map(([name, stat]) => ({
        name,
        qty: stat.qty,
        profit: stat.profit,
        omset: stat.omset,
      }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    return {
      fbTotalModalMengendap: modalMengendap,
      fbTotalOmset: omset,
      fbTotalProfit: profit,
      fbTopProducts: topList,
      fbLowStockProducts: lowStock,
      fbTotalUnitsSold: unitsSold,
    };
  }, [fbProducts, fbSales]);

  // HANDLE TANYA AI INVESTASI
  const handleAskInvestAi = async (customQuestion?: string) => {
    const q = (customQuestion || aiQuestion).trim();
    if (!q) return;

    triggerHaptic(25);
    setIsAiLoading(true);
    setAiQuestion(q);
    setAiAnswer(null);

    try {
      const res = await fetch('/api/ask-invest-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          userHoldings: investments,
          liveBtcPrice: btcLivePrice,
        }),
      });

      const data = await res.json();
      if (data.success && data.answer) {
        setAiAnswer(data.answer);
      } else {
        setAiAnswer(data.error || 'Maaf, terjadi gangguan saat meminta rekomendasi AI.');
      }
    } catch (err: any) {
      setAiAnswer('Koneksi terputus: ' + (err.message || 'Coba sesaat lagi.'));
    } finally {
      setIsAiLoading(false);
    }
  };

  // SIMPAN TRANSAKSI BARU (PENGELUARAN / PEMASUKAN)
  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (txAmount <= 0) {
      alert('Masukkan nominal transaksi.');
      return;
    }

    const selectedWallet = wallets.find((w) => w.id === txWalletId) || visibleWallets[0];
    if (!selectedWallet) return;

    setIsSubmitting(true);
    triggerHaptic(30);

    const isExpense = txType === 'expense';
    const txId = generateUUID();
    const newTx: PersonalExpense = {
      id: txId,
      created_at: new Date().toISOString(),
      user_id: activeUserId,
      wallet_id: selectedWallet.id,
      wallet_name: selectedWallet.name,
      type: txType,
      amount: txAmount,
      category: txCategory,
      source_type: txSource,
      description: txDesc.trim() || txCategory,
      is_private: true,
    };

    const balanceChange = isExpense ? -txAmount : txAmount;
    const updatedBalance = Number(selectedWallet.balance || 0) + balanceChange;

    // Optimistic Update LocalStorage
    const localTx: PersonalExpense[] = JSON.parse(
      localStorage.getItem('warungscan_personal_expenses') || '[]'
    );
    localTx.unshift(newTx);
    localStorage.setItem('warungscan_personal_expenses', JSON.stringify(localTx));

    const localW: Wallet[] = JSON.parse(localStorage.getItem('warungscan_wallets') || '[]');
    const updatedWallets = localW.map((w) =>
      w.id === selectedWallet.id ? { ...w, balance: updatedBalance } : w
    );
    localStorage.setItem('warungscan_wallets', JSON.stringify(updatedWallets));

    try {
      if (isDbConnected) {
        await supabase.from('personal_expenses').insert(newTx);
        await supabase.from('wallets').update({ balance: updatedBalance }).eq('id', selectedWallet.id);
      }
      onRefreshFinance();
      setIsAddingTransaction(false);
      setTxAmount(0);
      setTxDesc('');
      alert(`Transaksi ${isExpense ? 'pengeluaran' : 'pemasukan'} berhasil dicatat.`);
    } catch (err: any) {
      console.warn('Sync notice:', err.message);
      onRefreshFinance();
      setIsAddingTransaction(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // TAMBAH DOMPET BARU
  const handleCreateWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWalletName.trim()) return;

    triggerHaptic(30);
    const newW: Wallet = {
      id: generateUUID(),
      user_id: activeUserId,
      name: newWalletName.trim(),
      type: newWalletType,
      balance: newWalletBalance,
      is_private: true,
    };

    // Optimistic Update LocalStorage
    const localW: Wallet[] = JSON.parse(localStorage.getItem('warungscan_wallets') || '[]');
    localW.push(newW);
    localStorage.setItem('warungscan_wallets', JSON.stringify(localW));

    try {
      if (isDbConnected) {
        await supabase.from('wallets').insert(newW);
      }
      onRefreshFinance();
      setIsAddingWallet(false);
      setNewWalletName('');
      setNewWalletBalance(0);
      alert(`Dompet "${newW.name}" berhasil dibuat.`);
    } catch (err: any) {
      onRefreshFinance();
      setIsAddingWallet(false);
    }
  };

  // BUKA MODAL EDIT DOMPET
  const handleOpenEditWallet = (wallet: Wallet) => {
    triggerHaptic(20);
    setEditingWallet(wallet);
    setEditWalletName(wallet.name);
    setEditWalletType(wallet.type);
    setEditWalletBalance(Number(wallet.balance) || 0);
    setEditWalletRecordHistory(true);
  };

  // SIMPAN PERUBAHAN DOMPET (DENGAN OPSI PILIH CATAT KE HISTORY ATAU TIDAK)
  const handleSaveEditWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWallet || !editWalletName.trim()) return;

    triggerHaptic(30);
    const oldBalance = Number(editingWallet.balance) || 0;
    const newBalance = Number(editWalletBalance) || 0;
    const balanceDiff = newBalance - oldBalance;

    const updatedWallet: Wallet = {
      ...editingWallet,
      name: editWalletName.trim(),
      type: editWalletType,
      balance: newBalance,
    };

    // Optimistic Update LocalStorage
    const localW: Wallet[] = JSON.parse(localStorage.getItem('warungscan_wallets') || '[]');
    const updatedWallets = localW.map((w) => (w.id === updatedWallet.id ? updatedWallet : w));
    localStorage.setItem('warungscan_wallets', JSON.stringify(updatedWallets));

    // Jika user memilih untuk mencatat selisih saldo ke riwayat keuangan (History)
    if (editWalletRecordHistory && balanceDiff !== 0) {
      const isGain = balanceDiff > 0;
      const historyItem: PersonalExpense = {
        id: generateUUID(),
        user_id: activeUserId,
        wallet_id: updatedWallet.id,
        wallet_name: updatedWallet.name,
        type: isGain ? 'income' : 'expense',
        amount: Math.abs(balanceDiff),
        category: isGain ? 'Gaji & Hasil Usaha' : 'Lain-lain',
        description: `Penyesuaian saldo dompet "${updatedWallet.name}" (${isGain ? '+' : '-'}${formatRupiah(Math.abs(balanceDiff))})`,
        source_type: 'pribadi',
        is_private: true,
        created_at: new Date().toISOString(),
      };

      const localExp: PersonalExpense[] = JSON.parse(
        localStorage.getItem('warungscan_personal_expenses') || '[]'
      );
      localExp.unshift(historyItem);
      localStorage.setItem('warungscan_personal_expenses', JSON.stringify(localExp));

      if (isDbConnected) {
        try {
          await supabase.from('personal_expenses').insert(historyItem);
        } catch (err) {
          console.warn('History insert error:', err);
        }
      }
    }

    try {
      if (isDbConnected) {
        await supabase
          .from('wallets')
          .update({
            name: updatedWallet.name,
            type: updatedWallet.type,
            balance: updatedWallet.balance,
          })
          .eq('id', updatedWallet.id);
      }
    } catch (err: any) {
      console.warn('Update wallet DB notice:', err);
    }

    onRefreshFinance();
    setEditingWallet(null);
    alert(`Dompet "${updatedWallet.name}" berhasil diperbarui.`);
  };

  // HAPUS DOMPET
  const handleDeleteWallet = async (walletToDelete: Wallet) => {
    triggerHaptic(30);
    const confirmText = `Apakah Anda yakin ingin menghapus dompet "${walletToDelete.name}"?\nSaldo saat ini: ${formatRupiah(walletToDelete.balance)}`;
    if (!window.confirm(confirmText)) return;

    triggerHaptic(40);

    // Optimistic delete di localStorage
    const localW: Wallet[] = JSON.parse(localStorage.getItem('warungscan_wallets') || '[]');
    const filteredWallets = localW.filter((w) => w.id !== walletToDelete.id);
    localStorage.setItem('warungscan_wallets', JSON.stringify(filteredWallets));

    try {
      if (isDbConnected) {
        await supabase.from('wallets').delete().eq('id', walletToDelete.id);
      }
      onRefreshFinance();
      alert(`Dompet "${walletToDelete.name}" berhasil dihapus.`);
    } catch (err: any) {
      onRefreshFinance();
      alert('Gagal menghapus dompet: ' + err.message);
    }
  };

  // TRANSFER ANTAR DOMPET
  const handleTransferWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transferAmount <= 0) {
      alert('Masukkan nominal transfer.');
      return;
    }
    if (transferFromId === transferToId) {
      alert('Pilih dompet tujuan yang berbeda.');
      return;
    }

    const sourceWallet = wallets.find((w) => w.id === transferFromId);
    const destWallet = wallets.find((w) => w.id === transferToId);
    if (!sourceWallet || !destWallet) return;

    if (Number(sourceWallet.balance) < transferAmount) {
      alert('Saldo sumber tidak mencukupi.');
      return;
    }

    triggerHaptic(30);
    const updatedSourceBal = Number(sourceWallet.balance) - transferAmount;
    const updatedDestBal = Number(destWallet.balance) + transferAmount;

    // Optimistic Update LocalStorage
    const localW: Wallet[] = JSON.parse(localStorage.getItem('warungscan_wallets') || '[]');
    const updated = localW.map((w) => {
      if (w.id === sourceWallet.id) return { ...w, balance: updatedSourceBal };
      if (w.id === destWallet.id) return { ...w, balance: updatedDestBal };
      return w;
    });
    localStorage.setItem('warungscan_wallets', JSON.stringify(updated));

    try {
      if (isDbConnected) {
        await supabase
          .from('wallets')
          .update({ balance: updatedSourceBal })
          .eq('id', sourceWallet.id);
        await supabase
          .from('wallets')
          .update({ balance: updatedDestBal })
          .eq('id', destWallet.id);
      }
      onRefreshFinance();
      setIsTransferModalOpen(false);
      setTransferAmount(0);
      alert(`Transfer Rp ${transferAmount.toLocaleString('id-ID')} berhasil.`);
    } catch (err: any) {
      onRefreshFinance();
      setIsTransferModalOpen(false);
    }
  };

  // TAMBAH PRODUK BARU FB MARKETPLACE (OPTIMISTIC & SEAMLESS)
  const handleSaveFbProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFbName.trim() || newFbCostPrice <= 0 || newFbSellingPrice <= 0) {
      alert('Isi nama barang, modal beli, dan patokan harga jual.');
      return;
    }

    triggerHaptic(30);
    const productId = generateUUID();
    const newProduct: MarketplaceProduct = {
      id: productId,
      user_id: activeUserId,
      name: newFbName.trim(),
      cost_price: Number(newFbCostPrice),
      selling_price: Number(newFbSellingPrice),
      stock: Number(newFbStock || 0),
      min_stock_alert: Number(newFbMinAlert || 2),
      created_at: new Date().toISOString(),
    };

    // 1. Update State & LocalStorage Instan (Optimistic)
    const updatedList = [...fbProducts, newProduct];
    setFbProducts(updatedList);
    localStorage.setItem(`warungscan_fb_products_${activeUserId}`, JSON.stringify(updatedList));

    setIsAddingFbProduct(false);
    setNewFbName('');
    setNewFbCostPrice(0);
    setNewFbSellingPrice(0);
    setNewFbStock(1);

    // 2. Sync ke Supabase di Background
    try {
      if (isDbConnected) {
        const { error } = await supabase.from('marketplace_products').insert({
          id: newProduct.id,
          user_id: activeUserId,
          name: newProduct.name,
          cost_price: newProduct.cost_price,
          selling_price: newProduct.selling_price,
          stock: newProduct.stock,
          min_stock_alert: newProduct.min_stock_alert,
        });
        if (error) console.warn('Supabase FB product notice:', error.message);
      }
      alert(`Barang "${newProduct.name}" berhasil ditambahkan ke FB Marketplace!`);
    } catch (err: any) {
      console.warn('Sync notice:', err);
    }
  };

  // CATAT TRANSAKSI TERJUAL FB MARKETPLACE
  const handleRecordFbSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFbProductForSale) return;
    if (saleQty <= 0) {
      alert('Jumlah terjual minimal 1.');
      return;
    }
    if (dealSoldPrice <= 0) {
      alert('Masukkan harga deal terjual.');
      return;
    }
    if (selectedFbProductForSale.stock < saleQty) {
      alert(`Stok tidak mencukupi! Sisa stok hanya ${selectedFbProductForSale.stock}.`);
      return;
    }

    const targetWallet = wallets.find((w) => w.id === saleDestWalletId) || visibleWallets[0];
    if (!targetWallet) return;

    triggerHaptic(40);
    const totalOmset = saleQty * dealSoldPrice;
    const totalCost = saleQty * selectedFbProductForSale.cost_price;
    const totalProfit = totalOmset - totalCost;

    const saleId = generateUUID();
    const newSale: MarketplaceSale = {
      id: saleId,
      user_id: activeUserId,
      product_id: selectedFbProductForSale.id,
      product_name: selectedFbProductForSale.name,
      qty: saleQty,
      unit_cost: selectedFbProductForSale.cost_price,
      sold_price: dealSoldPrice,
      total_omset: totalOmset,
      total_profit: totalProfit,
      buyer_name: buyerName.trim() || 'Pembeli FB',
      destination_wallet_id: targetWallet.id,
      created_at: new Date().toISOString(),
    };

    const remainingStock = selectedFbProductForSale.stock - saleQty;
    const updatedWalletBalance = Number(targetWallet.balance || 0) + totalOmset;

    // Optimistic Update LocalStorage
    const updatedSales = [newSale, ...fbSales];
    const updatedProducts = fbProducts.map((p) =>
      p.id === selectedFbProductForSale.id ? { ...p, stock: remainingStock } : p
    );

    setFbSales(updatedSales);
    setFbProducts(updatedProducts);
    localStorage.setItem(`warungscan_fb_sales_${activeUserId}`, JSON.stringify(updatedSales));
    localStorage.setItem(`warungscan_fb_products_${activeUserId}`, JSON.stringify(updatedProducts));

    const localW: Wallet[] = JSON.parse(localStorage.getItem('warungscan_wallets') || '[]');
    const updatedWallets = localW.map((w) =>
      w.id === targetWallet.id ? { ...w, balance: updatedWalletBalance } : w
    );
    localStorage.setItem('warungscan_wallets', JSON.stringify(updatedWallets));

    setIsRecordingFbSale(false);
    setSelectedFbProductForSale(null);
    setSaleQty(1);
    setDealSoldPrice(0);
    setBuyerName('');

    try {
      if (isDbConnected) {
        await supabase.from('marketplace_sales').insert({
          id: newSale.id,
          user_id: activeUserId,
          product_id: newSale.product_id,
          product_name: newSale.product_name,
          qty: newSale.qty,
          unit_cost: newSale.unit_cost,
          sold_price: newSale.sold_price,
          total_omset: newSale.total_omset,
          total_profit: newSale.total_profit,
          buyer_name: newSale.buyer_name,
          destination_wallet_id: newSale.destination_wallet_id,
        });

        await supabase
          .from('marketplace_products')
          .update({ stock: remainingStock })
          .eq('id', selectedFbProductForSale.id);

        await supabase
          .from('wallets')
          .update({ balance: updatedWalletBalance })
          .eq('id', targetWallet.id);
      }
      onRefreshFinance();
      alert(
        `Alhamdulillah! Transaksi "${newSale.product_name}" laku ${saleQty} pcs. Omset Rp ${totalOmset.toLocaleString(
          'id-ID'
        )} (Profit: Rp ${totalProfit.toLocaleString('id-ID')}) masuk ke ${targetWallet.name}.`
      );
    } catch (err: any) {
      onRefreshFinance();
    }
  };

  // HAPUS CATATAN KEUANGAN PRIBADI (DENGAN REVERT SALDO DOMPET)
  const handleDeleteExpense = async (expense: PersonalExpense) => {
    const isExp = (expense.type || 'expense') === 'expense';
    if (
      !confirm(
        `Hapus catatan ${isExp ? 'pengeluaran' : 'pemasukan'} "${expense.category}" senilai ${formatRupiah(
          expense.amount
        )}?\n\nSaldo dompet akan disesuaikan kembali.`
      )
    ) {
      return;
    }

    triggerHaptic(30);
    const targetWallet = wallets.find((w) => w.id === expense.wallet_id);
    let updatedBalance = targetWallet ? Number(targetWallet.balance) : 0;
    if (targetWallet) {
      updatedBalance = isExp
        ? Number(targetWallet.balance) + Number(expense.amount)
        : Number(targetWallet.balance) - Number(expense.amount);
    }

    // Optimistic Update LocalStorage
    const localExp: PersonalExpense[] = JSON.parse(
      localStorage.getItem('warungscan_personal_expenses') || '[]'
    );
    const filteredExp = localExp.filter((e) => e.id !== expense.id);
    localStorage.setItem('warungscan_personal_expenses', JSON.stringify(filteredExp));

    if (targetWallet) {
      const localW: Wallet[] = JSON.parse(localStorage.getItem('warungscan_wallets') || '[]');
      const updatedW = localW.map((w) =>
        w.id === targetWallet.id ? { ...w, balance: updatedBalance } : w
      );
      localStorage.setItem('warungscan_wallets', JSON.stringify(updatedW));
    }

    try {
      if (isDbConnected) {
        await supabase.from('personal_expenses').delete().eq('id', expense.id);
        if (targetWallet) {
          await supabase.from('wallets').update({ balance: updatedBalance }).eq('id', targetWallet.id);
        }
      }
      onRefreshFinance();
      alert('Catatan transaksi berhasil dihapus dan saldo dompet telah disesuaikan.');
    } catch (err: any) {
      onRefreshFinance();
    }
  };

  // SIMPAN EDIT CATATAN KEUANGAN PRIBADI
  const handleSaveEditExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense || editExpAmount <= 0) return;

    triggerHaptic(30);
    const isExp = (editingExpense.type || 'expense') === 'expense';
    const oldAmount = Number(editingExpense.amount);
    const newAmount = Number(editExpAmount);
    const amountDiff = newAmount - oldAmount;

    const targetWallet = wallets.find((w) => w.id === editExpWalletId);
    let updatedBalance = targetWallet ? Number(targetWallet.balance) : 0;
    if (targetWallet) {
      if (isExp) {
        updatedBalance = Number(targetWallet.balance) - amountDiff;
      } else {
        updatedBalance = Number(targetWallet.balance) + amountDiff;
      }
    }

    // Optimistic LocalStorage
    const localExp: PersonalExpense[] = JSON.parse(
      localStorage.getItem('warungscan_personal_expenses') || '[]'
    );
    const updatedExp = localExp.map((item) =>
      item.id === editingExpense.id
        ? {
            ...item,
            amount: newAmount,
            description: editExpDesc.trim(),
            category: editExpCategory,
            wallet_id: editExpWalletId,
            wallet_name: targetWallet?.name || item.wallet_name,
          }
        : item
    );
    localStorage.setItem('warungscan_personal_expenses', JSON.stringify(updatedExp));

    if (targetWallet) {
      const localW: Wallet[] = JSON.parse(localStorage.getItem('warungscan_wallets') || '[]');
      const updatedW = localW.map((w) =>
        w.id === targetWallet.id ? { ...w, balance: updatedBalance } : w
      );
      localStorage.setItem('warungscan_wallets', JSON.stringify(updatedW));
    }

    try {
      if (isDbConnected) {
        await supabase
          .from('personal_expenses')
          .update({
            amount: newAmount,
            description: editExpDesc.trim(),
            category: editExpCategory,
            wallet_id: editExpWalletId,
            wallet_name: targetWallet?.name || editingExpense.wallet_name,
          })
          .eq('id', editingExpense.id);

        if (targetWallet) {
          await supabase.from('wallets').update({ balance: updatedBalance }).eq('id', targetWallet.id);
        }
      }
      onRefreshFinance();
      setEditingExpense(null);
      alert('Perubahan transaksi keuangan berhasil disimpan.');
    } catch (err: any) {
      onRefreshFinance();
      setEditingExpense(null);
    }
  };

  // HAPUS PRODUK FB MARKETPLACE
  const handleDeleteFbProduct = async (product: MarketplaceProduct) => {
    if (!confirm(`Hapus barang jualan "${product.name}" dari FB Marketplace?`)) return;
    triggerHaptic(30);

    const updated = fbProducts.filter((p) => p.id !== product.id);
    setFbProducts(updated);
    localStorage.setItem(`warungscan_fb_products_${activeUserId}`, JSON.stringify(updated));

    try {
      if (isDbConnected) {
        await supabase.from('marketplace_products').delete().eq('id', product.id);
      }
      alert(`Produk "${product.name}" berhasil dihapus.`);
    } catch (err: any) {
      console.warn('Delete product notice:', err);
    }
  };

  // SIMPAN EDIT PRODUK FB MARKETPLACE
  const handleSaveEditFbProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFbProduct || !editFbName.trim() || editFbCost <= 0 || editFbSelling <= 0) return;

    triggerHaptic(30);
    const updated = fbProducts.map((p) =>
      p.id === editingFbProduct.id
        ? {
            ...p,
            name: editFbName.trim(),
            cost_price: Number(editFbCost),
            selling_price: Number(editFbSelling),
            stock: Number(editFbStock),
            min_stock_alert: Number(editFbMinAlert),
          }
        : p
    );

    setFbProducts(updated);
    localStorage.setItem(`warungscan_fb_products_${activeUserId}`, JSON.stringify(updated));
    setEditingFbProduct(null);

    try {
      if (isDbConnected) {
        await supabase
          .from('marketplace_products')
          .update({
            name: editFbName.trim(),
            cost_price: Number(editFbCost),
            selling_price: Number(editFbSelling),
            stock: Number(editFbStock),
            min_stock_alert: Number(editFbMinAlert),
          })
          .eq('id', editingFbProduct.id);
      }
      alert('Perubahan produk FB berhasil disimpan.');
    } catch (err: any) {
      console.warn('Edit FB product notice:', err);
    }
  };

  // HAPUS / BATALKAN PENJUALAN FB (ROLLBACK STOK FB & POTONG SALDO DOMPET)
  const handleDeleteFbSale = async (sale: MarketplaceSale) => {
    if (
      !confirm(
        `Batalkan penjualan "${sale.product_name} (${sale.qty} pcs)" senilai ${formatRupiah(
          sale.total_omset
        )}?\n\nStok barang FB akan dikembalikan dan saldo dompet akan dipotong kembali.`
      )
    ) {
      return;
    }

    triggerHaptic(30);
    // 1. Rollback stok produk FB
    const updatedProducts = fbProducts.map((p) => {
      if (p.id === sale.product_id || p.name === sale.product_name) {
        return { ...p, stock: p.stock + Number(sale.qty) };
      }
      return p;
    });
    setFbProducts(updatedProducts);
    localStorage.setItem(`warungscan_fb_products_${activeUserId}`, JSON.stringify(updatedProducts));

    // 2. Potong kembali saldo dompet tujuan
    const targetWallet = wallets.find((w) => w.id === sale.destination_wallet_id);
    let newBal = targetWallet ? Number(targetWallet.balance) - Number(sale.total_omset) : 0;
    if (targetWallet) {
      const localW: Wallet[] = JSON.parse(localStorage.getItem('warungscan_wallets') || '[]');
      const updatedW = localW.map((w) =>
        w.id === targetWallet.id ? { ...w, balance: newBal } : w
      );
      localStorage.setItem('warungscan_wallets', JSON.stringify(updatedW));
    }

    // 3. Hapus dari penjualan FB
    const updatedSales = fbSales.filter((s) => s.id !== sale.id);
    setFbSales(updatedSales);
    localStorage.setItem(`warungscan_fb_sales_${activeUserId}`, JSON.stringify(updatedSales));

    try {
      if (isDbConnected) {
        await supabase.from('marketplace_sales').delete().eq('id', sale.id);
        const targetProd = fbProducts.find((p) => p.id === sale.product_id);
        if (targetProd) {
          await supabase
            .from('marketplace_products')
            .update({ stock: targetProd.stock + Number(sale.qty) })
            .eq('id', targetProd.id);
        }
        if (targetWallet) {
          await supabase.from('wallets').update({ balance: newBal }).eq('id', targetWallet.id);
        }
      }
      onRefreshFinance();
      alert('Penjualan FB dibatalkan, stok barang telah dikembalikan.');
    } catch (err: any) {
      onRefreshFinance();
    }
  };

  // TAMBAH BUDGET
  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newBudgetLimit <= 0) return;

    triggerHaptic(30);
    const newB: Budget = {
      id: generateUUID(),
      user_id: activeUserId,
      category: newBudgetCategory,
      monthly_limit: newBudgetLimit,
    };

    const updated = [...budgets.filter((b) => b.category !== newB.category), newB];
    setBudgets(updated);
    localStorage.setItem(`warungscan_budgets_${activeUserId}`, JSON.stringify(updated));

    setIsAddingBudget(false);
    setNewBudgetLimit(0);

    try {
      if (isDbConnected) {
        await supabase.from('budgets').insert(newB);
      }
      alert('Anggaran bulanan berhasil disimpan.');
    } catch (err: any) {
      console.warn('Budget notice:', err);
    }
  };

  // TAMBAH SMART GOAL
  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim() || newGoalTarget <= 0 || !newGoalDeadline) {
      alert('Isi nama target, nominal, dan tanggal target tercapai.');
      return;
    }

    triggerHaptic(30);
    const newG: FinancialGoal = {
      id: generateUUID(),
      user_id: activeUserId,
      title: newGoalTitle.trim(),
      target_amount: newGoalTarget,
      current_amount: 0,
      deadline: newGoalDeadline,
      is_private: true,
      created_at: new Date().toISOString(),
    };

    const updated = [...goals, newG];
    setGoals(updated);
    localStorage.setItem(`warungscan_goals_${activeUserId}`, JSON.stringify(updated));

    setIsAddingGoal(false);
    setNewGoalTitle('');
    setNewGoalTarget(0);
    setNewGoalDeadline('');

    try {
      if (isDbConnected) {
        await supabase.from('financial_goals').insert(newG);
      }
      alert('Target keuangan berhasil ditambahkan.');
    } catch (err: any) {
      console.warn('Goal notice:', err);
    }
  };

  // SETOR TABUNGAN KE GOAL
  const handleDepositToGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoalForDeposit || depositAmount <= 0) return;

    const sourceWallet = wallets.find((w) => w.id === depositWalletId) || visibleWallets[0];
    if (!sourceWallet) return;

    if (Number(sourceWallet.balance) < depositAmount) {
      alert('Saldo dompet tidak mencukupi untuk menabung.');
      return;
    }

    triggerHaptic(35);
    const updatedGoalAmount = Number(selectedGoalForDeposit.current_amount || 0) + depositAmount;
    const updatedWalletBalance = Number(sourceWallet.balance) - depositAmount;

    const updatedGoals = goals.map((g) =>
      g.id === selectedGoalForDeposit.id ? { ...g, current_amount: updatedGoalAmount } : g
    );
    setGoals(updatedGoals);
    localStorage.setItem(`warungscan_goals_${activeUserId}`, JSON.stringify(updatedGoals));

    const localW: Wallet[] = JSON.parse(localStorage.getItem('warungscan_wallets') || '[]');
    const updatedWallets = localW.map((w) =>
      w.id === sourceWallet.id ? { ...w, balance: updatedWalletBalance } : w
    );
    localStorage.setItem('warungscan_wallets', JSON.stringify(updatedWallets));

    setSelectedGoalForDeposit(null);
    setDepositAmount(0);

    try {
      if (isDbConnected) {
        await supabase
          .from('financial_goals')
          .update({ current_amount: updatedGoalAmount })
          .eq('id', selectedGoalForDeposit.id);
        await supabase
          .from('wallets')
          .update({ balance: updatedWalletBalance })
          .eq('id', sourceWallet.id);
      }
      onRefreshFinance();
      alert(
        `Alhamdulillah! Berhasil menyisihkan Rp ${depositAmount.toLocaleString(
          'id-ID'
        )} untuk target "${selectedGoalForDeposit.title || selectedGoalForDeposit.name}".`
      );
    } catch (err: any) {
      onRefreshFinance();
    }
  };

  // TAMBAH ASET INVESTASI
  const handleSaveInvestment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssetName.trim() || newAssetUnits <= 0 || newAssetBuyPrice <= 0) {
      alert('Lengkapi nama aset, jumlah unit, dan modal beli.');
      return;
    }

    triggerHaptic(30);
    const currentPrice =
      newAssetCurrentPrice > 0
        ? newAssetCurrentPrice
        : newAssetCategory === 'btc'
        ? btcLivePrice
        : newAssetCategory === 'emas'
        ? goldEstPrice
        : newAssetBuyPrice;

    const newAsset: InvestmentAsset = {
      id: generateUUID(),
      user_id: activeUserId,
      asset_name: newAssetName.trim(),
      category: newAssetCategory,
      total_units: newAssetUnits,
      buy_price: newAssetBuyPrice,
      current_price: currentPrice,
      updated_at: new Date().toISOString(),
    };

    const updated = [...investments, newAsset];
    setInvestments(updated);
    localStorage.setItem(`warungscan_investments_${activeUserId}`, JSON.stringify(updated));

    setIsAddingInvestment(false);
    setNewAssetName('');
    setNewAssetUnits(0);
    setNewAssetBuyPrice(0);
    setNewAssetCurrentPrice(0);

    try {
      if (isDbConnected) {
        await supabase.from('investments').insert(newAsset);
      }
      alert('Aset investasi berhasil disimpan.');
    } catch (err: any) {
      console.warn('Investment notice:', err);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-3 space-y-3 pb-24 max-w-md mx-auto w-full">
      {/* HEADER RINGKASAN SALDO & PRIVASI */}
      <div className="bg-linear-to-r from-amber-500 to-amber-600 rounded-3xl p-4 text-slate-950 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <WalletIcon className="w-4 h-4 text-slate-950 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Total Uang & Tabungan
            </span>
          </div>

          {currentMember.role === 'super_admin' && (
            <button
              onClick={() => {
                triggerHaptic(15);
                setShowAllUsersData(!showAllUsersData);
              }}
              className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 hover:bg-amber-300"
            >
              {showAllUsersData ? 'Semua Akun' : 'Akun Saya'}
            </button>
          )}
        </div>

        <div className="mt-1 flex items-baseline justify-between">
          <h2 className="text-2xl font-black tracking-tight">{formatRupiah(totalBalance)}</h2>
          <span className="text-[10px] bg-slate-950/15 font-bold px-2 py-0.5 rounded-full">
            {visibleWallets.length} Dompet
          </span>
        </div>

        {/* QUICK BUTTONS */}
        <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-amber-600/30">
          <button
            onClick={() => {
              triggerHaptic(20);
              setTxType('expense');
              setIsAddingTransaction(true);
            }}
            className="py-2.5 px-3 rounded-xl bg-slate-950 text-white font-extrabold text-xs flex items-center justify-center space-x-1.5 shadow-xs"
            style={{ minHeight: '44px' }}
          >
            <TrendingDown className="w-4 h-4 text-red-400" />
            <span>Catat Keluar</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic(20);
              setTxType('income');
              setIsAddingTransaction(true);
            }}
            className="py-2.5 px-3 rounded-xl bg-white text-slate-950 font-extrabold text-xs flex items-center justify-center space-x-1.5 shadow-xs"
            style={{ minHeight: '44px' }}
          >
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>Catat Masuk</span>
          </button>
        </div>
      </div>

      {/* SUB-NAVIGASI TAB KEUANGAN (6 SUB-TAB) */}
      <div className="grid grid-cols-6 p-1 bg-slate-200 rounded-2xl text-[10px] font-extrabold text-slate-600">
        <button
          onClick={() => {
            triggerHaptic(15);
            setSubTab('overview');
          }}
          className={`py-2 rounded-xl transition-all ${
            subTab === 'overview'
              ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
              : 'hover:text-slate-900'
          }`}
        >
          Grafik
        </button>

        <button
          onClick={() => {
            triggerHaptic(15);
            setSubTab('wallets');
          }}
          className={`py-2 rounded-xl transition-all ${
            subTab === 'wallets'
              ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
              : 'hover:text-slate-900'
          }`}
        >
          Dompet
        </button>

        <button
          onClick={() => {
            triggerHaptic(15);
            setSubTab('fb_market');
          }}
          className={`py-2 rounded-xl transition-all ${
            subTab === 'fb_market'
              ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
              : 'hover:text-slate-900'
          }`}
        >
          FB Market
        </button>

        <button
          onClick={() => {
            triggerHaptic(15);
            setSubTab('budget');
          }}
          className={`py-2 rounded-xl transition-all ${
            subTab === 'budget'
              ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
              : 'hover:text-slate-900'
          }`}
        >
          Anggaran
        </button>

        <button
          onClick={() => {
            triggerHaptic(15);
            setSubTab('goals');
          }}
          className={`py-2 rounded-xl transition-all ${
            subTab === 'goals'
              ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
              : 'hover:text-slate-900'
          }`}
        >
          Target
        </button>

        <button
          onClick={() => {
            triggerHaptic(15);
            setSubTab('invest');
          }}
          className={`py-2 rounded-xl transition-all ${
            subTab === 'invest'
              ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
              : 'hover:text-slate-900'
          }`}
        >
          Investasi
        </button>
      </div>

      {/* 1. KONTEN SUB-TAB: GRAFIK & RINGKASAN TRANSAKSI */}
      {subTab === 'overview' && (
        <div className="space-y-3">
          {/* FILTER PERIODE & PERBANDINGAN TREN */}
          <div className="p-3.5 bg-white rounded-2xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase">Periode Tinjauan:</span>
              <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setPeriodFilter('day')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    periodFilter === 'day' ? 'bg-amber-500 text-slate-950' : 'text-slate-600'
                  }`}
                >
                  Hari Ini
                </button>
                <button
                  onClick={() => setPeriodFilter('week')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    periodFilter === 'week' ? 'bg-amber-500 text-slate-950' : 'text-slate-600'
                  }`}
                >
                  Minggu
                </button>
                <button
                  onClick={() => setPeriodFilter('month')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    periodFilter === 'month' ? 'bg-amber-500 text-slate-950' : 'text-slate-600'
                  }`}
                >
                  Bulan
                </button>
              </div>
            </div>

            {/* KARTU PERBANDINGAN */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-2.5 bg-red-50 rounded-xl border border-red-100">
                <span className="text-[10px] font-bold text-red-700 block">Total Pengeluaran:</span>
                <p className="text-sm font-black text-red-900 mt-0.5">
                  {formatRupiah(totalCurrentExpense)}
                </p>
                <span className="text-[10px] text-slate-500 block mt-1">
                  {prevExpenses > 0
                    ? `${expenseDiffPercent > 0 ? '+' : ''}${expenseDiffPercent}% vs lalu`
                    : 'Belum ada data lalu'}
                </span>
              </div>

              <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
                <span className="text-[10px] font-bold text-emerald-700 block">
                  Total Pemasukan:
                </span>
                <p className="text-sm font-black text-emerald-900 mt-0.5">
                  {formatRupiah(totalCurrentIncome)}
                </p>
                <span className="text-[10px] text-slate-500 block mt-1">
                  {prevIncomes > 0
                    ? `${incomeDiffPercent > 0 ? '+' : ''}${incomeDiffPercent}% vs lalu`
                    : 'Belum ada data lalu'}
                </span>
              </div>
            </div>
          </div>

          {/* 1A. GRAFIK GARIS TREN BULANAN (6 BULAN / 1 TAHUN) */}
          <div className="p-3.5 bg-white rounded-2xl border border-slate-200 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <LineChartIcon className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-black text-slate-900 uppercase">
                  Tren Pemasukan vs Pengeluaran
                </h3>
              </div>
              <div className="flex space-x-1 bg-slate-100 p-0.5 rounded-lg text-[10px]">
                <button
                  onClick={() => setChartRange('6m')}
                  className={`px-2 py-0.5 rounded font-bold ${
                    chartRange === '6m' ? 'bg-amber-500 text-slate-950' : 'text-slate-600'
                  }`}
                >
                  6 Bulan
                </button>
                <button
                  onClick={() => setChartRange('1y')}
                  className={`px-2 py-0.5 rounded font-bold ${
                    chartRange === '1y' ? 'bg-amber-500 text-slate-950' : 'text-slate-600'
                  }`}
                >
                  1 Tahun
                </button>
              </div>
            </div>

            {/* SVG Interactive Line Chart */}
            <div className="w-full h-44 relative pt-2">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 300 130">
                <line x1="0" y1="110" x2="300" y2="110" stroke="#e2e8f0" strokeWidth="1" />
                <line x1="0" y1="65" x2="300" y2="65" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="0" y1="20" x2="300" y2="20" stroke="#f1f5f9" strokeWidth="1" />

                {lineChartData.length > 1 && (
                  <path
                    d={lineChartData
                      .map((d, i) => {
                        const x = (i / (lineChartData.length - 1)) * 280 + 10;
                        const y = 110 - (d.income / maxChartValue) * 95;
                        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                      })
                      .join(' ')}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {lineChartData.length > 1 && (
                  <path
                    d={lineChartData
                      .map((d, i) => {
                        const x = (i / (lineChartData.length - 1)) * 280 + 10;
                        const y = 110 - (d.expense / maxChartValue) * 95;
                        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                      })
                      .join(' ')}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {lineChartData.map((d, i) => {
                  const x = (i / (lineChartData.length - 1)) * 280 + 10;
                  const yInc = 110 - (d.income / maxChartValue) * 95;
                  const yExp = 110 - (d.expense / maxChartValue) * 95;

                  return (
                    <g key={d.monthKey}>
                      <circle cx={x} cy={yInc} r="3.5" fill="#10b981" />
                      <circle cx={x} cy={yExp} r="3.5" fill="#ef4444" />
                      <text
                        x={x}
                        y="125"
                        textAnchor="middle"
                        fontSize="9"
                        fontWeight="bold"
                        fill="#64748b"
                      >
                        {d.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="flex items-center justify-center space-x-6 pt-1 text-[11px] font-bold">
              <div className="flex items-center space-x-1.5">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-slate-700">Pemasukan</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <span className="text-slate-700">Pengeluaran</span>
              </div>
            </div>
          </div>

          {/* 1B. GRAFIK PIE / DONUT CHART KATEGORI */}
          <div className="p-3.5 bg-white rounded-2xl border border-slate-200 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <PieChartIcon className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-black text-slate-900 uppercase">
                  Proporsi {pieMode === 'expense' ? 'Pengeluaran' : 'Pemasukan'}
                </h3>
              </div>

              <div className="flex space-x-1 bg-slate-100 p-0.5 rounded-lg text-[10px]">
                <button
                  onClick={() => setPieMode('expense')}
                  className={`px-2 py-0.5 rounded font-bold ${
                    pieMode === 'expense' ? 'bg-amber-500 text-slate-950' : 'text-slate-600'
                  }`}
                >
                  Pengeluaran
                </button>
                <button
                  onClick={() => setPieMode('income')}
                  className={`px-2 py-0.5 rounded font-bold ${
                    pieMode === 'income' ? 'bg-amber-500 text-slate-950' : 'text-slate-600'
                  }`}
                >
                  Pemasukan
                </button>
              </div>
            </div>

            {pieChartData.slices.length === 0 ? (
              <p className="text-xs text-center text-slate-400 py-4 font-bold">
                Belum ada data pada periode ini.
              </p>
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-center justify-center py-2">
                  <div className="w-32 h-32 relative flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 42 42">
                      <circle
                        cx="21"
                        cy="21"
                        r="15.91549430918954"
                        fill="transparent"
                        stroke="#f1f5f9"
                        strokeWidth="5"
                      />
                      {(() => {
                        let offset = 0;
                        return pieChartData.slices.map((slice) => {
                          const strokeDash = `${slice.percent} ${100 - slice.percent}`;
                          const currentOffset = offset;
                          offset += slice.percent;
                          return (
                            <circle
                              key={slice.name}
                              cx="21"
                              cy="21"
                              r="15.91549430918954"
                              fill="transparent"
                              stroke={slice.color}
                              strokeWidth="5.5"
                              strokeDasharray={strokeDash}
                              strokeDashoffset={-currentOffset}
                            />
                          );
                        });
                      })()}
                    </svg>
                    <div className="absolute text-center">
                      <span className="text-[10px] text-slate-400 font-bold block">Total</span>
                      <span className="text-xs font-black text-slate-900">
                        {formatRupiah(pieChartData.total)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  {pieChartData.slices.map((slice) => (
                    <div
                      key={slice.name}
                      className="flex items-center justify-between text-xs py-1 px-2 rounded-xl bg-slate-50 border border-slate-100"
                    >
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: slice.color }}
                        />
                        <span className="font-bold text-slate-800">{slice.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-slate-900">{formatRupiah(slice.amount)}</span>
                        <span className="text-[10px] text-slate-500 font-bold ml-1.5">
                          ({slice.percent}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* DAFTAR TRANSAKSI TERAKHIR */}
          <div className="space-y-2">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Catatan Transaksi Terakhir ({visibleExpenses.length})
            </h3>

            {visibleExpenses.length === 0 ? (
              <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center text-slate-400">
                <p className="text-xs font-bold">Belum ada catatan transaksi keuangan.</p>
                <p className="text-[10px] mt-1">Tekan tombol di atas untuk mencatat transaksi.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {visibleExpenses.slice(0, 15).map((tx) => {
                  const isExpense = (tx.type || 'expense') === 'expense';
                  return (
                    <div
                      key={tx.id}
                      className="p-3 bg-white rounded-2xl border border-slate-200 flex items-center justify-between shadow-2xs"
                    >
                      <div className="flex items-center space-x-2.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isExpense
                              ? 'bg-red-100 text-red-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {isExpense ? (
                            <TrendingDown className="w-4 h-4" />
                          ) : (
                            <TrendingUp className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <h4 className="text-xs font-extrabold text-slate-900">{tx.category}</h4>
                            {tx.source_type && tx.source_type !== 'pribadi' && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900">
                                {tx.source_type === 'fb_marketplace'
                                  ? 'FB Market'
                                  : tx.source_type === 'warung'
                                  ? 'Warung'
                                  : 'Bisnis Lain'}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500">
                            {tx.wallet_name} • {formatTanggal(tx.created_at)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <span
                            className={`text-xs font-black ${
                              isExpense ? 'text-red-600' : 'text-emerald-700'
                            }`}
                          >
                            {isExpense ? '-' : '+'} {formatRupiah(tx.amount)}
                          </span>
                          {tx.description && (
                            <p className="text-[10px] text-slate-400 max-w-[120px] truncate">
                              {tx.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center space-x-0.5 pl-1.5 border-l border-slate-100">
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic(20);
                              setEditingExpense(tx);
                              setEditExpAmount(Number(tx.amount));
                              setEditExpDesc(tx.description || '');
                              setEditExpCategory(tx.category || 'Belanja');
                              setEditExpWalletId(tx.wallet_id || (visibleWallets[0]?.id || ''));
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                            title="Edit Catatan"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(tx)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Hapus Catatan & Sesuaikan Saldo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. KONTEN SUB-TAB: DOMPET & REKENING */}
      {subTab === 'wallets' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-800 uppercase">Daftar Dompet & Akun</h3>
            <div className="flex space-x-1.5">
              <button
                onClick={() => {
                  triggerHaptic(20);
                  setIsTransferModalOpen(true);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-200 text-slate-800 font-bold text-xs flex items-center space-x-1"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Pindah Saldo</span>
              </button>

              <button
                onClick={() => {
                  triggerHaptic(20);
                  setIsAddingWallet(true);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Dompet</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {visibleWallets.map((wallet) => (
              <div
                key={wallet.id}
                className="p-3.5 bg-white rounded-2xl border border-slate-200 flex items-center justify-between shadow-2xs"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
                    {wallet.type === 'cash_warung' ? (
                      <Banknote className="w-5 h-5 text-emerald-700" />
                    ) : wallet.type === 'bank' ? (
                      <Building className="w-5 h-5 text-blue-700" />
                    ) : wallet.type === 'ewallet' ? (
                      <CreditCard className="w-5 h-5 text-purple-700" />
                    ) : (
                      <WalletIcon className="w-5 h-5 text-amber-700" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900">{wallet.name}</h4>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {wallet.type === 'cash_warung'
                        ? 'Laci Toko Bersama'
                        : wallet.type === 'bank'
                        ? 'Rekening Bank'
                        : wallet.type === 'ewallet'
                        ? 'E-Wallet'
                        : 'Dompet Tunai Pribadi'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-900">
                      {formatRupiah(wallet.balance)}
                    </p>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEditWallet(wallet)}
                      className="p-2 rounded-xl text-slate-500 hover:text-amber-700 hover:bg-amber-50 active:scale-95 transition-all"
                      title="Ubah Dompet"
                      aria-label="Ubah Dompet"
                      style={{ minWidth: '40px', minHeight: '40px' }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteWallet(wallet)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 active:scale-95 transition-all"
                      title="Hapus Dompet"
                      aria-label="Hapus Dompet"
                      style={{ minWidth: '40px', minHeight: '40px' }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. KONTEN SUB-TAB: BISNIS FB MARKETPLACE (USER-FRIENDLY, WARM & TERPISAH) */}
      {subTab === 'fb_market' && (
        <div className="space-y-3">
          {/* HEADER & RINGKASAN METRIK BERSIH & RAMAH */}
          <div className="bg-white rounded-3xl p-4 space-y-3 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-900">
                    Bisnis FB Marketplace
                  </h3>
                  <span className="text-[10px] text-slate-500 font-semibold block">
                    Khusus jualan online & dagangan pribadi
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Terpisah dari Warung
              </span>
            </div>

            {/* 4 KARTU METRIK BERSIH */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/60">
                <span className="text-[10px] text-amber-900 font-bold block">
                  Modal Mengendap:
                </span>
                <span className="text-sm font-black text-amber-950 block mt-0.5">
                  {formatRupiah(fbTotalModalMengendap)}
                </span>
                <span className="text-[9px] text-amber-700 block mt-0.5">
                  Dari {fbProducts.length} jenis barang siap jual
                </span>
              </div>

              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200/60">
                <span className="text-[10px] text-emerald-900 font-bold block">
                  Untung Bersih (Cuan):
                </span>
                <span className="text-sm font-black text-emerald-950 block mt-0.5">
                  +{formatRupiah(fbTotalProfit)}
                </span>
                <span className="text-[9px] text-emerald-700 block mt-0.5">
                  Laba bersih masuk ke dompet
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[10px] text-slate-600 font-bold block">Total Omset FB:</span>
                <span className="text-sm font-black text-slate-900 block mt-0.5">
                  {formatRupiah(fbTotalOmset)}
                </span>
                <span className="text-[9px] text-slate-500 block mt-0.5">
                  {fbSales.length} total transaksi deal
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[10px] text-slate-600 font-bold block">Barang Terjual:</span>
                <span className="text-sm font-black text-slate-900 block mt-0.5">
                  {fbTotalUnitsSold} pcs
                </span>
                <span className="text-[9px] text-slate-500 block mt-0.5">
                  Unit barang keluar
                </span>
              </div>
            </div>
          </div>

          {/* PERINGATAN PERLU RESTOK FB */}
          {fbLowStockProducts.length > 0 && (
            <div className="p-3 bg-red-50 rounded-2xl border border-red-200 text-xs space-y-1.5">
              <div className="flex items-center space-x-1.5 text-red-800 font-black">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>Peringatan Perlu Restok ({fbLowStockProducts.length} barang):</span>
              </div>
              <div className="space-y-1">
                {fbLowStockProducts.map((p) => (
                  <div
                    key={p.id}
                    className="flex justify-between items-center text-[11px] bg-white p-2 rounded-xl border border-red-100"
                  >
                    <span className="font-bold text-slate-900">{p.name}</span>
                    <span className="font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                      Sisa {p.stock} pcs
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LAPORAN TOP 5 BARANG PALING LARIS FB */}
          {fbTopProducts.length > 0 && (
            <div className="p-3.5 bg-white rounded-2xl border border-slate-200 space-y-2.5 shadow-2xs">
              <div className="flex items-center space-x-1.5">
                <Award className="w-4 h-4 text-amber-500" />
                <h4 className="text-xs font-black uppercase text-slate-900">
                  Top Barang Paling Laris di FB
                </h4>
              </div>

              <div className="space-y-1.5">
                {fbTopProducts.map((item, idx) => (
                  <div
                    key={item.name}
                    className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-bold text-slate-900">{item.name}</span>
                        <p className="text-[10px] text-slate-500">
                          Laku {item.qty} pcs • Total Omset: {formatRupiah(item.omset)}
                        </p>
                      </div>
                    </div>
                    <span className="font-black text-emerald-700 text-xs">
                      +{formatRupiah(item.profit)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TOMBOL AKSI & KATALOG BARANG FB */}
          <div className="flex items-center justify-between pt-1">
            <h3 className="text-xs font-black text-slate-800 uppercase">
              Katalog Stok Barang FB ({fbProducts.length})
            </h3>
            <button
              onClick={() => {
                triggerHaptic(20);
                setIsAddingFbProduct(true);
              }}
              className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center space-x-1.5 shadow-xs"
              style={{ minHeight: '44px' }}
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Barang FB</span>
            </button>
          </div>

          {/* DAFTAR BARANG FB MARKETPLACE */}
          {fbProducts.length === 0 ? (
            <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center text-slate-400">
              <Package className="w-8 h-8 text-amber-500 mx-auto mb-2 opacity-80" />
              <p className="text-xs font-bold text-slate-700">Belum ada barang jualan FB Marketplace.</p>
              <p className="text-[10px] mt-1 text-slate-500">
                Tekan tombol "Tambah Barang FB" di atas untuk mencatat stok barang dagangan Anda.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {fbProducts.map((prod) => {
                const isLow = prod.stock <= prod.min_stock_alert;
                const margin = prod.selling_price - prod.cost_price;

                return (
                  <div
                    key={prod.id}
                    className="p-3.5 bg-white rounded-2xl border border-slate-200 space-y-2.5 shadow-2xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <h4 className="text-xs font-black text-slate-900">{prod.name}</h4>
                          {isLow && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-red-100 text-red-700">
                              Stok Menipis
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Modal: {formatRupiah(prod.cost_price)} • Patokan Jual:{' '}
                          {formatRupiah(prod.selling_price)}
                        </p>
                        <p className="text-[10px] text-emerald-700 font-bold">
                          Potensi Cuan: +{formatRupiah(margin)}/pcs
                        </p>
                      </div>

                      <div className="text-right flex flex-col items-end space-y-1.5">
                        <span className="text-xs font-black text-slate-900 block bg-slate-100 px-2.5 py-1 rounded-xl">
                          Sisa: {prod.stock} pcs
                        </span>
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic(20);
                              setEditingFbProduct(prod);
                              setEditFbName(prod.name);
                              setEditFbCost(prod.cost_price);
                              setEditFbSelling(prod.selling_price);
                              setEditFbStock(prod.stock);
                              setEditFbMinAlert(prod.min_stock_alert || 2);
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                            title="Edit Produk FB"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteFbProduct(prod)}
                            className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Hapus Produk FB"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Tombol Catat Laku Terjual */}
                    <button
                      onClick={() => {
                        triggerHaptic(20);
                        setSelectedFbProductForSale(prod);
                        setSaleQty(1);
                        setDealSoldPrice(prod.selling_price);
                        setIsRecordingFbSale(true);
                      }}
                      disabled={prod.stock <= 0}
                      className={`w-full py-2.5 rounded-xl font-black text-xs flex items-center justify-center space-x-1.5 transition-colors ${
                        prod.stock <= 0
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs'
                      }`}
                      style={{ minHeight: '44px' }}
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      <span>{prod.stock <= 0 ? 'Stok Habis' : 'Catat Terjual (Deal FB)'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* RIWAYAT PENJUALAN FB TERAKHIR */}
          {fbSales.length > 0 && (
            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Riwayat Penjualan FB Terakhir ({fbSales.length})
              </h3>
              <div className="space-y-1.5">
                {fbSales.slice(0, 10).map((sale) => (
                  <div
                    key={sale.id}
                    className="p-3 bg-white rounded-2xl border border-slate-200 flex items-center justify-between text-xs shadow-2xs"
                  >
                    <div>
                      <h4 className="font-extrabold text-slate-900">{sale.product_name}</h4>
                      <p className="text-[10px] text-slate-500">
                        {sale.qty} pcs @ {formatRupiah(sale.sold_price)} • {sale.buyer_name || 'Pembeli FB'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-right">
                        <span className="font-black text-emerald-700 block">
                          +{formatRupiah(sale.total_profit)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Omset: {formatRupiah(sale.total_omset)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteFbSale(sale)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Batalkan Penjualan FB & Kembalikan Stok"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. KONTEN SUB-TAB: ANGGARAN (BUDGETING) */}
      {subTab === 'budget' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase">Batas Anggaran Bulanan</h3>
              <p className="text-[10px] text-slate-500">Kendalikan pengeluaran agar tidak boros</p>
            </div>
            <button
              onClick={() => {
                triggerHaptic(20);
                setIsAddingBudget(true);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Atur Anggaran</span>
            </button>
          </div>

          {budgets.length === 0 ? (
            <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center text-slate-400">
              <p className="text-xs font-bold">Belum ada anggaran yang disetel.</p>
              <p className="text-[10px] mt-1">
                Atur batas belanja makan, jajan anak, atau bensin di sini.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {budgets.map((b) => {
                const spent = currentExpenses
                  .filter((e) => e.category === b.category)
                  .reduce((sum, e) => sum + Number(e.amount || 0), 0);
                const percent = Math.min(100, Math.round((spent / b.monthly_limit) * 100));
                const isOver = spent > b.monthly_limit;

                return (
                  <div key={b.id} className="p-3.5 bg-white rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-900">{b.category}</span>
                      <span className={isOver ? 'text-red-600 font-black' : 'text-slate-600'}>
                        {formatRupiah(spent)} / {formatRupiah(b.monthly_limit)}
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isOver ? 'bg-red-500' : percent > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[10px]">
                      <span className={isOver ? 'text-red-600 font-bold' : 'text-slate-400'}>
                        {isOver ? 'Melebihi Anggaran!' : `Sisa ${formatRupiah(Math.max(0, b.monthly_limit - spent))}`}
                      </span>
                      <span className="font-bold text-slate-500">{percent}% Terpakai</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. KONTEN SUB-TAB: SMART GOALS (TARGET TABUNGAN DENGAN BREAKDOWN) */}
      {subTab === 'goals' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase">Target Tabungan Finansial</h3>
              <p className="text-[10px] text-slate-500">Rencana tabungan dengan breakdown harian/bulanan</p>
            </div>
            <button
              onClick={() => {
                triggerHaptic(20);
                setIsAddingGoal(true);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Target Baru</span>
            </button>
          </div>

          {goals.length === 0 ? (
            <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center text-slate-400">
              <PiggyBank className="w-8 h-8 text-amber-500 mx-auto mb-2 opacity-80" />
              <p className="text-xs font-bold">Belum ada target tabungan yang dibuat.</p>
              <p className="text-[10px] mt-1">
                Buat target seperti "Beli Motor", "Liburan", atau "Dana Darurat".
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {goals.map((goal) => {
                const targetAmt = Number(goal.target_amount || 0);
                const currentAmt = Number(goal.current_amount || 0);
                const remaining = Math.max(0, targetAmt - currentAmt);
                const percent = Math.min(100, Math.round((currentAmt / targetAmt) * 100));

                let daysLeft = 30;
                if (goal.deadline) {
                  const targetTime = new Date(goal.deadline).getTime();
                  const diff = targetTime - Date.now();
                  daysLeft = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
                }

                const dailySave = Math.ceil(remaining / daysLeft);
                const weeklySave = Math.ceil(remaining / Math.max(1, daysLeft / 7));
                const monthlySave = Math.ceil(remaining / Math.max(1, daysLeft / 30));

                return (
                  <div
                    key={goal.id}
                    className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-black text-slate-900">{goal.title || goal.name}</h4>
                        <span className="text-[10px] text-slate-500 font-semibold">
                          Target: {formatTanggal(goal.deadline || '')} ({daysLeft} hari lagi)
                        </span>
                      </div>
                      <span className="text-xs font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                        {percent}%
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="font-extrabold text-emerald-700">
                        {formatRupiah(currentAmt)}
                      </span>
                      <span className="font-extrabold text-slate-400">
                        {formatRupiah(targetAmt)}
                      </span>
                    </div>

                    {remaining > 0 && (
                      <div className="p-2.5 bg-amber-50/70 rounded-xl border border-amber-200/60 text-[11px] space-y-1">
                        <span className="font-extrabold text-amber-950 block">
                          Saran Tabungan yang Perlu Disisihkan:
                        </span>
                        <div className="grid grid-cols-3 gap-1 pt-0.5 text-center">
                          <div className="p-1.5 bg-white rounded-lg border border-amber-200/50">
                            <span className="text-[9px] text-slate-500 block">Per Hari</span>
                            <span className="font-black text-slate-900">
                              {formatRupiah(dailySave)}
                            </span>
                          </div>
                          <div className="p-1.5 bg-white rounded-lg border border-amber-200/50">
                            <span className="text-[9px] text-slate-500 block">Per Minggu</span>
                            <span className="font-black text-slate-900">
                              {formatRupiah(weeklySave)}
                            </span>
                          </div>
                          <div className="p-1.5 bg-white rounded-lg border border-amber-200/50">
                            <span className="text-[9px] text-slate-500 block">Per Bulan</span>
                            <span className="font-black text-slate-900">
                              {formatRupiah(monthlySave)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        triggerHaptic(20);
                        setSelectedGoalForDeposit(goal);
                        setDepositAmount(0);
                      }}
                      className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center justify-center space-x-1.5 transition-colors"
                      style={{ minHeight: '44px' }}
                    >
                      <Coins className="w-4 h-4 text-slate-950" />
                      <span>+ Setor Tabungan</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 6. KONTEN SUB-TAB: INVESTASI & ASISTEN AI FINANSIAL */}
      {subTab === 'invest' && (
        <div className="space-y-3">
          {/* LIVE MARKET BAR */}
          <div className="p-3.5 bg-slate-900 text-white rounded-2xl flex items-center justify-between shadow-xs">
            <div className="flex items-center space-x-2">
              <LineChartIcon className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">
                  Harga Pasar Terkini:
                </span>
                <span className="text-xs font-black text-amber-300">
                  BTC: Rp {Math.round(btcLivePrice).toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                triggerHaptic(15);
                fetchBtcPrice();
              }}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
              title="Perbarui Harga"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLivePrice ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* TANYA AI INVESTASI (MENGGANTIKAN PANDUAN STATIC SESUAI REQUEST) */}
          <div className="p-4 bg-linear-to-br from-amber-50 to-orange-50 rounded-3xl border border-amber-200/80 space-y-3 shadow-xs">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase text-slate-900">
                  Tanya Asisten AI Investasi
                </h4>
                <p className="text-[10px] text-slate-600 font-semibold">
                  Konsultasi cara investasi santai, DCA, & tips aman keluarga
                </p>
              </div>
            </div>

            {/* Quick Question Pills */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 block">
                Pertanyaan Populer:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_AI_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleAskInvestAi(q)}
                    className="text-[11px] font-bold py-1 px-2.5 rounded-xl bg-white text-slate-800 border border-amber-200/80 hover:bg-amber-100/60 active:scale-95 transition-all text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input Pertanyaan */}
            <div className="flex items-center space-x-1.5 pt-1">
              <input
                type="text"
                placeholder="Ketik pertanyaan investasi Anda..."
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAskInvestAi();
                  }
                }}
                className="flex-1 p-2.5 rounded-xl border border-amber-300 font-bold text-xs bg-white focus:outline-none focus:border-amber-600 text-slate-900"
              />
              <button
                type="button"
                onClick={() => handleAskInvestAi()}
                disabled={isAiLoading || !aiQuestion.trim()}
                className="p-2.5 rounded-xl bg-amber-500 text-slate-950 font-black hover:bg-amber-600 disabled:opacity-50 transition-colors"
                title="Kirim Pertanyaan"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {/* Respon AI */}
            {isAiLoading && (
              <div className="p-3 bg-white/80 rounded-2xl border border-amber-200 flex items-center space-x-2 text-xs text-amber-900 font-bold animate-pulse">
                <Bot className="w-4 h-4 animate-spin" />
                <span>Asisten AI sedang menyusun saran terbaik...</span>
              </div>
            )}

            {aiAnswer && !isAiLoading && (
              <div className="p-3.5 bg-white rounded-2xl border border-amber-200 text-xs text-slate-800 space-y-2 shadow-2xs animate-in fade-in">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <span className="font-extrabold text-amber-900 flex items-center space-x-1">
                    <Bot className="w-3.5 h-3.5 text-amber-600" />
                    <span>Jawaban Asisten AI:</span>
                  </span>
                  <button
                    onClick={() => setAiAnswer(null)}
                    className="text-slate-400 hover:text-slate-700 text-[10px] font-bold"
                  >
                    Tutup
                  </button>
                </div>
                <div className="whitespace-pre-line leading-relaxed text-[11px] font-medium text-slate-700">
                  {aiAnswer}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <h3 className="text-xs font-black text-slate-800 uppercase">Portofolio Aset Saya</h3>
            <button
              onClick={() => {
                triggerHaptic(20);
                setIsAddingInvestment(true);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Catat Aset</span>
            </button>
          </div>

          {investments.length === 0 ? (
            <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center text-slate-400">
              <p className="text-xs font-bold">Belum ada portofolio investasi tercatat.</p>
              <p className="text-[10px] mt-1">
                Catat kepemilikan Tabungan, Emas, BTC, Deposito, atau Reksadana di sini.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {investments.map((inv) => {
                const totalInvested = inv.total_units * inv.buy_price;
                const currentValue = inv.total_units * (inv.current_price || inv.buy_price);
                const profitLoss = currentValue - totalInvested;
                const profitLossPercent =
                  totalInvested > 0 ? Math.round((profitLoss / totalInvested) * 100) : 0;
                const isProfit = profitLoss >= 0;

                return (
                  <div
                    key={inv.id}
                    className="p-3.5 bg-white rounded-2xl border border-slate-200 flex items-center justify-between shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <h4 className="text-xs font-black text-slate-900">{inv.asset_name}</h4>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                          {inv.category}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {inv.total_units} unit • Modal: {formatRupiah(totalInvested)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-black text-slate-900">
                        {formatRupiah(currentValue)}
                      </p>
                      <span
                        className={`text-[10px] font-bold ${
                          isProfit ? 'text-emerald-700' : 'text-red-600'
                        }`}
                      >
                        {isProfit ? '+' : ''}
                        {formatRupiah(profitLoss)} ({isProfit ? '+' : ''}
                        {profitLossPercent}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: CATAT TRANSAKSI (PEMASUKAN / PENGELUARAN) */}
      {isAddingTransaction && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-sm w-full p-5 max-h-[92vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-black text-slate-900 text-base">
                {txType === 'expense' ? 'Catat Pengeluaran Uang' : 'Catat Pemasukan Uang'}
              </h3>
              <button
                onClick={() => setIsAddingTransaction(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="overflow-y-auto py-3 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nominal (Rp)</label>
                <input
                  type="number"
                  required
                  autoFocus
                  placeholder="0"
                  value={txAmount || ''}
                  onChange={(e) => setTxAmount(Number(e.target.value))}
                  className="w-full text-xl font-black p-3 rounded-xl border border-slate-300 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Pilih Dompet / Sumber Dana</label>
                <select
                  value={txWalletId}
                  onChange={(e) => setTxWalletId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white"
                >
                  {visibleWallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} (Saldo: {formatRupiah(w.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Kategori</label>
                <select
                  value={txCategory}
                  onChange={(e) => setTxCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Asal Transaksi / Bisnis</label>
                <select
                  value={txSource}
                  onChange={(e) => setTxSource(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white"
                >
                  <option value="pribadi">Konsumsi Pribadi / Rumah Tangga</option>
                  <option value="fb_marketplace">Jualan FB Marketplace / Online</option>
                  <option value="warung">Operasional Warung Toko</option>
                  <option value="bisnis_lain">Bisnis Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Keterangan (Opsional)</label>
                <input
                  type="text"
                  placeholder="Contoh: Beli pulsa listrik, jajan cilok..."
                  value={txDesc}
                  onChange={(e) => setTxDesc(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white"
                />
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm"
                  style={{ minHeight: '48px' }}
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: PINDAH SALDO ANTAR DOMPET */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-sm w-full p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-black text-slate-900 text-sm">Pindah Saldo Antar Dompet</h3>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="p-1 rounded-lg text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTransferWallet} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Dari Dompet Asal:</label>
                <select
                  value={transferFromId}
                  onChange={(e) => setTransferFromId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white"
                >
                  {visibleWallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({formatRupiah(w.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ke Dompet Tujuan:</label>
                <select
                  value={transferToId}
                  onChange={(e) => setTransferToId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white"
                >
                  {visibleWallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({formatRupiah(w.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nominal Pindah (Rp):</label>
                <input
                  type="number"
                  required
                  value={transferAmount || ''}
                  onChange={(e) => setTransferAmount(Number(e.target.value))}
                  placeholder="0"
                  className="w-full text-lg font-black p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-amber-500 font-black text-slate-950 text-xs"
                style={{ minHeight: '44px' }}
              >
                Kirim Saldo
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: TAMBAH DOMPET BARU */}
      {isAddingWallet && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-sm w-full p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-black text-slate-900 text-sm">Tambah Dompet / Rekening</h3>
              <button
                onClick={() => setIsAddingWallet(false)}
                className="p-1 rounded-lg text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWallet} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Dompet / Rekening</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Tabungan BRI, Dompet Dapur..."
                  value={newWalletName}
                  onChange={(e) => setNewWalletName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Jenis Akun</label>
                <select
                  value={newWalletType}
                  onChange={(e) => setNewWalletType(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white"
                >
                  <option value="cash_pribadi">Uang Tunai Pribadi</option>
                  <option value="bank">Rekening Bank (BCA, BRI, Mandiri, dll)</option>
                  <option value="ewallet">E-Wallet (Dana, OVO, Gopay, ShopeePay)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Saldo Awal (Rp)</label>
                <input
                  type="number"
                  value={newWalletBalance || ''}
                  onChange={(e) => setNewWalletBalance(Number(e.target.value))}
                  placeholder="0"
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-amber-500 font-black text-slate-950 text-xs"
                style={{ minHeight: '44px' }}
              >
                Simpan Dompet
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT DOMPET (DENGAN OPSI PILIH CATAT KE HISTORY) */}
      {editingWallet && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-sm w-full p-5 space-y-3.5 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <h3 className="font-black text-slate-900 text-sm">Ubah Dompet</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingWallet(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditWallet} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Dompet / Rekening</label>
                <input
                  type="text"
                  required
                  value={editWalletName}
                  onChange={(e) => setEditWalletName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Jenis Akun</label>
                <select
                  value={editWalletType}
                  onChange={(e) => setEditWalletType(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white text-slate-900"
                >
                  <option value="cash_pribadi">Uang Tunai Pribadi</option>
                  <option value="bank">Rekening Bank (BCA, BRI, Mandiri, dll)</option>
                  <option value="ewallet">E-Wallet (Dana, OVO, Gopay, ShopeePay)</option>
                  <option value="cash_warung">Laci Toko Bersama</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Saldo Dompet (Rp)</label>
                <input
                  type="number"
                  value={editWalletBalance}
                  onChange={(e) => setEditWalletBalance(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-extrabold text-sm bg-white text-slate-900"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Saldo tercatat sebelumnya: {formatRupiah(editingWallet.balance)}
                </span>
              </div>

              {/* OPSI PILIH MASUKKAN KE HISTORY ATAU TIDAK */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <label className="flex items-start space-x-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editWalletRecordHistory}
                    onChange={(e) => setEditWalletRecordHistory(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-white border-slate-300 mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block text-xs">
                      Catat selisih saldo ke riwayat keuangan (History)?
                    </span>
                    <span className="text-[10px] text-slate-500 block leading-tight">
                      Jika dicentang, selisih perubahan saldo akan otomatis dicatat sebagai transaksi penyesuaian di menu Keuangan.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex space-x-2 pt-1">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 font-black text-slate-950 text-xs shadow-xs"
                  style={{ minHeight: '44px' }}
                >
                  Simpan Perubahan
                </button>
                <button
                  type="button"
                  onClick={() => setEditingWallet(null)}
                  className="px-3 py-3 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs"
                  style={{ minHeight: '44px' }}
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: TAMBAH BARANG FB MARKETPLACE */}
      {isAddingFbProduct && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-sm w-full p-5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-black text-slate-900 text-sm">Tambah Barang FB Marketplace</h3>
              <button
                onClick={() => setIsAddingFbProduct(false)}
                className="p-1 rounded-lg text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFbProduct} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Barang Dagangan</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Helm Bogo Retro, Gamis Kaftan, Jam Casio..."
                  value={newFbName}
                  onChange={(e) => setNewFbName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Modal Beli / HPP (Rp)</label>
                  <input
                    type="number"
                    required
                    placeholder="Modal per unit"
                    value={newFbCostPrice || ''}
                    onChange={(e) => setNewFbCostPrice(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Harga Jual Patokan (Rp)</label>
                  <input
                    type="number"
                    required
                    placeholder="Harga pasang di FB"
                    value={newFbSellingPrice || ''}
                    onChange={(e) => setNewFbSellingPrice(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jumlah Stok Awal</label>
                  <input
                    type="number"
                    required
                    value={newFbStock || ''}
                    onChange={(e) => setNewFbStock(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Peringatan Stok Kurang Dari</label>
                  <input
                    type="number"
                    required
                    value={newFbMinAlert || ''}
                    onChange={(e) => setNewFbMinAlert(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-amber-500 font-black text-slate-950 text-xs shadow-xs"
                style={{ minHeight: '44px' }}
              >
                Simpan ke FB Marketplace
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: CATAT TERJUAL FB MARKETPLACE */}
      {isRecordingFbSale && selectedFbProductForSale && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-sm w-full p-5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-black text-slate-900 text-sm">
                Catat Terjual: {selectedFbProductForSale.name}
              </h3>
              <button
                onClick={() => {
                  setIsRecordingFbSale(false);
                  setSelectedFbProductForSale(null);
                }}
                className="p-1 rounded-lg text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordFbSale} className="space-y-3 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 space-y-1">
                <div className="flex justify-between">
                  <span>Sisa Stok:</span>
                  <span className="font-black text-slate-900">
                    {selectedFbProductForSale.stock} pcs
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Modal Beli per Unit:</span>
                  <span className="font-black text-slate-900">
                    {formatRupiah(selectedFbProductForSale.cost_price)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jumlah Terjual (pcs)</label>
                  <input
                    type="number"
                    min="1"
                    max={selectedFbProductForSale.stock}
                    required
                    value={saleQty || ''}
                    onChange={(e) => setSaleQty(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Harga Deal / pcs (Rp)</label>
                  <input
                    type="number"
                    required
                    value={dealSoldPrice || ''}
                    onChange={(e) => setDealSoldPrice(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Pembeli (Opsional)</label>
                <input
                  type="text"
                  placeholder="Contoh: Mas Budi COD pom bensin"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Masuk ke Dompet Mana?</label>
                <select
                  value={saleDestWalletId}
                  onChange={(e) => setSaleDestWalletId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white"
                >
                  {visibleWallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} (Saldo: {formatRupiah(w.balance)})
                    </option>
                  ))}
                </select>
              </div>

              {/* ESTIMASI TOTAL & PROFIT */}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between items-center text-xs">
                <div>
                  <span className="text-[10px] text-emerald-800 font-bold block">Total Omset:</span>
                  <span className="font-black text-slate-900">
                    {formatRupiah(saleQty * dealSoldPrice)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-emerald-800 font-bold block">Untung Bersih:</span>
                  <span className="font-black text-emerald-700">
                    +{formatRupiah(saleQty * (dealSoldPrice - selectedFbProductForSale.cost_price))}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-amber-500 font-black text-slate-950 text-xs shadow-xs"
                style={{ minHeight: '44px' }}
              >
                Konfirmasi Penjualan FB
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: ATUR ANGGARAN (BUDGET) */}
      {isAddingBudget && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-sm w-full p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-black text-slate-900 text-sm">Atur Batas Anggaran Bulanan</h3>
              <button
                onClick={() => setIsAddingBudget(false)}
                className="p-1 rounded-lg text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Pilih Kategori</label>
                <select
                  value={newBudgetCategory}
                  onChange={(e) => setNewBudgetCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Batas Maksimal Pengeluaran per Bulan (Rp)
                </label>
                <input
                  type="number"
                  required
                  placeholder="Contoh: 1500000"
                  value={newBudgetLimit || ''}
                  onChange={(e) => setNewBudgetLimit(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white text-base"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-amber-500 font-black text-slate-950 text-xs"
                style={{ minHeight: '44px' }}
              >
                Simpan Batas Anggaran
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 7: TARGET TABUNGAN BARU (SMART GOAL) */}
      {isAddingGoal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-sm w-full p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-black text-slate-900 text-sm">Target Finansial Baru</h3>
              <button onClick={() => setIsAddingGoal(false)} className="p-1 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Target</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Beli Kulkas Baru, Dana Darurat..."
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Nominal (Rp)</label>
                <input
                  type="number"
                  required
                  placeholder="Contoh: 3000000"
                  value={newGoalTarget || ''}
                  onChange={(e) => setNewGoalTarget(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white text-base"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Tanggal Tercapai</label>
                <input
                  type="date"
                  required
                  value={newGoalDeadline}
                  onChange={(e) => setNewGoalDeadline(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-amber-500 font-black text-slate-950 text-xs"
                style={{ minHeight: '44px' }}
              >
                Buat Target
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 8: SETOR TABUNGAN KE GOAL */}
      {selectedGoalForDeposit && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-sm w-full p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-black text-slate-900 text-sm">
                Setor Nabung: {selectedGoalForDeposit.title || selectedGoalForDeposit.name}
              </h3>
              <button
                onClick={() => setSelectedGoalForDeposit(null)}
                className="p-1 rounded-lg text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDepositToGoal} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Ambil dari Dompet:</label>
                <select
                  value={depositWalletId}
                  onChange={(e) => setDepositWalletId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white"
                >
                  {visibleWallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({formatRupiah(w.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nominal Setoran (Rp):</label>
                <input
                  type="number"
                  required
                  autoFocus
                  placeholder="0"
                  value={depositAmount || ''}
                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                  className="w-full text-lg font-black p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-amber-500 font-black text-slate-950 text-xs"
                style={{ minHeight: '44px' }}
              >
                Konfirmasi Setor
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 9: CATAT ASET INVESTASI */}
      {isAddingInvestment && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-sm w-full p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-black text-slate-900 text-sm">Catat Aset Investasi</h3>
              <button
                onClick={() => setIsAddingInvestment(false)}
                className="p-1 rounded-lg text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInvestment} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Jenis Aset</label>
                <select
                  value={newAssetCategory}
                  onChange={(e) => setNewAssetCategory(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white"
                >
                  <option value="emas">Emas Logam Mulia (Gram)</option>
                  <option value="btc">Bitcoin (BTC)</option>
                  <option value="tabungan">Tabungan / Kas Bank</option>
                  <option value="deposito">Deposito Bank</option>
                  <option value="reksadana">Reksadana</option>
                  <option value="obligasi">Obligasi / SBN</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Aset</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Logam Mulia Antam, Bitcoin, Sucor Reksadana..."
                  value={newAssetName}
                  onChange={(e) => setNewAssetName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jumlah Unit / Gram</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="Contoh: 5 atau 0.005"
                    value={newAssetUnits || ''}
                    onChange={(e) => setNewAssetUnits(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Harga Beli per Unit (Rp)</label>
                  <input
                    type="number"
                    required
                    placeholder="Modal per unit"
                    value={newAssetBuyPrice || ''}
                    onChange={(e) => setNewAssetBuyPrice(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-amber-500 font-black text-slate-950 text-xs"
                style={{ minHeight: '44px' }}
              >
                Simpan Aset
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT CATATAN KEUANGAN PRIBADI */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <h3 className="font-black text-slate-900 text-sm">Edit Catatan Keuangan</h3>
                <p className="text-[10px] text-slate-500">
                  {editingExpense.type === 'expense' ? 'Pengeluaran' : 'Pemasukan'} • {formatTanggal(editingExpense.created_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingExpense(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditExpense} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nominal (Rp)</label>
                <input
                  type="number"
                  required
                  value={editExpAmount || ''}
                  onChange={(e) => setEditExpAmount(Number(e.target.value))}
                  className="w-full text-lg font-black p-2.5 rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Dompet / Rekening</label>
                <select
                  value={editExpWalletId}
                  onChange={(e) => setEditExpWalletId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white"
                >
                  {visibleWallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} (Saldo: {formatRupiah(w.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Kategori</label>
                <select
                  value={editExpCategory}
                  onChange={(e) => setEditExpCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Keterangan</label>
                <input
                  type="text"
                  placeholder="Keterangan transaksi..."
                  value={editExpDesc}
                  onChange={(e) => setEditExpDesc(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs"
                >
                  Simpan Perubahan
                </button>
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT PRODUK FB MARKETPLACE */}
      {editingFbProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-black text-slate-900 text-sm">Edit Barang FB Marketplace</h3>
              <button
                type="button"
                onClick={() => setEditingFbProduct(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditFbProduct} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Barang</label>
                <input
                  type="text"
                  required
                  value={editFbName}
                  onChange={(e) => setEditFbName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Modal Beli (Rp)</label>
                  <input
                    type="number"
                    required
                    value={editFbCost || ''}
                    onChange={(e) => setEditFbCost(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Harga Jual (Rp)</label>
                  <input
                    type="number"
                    required
                    value={editFbSelling || ''}
                    onChange={(e) => setEditFbSelling(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sisa Stok (Pcs)</label>
                  <input
                    type="number"
                    required
                    value={editFbStock}
                    onChange={(e) => setEditFbStock(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Peringatan Min. Stok</label>
                  <input
                    type="number"
                    value={editFbMinAlert}
                    onChange={(e) => setEditFbMinAlert(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white"
                  />
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs"
                >
                  Simpan Produk FB
                </button>
                <button
                  type="button"
                  onClick={() => setEditingFbProduct(null)}
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
