import type { TransportType } from "@tumiki/db";

import type { runMcpSecurityScan } from "../utils/mcpScan";

/**
 * スキャン結果の型
 */
export interface ScanResult {
  serverId: string;
  serverName: string;
  organizationId: string;
  organizationName: string;
  transportType: TransportType;
  url: string | null;
  scanResult: Awaited<ReturnType<typeof runMcpSecurityScan>>;
  scanTime: Date;
}

/**
 * スキャンサマリーの型
 */
export interface ScanSummary {
  totalServers: number;
  scannedServers: number;
  failedScans: number;
  criticalIssues: number;
  warnings: number;
  toxicFlows: number;
  scanResults: ScanResult[];
}

/**
 * 組織レポートデータの型
 */
export interface OrganizationReportData {
  name: string;
  results: ScanResult[];
}
