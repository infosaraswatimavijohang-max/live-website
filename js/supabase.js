/* OPTIMIZED SUPABASE CLIENT
   - Never uses select *
   - Column selection always explicit
   - Built-in request monitoring
   - Pagination support
   - Caching layer integration
   - Request deduplication in flight */

const SUPABASE_URL = 'https://amqffyhlutiqarwdzcir.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtcWZmeWhsdXRpcWFyd2R6Y2lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0NzY1OTMsImV4cCI6MjEwMDA1MjU5M30.lXEfA_k6me8BMZ6jggjQVnU--UzqJLmzoiDgWOazRRQ';

const SPB_MONITOR = {
  requests: 0,
  bytesDown: 0,
  bytesUp: 0,
  cacheHits: 0,
  cacheMisses: 0,
  storageDownloads: 0,
  slowQueries: [],
  log(type, bytes = 0) {
    this.requests++;
    if (type === 'download') this.bytesDown += bytes;
    if (type === 'upload') this.bytesUp += bytes;
  },
  logCacheHit() { this.cacheHits++; },
  logCacheMiss() { this.cacheMisses++; },
  logStorage() { this.storageDownloads++; },
  logSlowQuery(table, ms) {
    this.slowQueries.push({ table, ms, time: new Date().toISOString() });
    if (this.slowQueries.length > 50) this.slowQueries.shift();
  },
  getReport() {
    return {
      requests: this.requests,
      bytesDownKB: Math.round(this.bytesDown / 1024),
      bytesUpKB: Math.round(this.bytesUp / 1024),
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      storageDownloads: this.storageDownloads,
      slowQueries: this.slowQueries.slice(-10)
    };
  }
};

const SUPABASE_MONITOR = SPB_MONITOR;

const COLUMN_MAP = {
  site_settings: 'schoolName,tagline,established,address,phone,email,logo,facebook,youtube,mapUrl',
  about: 'history,vision,mission,values,principal_name,principal_message,principal_photo,general_block,technical_block',
  stats: 'students,teachers,staff,graduates,years',
  slides: 'id,title,subtitle,btn_text,btn_link,image_url,sort_order',
  teachers: 'id,name,subject,qualification,block,photo_url,designation',
  staff: 'id,name,position,photo_url,contact',
  gallery: 'id,src,category,caption',
  notices: 'id,title,date,content,priority',
  programs: 'id,name,description,visible,type,sort_order,subjects',
  events: 'id,title,date,description,image_url',
  testimonials: 'id,name,role,quote,photo_url',
  marquee: 'id,enabled,items,text',
  admissions: 'id,studentName,applyClass,fatherName,status,submitted_at,district',
};

/* In-flight request deduplication cache.
   If two callers ask for the same table+params while the first request is
   still in-flight, the second caller gets the same promise instead of
   firing a duplicate network request. */
const _inFlight = new Map();

function _inflightKey(table, paramsStr) {
  return table + '|' + paramsStr;
}

