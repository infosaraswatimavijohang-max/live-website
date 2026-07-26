/* EXAM PORTAL HELPER
   Column selection enforcement, in-memory cache, debounce, monitoring. */

const EXAM_COLUMNS = {
  classes: 'id,class_label,grade,academic_year',
  subjects: 'id,subject_name,class_id,subject_code,display_order,show_in_gradesheet',
  teachers: 'id,full_name,phone,email,qualification,designation,joining_date,address,username,password,class_teacher_of,photo_url',
  students: 'id,full_name,school_roll_no,class_id,student_id,serial_no,current_class,dob,gender,father_name,mother_name,guardian_contact,address,blood_group,username,password,photo_url',
  exams: 'id,name,start_date,end_date,result_date,subject_marks,created_at',
  marks: 'id,exam_id,student_id,subject_id,theory,practical',
  images: 'id,owner_type,owner_id,public_url',
};

function examCols(table) {
  return EXAM_COLUMNS[table] || '*';
}

/* In-memory cache with TTL for slow-changing data (classes, subjects) */
const examCache = {
  _store: {},
  _defaultTTL: 600000,
  _tableTTLs: { classes: 300000, subjects: 300000, exams: 60000 },

  get(table, id) {
    const key = table + '|' + (id || 'all');
    const entry = this._store[key];
    if (entry && Date.now() < entry.expires) return entry.data;
    return null;
  },

  set(table, data, id) {
    const key = table + '|' + (id || 'all');
    const ttl = this._tableTTLs[table] || this._defaultTTL;
    this._store[key] = { data, expires: Date.now() + ttl };
  },

  invalidate(table) {
    for (const key of Object.keys(this._store)) {
      if (key.startsWith(table + '|')) delete this._store[key];
    }
  },

  invalidateAll() { this._store = {}; },

  async remember(table, fetcher, id) {
    const cached = this.get(table, id);
    if (cached !== null && cached !== undefined) return cached;
    const fresh = await fetcher();
    this.set(table, fresh, id);
    return fresh;
  }
};

/* Request deduplication: same params coalesced into one promise */
const _examInFlight = new Map();

function examDedup(key, fetcher) {
  if (_examInFlight.has(key)) return _examInFlight.get(key);
  const p = fetcher().finally(() => _examInFlight.delete(key));
  _examInFlight.set(key, p);
  return p;
}

/* Debounce for search inputs */
function examDebounce(fn, ms) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms || 300);
  };
}

/* Wraps supabase select with column selection + optional cache */
function examSelect(client, table, opts = {}) {
  const columns = opts.columns || examCols(table);
  const query = client.from(table).select(columns);
  if (opts.order) query.order(opts.order);
  if (opts.ascending !== undefined) {
    const lastOrder = opts.order || 'id';
    query.order(lastOrder, { ascending: opts.ascending });
  }
  if (opts.limit) query.limit(opts.limit);
  if (opts.range) query.range(opts.range[0], opts.range[1]);
  if (opts.eq) {
    for (const [col, val] of Object.entries(opts.eq)) query.eq(col, val);
  }
  if (opts.in) {
    for (const [col, vals] of Object.entries(opts.in)) {
      if (vals.length) query.in(col, vals);
    }
  }
  return query;
}

/* Wrap a single-row insert with explicit return columns */
function examInsert(client, table, payload, returnColumns) {
  const cols = returnColumns || 'id';
  return client.from(table).insert(payload).select(cols).single();
}

/* Simple performance monitor for bandwidth tracking */
window.examMonitor = {
  requests: 0,
  bytesDown: 0,
  kBThreshold: 10,
  log(type, bytes) {
    this.requests++;
    if (type === 'down') this.bytesDown += bytes;
  },
  getReport() {
    return {
      requests: this.requests,
      bytesDownKB: Math.round(this.bytesDown / 1024),
      bytesDown: this.bytesDown,
    };
  },
  reset() {
    this.requests = 0;
    this.bytesDown = 0;
  },
};

/* Wraps a supabase response to count bytes */
async function examCountBytes(promise) {
  const start = performance.now();
  const result = await promise;
  const elapsed = performance.now() - start;
  if (result.data && typeof result.data !== 'string') {
    const size = JSON.stringify(result.data).length;
    examMonitor.log('down', size);
  }
  if (result.count !== undefined) {
    examMonitor.log('down', 64);
  }
  if (elapsed > 500) {
    console.warn('[exam-helper] slow query (' + Math.round(elapsed) + 'ms)');
  }
  return result;
}
