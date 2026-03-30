const wanApiKey = process.env.WAN_API_KEY;

const url = 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis';

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-DashScope-Async': 'enable',
    'Authorization': `Bearer ${process.env.WAN_API_KEY}`,
  },
  body: JSON.stringify({
    model: "wan2.6-i2v-flash",
    input: { 
      img_url: "https://dashscope.oss-cn-beijing.aliyuncs.com/images/dog_and_girl.jpeg",
      prompt: "A dog and a girl running in a vibrant field"
    },
    parameters: {
      "size": "1280*720"
    }
  }),
})
.then(r => r.text().then(t => console.log('REST status:', r.status, 'Response:', t)))
.catch(console.error);
