/**
 * SHA-256 hash of the passcode shown at start-up. This is a cosmetic gate, not security:
 * the hash ships with the public site. Generate a new one with `npm run passcode -- <your-code>`.
 * Set to '' to disable the gate.
 *
 * Default passcode: fmv2026
 */
export const PASSCODE_SHA256 = '737dc954e6f6a7ee673d8b7f8a17c431f0e2a4bcc325a9e6589d4e3eb033a65a';
