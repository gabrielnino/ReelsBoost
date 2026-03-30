const wanApiKey = process.env.WAN_API_KEY;

const fs = require('fs');

async function testBase64() {
  const url = 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis';
  
  // download the image to memory
  const imgRes = await fetch("https://dashscope.oss-cn-beijing.aliyuncs.com/images/dog_and_girl.jpeg");
  const buffer = await imgRes.arrayBuffer();
  const base64Str = `data:image/jpeg;base64,${Buffer.from(buffer).toString('base64')}`;
  
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-DashScope-Async': 'enable',
      'Authorization': `Bearer ${process.env.WAN_API_KEY}`,
    },
    body: JSON.stringify({
      model: "wan2.6-i2v-flash",
      input: {
        img_url: base64Str,
        prompt: "A dog and a girl running in a vibrant field"
      },
      parameters: {
        "size": "1280*720"
      }
    }),
  });
  
  const t = await r.text();
  console.log('REST status:', r.status, 'Response:', t);
}

testBase64().catch(console.error);
