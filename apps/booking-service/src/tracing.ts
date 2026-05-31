import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { AWSXRayIdGenerator } from '@opentelemetry/id-generator-aws-xray';

process.env.OTEL_SERVICE_NAME = 'booking-service';

const traceExporter = new OTLPTraceExporter({
  // Using the ADOT Collector endpoint (deployed in the cluster)
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
});

export const otelSDK = new NodeSDK({
  traceExporter,
  instrumentations: [getNodeAutoInstrumentations()],
  idGenerator: new AWSXRayIdGenerator(), // Important for AWS X-Ray compatibility
});

process.on('SIGTERM', () => {
  otelSDK
    .shutdown()
    .then(
      () => console.log('OpenTelemetry shut down successfully'),
      (err) => console.error('Error shutting down OpenTelemetry', err),
    )
    .finally(() => process.exit(0));
});
