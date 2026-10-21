import type { ManagementReport } from '@huitong/shared';

/**
 * Management reports by month. The head start binds
 * MockManagementReportsRepository (typed sample data); area 3 replaces it
 * with reports drawn from the consolidated runs and the employee master
 * (story D-5), and removes @ServesMockData() from the controller.
 */
export abstract class ManagementReportsRepository {
  /** Null when the month has no report yet. */
  abstract forPeriod(period: string): Promise<ManagementReport | null>;
}
