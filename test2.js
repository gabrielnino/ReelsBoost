const url = 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis';
const wanApiKey = process.env.WAN_API_KEY;

async function testIt() {
    try {
        const prompt = "A horse and a girl running in a vibrant field";
        const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=720&height=1280&nologo=true`;
        console.log("Fetching pollinations...", fallbackUrl);
        const fallbackRes = await fetch(fallbackUrl);
        
        console.log("Pollinations status:", fallbackRes.status, fallbackRes.headers.get("Content-Type"));
        
        const arrayBuffer = await fallbackRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Str = `data:image/jpeg;base64,${buffer.toString('base64')}`;
        
        console.log("Base64 string starts with:", base64Str.substring(0, 50), "length:", base64Str.length);
        
        const r = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-DashScope-Async': 'enable',
              'Authorization': `Bearer ${wanApiKey}`,
            },
            body: JSON.stringify({
              model: "wan2.6-i2v-flash",
              input: {
                img_url: base64Str,
                prompt: prompt
              },
              parameters: {
                "size": "1280*720"
              }
            }),
        });
        
        const t = await r.text();
        console.log("Dashscope Status:", r.status);
        console.log("Dashscope Response:", t);
    } catch (e) {
        console.error(e);
    }
}

testIt();
