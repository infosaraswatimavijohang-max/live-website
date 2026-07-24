const Admin = {
  isLoggedIn: false,

  async init() {
    await this.checkLogin();
    this.setupNavigation();
  },

  async checkLogin() {
    if (typeof seedData === 'function') seedData();
    const auth = sessionStorage.getItem('sss_admin_auth');
    if (auth === 'true') {
      this.isLoggedIn = true;
      document.getElementById('loginOverlay').classList.add('hidden');
      document.getElementById('adminDashboard').classList.remove('hidden');
      await this.loadAllData();
    }
  },

  async login(username, password) {
    try {
      const { data } = await supabase.select('site_settings', { limit: 1 });
      const settings = data && data.length ? data[0] : {};
      const storedUser = settings.adminUsername || 'amitrazbanc';
      const storedPass = settings.adminPassword || 'school1122@';
      if (username === storedUser && password === storedPass) {
        this.isLoggedIn = true;
        sessionStorage.setItem('sss_admin_auth', 'true');
        document.getElementById('loginOverlay').classList.add('hidden');
        document.getElementById('adminDashboard').classList.remove('hidden');
        return true;
      }
    } catch (e) {
      if (username === 'amitrazbanc' && password === 'school1122@') {
        this.isLoggedIn = true;
        sessionStorage.setItem('sss_admin_auth', 'true');
        document.getElementById('loginOverlay').classList.add('hidden');
        document.getElementById('adminDashboard').classList.remove('hidden');
        return true;
      }
    }
    return false;
  },

  logout() {
    this.isLoggedIn = false;
    sessionStorage.removeItem('sss_admin_auth');
    document.getElementById('loginOverlay').classList.remove('hidden');
    document.getElementById('adminDashboard').classList.add('hidden');
  },

  setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(function (item) {
      item.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var section = item.dataset.section;
        document.querySelectorAll('.admin-section').forEach(function (s) { s.classList.remove('active'); });
        var target = document.getElementById(section);
        if (target) target.classList.add('active');
        document.querySelectorAll('.nav-item').forEach(function (n) { n.classList.remove('active'); });
        item.classList.add('active');
        if (window.innerWidth < 769) {
          var sidebar = document.getElementById('sidebar');
          if (sidebar) sidebar.classList.remove('show');
        }
      });
    });
    var loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        var username = document.getElementById('username').value;
        var password = document.getElementById('password').value;
        var ok = await Admin.login(username, password);
        if (!ok) document.getElementById('loginError').textContent = 'Invalid username or password';
      });
    }
  },

  async loadAllData() {
    await Promise.all([
      this.loadSettings(),
      this.loadSlides(),
      this.loadAbout(),
      this.loadStats(),
      this.loadNotices(),
      this.loadPrograms(),
      this.loadTeachers(),
      this.loadStaff(),
      this.loadGallery(),
      this.loadEvents(),
      this.loadTestimonials(),
      this.loadMarquee(),
      this.loadDashboard()
    ]);
  },

  async loadDashboard() {
    var slides = await DataStore.get('SLIDES') || [];
    var notices = await DataStore.get('NOTICES') || [];
    var programs = await DataStore.get('PROGRAMS') || [];
    var teachers = await DataStore.get('TEACHERS') || [];
    var staff = await DataStore.get('STAFF') || [];
    var gallery = await DataStore.get('GALLERY') || [];
    var events = await DataStore.get('EVENTS') || [];
    var testimonials = await DataStore.get('TESTIMONIALS') || [];
    var admissions = JSON.parse(localStorage.getItem('sss_admissions') || '[]');
    document.getElementById('dashSlides').textContent = slides.length;
    document.getElementById('dashNotices').textContent = notices.length;
    document.getElementById('dashPrograms').textContent = programs.length;
    document.getElementById('dashTeachers').textContent = teachers.length;
    document.getElementById('dashStaff').textContent = staff.length;
    document.getElementById('dashGallery').textContent = gallery.length;
    document.getElementById('dashEvents').textContent = events.length;
    document.getElementById('dashTestimonials').textContent = testimonials.length;
    document.getElementById('dashAdmissions').textContent = admissions.length;
  },

  toggleHomeSection(section, visible) {
    DataStore.get('HOMEPAGE_VISIBILITY').then(function (v) {
      v = v || {};
      v[section] = visible;
      DataStore.set('HOMEPAGE_VISIBILITY', v).then(function () {
        showToast((visible ? 'Shown' : 'Hidden') + ' ' + section + ' section');
      });
    });
  },

  async loadSettings() {
    var settings = await DataStore.get('SETTINGS') || {};
    setVal('settingSchoolName', settings.schoolName);
    setVal('settingTagline', settings.tagline);
    setVal('settingEstablished', settings.established);
    setVal('settingAddress', settings.address);
    setVal('settingPhone', settings.phone);
    setVal('settingEmail', settings.email);
    setVal('settingFacebook', settings.facebook);
    setVal('settingYoutube', settings.youtube);
    setVal('settingMap', settings.mapUrl);
    if (settings.logo) {
      var preview = document.getElementById('logoPreview');
      if (preview) preview.innerHTML = '<img src="' + settings.logo + '" alt="Logo">';
    }
  },

  async saveSettings() {
    var fileInput = document.getElementById('settingLogo');
    var password = document.getElementById('settingPassword').value;
    var existing = await DataStore.get('SETTINGS') || {};
    var settings = {
      schoolName: document.getElementById('settingSchoolName').value,
      tagline: document.getElementById('settingTagline').value,
      established: document.getElementById('settingEstablished').value,
      address: document.getElementById('settingAddress').value,
      phone: document.getElementById('settingPhone').value,
      email: document.getElementById('settingEmail').value,
      facebook: document.getElementById('settingFacebook').value,
      youtube: document.getElementById('settingYoutube').value,
      mapUrl: document.getElementById('settingMap').value,
      adminUsername: existing.adminUsername || 'amitrazbanc'
    };
    if (password) settings.adminPassword = password;
    else settings.adminPassword = existing.adminPassword || 'school1122@';
    if (fileInput.files && fileInput.files[0]) {
      settings.logo = await new Promise(function (resolve) {
        var r = new FileReader();
        r.onload = function (e) { resolve(e.target.result); };
        r.readAsDataURL(fileInput.files[0]);
      });
    } else {
      settings.logo = existing.logo || '';
    }
    await DataStore.set('SETTINGS', settings);
    showToast('Settings saved to Supabase!');
    this.loadSettings();
  },

  async loadSlides() {
    var slides = await DataStore.get('SLIDES') || [];
    var container = document.getElementById('slidesList');
    container.innerHTML = slides.map(function (s) {
      return '<div class="slide-item"><img src="' + (s.image_url || s.image) + '" alt="' + (s.title || '') + '"><div><strong>' + (s.title || '') + '</strong><br><small>' + (s.subtitle || '') + '</small></div><span>Order: ' + (s.sort_order || s.order || '') + '</span><div class="item-actions"><button class="btn-edit" onclick="Admin.editSlide(\'' + (s.id || '') + '\')">Edit</button><button class="btn-delete" onclick="Admin.deleteSlide(\'' + (s.id || '') + '\')">Delete</button></div></div>';
    }).join('') || '<p>No slides added yet.</p>';
    document.getElementById('slidesCount').textContent = slides.length + ' slides';
  },

  async addSlide() {
    var fileInput = document.getElementById('slideImage');
    if (!fileInput.files[0]) { showToast('Please select an image', 'error'); return; }
    var image = await compressImage(fileInput.files[0]);
    var slide = {
      title: document.getElementById('slideTitle').value,
      subtitle: document.getElementById('slideSubtitle').value,
      btn_text: document.getElementById('slideBtnText').value,
      btn_link: document.getElementById('slideBtnLink').value,
      image_url: image,
      sort_order: parseInt(document.getElementById('slideOrder').value) || 1
    };
    if (this._editingSlideId) {
      await DataStore.update('SLIDES', this._editingSlideId, slide);
      showToast('Slide updated in Supabase!');
      this._editingSlideId = null;
    } else {
      await DataStore.push('SLIDES', slide);
      showToast('Slide added to Supabase!');
    }
    this.loadSlides();
    clearForm(['slideTitle', 'slideSubtitle', 'slideBtnText', 'slideBtnLink', 'slideImage']);
    document.getElementById('slideImage').value = '';
  },

  async deleteSlide(id) {
    if (!confirm('Delete this slide?')) return;
    await DataStore.delete('SLIDES', id);
    showToast('Slide deleted from Supabase');
    this.loadSlides();
  },

  editSlide(id) {
    var self = this;
    DataStore.get('SLIDES').then(function (slides) {
      var slide = (slides || []).find(function (s) { return String(s.id) === String(id); });
      if (!slide) return;
      self._editingSlideId = id;
      setVal('slideTitle', slide.title);
      setVal('slideSubtitle', slide.subtitle);
      setVal('slideBtnText', slide.btn_text || slide.btnText || '');
      setVal('slideBtnLink', slide.btn_link || slide.btnLink || '');
      setVal('slideOrder', slide.sort_order || slide.order || 1);
      showToast('Editing slide — click "Add Slide" to save changes');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  },

  async loadAbout() {
    var about = await DataStore.get('ABOUT') || {};
    setVal('aboutHistory', about.history || '');
    setVal('aboutVision', about.vision || '');
    setVal('aboutMission', about.mission || '');
    setVal('aboutValues', about.values || '');
    setVal('principalName', about.principal_name || about.principalName || '');
    setVal('principalMessage', about.principal_message || about.principalMessage || '');
    setVal('generalBlockDesc', about.general_block || about.generalBlock || '');
    setVal('technicalBlockDesc', about.technical_block || about.technicalBlock || '');
    var photo = about.principal_photo || about.principalPhoto;
    if (photo) {
      var preview = document.getElementById('principalPhotoPreview');
      if (preview) preview.innerHTML = '<img src="' + photo + '" alt="Principal">';
    }
  },

  async saveAbout() {
    var fileInput = document.getElementById('principalPhoto');
    var about = {
      history: document.getElementById('aboutHistory').value,
      vision: document.getElementById('aboutVision').value,
      mission: document.getElementById('aboutMission').value,
      values: document.getElementById('aboutValues').value,
      principal_name: document.getElementById('principalName').value,
      principal_message: document.getElementById('principalMessage').value,
      general_block: document.getElementById('generalBlockDesc').value,
      technical_block: document.getElementById('technicalBlockDesc').value
    };
    if (fileInput.files[0]) {
      about.principal_photo = await compressImage(fileInput.files[0]);
    } else {
      var existing = await DataStore.get('ABOUT') || {};
      about.principal_photo = existing.principal_photo || existing.principalPhoto || '';
    }
    await DataStore.set('ABOUT', about);
    showToast('About section saved to Supabase!');
    this.loadAbout();
  },

  async loadStats() {
    var stats = await DataStore.get('STATS') || {};
    setVal('statStudents', stats.students || 0);
    setVal('statTeachers', stats.teachers || 0);
    setVal('statStaff', stats.staff || 0);
    setVal('statGraduates', stats.graduates || 0);
    setVal('statYears', stats.years || 10);
  },

  async saveStats() {
    var stats = {
      students: parseInt(document.getElementById('statStudents').value) || 0,
      teachers: parseInt(document.getElementById('statTeachers').value) || 0,
      staff: parseInt(document.getElementById('statStaff').value) || 0,
      graduates: parseInt(document.getElementById('statGraduates').value) || 0,
      years: parseInt(document.getElementById('statYears').value) || 10
    };
    await DataStore.set('STATS', stats);
    showToast('Statistics saved to Supabase!');
  },

  async loadNotices() {
    var notices = await DataStore.get('NOTICES') || [];
    var container = document.getElementById('noticesList');
    container.innerHTML = notices.map(function (n) {
      return '<div class="notice-item priority-' + (n.priority || 'normal') + '"><div><strong>' + (n.title || '') + '</strong><br><small>' + (n.date || '') + ' | ' + (n.priority || 'normal') + '</small></div><div class="item-actions"><button class="btn-edit" onclick="Admin.editNotice(\'' + (n.id || '') + '\')">Edit</button><button class="btn-delete" onclick="Admin.deleteNotice(\'' + (n.id || '') + '\')">Delete</button></div></div>';
    }).join('') || '<p>No notices added yet.</p>';
    document.getElementById('noticesCount').textContent = notices.length + ' notices';
  },

  async addNotice() {
    var title = document.getElementById('noticeTitle').value;
    if (!title) { showToast('Please enter a title', 'error'); return; }
    var notice = {
      title: title,
      date: document.getElementById('noticeDate').value,
      content: document.getElementById('noticeContent').value,
      priority: document.getElementById('noticePriority').value,
      attachment_url: document.getElementById('noticeAttachment').value
    };
    if (this._editingNoticeId) {
      await DataStore.update('NOTICES', this._editingNoticeId, notice);
      showToast('Notice updated in Supabase!');
      this._editingNoticeId = null;
    } else {
      await DataStore.push('NOTICES', notice);
      showToast('Notice added to Supabase!');
    }
    this.loadNotices();
    clearForm(['noticeTitle', 'noticeDate', 'noticeContent', 'noticeAttachment']);
  },

  async deleteNotice(id) {
    if (!confirm('Delete this notice?')) return;
    await DataStore.delete('NOTICES', id);
    showToast('Notice deleted from Supabase');
    this.loadNotices();
  },

  editNotice(id) {
    var self = this;
    DataStore.get('NOTICES').then(function (notices) {
      var n = (notices || []).find(function (x) { return String(x.id) === String(id); });
      if (!n) return;
      self._editingNoticeId = id;
      setVal('noticeTitle', n.title);
      setVal('noticeDate', n.date);
      setVal('noticeContent', n.content);
      setVal('noticePriority', n.priority || 'normal');
      setVal('noticeAttachment', n.attachment_url || n.attachment || '');
      showToast('Editing notice — click "Add Notice" to save changes');
    });
  },

  async loadPrograms() {
    var programs = await DataStore.get('PROGRAMS') || [];
    var container = document.getElementById('programsGrid');
    container.innerHTML = programs.map(function (p, i) {
      var subjects = '';
      if (p.subjects) {
        if (typeof p.subjects === 'string') {
          try { var parsed = JSON.parse(p.subjects); subjects = parsed; } catch(e) { subjects = []; }
        } else { subjects = p.subjects; }
      }
      var subsHtml = '';
      if (subjects && subjects.length) {
        subsHtml = '<div style="margin-top:10px;padding-left:15px;border-left:2px solid #f5a623">' + subjects.map(function (s, j) {
          return '<div><input type="checkbox" ' + (s.visible !== false ? 'checked' : '') + ' onchange="Admin.updateSubject(' + i + ',' + j + ',this.checked)"> <input type="text" value="' + (s.name || '') + '" style="width:65%" onchange="Admin.updateSubjectName(' + i + ',' + j + ',this.value)"></div>';
        }).join('') + '</div>';
      }
      return '<div class="program-card" data-index="' + i + '" data-id="' + (p.id || '') + '"><h4>' + (p.name || '') + ' <input type="checkbox" ' + (p.visible !== false ? 'checked' : '') + ' onchange="Admin.toggleProgram(' + i + ')"></h4><textarea onchange="Admin.updateProgram(' + i + ',\'description\',this.value)">' + (p.description || '') + '</textarea>' + subsHtml + '</div>';
    }).join('');
    document.getElementById('programsCount').textContent = programs.length + ' programs';
  },

  getDefaultPrograms() {
    return [
      { name: 'ECD / Nursery', description: 'Early Childhood Development for ages 3-4', visible: true, type: 'ecd', sort_order: 1 },
      { name: 'LKG / KG', description: 'Lower Kindergarten for ages 4-5', visible: true, type: 'ecd', sort_order: 2 },
      { name: 'UKG', description: 'Upper Kindergarten for ages 5-6', visible: true, type: 'ecd', sort_order: 3 },
      { name: 'Primary (1-5)', description: 'Primary education focusing on foundational skills', visible: true, type: 'general', sort_order: 4 },
      { name: 'Lower Secondary (6-8)', description: 'Comprehensive secondary education', visible: true, type: 'general', sort_order: 5 },
      { name: 'Secondary (9-10)', description: 'SEE preparation', visible: true, type: 'general', sort_order: 6 },
      { name: 'Higher Secondary (11-12)', description: 'Plus Two education', visible: true, type: 'general', sort_order: 7 },
      { name: 'Computer Engineering', description: 'Technical education (Grade 9-12)', visible: true, type: 'technical', sort_order: 8,
        subjects: [{ name: 'Programming Fundamentals', visible: true }, { name: 'Web Technology', visible: true }, { name: 'Database Management', visible: true }, { name: 'Computer Networks', visible: true }, { name: 'Hardware & Maintenance', visible: true }] }
    ];
  },

  async toggleProgram(index) {
    var programs = await DataStore.get('PROGRAMS') || [];
    if (programs[index]) { programs[index].visible = !programs[index].visible; await DataStore.set('PROGRAMS', programs); }
  },

  async updateProgram(index, field, value) {
    var programs = await DataStore.get('PROGRAMS') || [];
    if (programs[index]) { programs[index][field] = value; await DataStore.set('PROGRAMS', programs); }
  },

  async updateSubject(index, j, checked) {
    var programs = await DataStore.get('PROGRAMS') || [];
    if (programs[index]) {
      var subs = programs[index].subjects;
      if (typeof subs === 'string') try { subs = JSON.parse(subs); } catch(e) { subs = []; }
      if (subs && subs[j]) { subs[j].visible = checked; programs[index].subjects = subs; await DataStore.set('PROGRAMS', programs); }
    }
  },

  async updateSubjectName(index, j, value) {
    var programs = await DataStore.get('PROGRAMS') || [];
    if (programs[index]) {
      var subs = programs[index].subjects;
      if (typeof subs === 'string') try { subs = JSON.parse(subs); } catch(e) { subs = []; }
      if (subs && subs[j]) { subs[j].name = value; programs[index].subjects = subs; await DataStore.set('PROGRAMS', programs); }
    }
  },

  savePrograms() { showToast('Programs saved to Supabase!'); },

  async addProgram() {
    var name = document.getElementById('programName').value;
    if (!name) { showToast('Please enter program name', 'error'); return; }
    var program = {
      name: name,
      description: document.getElementById('programDescription').value,
      visible: true,
      type: 'general',
      sort_order: 1
    };
    await DataStore.push('PROGRAMS', program);
    showToast('Program added to Supabase!');
    this.loadPrograms();
    document.getElementById('programName').value = '';
    document.getElementById('programDescription').value = '';
  },

  async loadTeachers() {
    var teachers = await DataStore.get('TEACHERS') || [];
    var container = document.getElementById('teachersGrid');
    container.innerHTML = teachers.map(function (t) {
      var photo = t.photo_url || t.photo || '';
      var initial = t.name ? t.name.charAt(0) : 'T';
      var placeholder = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="#1a3a5c" width="100" height="100"/><text x="50" y="60" text-anchor="middle" fill="white" font-size="40">' + initial + '</text></svg>');
      return '<div class="item-card"><img src="' + (photo || placeholder) + '" alt="' + (t.name || '') + '" onerror="this.src=\'' + placeholder + '\'"><div class="item-info"><h4>' + (t.name || '') + '</h4><p>' + (t.subject || '') + '</p><p>' + (t.qualification || '') + '</p><p>' + (t.block || '') + '</p></div><div class="item-actions"><button class="btn-edit" onclick="Admin.editTeacher(\'' + (t.id || '') + '\')">Edit</button><button class="btn-delete" onclick="Admin.deleteTeacher(\'' + (t.id || '') + '\')">Delete</button></div></div>';
    }).join('') || '<p>No teachers added yet.</p>';
    document.getElementById('teachersCount').textContent = teachers.length + ' teachers';
  },

  async addTeacher() {
    var name = document.getElementById('teacherName').value;
    if (!name) { showToast('Please enter teacher name', 'error'); return; }
    var teacher = { name: name, subject: document.getElementById('teacherSubject').value, qualification: document.getElementById('teacherQualification').value, designation: document.getElementById('teacherDesignation').value, block: document.getElementById('teacherBlock').value };
    var fileInput = document.getElementById('teacherPhoto');
    if (fileInput.files[0]) teacher.photo_url = await compressImage(fileInput.files[0]);
    if (this._editingTeacherId) {
      await DataStore.update('TEACHERS', this._editingTeacherId, teacher);
      showToast('Teacher updated in Supabase!');
      this._editingTeacherId = null;
    } else {
      await DataStore.push('TEACHERS', teacher);
      showToast('Teacher added to Supabase!');
    }
    this.loadTeachers();
    clearForm(['teacherName', 'teacherSubject', 'teacherQualification', 'teacherDesignation', 'teacherPhoto']);
  },

  async deleteTeacher(id) {
    if (!confirm('Delete this teacher?')) return;
    await DataStore.delete('TEACHERS', id);
    showToast('Teacher deleted from Supabase');
    this.loadTeachers();
  },

  editTeacher(id) {
    var self = this;
    DataStore.get('TEACHERS').then(function (teachers) {
      var t = (teachers || []).find(function (x) { return String(x.id) === String(id); });
      if (!t) return;
      self._editingTeacherId = id;
      setVal('teacherName', t.name);
      setVal('teacherSubject', t.subject);
      setVal('teacherQualification', t.qualification);
      setVal('teacherDesignation', t.designation || '');
      setVal('teacherBlock', t.block || 'General');
      showToast('Editing teacher — click "Add Teacher" to save changes');
    });
  },

  async loadStaff() {
    var staff = await DataStore.get('STAFF') || [];
    var container = document.getElementById('staffGrid');
    container.innerHTML = staff.map(function (s) {
      var photo = s.photo_url || s.photo || '';
      var placeholder = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="#1a3a5c" width="100" height="100"/><text x="50" y="60" text-anchor="middle" fill="white" font-size="40">S</text></svg>');
      return '<div class="item-card"><img src="' + (photo || placeholder) + '" alt="' + (s.name || '') + '" onerror="this.src=\'' + placeholder + '\'"><div class="item-info"><h4>' + (s.name || '') + '</h4><p>' + (s.position || '') + '</p><p>' + (s.contact || '') + '</p></div><div class="item-actions"><button class="btn-delete" onclick="Admin.deleteStaff(\'' + (s.id || '') + '\')">Delete</button></div></div>';
    }).join('') || '<p>No staff added yet.</p>';
    document.getElementById('staffCount').textContent = staff.length + ' staff';
  },

  async addStaff() {
    var name = document.getElementById('staffName').value;
    if (!name) { showToast('Please enter staff name', 'error'); return; }
    var staff = { name: name, position: document.getElementById('staffPosition').value, contact: document.getElementById('staffContact').value };
    var fileInput = document.getElementById('staffPhoto');
    if (fileInput.files[0]) staff.photo_url = await compressImage(fileInput.files[0]);
    await DataStore.push('STAFF', staff);
    showToast('Staff added to Supabase!');
    this.loadStaff();
    clearForm(['staffName', 'staffPosition', 'staffContact', 'staffPhoto']);
  },

  async deleteStaff(id) {
    if (!confirm('Delete this staff member?')) return;
    await DataStore.delete('STAFF', id);
    showToast('Staff deleted from Supabase');
    this.loadStaff();
  },

  async loadGallery() {
    var gallery = await DataStore.get('GALLERY') || [];
    var container = document.getElementById('galleryGrid');
    container.innerHTML = gallery.map(function (img, i) {
      return '<div class="gallery-item"><img src="' + (img.src || img.image_url || '') + '" alt="' + (img.caption || '') + '"><button class="delete-btn" onclick="Admin.deleteGallery(' + i + ')"><i class="fas fa-trash"></i></button><div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.7);color:white;padding:5px;font-size:0.8rem">' + (img.category || '') + '</div></div>';
    }).join('') || '<p>No gallery images yet.</p>';
    document.getElementById('galleryCount').textContent = gallery.length + ' images';
  },

  async addGallery() {
    var fileInput = document.getElementById('galleryImage');
    var category = document.getElementById('galleryCategory').value;
    var caption = document.getElementById('galleryCaption').value;
    if (!fileInput.files.length) { showToast('Please select images', 'error'); return; }
    for (var i = 0; i < fileInput.files.length; i++) {
      var img = await compressImage(fileInput.files[i], 1200, 0.7);
      await DataStore.push('GALLERY', { src: img, image_url: img, category: category, caption: caption, date: new Date().toISOString().split('T')[0] });
    }
    showToast('Images added to Supabase gallery!');
    this.loadGallery();
    document.getElementById('galleryImage').value = '';
  },

  async deleteGallery(index) {
    if (!confirm('Delete this image?')) return;
    var gallery = await DataStore.get('GALLERY') || [];
    var item = gallery[index];
    if (item && item.id) await DataStore.delete('GALLERY', item.id);
    else {
      gallery.splice(index, 1);
      await DataStore.set('GALLERY', gallery);
    }
    showToast('Image deleted from Supabase');
    this.loadGallery();
  },

  async loadEvents() {
    var events = await DataStore.get('EVENTS') || [];
    var container = document.getElementById('eventsList');
    container.innerHTML = events.map(function (e) {
      return '<div class="event-item"><div><strong>' + (e.title || '') + '</strong><br><small>' + (e.date || '') + '</small></div><div class="item-actions"><button class="btn-delete" onclick="Admin.deleteEvent(\'' + (e.id || '') + '\')">Delete</button></div></div>';
    }).join('') || '<p>No events added yet.</p>';
    document.getElementById('eventsCount').textContent = events.length + ' events';
  },

  async addEvent() {
    var title = document.getElementById('eventTitle').value;
    if (!title) { showToast('Please enter event title', 'error'); return; }
    var ev = { title: title, date: document.getElementById('eventDate').value, description: document.getElementById('eventDescription').value };
    var fileInput = document.getElementById('eventImage');
    if (fileInput.files[0]) ev.image_url = await compressImage(fileInput.files[0]);
    await DataStore.push('EVENTS', ev);
    showToast('Event added to Supabase!');
    this.loadEvents();
    clearForm(['eventTitle', 'eventDate', 'eventDescription', 'eventImage']);
  },

  async deleteEvent(id) {
    if (!confirm('Delete this event?')) return;
    await DataStore.delete('EVENTS', id);
    showToast('Event deleted from Supabase');
    this.loadEvents();
  },

  async loadTestimonials() {
    var testimonials = await DataStore.get('TESTIMONIALS') || [];
    var container = document.getElementById('testimonialsGrid');
    function card(t) {
      var photo = t.photo_url || t.photo || '';
      var placeholder = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="#f5a623" width="100" height="100"/><text x="50" y="60" text-anchor="middle" fill="white" font-size="40">T</text></svg>');
      return '<div class="testimonial-row"><img src="' + (photo || placeholder) + '" alt="' + (t.name || '') + '" onerror="this.src=\'' + placeholder + '\'"><div class="testimonial-body"><h4>' + (t.name || '') + '</h4><span class="trole">' + (t.role || '') + '</span><p class="tquote">"' + (t.quote || '') + '"</p></div><div class="item-actions"><button class="btn-delete" onclick="Admin.deleteTestimonial(\'' + (t.id || '') + '\')">Delete</button></div></div>';
    }
    if (testimonials.length) {
      container.innerHTML = '<div class="testimonial-track">' + testimonials.map(card).join('') + testimonials.map(card).join('') + '</div>';
    } else {
      container.innerHTML = '<p>No testimonials yet.</p>';
    }
    document.getElementById('testimonialsCount').textContent = testimonials.length + ' testimonials';
  },

  async addTestimonial() {
    var name = document.getElementById('testimonialName').value;
    if (!name) { showToast('Please enter name', 'error'); return; }
    var t = { name: name, role: document.getElementById('testimonialDesignation').value, quote: document.getElementById('testimonialMessage').value };
    var fileInput = document.getElementById('testimonialPhoto');
    if (fileInput.files[0]) t.photo_url = await compressImage(fileInput.files[0]);
    await DataStore.push('TESTIMONIALS', t);
    showToast('Testimonial added to Supabase!');
    this.loadTestimonials();
    clearForm(['testimonialName', 'testimonialDesignation', 'testimonialMessage', 'testimonialPhoto']);
  },

  async deleteTestimonial(id) {
    if (!confirm('Delete this testimonial?')) return;
    await DataStore.delete('TESTIMONIALS', id);
    showToast('Testimonial deleted from Supabase');
    this.loadTestimonials();
  },

  async loadMarquee() {
    var marquee = await DataStore.get('MARQUEE') || { enabled: true, items: [], text: '' };
    var enabledCheck = document.getElementById('marqueeEnabled');
    if (enabledCheck) enabledCheck.checked = marquee.enabled !== false;
    setVal('marqueeText', marquee.text || '');
    var container = document.getElementById('marqueeList');
    var items = marquee.items || [];
    if (typeof items === 'string') try { items = JSON.parse(items); } catch(e) { items = []; }
    container.innerHTML = items.map(function (item, i) {
      return '<div class="marquee-item"><span>' + (item.text || '') + '</span><button class="btn-delete" onclick="Admin.deleteMarqueeItem(' + i + ')">Delete</button></div>';
    }).join('') || '';
    document.getElementById('marqueeCount').textContent = items.length + ' items';
  },

  async addMarqueeItem() {
    var text = document.getElementById('marqueeItemText').value;
    if (!text) { showToast('Please enter text', 'error'); return; }
    var marquee = await DataStore.get('MARQUEE') || { enabled: true, items: [], text: '' };
    var items = marquee.items || [];
    if (typeof items === 'string') try { items = JSON.parse(items); } catch(e) { items = []; }
    items.push({ text: text });
    marquee.items = items;
    await DataStore.set('MARQUEE', marquee);
    showToast('Marquee item added to Supabase!');
    this.loadMarquee();
    document.getElementById('marqueeItemText').value = '';
  },

  async deleteMarqueeItem(index) {
    var marquee = await DataStore.get('MARQUEE') || { enabled: true, items: [], text: '' };
    var items = marquee.items || [];
    if (typeof items === 'string') try { items = JSON.parse(items); } catch(e) { items = []; }
    items.splice(index, 1);
    marquee.items = items;
    await DataStore.set('MARQUEE', marquee);
    this.loadMarquee();
  },

  async saveMarqueeSettings() {
    var marquee = await DataStore.get('MARQUEE') || { enabled: true, items: [], text: '' };
    marquee.enabled = document.getElementById('marqueeEnabled').checked;
    marquee.text = document.getElementById('marqueeText').value;
    await DataStore.set('MARQUEE', marquee);
    showToast('Marquee settings saved to Supabase!');
  },

  async loadAdmissions() {
    try {
      var { data } = await supabase.select('admissions', { order: 'submitted_at.desc' });
      var admissions = data || [];
    } catch(e) {
      var admissions = JSON.parse(localStorage.getItem('sss_admissions') || '[]');
    }
    var container = document.getElementById('admissionsList');
    container.innerHTML = admissions.map(function (a) {
      return '<div class="admission-item"><div><strong>' + (a.studentName || a.name || '') + '</strong> - Class ' + (a.applyClass || a.class || '') + '<br><small>' + (a.district || '') + ' | ' + (a.fatherName || a.father || '') + '</small></div><span class="badge badge-' + (a.status || 'pending') + '">' + (a.status || 'pending') + '</span></div>';
    }).join('') || '<p>No admission inquiries yet.</p>';
    var total = admissions.length;
    var pending = admissions.filter(function (a) { return a.status === 'pending'; }).length;
    document.getElementById('admissionsTotal').textContent = total;
    document.getElementById('admissionsPending').textContent = pending;
    document.getElementById('admissionsReviewed').textContent = total - pending;
  },
};

function setVal(id, val) {
  var el = document.getElementById(id);
  if (el) el.value = val || '';
}

function clearForm(ids) {
  ids.forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('show');
}

function closeModal() {
  document.getElementById('editModal').classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', function () {
  Admin.init();
  var toggleBtn = document.getElementById('sidebarToggle');
  if (toggleBtn) toggleBtn.addEventListener('click', toggleSidebar);
});

