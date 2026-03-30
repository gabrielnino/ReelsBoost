const url = 'https://dashscope-intl.aliyuncs.com/api/v1/services/audio/tts/v1';
const wanApiKey = process.env.WAN_API_KEY;

async function testAudio() {
    try {
        console.log("Testing Google TTS API...");
        const text = "Hola, esto es una prueba real del audio.";
        const langCode = "es";
        const url = `https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl=${langCode}&q=${encodeURIComponent(text)}`;
        
        const response = await fetch(url);

        console.log("Google TTs API Status:", response.status, response.headers.get("content-type"));
        if (!response.ok) {
            const errText = await response.text();
            console.log("Error body:", errText);
        } else {
            const buffer = await response.arrayBuffer();
            console.log("Success! Audio length:", buffer.byteLength);
        }
    } catch (e) {
        console.error(e);
    }
}

testAudio();
