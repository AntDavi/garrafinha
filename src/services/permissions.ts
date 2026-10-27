import { Camera, type PermissionResponse } from 'expo-camera';

export type CameraPermission = 'granted' | 'denied' | 'undetermined' | 'blocked';

function toStatus(p: PermissionResponse): CameraPermission {
  if (p.granted) return 'granted';
  // Negado sem poder perguntar de novo: só pelas configurações do sistema.
  if (p.status === 'denied' && !p.canAskAgain) return 'blocked';
  return p.status === 'denied' ? 'denied' : 'undetermined';
}

export async function getCameraPermission(): Promise<CameraPermission> {
  return toStatus(await Camera.getCameraPermissionsAsync());
}

/** Pede a permissão de câmera (foto do prato e código de barras). */
export async function requestCameraPermission(): Promise<CameraPermission> {
  return toStatus(await Camera.requestCameraPermissionsAsync());
}
