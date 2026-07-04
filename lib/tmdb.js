const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const FALLBACK_PALETTE = ['#2f3437', '#8f2f35'];

function tmdbImage(path) {
  return path ? `${IMAGE_BASE_URL}${path}` : '';
}

export function normalizeTmdbMovie(item) {
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
    director: 'TMDB',
    genres: [],
    synopsis: item.overview || '暂无简介。',
    palette: FALLBACK_PALETTE,
    poster: 'remote',
    posterUrl: tmdbImage(item.poster_path),
    backdropUrl: tmdbImage(item.backdrop_path),
  };
}

export function tmdbSearchUrl(query) {
  const params = new URLSearchParams({
    query,
    include_adult: 'false',
    language: 'zh-CN',
    page: '1',
  });
  return `https://api.themoviedb.org/3/search/movie?${params}`;
}