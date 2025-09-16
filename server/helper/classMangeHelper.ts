// subjectUtils.ts
export function normalizeSubjectName(raw: string): string {
  const trimmed = (raw ?? '').trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function parseSubjects(input: unknown): string[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input
      .map((s) => (typeof s === 'string' ? normalizeSubjectName(s) : ''))
      .filter((s) => !!s);
  }
  if (typeof input === 'string') {
    return input
      .split(',')
      .map((s) => normalizeSubjectName(s))
      .filter((s) => !!s);
  }
  return [];
}

export type SubjectAssignment = { name: string; subject_teacher_id?: number | null };

export function parseSubjectAssignments(input: unknown): SubjectAssignment[] {
  if (!input) return [];
  if (!Array.isArray(input)) return [];
  const out: SubjectAssignment[] = [];
  for (const item of input) {
    if (!item || typeof item !== 'object') continue;
    const nameRaw =
      'name' in item && typeof (item as any).name === 'string'
        ? (item as any).name
        : undefined;
    if (!nameRaw) continue;
    const name = normalizeSubjectName(nameRaw);
    if (!name) continue;
    const subject_teacher_id =
      'subject_teacher_id' in item &&
      (typeof (item as any).subject_teacher_id === 'number' ||
        (item as any).subject_teacher_id === null)
        ? (item as any).subject_teacher_id
        : undefined;
    out.push({ name, subject_teacher_id });
  }
  return out;
}
