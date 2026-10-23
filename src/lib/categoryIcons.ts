import type { IconName } from '../components/Icon';

// Той самий підхід, що в мобільному застосунку (src/lib/categoryIcons.ts):
// категорії адмін-редаговані, slug може бути будь-яким, тож мапа під
// відомі на зараз + фолбек для всього нового.
const CATEGORY_ICON: Record<string, IconName> = {
  machines: 'coffeeCup',
  'home-machines': 'home',
  grinders: 'grinder',
  beans: 'bean',
  accessories: 'toolbox',
};

export function categoryIcon(slug: string | null | undefined): IconName {
  return (slug && CATEGORY_ICON[slug]) || 'box';
}
