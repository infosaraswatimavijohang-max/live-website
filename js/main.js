var App = {
  currentSlide: 0,
  slideInterval: null,
  countersStarted: false,
  _loaded: {},
  _settings: null,
  _homepageVisibility: {},

  async init() {
    try {
      const visibility = await DataStore.get('HOMEPAGE_VISIBILITY');
      this._homepageVisibility = visibility || {};
      
      this.renderSplitHero();
      this.setupNavigation();
      this.setupAdmissionForm();
      this.setupScrollReveal();
      this.setupHeaderScroll();
      this.setupParallax();
      var cy = document.getElementById('currentYear');
      if (cy) cy.textContent = new Date().getFullYear();

      const settings = await DataStore.get('SETTINGS');
      this._settings = settings || {};
      await this.renderHeader();
      await this.renderFooter();

      if (this.isSectionVisible('hero')) {
        await this.renderHeroSlides();
      } else {
        this.hideSection('home');
      }

      const sections = [
        { id: 'about', el: 'about', render: 'renderAbout' },
        { id: 'stats', el: 'stats', render: 'renderStats' },
        { id: 'notices', el: 'notices', render: 'renderNotices' },
        { id: 'programs', el: 'programs', render: 'renderPrograms' },
        { id: 'teachers', el: 'teachers', render: 'renderTeachers' },
        { id: 'staff', el: 'staff', render: 'renderStaff' },
        { id: 'gallery', el: 'gallery', render: 'renderGallery' },
        { id: 'events', el: 'events', render: 'renderEvents' },
        { id: 'testimonials', el: 'testimonials', render: 'renderTestimonials' },
        { id: 'admission', el: 'admission', render: 'renderAdmission' },
      ];

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced || !('IntersectionObserver' in window)) {
        for (const sec of sections) {
          if (this.isSectionVisible(sec.id)) {
            await this[sec.render]();
          } else {
            this.hideSection(sec.el);
          }
        }
      } else {
        this._lazyLoadSections(sections);
      }
    } catch (e) {
      console.error('Error initializing app:', e);
    }
  },

  isSectionVisible(sectionId) {
    const v = this._homepageVisibility;
    if (Object.keys(v).length === 0) return true;
    return v[sectionId] !== false;
  },

  hideSection(sectionId) {
    const el = document.getElementById(sectionId);
    if (el) el.style.display = 'none';
  },

  _lazyLoadSections(sections) {
    const io = new IntersectionObserver(async (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const sectionId = entry.target.id;
          if (this._loaded[sectionId]) { io.unobserve(entry.target); continue; }
          
          if (!this.isSectionVisible(sectionId)) {
            this.hideSection(sectionId);
            io.unobserve(entry.target);
            continue;
          }
          
          this._loaded[sectionId] = true;
          io.unobserve(entry.target);
          const sec = sections.find(s => s.el === sectionId || s.id === sectionId);
          if (sec) {
            try { await this[sec.render](); } catch (e) { console.error('Error loading ' + sec.render, e); }
          }
        }
      }
    }, { threshold: 0.05, rootMargin: '0px 0px 200px 0px' });

    sections.forEach(sec => {
      const el = document.getElementById(sec.el) || document.querySelector('[data-section="' + sec.el + '"]');
      if (el) io.observe(el);
    });
  },

  setupScrollReveal() {
    var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || !('IntersectionObserver' in window)) {
      document.querySelectorAll('[data-reveal]').forEach(function (el) { el.classList.add('in-view'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
    document.querySelectorAll('[data-reveal]').forEach(function (el) { io.observe(el); });
  },

  setupParallax() {
    var hero = document.querySelector('.hero');
    if (!hero) return;
    var slides = hero.querySelectorAll('.hero-slide');
    if (!slides.length) return;
    var currentIndex = 0;

    function cycleSlides() {
      var prev = slides[currentIndex];
      var next = (currentIndex + 1) % slides.length;
      prev.classList.remove('active');
      slides[next].classList.add('active');
      currentIndex = next;
    }
    this._parallaxInterval = setInterval(cycleSlides, 5000);

    var heroEl = hero;
    heroEl.addEventListener('mouseenter', function () { clearInterval(App._parallaxInterval); App._parallaxInterval = null; });
    heroEl.addEventListener('mouseleave', function () { if (!App._parallaxInterval) App._parallaxInterval = setInterval(cycleSlides, 5000); });
    var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    this._parallaxHandler = function () {
      var rect = hero.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < window.innerHeight) {
        var progress = Math.min(1, Math.max(0, -rect.top / (hero.offsetHeight * 0.5)));
        var scale = 1.05 + progress * 0.06;
        slides.forEach(function(s) { s.style.transform = 'scale(' + scale + ')'; });
      }
    };
    window.addEventListener('scroll', this._parallaxHandler, { passive: true });
  },

  cleanupParallax() {
    if (this._parallaxInterval) { clearInterval(this._parallaxInterval); this._parallaxInterval = null; }
    if (this._parallaxHandler) { window.removeEventListener('scroll', this._parallaxHandler); this._parallaxHandler = null; }
  },

  setupHeaderScroll() {
    var header = document.getElementById('header');
    if (!header) return;
    var progressBar = document.createElement('div');
    progressBar.className = 'scroll-progress';
    document.body.prepend(progressBar);
    var backBtn = document.createElement('button');
    backBtn.className = 'back-to-top';
    backBtn.setAttribute('aria-label', 'Back to top');
    backBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
    document.body.appendChild(backBtn);
    backBtn.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(function () {
          var st = window.scrollY;
          var dh = document.documentElement.scrollHeight - window.innerHeight;
          if (dh > 0) progressBar.style.width = (st / dh * 100) + '%';
          header.classList.toggle('scrolled', st > 80);
          backBtn.classList.toggle('visible', st > 400);
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  },

  renderSplitHero() {
    var container = document.getElementById('heroSplit');
    if (!container) return;
    var name = 'Shree Saraswati';
    var letters = name.split('');
    var html = '';
    letters.forEach(function (l, i) {
      if (l === ' ') {
        html += '<span class="hero-split-letter space"></span>';
      } else {
        html += '<span class="hero-split-letter" style="animation-delay:' + (i * 0.08) + 's">' + l + '</span>';
      }
    });
    html += '<span class="hero-split-letter" style="animation-delay:' + (letters.length * 0.08 + 0.1) + 's;color:var(--gold)">Secondary</span>';
    html += '<span class="hero-split-letter space"></span>';
    html += '<span class="hero-split-letter" style="animation-delay:' + (letters.length * 0.08 + 0.2) + 's">School</span>';
    container.innerHTML = html;
  },

  renderHeader() {
    var settings = this._settings || {};
    var logoEl = document.getElementById('schoolLogo');
    if (logoEl) logoEl.src = settings.logo || 'assets/images/School circular logo.webp';
    var nameEl = document.getElementById('schoolName');
    if (nameEl) nameEl.textContent = settings.schoolName || 'Shree Saraswati Secondary School';
    var taglineEl = document.getElementById('schoolTagline');
    if (taglineEl) taglineEl.textContent = settings.tagline || '\u0936\u093f\u0915\u094d\u0937\u093e \u0928\u0948 \u0938\u0936\u0915\u094d\u0924\u093f\u0915\u0930\u0923';
  },

  renderAbout() { return DataStore.get('ABOUT').then(function (about) {
    about = about || {};
    var settings = App._settings || {};
    var estEl = document.getElementById('establishedDate');
    if (estEl) estEl.textContent = settings.established || '2016 Bhadra 16';
    var histEl = document.getElementById('aboutHistory');
    if (histEl) histEl.textContent = about.history || 'Shree Saraswati Secondary School is committed to providing quality education.';
    var visEl = document.getElementById('aboutVision');
    if (visEl) visEl.textContent = about.vision || 'To be a center of excellence.';
    var missEl = document.getElementById('aboutMission');
    if (missEl) missEl.textContent = about.mission || 'To provide quality education.';
    var valEl = document.getElementById('aboutValues');
    if (valEl) valEl.textContent = about.values || 'Integrity, Excellence, Innovation.';
    var pnEl = document.getElementById('principalName');
    if (pnEl) pnEl.textContent = about.principal_name || about.principalName || 'Principal';
    var pmEl = document.getElementById('principalMessage');
    if (pmEl) pmEl.textContent = about.principal_message || about.principalMessage || 'Welcome to our school.';
    var gbEl = document.getElementById('generalBlockDesc');
    if (gbEl) gbEl.textContent = about.general_block || about.generalBlock || 'General Block';
    var tbEl = document.getElementById('technicalBlockDesc');
    if (tbEl) tbEl.textContent = about.technical_block || about.technicalBlock || 'Technical Block';
    var ppEl = document.getElementById('principalPhoto');
    if (ppEl) ppEl.src = about.principal_photo || about.principalPhoto || 'assets/images/Teachers/Chhabilal Bhandari.webp';
  }); },

  renderStats() { return DataStore.get('STATS').then(function (stats) {
    stats = stats || {};
    var sEl = document.getElementById('statStudents');
    if (sEl) { sEl.dataset.target = stats.students || 245; sEl.textContent = '0'; }
    var tEl = document.getElementById('statTeachers');
    if (tEl) { tEl.dataset.target = stats.teachers || 36; tEl.textContent = '0'; }
    var gEl = document.getElementById('statGraduates');
    if (gEl) { gEl.dataset.target = stats.graduates || 15000; gEl.textContent = '0'; }
    var yEl = document.getElementById('statYears');
    if (yEl) { yEl.dataset.target = stats.years || 66; yEl.textContent = '0'; }
    this.startCounters();
  }.bind(this)); },

  startCounters() {
    if (this.countersStarted) return;
    this.countersStarted = true;
    var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || !('IntersectionObserver' in window)) {
      this.animateCounters();
      return;
    }
    var self = this;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          self.animateCounters();
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    var grid = document.getElementById('statsGrid');
    if (grid) io.observe(grid);
  },

  animateCounters() {
    document.querySelectorAll('.stat-number[data-target]').forEach(function (el) {
      var target = parseInt(el.dataset.target) || 0;
      if (target === 0) { el.textContent = '0'; return; }
      var duration = 1500;
      var start = performance.now();
      function step(now) {
        var progress = Math.min(1, (now - start) / duration);
        var eased = 1 - Math.pow(1 - progress, 3);
        var current = Math.round(eased * target);
        el.textContent = current;
        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = target;
      }
      requestAnimationFrame(step);
    });
  },

  renderNotices() { return DataStore.get('NOTICES').then(function (notices) {
    notices = notices || [];
    var container = document.getElementById('noticesList');
    if (!container) return;
    var display = notices.slice(0, 5);
    container.innerHTML = display.map(function (n) {
      return '<div class="notice-row">' +
        '<span class="ndate">' + (n.date || '') + '</span>' +
        '<span class="ntitle">' + (n.title || '') + ' <span class="nsnippet">' + (n.content || '') + '</span></span>' +
        '<span class="nbadge ' + (n.priority || 'normal') + '">' + (n.priority || 'normal') + '</span>' +
        '</div>';
    }).join('');
    this.renderAnnualPlan();
  }.bind(this)); },

  toggleAllNotices() {
    DataStore.get('NOTICES').then(function (notices) {
      notices = notices || [];
      var container = document.getElementById('noticesList');
      if (!container) return;
      if (container.dataset.expanded === 'true') {
        container.innerHTML = notices.slice(0, 5).map(function (n) {
          return '<div class="notice-row"><span class="ndate">' + (n.date || '') + '</span><span class="ntitle">' + (n.title || '') + ' <span class="nsnippet">' + (n.content || '') + '</span></span><span class="nbadge ' + (n.priority || 'normal') + '">' + (n.priority || 'normal') + '</span></div>';
        }).join('');
        container.dataset.expanded = 'false';
      } else {
        container.innerHTML = notices.map(function (n) {
          return '<div class="notice-row"><span class="ndate">' + (n.date || '') + '</span><span class="ntitle">' + (n.title || '') + ' <span class="nsnippet">' + (n.content || '') + '</span></span><span class="nbadge ' + (n.priority || 'normal') + '">' + (n.priority || 'normal') + '</span></div>';
        }).join('');
        container.dataset.expanded = 'true';
      }
    });
  },

  renderAnnualPlan() {
    var planEl = document.getElementById('annualPlan');
    var calEl = document.getElementById('nepaliCal');
    if (!planEl || !calEl) return;
    var bs = bsDateFromAd(new Date());
    planEl.innerHTML =
      '<div class="yp-header"><h3 class="yp-title">Annual Work Plan 2083</h3><div class="month-picker" id="monthPicker"></div></div>' +
      '<div class="yp-body" id="ypBody"></div>';
    var picker = document.getElementById('monthPicker');
    picker.innerHTML = MONTH_ORDER.map(function (m, i) {
      return '<button class="mon-btn" data-month="' + m + '" data-idx="' + i + '">' + m + '</button>';
    }).join('');
    this.renderBsCalendar(bs.month, bs.day);
    this.showMonthActivities(MONTH_ORDER[bs.month]);
    picker.querySelector('[data-idx="' + bs.month + '"]').classList.add('active');
    var self = this;
    picker.addEventListener('click', function (e) {
      var btn = e.target.closest('.mon-btn');
      if (!btn) return;
      picker.querySelectorAll('.mon-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      self.showMonthActivities(btn.dataset.month);
      self.renderBsCalendar(parseInt(btn.dataset.idx), -1);
    });
  },

  renderBsCalendar(monthIdx, highlightDay) {
    var container = document.getElementById('nepaliCal');
    if (!container) return;
    var grid = bsMonthGrid(monthIdx);
    var bsMonthsFull = ['Baisakh','Jestha','Ashadh','Shrawan','Bhadra','Ashwin','Kartik','Mangsir','Poush','Magh','Falgun','Chaitra'];
    var adMonths = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var enDays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    var monthName = bsMonthsFull[monthIdx];
    var planItems = ANNUAL_PLAN[monthName] || [];
    var holidays = (typeof BS_HOLIDAYS !== 'undefined' && BS_HOLIDAYS[monthName]) || [];
    function typeClass(activity) {
      if (/vacation|holiday/i.test(activity)) return 'cal-holiday';
      if (/exam|test|terminal|pre-board|examination/i.test(activity)) return 'cal-exam';
      if (/meeting|staff/i.test(activity)) return 'cal-meeting';
      if (/sports|athletics|shield/i.test(activity)) return 'cal-sports';
      if (/competition|contest|speech|quiz|dance|spelling|race|drawing|handwriting|essay|debate/i.test(activity)) return 'cal-competition';
      if (/celebration|felicitation|prize|assembly|school.?day|result|closing|farewell|graduation/i.test(activity)) return 'cal-celebration';
      if (/tour|trip|visit/i.test(activity)) return 'cal-tour';
      if (/admission|registration|record|iemis|audit/i.test(activity)) return 'cal-admin';
      return 'cal-regular';
    }
    var typeLabels = {
      'cal-holiday': { abbr: 'HL', icon: '🏖', label: 'Holiday', cls: 'cal-badge-holiday' },
      'cal-exam': { abbr: 'EX', icon: '📝', label: 'Exam', cls: 'cal-badge-exam' },
      'cal-meeting': { abbr: 'MT', icon: '📋', label: 'Meeting', cls: 'cal-badge-meeting' },
      'cal-competition': { abbr: 'EV', icon: '🏆', label: 'Event', cls: 'cal-badge-competition' },
      'cal-celebration': { abbr: 'CL', icon: '🎉', label: 'Celebration', cls: 'cal-badge-celebration' },
      'cal-sports': { abbr: 'SP', icon: '⚽', label: 'Sports', cls: 'cal-badge-sports' },
      'cal-tour': { abbr: 'TR', icon: '🚌', label: 'Tour', cls: 'cal-badge-tour' },
      'cal-admin': { abbr: 'AD', icon: '📁', label: 'Admin', cls: 'cal-badge-admin' },
      'cal-regular': { abbr: '', icon: '', label: '', cls: '' }
    };
    var dayTypes = {};
    planItems.forEach(function (a) {
      var dateStr = a.date;
      var tc = typeClass(a.activity);
      var isRange = dateStr.indexOf('-') > -1 || dateStr.indexOf('\u2013') > -1;
      var isLast = dateStr.indexOf('Last') > -1;
      function mark(d, pos) { if (d >= 1 && d <= BS_MONTH_DAYS[monthIdx]) { if (!dayTypes[d]) dayTypes[d] = []; dayTypes[d].push({ type: tc, label: a.activity, pos: pos || '' }); } }
      if (isLast) {
        var last = {};
        for (var w = grid.length - 1; w >= 0; w--)
          for (var d = grid[w].length - 1; d >= 0; d--)
            if (grid[w][d].bs && !last[grid[w][d].dow]) last[grid[w][d].dow] = grid[w][d].bs;
        if (last[3]) mark(last[3]); if (last[4]) mark(last[4]);
        return;
      }
      if (dateStr.indexOf('From') > -1) { var p = dateStr.match(/(\d+)/g); if (p) mark(parseInt(p[0])); return; }
      if (dateStr.indexOf('As per') > -1) return;
      if (isRange) { var pts = dateStr.match(/(\d+)/g); if (pts) { var f = parseInt(pts[0]), t = parseInt(pts[1]||pts[0]); for (var d = f; d <= t; d++) mark(d, d === f ? 'start' : (d === t ? 'end' : 'mid')); } return; }
      var pts = dateStr.match(/(\d+)/g);
      if (pts) mark(parseInt(pts[0]));
    });
    holidays.forEach(function (h) {
      if (h.day < 1 || h.day > BS_MONTH_DAYS[monthIdx]) return;
      if (!dayTypes[h.day]) dayTypes[h.day] = [];
      dayTypes[h.day].push({ type: 'cal-holiday', label: h.name, pos: '', fest: true });
    });
    container.innerHTML =
      '<div class="cal-head"><span class="cal-month">' + monthName + ' ' + BS_YEAR + '</span><span class="cal-head-sub">' + planItems.length + ' activities' + (holidays.length ? ' · ' + holidays.length + ' holidays' : '') + '</span></div>' +
      '<div class="cal-dows">' + enDays.map(function (d) { return '<span class="cal-dow">' + d + '</span>'; }).join('') + '</div>' +
      '<div class="cal-grid">' + grid.map(function (week) {
        return week.map(function (c) {
          if (!c.bs) return '<span class="cal-empty"></span>';
          var cls = 'cal-cell';
          if (c.bs === highlightDay) cls += ' cal-today';
          if (c.dow === 0) cls += ' cal-sun';
          if (c.dow === 6) cls += ' cal-sat';
          var dt = dayTypes[c.bs];
          var hasHoliday = dt && dt.some(function(x){ return x.type === 'cal-holiday'; });
          var topType = 'cal-regular';
          if (dt) {
            if (hasHoliday) topType = 'cal-holiday';
            else {
              var rank = ['cal-exam','cal-meeting','cal-competition','cal-celebration','cal-sports','cal-tour','cal-admin','cal-regular'];
              for (var r = 0; r < rank.length; r++) { if (dt.some(function(x){ return x.type === rank[r]; })) { topType = rank[r]; break; } }
            }
            cls += ' ' + topType;
            var isStart = dt.some(function(x){ return x.pos === 'start'; });
            var isEnd = dt.some(function(x){ return x.pos === 'end'; });
            if (isStart) cls += ' cal-range-start';
            if (isEnd) cls += ' cal-range-end';
          }
          var tip = dt ? dt.map(function(x){ return x.label; }).join('; ') : '';
          var tl = typeLabels[topType] || { abbr: '', icon: '', label: '', cls: '' };
          var festName = dt ? dt.filter(function(x){ return x.fest; }).map(function(x){ return x.label; }).join(' / ') : '';
          var badgeHtml = '';
          if (dt && (festName || tl.abbr)) {
            badgeHtml = '<span class="cal-badge ' + (festName ? 'cal-badge-holiday' : tl.cls) + '"' + (festName && tip ? ' title="' + tip + '"' : '') + '>' + (tl.icon ? tl.icon + ' ' : '') + (festName || tl.label) + '</span>';
          }
          return '<span class="' + cls + '"' + (tip && !festName ? ' title="' + tip + '"' : '') + '>' + badgeHtml + '<span class="cal-bs">' + c.bs + '</span><span class="cal-ad">' + c.ad.split('/')[0] + ' ' + adMonths[parseInt(c.ad.split('/')[1])-1] + '</span></span>';
        }).join('');
      }).join('') + '</div>' +
      '<div class="cal-legend"><span><span class="leg-dot leg-holiday"></span>Holiday</span><span><span class="leg-dot leg-exam"></span>Exam</span><span><span class="leg-dot leg-meeting"></span>Meeting</span><span><span class="leg-dot leg-competition"></span>Event</span><span><span class="leg-dot leg-celebration"></span>Celebration</span><span><span class="leg-dot leg-sports"></span>Sports</span></div>';
  },

  showMonthActivities(month) {
    var container = document.getElementById('ypBody');
    if (!container) return;
    var items = ANNUAL_PLAN[month] || [];
    var holidays = (typeof BS_HOLIDAYS !== 'undefined' && BS_HOLIDAYS[month]) || [];
    if (!items.length && !holidays.length) {
      container.innerHTML = '<p class="yp-empty">No activities for ' + month + '.</p>';
      return;
    }
    var monthIdx = MONTH_ORDER.indexOf(month);
    var grid = monthIdx >= 0 ? bsMonthGrid(monthIdx) : [];
    function ordinal(n) {
      var sfx = 'th';
      if (n % 10 === 1 && n % 100 !== 11) sfx = 'st';
      else if (n % 10 === 2 && n % 100 !== 12) sfx = 'nd';
      else if (n % 10 === 3 && n % 100 !== 13) sfx = 'rd';
      return n + sfx;
    }
    function lastWeekday(dow) {
      for (var w = grid.length - 1; w >= 0; w--)
        for (var d = grid[w].length - 1; d >= 0; d--)
          if (grid[w][d].bs && grid[w][d].dow === dow) return grid[w][d].bs;
      return 99;
    }
    function startDay(dateStr) {
      var m = dateStr.match(/(\d+)/g);
      if (m && m.length) return parseInt(m[0], 10);
      if (/last/i.test(dateStr)) return Math.min(lastWeekday(3), lastWeekday(4));
      return 99;
    }
    function holidayCard(h) {
      return '<div class="yp-card yp-holiday"><span class="yp-date">' + ordinal(h.day) + '</span><div class="yp-body-inner"><span class="yp-activity">' + h.name + '</span><span class="yp-meta">National Holiday</span></div></div>';
    }
    function programCard(a) {
      var act = a.activity;
      var cls = 'yp-card';
      if (/vacation|holiday/i.test(act)) cls += ' yp-holiday';
      else if (/exam|test|terminal|pre-board/i.test(act)) cls += ' yp-exam';
      else if (/competition|contest|speech|quiz|dance|spelling|race|drawing|handwriting|essay/i.test(act)) cls += ' yp-event';
      else if (/meeting|staff/i.test(act)) cls += ' yp-meeting';
      else cls += ' yp-regular';
      var meta = 'School Annual Program';
      if (a.responsible && a.responsible !== '\u2014' && a.responsible !== '-') meta += ' · ' + a.responsible;
      return '<div class="' + cls + '"><span class="yp-date">' + a.date + '</span><div class="yp-body-inner"><span class="yp-activity">' + act + '</span>' + '<span class="yp-meta">' + meta + '</span>' + '</div></div>';
    }
    var cards = [];
    holidays.forEach(function (h) { cards.push({ key: h.day, holiday: true, html: holidayCard(h) }); });
    var itemKeys = items.map(function (a) { return startDay(a.date); });
    var nextKey = 99;
    for (var k = itemKeys.length - 1; k >= 0; k--) {
      if (itemKeys[k] < 99) nextKey = itemKeys[k];
      else if (nextKey < 99) itemKeys[k] = nextKey;
    }
    items.forEach(function (a, i) { cards.push({ key: itemKeys[i], holiday: false, html: programCard(a) }); });
    cards.sort(function (x, y) { return x.key - y.key || (x.holiday === y.holiday ? 0 : (x.holiday ? -1 : 1)); });
    container.innerHTML = cards.map(function (c) { return c.html; }).join('');
  },

  renderPrograms() { return DataStore.get('PROGRAMS').then(function (programs) {
    programs = programs || [];
    var general = programs.filter(function (p) { return p.type !== 'technical' && p.visible !== false; });
    var technical = programs.filter(function (p) { return p.type === 'technical' && p.visible !== false; });
    var container = document.getElementById('programsContent');
    if (!container) return;
    container.innerHTML = '<div class="programs-content active" id="programsGeneral"><div class="program-banner"><img src="assets/images/General%20Block.webp" alt="General Block" loading="lazy"><div class="program-banner-text"><h3>General Block</h3><p>ECD to Grade 12 \u2014 Comprehensive education</p></div></div><div class="programs-grid">' + general.map(function (p) {
      return '<div class="program-card"><h4>' + (p.name || '') + '</h4><p>' + (p.description || '') + '</p></div>';
    }).join('') + '</div></div><div class="programs-content" id="programsTechnical"><div class="program-banner"><img src="assets/images/Technical%20Block.webp" alt="Technical Block" loading="lazy"><div class="program-banner-text"><h3>Technical Block</h3><p>Computer Engineering Program (Grade 9-12)</p></div></div><div class="programs-grid">' + technical.map(function (p) {
      return '<div class="program-card"><h4>' + (p.name || '') + '</h4><p>' + (p.description || '') + '</p></div>';
    }).join('') + '</div></div>';
    document.querySelectorAll('.tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        document.querySelectorAll('.programs-content').forEach(function (c) { c.classList.remove('active'); });
        var target = document.getElementById('programs' + btn.dataset.tab.charAt(0).toUpperCase() + btn.dataset.tab.slice(1));
        if (target) target.classList.add('active');
      });
    });
  }); },

  renderTeachers() { return DataStore.get('TEACHERS').then(function (teachers) {
    teachers = teachers || [];
    if (!teachers.length) teachers = typeof teacherData !== 'undefined' ? teacherData : [];
    var container = document.getElementById('teachersGrid');
    if (!container) return;
    container.innerHTML = teachers.map(function (t) {
      var photo = t.photo_url || t.photo || '';
      var placeholder = getPlaceholderImage(t.name || 'T');
      return '<div class="teacher-card"><img src="' + (photo || placeholder) + '" alt="' + (t.name || '') + '" loading="lazy" onerror="this.onerror=null;this.src=\'' + placeholder + '\'"><div class="tinfo"><h4>' + (t.name || '') + '</h4><span class="tsubject">' + (t.subject || '') + '</span>' + (t.qualification ? '<p class="tqual">' + t.qualification + '</p>' : '') + '</div></div>';
    }).join('');
  }); },

  renderStaff() { return DataStore.get('STAFF').then(function (staff) {
    staff = staff || [];
    if (!staff.length) staff = typeof staffData !== 'undefined' ? staffData : [];
    var container = document.getElementById('staffGrid');
    if (!container) return;
    container.innerHTML = staff.map(function (s) {
      var photo = s.photo_url || s.photo || '';
      var placeholder = getPlaceholderImage(s.name || 'S');
      return '<div class="staff-card"><img src="' + (photo || placeholder) + '" alt="' + (s.name || '') + '" loading="lazy" onerror="this.onerror=null;this.src=\'' + placeholder + '\'"><h4>' + (s.name || '') + '</h4><span class="sposition">' + (s.position || '') + '</span></div>';
    }).join('');
  }); },

  scrollTeachers(dir) {
    var container = document.getElementById('teachersGrid');
    if (!container) return;
    var scrollAmount = container.querySelector('.teacher-card') ? container.querySelector('.teacher-card').offsetWidth + 20 : 220;
    container.scrollBy({ left: dir * scrollAmount, behavior: 'smooth' });
  },

  renderGallery() { return DataStore.get('GALLERY').then(function (gallery) {
    gallery = gallery || [];
    var container = document.getElementById('galleryGrid');
    if (!container) return;
    this.galleryAllImages = gallery;
    this.galleryCategoryMap = { 'events': 'Events', 'graduation': 'Graduation', 'lab': 'Lab', 'trip': 'Trip' };
    this.renderGalleryImages(gallery.filter(function (img) { return (img.category || '').toLowerCase() === 'events' || !img.category; }));
    this.renderGalleryMarquee(gallery);
    var cards = document.querySelectorAll('.collection-card');
    var self = this;
    cards.forEach(function (card) {
      card.onclick = function () {
        cards.forEach(function (c) { c.classList.remove('active'); });
        card.classList.add('active');
        var collection = card.dataset.collection;
        var category = self.galleryCategoryMap[collection] || collection;
        var filtered = (self.galleryAllImages || []).filter(function (img) { return (img.category || '').toLowerCase() === category.toLowerCase(); });
        self.renderGalleryImages(filtered);
      };
    });
  }.bind(this)); },

  renderGalleryMarquee(images) {
    var container = document.getElementById('galleryMarquee');
    if (!container || !images || !images.length) return;
    var shown = images.slice(0, 10);
    var doubled = shown.concat(shown);
    container.innerHTML = '<div class="gmarquee-track">' + doubled.map(function (img) {
      var src = img.src || img.image_url || '';
      return '<img src="' + src + '" alt="' + (img.caption || '') + '" loading="lazy">';
    }).join('') + '</div>';
    var gTrack = container.querySelector('.gmarquee-track');
    if (gTrack) {
      gTrack.addEventListener('mouseenter', function () { gTrack.style.animationPlayState = 'paused'; });
      gTrack.addEventListener('mouseleave', function () { gTrack.style.animationPlayState = 'running'; });
    }
  },

  renderGalleryImages(images) {
    var container = document.getElementById('galleryGrid');
    if (!container) return;
    if (!images || images.length === 0) {
      container.innerHTML = '<p style="text-align:center;padding:40px;color:var(--text-muted);font-size:1.1rem;">No images in this collection</p>';
      return;
    }
    window._galleryImages = images;
    container.innerHTML = images.map(function (img, i) {
      var src = img.src || img.image_url || '';
      var alt = (img.caption || 'Gallery').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
      var dataSrc = src.replace(/'/g,'%27').replace(/"/g,'%22');
      var dataCap = (img.caption || '').replace(/'/g,'%27').replace(/"/g,'%22');
      return '<div class="gallery-item" onclick="openLightbox(\'' + dataSrc + '\',\'' + dataCap + '\',' + i + ')"><img src="' + src.replace(/"/g,'&quot;') + '" alt="' + alt + '" loading="lazy"></div>';
    }).join('');
    var lbPrev = document.getElementById('lbPrev');
    var lbNext = document.getElementById('lbNext');
    if (lbPrev) lbPrev.style.display = images.length > 1 ? '' : 'none';
    if (lbNext) lbNext.style.display = images.length > 1 ? '' : 'none';
  },

  renderEvents() { return DataStore.get('EVENTS').then(function (events) {
    events = events || [];
    var container = document.getElementById('eventsTimeline');
    if (!container) return;
    container.innerHTML = events.map(function (e, i) {
      var date = new Date(e.date);
      var months = ['Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'];
      var bs = NepaliDate.convertToBS ? NepaliDate.convertToBS(date) : { day: date.getDate(), month: date.getMonth() + 1 };
      return '<div class="event-item"><span class="event-dot"></span><div class="event-date">' + bs.day + ' ' + months[bs.month - 1] + '</div><h3 class="event-title">' + (e.title || '') + '</h3><p class="event-desc">' + (e.description || '') + '</p></div>';
    }).join('');
  }); },

  renderTestimonials() { return DataStore.get('TESTIMONIALS').then(function (testimonials) {
    testimonials = testimonials || [];
    var container = document.getElementById('testimonialsSlider');
    if (!container) return;
    function card(t) {
      var photo = t.photo_url || t.photo || '';
      var placeholder = getPlaceholderImage(t.name || 'T');
      return '<div class="testimonial-card"><div class="quote-mark">\u201c</div><blockquote>' + (t.quote || '') + '</blockquote><div class="tauthor"><img src="' + (photo || placeholder) + '" alt="' + (t.name || '') + '" onerror="this.onerror=null;this.src=\'' + placeholder + '\'"><strong>' + (t.name || '') + '</strong><span>' + (t.role || '') + '</span></div></div>';
    }
    if (testimonials.length) {
      container.innerHTML = '<div class="testimonials-track">' + testimonials.map(card).join('') + testimonials.map(card).join('') + '</div>';
      var track = container.querySelector('.testimonials-track');
      if (track) {
        track.addEventListener('mouseenter', function () { track.style.animationPlayState = 'paused'; });
        track.addEventListener('mouseleave', function () { track.style.animationPlayState = 'running'; });
      }
    }
  }); },

  renderFooter() {
    var settings = this._settings || {};
    var flEl = document.getElementById('footerLogo');
    if (flEl) flEl.src = settings.logo || 'assets/images/School circular logo.webp';
    var fnEl = document.getElementById('footerSchoolName');
    if (fnEl) fnEl.textContent = settings.schoolName || 'Shree Saraswati Secondary School';
    var ftEl = document.getElementById('footerTagline');
    if (ftEl) ftEl.textContent = settings.tagline || '\u0936\u093f\u0915\u094d\u0937\u093e \u0928\u0948 \u0938\u0936\u0915\u094d\u0924\u093f\u0915\u0930\u0923';
    var faEl = document.getElementById('footerAddress');
    if (faEl) faEl.textContent = settings.address || 'Satyawati-6, Gulmi';
    var fpEl = document.getElementById('footerPhone');
    if (fpEl) fpEl.textContent = settings.phone || '+977-9857062876';
    var feEl = document.getElementById('footerEmail');
    if (feEl) feEl.textContent = settings.email || 'infosaraswatimavijohang@gmail.com';
  },

  async renderHeroSlides() {
    const slides = await DataStore.get('SLIDES') || [];
    const container = document.getElementById('heroSlides');
    if (!container) return;
    if (slides.length === 0) return;
    container.innerHTML = slides
      .sort((a, b) => (a.sort_order || a.order || 0) - (b.sort_order || b.order || 0))
      .map((s, i) => '<img src="' + (s.image_url || s.image || '') + '" alt="' + (s.title || 'Slide ' + (i+1)) + '" class="hero-slide' + (i === 0 ? ' active' : '') + '" loading="' + (i === 0 ? 'eager' : 'lazy') + '"' + (i === 0 ? ' fetchpriority="high"' : '') + '>')
      .join('');
    this.currentSlide = 0;
    if (this._parallaxInterval) { clearInterval(this._parallaxInterval); this._parallaxInterval = null; }
    const hero = document.querySelector('.hero');
    if (hero && slides.length > 1) {
      this._parallaxInterval = setInterval(() => this.cycleHeroSlides(slides.length), 5000);
      hero.addEventListener('mouseenter', () => { clearInterval(this._parallaxInterval); this._parallaxInterval = null; });
      hero.addEventListener('mouseleave', () => { if (!this._parallaxInterval) this._parallaxInterval = setInterval(() => this.cycleHeroSlides(slides.length), 5000); });
    }
  },

  cycleHeroSlides(length) {
    const slides = document.querySelectorAll('#heroSlides .hero-slide');
    if (!slides.length) return;
    slides[this.currentSlide].classList.remove('active');
    this.currentSlide = (this.currentSlide + 1) % length;
    slides[this.currentSlide].classList.add('active');
  },

  renderAdmission() {
    return DataStore.get('SETTINGS').then(function (settings) {
      var form = document.getElementById('admissionForm');
      if (!form) return;
      if (settings && settings.admissionEnabled === false) {
        form.style.display = 'none';
        var msg = document.createElement('div');
        msg.className = 'admission-disabled';
        msg.innerHTML = '<p>Admissions are currently closed. Please check back later.</p>';
        form.parentNode.insertBefore(msg, form);
      }
    });
  },

  setupNavigation() {
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        var target = document.querySelector(this.getAttribute('href'));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
          document.querySelectorAll('.nav-link').forEach(function (l) { l.classList.remove('active'); });
          this.classList.add('active');
        }
        var navEl = document.getElementById('navMenu');
        if (navEl) navEl.classList.remove('open');
      });
    });
    var menuToggle = document.getElementById('menuToggle');
    var navMenu = document.getElementById('navMenu');
    if (menuToggle) menuToggle.addEventListener('click', function () {
      if (!navMenu) return;
      navMenu.classList.toggle('open');
      var expanded = navMenu.classList.contains('open');
      menuToggle.setAttribute('aria-expanded', expanded);
    });
    if (navMenu) navMenu.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') navMenu.classList.remove('open');
    });
    document.addEventListener('click', function (e) {
      if (navMenu && navMenu.classList.contains('open') && !e.target.closest('.header-container')) {
        navMenu.classList.remove('open');
      }
    });
  },

  setupAdmissionForm() {
    var form = document.getElementById('admissionForm');
    if (!form) return;
    var MAX_PHOTO_BYTES = 500 * 1024;
    var fileToDataUrl = function (file) { return new Promise(function (resolve, reject) { var reader = new FileReader(); reader.onload = function () { resolve(reader.result); }; reader.onerror = reject; reader.readAsDataURL(file); }); };
    var statusEl = form.querySelector('.admission-status');
    if (!statusEl) {
      statusEl = document.createElement('div');
      statusEl.className = 'admission-status';
      form.appendChild(statusEl);
    }
    var showStatus = function (message, isError) {
      statusEl.textContent = message;
      statusEl.style.display = 'block';
      statusEl.style.background = isError ? '#fdecea' : '#eaf7ee';
      statusEl.style.color = isError ? '#a33' : '#1f7a3d';
      statusEl.style.border = '1px solid ' + (isError ? '#f0c2bd' : '#bfe6cb');
      statusEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };
    var clearFieldError = function (el) {
      var group = el.closest('.form-group');
      if (group) { group.classList.remove('error'); group.classList.remove('success'); }
    };
    var showFieldError = function (el, msg) {
      var group = el.closest('.form-group');
      if (!group) return;
      group.classList.add('error');
      group.classList.remove('success');
      var errEl = group.querySelector('.field-error');
      if (errEl && msg) errEl.textContent = msg;
    };
    var showFieldSuccess = function (el) {
      var group = el.closest('.form-group');
      if (group) { group.classList.remove('error'); group.classList.add('success'); }
    };
    var validateField = function (el) {
      clearFieldError(el);
      if (!el.hasAttribute('required') && !el.value.trim()) return true;
      if (el.hasAttribute('required') && !el.value.trim()) { showFieldError(el, 'This field is required'); return false; }
      if (el.type === 'tel' && el.value.trim() && !/^[\d\+\-\s\(\)]{7,15}$/.test(el.value.trim())) { showFieldError(el, 'Enter a valid phone number'); return false; }
      if (el.type === 'email' && el.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim())) { showFieldError(el, 'Enter a valid email address'); return false; }
      if (el.name === 'studentName' && el.value.trim().length < 2) { showFieldError(el, 'Name must be at least 2 characters'); return false; }
      showFieldSuccess(el);
      return true;
    };

    function goToStep(step) {
      document.querySelectorAll('.form-step').forEach(function(el) { el.classList.remove('active'); });
      document.querySelectorAll('.step-dot').forEach(function(el) { el.classList.remove('active'); });
      document.querySelectorAll('.step-label').forEach(function(el) { el.classList.remove('active'); });
      var panel = document.querySelector('.form-step[data-step="' + step + '"]');
      if (panel) panel.classList.add('active');
      var dot = document.querySelector('.step-dot[data-step="' + step + '"]');
      if (dot) dot.classList.add('active');
      var label = document.querySelector('.step-label[data-step="' + step + '"]');
      if (label) label.classList.add('active');
      statusEl.style.display = 'none';
      window.scrollTo({ top: form.offsetTop - 80, behavior: 'smooth' });
    }

    form.querySelectorAll('input, select, textarea').forEach(function (el) {
      el.addEventListener('blur', function () { validateField(el); });
      el.addEventListener('input', function () { clearFieldError(el); });
    });

    form.addEventListener('click', function(e) {
      var btn = e.target.closest('.btn-next, .btn-prev');
      if (!btn) return;
      var to = parseInt(btn.getAttribute('data-to'), 10);
      var currentStep = document.querySelector('.form-step.active');
      if (!currentStep) return;
      if (btn.classList.contains('btn-next')) {
        var required = currentStep.querySelectorAll('[required]');
        var valid = true;
        for (var i = 0; i < required.length; i++) {
          if (!validateField(required[i])) valid = false;
        }
        if (!valid) { showStatus('Please fill out all required fields correctly before proceeding.', true); return; }
      }
      goToStep(to);
    });

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      statusEl.style.display = 'none';
      var allValid = true;
      form.querySelectorAll('[required]').forEach(function (el) { if (!validateField(el)) allValid = false; });
      if (!allValid) { showStatus('Please fill out all required fields correctly.', true); return; }
      var photoInput = document.getElementById('studentPhoto');
      var photoFile = photoInput && photoInput.files[0];
      if (photoFile && photoFile.size > MAX_PHOTO_BYTES) { showStatus('Student photo must be under 500KB. Please choose a smaller file.', true); return; }
      var submitBtn = form.querySelector('.submit-btn');
      var originalLabel = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) { submitBtn.disabled = true; submitBtn.classList.add('loading'); submitBtn.innerHTML = '<span class="spinner"></span> Submitting...'; }
      try {
        var formData = new FormData(form);
        var data = Object.fromEntries(formData.entries());
        delete data.studentPhoto; delete data.birthCertificate; delete data.bleCertificate;
        data.dob_bs = data.dob ? adToBsStr(data.dob) : '';
        var files = await Promise.all([
          photoFile ? fileToDataUrl(photoFile) : null,
          (document.getElementById('birthCertificate') || {}).files ? fileToDataUrl(document.getElementById('birthCertificate').files[0]) : null,
          (document.getElementById('bleCertificate') || {}).files ? fileToDataUrl(document.getElementById('bleCertificate').files[0]) : null
        ]);
        var application = {
          id: 'app_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
          submitted_at: new Date().toISOString(),
          status: 'pending',
          ...data,
          studentPhoto: files[0],
          birthCertificate: files[1],
          bleCertificate: files[2]
        };
        try { await supabase.insert('admissions', application, { returnColumns: ['id'] }); } catch(err) {
          var existing = JSON.parse(localStorage.getItem('sss_admissions') || '[]');
          existing.push(application);
          localStorage.setItem('sss_admissions', JSON.stringify(existing));
        }
        showStatus('Thank you! Your admission application has been submitted. The school office will contact you soon.', false);
        form.reset();
        form.querySelectorAll('.form-group').forEach(function (g) { g.classList.remove('success', 'error'); });
        goToStep(1);
      } catch (err) {
        console.error('Admission submission failed:', err);
        showStatus('Something went wrong while submitting your application. Please try again or contact the school office.', true);
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.classList.remove('loading'); submitBtn.innerHTML = originalLabel; }
      }
    });
  }
};

