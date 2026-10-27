import { printToFileAsync } from 'expo-print';
import { isAvailableAsync, shareAsync } from 'expo-sharing';

/** Gera o PDF A4 a partir do HTML do relatório e abre o compartilhamento. Retorna o URI do arquivo. */
export async function shareReportPdf(html: string): Promise<string> {
  const { uri } = await printToFileAsync({ html, width: 595, height: 842 });
  if (await isAvailableAsync()) {
    await shareAsync(uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: 'Relatório Garrafinha',
    });
  }
  return uri;
}
