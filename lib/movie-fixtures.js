import { createRecord } from './guest-library.js';

export const MOVIES = [
  { id: 'inception', titleZh: '盗梦空间', titleOriginal: 'Inception', year: 2010, director: 'Christopher Nolan', genres: ['科幻', '悬疑'], synopsis: '一名盗梦者潜入他人梦境窃取秘密，并接下植入想法的任务。', palette: ['#1f2a33', '#8f2f35'], poster: 'dream' },
  { id: 'mood-love', titleZh: '花样年华', titleOriginal: 'In the Mood for Love', year: 2000, director: '王家卫', genres: ['爱情', '剧情'], synopsis: '两个相邻而居的人在克制与错过之间确认彼此的孤独。', palette: ['#5a2328', '#2f5f55'], poster: 'corridor' },
  { id: 'spirited-away', titleZh: '千与千寻', titleOriginal: '千と千尋の神隠し', year: 2001, director: '宫崎骏', genres: ['动画', '奇幻'], synopsis: '少女误入神灵世界，在陌生规则中学习勇气、名字与归途。', palette: ['#6d8b7c', '#c76f4a'], poster: 'river' },
  { id: 'interstellar', titleZh: '星际穿越', titleOriginal: 'Interstellar', year: 2014, director: 'Christopher Nolan', genres: ['科幻', '冒险'], synopsis: '一群探索者穿越虫洞，寻找人类延续的可能，也重新理解爱与时间。', palette: ['#28313b', '#b68b4c'], poster: 'space' },
  { id: 'farewell', titleZh: '霸王别姬', titleOriginal: 'Farewell My Concubine', year: 1993, director: '陈凯歌', genres: ['剧情', '历史'], synopsis: '两个京剧演员的命运在时代洪流和舞台幻梦中纠缠。', palette: ['#7d1f2f', '#d1a95f'], poster: 'opera' },
  { id: 'monster', titleZh: '怪物', titleOriginal: '怪物', year: 2023, director: '是枝裕和', genres: ['剧情', '悬疑'], synopsis: '一场校园事件从不同视角展开，真相在误解与凝视中缓慢显影。', palette: ['#41534c', '#d7c7a3'], poster: 'forest' }
];

export function seedRecords() {
  return MOVIES.slice(0, 3).map((movie, index) => createRecord(movie, '2026-07-0' + (index + 1) + 'T12:00:00.000Z'));
}
