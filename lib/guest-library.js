export const MOOD_MARKS = ['无感', '值得', '热爱', '神作'];

export function createRecord(movie, collectedAt) {
  return {
    id: movie.id + '-' + collectedAt,
    movie,
    collectedAt,
    mood: '',
    tags: [],
    mainNote: '',
    fragments: [],
    visibility: 'private',
  };
}

export function addRecord(state, movie, collectedAt) {
  if (state.account) return { ...state, records: [...state.records, createRecord(movie, collectedAt)] };
  if (state.records.length < 3 && !state.locked) return { ...state, records: [...state.records, createRecord(movie, collectedAt)] };
  return { ...state, pendingRecord: createRecord(movie, collectedAt), locked: true };
}

export function bindPendingRecord(state, account) {
  const records = state.pendingRecord ? [...state.records, state.pendingRecord] : state.records;
  return { ...state, account, records, pendingRecord: null, locked: false };
}

export function extractTagCandidates(text) {
  return Array.from(new Set(text.split(/[\s,，。；;、]+/).map((item) => item.trim()).filter(Boolean))).slice(0, 8);
}
