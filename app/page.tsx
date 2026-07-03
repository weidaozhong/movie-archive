'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MOVIES, seedRecords } from '../lib/movie-fixtures.js';
import { MOOD_MARKS, addRecord, bindPendingRecord, extractTagCandidates } from '../lib/guest-library.js';

const STORAGE_KEY = 'movie-archive-prototype';

type LibraryState = { records: any[]; pendingRecord: any | null; account: any | null; locked: boolean };

function initialState(): LibraryState {
  return { records: seedRecords(), pendingRecord: null, account: null, locked: false };
}

export default function Page() {
  const [state, setState] = useState<LibraryState>(initialState);
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [musicOn, setMusicOn] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setState(JSON.parse(saved));
    setMusicOn(localStorage.getItem('movie-archive-music') === 'on');
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    localStorage.setItem('movie-archive-music', musicOn ? 'on' : 'off');
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.18;
    if (musicOn) audio.play().catch(() => setMusicOn(false));
    else audio.pause();
  }, [musicOn]);

  const selected = state.records.find((record) => record.id === selectedId) || state.records[0];
  const selectedIndex = Math.max(0, state.records.findIndex((record) => record.id === selected.id));
  const grouped = useMemo(() => ({ '2026 年 7 月': state.records }), [state.records]);
  const results = MOVIES.filter((movie) => (movie.titleZh + ' ' + movie.titleOriginal).toLowerCase().includes(query.toLowerCase()));

  function collect(movie: any) {
    const next = addRecord(state, movie, new Date().toISOString());
    setState(next);
    if (!next.pendingRecord && next.records.length) setSelectedId(next.records[next.records.length - 1].id);
  }

  function updateSelected(patch: any) {
    setState({ ...state, records: state.records.map((record) => record.id === selected.id ? { ...record, ...patch } : record) });
  }

  return (
    <main className="shell">
      <audio ref={audioRef} src="/audio/bgm.wav" loop preload="none" />
      <header className="topbar">
        <div>
          <p className="eyebrow">私人电影档案</p>
          <h1>我的电影</h1>
        </div>
        <button className="iconButton" aria-label={musicOn ? '关闭背景音乐' : '开启背景音乐'} onClick={() => setMusicOn(!musicOn)}>
          {musicOn ? '♪' : '♫'}
        </button>
      </header>

      <section className="searchPanel">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索电影并收录" />
        {query && (
          <div className="results">
            {results.map((movie) => (
              <button key={movie.id} onClick={() => collect(movie)}>
                {movie.titleZh} / {movie.titleOriginal}<span>{movie.year}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="collectionShelf" aria-label="电影陈列">
        <div className="shelfHeader">
          <div>
            <p className="eyebrow">影单陈列</p>
            <h2>{selected ? selected.movie.titleZh : '还没有电影'}</h2>
          </div>
          <span>{state.records.length} 部</span>
        </div>
        <div className="shelfStage">
          {state.records.map((record, index) => {
            const offset = index - selectedIndex;
            const limitedOffset = Math.max(-4, Math.min(4, offset));
            const style = {
              '--offset': limitedOffset,
              '--abs-offset': Math.abs(limitedOffset),
              zIndex: 20 - Math.abs(limitedOffset),
            } as React.CSSProperties;
            return (
              <button
                className={'shelfMovie' + (record.id === selected.id ? ' selected' : '')}
                key={record.id}
                style={style}
                onClick={() => setSelectedId(record.id)}
                aria-label={'查看 ' + record.movie.titleZh}
              >
                <span className={'posterArt ' + record.movie.poster} />
                <b>{record.movie.titleZh}</b>
                <small>{record.movie.titleOriginal}</small>
              </button>
            );
          })}
        </div>
      </section>

      <div className="workspace">
        <section className="archive">
          {Object.entries(grouped).map(([month, records]) => (
            <div key={month}>
              <h2>{month}</h2>
              <div className="posterGrid">
                {records.map((record) => (
                  <button className="posterCard" key={record.id} onClick={() => setSelectedId(record.id)}>
                    <span className={'posterArt ' + record.movie.poster} />
                    {(record.mainNote || record.fragments.length) && <i />}
                    <strong>{record.movie.titleZh}</strong>
                    <small>{record.movie.titleOriginal}</small>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>
        {selected && <Detail record={selected} updateSelected={updateSelected} />}
      </div>

      {state.pendingRecord && <Binding state={state} setState={setState} />}
    </main>
  );
}

function Detail({ record, updateSelected }: { record: any; updateSelected: (patch: any) => void }) {
  const [draftNote, setDraftNote] = useState(record.mainNote || '');
  const [fragment, setFragment] = useState('');
  const [tagText, setTagText] = useState('');
  const [saved, setSaved] = useState(false);
  const candidates = extractTagCandidates(draftNote + ' ' + record.fragments.map((item: any) => item.text).join(' '));
  const style = { '--detail-accent': record.movie.palette[1], '--detail-bg': record.movie.palette[0] } as React.CSSProperties;

  useEffect(() => {
    setDraftNote(record.mainNote || '');
    setSaved(false);
  }, [record.id, record.mainNote]);

  function saveMainNote() {
    updateSelected({ mainNote: draftNote });
    setSaved(true);
  }

  return (
    <section className="detail" style={style}>
      <div className="detailPoster"><span className={'posterArt ' + record.movie.poster} /></div>
      <div className="detailBody">
        <p className="eyebrow">{record.movie.year} · {record.movie.director}</p>
        <h2>{record.movie.titleZh} / {record.movie.titleOriginal}</h2>
        <p>{record.movie.synopsis}</p>
        <div className="marks">
          {MOOD_MARKS.map((mark) => (
            <button
              className={'moodButton mood-' + mark + (record.mood === mark ? ' active' : '')}
              key={mark}
              onClick={() => updateSelected({ mood: mark })}
            >
              {mark}
            </button>
          ))}
        </div>
        <textarea value={draftNote} onChange={(event) => { setDraftNote(event.target.value); setSaved(false); }} placeholder="写下完整的观后感，或者什么都不写。" />
        <div className="noteActions">
          <button className={'saveButton mood-' + (record.mood || '无感')} onClick={saveMainNote}>保存记录</button>
          <span>{saved ? '已保存' : draftNote !== record.mainNote ? '有未保存内容' : ' '}</span>
        </div>
        <div className="tagRow">
          {record.tags.map((tag: string) => (
            <span className="removableBubble" key={tag}>
              {tag}
              <button aria-label={'删除标签 ' + tag} onClick={() => updateSelected({ tags: record.tags.filter((item: string) => item !== tag) })}>×</button>
            </span>
          ))}
          {candidates.map((tag: string) => <button key={tag} onClick={() => updateSelected({ tags: Array.from(new Set([...record.tags, tag])) })}>+ {tag}</button>)}
        </div>
        <div className="fragmentBox">
          {record.fragments.map((item: any) => (
            <p className="removableBubble fragmentBubble" key={item.id}>
              {item.text}
              <button aria-label="删除碎片记录" onClick={() => updateSelected({ fragments: record.fragments.filter((fragmentItem: any) => fragmentItem.id !== item.id) })}>×</button>
            </p>
          ))}
          <input value={fragment} onChange={(event) => setFragment(event.target.value)} placeholder="想哪写哪的碎片记录" />
          <button onClick={() => {
            if (!fragment.trim()) return;
            updateSelected({ fragments: [...record.fragments, { id: Date.now(), text: fragment.trim(), createdAt: new Date().toISOString(), visibility: 'private' }] });
            setFragment('');
          }}>追加碎片</button>
        </div>
        <div className="manualTag">
          <input value={tagText} onChange={(event) => setTagText(event.target.value)} placeholder="手动添加标签" />
          <button onClick={() => {
            if (!tagText.trim()) return;
            updateSelected({ tags: Array.from(new Set([...record.tags, tagText.trim()])) });
            setTagText('');
          }}>添加</button>
        </div>
      </div>
    </section>
  );
}

function Binding({ state, setState }: { state: LibraryState; setState: (state: LibraryState) => void }) {
  const [form, setForm] = useState({ nickname: '', email: '', password: '' });

  return (
    <div className="modal">
      <form onSubmit={(event) => {
        event.preventDefault();
        setState(bindPendingRecord(state, { nickname: form.nickname, email: form.email }));
      }}>
        <h2>保存你的电影档案</h2>
        <p>创建账号后，才能继续保存新的电影和记录。</p>
        <div className="pendingPoster"><span className={'posterArt ' + state.pendingRecord.movie.poster} /></div>
        <input required placeholder="昵称" value={form.nickname} onChange={(event) => setForm({ ...form, nickname: event.target.value })} />
        <input required type="email" placeholder="邮箱" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        <input required type="password" minLength={8} placeholder="密码" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
        <button type="submit">创建账号并保存</button>
        <button type="button" onClick={() => setState({ ...state, pendingRecord: null, locked: true })}>暂时只浏览</button>
      </form>
    </div>
  );
}
