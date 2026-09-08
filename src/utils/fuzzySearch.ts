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
export function fuzzyMatch(text: string | null | undefined, query: string): FuzzyMatchResult {
  if (!query || query.trim() === '') {
    return { isMatch: true, score: 100, ranges: [] };
  }
  if (!text && text !== 0 as any) {
    return { isMatch: false, score: 0, ranges: [] };
  }

  const cleanText = String(text);
  const lowerText = cleanText.toLowerCase();
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

export interface MultiFieldTarget {
  key: string;
  label: string;
  text: string | null | undefined;
  weight?: number; // default 1.0
}

export interface MultiFieldMatchResult {
  isMatch: boolean;
  score: number;
  matchedFields: { key: string; label: string; score: number }[];
  fieldRanges: Record<string, [number, number][]>;
}

/**
 * Searches across multiple fields of an entity simultaneously.
 * Supports:
 * - Single-token queries (searches all fields, picks best match)
 * - Multi-token queries (ensures ALL tokens are satisfied across the entity's fields)
 * - Highlights each matched token in its respective field
 */
export function multiFieldFuzzyMatch(
  fields: MultiFieldTarget[],
  query: string
): MultiFieldMatchResult {
  const q = (query || '').trim();
  const fieldRanges: Record<string, [number, number][]> = {};
  for (const f of fields) {
    fieldRanges[f.key] = [];
  }

  if (!q) {
    return {
      isMatch: true,
      score: 100,
      matchedFields: [],
      fieldRanges,
    };
  }

  const tokens = q.split(/\s+/).filter(Boolean);
  const matchedFieldsMap = new Map<string, { key: string; label: string; score: number }>();

  // 1. First test full query against all fields
  let fullMatchScore = 0;
  let fullMatchFound = false;

  for (const f of fields) {
    if (!f.text) continue;
    const res = fuzzyMatch(f.text, q);
    if (res.isMatch && res.score > 0) {
      fullMatchFound = true;
      const weightedScore = Math.round(res.score * (f.weight ?? 1.0));
      fullMatchScore = Math.max(fullMatchScore, weightedScore);
      fieldRanges[f.key] = [...fieldRanges[f.key], ...res.ranges];
      matchedFieldsMap.set(f.key, {
        key: f.key,
        label: f.label,
        score: weightedScore,
      });
    }
  }

  // If single token or full query matched, return full match if found
  if (tokens.length <= 1) {
    return {
      isMatch: fullMatchFound,
      score: Math.min(100, fullMatchScore),
      matchedFields: Array.from(matchedFieldsMap.values()).sort((a, b) => b.score - a.score),
      fieldRanges,
    };
  }

  // 2. For multi-token queries, check if EACH token is satisfied by at least one field
  let allTokensSatisfied = true;
  let totalTokenScore = 0;

  for (const token of tokens) {
    let tokenSatisfied = false;
    let bestScoreForToken = 0;

    for (const f of fields) {
      if (!f.text) continue;
      const res = fuzzyMatch(f.text, token);
      if (res.isMatch && res.score > 0) {
        tokenSatisfied = true;
        const weighted = Math.round(res.score * (f.weight ?? 1.0));
        bestScoreForToken = Math.max(bestScoreForToken, weighted);
        fieldRanges[f.key] = [...fieldRanges[f.key], ...res.ranges];

        const existing = matchedFieldsMap.get(f.key);
        if (!existing || weighted > existing.score) {
          matchedFieldsMap.set(f.key, {
            key: f.key,
            label: f.label,
            score: weighted,
          });
        }
      }
    }

    if (!tokenSatisfied) {
      allTokensSatisfied = false;
      break;
    }
    totalTokenScore += bestScoreForToken;
  }

  const isMatch = fullMatchFound || allTokensSatisfied;
  const avgScore = allTokensSatisfied ? Math.round(totalTokenScore / tokens.length) : 0;
  const finalScore = Math.min(100, Math.max(fullMatchScore, avgScore));

  return {
    isMatch,
    score: isMatch ? Math.max(25, finalScore) : 0,
    matchedFields: isMatch
      ? Array.from(matchedFieldsMap.values()).sort((a, b) => b.score - a.score)
      : [],
    fieldRanges,
  };
}


