import { execSync } from 'child_process';

/**
 * Read a string value from the HKCU\Software\Strategem 1.0 registry hive.
 * Falls back to `defaultValue` on any error or on non-Windows platforms.
 */
export function getRegistryValue(valueName: string, defaultValue: string): string {
  if (process.platform !== 'win32') return defaultValue;
  try {
    const stdout = execSync(
      `reg query "HKCU\\Software\\Strategem 1.0" /v "${valueName}"`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
    );
    const lines = stdout.split('\n');
    for (const line of lines) {
      if (line.includes(valueName)) {
        const parts = line.split('REG_SZ');
        if (parts.length > 1) {
          return parts[1].trim();
        }
      }
    }
    return defaultValue;
  } catch {
    return defaultValue;
  }
}
