/**
 * Manual verification utilities for human verification fallback
 * Extracted from SecurityAudit.tsx for better code organization and reusability
 */

export interface MathChallenge {
  num1: number;
  num2: number;
  answer: number;
}

/**
 * Generate a simple math challenge for manual human verification
 * @returns Math challenge object with two numbers and their sum
 */
export function generateMathChallenge(): MathChallenge {
  const num1 = Math.floor(Math.random() * 10) + 1;
  const num2 = Math.floor(Math.random() * 10) + 1;
  return {
    num1,
    num2,
    answer: num1 + num2
  };
}

/**
 * Verify user's answer to the math challenge
 * @param userAnswer - User's input answer
 * @param challenge - The challenge object
 * @returns true if answer is correct, false otherwise
 */
export function verifyMathChallenge(userAnswer: string | number, challenge: MathChallenge): boolean {
  const answer = typeof userAnswer === 'string' ? parseInt(userAnswer, 10) : userAnswer;
  return !isNaN(answer) && answer === challenge.answer;
}
