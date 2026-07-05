const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w780';
const SEARCH_TIMEOUT_MS = 6000;

function tmdbImage(path) {
  return path ? `${IMAGE_BASE_URL}${path}` : '';
}

function normalizeTmdbMovie(item) {
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

function tmdbSearchUrl(query) {
  const params = new URLSearchParams({
    query,
    include_adult: 'false',
    language: 'zh-CN',
    page: '1',
  });
  return `https://api.themoviedb.org/3/search/movie?${params}`;
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  };
}

export async function handler(event) {
  const query = (event.queryStringParameters?.q || '').trim();
  if (query.length < 2) return json(200, { results: [] });

  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  const apiKey = process.env.TMDB_API_KEY;

  if (!token && !apiKey) {
    return json(500, { error: '还没有配置 TMDB API token。' });
  }

  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const url = apiKey ? `${tmdbSearchUrl(query)}&api_key=${apiKey}` : tmdbSearchUrl(query);

  try {
    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      return json(response.status, {
        error: response.status === 401 ? 'TMDB token 无效。' : 'TMDB 搜索失败，请稍后重试。',
      });
    }

    const data = await response.json();
    return json(200, { results: (data.results || []).slice(0, 8).map(normalizeTmdbMovie) });
  } catch {
    return json(504, { error: '连接 TMDB 超时。请检查网络或稍后重试。' });
  }
}