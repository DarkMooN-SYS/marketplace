export const DEVICE_BREAKPOINTS = {
  mobile: 0,
  notebook: 1024,
  computer: 1440,
} as const;

export type DeviceKey = keyof typeof DEVICE_BREAKPOINTS;

export const DEVICE_ORDER: DeviceKey[] = ['mobile', 'notebook', 'computer'];

export const DEVICE_MEDIA_QUERIES: Record<DeviceKey, string> = {
  mobile: `(min-width: ${DEVICE_BREAKPOINTS.mobile}px)`,
  notebook: `(min-width: ${DEVICE_BREAKPOINTS.notebook}px)`,
  computer: `(min-width: ${DEVICE_BREAKPOINTS.computer}px)`,
};

export function resolveDeviceType(width: number): DeviceKey {
  if (width >= DEVICE_BREAKPOINTS.computer) {
    return 'computer';
  }

  if (width >= DEVICE_BREAKPOINTS.notebook) {
    return 'notebook';
  }

  return 'mobile';
}
