import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it } from 'vitest';

import { createI18n } from '@/i18n/create-i18n';

import { Dialog, DialogContent, DialogDescription, DialogTitle } from './dialog';
import { Progress } from './progress';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from './sheet';
import { SidebarProvider, SidebarTrigger } from './sidebar';

function inChinese(node: ReactNode) {
  return render(<I18nextProvider i18n={createI18n('zh-CN')}>{node}</I18nextProvider>);
}

describe('shadcn primitives in the UI language', () => {
  it('names the dialog close button in Chinese', () => {
    inChinese(
      <Dialog open>
        <DialogContent>
          <DialogTitle>标题</DialogTitle>
          <DialogDescription>说明</DialogDescription>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByRole('button', { name: '关闭' })).toBeInTheDocument();
  });

  it('names the sheet close button in Chinese', () => {
    inChinese(
      <Sheet open>
        <SheetContent>
          <SheetTitle>标题</SheetTitle>
          <SheetDescription>说明</SheetDescription>
        </SheetContent>
      </Sheet>,
    );
    expect(screen.getByRole('button', { name: '关闭' })).toBeInTheDocument();
  });

  it('names the sidebar toggle in Chinese', () => {
    inChinese(
      <SidebarProvider>
        <SidebarTrigger />
      </SidebarProvider>,
    );
    expect(screen.getByRole('button', { name: '展开或收起导航' })).toBeInTheDocument();
  });

  it('gives the progress bar its value for assistive technology', () => {
    render(<Progress value={42} aria-label="Sync progress" />);
    expect(screen.getByRole('progressbar', { name: 'Sync progress' })).toHaveAttribute(
      'aria-valuenow',
      '42',
    );
  });
});