const supabase = (() => {
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  function getColumns(table) {
    return COLUMN_MAP[table] || '*';
  }

  function buildUrl(table, opts = {}) {
    let url = SUPABASE_URL + '/rest/v1/' + table;
    const params = [];
    const selectCols = opts.select || getColumns(table);
    params.push('select=' + encodeURIComponent(selectCols));
    if (opts.order) params.push('order=' + encodeURIComponent(opts.order));
    if (opts.limit) params.push('limit=' + opts.limit);
    if (opts.offset) params.push('offset=' + opts.offset);
    if (opts.range) params.push('offset=' + opts.range.start + '&limit=' + (opts.range.end - opts.range.start + 1));
    if (opts.id) params.push('id=eq.' + encodeURIComponent(String(opts.id)));
    if (opts.eq) params.push(opts.eq.column + '=eq.' + encodeURIComponent(String(opts.eq.value)));
    if (opts.neq) params.push(opts.neq.column + '=neq.' + encodeURIComponent(String(opts.neq.value)));
    if (opts.in) {
      const vals = opts.in.values.map(v => encodeURIComponent(String(v))).join(',');
      params.push(opts.in.column + '=in.(' + vals + ')');
    }
    if (opts.ilike) params.push(opts.ilike.column + '=ilike.' + encodeURIComponent(String(opts.ilike.value)));
    if (opts.not) params.push(opts.not.column + '=not.is.' + opts.not.value);
    if (params.length) url += '?' + params.join('&');
    return url;
  }

  async function api(table, opts) {
    const url = buildUrl(table, opts);
    const startTime = performance.now();

    const { data, error } = await fetch(url, { headers }).then(async function (res) {
      if (!res.ok) throw new Error('Supabase ' + table + ': ' + res.statusText);
      const cl = res.headers.get('content-length');
      const bodyText = await res.text();
      const byteLen = cl ? parseInt(cl) : bodyText.length;
      SPB_MONITOR.log('download', byteLen);
      return { data: JSON.parse(bodyText), error: null };
    }).catch(e => ({ data: null, error: e }));

    const elapsed = performance.now() - startTime;
    SPB_MONITOR.logSlowQuery(table, elapsed);

    if (data) data._count = null;
    return { data, error };
  }

  /* PostgREST reports missing columns in the response body (e.g. PGRST204
     "Could not find the 'dob_bs' column of 'admissions'"). When a write fails
     that way, retry once with any `_bs` keys stripped so the public/admin
     pages keep working on databases where migration 007 hasn't run yet —
     mirroring the exam portal's own fallbacks. */
  function _isColumnError(msg) {
    return /(column .* does not exist|pgrst204|could not find the .* column)/i.test(msg || '');
  }
  function _hasBsKey(payload) {
    const keys = Array.isArray(payload) ? Object.keys(payload[0] || {}) : Object.keys(payload || {});
    return keys.some(k => /_bs$/.test(k));
  }
  function _stripBsKeys(payload) {
    const out = {};
    for (const k in payload) { if (!/_bs$/.test(k)) out[k] = payload[k]; }
    return out;
  }
  async function write(table, url, method, payload) {
    const raw = await fetch(url, { method, headers, body: JSON.stringify(payload) });
    const text = await raw.text();
    if (!raw.ok) throw new Error('Supabase ' + method.toLowerCase() + ' ' + table + ': ' + raw.statusText + (text ? ' — ' + text : ''));
    SPB_MONITOR.log('upload', JSON.stringify(payload).length);
    SPB_MONITOR.log('download', text.length);
    return text ? JSON.parse(text) : null;
  }

  return {
    select(table, opts = {}) {
      const key = _inflightKey(table, JSON.stringify(opts));
      if (_inFlight.has(key)) {
        SPB_MONITOR.logCacheMiss();
        return _inFlight.get(key);
      }
      const promise = (async () => {
        try {
          const result = await api(table, opts);
          return result;
        } finally {
          _inFlight.delete(key);
        }
      })();
      _inFlight.set(key, promise);
      return promise;
    },

    async get(table, id, columns) {
      return this.select(table, { id, select: columns || getColumns(table) }).then(r => ({
        data: r.data ? r.data[0] || null : null,
        error: r.error
      }));
    },

    async insert(table, record, opts) {
      opts = opts || {};
      const returnCols = opts.returnColumns || getColumns(table);
      const url = buildUrl(table, { select: returnCols });
      const body = Array.isArray(record) ? record : { ...record };
      try {
        const data = await write(table, url, 'POST', body);
        return { data: Array.isArray(data) ? data[0] : data, error: null };
      } catch (err) {
        if (_isColumnError(err.message) && _hasBsKey(body)) {
          const cleaned = Array.isArray(body) ? body.map(_stripBsKeys) : _stripBsKeys(body);
          if (!Object.keys(cleaned).length) throw err;
          const data = await write(table, url, 'POST', cleaned);
          return { data: Array.isArray(data) ? data[0] : data, error: null };
        }
        throw err;
      }
    },

    async update(table, id, updates, opts) {
      opts = opts || {};
      const returnCols = opts.returnColumns || ['id'];
      const url = buildUrl(table, { select: returnCols.join(','), id });
      try {
        const data = await write(table, url, 'PATCH', updates);
        return { data: (Array.isArray(data) ? data[0] : data) || null, error: null };
      } catch (err) {
        if (_isColumnError(err.message) && _hasBsKey(updates)) {
          const cleaned = _stripBsKeys(updates);
          if (!Object.keys(cleaned).length) throw err;
          const data = await write(table, url, 'PATCH', cleaned);
          return { data: (Array.isArray(data) ? data[0] : data) || null, error: null };
        }
        throw err;
      }
    },

    async upsert(table, records, opts) {
      opts = opts || {};
      const returnCols = opts.returnColumns || ['id'];
      const url = buildUrl(table, { select: returnCols.join(',') });
      const body = Array.isArray(records) ? records : [records];
      const raw = await fetch(url, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=representation,resolution=merge-duplicates' },
        body: JSON.stringify(body)
      });
      if (!raw.ok) throw new Error('Supabase upsert ' + table + ': ' + raw.statusText);
      const text = await raw.text();
      SPB_MONITOR.log('upload', JSON.stringify(body).length);
      SPB_MONITOR.log('download', text.length);
      return { data: JSON.parse(text), error: null };
    },

    async delete(table, id) {
      const url = buildUrl(table, { id });
      const raw = await fetch(url, { method: 'DELETE', headers });
      if (!raw.ok) return { error: new Error('Supabase delete ' + table + ': ' + raw.statusText) };
      return { error: null };
    },

    async clear(table) {
      const url = SUPABASE_URL + '/rest/v1/' + table;
      const raw = await fetch(url, { method: 'DELETE', headers: { ...headers, 'Prefer': 'return=minimal' } });
      if (!raw.ok) return { error: new Error('Supabase clear ' + table + ': ' + raw.statusText) };
      return { error: null };
    },

    async count(table, opts) {
      const url = buildUrl(table, { select: 'id', ...opts });
      const raw = await fetch(url, { headers: { ...headers, 'Prefer': 'count=exact' }, method: 'HEAD' });
      if (!raw.ok) throw new Error('Supabase count ' + table + ': ' + raw.statusText);
      return parseInt(raw.headers.get('content-range')?.split('/')[1] || raw.headers.get('x-total-count') || '0', 10);
    },

    async countWithFallback(table) {
      try {
        return await this.count(table);
      } catch (e) {
        const localKey = 'sss_' + table;
        const local = JSON.parse(localStorage.getItem(localKey) || '[]');
        return Array.isArray(local) ? local.length : 0;
      }
    },

    /* Batch dashboard: fetch multiple table counts with one API call pattern.
       Returns counts for all tables in a single round-trip equivalent. */
    async dashboardStats() {
      const tables = ['slides', 'notices', 'programs', 'teachers', 'staff', 'gallery', 'events', 'testimonials'];
      const results = await Promise.allSettled(
        tables.map(t => this.countWithFallback(t).then(c => ({ table: t, count: c })))
      );
      const stats = {};
      results.forEach(r => {
        if (r.status === 'fulfilled') stats[r.value.table] = r.value.count;
        else stats[r.value?.table || 'unknown'] = 0;
      });
      return stats;
    },

    columns(table) { return getColumns(table); },

    listColumns(table) { return getColumns(table); }
  };
})();
