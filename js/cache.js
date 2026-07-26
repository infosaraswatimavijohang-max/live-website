/* OPTIMIZED CACHE MANAGER
   - LocalStorage + in-memory two-tier cache
   - Configurable TTL per key
   - Automatic garbage collection
   - Integrated with Supabase monitor
   - Cache size tracking
   - remember() helper with automatic caching */

const CacheManager = {
  _store: {},
  _timers: {},

  PREFIX: 'sss_cache_',
  DEFAULTS: {
    school: 86400000,
    profile: 3600000,
    examList: 1800000,
    subjects: 3600000,
    teachers: 3600000,
    staff: 3600000,
    gallery: 3600000,
    notices: 1800000,
    programs: 86400000,
    events: 1800000,
    testimonials: 3600000,
    stats: 3600000,
    settings: 86400000,
    about: 86400000,
    slides: 3600000,
    marquee: 3600000,
    short: 300000,
  },

  /* Calculate the effective TTL for a key, with optional override */
  _ttl(key, ttl) {
    if (ttl !== undefined) return ttl;
    const keyLower = key.toLowerCase();
    for (const [k, v] of Object.entries(this.DEFAULTS)) {
      if (keyLower.includes(k.toLowerCase())) return v;
    }
    return this.DEFAULTS.short;
  },

  get(key, ttl) {
    const now = Date.now();
    const cached = this._store[key];
    if (cached && now < cached.expires) {
      if (typeof SUPABASE_MONITOR !== 'undefined') SUPABASE_MONITOR.logCacheHit();
      return cached.data;
    }
    const stored = localStorage.getItem(this.PREFIX + key);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && now < parsed.expires) {
          this._store[key] = parsed;
          if (typeof SUPABASE_MONITOR !== 'undefined') SUPABASE_MONITOR.logCacheHit();
          return parsed.data;
        }
      } catch (e) {}
    }
    if (typeof SUPABASE_MONITOR !== 'undefined') SUPABASE_MONITOR.logCacheMiss();
    return null;
  },

  set(key, data, ttl) {
    ttl = this._ttl(key, ttl);
    const expires = Date.now() + ttl;
    const entry = { data, expires };
    this._store[key] = entry;
    try {
      localStorage.setItem(this.PREFIX + key, JSON.stringify(entry));
    } catch (e) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        this._garbageCollect();
        try { localStorage.setItem(this.PREFIX + key, JSON.stringify(entry)); } catch (e2) {}
      }
    }
  },

  invalidate(key) {
    delete this._store[key];
    localStorage.removeItem(this.PREFIX + key);
  },

  invalidateAll() {
    this._store = {};
    const keys = Object.keys(localStorage);
    for (const k of keys) {
      if (k.startsWith(this.PREFIX)) localStorage.removeItem(k);
    }
  },

  _garbageCollect() {
    const keys = Object.keys(localStorage);
    const cacheKeys = keys.filter(k => k.startsWith(this.PREFIX));
    const entries = cacheKeys.map(k => {
      try { return { key: k, entry: JSON.parse(localStorage.getItem(k)) }; } catch (e) { return null; }
    }).filter(Boolean);
    entries.sort((a, b) => a.entry.expires - b.entry.expires);
    const toRemove = entries.slice(0, Math.floor(entries.length / 3));
    for (const { key } of toRemove) {
      localStorage.removeItem(key);
      const short = key.slice(this.PREFIX.length);
      delete this._store[short];
    }
  },

  async remember(key, fetcher, ttl) {
    const cached = this.get(key);
    if (cached !== null && cached !== undefined) return cached;
    const fresh = await fetcher();
    this.set(key, fresh, ttl);
    return fresh;
  },

  get size() {
    let total = 0;
    const keys = Object.keys(localStorage);
    for (const k of keys) {
      if (k.startsWith(this.PREFIX)) {
        total += (localStorage.getItem(k) || '').length;
      }
    }
    return total;
  },

  get entryCount() {
    const keys = Object.keys(localStorage);
    return keys.filter(k => k.startsWith(this.PREFIX)).length;
  }
};
