// Human output. Pure functions: data in, text out.

export function formatRating(rating) {
  if (!rating || !rating.count) return 'no reviews';
  const noun = rating.count === 1 ? 'review' : 'reviews';
  return `${rating.value} (${rating.count} ${noun})`;
}

export function formatPhone(phone) {
  if (!phone) return 'no phone';
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(phone);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : phone;
}

export function formatSummary(count, { trade, city, state }) {
  const noun = count === 1 ? 'contractor' : 'contractors';
  return `${count} ${trade} ${noun} in ${city}, ${state}`;
}

export function formatRow(c) {
  const parts = [c.name, formatPhone(c.phone), formatRating(c.rating)];
  if (c.claimed) parts.push('claimed');
  parts.push(c.profileUrl);
  return parts.join('  |  ');
}

export function formatSearch(body, query) {
  const list = body?.contractors ?? [];
  if (list.length === 0) return 'No listed contractors match.';
  const state = list[0].state || query.state;
  const city = list[0].city || query.city;
  return [formatSummary(list.length, { ...query, city, state }), '', ...list.map(formatRow)].join('\n');
}

export function formatContractor(c) {
  const rows = [
    ['Name', c.name],
    ['Trades', (c.trades ?? []).join(', ')],
    ['City', `${c.city}, ${c.state}`],
    ['Phone', formatPhone(c.phone)],
    ['Website', c.website || 'none listed'],
    ['Rating', formatRating(c.rating)],
    ['Claimed', c.claimed ? 'yes' : 'no'],
    ['Profile', c.profileUrl],
  ];
  return rows.map(([label, value]) => `${(label + ':').padEnd(9)}${value}`).join('\n');
}
