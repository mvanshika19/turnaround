import type {
  ApiErrorBody,
  CopilotRequest,
  CopilotResponse,
  Fitness,
  HealthResponse,
  IsoDate,
  PlanRequest,
  PlanResponse,
  SweepResponse,
  Trail,
  TrailSummary,
} from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

/** Shown wherever the planner backend cannot be reached, as a title and a hint or as one sentence. */
export const UNREACHABLE_TITLE = 'Can’t reach the planner';
export const UNREACHABLE_HINT = 'Check that the backend is running.';
export const UNREACHABLE_MESSAGE = `${UNREACHABLE_TITLE}. ${UNREACHABLE_HINT}`;

/** Statuses a proxy or gateway returns when the service behind it is down. */
const GATEWAY_STATUSES: ReadonlySet<number> = new Set([502, 503, 504]);

/** A failed API call. `status` is 0 when no response arrived at all. */
export class ApiError extends Error {
  readonly status: number;
  /** True when the Turnaround backend itself answered with a `{"detail": …}` error body. */
  readonly fromBackend: boolean;

  constructor(status: number, message: string, fromBackend = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fromBackend = fromBackend;
  }

  /**
   * True when the backend could not be reached: a network failure, or a gateway error from a
   * proxy. A 502 or 503 that the backend sent itself (e.g. the co-pilot's) is a real answer.
   */
  get isUnreachable(): boolean {
    return this.status === 0 || (GATEWAY_STATUSES.has(this.status) && !this.fromBackend);
  }

  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }
}

export function isNotFoundError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

export function isUnreachableError(error: unknown): boolean {
  return error instanceof ApiError && error.isUnreachable;
}

/** A sentence describing any error, suitable to show to the hiker. */
export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Something went wrong. Try again.';
}

function isApiErrorBody(body: unknown): body is ApiErrorBody {
  return typeof body === 'object' && body !== null && 'detail' in body;
}

async function toApiError(response: Response): Promise<ApiError> {
  const body: unknown = await response.json().catch(() => null);
  if (isApiErrorBody(body)) {
    const message =
      typeof body.detail === 'string'
        ? body.detail
        : `The planner couldn’t read that request: ${body.detail.map((issue) => issue.msg).join('; ')}.`;
    return new ApiError(response.status, message, true);
  }
  // A gateway error without our JSON body comes from a proxy: the backend is down.
  if (GATEWAY_STATUSES.has(response.status)) {
    return new ApiError(response.status, UNREACHABLE_MESSAGE);
  }
  return new ApiError(response.status, `The planner had a problem (error ${response.status}).`);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch (error) {
    // A cancelled request is not an outage; let TanStack Query handle the abort.
    if (init.signal?.aborted) throw error;
    throw new ApiError(0, UNREACHABLE_MESSAGE);
  }

  if (!response.ok) throw await toApiError(response);
  const body: unknown = await response.json();
  return body as T;
}

export interface SweepParams {
  trailId: string;
  date: IsoDate;
  fitness: Fitness;
  headlamp: boolean;
  traction: boolean;
}

export const api = {
  health: (signal?: AbortSignal) => request<HealthResponse>('/health', { signal }),

  trails: (signal?: AbortSignal) => request<TrailSummary[]>('/trails', { signal }),

  trail: (trailId: string, signal?: AbortSignal) =>
    request<Trail>(`/trails/${encodeURIComponent(trailId)}`, { signal }),

  sweep: ({ trailId, date, fitness, headlamp, traction }: SweepParams, signal?: AbortSignal) => {
    const query = new URLSearchParams({
      date,
      fitness,
      headlamp: String(headlamp),
      traction: String(traction),
    });
    return request<SweepResponse>(
      `/trails/${encodeURIComponent(trailId)}/sweep?${query.toString()}`,
      { signal },
    );
  },

  /** Plans are idempotent on the server: the same request always returns the same plan. */
  createPlan: (plan: PlanRequest, signal?: AbortSignal) =>
    request<PlanResponse>('/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plan),
      signal,
    }),

  plan: (planId: string, signal?: AbortSignal) =>
    request<PlanResponse>(`/plans/${encodeURIComponent(planId)}`, { signal }),

  copilot: (body: CopilotRequest) =>
    request<CopilotResponse>('/copilot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
};
