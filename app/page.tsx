'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MOOD_MARKS, addRecord, bindPendingRecord, extractTagCandidates } from '../lib/guest-library.js';
import { motion, AnimatePresence } from 'framer-motion';
import { FastAverageColor } from 'fast-average-color';

const STORAGE_KEY = 'movie-archive-prototype';
const EMPTY_PALETTE = ['#2f3437', '#8f2f35'];

type Movie = {
  id: string;
  source?: string;
  sourceId?: number;
  titleZh: string;
  titleOriginal: string;
  year: number | null;
  director: string;
  genres: string[];
  synopsis: string;
  palette: string[];
  poster?: string;
  posterUrl?: string;
  backdropUrl?: string;
};

type LibraryState = { records: any[]; pendingRecord: any | null; account: any | null; locked: boolean };

function initialState(): LibraryState {
  return { records: [], pendingRecord: null, account: null, locked: false };
}

function hydrateMovie(movie: any): Movie {
  return {
    id: movie?.id || `manual-${Date.now()}`,
    source: movie?.source,
    sourceId: movie?.sourceId,
    titleZh: movie?.titleZh || movie?.title || '未知电影',
    titleOriginal: movie?.titleOriginal || movie?.original_title || movie?.titleZh || 'Unknown title',
    year: typeof movie?.year === 'number' ? movie.year : null,
    director: movie?.director || '',
    genres: Array.isArray(movie?.genres) ? movie.genres : [],
    synopsis: movie?.synopsis || '暂无简介。',
    palette: Array.isArray(movie?.palette) ? movie.palette : EMPTY_PALETTE,
    poster: movie?.poster || 'remote',
    posterUrl: movie?.posterUrl || '',
    backdropUrl: movie?.backdropUrl || '',
  };
}

function hydrateRecord(record: any) {
  if (!record) return record;
  const hydrated = record?.movie ? { ...record, movie: hydrateMovie(record.movie) } : record;
  if (!hydrated.mood) hydrated.mood = '';
  if (!hydrated.mainNote) hydrated.mainNote = '';
  if (!hydrated.fragments) hydrated.fragments = [];
  if (!hydrated.tags) hydrated.tags = [];
  return hydrated;
}

function hydrateState(value: string | null): LibraryState {
  if (!value) return initialState();
  try {
    const saved = JSON.parse(value);
    const records = Array.isArray(saved.records) ? saved.records.map(hydrateRecord) : [];
    
    // Auto-purge old mock data (numeric IDs) from previous prototype so users don't see broken default cards
    if (records.some((r: any) => typeof r.id === 'number' || typeof r.movie?.id === 'number')) {
      return initialState();
    }

    return {
      ...initialState(),
      ...saved,
      records,
      pendingRecord: saved.pendingRecord ? hydrateRecord(saved.pendingRecord) : null,
    };
  } catch {
    return initialState();
  }
}

const getProxyUrl = (url: string | undefined | null) => {
  if (!url) return '';
  if (url.startsWith('https://image.tmdb.org/')) {
    return `/api/proxy-image?url=${encodeURIComponent(url)}`;
  }
  return url;
};

