const SUPABASE_URL = 'https://hryhtimgiatwwdtgbtph.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhyeWh0aW1naWF0d3dkdGdidHBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4MTU4NjEsImV4cCI6MjEwMDM5MTg2MX0.NG848r1SBGTos4wBN2n7fwKSypX7GeP2BbvBEiQGyks';

const supabase = (() => {
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  function buildUrl(table, opts = {}) {
    let url = SUPABASE_URL + '/rest/v1/' + table;
    const params = [];
    if (opts.select) params.push('select=' + encodeURIComponent(opts.select));
    if (opts.order) params.push('order=' + encodeURIComponent(opts.order));
    if (opts.limit) params.push('limit=' + opts.limit);
    if (opts.id) params.push('id=eq.' + encodeURIComponent(String(opts.id)));
    if (opts.eq) params.push(opts.eq.column + '=eq.' + encodeURIComponent(String(opts.eq.value)));
    if (params.length) url += '?' + params.join('&');
    return url;
  }

  return {
    async select(table, opts = {}) {
      const url = buildUrl(table, { select: '*', ...opts });
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error('Supabase select ' + table + ': ' + res.statusText);
      const data = await res.json();
      return { data, error: null };
    },

    async get(table, id) {
      const url = buildUrl(table, { select: '*', id });
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error('Supabase get ' + table + ': ' + res.statusText);
      const data = await res.json();
      return { data: data[0] || null, error: null };
    },

    async insert(table, record) {
      const url = buildUrl(table, { select: '*' });
      const body = Array.isArray(record) ? record : { ...record };
      const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Supabase insert ' + table + ': ' + res.statusText);
      const data = await res.json();
      return { data: Array.isArray(data) ? data[0] : data, error: null };
    },

    async update(table, id, updates) {
      const url = buildUrl(table, { select: '*', id });
      const res = await fetch(url, { method: 'PATCH', headers, body: JSON.stringify(updates) });
      if (!res.ok) throw new Error('Supabase update ' + table + ': ' + res.statusText);
      const data = await res.json();
      return { data: data[0] || null, error: null };
    },

    async upsert(table, records) {
      const url = buildUrl(table, { select: '*' });
      const body = Array.isArray(records) ? records : [records];
      const res = await fetch(url, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error('Supabase upsert ' + table + ': ' + res.statusText);
      const data = await res.json();
      return { data, error: null };
    },

    async delete(table, id) {
      const url = buildUrl(table, { id });
      const res = await fetch(url, { method: 'DELETE', headers });
      if (!res.ok) throw new Error('Supabase delete ' + table + ': ' + res.statusText);
      return { error: null };
    },

    async clear(table) {
      const url = SUPABASE_URL + '/rest/v1/' + table;
      const res = await fetch(url, { method: 'DELETE', headers: { ...headers, 'Prefer': 'return=minimal' } });
      if (!res.ok) throw new Error('Supabase clear ' + table + ': ' + res.statusText);
      return { error: null };
    }
  };
})();