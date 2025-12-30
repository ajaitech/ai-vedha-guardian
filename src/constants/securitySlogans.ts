/**
 * Security slogans and facts displayed during security audit scanning
 * Extracted from SecurityAudit.tsx for better code organization
 */

export interface SecuritySlogan {
  text: string;
  fact: string;
}

export const SECURITY_SLOGANS: SecuritySlogan[] = [
  { text: "Every lock tells a story, every scan reveals the truth.", fact: "43% of cyber attacks target small businesses" },
  { text: "In the silence of code, vulnerabilities whisper their secrets.", fact: "The average data breach costs $4.45 million" },
  { text: "Trust is built one secure connection at a time.", fact: "95% of breaches are caused by human error" },
  { text: "Behind every firewall, a guardian stands watch.", fact: "A cyber attack occurs every 39 seconds" },
  { text: "Security isn't paranoia, it's preparation.", fact: "It takes 287 days on average to detect a breach" },
  { text: "The strongest shields are forged in vigilance.", fact: "Ransomware attacks increased by 93% in 2024" },
  { text: "Your data is precious. We treat it that way.", fact: "68% of business leaders feel cybersecurity risks are increasing" },
  { text: "Where others see code, we see potential.", fact: "HTTPS adoption reached 95% of web traffic" },
  { text: "Excellence in security is not an act, but a habit.", fact: "Zero-day vulnerabilities rose 50% last year" },
  { text: "Peace of mind, one scan at a time.", fact: "Multi-factor authentication blocks 99.9% of attacks" }
];