function getPlaceholderImage(name) {
  var initial = name ? name.charAt(0).toUpperCase() : 'T';
  return 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="#1a3a5c" width="100" height="100"/><text x="50" y="60" text-anchor="middle" fill="white" font-size="40">' + initial + '</text></svg>');
}

function openLightbox(src, caption, index) {
  var lb = document.getElementById('lightbox');
  if (!lb) return;
  lb.dataset.index = index || 0;
  var imgEl = document.getElementById('lightboxImg');
  if (imgEl) {
    imgEl.src = decodeURIComponent(src);
    imgEl.alt = decodeURIComponent(caption || '') || 'School gallery image';
  }
  var capEl = document.getElementById('lightboxCaption');
  if (capEl) capEl.textContent = decodeURIComponent(caption || '') || '';
  document.body.style.overflow = 'hidden';
  var hasNav = window._galleryImages && window._galleryImages.length > 1;
  var prev = document.getElementById('lbPrev');
  var next = document.getElementById('lbNext');
  if (prev) prev.style.display = hasNav ? '' : 'none';
  if (next) next.style.display = hasNav ? '' : 'none';
}

function closeLightbox() {
  var lb = document.getElementById('lightbox');
  if (lb) lb.classList.remove('show');
  document.body.style.overflow = '';
}

function navigateLightbox(dir) {
  var images = window._galleryImages || [];
  if (images.length < 2) return;
  var lb = document.getElementById('lightbox');
  if (!lb) return;
  var idx = parseInt(lb.dataset.index || '0');
  var next = idx + dir;
  if (next < 0) next = images.length - 1;
  if (next >= images.length) next = 0;
  var img = images[next];
  var src = img.src || img.image_url || '';
  var cap = img.caption || '';
  openLightbox(src, cap, next);
}

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') navigateLightbox(-1);
  if (e.key === 'ArrowRight') navigateLightbox(1);
});

document.addEventListener('DOMContentLoaded', function () { App.init(); });

if (typeof module !== 'undefined') module.exports = { App, openLightbox, closeLightbox };
