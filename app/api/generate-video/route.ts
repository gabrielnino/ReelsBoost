import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { imageUrl, prompt } = await request.json();

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    const wanApiKey = process.env.WAN_API_KEY;

    if (!wanApiKey) {
      console.log("No WAN_API_KEY found. Returning mock video task.");
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return NextResponse.json({ task_id: 'mock_task_12345' });
    }

    const response = await fetch('https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis', {
      method: 'POST',
      headers: {
        'X-DashScope-Async': 'enable',
        'Authorization': `Bearer ${wanApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "wan2.6-i2v-flash",
        input: {
          img_url: imageUrl,  
          prompt: prompt || 'Automatic motion'
        },
        parameters: {
          // Additional parameters if needed
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("DashScope Error:", errText);
      throw new Error(`Failed to initiate video generation: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // The response includes output.task_id
    if (!data.output?.task_id) {
        throw new Error("No task_id found in the DashScope response.");
    }

    return NextResponse.json({ task_id: data.output.task_id });
  } catch (error: any) {
    console.error("Video generation error:", error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
