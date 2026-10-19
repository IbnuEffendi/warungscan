'use client';

import React, { useState } from 'react';
import { Package, ClipboardList } from 'lucide-react';
import ProductsView from '@/components/ProductsView';
import ShoppingPlanView from '@/components/ShoppingPlanView';
import { Product } from '@/types';
import { triggerHaptic } from '@/lib/utils';

interface InventoryViewProps {
  products: Product[];
  onProductsUpdate: () => void;
  isDbConnected: boolean;
  onOpenSelfConsumption: () => void;
  onGoToRestock: () => void;
}

export default function InventoryView({
  products,
  onProductsUpdate,
  isDbConnected,
  onOpenSelfConsumption,
  onGoToRestock,
}: InventoryViewProps) {
  const [subTab, setSubTab] = useState<'products' | 'shopping'>('products');

  return (
    <div className="flex flex-col flex-1">
      {/* SWITCHER SUB-TAB: KATALOG BARANG vs RENCANA BELANJA */}
      <div className="p-2.5 bg-white border-b border-slate-200 sticky top-14 z-20 shadow-xs">
        <div className="grid grid-cols-2 p-1 bg-slate-200 rounded-2xl">
          <button
            onClick={() => {
              triggerHaptic(20);
              setSubTab('products');
            }}
            className={`py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center space-x-1.5 transition-all ${
              subTab === 'products'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Katalog & Stok ({products.length})</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic(20);
              setSubTab('shopping');
            }}
            className={`py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center space-x-1.5 transition-all ${
              subTab === 'shopping'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Rencana Belanja</span>
          </button>
        </div>
      </div>

      {/* KONTEN SUB-TAB */}
      <div className="flex-1 flex flex-col">
        {subTab === 'products' ? (
          <ProductsView
            products={products}
            onProductsUpdate={onProductsUpdate}
            isDbConnected={isDbConnected}
            onOpenSelfConsumption={onOpenSelfConsumption}
          />
        ) : (
          <ShoppingPlanView
            products={products}
            onGoToRestock={onGoToRestock}
          />
        )}
      </div>
    </div>
  );
}
