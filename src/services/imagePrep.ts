import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import type { PreparedImage } from './scanApi';

export const SCAN_IMAGE_WIDTH = 1024;
export const SCAN_IMAGE_COMPRESS = 0.6;

/** Redimensiona para 1024 px de largura e comprime em JPEG antes de enviar ao proxy. */
export async function prepareScanImage(uri: string): Promise<PreparedImage> {
  const context = ImageManipulator.manipulate(uri).resize({ width: SCAN_IMAGE_WIDTH });
  const image = await context.renderAsync();
  const result = await image.saveAsync({
    format: SaveFormat.JPEG,
    compress: SCAN_IMAGE_COMPRESS,
    base64: true,
  });
  if (!result.base64) throw new Error('Falha ao converter a imagem');
  return { base64: result.base64, mime: 'image/jpeg' };
}
