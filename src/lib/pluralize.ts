// Українська множина: 1 → група, 2-4 → групи, 5+ (і 11-14) → груп.
export function pluralGroups(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'група';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'групи';
  return 'груп';
}
