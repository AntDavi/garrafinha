/** Formata número no padrão pt-BR sem depender de Intl (consistente entre Hermes e Node). */
export function formatNumber(value: number, decimals = 0): string {
  const fixed = Math.abs(value).toFixed(decimals);
  const [int = '0', frac] = fixed.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const sign = value < 0 && Number(fixed) !== 0 ? '-' : '';
  return `${sign}${grouped}${frac ? `,${frac}` : ''}`;
}

export function formatSigned(value: number, decimals = 0): string {
  const s = formatNumber(value, decimals);
  return value > 0 && Number(Math.abs(value).toFixed(decimals)) !== 0 ? `+${s}` : s;
}

export function formatLiters(ml: number): string {
  return `${formatNumber(ml / 1000, 1)} L`;
}
