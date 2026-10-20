import type { EmployeeField, Locale } from '@huitong/shared';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';
import { createI18n } from '@/i18n/create-i18n';

import { FieldValue } from './field-value';

function show(field: EmployeeField, value: unknown, language: Locale = 'en') {
  return render(
    <I18nextProvider i18n={createI18n(language)}>
      <TooltipProvider>
        <FieldValue field={field} value={value} />
      </TooltipProvider>
    </I18nextProvider>,
  );
}

describe('FieldValue', () => {
  it('says a missing value is not recorded instead of leaving a blank', () => {
    show('jobTitle', '');
    expect(screen.getByText('Not recorded')).toHaveClass('sr-only');
  });

  it('explains why a masked value is hidden', () => {
    show('baseSalary', { masked: true, classification: 'RESTRICTED', reason: 'ROLE_CLEARANCE' });
    expect(
      screen.getByRole('button', { name: /^Hidden\. Why is this hidden\?/ }),
    ).toHaveAccessibleName(/Your role is not cleared for .+ data\./);
    expect(screen.queryByText('6700')).not.toBeInTheDocument();
  });

  it('formats money in its currency for the UI language', () => {
    show('baseSalary', { amount: 6700, currency: 'CNY' }, 'zh-CN');
    expect(screen.getByText('¥6,700.00')).toBeInTheDocument();
  });

  it('shows dates, departments and bank digits the way people read them', () => {
    const { unmount } = show('hireDate', '2026-01-05');
    expect(screen.getByText('Jan 5, 2026')).toBeInTheDocument();
    unmount();

    const chinese = show('departmentCode', 'HR', 'zh-CN');
    expect(screen.getByText('人力资源部 (HR)')).toBeInTheDocument();
    chinese.unmount();
    show('departmentCode', 'HR');
    expect(screen.getByText('Human Resources (HR)')).toBeInTheDocument();

    show('bankAccountLast4', '4821');
    expect(screen.getByText('Ending 4821')).toBeInTheDocument();
  });

  it('names codes instead of showing them raw', () => {
    show('employmentStatus', 'PROBATION');
    expect(screen.getByText('On probation')).toBeInTheDocument();
  });

  it('falls back to the raw JSON for a shape it does not know', () => {
    show('jobTitle', { unexpected: true });
    expect(screen.getByText('{"unexpected":true}').tagName).toBe('CODE');
  });
});
