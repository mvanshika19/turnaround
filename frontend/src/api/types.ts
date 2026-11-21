/**
 * API contract types. Mirrors `backend/app/contracts.py` field for field.
 *
 * Times are Vancouver wall-clock strings ("HH:MM") and dates are ISO strings
 * ("YYYY-MM-DD"). Display them as given; never convert time zones in the browser.
 */

/** Vancouver wall-clock time, "HH:MM". */
export type LocalTime = string;

/** ISO calendar date, "YYYY-MM-DD". */
export type IsoDate = string;

export type Fitness = 'relaxed' | 'average' | 'fast';
export type Difficulty = 'easy' | 'moderate' | 'hard';
export type VerdictLevel = 'go' | 'caution' | 'no_go';
export type SegmentStatus = 'daylight' | 'snow' | 'dark';
export type DataSource = 'mock' | 'model';

export interface Coordinate {
  lat: number;
  lon: number;
}

export interface TrailPoint {
  km: number;
  lat: number;
  lon: number;
  ele_m: number;
}

export interface TrailSummary {
  id: string;
  name: string;
  area: string;
  difficulty: Difficulty;
  /** Round-trip distance. */
  distance_km: number;
  gain_m: number;
  max_elevation_m: number;
  trailhead: Coordinate;
  summit: Coordinate;
  /** True when the route geometry is a placeholder. */
  is_sample: boolean;
}

export interface Trail extends TrailSummary {
  /** Outbound route, trailhead to top. Every trail is hiked out and back. */
  points: TrailPoint[];
}

export interface Gear {
  headlamp: boolean;
  traction: boolean;
}

export interface PlanRequest {
  trail_id: string;
  date: IsoDate;
  start: LocalTime;
  fitness: Fitness;
  profile_id: string | null;
  gear: Gear;
}

export interface PlanPoint {
  km: number;
  lat: number;
  lon: number;
  ele_m: number;
  eta_up: LocalTime;
  eta_down: LocalTime;
  eta_down_p90: LocalTime;
  temp_c: number | null;
  status: SegmentStatus;
}

export interface PlanSummary {
  start: LocalTime;
  top_eta: LocalTime;
  finish_p50: LocalTime;
  finish_p90: LocalTime;
  sunset: LocalTime;
  last_light: LocalTime;
  turnaround_by: LocalTime;
  duration_p50_min: number;
  duration_p90_min: number;
  snow_line_m: number | null;
}

export interface Reason {
  code: string;
  level: VerdictLevel;
  message: string;
}

export interface Verdict {
  level: VerdictLevel;
  reasons: Reason[];
}

export interface PlanResponse {
  plan_id: string;
  /** ISO 8601 UTC timestamp. */
  created_at: string;
  source: DataSource;
  request: PlanRequest;
  trail: TrailSummary;
  utc_offset: string;
  summary: PlanSummary;
  verdict: Verdict;
  points: PlanPoint[];
}

export interface SweepItem {
  start: LocalTime;
  level: VerdictLevel;
  finish_p90: LocalTime;
}

export interface SweepResponse {
  trail_id: string;
  date: IsoDate;
  source: DataSource;
  interval_min: number;
  items: SweepItem[];
  latest_go_start: LocalTime | null;
}

export interface HealthResponse {
  status: 'ok';
  version: string;
  planner: DataSource;
  timezone: string;
  /** Vancouver's current date. Use this instead of the browser clock. */
  today: IsoDate;
  /** True when an OpenAI API key is configured on the server. */
  copilot_enabled: boolean;
}

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface CopilotRequest {
  messages: ChatMessage[];
  /** The plan currently on screen, if any. */
  context: PlanRequest | null;
}

export interface ToolCallSummary {
  name: string;
  /** What the tool did, e.g. "Checked start times for Lynn Peak". */
  label: string;
}

export interface CopilotResponse {
  reply: string;
  tool_calls: ToolCallSummary[];
  /** A plan the co-pilot recommends; apply it to the planner. */
  suggested_request: PlanRequest | null;
}

/** FastAPI error body. */
export interface ApiErrorBody {
  detail: string | Array<{ loc: Array<string | number>; msg: string; type: string }>;
}
