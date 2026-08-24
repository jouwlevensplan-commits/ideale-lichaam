/**
 * Kleine, dependency-vrije stringgelijkenis-helper voor het rangschikken van al door de database
 * gefilterde kandidaten (zie product.service.ts) — géén databasefunctie of -extensie nodig, dus
 * volledig veilig op managed Postgres zonder SUPERUSER-rechten.
 */

/** Klassieke Levenshtein-afstand: het minimum aantal invoegingen/verwijderingen/vervangingen om `a` in `b` om te zetten. */
export function levenshteinDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;

  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
  for (let j = 0; j < cols; j += 1) matrix[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // verwijdering
        matrix[i][j - 1] + 1, // invoeging
        matrix[i - 1][j - 1] + cost // vervanging
      );
    }
  }

  return matrix[rows - 1][cols - 1];
}

/**
 * Genormaliseerde, case-insensitieve gelijkenis tussen 0 (volledig verschillend) en 1 (identiek).
 * Twee lege strings zijn gedefinieerd als identiek (1); een lege en een niet-lege string als
 * volledig verschillend (0), zonder door nul te delen.
 */
export function stringSimilarity(a: string, b: string): number {
  const left = a.trim().toLowerCase();
  const right = b.trim().toLowerCase();

  const maxLength = Math.max(left.length, right.length);
  if (maxLength === 0) return 1;

  return 1 - levenshteinDistance(left, right) / maxLength;
}
