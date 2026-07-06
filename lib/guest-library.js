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
  if (state.records.length < 3) return { ...state, records: [...state.records, createRecord(movie, collectedAt)] };
  return { ...state, pendingRecord: createRecord(movie, collectedAt) };
}

export function bindPendingRecord(state, account) {
  const records = state.pendingRecord ? [...state.records, state.pendingRecord] : state.records;
  return { ...state, account, records, pendingRecord: null, locked: false };
}

export function extractTagCandidates(text) {
  if (!text) return [];
  try {
    // Use modern browser native NLP segmenter for Chinese word segmentation
    const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' });
    const segments = Array.from(segmenter.segment(text));
    
    // Common stop words in Chinese movie reviews
    const stopWords = new Set([
      '我们', '你们', '他们', '这个', '那个', '因为', '所以', '虽然', '但是', 
      '如果', '那么', '然后', '不过', '可是', '或者', '并且', '而且', '就是', 
      '不是', '可以', '没有', '什么', '怎么', '自己', '一部', '电影', '影片', 
      '这部', '觉得', '感觉', '还是', '一样', '知道', '时候', '看到', '出来', 
      '真的', '非常', '特别', '比较', '其实', '那些', '有些', '这种', '那种', 
      '开始', '最后', '应该', '为什么', '怎么', '一直', '已经', '为了', '一定'
    ]);
    
    const words = segments
      .filter(s => s.isWordLike)
      .map(s => s.segment.trim())
      .filter(word => {
        // Only keep words between 2 and 5 characters
        if (word.length < 2 || word.length > 5) return false;
        if (stopWords.has(word)) return false;
        // Ensure it contains Chinese characters or letters
        return /^[\u4e00-\u9fa5a-zA-Z]+$/.test(word);
      });
      
    // Rank by frequency
    const freq = {};
    words.forEach(w => freq[w] = (freq[w] || 0) + 1);
    
    // Sort by frequency, then by word length (favoring slightly longer/more descriptive words)
    const sortedTags = Object.keys(freq).sort((a, b) => {
      if (freq[b] !== freq[a]) return freq[b] - freq[a];
      return b.length - a.length;
    });
    
    return sortedTags.slice(0, 6);
  } catch (e) {
    // Fallback if Intl.Segmenter is not supported
    return Array.from(new Set(text.split(/[\s,，。；;、!！?？]+/).map(item => item.trim()).filter(w => w.length >= 2 && w.length <= 6))).slice(0, 6);
  }
}