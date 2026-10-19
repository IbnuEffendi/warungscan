import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || '';

export async function POST(req: NextRequest) {
  try {
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEY belum dikonfigurasi di server.' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { image, mimeType = 'image/jpeg' } = body;

    if (!image) {
      return NextResponse.json(
        { success: false, error: 'Data gambar tidak ditemukan.' },
        { status: 400 }
      );
    }

    const base64Data = image.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
    const ai = new GoogleGenAI({ apiKey });

    const promptText = `Anda adalah asisten cerdas kasir & inventaris warung Indonesia (WarungScan).
Tugas Anda membaca foto struk belanja kulakan/grosir/toko sembako dengan sangat teliti, terutama memperhatikan KEMASAN GROSIR vs PENJUALAN ECERAN.

Perhatian khusus untuk kemasan Dus/Kotak/Renceng:
- Jika di struk tertulis format isi kemasan seperti: "Chocolatos 16gx24's/ktk", "Indomie x40", "Kopi 10x20g", "Teh 25s", "Wafer 1 dus isi 12", "1 renceng (10 sachet)", maka:
  1. Bersihkan nama barang dari kode pengali (contoh: "Chocolatos Cheese 16g").
  2. "pack_qty": jumlah kemasan/dus/kotak yang dibeli di struk (contoh: 1 atau 2).
  3. "isi_per_kemasan": jumlah isi biji/sachet di dalam 1 kemasan (contoh: 24 untuk 24's, 40 untuk dus mie, 10 untuk renceng, 12 untuk lusin). Jika barang satuan biasa (misal minyak 1L, beras 5kg), isi_per_kemasan = 1.
  4. "qty": total biji eceran yang akan dijual di warung = pack_qty * isi_per_kemasan (contoh: 1 kotak x 24 = 24 biji).
  5. "total_harga": total harga yang dibayar di struk untuk baris ini dalam Rupiah.
  6. "harga_satuan": harga modal per 1 biji eceran = total_harga / qty.

Format JSON yang dihasilkan WAJIB array of object persis seperti ini:
[
  {
    "nama_barang": "Chocolatos Cheese 16g",
    "pack_qty": 1,
    "isi_per_kemasan": 24,
    "tipe_kemasan": "Kotak",
    "qty": 24,
    "harga_satuan": 1000,
    "total_harga": 24000
  }
]

Aturan tambahan:
- Jika pada struk tidak tertera isi kemasannya (hanya tertulis nama barang dan total harga), jadikan isi_per_kemasan = 1.
- Balas HANYA dengan JSON array murni tanpa markdown triple backticks.`;

    const modelCandidates = ['gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-flash-latest'];
    let lastError: any = null;
    let extractedText = '';

    for (const modelName of modelCandidates) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: 'user',
              parts: [
                { text: promptText },
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: base64Data,
                  },
                },
              ],
            },
          ],
          config: {
            responseMimeType: 'application/json',
          },
        });

        if (response && response.text) {
          extractedText = response.text.trim();
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${modelName} gagal dipanggil, mencoba fallback berikutnya...`, err.message);
      }
    }

    if (!extractedText && lastError) {
      throw lastError;
    }

    let cleanedText = extractedText;
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsedItems = JSON.parse(cleanedText);

    if (!Array.isArray(parsedItems)) {
      return NextResponse.json({
        success: true,
        items: [],
        message: 'Tidak ada item yang dapat diekstrak.',
      });
    }

    const formattedItems = parsedItems.map((item: any) => {
      const packQty = Math.max(1, parseInt(item.pack_qty, 10) || 1);
      const isiPerKemasan = Math.max(1, parseInt(item.isi_per_kemasan, 10) || 1);
      const totalUnits = Math.max(1, parseInt(item.qty, 10) || packQty * isiPerKemasan);
      const totalHarga = Math.max(0, parseFloat(item.total_harga) || 0);

      let unitCost = parseFloat(item.harga_satuan) || 0;
      if (unitCost === 0 && totalHarga > 0) {
        unitCost = Math.round(totalHarga / totalUnits);
      }

      // Estimasi default harga jual eceran (+15-20% margin, dibulatkan ke kelipatan 500)
      const rawSelling = Math.round(unitCost * 1.2);
      const suggestedSelling = Math.max(500, Math.ceil(rawSelling / 500) * 500);

      return {
        nama_barang: String(item.nama_barang || 'Barang Tanpa Nama').trim(),
        pack_qty: packQty,
        isi_per_kemasan: isiPerKemasan,
        tipe_kemasan: String(item.tipe_kemasan || (isiPerKemasan > 1 ? 'Kotak' : 'Satuan')),
        qty: totalUnits,
        harga_satuan: unitCost,
        total_harga: totalHarga || unitCost * totalUnits,
        new_selling_price: suggestedSelling,
      };
    });

    return NextResponse.json({
      success: true,
      items: formattedItems,
    });
  } catch (error: any) {
    console.error('Error saat memproses foto struk:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Gagal mengekstrak struk belanja.',
      },
      { status: 500 }
    );
  }
}
