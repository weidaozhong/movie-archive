import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTmdbMovie, tmdbSearchUrl } from '../lib/tmdb.js';
import { addRecord, bindPendingRecord, extractTagCandidates, MOOD_MARKS } from '../lib/guest-library.js';

const movie = (id) => ({ id, titleZh: '电影' + id, titleOriginal: 'Movie ' + id, year: 2026 });

test('guest can save first three records', () => {
  let state = { records: [], pendingRecord: null, account: null, locked: false };
  state = addRecord(state, movie('a'), '2026-07-03T00:00:00.000Z');
  state = addRecord(state, movie('b'), '2026-07-03T00:01:00.000Z');
  state = addRecord(state, movie('c'), '2026-07-03T00:02:00.000Z');
  assert.equal(state.records.length, 3);
  assert.equal(state.pendingRecord, null);
  assert.equal(state.locked, false);
});

test('fourth guest record becomes pending and locks new personal records', () => {
  let state = { records: [], pendingRecord: null, account: null, locked: false };
  state = addRecord(state, movie('a'), '2026-07-03T00:00:00.000Z');
  state = addRecord(state, movie('b'), '2026-07-03T00:01:00.000Z');
  state = addRecord(state, movie('c'), '2026-07-03T00:02:00.000Z');
  state = addRecord(state, movie('d'), '2026-07-03T00:03:00.000Z');
  assert.equal(state.records.length, 3);
  assert.equal(state.pendingRecord.movie.id, 'd');
  assert.equal(state.locked, true);
});

test('binding account saves pending record', () => {
  let state = { records: [], pendingRecord: null, account: null, locked: false };
  state = addRecord(state, movie('a'), '2026-07-03T00:00:00.000Z');
  state = addRecord(state, movie('b'), '2026-07-03T00:01:00.000Z');
  state = addRecord(state, movie('c'), '2026-07-03T00:02:00.000Z');
  state = addRecord(state, movie('d'), '2026-07-03T00:03:00.000Z');
  state = bindPendingRecord(state, { nickname: '观影者', email: 'movie@example.com' });
  assert.equal(state.records.length, 4);
  assert.equal(state.records[3].movie.id, 'd');
  assert.equal(state.pendingRecord, null);
  assert.equal(state.locked, false);
  assert.equal(state.account.email, 'movie@example.com');
});

test('mood marks match product language', () => {
  assert.deepEqual(MOOD_MARKS, ['无感', '值得', '热爱', '神作']);
});

test('tag extraction returns short unique Chinese candidates', () => {
  assert.deepEqual(extractTagCandidates('孤独 记忆 冬天 孤独 镜头很美'), ['孤独', '记忆', '冬天', '镜头很美']);
});

test('TMDB search URL uses movie search with Chinese language', () => {
  const url = tmdbSearchUrl('教父');
  assert.equal(url, 'https://api.themoviedb.org/3/search/movie?query=%E6%95%99%E7%88%B6&include_adult=false&language=zh-CN&page=1');
});

test('TMDB movie response is normalized into a collectible movie snapshot', () => {
  const movie = normalizeTmdbMovie({
    id: 238,
    title: '教父',
    original_title: 'The Godfather',
    release_date: '1972-03-14',
    overview: '黑帮家族史诗。',
    poster_path: '/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
    backdrop_path: '/tmU7GeKVybMWFButWEGl2M4GeiP.jpg',
  });

  assert.equal(movie.id, 'tmdb-238');
  assert.equal(movie.source, 'tmdb');
  assert.equal(movie.titleZh, '教父');
  assert.equal(movie.titleOriginal, 'The Godfather');
  assert.equal(movie.year, 1972);
  assert.equal(movie.posterUrl, 'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg');
});