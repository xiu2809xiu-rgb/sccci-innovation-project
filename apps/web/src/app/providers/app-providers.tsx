import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';

import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';

import { useApplyPreferences } from '../preferences/use-apply-preferences';
import { DependenciesContext, type AppDependencies } from './dependencies-context';

/** Every app-wide provider in one place: translations, server cache, services, tooltips, toasts. */
export function AppProviders({
  dependencies,
  children,
}: {
  dependencies: AppDependencies;
  children: ReactNode;
}) {
  useApplyPreferences(dependencies.i18n);
  return (
    <I18nextProvider i18n={dependencies.i18n}>
      <QueryClientProvider client={dependencies.queryClient}>
        <DependenciesContext value={dependencies}>
          <TooltipProvider delayDuration={300}>
            {children}
            <Toaster position="bottom-right" />
          </TooltipProvider>
        </DependenciesContext>
      </QueryClientProvider>
    </I18nextProvider>
  );
}
