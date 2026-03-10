export function buildLineData(returns: { t: number, pct_return: number, date: string }[]) {
  if (!returns) return [];
  return returns.map(r => ({
    t: r.t,
    pct_return: r.pct_return,
    date: r.date
  }));
}

export function buildAggregateData(t_axis: number[], values: number[]) {
  if (!t_axis || !values) return [];
  return t_axis.map((t, i) => ({
    t,
    value: values[i]
  }));
}
