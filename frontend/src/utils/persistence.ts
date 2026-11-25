import type {
  AssessmentCase,
  EnrolledSpeaker,
  ForensicReportItem,
} from '../data';

export const VOX_STORAGE_KEY = 'voxsentinel.workspace.v1';

export interface PersistedWorkspaceState {
  version: 1;
  cases: AssessmentCase[];
  activeCaseId: string;
  reports: ForensicReportItem[];
  speakers: EnrolledSpeaker[];
}

export function loadWorkspaceState(
  defaults: Omit<PersistedWorkspaceState, 'version'>,
  storage: Pick<Storage, 'getItem'> | null =
    typeof window !== 'undefined' ? window.localStorage : null,
): Omit<PersistedWorkspaceState, 'version'> {
  if (!storage) return defaults;
  try {
    const raw = storage.getItem(VOX_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<PersistedWorkspaceState>;
    if (
      parsed?.version !== 1 ||
      !Array.isArray(parsed.cases) ||
      parsed.cases.length === 0 ||
      !Array.isArray(parsed.reports) ||
      !Array.isArray(parsed.speakers)
    ) {
      return defaults;
    }

    const activeExists = parsed.cases.some((c) => c.id === parsed.activeCaseId);
    return {
      cases: parsed.cases,
      activeCaseId:
        typeof parsed.activeCaseId === 'string' && activeExists
          ? parsed.activeCaseId
          : parsed.cases[0].id,
      reports: parsed.reports,
      speakers: parsed.speakers,
    };
  } catch {
    return defaults;
  }
}

export function saveWorkspaceState(
  state: Omit<PersistedWorkspaceState, 'version'>,
  storage: Pick<Storage, 'setItem'> | null =
    typeof window !== 'undefined' ? window.localStorage : null,
): boolean {
  if (!storage) return false;
  try {
    const payload: PersistedWorkspaceState = {
      version: 1,
      ...state,
    };
    storage.setItem(VOX_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function clearWorkspaceState(
  storage: Pick<Storage, 'removeItem'> | null =
    typeof window !== 'undefined' ? window.localStorage : null,
): void {
  if (!storage) return;
  try {
    storage.removeItem(VOX_STORAGE_KEY);
  } catch {
    // Ignore storage removal errors in restricted environments
  }
}
