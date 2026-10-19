import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || '';

export async function POST(req: NextRequest) {
  try {
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEY belum dikonfigurasi.' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { products = [] } = body;

    // Filter produk yang stoknya menipis (<= 5) atau sudah habis (<= 0)
    const lowStockProducts = products.filter((p: any) => p.stock <= 5);

    // Jika tidak ada stok menipis, ambil produk dengan stok terendah
    const targetProducts =
      lowStockProducts.length > 0
        ? lowStockProducts
        : [...products].sort((a: any, b: any) => a.stock - b.stock).slice(0, 8);

    if (targetProducts.length === 0) {
      return NextResponse.json({
        success: true,
        recommendations: [],
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const promptText = `Anda adalah asisten manajer inventaris warung kelontong/sembako Indonesia.
Berdasarkan data stok barang berikut, tentukan berapa jumlah (qty) yang wajar dan aman untuk dibeli kembali (kulakan) saat belanja:

Data Produk Saat Ini:
${JSON.stringify(
  targetProducts.map((p: any) => ({
    name: p.name,
    category: p.category,
    current_stock: p.stock,
    cost_price: p.cost_price,
    selling_price: p.selling_price,
  })),
  null,
  2
)}

Instruksi:
1. Berikan rekomendasi kulakan untuk setiap barang di atas.
2. Jumlah beli (recommended_qty) harus masuk akal untuk warung rumahan (contoh: minyak goreng 6-12 pcs, beras 5-10 karung, telur 10-15 kg, mie instan 20-40 bungkus).
3. Balas HANYA dengan JSON array murni tanpa markdown triple backticks.
Format JSON array:
[
  {
    "name": "Nama Produk Sesuai Data",
    "recommended_qty": 12,
    "reason": "Alasan singkat mengapa perlu beli sekian"
  }
]`;

    // Menggunakan gemini-3.1-flash-lite sesuai permintaan user (kuota tinggi 500 RPD)
    const modelCandidates = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemini-3.5-flash'];
    let extractedText = '';

    for (const modelName of modelCandidates) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: promptText,
          config: {
            responseMimeType: 'application/json',
          },
        });

        if (response && response.text) {
          extractedText = response.text.trim();
          break;
        }
      } catch (err: any) {
        console.warn(`Model ${modelName} gagal:`, err.message);
      }
    }

    if (!extractedText) {
      // Fallback lokal jika AI sedang sibuk
      const fallbackList = targetProducts.map((p: any) => ({
        name: p.name,
        recommended_qty: p.stock <= 0 ? 10 : Math.max(5, (5 - p.stock) * 3),
        reason: p.stock <= 0 ? 'Stok sudah habis' : 'Stok tersisa tinggal sedikit',
      }));

      return NextResponse.json({
        success: true,
        recommendations: fallbackList,
      });
    }

    let cleanedText = extractedText;
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(cleanedText);

    return NextResponse.json({
      success: true,
      recommendations: Array.isArray(parsed) ? parsed : [],
    });
  } catch (err: any) {
    console.error('Error rekomendasi belanja:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Gagal menghasilkan rekomendasi' },
      { status: 500 }
    );
  }
}
