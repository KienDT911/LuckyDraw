// Usage: npm run passcode -- <passcode>
import { createHash } from 'node:crypto';

const code = process.argv[2];
if (!code) {
  console.error('Usage: npm run passcode -- <passcode>');
  process.exit(1);
}
const hash = createHash('sha256').update(code).digest('hex');
console.log(`\nPaste this into src/config.ts:\n\nexport const PASSCODE_SHA256 = '${hash}';\n`);
