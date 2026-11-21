const wholeNumber = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** "4.5 km" */
export function formatKm(km: number): string {
  return `${oneDecimal.format(km)} km`;
}

/** "1,015 m" */
export function formatMeters(meters: number): string {
  return `${wholeNumber.format(meters)} m`;
}
