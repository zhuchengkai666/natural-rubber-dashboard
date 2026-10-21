// Source attempts are not dates with usable ranking data. Explicit zero is a real value.
export function rankGroupHasContent(group) {
  return Array.isArray(group?.rows) && group.rows.some(row => Array.isArray(row) &&
    [[row[1], row[2]], [row[4], row[5]]].some(([member, value]) =>
      typeof member === "string" && member.trim() && value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value))));
}

export function availableRankDates(data, productCode) {
  return [...new Set((data?.groups || []).filter(group => group.productCode === productCode &&
    /^\d{4}-\d{2}-\d{2}$/.test(group.date) && rankGroupHasContent(group)).map(group => group.date))].sort().reverse();
}

export function availableRankContracts(data, productCode, date) {
  return [...new Set((data?.groups || []).filter(group => group.productCode === productCode &&
    group.date === date && rankGroupHasContent(group)).map(group => group.contractCode))].sort();
}

export function rankDateAfterLoad(data, productCode, selectedDate, followLatest = false) {
  const dates = availableRankDates(data, productCode);
  return !followLatest && dates.includes(selectedDate) ? selectedDate : dates[0] || "";
}
