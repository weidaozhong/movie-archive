import type { Metadata } from 'next';
import { Inter, Noto_Serif_SC } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const notoSerifSC = Noto_Serif_SC({ weight: ['400', '700', '900'], subsets: ['latin'], variable: '--font-noto-serif-sc' });

export const metadata: Metadata = {
  title: '电影档案',
  description: '一个安静的电影收集与思维发散网页',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={`${inter.variable} ${notoSerifSC.variable}`}>
      <body>{children}</body>
    </html>
  );
}
