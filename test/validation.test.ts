import { describe, it, expect } from 'vitest';
import { z } from 'zod';

describe('Security & Input Validation Rules', () => {
  // Test CSV sanitization to prevent formula injection
  it('escapes cells starting with formula trigger characters (=, +, -, @)', () => {
    const sanitizeCell = (val: string | undefined): string => {
      if (!val) return '""';
      let text = String(val).replace(/"/g, '""');
      if (/^[=+\-@]/.test(text)) {
        text = `'${text}`;
      }
      return `"${text}"`;
    };

    expect(sanitizeCell('=SUM(A1:A10)')).toBe(`"'=SUM(A1:A10)"`);
    expect(sanitizeCell('+cmd|/c calc')).toBe(`"'+cmd|/c calc"`);
    expect(sanitizeCell('-100')).toBe(`"'-100"`);
    expect(sanitizeCell('@alert')).toBe(`"'@alert"`);
    expect(sanitizeCell('Google LLC')).toBe(`"Google LLC"`);
  });

  // Test Resume Analysis Schema validation
  it('validates structured AI resume response schema', () => {
    const resumeAnalysisSchema = z.object({
      matchScore: z.number().min(0).max(100),
      atsScore: z.number().min(0).max(100),
      identifiedSkills: z.array(z.string()),
      missingSkills: z.array(z.string()),
      strengths: z.array(z.string()),
      weaknesses: z.array(z.string()),
      suggestedImprovements: z.array(z.string()),
      keywordRecommendations: z.array(z.string()),
      summary: z.string(),
    });

    const validPayload = {
      matchScore: 85,
      atsScore: 90,
      identifiedSkills: ['TypeScript', 'Node.js', 'React'],
      missingSkills: ['Kubernetes'],
      strengths: ['Clear project metrics'],
      weaknesses: ['Missing unit testing details'],
      suggestedImprovements: ['Add STAR phrasing to experience'],
      keywordRecommendations: ['CI/CD', 'Docker'],
      summary: 'Candidate exhibits strong foundation in full-stack architecture.',
    };

    const result = resumeAnalysisSchema.safeParse(validPayload);
    expect(result.success).toBe(true);

    const invalidPayload = {
      matchScore: 150, // out of range
      atsScore: 90,
      identifiedSkills: 'not-an-array',
    };
    const invalidResult = resumeAnalysisSchema.safeParse(invalidPayload);
    expect(invalidResult.success).toBe(false);
  });

  // Test registration validation
  it('rejects passwords shorter than 6 characters and invalid emails', () => {
    const registerSchema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
    });

    expect(registerSchema.safeParse({ name: 'A', email: 'invalid', password: '123' }).success).toBe(false);
    expect(registerSchema.safeParse({ name: 'Alex', email: 'alex@example.com', password: 'secretpassword' }).success).toBe(true);
  });
});
