export function red(text: string) {
  return '\x1b[31m' + text + '\x1b[0m';
}
export function blue(text: string) {
  return '\x1b[36m' + text + '\x1b[0m';
}

export function yellow(text: string) {
  return '\x1b[33m' + text + '\x1b[0m';
}
