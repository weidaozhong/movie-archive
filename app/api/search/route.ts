import { NextResponse } from 'next/server';

const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w780';
const SEARCH_TIMEOUT_MS = 6000;

function tmdbImage(path: string) {
  return path ? `${IMAGE_BASE_URL}${path}` : '';
}

function normalizeTmdbMovie(item: any) {
  const year = item.release_date ? Number(item.release_date.slice(0, 4)) || null : null;
  const titleZh = item.title || item.name || item.original_title || '未知电影';
  const titleOriginal = item.original_title || titleZh;

  return {
    id: `tmdb-${item.id}`,
    source: 'tmdb',
    sourceId: item.id,
    titleZh,
    titleOriginal,
    year,
    director: '',
    genres: [],
    synopsis: item.overview || '暂无简介。',
    palette: ['#2f3437', '#8f2f35'],
    poster: 'remote',
    posterUrl: tmdbImage(item.poster_path),
    backdropUrl: tmdbImage(item.backdrop_path),
  };
}

function tmdbSearchUrl(query: string) {
  const params = new URLSearchParams({
    query,
    include_adult: 'false',
    language: 'zh-CN',
    page: '1',
  });
  return `https://api.themoviedb.org/3/search/movie?${params}`;
}

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
    });

    if (!response.ok) {
      return NextResponse.json({
        error: response.status === 401 ? 'TMDB token 无效。' : 'TMDB 搜索失败，请稍后重试。',
      }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ results: (data.results || []).slice(0, 8).map(normalizeTmdbMovie) });
  } catch {
    return NextResponse.json({ error: '连接 TMDB 超时。请检查网络或稍后重试。' }, { status: 504 });
  }
}
