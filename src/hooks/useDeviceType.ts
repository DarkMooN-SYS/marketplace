import { useEffect, useState } from 'react';
import {
  DEVICE_ORDER,
  DeviceKey,
  resolveDeviceType,
} from '../constants/deviceBreakpoints';

const DEFAULT_DEVICE: DeviceKey = 'computer';

export function useDeviceType(initialDevice: DeviceKey = DEFAULT_DEVICE): DeviceKey {
  const [deviceType, setDeviceType] = useState<DeviceKey>(() => {
    if (typeof window === 'undefined') {
      return initialDevice;
    }

    return resolveDeviceType(window.innerWidth);
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleResize = () => {
      setDeviceType(resolveDeviceType(window.innerWidth));
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return deviceType;
}

export function useIsDeviceAtLeast(target: DeviceKey, initialDevice: DeviceKey = DEFAULT_DEVICE): boolean {
  const deviceType = useDeviceType(initialDevice);
  return DEVICE_ORDER.indexOf(deviceType) >= DEVICE_ORDER.indexOf(target);
}
