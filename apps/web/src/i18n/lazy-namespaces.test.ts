import { describe, expect, it } from 'vitest';

import { BUNDLED_NAMESPACES } from './bundled-resources';
import { createI18n } from './create-i18n';
import { LAZY_NAMESPACES } from './lazy-namespaces';
import { NAMESPACES, resources } from './resources';

describe('namespace loading', () => {
  it('bundles or lazy-loads every namespace, never both', () => {
    const lazy: string[] = Object.keys(LAZY_NAMESPACES);
    expect([...BUNDLED_NAMESPACES, ...lazy].sort()).toEqual([...NAMESPACES].sort());
    expect(BUNDLED_NAMESPACES.filter((namespace) => lazy.includes(namespace))).toEqual([]);
  });

  it('loads a lazy namespace when it is first asked for, in each language', async () => {
    for (const language of ['en', 'zh-CN'] as const) {
      const i18n = createI18n(language);
      expect(i18n.hasResourceBundle(language, 'workflows')).toBe(false);
      await i18n.loadNamespaces('workflows');
      expect(i18n.t('title', { ns: 'workflows' })).toBe(resources[language].workflows.title);
    }
  });

  it('loads the new language for namespaces already in use when the language changes', async () => {
    const i18n = createI18n('en');
    await i18n.loadNamespaces('governance');
    await i18n.changeLanguage('zh-CN');
    expect(i18n.t('title', { ns: 'governance' })).toBe(resources['zh-CN'].governance.title);
  });
});
