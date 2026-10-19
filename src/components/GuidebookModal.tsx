'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  X,
  ShoppingCart,
  Camera,
  Utensils,
  BarChart3,
  Wallet,
  Sparkles,
  ShoppingBag,
  HelpCircle,
  CheckCircle2,
  Lock,
  Download,
  Database,
  ArrowRight,
  Shield,
} from 'lucide-react';
import { triggerHaptic } from '@/lib/utils';

interface GuidebookModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type GuideTab =
  | 'kasir'
  | 'restok'
  | 'konsumsi'
  | 'laporan'
  | 'keuangan'
  | 'invest'
  | 'marketplace'
  | 'faq';

export default function GuidebookModal({ isOpen, onClose }: GuidebookModalProps) {
  const [activeTab, setActiveTab] = useState<GuideTab>('kasir');

  if (!isOpen) return null;

  const tabs: { id: GuideTab; label: string; icon: any }[] = [
    { id: 'kasir', label: 'Kasir', icon: ShoppingCart },
    { id: 'restok', label: 'Kulakan AI', icon: Camera },
    { id: 'konsumsi', label: 'Pakai Sendiri', icon: Utensils },
    { id: 'laporan', label: 'Laporan & Edit', icon: BarChart3 },
    { id: 'keuangan', label: 'Keuangan', icon: Wallet },
    { id: 'invest', label: 'Tanya AI', icon: Sparkles },
    { id: 'marketplace', label: 'FB Market', icon: ShoppingBag },
    { id: 'faq', label: 'FAQ & Bantuan', icon: HelpCircle },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        {/* Header Modal */}
        <div className="p-4 bg-emerald-800 text-white flex items-center justify-between border-b border-emerald-900/40">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-700/80 border border-emerald-500/50 flex items-center justify-center text-emerald-200">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight text-white">
                Buku Panduan & Bantuan
              </h3>
              <p className="text-[11px] text-emerald-200">
                Panduan ringkas dan cara mudah menggunakan semua fitur WarungScan
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              triggerHaptic(20);
              onClose();
            }}
            className="p-1.5 rounded-xl bg-emerald-900/60 hover:bg-emerald-900 text-emerald-200 hover:text-white transition-colors"
            title="Tutup Panduan"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Pills Bar */}
        <div className="flex overflow-x-auto p-2 bg-slate-100 border-b border-slate-200 space-x-1.5 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  triggerHaptic(15);
                  setActiveTab(tab.id);
                }}
                className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center space-x-1.5 shrink-0 transition-all ${
                  isActive
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
                style={{ minHeight: '38px' }}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-200' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-slate-800 text-xs sm:text-sm leading-relaxed">
          {/* TAB 1: KASIR */}
          {activeTab === 'kasir' && (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                <h4 className="font-black text-emerald-900 text-sm mb-1 flex items-center space-x-1.5">
                  <ShoppingCart className="w-4 h-4 text-emerald-700" />
                  <span>Cara Transaksi Kasir</span>
                </h4>
                <p className="text-emerald-800 text-xs">
                  Kasir dirancang sangat cepat untuk melayani pembeli di warung. Tombol besar dan mudah dipencet dari HP maupun tablet.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <strong className="text-slate-900 block font-black">Pilih atau Cari Barang</strong>
                    <p className="text-slate-600 text-xs mt-0.5">
                      Ketik nama barang di kolom pencarian atau klik tombol barang untuk langsung memasukkan ke keranjang belanja.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <strong className="text-slate-900 block font-black">Sesuaikan Jumlah (Qty)</strong>
                    <p className="text-slate-600 text-xs mt-0.5">
                      Klik tanda tambah (+) atau kurang (-) pada keranjang. Anda juga bisa mengetik langsung angka jumlahnya jika pembeli membeli dalam jumlah banyak.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <strong className="text-slate-900 block font-black">Pilih Cara Pembayaran</strong>
                    <p className="text-slate-600 text-xs mt-0.5">
                      Pilih <strong>Tunai</strong> (masukkan uang pembeli untuk hitung kembalian otomatis), <strong>QRIS</strong>, atau tombol <strong>Dipakai Sendiri</strong> jika barang diambil untuk kebutuhan rumah.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    4
                  </span>
                  <div>
                    <strong className="text-slate-900 block font-black">Struk Digital & Kirim WA</strong>
                    <p className="text-slate-600 text-xs mt-0.5">
                      Setelah selesai, Anda bisa membagikan rincian nota belanja langsung ke WhatsApp pembeli tanpa perlu printer kertas.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RESTOK & KULAKAN */}
          {activeTab === 'restok' && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-2xl border border-blue-200">
                <h4 className="font-black text-blue-900 text-sm mb-1 flex items-center space-x-1.5">
                  <Camera className="w-4 h-4 text-blue-700" />
                  <span>Kulakan via Foto Struk AI & Restok Manual</span>
                </h4>
                <p className="text-blue-800 text-xs">
                  Tidak perlu ketik ulang struk belanja dari pasar atau grosir. Cukup foto struknya, asisten AI Gemini akan membaca nama barang, jumlah, dan harga modalnya.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <strong className="text-slate-900 block font-black">Foto Struk Belanjaan</strong>
                    <p className="text-slate-600 text-xs mt-0.5">
                      Pastikan pencahayaan terang dan tulisan nota terbaca jelas. AI akan mengekstrak barang secara otomatis.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <strong className="text-slate-900 block font-black">Atur Isi per Dus / Karton (Multi-Pack)</strong>
                    <p className="text-slate-600 text-xs mt-0.5">
                      Bila Anda beli 1 karton (misal isi 24 pcs), tekan tombol <strong>Isi 24</strong> atau <strong>Isi 12</strong>. Sistem akan langsung membagi harga modal per biji dan menghitung stok eceran secara tepat.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <strong className="text-slate-900 block font-black">Restok Manual Tanpa Struk</strong>
                    <p className="text-slate-600 text-xs mt-0.5">
                      Beli barang eceran di warung sebelah atau agen tanpa nota? Buka tab <strong>Tambah Stok Manual</strong>, pilih barangnya, masukkan jumlah dan uang yang keluar.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PAKAI SENDIRI */}
          {activeTab === 'konsumsi' && (
            <div className="space-y-4">
              <div className="p-3 bg-orange-50 rounded-2xl border border-orange-200">
                <h4 className="font-black text-orange-900 text-sm mb-1 flex items-center space-x-1.5">
                  <Utensils className="w-4 h-4 text-orange-700" />
                  <span>Mencatat Barang yang Dipakai Sendiri</span>
                </h4>
                <p className="text-orange-800 text-xs">
                  Seringkali adik ambil snack, ibu ambil minyak goreng untuk masak, atau telur terpakai sendiri di rumah. Fitur ini menjaga agar kas warung tidak tekor dan stok barang tetap cocok.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <strong className="font-black text-slate-900 text-xs block">
                    Cara 1: Lewat Tombol Kasir Cepat
                  </strong>
                  <p className="text-slate-600 text-xs">
                    Masukkan barang ke keranjang kasir seperti biasa, lalu pada pilihan pembayaran tekan <strong>"Dipakai Sendiri"</strong>.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <strong className="font-black text-slate-900 text-xs block">
                    Cara 2: Lewat Tombol "Pakai Sendiri" di Katalog
                  </strong>
                  <p className="text-slate-600 text-xs">
                    Masuk ke menu <strong>Stok & Belanja</strong>, tekan tombol oranye <strong>"Pakai Sendiri"</strong> di bagian atas. Cari barang dengan cepat, masukkan jumlah dan catatan (misal: "dimasak ibu" atau "dimakan adik").
                  </p>
                </div>

                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs">
                  <strong>Catatan Penting:</strong> Barang yang dipakai sendiri dinilai berdasarkan <em>harga modal</em> (bukan harga jual), sehingga tidak merusak catatan laba bersih warung Anda.
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: LAPORAN & EDIT TRANSAKSI */}
          {activeTab === 'laporan' && (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                <h4 className="font-black text-emerald-900 text-sm mb-1 flex items-center space-x-1.5">
                  <BarChart3 className="w-4 h-4 text-emerald-700" />
                  <span>Laporan Usaha & Edit/Hapus Transaksi Salah</span>
                </h4>
                <p className="text-emerald-800 text-xs">
                  Pantau omset warung dan keuntungan harian, mingguan, maupun bulanan. Anda juga dapat memperbaiki transaksi jika ada kekeliruan ketik.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <strong className="font-black text-slate-900 text-xs block">
                    Filter Periode (Hari Ini / Minggu Ini / Bulan Ini)
                  </strong>
                  <p className="text-slate-600 text-xs">
                    Pilih tombol periode di bagian atas laporan untuk melihat total uang masuk, laba bersih warung, dan biaya kulakan dalam rentang waktu tersebut.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <strong className="font-black text-slate-900 text-xs block">
                    Cara Hapus / Batalkan Transaksi Kasir
                  </strong>
                  <p className="text-slate-600 text-xs">
                    Jika pembeli batal beli atau salah input, cari transaksi di daftar <em>Riwayat Penjualan Terakhir</em>, buka rinciannya, lalu tekan tombol <strong>Hapus Transaksi</strong>. Stok barang yang terjual akan <strong>otomatis dikembalikan ke katalog</strong>!
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <strong className="font-black text-slate-900 text-xs block">
                    Batalkan Catatan Dipakai Sendiri
                  </strong>
                  <p className="text-slate-600 text-xs">
                    Salah catat barang dipakai sendiri? Tekan tombol hapus di daftar <em>Barang Dipakai Sendiri</em>, stok barang akan langsung kembali bertambah ke toko.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: KEUANGAN PRIBADI & DOMPET */}
          {activeTab === 'keuangan' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200">
                <h4 className="font-black text-amber-900 text-sm mb-1 flex items-center space-x-1.5">
                  <Wallet className="w-4 h-4 text-amber-700" />
                  <span>Keuangan Pribadi Terisolasi & Dompet Multi-Akun</span>
                </h4>
                <p className="text-amber-800 text-xs">
                  Catat pengeluaran listrik, bensin, uang jajan anak, hingga belanja pasar secara privat. Data keuangan setiap anggota keluarga terisolasi dan tidak terlihat oleh pengguna lain.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <strong className="font-black text-slate-900 text-xs block">
                    Dompet & Pindah Saldo
                  </strong>
                  <p className="text-slate-600 text-xs">
                    Buat dompet terpisah (misal: Tunai Kasir Warung, Rekening BCA, Dompet Tunai Pribadi, atau ShopeePay). Anda bisa memindahkan saldo antar dompet kapan saja dengan tombol <em>Pindah Saldo</em>.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <strong className="font-black text-slate-900 text-xs block">
                    Edit & Hapus Catatan Keuangan
                  </strong>
                  <p className="text-slate-600 text-xs">
                    Salah ketik nominal pengeluaran? Tekan tombol <strong>Edit</strong> atau <strong>Hapus</strong> pada riwayat transaksi. Saldo dompet akan disesuaikan kembali secara otomatis.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <strong className="font-black text-slate-900 text-xs block">
                    Batas Anggaran Bulanan & Target Tabungan (Smart Goals)
                  </strong>
                  <p className="text-slate-600 text-xs">
                    Pasang batas belanja makan atau jajan agar tidak boros. Buat juga target tabungan (misal: "Beli Motor" atau "Renovasi"), sistem akan menghitung berapa rupiah yang harus disisihkan per hari atau per bulan.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: TANYA AI INVESTASI */}
          {activeTab === 'invest' && (
            <div className="space-y-4">
              <div className="p-3 bg-linear-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200">
                <h4 className="font-black text-amber-900 text-sm mb-1 flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Asisten AI Investasi Keluarga (Gemini)</span>
                </h4>
                <p className="text-amber-800 text-xs">
                  Konsultasikan perencanaan investasi keluarga dengan AI yang ramah, santai, dan tidak membingungkan.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <strong className="font-black text-slate-900 text-xs block">
                    Pertanyaan Populer Sekali Klik
                  </strong>
                  <p className="text-slate-600 text-xs">
                    Tersedia tombol siap tanya: <em>"Kapan waktu yang pas beli Bitcoin?", "Berapa modal awal aman buat emas?", "Bagaimana cara nabung rutin DCA dari untung warung?",</em> dan <em>"Beda Emas vs Deposito vs Kripto?".</em>
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <strong className="font-black text-slate-900 text-xs block">
                    Konsultasi Bebas Sesuai Keinginan
                  </strong>
                  <p className="text-slate-600 text-xs">
                    Ketik pertanyaan apa saja di kolom tanya (misal: <em>"Bapak saya punya uang 5 juta, bagusnya disimpan kemana?"</em>), asisten AI akan memberikan arahan yang aman dan bijak.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <strong className="font-black text-slate-900 text-xs block">
                    Portofolio Aset
                  </strong>
                  <p className="text-slate-600 text-xs">
                    Catat kepemilikan Emas Batangan, Tabungan, Deposito, Bitcoin, atau Reksadana Anda untuk memantau pertumbuhan nilai kekayaan secara berkala.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: FB MARKETPLACE */}
          {activeTab === 'marketplace' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200">
                <h4 className="font-black text-amber-900 text-sm mb-1 flex items-center space-x-1.5">
                  <ShoppingBag className="w-4 h-4 text-amber-700" />
                  <span>Jualan di FB Marketplace & Bisnis Online</span>
                </h4>
                <p className="text-amber-800 text-xs">
                  Punya usaha sampingan jualan barang di FB Marketplace, Shopee, atau COD? Fitur ini memisahkan stok dan modal bisnis online agar tidak tercampur dengan sembako warung.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <strong className="text-slate-900 block font-black">Tambah Barang Jualan FB</strong>
                    <p className="text-slate-600 text-xs mt-0.5">
                      Catat nama produk, harga modal beli, patokan harga jual, dan stok awal. Anda bisa edit atau hapus barang kapan saja.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <strong className="text-slate-900 block font-black">Catat Closing / Barang Terjual</strong>
                    <p className="text-slate-600 text-xs mt-0.5">
                      Saat ada pembeli deal (misal via COD pom bensin atau transfer), tekan tombol <strong>"Catat Terjual"</strong>, masukkan harga deal yang disepakati, nama pembeli, dan pilih dompet mana uang tersebut masuk.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <strong className="text-slate-900 block font-black">Pantau Laporan Cuan & 5 Barang Paling Laris</strong>
                    <p className="text-slate-600 text-xs mt-0.5">
                      Lihat total modal yang sedang mengendap di barang, keuntungan bersih yang sudah terkumpul, dan ranking barang mana yang paling cepat laku.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: FAQ & KEAMANAN */}
          {activeTab === 'faq' && (
            <div className="space-y-3.5">
              <div className="p-3 bg-slate-100 rounded-2xl border border-slate-300">
                <h4 className="font-black text-slate-900 text-sm mb-1 flex items-center space-x-1.5">
                  <HelpCircle className="w-4 h-4 text-slate-700" />
                  <span>Pertanyaan Sering Diajukan (FAQ)</span>
                </h4>
                <p className="text-slate-600 text-xs">
                  Jawaban untuk pertanyaan umum seputar keamanan, privasi, dan kelancaran pemakaian.
                </p>
              </div>

              <div className="space-y-2.5">
                <details className="p-3 bg-white rounded-2xl border border-slate-200 text-xs group" open>
                  <summary className="font-bold text-slate-900 cursor-pointer list-none flex justify-between items-center">
                    <span>Apakah data tetap aman jika internet sedang mati?</span>
                    <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <p className="mt-2 text-slate-600 pt-2 border-t border-slate-100">
                    Sangat aman. WarungScan dilengkapi teknologi <em>Offline-First Dual Write</em>. Semua transaksi, stok barang, dan catatan keuangan tersimpan langsung di memori HP Anda dan akan otomatis disinkronkan ke Cloud Supabase saat internet tersambung kembali.
                  </p>
                </details>

                <details className="p-3 bg-white rounded-2xl border border-slate-200 text-xs group">
                  <summary className="font-bold text-slate-900 cursor-pointer list-none flex justify-between items-center">
                    <span>Bagaimana cara mengamankan web dari orang luar saat hosting live?</span>
                    <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <p className="mt-2 text-slate-600 pt-2 border-t border-slate-100">
                    Aplikasi ini dilindungi oleh gerbang <strong>Kunci Akses Toko</strong>. Siapa pun yang membuka tautan situs web tidak akan bisa melihat apa pun tanpa memasukkan PIN Akses Toko (Default: <code className="bg-slate-100 px-1 py-0.5 rounded font-bold">1234</code>). Anda bisa mengganti PIN ini kapan saja di menu Pengaturan.
                  </p>
                </details>

                <details className="p-3 bg-white rounded-2xl border border-slate-200 text-xs group">
                  <summary className="font-bold text-slate-900 cursor-pointer list-none flex justify-between items-center">
                    <span>Bagaimana cara mengunci layar saat kasir ditinggal sebentar?</span>
                    <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <p className="mt-2 text-slate-600 pt-2 border-t border-slate-100">
                    Cukup tekan ikon <strong>Gembok (Kunci Toko)</strong> di bar atas. Layar akan langsung terkunci dan membutuhkan PIN untuk membukanya kembali.
                  </p>
                </details>

                <details className="p-3 bg-white rounded-2xl border border-slate-200 text-xs group">
                  <summary className="font-bold text-slate-900 cursor-pointer list-none flex justify-between items-center">
                    <span>Bagaimana cara mengunduh aplikasi ke layar utama HP?</span>
                    <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <p className="mt-2 text-slate-600 pt-2 border-t border-slate-100">
                    Tekan tombol putih bergambar panah unduh (Download) di bar atas sebelah kanan, lalu pilih "Install" / "Tambahkan ke Layar Utama". Aplikasi akan berjalan layar penuh seperti aplikasi Android/iPhone asli tanpa garis alamat browser.
                  </p>
                </details>

                <details className="p-3 bg-white rounded-2xl border border-slate-200 text-xs group">
                  <summary className="font-bold text-slate-900 cursor-pointer list-none flex justify-between items-center">
                    <span>Bagaimana cara mencadangkan (backup) seluruh data?</span>
                    <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <p className="mt-2 text-slate-600 pt-2 border-t border-slate-100">
                    Buka ikon Gerigi (Pengaturan) di kanan atas, lalu tekan <strong>Ekspor Data (JSON)</strong>. File cadangan akan tersimpan di HP atau komputer Anda. Anda bisa mengimpornya kembali kapan saja jika berganti HP.
                  </p>
                </details>
              </div>
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={() => {
              triggerHaptic(20);
              onClose();
            }}
            className="py-2.5 px-5 rounded-2xl bg-emerald-800 hover:bg-emerald-900 text-white font-black text-xs shadow-xs"
            style={{ minHeight: '42px' }}
          >
            Tutup Panduan
          </button>
        </div>
      </div>
    </div>
  );
}
