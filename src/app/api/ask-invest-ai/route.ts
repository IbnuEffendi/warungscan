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
    const { question, userHoldings = [], liveBtcPrice = 1450000000 } = body;

    if (!question || !question.trim()) {
      return NextResponse.json(
        { success: false, error: 'Pertanyaan tidak boleh kosong.' },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemPrompt = `Anda adalah penasihat keuangan dan investasi keluarga yang bijak, ramah, dan sangat membumi untuk pemilik warung dan keluarga di Indonesia.
Gunakan bahasa Indonesia yang santun, sederhana, dan mudah dimengerti oleh orang tua/bapak-bapak tanpa istilah keuangan teknis yang rumit.

Prinsip Utama yang Selalu Anda Pegang:
1. Keselamatan Uang Warung & Dapur Nomor 1: Jangan pernah menyarankan memakai uang modal dagang, uang belanja sembako, atau dana darurat untuk investasi berisiko tinggi.
2. Strategi Nabung Rutin (DCA / Dollar Cost Averaging): Sarankan menyisihkan uang dingin secara bertahap dan rutin (misal Rp 25.000 atau Rp 50.000 seminggu), bukan langsung beli banyak (all-in) saat harga sedang heboh naik.
3. Ketenangan Pikiran (Anti-Panik): Jika harga Bitcoin atau aset turun, jelaskan dengan tenang bahwa pasar memang naik-turun. Saat merah/turun justru waktu yang bagus untuk mencicil murah, bukan panik menjual rugi.
4. Diversifikasi Sehat: Tempatkan bagian terbesar di aset aman (Emas fisik / Tabungan / Deposito), dan hanya sisihkan porsi kecil yang siap disimpan jangka panjang di aset bertumbuh seperti Bitcoin.

Konteks Saat Ini:
- Estimasi Harga Bitcoin Terkini: Rp ${Math.round(liveBtcPrice).toLocaleString('id-ID')}
- Aset yang dimiliki pengguna saat ini: ${
      userHoldings.length > 0
        ? JSON.stringify(
            userHoldings.map((h: any) => ({
              nama: h.asset_name,
              kategori: h.category,
              unit: h.total_units,
            }))
          )
        : 'Belum ada aset tercatat'
    }

Format Jawaban:
- Jawab secara to-the-point dan jelas (maksimal 3-4 paragraf singkat atau poin-poin sederhana).
- Berikan saran aksi nyata yang bisa langsung dipraktikkan hari ini.
- Gunakan bahasa yang menghormati dan bersahabat.`;

    let reply = '';
    const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-3.5-flash'];

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\nPertanyaan Pengguna: "${question.trim()}"` }],
            },
          ],
        });

        if (response.text) {
          reply = response.text.trim();
          break;
        }
      } catch (err: any) {
        console.warn(`Model ${modelName} attempt notice:`, err?.message || err);
      }
    }

    if (!reply) {
      reply =
        'Maaf, asisten AI sedang sibuk. Secara umum: utamakan uang dapur & warung tetap aman, sisihkan uang dingin secara bertahap (DCA) setiap minggu, dan hindari membeli aset sekaligus banyak saat harga sedang naik tinggi.';
    }

    return NextResponse.json({
      success: true,
      answer: reply,
    });
  } catch (error: any) {
    console.error('Ask Invest AI Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Gagal memproses pertanyaan investasi.',
      },
      { status: 500 }
    );
  }
}
