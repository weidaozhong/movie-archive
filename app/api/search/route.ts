import { NextResponse } from 'next/server';
import { normalizeTmdbMovie, tmdbSearchUrl } from '../../../lib/tmdb.js';

export const runtime = 'nodejs';

const SEARCH_TIMEOUT_MS = 6000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q') || '').trim();

  if (query.length < 2) return NextResponse.json({ results: [] });

  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  const apiKey = process.env.TMDB_API_KEY;

  if (!token && !apiKey) {
    return NextResponse.json({ error: '还没有配置 TMDB API token。' }, { status: 500 });
  }

  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
  const url = apiKey ? `${tmdbSearchUrl(query)}&api_key=${apiKey}` : tmdbSearchUrl(query);

  try {
    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      const error = response.status === 401
        ? 'TMDB token 无效，请检查 .env.local。'
        : 'TMDB 搜索失败，请稍后重试。';
      return NextResponse.json({ error }, { status: response.status });
    }

    const data = await response.json();
    const results = (data.results || []).slice(0, 8).map(normalizeTmdbMovie);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { error: '连接 TMDB 超时。请检查本机网络、代理，或稍后重试。' },
      { status: 504 },
    );
  }
}