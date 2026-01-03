/**
 * Environment Configuration
 * 
 * Determines current environment based on URL/hostname.
 * Used for:
 * - Displaying environment badge in UI
 * - Preventing production connectors in non-production environments
 * - Showing sandbox warnings
 */

export type Environment = 'production' | 'staging' | 'development';

export interface EnvironmentConfig {
  name: Environment;
  label: string;
  color: 'default' | 'secondary' | 'destructive' | 'outline';
  isSandbox: boolean;
  allowsProductionConnectors: boolean;
}

const ENVIRONMENT_CONFIGS: Record<Environment, EnvironmentConfig> = {
  production: {
    name: 'production',
    label: 'Production',
    color: 'default',
    isSandbox: false,
    allowsProductionConnectors: true,
  },
  staging: {
    name: 'staging',
    label: 'Staging',
    color: 'secondary',
    isSandbox: true,
    allowsProductionConnectors: false,
  },
  development: {
    name: 'development',
    label: 'Development',
    color: 'outline',
    isSandbox: true,
    allowsProductionConnectors: false,
  },
};

/**
 * Detects the current environment based on hostname
 */
export function detectEnvironment(): Environment {
  const hostname = window.location.hostname;
  
  // Production indicators
  const productionHosts = [
    'clinicleader.com',
    'www.clinicleader.com',
    'app.clinicleader.com',
  ];
  
  // Staging indicators
  const stagingPatterns = [
    /staging\./i,
    /preview\./i,
    /\.lovable\.app$/i,  // Lovable preview URLs
  ];
  
  // Development indicators
  const developmentHosts = [
    'localhost',
    '127.0.0.1',
  ];
  
  // Check production first
  if (productionHosts.some(host => hostname === host || hostname.endsWith(`.${host}`))) {
    return 'production';
  }
  
  // Check development
  if (developmentHosts.some(host => hostname === host || hostname.startsWith(host))) {
    return 'development';
  }
  
  // Check staging patterns
  if (stagingPatterns.some(pattern => pattern.test(hostname))) {
    return 'staging';
  }
  
  // Default to development for unknown hosts (safer default)
  return 'development';
}

/**
 * Gets the full environment configuration
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  const env = detectEnvironment();
  return ENVIRONMENT_CONFIGS[env];
}

/**
 * Checks if the current environment is a sandbox
 */
export function isSandboxEnvironment(): boolean {
  return getEnvironmentConfig().isSandbox;
}

/**
 * Checks if production connectors can be activated in current environment
 */
export function canActivateProductionConnectors(): boolean {
  return getEnvironmentConfig().allowsProductionConnectors;
}

/**
 * Gets a user-friendly explanation of environment restrictions
 */
export function getEnvironmentRestrictionMessage(): string {
  const config = getEnvironmentConfig();
  
  if (config.isSandbox) {
    return `You are in a ${config.label.toLowerCase()} environment. Production data connectors cannot be activated here. Only sandbox/test connectors are permitted.`;
  }
  
  return '';
}
