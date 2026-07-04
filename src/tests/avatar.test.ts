import { FLAT_AVATAR_COLORS, flatAvatarColor } from '~/components/ui/avatar';

describe('flatAvatarColor', () => {
  it('is deterministic for the same name', () => {
    expect(flatAvatarColor('Marco Bianchi')).toBe(flatAvatarColor('Marco Bianchi'));
  });
  it('always returns a palette color', () => {
    for (const name of ['', 'a', 'Zoë', 'tommaso@email.com']) {
      expect(FLAT_AVATAR_COLORS).toContain(flatAvatarColor(name));
    }
  });
});
