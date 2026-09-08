/**
 * Real-time Fuzzy Search Utility
 * Supports substring matching, prefix prioritization, word-boundary scoring,
 * in-order subsequence matching, and typo-tolerant edit distance matching.
 */

export interface FuzzyMatchResult {
  isMatch: boolean;
  score: number;
  ranges: [number, number][]; // [start, end] indices in target for highlighting
}

export interface EmployeeFuzzyResult<T> {
  item: T;
  isMatch: boolean;
  score: number;
  matchedFields: ('name' | 'department' | 'role' | 'code')[];
  nameRanges: [number, number][];
  deptRanges: [number, number][];
  roleRanges: [number, number][];
}

/**
 * Computes Levenshtein edit distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const row = Array.from({ length: n + 1 }, (_, i) => i);

  for (let i = 1; i <= m; i++) {
    let prev = i;
    for (let j = 1; j <= n; j++) {
      let val: number;
      if (a[i - 1] === b[j - 1]) {
        val = row[j - 1];
      } else {
        val = 1 + Math.min(row[j - 1], prev, row[j]);
      }
      row[j - 1] = prev;
      prev = val;
    }
    row[n] = prev;
  }

  return row[n];
}

/**
 * Fuzzy matches a query against a target string.
 */
export function fuzzyMatch(text: string, query: string): FuzzyMatchResult {
  if (!query || query.trim() === '') {
    return { isMatch: true, score: 100, ranges: [] };
  }
  if (!text) {
    return { isMatch: false, score: 0, ranges: [] };
  }

  const cleanText = text;
  const lowerText = text.toLowerCase();
  const pattern = query.toLowerCase().trim();

  // 1. Exact Full Match
  if (lowerText === pattern) {
    return { isMatch: true, score: 100, ranges: [[0, cleanText.length]] };
  }

  // 2. Exact Substring Match
  const subIdx = lowerText.indexOf(pattern);
  if (subIdx !== -1) {
    const isWordStart =
      subIdx === 0 ||
      lowerText[subIdx - 1] === ' ' ||
      lowerText[subIdx - 1] === '/' ||
      lowerText[subIdx - 1] === '-';

    const bonus = isWordStart ? 25 : 10;
    const lengthRatio = pattern.length / lowerText.length;
    const score = 65 + bonus + lengthRatio * 15;

    return {
      isMatch: true,
      score,
      ranges: [[subIdx, subIdx + pattern.length]],
    };
  }

  // 3. Multi-word Token Match
  // If query contains multiple space-separated words, check if all tokens match
  const tokens = pattern.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    let allTokensMatch = true;
    let totalScore = 0;
    const tokenRanges: [number, number][] = [];

    for (const token of tokens) {
      const tokenMatch = fuzzyMatch(text, token);
      if (!tokenMatch.isMatch) {
        allTokensMatch = false;
        break;
      }
      totalScore += tokenMatch.score;
      tokenRanges.push(...tokenMatch.ranges);
    }

    if (allTokensMatch) {
      return {
        isMatch: true,
        score: Math.min(95, totalScore / tokens.length + 10),
        ranges: tokenRanges,
      };
    }
  }

  // 4. In-order Subsequence Fuzzy Match
  let pIdx = 0;
  let tIdx = 0;
  let consecutives = 0;
  let subseqScore = 0;
  const matchedIndices: number[] = [];

  while (pIdx < pattern.length && tIdx < lowerText.length) {
    if (pattern[pIdx] === lowerText[tIdx]) {
      matchedIndices.push(tIdx);
      consecutives++;
      subseqScore += 5 + consecutives * 2;

      // Bonus if match occurs at word boundary
      if (
        tIdx === 0 ||
        lowerText[tIdx - 1] === ' ' ||
        lowerText[tIdx - 1] === '/' ||
        lowerText[tIdx - 1] === '-'
      ) {
        subseqScore += 10;
      }

      pIdx++;
    } else {
      consecutives = 0;
    }
    tIdx++;
  }

  if (pIdx === pattern.length) {
    // Compress individual matched indices into contiguous ranges
    const ranges: [number, number][] = [];
    if (matchedIndices.length > 0) {
      let start = matchedIndices[0];
      let prev = start;

      for (let i = 1; i < matchedIndices.length; i++) {
        const curr = matchedIndices[i];
        if (curr === prev + 1) {
          prev = curr;
        } else {
          ranges.push([start, prev + 1]);
          start = curr;
          prev = curr;
        }
      }
      ranges.push([start, prev + 1]);
    }

    const coverage = pattern.length / lowerText.length;
    const score = 35 + Math.min(40, subseqScore) + coverage * 15;

    return {
      isMatch: true,
      score,
      ranges,
    };
  }

  // 5. Typo-Tolerant Word-Level Levenshtein Matching (for queries of 3+ chars)
  if (pattern.length >= 3) {
    const words = lowerText.split(/[\s,.-]+/);
    let wordStartIdx = 0;

    for (const word of words) {
      const idxInText = lowerText.indexOf(word, wordStartIdx);
      if (idxInText !== -1) {
        wordStartIdx = idxInText + word.length;
      }

      const lenDiff = Math.abs(word.length - pattern.length);
      const maxAllowedDistance = pattern.length >= 6 ? 2 : 1;

      if (lenDiff <= maxAllowedDistance) {
        const dist = levenshteinDistance(word, pattern);
        if (dist <= maxAllowedDistance) {
          const similarity = 1 - dist / Math.max(word.length, pattern.length);
          const rangeStart = idxInText !== -1 ? idxInText : 0;
          const rangeEnd = rangeStart + word.length;

          return {
            isMatch: true,
            score: 25 + similarity * 25,
            ranges: [[rangeStart, rangeEnd]],
          };
        }
      }
    }
  }

  return { isMatch: false, score: 0, ranges: [] };
}

/**
 * Helper to slice text into highlighted segments based on match ranges.
 */
export interface HighlightSegment {
  text: string;
  isHighlighted: boolean;
}

export function getHighlightSegments(text: string, ranges: [number, number][]): HighlightSegment[] {
  if (!ranges || ranges.length === 0 || !text) {
    return [{ text, isHighlighted: false }];
  }

  // Sort and merge overlapping or adjacent ranges
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];

  for (const range of sorted) {
    if (merged.length === 0) {
      merged.push([...range]);
    } else {
      const last = merged[merged.length - 1];
      if (range[0] <= last[1]) {
        last[1] = Math.max(last[1], range[1]);
      } else {
        merged.push([...range]);
      }
    }
  }

  const segments: HighlightSegment[] = [];
  let currIdx = 0;

  for (const [start, end] of merged) {
    const clampedStart = Math.max(0, Math.min(text.length, start));
    const clampedEnd = Math.max(0, Math.min(text.length, end));

    if (clampedStart > currIdx) {
      segments.push({
        text: text.slice(currIdx, clampedStart),
        isHighlighted: false,
      });
    }

    if (clampedEnd > clampedStart) {
      segments.push({
        text: text.slice(clampedStart, clampedEnd),
        isHighlighted: true,
      });
    }

    currIdx = Math.max(currIdx, clampedEnd);
  }

  if (currIdx < text.length) {
    segments.push({
      text: text.slice(currIdx),
      isHighlighted: false,
    });
  }

  return segments;
}

