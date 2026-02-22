import { source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{
        title: 'Tank Docs',
        url: '/',
      }}
      links={[
        {
          text: 'Registry',
          url: '/skills',
        },
        {
          text: 'GitHub',
          url: 'https://github.com/tankpkg/tank',
        },
      ]}
      sidebar={{
        defaultOpenLevel: 0,
      }}
    >
      {children}
    </DocsLayout>
  );
}
