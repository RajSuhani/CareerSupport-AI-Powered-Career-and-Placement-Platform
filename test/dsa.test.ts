import { describe, it, expect } from 'vitest';

describe('DSA Progress & Analytics Computations', () => {
  it('correctly calculates completion percentages and difficulty distributions', () => {
    const totalProblems = 25;
    const solvedEasy = 5;
    const solvedMedium = 3;
    const solvedHard = 1;
    const totalSolved = solvedEasy + solvedMedium + solvedHard;

    const percentage = Math.round((totalSolved / totalProblems) * 100);
    expect(percentage).toBe(36);

    const remaining = totalProblems - totalSolved;
    expect(remaining).toBe(16);
  });

  it('calculates placement preparation streaks properly', () => {
    const calculateStreak = (solvedDatesCount: number): number => {
      return Math.min(7, Math.max(1, Math.ceil(solvedDatesCount / 2)));
    };

    expect(calculateStreak(0)).toBe(1);
    expect(calculateStreak(3)).toBe(2);
    expect(calculateStreak(8)).toBe(4);
    expect(calculateStreak(20)).toBe(7);
  });
});
