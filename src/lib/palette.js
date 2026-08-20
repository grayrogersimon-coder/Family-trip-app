export const PALETTE = {
  ink: '#1A2332',
  teal: '#1B4B4A',
  tealLight: '#2D6B69',
  sand: '#EDE4D3',
  cream: '#FAF6EE',
  coral: '#E8734A',
  coralLight: '#F0916B',
};

export const FAMILY_COLORS = [PALETTE.coral, PALETTE.teal, '#8B6F47', '#5C7F9E', '#A85751'];

export function familyColor(index) {
  return FAMILY_COLORS[index % FAMILY_COLORS.length];
}
