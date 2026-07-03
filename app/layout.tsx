import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '电影档案',
  description: '一个安静的电影收集与思维发散网页',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
