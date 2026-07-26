/* OPTIMIZED DATASTORE
   - Minimal column selection for all queries
   - Client-side cache with CacheManager
   - Batch API for dashboard (single round-trip)
   - Compressed image uploads (WebP, resize)
   - Optimized seed data */

const DataStore = {
  PREFIX: 'sss_',

  TABLES: {
    SETTINGS: 'site_settings',
    SLIDES: 'slides',
    ABOUT: 'about',
    STATS: 'stats',
    NOTICES: 'notices',
    PROGRAMS: 'programs',
    TEACHERS: 'teachers',
    STAFF: 'staff',
    STUDENTS: 'students',
    GALLERY: 'gallery',
    EVENTS: 'events',
    TESTIMONIALS: 'testimonials',
    MARQUEE: 'marquee',
    ADMISSIONS: 'admissions'
  },

  _cache: {},
  _prevKeys: {},

  getColumns(key) {
    const table = this.TABLES[key] || key;
    return supabase.columns(table);
  },

  async get(key, opts) {
    opts = opts || {};
    const table = this.TABLES[key] || key;
    if (this._cache[key] && !opts.force) return this._cache[key];

    const cached = CacheManager.get(key);
    if (cached !== null && !opts.force) {
      this._cache[key] = cached;
      return cached;
    }

    const qOpts = { ...opts };
    if (!qOpts.select) qOpts.select = this.getColumns(key);

    try {
      const { data } = await supabase.select(table, qOpts);
      let result;
      if (table === 'site_settings') {
        result = data && data.length ? data[0] : null;
        if (result) delete result.id;
      } else if (table === 'marquee') {
        result = data && data.length ? data[0] : null;
        if (result) { result.items = typeof result.items === 'string' ? JSON.parse(result.items) : (result.items || []); delete result.id; }
      } else {
        result = data || [];
      }
      this._cache[key] = result;
      CacheManager.set(key, result);
      return result;
    } catch (e) {
      console.warn('Supabase fallback to localStorage for ' + key, e);
      const local = localStorage.getItem(this.PREFIX + key);
      return local ? JSON.parse(local) : null;
    }
  },

  /* Batch fetch only counts for dashboard - single API pattern */
  async getDashboardStats() {
    try {
      return await supabase.dashboardStats();
    } catch (e) {
      console.warn('Dashboard stats fallback:', e);
      return {};
    }
  },

  async set(key, value) {
    const table = this.TABLES[key] || key;
    this._cache[key] = value;
    CacheManager.invalidate(key);
    try {
      if (table === 'site_settings' || table === 'about' || table === 'stats' || table === 'marquee') {
        const record = { id: 1, ...value };
        const { data: existing } = await supabase.select(table, { id: 1, select: 'id' });
        if (existing && existing.length) {
          await supabase.update(table, 1, record);
        } else {
          await supabase.insert(table, record);
        }
      } else {
        const records = Array.isArray(value) ? value : [];
        for (const item of records) {
          if (item.id) {
            const { data: found } = await supabase.select(table, { id: item.id, select: 'id' });
            if (found && found.length) {
              await supabase.update(table, item.id, item);
            } else {
              await supabase.insert(table, item);
            }
          } else {
            await supabase.insert(table, item);
          }
        }
        const removedIds = (this._prevKeys[key])
          ? this._prevKeys[key].filter(p => !records.some(r => r.id === p.id)).map(p => p.id)
          : [];
        for (const rid of removedIds) {
          await supabase.delete(table, rid);
        }
        this._prevKeys[key] = records;
      }
      localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.warn('Supabase write fallback to localStorage for ' + key, e);
      localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
    }
  },

  async push(key, item) {
    const table = this.TABLES[key] || key;
    item.id = item.id || (Date.now() + Math.random().toString(36).substr(2, 9));
    item.created_at = new Date().toISOString();
    CacheManager.invalidate(key);
    try {
      const { data } = await supabase.insert(table, item);
      const inserted = data || item;
      const arr = await this.get(key) || [];
      if (Array.isArray(arr)) {
        arr.push(inserted);
        this._cache[key] = arr;
      }
      return inserted;
    } catch (e) {
      console.warn('Supabase push fallback for ' + key, e);
      const arr = JSON.parse(localStorage.getItem(this.PREFIX + key) || '[]');
      arr.push(item);
      localStorage.setItem(this.PREFIX + key, JSON.stringify(arr));
      return item;
    }
  },

  async update(key, id, newData) {
    const table = this.TABLES[key] || key;
    CacheManager.invalidate(key);
    try {
      await supabase.update(table, id, newData);
      const arr = await this.get(key) || [];
      if (Array.isArray(arr)) {
        const idx = arr.findIndex(item => String(item.id) === String(id));
        if (idx !== -1) {
          arr[idx] = { ...arr[idx], ...newData };
          this._cache[key] = arr;
        }
      }
    } catch (e) {
      console.warn('Supabase update fallback for ' + key, e);
      const arr = JSON.parse(localStorage.getItem(this.PREFIX + key) || '[]');
      const idx = arr.findIndex(item => String(item.id) === String(id));
      if (idx !== -1) {
        arr[idx] = { ...arr[idx], ...newData, updatedAt: new Date().toISOString() };
        localStorage.setItem(this.PREFIX + key, JSON.stringify(arr));
      }
    }
  },

  async delete(key, id) {
    const table = this.TABLES[key] || key;
    CacheManager.invalidate(key);
    try {
      await supabase.delete(table, id);
      const arr = await this.get(key) || [];
      if (Array.isArray(arr)) {
        this._cache[key] = arr.filter(item => String(item.id) !== String(id));
      }
    } catch (e) {
      console.warn('Supabase delete fallback for ' + key, e);
      const arr = JSON.parse(localStorage.getItem(this.PREFIX + key) || '[]');
      const filtered = arr.filter(item => String(item.id) !== String(id));
      localStorage.setItem(this.PREFIX + key, JSON.stringify(filtered));
    }
  },

  async clear(key) {
    const table = this.TABLES[key] || key;
    CacheManager.invalidate(key);
    try {
      await supabase.clear(table);
    } catch (e) {
      console.warn('Supabase clear fallback for ' + key, e);
    }
    delete this._cache[key];
    localStorage.removeItem(this.PREFIX + key);
  }
};

