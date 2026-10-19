'use client';

import React from 'react';
import { ShoppingBag, Camera, Package, TrendingUp, Wallet } from 'lucide-react';
import { triggerHaptic } from '@/lib/utils';

export type TabType = 'pos' | 'restock' | 'inventory' | 'reports' | 'finance';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  cartCount: number;
}

export default function Navbar({ activeTab, setActiveTab, cartCount }: NavbarProps) {
  const handleTabChange = (tab: TabType) => {
    triggerHaptic(25);
    setActiveTab(tab);
  };

  const navItems: {
    id: TabType;
    label: string;
    icon: React.ReactNode;
    badge?: number;
    isYellow?: boolean;
  }[] = [
    {
      id: 'pos',
      label: 'Kasir',
      icon: <ShoppingBag className="w-5 h-5" />,
      badge: cartCount > 0 ? cartCount : undefined,
    },
    {
      id: 'restock',
      label: 'Kulakan',
      icon: <Camera className="w-5 h-5" />,
    },
    {
      id: 'inventory',
      label: 'Stok & Belanja',
      icon: <Package className="w-5 h-5" />,
    },
    {
      id: 'reports',
      label: 'Laporan',
      icon: <TrendingUp className="w-5 h-5" />,
    },
    {
      id: 'finance',
      label: 'Keuangan',
      icon: <Wallet className="w-5 h-5" />,
      isYellow: true,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 max-w-md mx-auto shadow-lg">
      <div className="grid grid-cols-5 h-17">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const isYellow = item.isYellow;

          let textColor = 'text-slate-600 hover:text-slate-900 font-medium';
          let activeColor = 'text-emerald-700 font-black';
          let indicatorColor = 'bg-emerald-600';

          if (isYellow) {
            textColor = 'text-amber-800 hover:text-amber-950 font-semibold';
            activeColor = 'text-amber-800 font-black';
            indicatorColor = 'bg-amber-500';
          }

          return (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={`relative flex flex-col items-center justify-center py-2 transition-colors focus:outline-none ${
                isActive ? activeColor : textColor
              }`}
              style={{ minHeight: '52px' }}
            >
              <div className="relative">
                {item.icon}
                {item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-3 bg-red-600 text-white text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] mt-1 tracking-tight text-center leading-tight ${
                  isActive ? 'font-black' : ''
                }`}
              >
                {item.label}
              </span>
              {isActive && (
                <div
                  className={`absolute top-0 left-2 right-2 h-1 rounded-b-full ${indicatorColor}`}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
