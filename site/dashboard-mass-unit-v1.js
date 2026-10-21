// The checked-in China dashboard JSON is in thousand tonnes. Convert only at
// the presentation boundary; selection thresholds still use its raw values.
export function wanTFromKt(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number / 10 : null;
}

export function wanTSeriesFromKt(series) {
  return (series || []).map((point) => ({ ...point, valueKt: wanTFromKt(point.valueKt) }));
}
