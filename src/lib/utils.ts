// Format angka ke format mata uang Rupiah Indonesia (contoh: Rp 15.000)
export function formatRupiah(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return 'Rp 0';
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format tanggal ke Bahasa Indonesia (contoh: 19 Okt 2026, 14:30)
export function formatTanggal(dateString?: string): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

// Getar HP ringan untuk feedback tombol kasir (jika didukung perangkat)
export function triggerHaptic(duration = 35) {
  if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
    try {
      navigator.vibrate(duration);
    } catch {
      // Abaikan jika browser tidak mengizinkan vibrasi
    }
  }
}

// Bersihkan dan normalisasi nama produk untuk perbandingan
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\b(ml|gr|gram|kg|ltr|liter|pcs|btl|botol|bks|bungkus|sachet|dus|box|isi)\b/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Hitung persentase kemiripan antara dua teks (0.0 s/d 1.0)
export function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  const s1 = normalizeText(str1);
  const s2 = normalizeText(str2);

  if (s1 === s2) return 1.0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.85;

  const words1 = new Set(s1.split(' ').filter((w) => w.length > 1));
  const words2 = new Set(s2.split(' ').filter((w) => w.length > 1));

  if (words1.size === 0 || words2.size === 0) return 0;

  let intersection = 0;
  words1.forEach((w) => {
    if (words2.has(w)) {
      intersection++;
    } else {
      // Periksa substring kemiripan
      words2.forEach((w2) => {
        if ((w.length > 3 && w2.includes(w)) || (w2.length > 3 && w.includes(w2))) {
          intersection += 0.8;
        }
      });
    }
  });

  const union = words1.size + words2.size - intersection;
  return union > 0 ? Math.min(1.0, intersection / union) : 0;
}

// Cari produk yang paling mirip beserta skor kemiripannya
export function findBestProductMatch(
  targetName: string,
  existingProducts: { id: string; name: string }[]
): { matchedId?: string; matchedName?: string; score: number } {
  let highestScore = 0;
  let bestId: string | undefined = undefined;
  let bestName: string | undefined = undefined;

  for (const prod of existingProducts) {
    const score = calculateSimilarity(targetName, prod.name);
    if (score > highestScore) {
      highestScore = score;
      bestId = prod.id;
      bestName = prod.name;
    }
  }

  return {
    matchedId: highestScore >= 0.45 ? bestId : undefined,
    matchedName: highestScore >= 0.45 ? bestName : undefined,
    score: Math.round(highestScore * 100),
  };
}

// Format daftar belanja menjadi pesan WhatsApp yang siap dikirim
export function generateWhatsAppMessage(
  title: string,
  items: { name: string; target_qty: number; current_stock: number; status?: string }[]
): string {
  const dateStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  let text = `*DAFTAR TUGAS BELANJA WARUNG*\n`;
  text += `Tanggal: ${dateStr}\n`;
  text += `------------------------------------\n\n`;
  text += `Tolong bantu belanjakan barang warung berikut ya:\n\n`;

  items.forEach((item, idx) => {
    const statusMark = item.status === 'bought' ? '✅' : item.status === 'not_found' ? '❌' : '⬜';
    text += `${statusMark} ${idx + 1}. *${item.name}*\n`;
    text += `   Jumlah Beli: *${item.target_qty}* (Sisa di toko: ${item.current_stock})\n`;
  });

  text += `\n------------------------------------\n`;
  text += `*Catatan:* Jika barang kosong atau harga naik tajam, tolong kabari dulu ya. Terima kasih! 🙏`;

  return encodeURIComponent(text);
}

// Cek apakah string merupakan format UUID valid
export function isValidUUID(str?: string): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

// Generate valid RFC4122 UUID v4
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

