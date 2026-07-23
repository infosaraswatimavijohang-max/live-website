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

  async get(key) {
    const table = this.TABLES[key] || key;
    if (this._cache[key]) return this._cache[key];
    try {
      const { data } = await supabase.select(table);
      if (table === 'site_settings') {
        const result = data && data.length ? data[0] : null;
        if (result) delete result.id;
        this._cache[key] = result;
      } else if (table === 'marquee') {
        const result = data && data.length ? data[0] : null;
        if (result) { result.items = typeof result.items === 'string' ? JSON.parse(result.items) : (result.items || []); delete result.id; }
        this._cache[key] = result;
      } else {
        this._cache[key] = data || [];
      }
      return this._cache[key];
    } catch (e) {
      console.warn('Supabase fallback to localStorage for ' + key, e);
      const local = localStorage.getItem(this.PREFIX + key);
      return local ? JSON.parse(local) : null;
    }
  },

  async set(key, value) {
    const table = this.TABLES[key] || key;
    this._cache[key] = value;
    try {
      if (table === 'site_settings' || table === 'about' || table === 'stats' || table === 'marquee') {
        const record = { id: 1, ...value };
        const { data: existing } = await supabase.select(table, { id: 1 });
        if (existing && existing.length) {
          await supabase.update(table, 1, record);
        } else {
          await supabase.insert(table, record);
        }
      } else {
        const records = Array.isArray(value) ? value : [];
        for (const item of records) {
          if (item.id) {
            const { data: found } = await supabase.select(table, { id: item.id });
            if (found && found.length) {
              await supabase.update(table, item.id, item);
            } else {
              await supabase.insert(table, item);
            }
          } else {
            await supabase.insert(table, item);
          }
        }
        const removedIds = (DataStore._prevKeys && DataStore._prevKeys[key])
          ? DataStore._prevKeys[key].filter(p => !records.some(r => r.id === p.id)).map(p => p.id)
          : [];
        for (const rid of removedIds) {
          await supabase.delete(table, rid);
        }
        DataStore._prevKeys = DataStore._prevKeys || {};
        DataStore._prevKeys[key] = records;
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
    try {
      const { data } = await supabase.update(table, id, newData);
      const arr = await this.get(key) || [];
      if (Array.isArray(arr)) {
        const idx = arr.findIndex(item => String(item.id) === String(id));
        if (idx !== -1) {
          arr[idx] = { ...arr[idx], ...newData };
          this._cache[key] = arr;
        }
      }
      return data;
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
    const { data: existing } = await supabase.select('site_settings', { limit: 1 });
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
  await supabase.upsert('site_settings', { id: 1, ...settings });

  await supabase.insert('slides', [
    { id: '1', title: 'Welcome to Shree Saraswati Secondary School', subtitle: 'Empowering students through quality education since 2016', btn_text: 'Learn More', btn_link: '#about', image_url: 'assets/images/General Block.jpg', sort_order: 1 },
    { id: '2', title: 'Technical Education', subtitle: 'Computer Engineering for Grade 9-12', btn_text: 'View Programs', btn_link: '#programs', image_url: 'assets/images/Technical Block.jpg', sort_order: 2 }
  ]);

  await supabase.upsert('about', { id: 1,
    history: 'We started our journey in 2016 B.S. with a simple but powerful dream: to bring quality education to the children of Gulmi. Tucked away in the peaceful hills of Satyawati-6, Johang, our school has grown from a small local institution into a vibrant center of learning that hundreds of families trust today. We offer both general and technical education, and alongside textbooks and exams, we focus on raising kind, capable, and community-minded young people.',
    vision: 'To be a center of excellence in education, fostering holistic development of students and preparing them for the challenges of the modern world while preserving our cultural values.',
    mission: 'To provide quality education that empowers students with knowledge, skills, and values to become responsible citizens and leaders of tomorrow.',
    values: 'Excellence, Integrity, Growth, Leadership, and Community.',
    principal_name: 'Mr. Chhabilal Bhandari',
    principal_message: 'Dear Students, Parents, and Well-wishers, it is my absolute privilege to welcome you to our center of educational excellence in the peaceful hills of Satyawati-6, Johang, Gulmi. Since our founding, we have committed ourselves to bringing standard, career-empowering education to the youth of our community. We do not merely teach curriculum \u2014 we spark curiosity, cultivate strong moral character, and inspire each student to realize their ultimate potential.',
    principal_photo: 'assets/images/Teachers/Chhabilal Bhandari.webp',
    general_block: 'Our General Block operates from Ward No. 06, Johang, offering a comprehensive education from ECD (Nursery, LKG, UKG) through Grade 12, including Science, Management, and Humanities streams at the higher secondary level, along with a library, science lab, and playground.',
    technical_block: 'Our Technical Block operates from our Bedauri campus, offering Computer Engineering education for students of Grade 9-12, preparing them for careers in the growing IT sector with subjects in Programming, Web Technology, Database, Networking, and Hardware.'
  });

  await supabase.upsert('stats', { id: 1, students: 800, teachers: 45, staff: 6, graduates: 1200, years: 8 });

  await supabase.insert('notices', [
    { id: 'n1', title: 'Admission Open for 2083', date: '2082-12-01', content: 'Admissions are now open for all classes (ECD to Grade 12). Please visit the school office for registration and required documents.', priority: 'urgent' },
    { id: 'n2', title: 'Annual Examination Schedule', date: '2082-11-15', content: 'The annual examination schedule for the academic year 2082 has been published. Please check the notice board for detailed dates.', priority: 'normal' },
    { id: 'n3', title: 'Parent-Teacher Meeting', date: '2082-11-20', content: 'A parent-teacher meeting is scheduled for all classes. Parents are requested to attend and discuss their child\'s progress.', priority: 'normal' }
  ]);

  await supabase.insert('programs', [
    { id: 'p1', name: 'ECD / Nursery', description: 'Early Childhood Development program for ages 3-4', visible: true, type: 'ecd', sort_order: 1 },
    { id: 'p2', name: 'LKG / KG', description: 'Lower Kindergarten for ages 4-5', visible: true, type: 'ecd', sort_order: 2 },
    { id: 'p3', name: 'UKG', description: 'Upper Kindergarten for ages 5-6', visible: true, type: 'ecd', sort_order: 3 },
    { id: 'p4', name: 'Primary (1-5)', description: 'Primary education focusing on foundational skills and holistic development', visible: true, type: 'general', sort_order: 4 },
    { id: 'p5', name: 'Lower Secondary (6-8)', description: 'Comprehensive secondary education preparing students for SEE', visible: true, type: 'general', sort_order: 5 },
    { id: 'p6', name: 'Secondary (9-10)', description: 'SEE preparation with Science, Management, and Humanities streams', visible: true, type: 'general', sort_order: 6 },
    { id: 'p7', name: 'Higher Secondary (11-12)', description: 'Plus Two education in Science, Management, or Humanities', visible: true, type: 'general', sort_order: 7 },
    { id: 'p8', name: 'Computer Engineering', description: 'Technical education in Computer Engineering (Grade 9-12)', visible: true, type: 'technical', sort_order: 8, subjects: JSON.stringify([
      { name: 'Programming Fundamentals', visible: true },
      { name: 'Web Technology', visible: true },
      { name: 'Database Management', visible: true },
      { name: 'Computer Networks', visible: true },
      { name: 'Hardware & Maintenance', visible: true }
    ]) }
  ]);

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

  await supabase.insert('teachers', teacherData);

  await supabase.upsert('marquee', { id: 1, enabled: true, text: 'Welcome to Shree Saraswati Secondary School - Quality Education Since 2016', items: JSON.stringify([
    { text: 'Admissions Open for 2083 - Apply Now!' },
    { text: 'Farewell Ceremony SLC 2082 - Thank you for your memories!' },
    { text: 'Annual Sports Day - December 2082' },
    { text: 'Parent-Teacher Meeting - November 20, 2082' },
    { text: 'School Trip 2081 - Exploring and learning together' }
  ])});

  DataStore._cache = {};
  localStorage.setItem('sss_seeded', 'true');
  console.log('Seed data initialized in Supabase');
}

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

var ANNUAL_PLAN = {"Baisakh":[{"date":"15th–20th","activity":"Student admission and textbook distribution program","responsible":"Admission Committee / Class Teachers","remarks":"New session intake"},{"date":"From 21st","activity":"Commencement of regular classes","responsible":"All Teachers","remarks":""},{"date":"From 15th","activity":"Student registration and record updating","responsible":"Class Teachers","remarks":""},{"date":"25th","activity":"Formation/Reorganization of Nepal Junior Red Cross, Child Club, Scout, Eco Club and House Division","responsible":"ECA Coordinator","remarks":""},{"date":"31st","activity":"Teachers and Staff Meeting","responsible":"Principal","remarks":""},{"date":"Last Wed & Thu","activity":"Monthly Class Test","responsible":"Subject Teachers / Exam Committee","remarks":""}],"Jestha":[{"date":"1st","activity":"Felicitation for SEE graduates and teachers of Grades 5, 8, 10","responsible":"Principal / Teachers","remarks":""},{"date":"Within 7th","activity":"Update IEMIS","responsible":"IEMIS Focal Teacher","remarks":""},{"date":"8th","activity":"Speech Competition (Grades 6–8 and 9–12)","responsible":"ECA Coordinator","remarks":""},{"date":"From 18th","activity":"Remedial classes in English, Mathematics and Science for Grades 8 and 10","responsible":"Subject Teachers","remarks":""},{"date":"22nd","activity":"Drawing (Grades 1–3) and Inter-house Quiz (Grades 4–12)","responsible":"ECA Coordinator","remarks":""},{"date":"31st","activity":"Teachers and Staff Meeting","responsible":"Principal","remarks":""},{"date":"—","activity":"Preparation of School Improvement Plan (SIP)","responsible":"Principal / SMC","remarks":""},{"date":"Last Wed & Thu","activity":"Monthly Class Test","responsible":"Subject Teachers / Exam Committee","remarks":""}],"Ashadh":[{"date":"From 1st","activity":"Grade 11 admission and classes","responsible":"Admission Committee","remarks":""},{"date":"5th","activity":"Copy Writing (1–3), Nepali Dictation (4–5), English Dictation (6–12)","responsible":"Class Teachers","remarks":""},{"date":"12th","activity":"Open Dance Competition","responsible":"ECA Coordinator","remarks":""},{"date":"19th","activity":"Disaster Risk Reduction Awareness","responsible":"Class Teachers / Eco Club","remarks":""},{"date":"22nd–26th","activity":"First Terminal Examination","responsible":"Exam Committee","remarks":""},{"date":"32nd","activity":"Tree plantation, flower garden and cleanliness program","responsible":"Eco Club","remarks":""}],"Shrawan":[{"date":"1st","activity":"Results, prize distribution, analysis and staff meeting","responsible":"Exam Committee / Principal","remarks":""},{"date":"4th–20th","activity":"Annual vacation","responsible":"—","remarks":""},{"date":"21st–22nd","activity":"Local holiday","responsible":"—","remarks":""},{"date":"29th","activity":"Nepali Handwriting (1–3), English Handwriting (4–8), English Essay (9–12)","responsible":"ECA Coordinator","remarks":""},{"date":"31st","activity":"Staff meeting","responsible":"Principal","remarks":""},{"date":"—","activity":"Submission of property details","responsible":"Accountant / Admin Section","remarks":""}],"Bhadra":[{"date":"5th","activity":"Garden maintenance and sanitation","responsible":"Eco Club","remarks":""},{"date":"11th–17th","activity":"Annual celebration","responsible":"Program Committee","remarks":""},{"date":"23rd","activity":"Literacy Day and Essay Competition","responsible":"ECA Coordinator","remarks":""},{"date":"25th","activity":"Social Audit","responsible":"SMC / Accountant","remarks":""},{"date":"29th","activity":"Children's Day and Child Rights program","responsible":"Child Club","remarks":""},{"date":"Last Wed & Thu","activity":"Monthly Class Test","responsible":"Subject Teachers / Exam Committee","remarks":""},{"date":"31st","activity":"Staff meeting","responsible":"Principal","remarks":""}],"Ashwin":[{"date":"2nd","activity":"National Education Day","responsible":"Principal","remarks":""},{"date":"9th","activity":"English Spelling Contest","responsible":"English Subject Teacher","remarks":""},{"date":"16th","activity":"Mathematical Race/Musical Chair","responsible":"Math Teacher / ECA Coordinator","remarks":""},{"date":"23rd","activity":"Compost Pit (Eco Club)","responsible":"Eco Club","remarks":""},{"date":"23rd","activity":"Staff meeting and Dashain greetings","responsible":"Principal","remarks":""},{"date":"25th–31st","activity":"Dashain vacation","responsible":"—","remarks":""}],"Kartik":[{"date":"1st–8th","activity":"Dashain vacation","responsible":"—","remarks":""},{"date":"9th–20th","activity":"Annual vacation","responsible":"—","remarks":""},{"date":"11th–15th","activity":"Teacher educational tour","responsible":"Tour Committee","remarks":""},{"date":"23rd–26th","activity":"Tihar vacation","responsible":"—","remarks":""},{"date":"27th","activity":"Public holiday","responsible":"—","remarks":""},{"date":"30th","activity":"Staff meeting","responsible":"Principal","remarks":""}],"Mangsir":[{"date":"4th","activity":"Inter-house athletics","responsible":"Sports Committee","remarks":""},{"date":"11th–23rd","activity":"Second Terminal (4–10), First Terminal (11–12)","responsible":"Exam Committee","remarks":""},{"date":"25th","activity":"Results and prize distribution","responsible":"Exam Committee / Principal","remarks":""},{"date":"26th–29th","activity":"Sports Week","responsible":"Sports Committee","remarks":""},{"date":"29th","activity":"Staff meeting","responsible":"Principal","remarks":""}],"Poush":[{"date":"1st–2nd","activity":"Sports Week","responsible":"Sports Committee","remarks":""},{"date":"3rd–5th","activity":"President Running Shield","responsible":"Sports Committee","remarks":""},{"date":"9th–12th","activity":"Student educational tour","responsible":"Tour Committee","remarks":""},{"date":"17th","activity":"Book-Free Day","responsible":"ECA Coordinator","remarks":""},{"date":"28th–30th","activity":"Local holiday","responsible":"—","remarks":""},{"date":"30th","activity":"Inter-Basic School Speech Competition","responsible":"ECA Coordinator","remarks":""},{"date":"Last Wed & Thu","activity":"Monthly Class Test","responsible":"Subject Teachers / Exam Committee","remarks":""}],"Magh":[{"date":"8th","activity":"Inter-Secondary School Quiz","responsible":"ECA Coordinator","remarks":""},{"date":"11th–21st","activity":"Pre-board (5, 8, 10) and Second Terminal (11–12)","responsible":"Exam Committee","remarks":""},{"date":"22nd","activity":"Results and parent interaction","responsible":"Class Teachers / Principal","remarks":""},{"date":"Last Wed & Thu","activity":"Monthly Class Test","responsible":"Subject Teachers / Exam Committee","remarks":""},{"date":"29th","activity":"Textbook Quiz and staff meeting","responsible":"Subject Teachers / Principal","remarks":""}],"Falgun":[{"date":"4th","activity":"Inter-Basic School Solo Dance","responsible":"ECA Coordinator","remarks":""},{"date":"Last Wed & Thu","activity":"Monthly Class Test","responsible":"Subject Teachers / Exam Committee","remarks":""},{"date":"30th","activity":"Staff meeting","responsible":"Principal","remarks":""}],"Chaitra":[{"date":"1st–11th","activity":"Pre-board (11–12)","responsible":"Exam Committee","remarks":""},{"date":"As per NEB schedule","activity":"SEE Examination","responsible":"NEB / Exam Committee","remarks":""},{"date":"15th–23rd","activity":"Annual Examination","responsible":"Exam Committee","remarks":""},{"date":"30th","activity":"Results, prize distribution and analysis","responsible":"Exam Committee / Principal","remarks":""},{"date":"—","activity":"Preparation of next Annual Work Plan, Academic Calendar, Improvement and Training Plans","responsible":"Principal / SMC","remarks":""}]};

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