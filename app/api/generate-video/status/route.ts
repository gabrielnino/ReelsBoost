import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
    }

    if (taskId === 'mock_task_12345') {
       // Simulate polling by returning a static video URL
       await new Promise((resolve) => setTimeout(resolve, 1500));
       return NextResponse.json({ 
           status: 'SUCCEEDED', 
           videoUrl: 'https://cdn.pixabay.com/video/2023/10/12/184733-874229340_tiny.mp4' 
       });
    }

    const wanApiKey = process.env.WAN_API_KEY;
    if (!wanApiKey) {
        return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const response = await fetch(`https://dashscope-intl.aliyuncs.com/api/v1/tasks/${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${wanApiKey}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to check task status');
    }

    const data = await response.json();
    const status = data.output.task_status;
    
    if (status === 'SUCCEEDED') {
        const videoUrl = data.output.video_url || data.output.results?.[0]?.video_url || null;
        return NextResponse.json({ status, videoUrl });
    } else if (status === 'FAILED') {
        return NextResponse.json({ status, error: data.output.message || data.output.code || 'Video generation failed' });
    } else {
        return NextResponse.json({ status }); // PENDING or RUNNING
    }

  } catch (error: any) {
    console.error("Status polling error:", error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
