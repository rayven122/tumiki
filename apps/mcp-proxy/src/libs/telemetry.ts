/**
 * OpenTelemetry統合
 */

import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

export type TelemetryConfig = {
  serviceName: string;
  serviceVersion: string;
  traceExporterEndpoint?: string;
  metricsPort?: number;
  enableTracing?: boolean;
  enableMetrics?: boolean;
};

const getDefaultTelemetryConfig = (): TelemetryConfig => ({
  serviceName: process.env.OTEL_SERVICE_NAME || "mcp-proxy-server",
  serviceVersion: process.env.OTEL_SERVICE_VERSION || "1.0.0",
  traceExporterEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  metricsPort: parseInt(process.env.OTEL_METRICS_PORT || "9464", 10),
  enableTracing: process.env.OTEL_ENABLE_TRACING !== "false",
  enableMetrics: process.env.OTEL_ENABLE_METRICS !== "false",
});

let sdk: NodeSDK | null = null;

export const initializeTelemetry = (
  config?: Partial<TelemetryConfig>,
): NodeSDK | null => {
  if (process.env.OTEL_ENABLED === "false") {
    console.info("OpenTelemetry is disabled by environment variable");
    return null;
  }

  try {
    const finalConfig = { ...getDefaultTelemetryConfig(), ...config };

    const resource = resourceFromAttributes({
      [ATTR_SERVICE_NAME]: finalConfig.serviceName,
      [ATTR_SERVICE_VERSION]: finalConfig.serviceVersion,
    });

    const traceExporter =
      finalConfig.enableTracing && finalConfig.traceExporterEndpoint
        ? new OTLPTraceExporter({
            url: finalConfig.traceExporterEndpoint,
          })
        : undefined;

    const metricsExporter = finalConfig.enableMetrics
      ? new PrometheusExporter({
          port: finalConfig.metricsPort,
        })
      : undefined;

    sdk = new NodeSDK({
      resource,
      traceExporter,
      metricReader: metricsExporter,
      instrumentations: [
        getNodeAutoInstrumentations({
          "@opentelemetry/instrumentation-http": {
            enabled: true,
          },
          "@opentelemetry/instrumentation-redis": {
            enabled: true,
          },
        }),
      ],
    });

    sdk.start();

    console.info("OpenTelemetry initialized");

    process.on("SIGTERM", async () => {
      try {
        await sdk?.shutdown();
        console.info("OpenTelemetry shut down successfully");
      } catch (error) {
        console.error("Error shutting down OpenTelemetry");
      }
    });

    return sdk;
  } catch (error) {
    console.error("Failed to initialize OpenTelemetry:", error);
    return null;
  }
};

export const getTelemetrySDK = (): NodeSDK | null => {
  return sdk;
};

export const shutdownTelemetry = async (): Promise<void> => {
  if (sdk) {
    try {
      await sdk.shutdown();
      console.info("OpenTelemetry shut down successfully");
      sdk = null;
    } catch (error) {
      console.error("Error shutting down OpenTelemetry");
    }
  }
};
