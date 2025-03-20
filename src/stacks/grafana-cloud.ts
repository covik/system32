import * as grafana from '@pulumiverse/grafana';
import memoryAllocationDashboardJSON from '../memory-allocation-dashboard.json';

export function resources(): unknown {
  const dashboard = new grafana.oss.Dashboard(
    'cluster-resource-allocation-overview',
    {
      configJson: JSON.stringify(memoryAllocationDashboardJSON),
      overwrite: true,
    },
  );

  return {
    resourceAllocationDashboard: dashboard.url,
  };
}
