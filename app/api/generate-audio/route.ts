import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { text, language } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Text for narration is required' }, { status: 400 });
    }

    // DashScope CosyVoice v1 endpoint (International)
    const dashscopeUrl = 'https://dashscope-intl.aliyuncs.com/api/v1/services/audio/tts/v1';
    const wanApiKey = process.env.WAN_API_KEY;
    
    // Google TTS dynamic Free Fallback
    const gTtsLang = language === "english" ? "en" : "es";
    const gTtsUrl = `https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl=${gTtsLang}&q=${encodeURIComponent(text)}`;

    if (!wanApiKey || wanApiKey.trim() === '') {
      console.log("No WAN_API_KEY found. Generating dynamic TTS via free fallback...");
      const gTtsRes = await fetch(gTtsUrl);
      const arrayBuffer = await gTtsRes.arrayBuffer();
      return NextResponse.json({ audioBase64: Buffer.from(arrayBuffer).toString('base64') });
    }

    const voiceId = language === "english" ? "longyuan" : "longxiaochun"; 

    const response = await fetch(dashscopeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${wanApiKey}`,
      },
      body: JSON.stringify({
        model: "cosyvoice-v1",
        input: { text: text },
        parameters: {
          voice: voiceId,
          format: "mp3",
          sample_rate: 24000
        }
      })
    });

    if (!response.ok) {
       let errText = await response.text();
       console.warn("CosyVoice API rejected request (likely not enabled for this region). Falling back to Free TTS. Reason:", errText);
       
       const gTtsRes = await fetch(gTtsUrl);
       const arrayBuffer = await gTtsRes.arrayBuffer();
       return NextResponse.json({ audioBase64: Buffer.from(arrayBuffer).toString('base64') });
    }

    // The response is binary audio data (.mp3)
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const audioBase64 = buffer.toString('base64');
    
    return NextResponse.json({ audioBase64 });

  } catch (error: any) {
    console.error("Audio generation error:", error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
