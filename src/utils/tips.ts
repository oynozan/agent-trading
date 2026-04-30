const TIPS: string[] = [
  'You can change your model and API key with "settings" command.',
];

export function getRandomTip(): string {
  return TIPS[Math.floor(Math.random() * TIPS.length)]!;
}
