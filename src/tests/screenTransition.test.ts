import { classifyNavigation } from '~/components/Layout/ScreenTransition';

describe('classifyNavigation', () => {
  it('tab-to-tab is a tab change', () => {
    expect(classifyNavigation('/balances', '/groups')).toBe('tab');
  });

  it('drilling deeper is a push', () => {
    expect(classifyNavigation('/balances', '/balances/12')).toBe('push');
    expect(classifyNavigation('/groups/3', '/groups/3/expenses/9')).toBe('push');
  });

  it('going shallower is a pop', () => {
    expect(classifyNavigation('/balances/12', '/balances')).toBe('pop');
  });

  it('ignores query strings', () => {
    expect(classifyNavigation('/balances', '/add?friendId=2')).toBe('push');
  });
});