const NepaliDate = {
  months: ['Baisakh', 'Jestha', 'Asar', 'Shrawan', 'Bhadra', 'Ashwin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'],
  days: ['Aaitbaar', 'Sombar', 'Mangalbar', 'Budhbar', 'Bihibar', 'Shukrabar', 'Shanibar'],

  today() {
    const now = new Date();
    const bs = this.convertToBS(now);
    return bs.year + ' ' + this.months[bs.month - 1] + ' ' + bs.day;
  },

  convertToBS(date) {
    const d = date || new Date();
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const bsYear = year + 57;
    const bsMonths = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
    const startBSDate = new Date(year, month - 1, day);
    const refDate = new Date(2014, 3, 14);
    const daysDiff = Math.floor((startBSDate - refDate) / (1000 * 60 * 60 * 24));
    let totalDays = daysDiff;
    let nYear = bsYear;
    let nMonth = 1;
    let nDay = 1;
    if (totalDays < 0) {
      for (let m = 0; m < 9; m++) totalDays += bsMonths[m];
      nMonth = 10;
      nDay = 1 + totalDays;
      if (nDay > bsMonths[nMonth - 1]) { nDay = totalDays - bsMonths[9]; nMonth = 11; }
    } else {
      let daysInYear = 0;
      for (let m = 0; m < 12; m++) daysInYear += bsMonths[m];
      while (totalDays >= daysInYear) { totalDays -= daysInYear; nYear++; }
      for (let m = 0; m < 12; m++) {
        if (totalDays < bsMonths[m]) { nMonth = m + 1; nDay = totalDays + 1; break; }
        totalDays -= bsMonths[m];
      }
    }
    return { year: nYear, month: nMonth, day: nDay };
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const bs = this.convertToBS(date);
    return bs.day + ' ' + this.months[bs.month - 1] + ' ' + bs.year;
  }
};

