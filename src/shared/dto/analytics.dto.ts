/** Row shape of `v_analytics_funnel` (single row). Keep in sync with the view SQL in drizzle/. */
export interface FunnelRow {
  total: number;
  applied: number;
  replied: number;
  interviewing: number;
  offers: number;
  rejected: number;
  spendMicros: number;
}
