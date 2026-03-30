import { NextResponse } from 'next/server';

const MAX_POLLING_ATTEMPTS = 20;
const POLLING_INTERVAL_MS = 2500;

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const wanApiKey = process.env.WAN_API_KEY;

    // If no API key, return a mock image.
    if (!wanApiKey || wanApiKey.trim() === '') {
      console.log("No WAN_API_KEY found. Generating dynamic mock for prompt:", prompt);
      
      const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=720&height=1280`;
      
      try {
        const fallbackRes = await fetch(fallbackUrl);
        if (!fallbackRes.ok) throw new Error("mock API error");
        
        const contentType = fallbackRes.headers.get("Content-Type") || "image/jpeg";
        if (!contentType.includes("image")) throw new Error("not image");

        const arrayBuffer = await fallbackRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Str = `data:${contentType};base64,${buffer.toString('base64')}`;
        
        return NextResponse.json({
          imageUrl: base64Str
        });
      } catch (e) {
        return NextResponse.json({
          imageUrl: `https://dashscope.oss-cn-beijing.aliyuncs.com/images/dog_and_girl.jpeg`
        });
      }
    }

    // 1. Submit Image Generation Task to Alibaba DashScope (wanx-v1)
    const initResponse = await fetch('https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-DashScope-Async': 'enable',
        'Authorization': `Bearer ${wanApiKey}`,
      },
      body: JSON.stringify({
        model: "wanx-v1",
        input: {
          prompt: `Create a bold, vibrant, high-contrast image optimal for social media. Dramatic lighting, simple composition. The prompt is: ${prompt}`,
        },
        parameters: {
          size: "720*1280", // Core 9:16 vertical orientation format
          n: 1
        }
      }),
    });

    let initData = null;
    if (initResponse.ok) {
      initData = await initResponse.json();
    }

    if (!initResponse.ok || !initData?.output?.task_id) {
      const errText = !initResponse.ok ? await initResponse.text() : 'No task id';
      console.warn("Wanx image model might not be enabled on this DashScope account. Falling back to mockup. Reason:", errText);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=720&height=1280`;
      
      try {
        const fallbackRes = await fetch(fallbackUrl);
        if (!fallbackRes.ok) throw new Error(`Pollinations API error: ${fallbackRes.status}`);
        
        const contentType = fallbackRes.headers.get("Content-Type") || "image/jpeg";
        if (!contentType.includes("image")) throw new Error("Pollinations did not return an image");

        const arrayBuffer = await fallbackRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Str = `data:${contentType};base64,${buffer.toString('base64')}`;
        
        return NextResponse.json({
          imageUrl: base64Str
        });
      } catch (e) {
        console.error("Pollinations fallback failed", e);
        // Absolute worst case scenario safe fallback
        return NextResponse.json({
          imageUrl: `https://dashscope.oss-cn-beijing.aliyuncs.com/images/dog_and_girl.jpeg` // we can send this as URL since DashScope can read this specific OSS url perfectly
        });
      }
    }

    const taskId = initData.output.task_id;

    // 2. Poll DashScope to get the final image URL (since Wanx is also asynchronous)
    for (let attempts = 0; attempts < MAX_POLLING_ATTEMPTS; attempts++) {
      await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL_MS));

      const statusRes = await fetch(`https://dashscope-intl.aliyuncs.com/api/v1/tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${wanApiKey}`
        }
      });

      if (!statusRes.ok) {
         console.warn("Error polling task status", await statusRes.text());
         continue; 
      }

      const statusData = await statusRes.json();
      const st = statusData.output?.task_status;

      if (st === 'SUCCEEDED') {
        const url = statusData.output?.results?.[0]?.url;
        if (!url) {
           throw new Error("API returned success but no image URL was found.");
        }
        return NextResponse.json({ imageUrl: url });
      }

      if (st === 'FAILED' || st === 'CANCELED') {
        throw new Error(statusData.output?.message || statusData.output?.code || "Image generation failed.");
      }

      // If PENDING or RUNNING, loop continues
    }

    throw new Error("Image generation timed out after polling limit.");

  } catch (error: any) {
    console.error("Image generation error:", error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