export default function Page() {
  const [state, setState] = useState<LibraryState>(initialState);
  const [selectedId, setSelectedId] = useState('');
  
  // Search state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Movie[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  
  // Editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  
  // Account state
  const [showRegister, setShowRegister] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [registerUsername, setRegisterUsername] = useState('');
  
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  
  const [musicOn, setMusicOn] = useState(false);
  const [immersiveMode, setImmersiveMode] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setState(hydrateState(localStorage.getItem(STORAGE_KEY)));
    setMusicOn(localStorage.getItem('movie-archive-music') === 'on');
    setImmersiveMode(localStorage.getItem('movie-archive-immersive') !== 'off');
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localStorage.setItem('movie-archive-immersive', immersiveMode ? 'on' : 'off');
  }, [state, immersiveMode]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.18;
    if (musicOn) audio.play().catch(() => setMusicOn(false));
    else audio.pause();
  }, [musicOn]);

  useEffect(() => {
    setSynopsisExpanded(false);
  }, [selectedId]);

  useEffect(() => {
    const normalized = query.trim();
    if (normalized.length < 2) {
      setResults([]);
      setSearching(false);
      setSearchError('');
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      setSearchError('');
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(normalized)}`);
        const data = await response.json();
        if (cancelled) return;
        if (!response.ok) throw new Error(data.error || '搜索失败');
        setResults(data.results || []);
      } catch (error: any) {
        if (cancelled) return;
        setResults([]);
        setSearchError(error.message || '搜索失败，请稍后重试。');
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  const selected = state.records.find((record) => record.id === selectedId) || state.records[0];
  const activeIndex = state.records.findIndex(r => r.id === selected?.id);

  function updateSelected(patch: any) {
    setState((prev) => {
      const targetId = selectedId || prev.records[0]?.id;
      if (!targetId) return prev;
      return {
        ...prev,
        records: prev.records.map((record) => record.id === targetId ? { ...record, ...patch } : record)
      };
    });
  }

  // Dynamic Color Extraction
  useEffect(() => {
    if (!selected || !selected.movie.posterUrl || !immersiveMode) return;
    if (selected.movie.palette && selected.movie.palette[0] !== '#2f3437') return;

    let cancelled = false;
    const fac = new FastAverageColor();
    const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(selected.movie.posterUrl)}&w=100`;
    
    fac.getColorAsync(proxyUrl, { crossOrigin: 'anonymous' })
      .then(color => {
        if (cancelled) return;
        updateSelected({ movie: { ...selected.movie, palette: [color.hex, color.isDark ? '#ffffff' : '#1a1a1a'] } });
      })
      .catch(e => {
        if (!cancelled) console.error('Color extraction failed', e);
      });

    return () => { cancelled = true; };
  }, [selected?.id, selected?.movie.posterUrl, immersiveMode]);

  function collect(movie: Movie) {
    const next = addRecord(state, movie, new Date().toISOString());
    setState(next);
    setQuery('');
    setResults([]);
    if (!next.pendingRecord && next.records.length) setSelectedId(next.records[next.records.length - 1].id);
  }

  function deleteRecord(id: string) {
    if (confirm('确定要从档案室中删除这部电影吗？')) {
      const newRecords = state.records.filter((r) => r.id !== id);
      setState({ ...state, records: newRecords });
      if (selectedId === id) {
        setSelectedId(newRecords.length > 0 ? newRecords[0].id : '');
      }
    }
  }

  const shellStyle = useMemo(() => {
    if (!immersiveMode || !selected?.movie?.palette || selected.movie.palette[0] === '#2f3437') return {};
    const color = selected.movie.palette[0];
    return {
      '--paper': `color-mix(in srgb, ${color} 12%, #f4f3ed)`,
      '--surface': `color-mix(in srgb, ${color} 4%, #ffffff)`,
      '--ink': `color-mix(in srgb, ${color} 85%, #111111)`,
      '--line': `color-mix(in srgb, ${color} 20%, rgba(200, 195, 185, 0.4))`,
      '--accent': color,
      '--shadow-float': `0 32px 80px color-mix(in srgb, ${color} 20%, rgba(0,0,0,0.12)), 0 8px 32px color-mix(in srgb, ${color} 10%, rgba(0,0,0,0.08))`,
    } as React.CSSProperties;
  }, [immersiveMode, selected?.movie?.palette]);

  return (
    <main className={`stage ${immersiveMode ? '' : 'pureMode'} ${editorOpen ? 'editor-open' : ''}`} style={shellStyle}>
      <audio ref={audioRef} src="/audio/bgm.wav" loop preload="none" />
      
      {/* Background Layer */}
      {selected?.movie.posterUrl && (
        <div 
          className="backdropGlow" 
          style={{ backgroundImage: `url(${getProxyUrl(selected.movie.posterUrl)})` }} 
        />
      )}

      {/* Navigation */}
      <nav className="navbar">
        <div className="logo">Cinephile Archive</div>
        <div className="navActions">
          {state.account && (
            <div className="accountBadge">
              <span className="avatar">👤</span>
              {state.account.username}
              <button 
                className="logoutBtn" 
                onClick={() => {
                  if (confirm('确定要退出登录吗？所有本地数据将被清空。')) {
                    setState(initialState());
                    setSelectedId('');
                  }
                }}
                title="退出登录"
              >
                ✕
              </button>
            </div>
          )}
          <div className="inlineSearch">
            <input 
              placeholder="搜索电影..." 
              value={query} 
              onChange={e => setQuery(e.target.value)} 
            />
            {query && <button className="clearBtn" onClick={() => setQuery('')}>✕</button>}
          </div>
          {state.records.length > 0 && (
            <button className="navBtn" onClick={() => setLibraryOpen(true)}>
              档案库
            </button>
          )}
          {state.records.length > 0 && (
            <button className="navBtn" onClick={() => {
              if (confirm('确定要一键清空所有电影卡片吗？（您的账号登录状态将保留）')) {
                setState({ ...state, records: [] });
                setSelectedId('');
              }
            }}>
              Clear All 清空档案
            </button>
          )}
          <button className="navBtn" onClick={() => setImmersiveMode(!immersiveMode)}>
            {immersiveMode ? 'Pure Mode 纯净' : 'Immersive 沉浸'}
          </button>
          <button className="navBtn" onClick={() => setMusicOn(!musicOn)}>
            {musicOn ? 'Mute 静音' : 'Music 音乐'}
          </button>
        </div>
      </nav>
      
      {/* Floating Search Results */}
      <AnimatePresence>
        {query.trim().length > 0 && (
          <motion.div 
            className="searchResultsFloating"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            {query.trim().length > 0 && query.trim().length < 2 && <p className="searchMsg">请至少输入两个字...</p>}
            {searching && <p className="searchMsg">正在检索 TMDB 数据库...</p>}
            {searchError && <p className="searchMsg error">{searchError}</p>}
            {!searching && !searchError && query.trim().length >= 2 && results.length === 0 && <p className="searchMsg">找不到关于此影片的记录。</p>}
            
            <div className="searchList">
              {results.map((movie) => (
                <button className="searchResultItem" key={movie.id} onClick={() => collect(movie)}>
                  <img src={getProxyUrl(movie.posterUrl)} alt={movie.titleZh} referrerPolicy="no-referrer" />
                  <div className="itemInfo">
                    <strong>{movie.titleZh}</strong>
                    <small>{movie.titleOriginal} · {movie.year}</small>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left Foreground: Typography & Details */}
      <div className="layoutLeft">
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, x: -40, filter: 'blur(10px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: 40, filter: 'blur(10px)' }}
              transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <p className="eyebrow" style={{ letterSpacing: '0.3em', marginBottom: '20px' }}>YOUR PERSONAL COLLECTION</p>
              <h1 className="heroTitle">CINEPHILE<br/>ARCHIVE.</h1>
              
              <div className="selectedInfo" style={{ marginTop: '60px', paddingLeft: '24px', borderLeft: '4px solid var(--ink)' }}>
                <h2 style={{ fontSize: '32px', marginBottom: '16px' }}>{selected.movie.titleZh}</h2>
                <div className="heroMeta" style={{ marginBottom: '16px' }}>
                  <span className="metaBadge">{selected.movie.titleOriginal}</span>
                  {selected.movie.year && <span className="metaBadge">{selected.movie.year}</span>}
                  {selected.movie.director && <span className="metaBadge">{selected.movie.director}</span>}
                </div>
                <div className="heroSynopsisContainer" style={{ marginBottom: '16px' }}>
                  <p className="heroSynopsis" style={{ margin: 0, display: 'inline', transition: 'all 0.3s' }}>
                    {selected.movie.synopsis.length > 100 && !synopsisExpanded 
                      ? selected.movie.synopsis.slice(0, 100) + '...' 
                      : selected.movie.synopsis}
                  </p>
                  {selected.movie.synopsis.length > 100 && (
                    <button 
                      onClick={() => setSynopsisExpanded(!synopsisExpanded)}
                      style={{ background: 'none', border: 'none', color: 'var(--ink)', opacity: 0.7, cursor: 'pointer', fontSize: '13px', marginLeft: '8px', fontWeight: 'bold', padding: '0 4px' }}
                    >
                      {synopsisExpanded ? '收起 ▴' : '展开查看 ▾'}
                    </button>
                  )}
                </div>
                
                {/* User Records Display */}
                <div className="userRecordsDisplay">
                  {selected.mood && <div className="userMoodBadge" data-mood={selected.mood}>{selected.mood}</div>}
                  {selected.mainNote && <div className="userNoteCard">{selected.mainNote}</div>}
                  {selected.fragments && selected.fragments.length > 0 && selected.fragments[0] && (
                    <div className="userFragmentCard">❝ {selected.fragments[0]} ❞</div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '16px', marginTop: '20px' }}>
                  <button className="logBtn" onClick={() => setEditorOpen(true)}>
                     ✏️ {selected.mainNote || selected.fragments?.[0] ? '编辑记录 Edit Record' : '记录此刻 Log this film'}
                  </button>
                  <button className="deleteBtn" onClick={() => deleteRecord(selected.id)}>
                     🗑️ 移除此卡片 Remove
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <div style={{ opacity: 0.5 }}>
               <h1 className="heroTitle">Archive Empty</h1>
               <p className="heroSynopsis">The stage is set. Click "Search" in the top right to build your collection.</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Right Foreground: 3D Coverflow Gallery */}
      <div className="layoutRight">
        {state.records.length > 0 ? (
          <div className="coverflowContainer">
            {state.records.map((record, index) => {
              const offset = index - activeIndex;
              const absOffset = Math.abs(offset);
              const isActive = offset === 0;

              return (
                <motion.div
                  key={record.id}
                  className="coverflowItem"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setSelectedId(record.id);
                  }}
                  animate={{
                    x: offset * 80,
                    z: isActive ? 100 : -absOffset * 100,
                    rotateY: isActive ? 0 : offset > 0 ? -35 : 35,
                    opacity: isActive ? 1 : Math.max(0, 1 - absOffset * 0.3),
                    scale: isActive ? 1 : 0.85
                  }}
                  style={{
                    zIndex: 100 - absOffset
                  }}
                >
                  {isActive && (
                    <div className="deleteZone">
                      <button className="deleteBadge" onClick={(e) => { e.stopPropagation(); deleteRecord(record.id); }} title="Remove">×</button>
                    </div>
                  )}
                  <img src={getProxyUrl(record.movie.posterUrl)} alt={record.movie.titleZh} draggable={false} referrerPolicy="no-referrer" />
                </motion.div>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* Glassmorphic Editor Panel */}
      <AnimatePresence>
        {editorOpen && selected && (
          <motion.div className="editorOverlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.4 } }}>
            <motion.div 
              className="editorPanel" 
              initial={{ x: '100%' }} 
              animate={{ x: 0 }} 
              exit={{ x: '100%' }} 
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
               <div className="editorHeader">
                  <h2>档案编辑 · {selected.movie.titleZh}</h2>
                  <button className="closeEditorBtn" onClick={() => setEditorOpen(false)}>×</button>
               </div>
               
               <div className="editorSection">
                  <label>感受标记 Mood Marks</label>
                  <div className="moodGrid">
                    {MOOD_MARKS.map(m => (
                      <button 
                        key={m} 
                        className={`moodBtn ${selected.mood === m ? 'active' : ''}`}
                        data-mood={m}
                        onClick={() => updateSelected({ mood: m })}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
               </div>

               <div className="editorSection">
                  <label>长文记录 Main Note</label>
                  <textarea 
                    className="editorTextarea" 
                    placeholder="写下你对这部电影最深刻的感受..."
                    value={selected.mainNote || ''}
                    onChange={e => updateSelected({ mainNote: e.target.value })}
                  />
                  {selected.mainNote && (
                    <div className="aiTagsGrid" style={{ marginTop: '16px' }}>
                      <p style={{ width: '100%', fontSize: '13px', color: 'var(--muted)', margin: '0 0 8px 0' }}>💡 AI 候选标签 (点击贴靠)</p>
                      {extractTagCandidates(selected.mainNote).map(tag => (
                        <button 
                          key={tag} 
                          className={`aiTag ${selected.tags?.includes(tag) ? 'active' : ''}`}
                          onClick={() => {
                            const tags = selected.tags || [];
                            if (tags.includes(tag)) updateSelected({ tags: tags.filter((t: string) => t !== tag) });
                            else updateSelected({ tags: [...tags, tag] });
                          }}
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  )}
               </div>

               <div className="editorSection">
                  <label>碎片摘录 Fragments</label>
                  <textarea 
                    className="editorTextarea" 
                    style={{ minHeight: '80px' }}
                    placeholder="一句印象深刻的台词，或一个画面..."
                    value={selected.fragments?.[0] || ''}
                    onChange={e => updateSelected({ fragments: [e.target.value] })}
                  />
               </div>

               <button 
                 className="saveBtn" 
                 data-mood={selected.mood} 
                 onClick={() => {
                   setSaveStatus('saved');
                   setTimeout(() => {
                     setSaveStatus('');
                     setEditorOpen(false);
                   }, 800);
                 }}
               >
                 {saveStatus === 'saved' ? '✅ 已保存至本地档案' : '💾 保存记录 Save Record'}
               </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>



      {/* Account Binding Modal */}
      {state.pendingRecord && !showRegister && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.8)', display: 'grid', placeItems: 'center' }}>
          <div style={{ background: 'var(--surface)', padding: 40, borderRadius: 24, width: 420, color: 'var(--ink)' }}>
             <h2>保存您的观影记录</h2>
             <p style={{ marginTop: 16, marginBottom: 24, color: 'var(--muted)', lineHeight: 1.6 }}>
               您当前所有的电影收藏都<strong>仅保存在此浏览器的本地缓存中</strong>。<br/><br/>
               为防止清理缓存时丢失数据，并在多台设备间同步您的私人影史，请注册本站专属账号。
             </p>
             <button onClick={() => setShowRegister(true)} style={{ width: '100%', padding: 16, background: '#4a6fa5', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 'bold', cursor: 'pointer', marginBottom: 12 }}>
               注册 / 登录
             </button>
             <button 
               onClick={() => {
                 // Discard the pending record, preventing bypass
                 setState({ ...state, pendingRecord: null });
               }} 
               style={{ width: '100%', padding: 16, background: 'transparent', color: 'var(--ink)', border: '2px solid var(--ink)', borderRadius: 12, fontWeight: 'bold', cursor: 'pointer' }}
             >
               取消
             </button>
          </div>
        </div>
      )}

      {/* Registration Modal */}
      {showRegister && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.8)', display: 'grid', placeItems: 'center' }}>
          <div style={{ background: 'var(--surface)', padding: 40, borderRadius: 24, width: 400, color: 'var(--ink)' }}>
             <h2 style={{ marginBottom: 24, textAlign: 'center' }}>登录或创建账号</h2>
             <input type="text" placeholder="创建一个专属用户名" value={registerUsername} onChange={e => setRegisterUsername(e.target.value)} style={{ width: '100%', padding: 16, borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)', marginBottom: 32, fontSize: 16, background: 'rgba(0,0,0,0.02)' }} />
             <button 
               onClick={() => {
                 const nextRecords = state.pendingRecord ? [...state.records, state.pendingRecord] : state.records;
                 setState({ ...state, account: { username: registerUsername || 'Cinephile' }, pendingRecord: null, records: nextRecords });
                 if (state.pendingRecord) setSelectedId(state.pendingRecord.id);
                 setShowRegister(false);
                 alert('成功！您的数据将安全保存至您的专属账号。');
               }} 
               style={{ width: '100%', padding: 16, background: 'var(--ink)', color: 'var(--surface)', border: 'none', borderRadius: 12, fontWeight: 'bold', cursor: 'pointer', marginBottom: 12 }}
             >
               确认
             </button>
             <button 
               onClick={() => setShowRegister(false)} 
               style={{ width: '100%', padding: 16, background: 'transparent', color: 'var(--ink)', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
             >
               返回
             </button>
          </div>
        </div>
      )}

      {/* Library Grid Overlay */}
      <AnimatePresence>
        {libraryOpen && (
          <motion.div 
            className="libraryOverlay"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div className="libraryHeader">
              <h2>所有档案 All Archives <span style={{ fontSize: '20px', color: 'rgba(255,255,255,0.5)', marginLeft: 16 }}>{state.records.length}部记录</span></h2>
              <button className="closeLibraryBtn" onClick={() => setLibraryOpen(false)}>✕</button>
            </div>
            
            <div className="libraryGrid">
              {state.records.map((record) => (
                <button 
                  key={record.id} 
                  className="libraryCard" 
                  onClick={() => {
                    setSelectedId(record.id);
                    setLibraryOpen(false);
                  }}
                >
                  <img src={getProxyUrl(record.movie.posterUrl)} alt={record.movie.titleZh} referrerPolicy="no-referrer" />
                  <div className="cardTitle">{record.movie.titleZh}</div>
                  {record.movie.year && <div className="cardMeta">{record.movie.year}</div>}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
