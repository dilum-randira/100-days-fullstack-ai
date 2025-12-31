export interface SLOConfigItem {
  availability: number; // percentage e.g., 99.9
  latencyP95Ms: number;
  criticalEndpoints?: string[]; // path prefixes considered critical (writes allowed even on budget burn)
}

export interface SLOConfig {
  [service: string]: SLOConfigItem;
}

export const sloConfig: SLOConfig = {
  authService: {
    availability: 99.9,
    latencyP95Ms: 500,
    criticalEndpoints: ['/api/system', '/api/health', '/api/ready'],
  },
  inventoryApi: {
    availability: 99.9,
    latencyP95Ms: 500,
    criticalEndpoints: ['/api/system', '/api/health', '/api/ready'],
  },
};
