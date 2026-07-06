import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { title, year } = await req.json();

    if (!title) {
      return NextResponse.json({ error: 'Missing movie title' }, { status: 400 });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'DeepSeek API key is missing' }, { status: 500 });
    }

    const prompt = `你是一个专业的电影资料数据库检索系统。用户查询了一部电影的简介，但本地数据库缺失。
请你搜索并提供这部电影的最准确的官方原版中文简介（如果官方是外语，请提供高质量的中译版）。
电影名称：《${title}》
年份：${year || '未知'}

要求：
1. 必须是客观、真实的电影内容简介。
2. 不要包含“这是一部由...执导的电影”等废话，直接进入剧情简介。
3. 不要包含任何开场白、结尾敬语或你的思考过程，直接返回简介文本本身。
4. 字数控制在100-300字左右。`;

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3, // Low temperature for factual retrieval
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek API error:', errorText);
      return NextResponse.json({ error: 'Failed to fetch from DeepSeek API' }, { status: response.status });
    }

    const data = await response.json();
    const synopsis = data.choices[0]?.message?.content?.trim();

    if (!synopsis) {
      return NextResponse.json({ error: 'Empty response from DeepSeek API' }, { status: 500 });
    }

    return NextResponse.json({ synopsis });
  } catch (error) {
    console.error('Generate synopsis error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