function compressImage(file, maxWidth, quality) {
  maxWidth = maxWidth || 800;
  quality = quality || 0.6;
  return new Promise(function (resolve) {
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        var canvas = document.createElement('canvas');
        var width = img.width;
        var height = img.height;
        if (width > maxWidth) { height = (height * maxWidth) / width; width = maxWidth; }
        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/webp', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function fileToBase64(file) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onload = function () { resolve(reader.result); };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function showToast(message, type) {
  type = type || 'success';
  var toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.innerHTML = '<span>' + message + '</span><button onclick="this.parentElement.remove()">&times;</button>';
  document.body.appendChild(toast);
  setTimeout(function () { toast.classList.add('show'); }, 10);
  setTimeout(function () {
    toast.classList.remove('show');
    setTimeout(function () { toast.remove(); }, 300);
  }, 3000);
}

async function seedData() {
  try {
    const { data: existing } = await supabase.select('site_settings', { limit: 1, select: 'id' });
    if (existing && existing.length) {
      await seedTeachers();
      await seedStaff();
      await seedGallery();
      return;
    }
  } catch (e) {
    if (localStorage.getItem('sss_settings')) {
      seedLocalTeachers();
      seedLocalStaff();
      seedLocalGallery();
      return;
    }
  }

  const settings = {
    schoolName: 'Shree Saraswati Secondary School',
    tagline: '\u0936\u093f\u0915\u094d\u0937\u093e \u0928\u0948 \u0938\u0936\u0915\u094d\u0924\u093f\u0915\u0930\u0923',
    established: '2016 Bhadra 16',
    address: 'Satyawati-6, Johang, Gulmi, Lumbini Province',
    phone: '+977-9857062876',
    email: 'infosaraswatimavijohang@gmail.com',
    adminUsername: 'amitrazbanc',
    adminPassword: 'school1122@',
    logo: '',
    facebook: '',
    youtube: '',
    mapUrl: ''
  };
  try {
    await supabase.upsert('site_settings', { id: 1, ...settings });

      await supabase.insert('slides', [
      { id: '1', title: 'Welcome to Shree Saraswati Secondary School', subtitle: 'Empowering students through quality education since 2016', btn_text: 'Learn More', btn_link: '#about', image_url: 'assets/images/General Block.webp', sort_order: 1 },
      { id: '2', title: 'Technical Education', subtitle: 'Computer Engineering for Grade 9-12', btn_text: 'View Programs', btn_link: '#programs', image_url: 'assets/images/Technical Block.webp', sort_order: 2 }
    ]);

    await supabase.upsert('about', { id: 1,
      history: 'We started our journey in 2016 B.S. with a simple but powerful dream: to bring quality education to the children of Gulmi.',
      vision: 'To be a center of excellence in education.',
      mission: 'To provide quality education that empowers students.',
      values: 'Excellence, Integrity, Growth, Leadership, and Community.',
      principal_name: 'Mr. Chhabilal Bhandari',
      principal_message: 'Dear Students, Parents, and Well-wishers.',
      principal_photo: 'assets/images/Teachers/Chhabilal Bhandari.webp',
      general_block: 'Our General Block offers comprehensive education from ECD through Grade 12.',
      technical_block: 'Our Technical Block offers Computer Engineering education for Grade 9-12.'
    });

    await supabase.upsert('stats', { id: 1, students: 800, teachers: 45, staff: 6, graduates: 1200, years: 8 });

    await supabase.insert('notices', [
      { id: 'n1', title: 'Admission Open for 2083', date: '2082-12-01', content: 'Admissions are now open for all classes.', priority: 'urgent' },
      { id: 'n2', title: 'Annual Examination Schedule', date: '2082-11-15', content: 'The annual examination schedule has been published.', priority: 'normal' },
    ]);

    await supabase.insert('programs', [
      { id: 'p1', name: 'ECD / Nursery', description: 'Early Childhood Development', visible: true, type: 'ecd', sort_order: 1 },
      { id: 'p8', name: 'Computer Engineering', description: 'Technical education (Grade 9-12)', visible: true, type: 'technical', sort_order: 8, subjects: JSON.stringify([{ name: 'Programming' }, { name: 'Web Technology' }]) }
    ]);

    await supabase.insert('teachers', teacherData);
    await supabase.upsert('marquee', { id: 1, enabled: true, text: 'Welcome', items: JSON.stringify([{ text: 'Admissions Open' }]) });

    DataStore._cache = {};
    CacheManager.invalidateAll();
    localStorage.setItem('sss_seeded', 'true');
    console.log('Seed data initialized in Supabase');
  } catch (e) {
    console.warn('Supabase seeding failed, using localStorage fallback', e);
    localStorage.setItem('sss_site_settings', JSON.stringify(settings));
    localStorage.setItem('sss_slides', JSON.stringify([]));
    localStorage.setItem('sss_about', JSON.stringify({}));
    localStorage.setItem('sss_stats', JSON.stringify({}));
    localStorage.setItem('sss_notices', JSON.stringify([]));
    localStorage.setItem('sss_programs', JSON.stringify([]));
    localStorage.setItem('sss_teachers', JSON.stringify(teacherData));
    localStorage.setItem('sss_staff', JSON.stringify(staffData));
    localStorage.setItem('sss_gallery', JSON.stringify(galleryData));
    localStorage.setItem('sss_marquee', JSON.stringify({ enabled: true, items: [{ text: 'Admissions Open' }], text: 'Welcome' }));
    localStorage.setItem('sss_seeded', 'true');
    console.log('Seed data stored in localStorage');
  }
}

var teacherData = [
  { id: 't1', name: 'Arjun Prashad Sharma Dhakal', subject: 'G5 - Primary', qualification: 'Intermediate or +2', block: 'General', photo_url: 'assets/images/Teachers/Arjun Prasad Dhakal.webp' },
  { id: 't2', name: 'Gayatri Acharya Regmi', subject: 'G12 - Primary', qualification: 'Bachelors', block: 'General', photo_url: 'assets/images/Teachers/Gayatrai.webp' },
  { id: 't3', name: 'Kalpana Bhattarai', subject: 'ECD', qualification: 'Intermediate or +2', block: 'General', photo_url: 'assets/images/Teachers/Kalpana Bhattrai.webp' },
  { id: 't4', name: 'Shreedhar Gautam', subject: 'English (G1-G12)', qualification: 'Bachelors', block: 'General', photo_url: 'assets/images/Teachers/Shreedhar Gautam.webp', designation: 'Assistant Head Teacher' },
  { id: 't5', name: 'Maniram Gautam', subject: 'Mathematics (G10)', qualification: 'Masters', block: 'General', photo_url: 'assets/images/Teachers/Man ram Gautam.webp' },
  { id: 't6', name: 'Amrita Parajuli', subject: 'G11 - Primary', qualification: 'Bachelors', block: 'General', photo_url: 'assets/images/Teachers/Amrita Parajuli.webp' },
  { id: 't7', name: 'Dhan Bahadur Kala', subject: 'Mathematics (G4-G6)', qualification: 'Intermediate or +2', block: 'General', photo_url: 'assets/images/Teachers/Dhan Bahadur Kala.webp' },
  { id: 't8', name: 'Homnath Pokhrel', subject: 'English (G10)', qualification: 'Bachelors', block: 'General', photo_url: 'assets/images/Teachers/Homnath Pokheral.webp' },
  { id: 't9', name: 'Harikala Nepali', subject: 'G1-G12 - Primary', qualification: 'Bachelors', block: 'General', photo_url: 'assets/images/Teachers/Harikala Nepali.webp' },
  { id: 't10', name: 'Er. Amit Rajbanshi', subject: 'Computer Science (G12)', qualification: 'Masters', block: 'Technical', photo_url: 'assets/images/Teachers/Er. Amit Rajbanshi.webp' },
  { id: 't11', name: 'Keshav Raj Dhakal', subject: 'Science (G12)', qualification: 'Masters', block: 'Technical', photo_url: 'assets/images/Teachers/Keshab Raj DHakal.webp' },
  { id: 't12', name: 'Bhojraj Dhakal', subject: 'G1-G12 - Primary', qualification: 'Intermediate or +2', block: 'General', photo_url: 'assets/images/Teachers/Bhojraj Dhakal.webp' },
  { id: 't13', name: 'Devi Kumari Thapa', subject: 'Nepali (G10)', qualification: 'Masters', block: 'General', photo_url: 'assets/images/Teachers/Devi KUmari Thapa.webp' },
  { id: 't14', name: 'Santosh Basnet', subject: 'Science (G12)', qualification: 'Masters', block: 'Technical', photo_url: 'assets/images/Teachers/Santosh Basnet.webp' },
  { id: 't15', name: 'Man Bahadur Thapa', subject: 'Humanities (G10-G12)', qualification: 'Masters', block: 'General', photo_url: 'assets/images/Teachers/Man Bahadur Thapa.webp' },
  { id: 't16', name: 'Surendra Prasad Poudel', subject: 'English (G1-G12)', qualification: 'Masters', block: 'General', photo_url: 'assets/images/Teachers/Surendra kumar Paudel.webp' },
  { id: 't17', name: 'Denim Kumar Ale', subject: 'Computer Science (G7, G9-G10)', qualification: 'Intermediate or +2', block: 'Technical', photo_url: 'assets/images/Teachers/Danim Kumar Ale.webp' },
  { id: 't18', name: 'Shristi Bhandari', subject: 'Computer Tech. (G3, G5)', qualification: 'Intermediate or +2', block: 'Technical', photo_url: 'assets/images/Teachers/Shristi Bhandari.webp' },
  { id: 't19', name: 'Chitra Bahadur Tharu', subject: 'Mathematics (G10-G12)', qualification: 'Masters', block: 'General', photo_url: 'assets/images/Teachers/Chitra Bahadur Tharu.webp' },
  { id: 't20', name: 'Chhabilal Bhandari', subject: 'G10 - Science', qualification: 'Bachelors', block: 'General', photo_url: 'assets/images/Teachers/Chhabilal Bhandari.webp', designation: 'Head Teacher' },
  { id: 't21', name: 'Kalpana Bhandari', subject: 'ECD', qualification: 'Intermediate or +2', block: 'General', photo_url: 'assets/images/Teachers/Kalpana Bhattrai.webp' },
  { id: 't22', name: 'Hem Raj Timilsina', subject: 'Nepali (G12)', qualification: 'Bachelors', block: 'General', photo_url: 'assets/images/Teachers/Hemraj Timilsina.webp' },
  { id: 't23', name: 'Mahesh Paudel', subject: 'Nepali (G1-G12)', qualification: 'Masters', block: 'General', photo_url: 'assets/images/Teachers/Mahesh Paudel.webp' },
  { id: 't24', name: 'Indira Pulami', subject: 'G6-G7 - Primary', qualification: 'Bachelors', block: 'General', photo_url: 'assets/images/Teachers/Indra Pulami.webp' },
  { id: 't25', name: 'Er. Prem Shankar Singh', subject: 'Computer Tech. (G1-G12)', qualification: 'Bachelors', block: 'Technical', photo_url: 'assets/images/Teachers/Prem Shankar Singh.webp' },
  { id: 't26', name: 'Er. Sarthak Aryal', subject: 'Computer Tech. (G1-G12)', qualification: 'Bachelors', block: 'Technical', photo_url: 'assets/images/Teachers/Er. Sarthak Aryal.webp' },
  { id: 't27', name: 'Chemkali Kala Shrees', subject: 'G1-G12 - Primary', qualification: 'Intermediate or +2', block: 'General', photo_url: 'assets/images/Teachers/Chemkala Kala Shiris.webp' },
  { id: 't29', name: 'Dhanesh Kumar Barai', subject: 'Science (G3-G5)', qualification: 'Masters', block: 'General', photo_url: 'assets/images/Teachers/Ramesh Barai.webp' },
  { id: 't30', name: 'Er. Sunil Ram Luhar', subject: 'Computer Science (G1-G12)', qualification: 'Bachelors', block: 'Technical', photo_url: 'assets/images/Teachers/Er. Sunil Ram Luhar.webp' },
  { id: 't31', name: 'Manisha Sunar', subject: 'G1-G12 - Primary', qualification: 'Intermediate or +2', block: 'General', photo_url: 'assets/images/Teachers/Manisha Sunar.webp' }
];

var staffData = [
  { id: 's1', name: 'Nawaraj Dhakal', position: 'Support Staff (Peon)', block: 'General', photo_url: 'assets/images/Staff/Nawaraj Dhakal.webp' },
  { id: 's2', name: 'Manju Archarya', position: 'Support Staff (Peon)', block: 'General', photo_url: 'assets/images/Staff/Manju Archarya.webp' },
  { id: 's3', name: 'Bishnu Bhandari', position: 'Accountant', block: 'General', photo_url: 'assets/images/Staff/Bishnu Bhandari.webp' },
  { id: 's4', name: 'Laxmi BK', position: 'Support Staff (Sweeper)', block: 'General', photo_url: 'assets/images/Staff/Laxmi Bk.webp' }
];

async function seedTeachers() {
  try { await supabase.clear('teachers'); } catch(e) {}
  await supabase.insert('teachers', teacherData);
  console.log('Teachers seeded');
}

async function seedStaff() {
  try { await supabase.clear('staff'); } catch(e) {}
  await supabase.insert('staff', staffData);
  console.log('Staff seeded');
}

function seedLocalTeachers() {
  localStorage.setItem('sss_teachers', JSON.stringify(teacherData));
}

function seedLocalStaff() {
  localStorage.setItem('sss_staff', JSON.stringify(staffData));
}

var galleryData = [
  { id:"g0", src:"assets/images/Farewell SLC 2082/IMG-20260424-WA0144.webp", category:"graduation", caption:"Farewell SLC 2082" },
  { id:"g1", src:"assets/images/Farewell SLC 2082/IMG-20260424-WA0145.webp", category:"graduation", caption:"Farewell SLC 2082" },
  { id:"g2", src:"assets/images/Farewell SLC 2082/IMG-20260424-WA0147.webp", category:"graduation", caption:"Farewell SLC 2082" },
  { id:"g3", src:"assets/images/Farewell SLC 2082/IMG-20260424-WA0150.webp", category:"graduation", caption:"Farewell SLC 2082" },
  { id:"g4", src:"assets/images/Farewell SLC 2082/IMG-20260424-WA0151.webp", category:"graduation", caption:"Farewell SLC 2082" },
  { id:"g5", src:"assets/images/Farewell SLC 2082/IMG-20260424-WA0153.webp", category:"graduation", caption:"Farewell SLC 2082" },
  { id:"g6", src:"assets/images/General Farewell SEE 2082/IMG-20260325-WA0005(1).webp", category:"events", caption:"Farewell SEE 2082 (General)" },
  { id:"g7", src:"assets/images/General Farewell SEE 2082/IMG-20260325-WA0006(1).webp", category:"events", caption:"Farewell SEE 2082 (General)" },
  { id:"g8", src:"assets/images/General Farewell SEE 2082/IMG-20260325-WA0007(1).webp", category:"events", caption:"Farewell SEE 2082 (General)" },
  { id:"g9", src:"assets/images/General Farewell SEE 2082/IMG-20260325-WA0008(1).webp", category:"events", caption:"Farewell SEE 2082 (General)" },
  { id:"g10", src:"assets/images/General Farewell SEE 2082/IMG-20260325-WA0009(1).webp", category:"events", caption:"Farewell SEE 2082 (General)" },
  { id:"g11", src:"assets/images/General Farewell SEE 2082/IMG-20260325-WA0010(1).webp", category:"events", caption:"Farewell SEE 2082 (General)" },
  { id:"g12", src:"assets/images/General Farewell SEE 2082/IMG-20260325-WA0011(1).webp", category:"events", caption:"Farewell SEE 2082 (General)" },
  { id:"g13", src:"assets/images/General Farewell SEE 2082/IMG-20260325-WA0012(1).webp", category:"events", caption:"Farewell SEE 2082 (General)" },
  { id:"g14", src:"assets/images/General Farewell SEE 2082/IMG-20260325-WA0013(1).webp", category:"events", caption:"Farewell SEE 2082 (General)" },
  { id:"g15", src:"assets/images/General Farewell SEE 2082/IMG-20260325-WA0014(1).webp", category:"events", caption:"Farewell SEE 2082 (General)" },
  { id:"g16", src:"assets/images/General Farewell SEE 2082/IMG-20260325-WA0015(1).webp", category:"events", caption:"Farewell SEE 2082 (General)" },
  { id:"g17", src:"assets/images/General Farewell SEE 2082/IMG-20260325-WA0016(1).webp", category:"events", caption:"Farewell SEE 2082 (General)" },
  { id:"g18", src:"assets/images/General Farewell SEE 2082/IMG-20260325-WA0017(1).webp", category:"events", caption:"Farewell SEE 2082 (General)" },
  { id:"g19", src:"assets/images/General Farewell SEE 2082/IMG-20260325-WA0018(1).webp", category:"events", caption:"Farewell SEE 2082 (General)" },
  { id:"g20", src:"assets/images/General Farewell SEE 2082/IMG-20260325-WA0019(1).webp", category:"events", caption:"Farewell SEE 2082 (General)" },
  { id:"g21", src:"assets/images/General Farewell SEE 2082/IMG-20260325-WA0020(1).webp", category:"events", caption:"Farewell SEE 2082 (General)" },
  { id:"g22", src:"assets/images/General Farewell SEE 2082/IMG-20260325-WA0021(1).webp", category:"events", caption:"Farewell SEE 2082 (General)" },
  { id:"g23", src:"assets/images/General Farewell SEE 2082/IMG-20260325-WA0022(1).webp", category:"events", caption:"Farewell SEE 2082 (General)" },
  { id:"g24", src:"assets/images/General Farewell SEE 2082/IMG-20260325-WA0023(1).webp", category:"events", caption:"Farewell SEE 2082 (General)" },
  { id:"g25", src:"assets/images/General Farewell SEE 2082/IMG-20260325-WA0024(1).webp", category:"events", caption:"Farewell SEE 2082 (General)" },
  { id:"g26", src:"assets/images/General Farewell SEE 2082/IMG-20260325-WA0025(1).webp", category:"events", caption:"Farewell SEE 2082 (General)" },
  { id:"g27", src:"assets/images/General Farewell SEE 2082/IMG-20260325-WA0026(1).webp", category:"events", caption:"Farewell SEE 2082 (General)" },
  { id:"g28", src:"assets/images/Lab/IMG20240626090858.webp", category:"lab", caption:"Lab & Technical" },
  { id:"g29", src:"assets/images/Lab/IMG20240628151550.webp", category:"lab", caption:"Lab & Technical" },
  { id:"g30", src:"assets/images/Lab/IMG20240628151556.webp", category:"lab", caption:"Lab & Technical" },
  { id:"g31", src:"assets/images/Lab/IMG20240628155138.webp", category:"lab", caption:"Lab & Technical" },
  { id:"g32", src:"assets/images/Lab/IMG20240628155206.webp", category:"lab", caption:"Lab & Technical" },
  { id:"g33", src:"assets/images/Lab/IMG20240628155233.webp", category:"lab", caption:"Lab & Technical" },
  { id:"g34", src:"assets/images/Lab/IMG20240628155258.webp", category:"lab", caption:"Lab & Technical" },
  { id:"g35", src:"assets/images/Lab/smartboard.webp", category:"lab", caption:"Lab & Technical" },
  { id:"g36", src:"assets/images/Technical Farewell SEE 2082/IMG20260325161434.webp", category:"graduation", caption:"Farewell SEE 2082 (Technical)" },
  { id:"g37", src:"assets/images/Technical Farewell SEE 2082/IMG20260325161545.webp", category:"graduation", caption:"Farewell SEE 2082 (Technical)" },
  { id:"g38", src:"assets/images/Technical Farewell SEE 2082/IMG20260325161620.webp", category:"graduation", caption:"Farewell SEE 2082 (Technical)" },
  { id:"g39", src:"assets/images/Technical Farewell SEE 2082/IMG20260325161710.webp", category:"graduation", caption:"Farewell SEE 2082 (Technical)" },
  { id:"g40", src:"assets/images/Technical Farewell SEE 2082/IMG20260325161711.webp", category:"graduation", caption:"Farewell SEE 2082 (Technical)" },
  { id:"g41", src:"assets/images/Technical Farewell SEE 2082/IMG20260325161732.webp", category:"graduation", caption:"Farewell SEE 2082 (Technical)" },
  { id:"g42", src:"assets/images/Technical Farewell SEE 2082/IMG20260325161802.webp", category:"graduation", caption:"Farewell SEE 2082 (Technical)" },
  { id:"g43", src:"assets/images/Technical Farewell SEE 2082/IMG20260325161805.webp", category:"graduation", caption:"Farewell SEE 2082 (Technical)" },
  { id:"g44", src:"assets/images/Technical Farewell SEE 2082/IMG20260325161819.webp", category:"graduation", caption:"Farewell SEE 2082 (Technical)" },
  { id:"g45", src:"assets/images/Technical Farewell SEE 2082/IMG20260325161822.webp", category:"graduation", caption:"Farewell SEE 2082 (Technical)" },
  { id:"g46", src:"assets/images/Technical Farewell SEE 2082/IMG20260325161913.webp", category:"graduation", caption:"Farewell SEE 2082 (Technical)" },
  { id:"g47", src:"assets/images/Technical Farewell SEE 2082/IMG20260325161920.webp", category:"graduation", caption:"Farewell SEE 2082 (Technical)" },
  { id:"g48", src:"assets/images/Technical Farewell SEE 2082/IMG20260325162331.webp", category:"graduation", caption:"Farewell SEE 2082 (Technical)" },
  { id:"g49", src:"assets/images/Technical Farewell SEE 2082/SEE English Teacher.webp", category:"graduation", caption:"Farewell SEE 2082 (Technical)" },
  { id:"g50", src:"assets/images/Technical Farewell SEE 2082/SEE Nepali Teacher.webp", category:"graduation", caption:"Farewell SEE 2082 (Technical)" },
  { id:"g51", src:"assets/images/Trip/IMG-20241209-WA0028.webp", category:"trip", caption:"School Trip 2081" },
  { id:"g52", src:"assets/images/Trip/IMG-20241209-WA0030.webp", category:"trip", caption:"School Trip 2081" },
  { id:"g53", src:"assets/images/Trip/IMG-20241209-WA0041.webp", category:"trip", caption:"School Trip 2081" },
  { id:"g54", src:"assets/images/Trip/IMG-20241209-WA0049.webp", category:"trip", caption:"School Trip 2081" },
  { id:"g55", src:"assets/images/Trip/IMG-20241209-WA0073.webp", category:"trip", caption:"School Trip 2081" },
  { id:"g56", src:"assets/images/Trip/IMG-20241209-WA0213.webp", category:"trip", caption:"School Trip 2081" },
  { id:"g57", src:"assets/images/Trip/IMG-20241209-WA0229.webp", category:"trip", caption:"School Trip 2081" },
  { id:"g58", src:"assets/images/Trip/IMG-20241209-WA0246.webp", category:"trip", caption:"School Trip 2081" },
  { id:"g59", src:"assets/images/Trip/IMG20241208135820.webp", category:"trip", caption:"School Trip 2081" },
  { id:"g60", src:"assets/images/Trip/Trip 2081.webp", category:"trip", caption:"School Trip 2081" },
  { id:"g61", src:"assets/images/Trip/Trip image 2081.webp", category:"trip", caption:"School Trip 2081" }
];

async function seedGallery() {
  try { await supabase.clear('gallery'); } catch(e) {}
  await supabase.insert('gallery', galleryData);
  console.log('Gallery seeded');
}

function seedLocalGallery() {
  localStorage.setItem('sss_gallery', JSON.stringify(galleryData));
}

var ANNUAL_PLAN = {"Baisakh":[{"date":"15th–20th","activity":"Student admission and textbook distribution program","responsible":"Admission Committee / Class Teachers","remarks":"New session intake"},{"date":"From 21st","activity":"Commencement of regular classes","responsible":"All Teachers","remarks":""},{"date":"From 15th","activity":"Student registration and record updating","responsible":"Class Teachers","remarks":""},{"date":"25th","activity":"Formation/Reorganization of Nepal Junior Red Cross, Child Club, Scout, Eco Club and House Division","responsible":"ECA Coordinator","remarks":""},{"date":"31st","activity":"Teachers and Staff Meeting","responsible":"Principal","remarks":""},{"date":"Last Wed & Thu","activity":"Monthly Class Test","responsible":"Subject Teachers / Exam Committee","remarks":""}],"Jestha":[{"date":"1st","activity":"Felicitation for SEE graduates and teachers of Grades 5, 8, 10","responsible":"Principal / Teachers","remarks":""},{"date":"Within 7th","activity":"Update IEMIS","responsible":"IEMIS Focal Teacher","remarks":""},{"date":"8th","activity":"Speech Competition (Grades 6–8 and 9–12)","responsible":"ECA Coordinator","remarks":""},{"date":"From 18th","activity":"Remedial classes in English, Mathematics and Science for Grades 8 and 10","responsible":"Subject Teachers","remarks":""},{"date":"22nd","activity":"Drawing (Grades 1–3) and Inter-house Quiz (Grades 4–12)","responsible":"ECA Coordinator","remarks":""},{"date":"31st","activity":"Teachers and Staff Meeting","responsible":"Principal","remarks":""},{"date":"—","activity":"Preparation of School Improvement Plan (SIP)","responsible":"Principal / SMC","remarks":""},{"date":"Last Wed & Thu","activity":"Monthly Class Test","responsible":"Subject Teachers / Exam Committee","remarks":""}],"Ashadh":[{"date":"From 1st","activity":"Grade 11 admission and classes","responsible":"Admission Committee","remarks":""},{"date":"5th","activity":"Copy Writing (1–3), Nepali Dictation (4–5), English Dictation (6–8)","responsible":"ECA Coordinator / Respective Teachers","remarks":""},{"date":"10th","activity":"Issue of report cards","responsible":"Class Teachers","remarks":""},{"date":"15th","activity":"Guardians' Meeting","responsible":"Principal / Class Teachers","remarks":""},{"date":"25th","activity":"District-Level Sports Competition","responsible":"Physical Education Teacher","remarks":""},{"date":"31st","activity":"Teachers and Staff Meeting","responsible":"Principal","remarks":""},{"date":"Last Wed & Thu","activity":"Monthly Class Test","responsible":"Subject Teachers / Exam Committee","remarks":""}],"Shrawan":[{"date":"1st","activity":"Deusi-Bhailo, Cultural and Classical Dance Competition","responsible":"ECA Coordinator","remarks":""},{"date":"5th","activity":"Teachers’ Day","responsible":"Principal","remarks":""},{"date":"10th","activity":"Handwriting Competition (1–3), Essay Competition (4–10)","responsible":"ECA Coordinator","remarks":""},{"date":"15th","activity":"Quiz Contest","responsible":"ECA Coordinator","remarks":""},{"date":"25th","activity":"Classroom decoration competition","responsible":"Class Teachers","remarks":""},{"date":"31st","activity":"Teachers and Staff Meeting","responsible":"Principal","remarks":""},{"date":"Last Wed & Thu","activity":"Monthly Class Test","responsible":"Subject Teachers / Exam Committee","remarks":""}],"Bhadra":[{"date":"1st","activity":"School Level Sports","responsible":"Physical Education Teacher","remarks":""},{"date":"5th","activity":"Constitution Day Celebration","responsible":"Principal","remarks":""},{"date":"10th","activity":"Spelling Competition (1–3)","responsible":"ECA Coordinator","remarks":""},{"date":"From 15th","activity":"Dance, Song and Music Competition","responsible":"ECA Coordinator","remarks":""},{"date":"25th","activity":"Mathematics Festival / Math Competition","responsible":"Mathematics Teacher","remarks":""},{"date":"31st","activity":"Teachers and Staff Meeting","responsible":"Principal","remarks":""},{"date":"Last Wed & Thu","activity":"Monthly Class Test","responsible":"Subject Teachers","remarks":""}],"Ashwin":[{"date":"1st–7th","activity":"Dashai Vacation","responsible":"","remarks":"School closed"},{"date":"8th","activity":"Post-Dashai Class Operation","responsible":"All Teachers","remarks":""},{"date":"10th","activity":"Rhyme Competition (Pre-primary)","responsible":"Pre-primary Teachers","remarks":""},{"date":"15th","activity":"Science Exhibition","responsible":"Science Teachers","remarks":""},{"date":"25th","activity":"Inter-school Quiz","responsible":"ECA Coordinator","remarks":""},{"date":"31st","activity":"Teachers and Staff Meeting","responsible":"Principal","remarks":""},{"date":"Last Wed & Thu","activity":"Monthly Class Test","responsible":"Subject Teachers","remarks":""}],"Kartik":[{"date":"1st–10th","activity":"Tihar Vacation / Deepawali","responsible":"","remarks":"School closed"},{"date":"11th","activity":"Post-Tihar Class Operation","responsible":"All Teachers","remarks":""},{"date":"15th","activity":"Self-Employment Program / Skill Exhibition","responsible":"Technical Teachers","remarks":""},{"date":"20th","activity":"Inter-school English Speech, Essay and Extempore","responsible":"English Teachers","remarks":""},{"date":"25th","activity":"First Terminal Exam (Grades 1–12) / Grade 11 Exam","responsible":"Exam Committee","remarks":""},{"date":"31st","activity":"Teachers and Staff Meeting","responsible":"Principal","remarks":""},{"date":"—","activity":"Issue of report cards and guardians' meeting","responsible":"Class Teachers","remarks":""}],"Mangsir":[{"date":"1st–15th","activity":"First Terminal Exam continues","responsible":"Exam Committee","remarks":""},{"date":"15th","activity":"Education Tour / Field Visit / Exposure Visit","responsible":"Tour Committee","remarks":""},{"date":"22nd","activity":"Debate Competition (Local level)","responsible":"ECA Coordinator","remarks":""},{"date":"25th","activity":"Health Checkup","responsible":"Health Teacher","remarks":""},{"date":"31st","activity":"Teachers and Staff Meeting","responsible":"Principal","remarks":""},{"date":"Last Wed & Thu","activity":"Monthly Class Test","responsible":"Subject Teachers / Exam Committee","remarks":""}],"Poush":[{"date":"1st–15th","activity":"Preparation for National Events","responsible":"All Teachers","remarks":""},{"date":"10th","activity":"Children's Day / Child Club Program","responsible":"Child Club Coordinator","remarks":""},{"date":"15th","activity":"Grade 10/12 Pre-Board Exam (First)","responsible":"Exam Committee","remarks":""},{"date":"20th","activity":"IEMIS Update","responsible":"IEMIS Focal Teacher","remarks":""},{"date":"25th","activity":"Program on discipline, career, counseling and talent","responsible":"Counselor","remarks":""},{"date":"31st","activity":"Teachers and Staff Meeting","responsible":"Principal","remarks":""},{"date":"Last Wed & Thu","activity":"Monthly Class Test","responsible":"Subject Teachers","remarks":""}],"Magh":[{"date":"1st","activity":"General Assembly / School Day","responsible":"Principal","remarks":""},{"date":"10th","activity":"Second Terminal Exam","responsible":"Exam Committee","remarks":""},{"date":"25th","activity":"Public Speaking Competition","responsible":"ECA Coordinator","remarks":""},{"date":"31st","activity":"Teachers and Staff Meeting","responsible":"Principal","remarks":""},{"date":"Last Wed & Thu","activity":"Monthly Class Test","responsible":"Subject Teachers","remarks":""}],"Falgun":[{"date":"1st–10th","activity":"Second Terminal Exam continues","responsible":"Exam Committee","remarks":""},{"date":"15th","activity":"Guardians' Meeting","responsible":"Principal","remarks":""},{"date":"20th","activity":"Grade 10/12 Pre-Board Exam (Second)","responsible":"Exam Committee","remarks":""},{"date":"25th","activity":"Career Counseling Program","responsible":"Counselor","remarks":""},{"date":"31st","activity":"Teachers and Staff Meeting","responsible":"Principal","remarks":""}],"Chaitra":[{"date":"1st","activity":"Grade 10/12 Pre-Board Exam (Second) continues","responsible":"Exam Committee","remarks":""},{"date":"10th","activity":"Sports Day","responsible":"Physical Education Teacher","remarks":""},{"date":"15th","activity":"Farewell / Graduation Program","responsible":"ECA Coordinator","remarks":""},{"date":"20th","activity":"Annual Exam / SEE Preparation","responsible":"Exam Committee","remarks":""},{"date":"25th","activity":"Evaluation of teachers, staff and students","responsible":"Principal","remarks":""},{"date":"31st","activity":"Closing Day / Annual Result Publication","responsible":"Principal","remarks":""}]};

var MONTH_ORDER = ['Baisakh','Jestha','Ashadh','Shrawan','Bhadra','Ashwin','Kartik','Mangsir','Poush','Magh','Falgun','Chaitra'];

var BS_YEAR = 2083;
var BS_MONTH_DAYS = [30, 31, 31, 32, 32, 31, 31, 30, 29, 30, 29, 31];
var BS_WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
var BS_OFFSET = -8;

function bsDateFromAd(adDate) {
  var ad = new Date(adDate);
  var adMs = ad.getTime();
  var bs2083Start = new Date('2026-04-14T00:00:00').getTime();
  var diffDays = Math.floor((adMs - bs2083Start) / 86400000);
  if (diffDays < 0) return { year: 2082, month: 11, day: 1 + diffDays + BS_MONTH_DAYS[11] };
  var m = 0, d = diffDays;
  while (m < 12 && d >= BS_MONTH_DAYS[m]) { d -= BS_MONTH_DAYS[m]; m++; }
  if (m >= 12) return { year: 2084, month: 0, day: 1 };
  return { year: BS_YEAR, month: m, day: d + 1 };
}

function bsMonthGrid(monthIndex) {
  var startAd = new Date('2026-04-14T00:00:00');
  for (var i = 0; i < monthIndex; i++) startAd.setDate(startAd.getDate() + BS_MONTH_DAYS[i]);
  var startDay = startAd.getDay();
  var daysInMonth = BS_MONTH_DAYS[monthIndex];
  var grid = [];
  var week = [];
  var cursor = new Date(startAd);
  for (var i = 0; i < startDay; i++) week.push({ bs: 0, ad: '', dow: -1 });
  for (var d = 1; d <= daysInMonth; d++) {
    var adStr = ('0' + cursor.getDate()).slice(-2) + '/' + ('0' + (cursor.getMonth()+1)).slice(-2);
    var dow = cursor.getDay();
    week.push({ bs: d, ad: adStr, dow: dow });
    cursor.setDate(cursor.getDate() + 1);
    if (week.length === 7) { grid.push(week); week = []; }
  }
  if (week.length) { while (week.length < 7) week.push({ bs: 0, ad: '', dow: -1 }); grid.push(week); }
  return grid;
}

if (typeof window !== 'undefined') {
  var oldLoad = window.onload;
  window.onload = function () {
    if (oldLoad) oldLoad();
    setTimeout(seedData, 100);
  };
}

if (typeof module !== 'undefined') module.exports = { DataStore, NepaliDate, compressImage, fileToBase64, showToast, seedData };