function exportAdmissions() {
  var admissions = JSON.parse(localStorage.getItem('sss_admissions') || '[]');
  if (admissions.length === 0) { alert('No admissions to export'); return; }
  var csv = 'Name,DOB,Gender,Class,Father Name,Phone,District,Municipality,Status\n';
  admissions.forEach(function (a) {
    csv += (a.studentName || a.name || '') + ',' + (a.dob || '') + ',' + (a.gender || '') + ',' + (a.applyClass || a.class || '') + ',' + (a.fatherName || a.father || '') + ',' + (a.fatherPhone || '') + ',' + (a.district || '') + ',' + (a.municipality || '') + ',' + (a.status || 'pending') + '\n';
  });
  var blob = new Blob([csv], { type: 'text/csv' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'admissions_' + new Date().toISOString().split('T')[0] + '.csv';
  a.click();
}

function clearAllAdmissions() {
  if (!confirm('Clear all admission applications? This cannot be undone.')) return;
  DataStore.clear('ADMISSIONS');
  Admin.loadAdmissions();
  showToast('All admissions cleared!');
}

function previewImage(input, previewId) {
  var preview = document.getElementById(previewId);
  if (!preview) return;
  if (input.files && input.files[0]) {
    var reader = new FileReader();
    reader.onload = function (e) { preview.innerHTML = '<img src="' + e.target.result + '" alt="Preview">'; };
    reader.readAsDataURL(input.files[0]);
  }
}

function switchTab(section) {
  var sectionEl = document.getElementById(section);
  if (!sectionEl) return;
  document.querySelectorAll('.admin-section').forEach(function (s) { s.classList.remove('active'); });
  sectionEl.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(function (n) { n.classList.remove('active'); });
  var navItem = document.querySelector('[data-section="' + section + '"]');
  if (navItem) navItem.classList.add('active');
  if (section === 'dashboard') Admin.loadDashboard();
  else if (section === 'admissions') Admin.loadAdmissions();
  if (window.innerWidth < 769) {
    var sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('show');
  }
}

console.log('Admin Supabase CMS initialized');