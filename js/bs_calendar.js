/* BS (Bikram Sambat / Nepali) calendar helpers — shared by the public pages,
   the admin dashboard and the exam portal.
   - General AD<->BS converter covering BS 1975-2099 (year = 2000 BS is
     anchored to Apr 14, 1943 AD; verified against the nepali-date-converter
     dataset used across Nepali web apps).
   - Universal read-only BS display: every <input type="date"> automatically
     gets a small sibling <span class="bs-date-display"> showing the
     corresponding Nepali date, converted live from the AD value the user
     picked. The span is display-only — the AD field stays the source of truth.
   Month lengths per BS year below (indices 0-11 = Baisakh..Chaitra, 12 = total). */

var BS_MONTHS_ORDER = ['Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'];

var BS_YEARS = {
  1975: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30, 365],
  1976: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31, 366],
  1977: [30, 32, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31, 365],
  1978: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30, 365],
  1979: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30, 365],
  1980: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31, 366],
  1981: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31, 365],
  1982: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30, 365],
  1983: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30, 365],
  1984: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31, 366],
  1985: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30, 365],
  1986: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30, 365],
  1987: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30, 365],
  1988: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31, 366],
  1989: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30, 365],
  1990: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30, 365],
  1991: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30, 365],
  1992: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31, 366],
  1993: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30, 365],
  1994: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30, 365],
  1995: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30, 365],
  1996: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31, 366],
  1997: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30, 365],
  1998: [31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30, 365],
  1999: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31, 366],
  2000: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31, 365],
  2001: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30, 365],
  2002: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30, 365],
  2003: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31, 366],
  2004: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31, 365],
  2005: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30, 365],
  2006: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30, 365],
  2007: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31, 366],
  2008: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31, 365],
  2009: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30, 365],
  2010: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30, 365],
  2011: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31, 366],
  2012: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30, 365],
  2013: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30, 365],
  2014: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30, 365],
  2015: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31, 366],
  2016: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30, 365],
  2017: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30, 365],
  2018: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30, 365],
  2019: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31, 366],
  2020: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30, 365],
  2021: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30, 365],
  2022: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30, 365],
  2023: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31, 366],
  2024: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30, 365],
  2025: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30, 365],
  2026: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31, 366],
  2027: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31, 365],
  2028: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30, 365],
  2029: [31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30, 365],
  2030: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31, 366],
  2031: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31, 365],
  2032: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30, 365],
  2033: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30, 365],
  2034: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31, 366],
  2035: [30, 32, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31, 365],
  2036: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30, 365],
  2037: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30, 365],
  2038: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31, 366],
  2039: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30, 365],
  2040: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30, 365],
  2041: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30, 365],
  2042: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31, 366],
  2043: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30, 365],
  2044: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30, 365],
  2045: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30, 365],
  2046: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31, 366],
  2047: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30, 365],
  2048: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30, 365],
  2049: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30, 365],
  2050: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31, 366],
  2051: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30, 365],
  2052: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30, 365],
  2053: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30, 365],
  2054: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31, 366],
  2055: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30, 365],
  2056: [31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30, 365],
  2057: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31, 366],
  2058: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31, 365],
  2059: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30, 365],
  2060: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30, 365],
  2061: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31, 366],
  2062: [30, 32, 31, 32, 31, 31, 29, 30, 29, 30, 29, 31, 365],
  2063: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30, 365],
  2064: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30, 365],
  2065: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31, 366],
  2066: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30, 365],
  2067: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30, 365],
  2068: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30, 365],
  2069: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31, 366],
  2070: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30, 365],
  2071: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30, 365],
  2072: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30, 365],
  2073: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31, 366],
  2074: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30, 365],
  2075: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30, 365],
  2076: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30, 365],
  2077: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31, 366],
  2078: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30, 365],
  2079: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30, 365],
  2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30, 365],
  2081: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31, 366],
  2082: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30, 365],
  2083: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30, 365],
  2084: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31, 366],
  2085: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31, 365],
  2086: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30, 365],
  2087: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30, 365],
  2088: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31, 366],
  2089: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31, 365],
  2090: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30, 365],
  2091: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30, 365],
  2092: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31, 366],
  2093: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31, 365],
  2094: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30, 365],
  2095: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30, 365],
  2096: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31, 366],
  2097: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30, 365],
  2098: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30, 365],
  2099: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30, 365]
};

/* Baisakh 1, 2000 BS = April 14, 1943 AD. Converted to a whole-day serial
   number (UTC) so the math is deterministic regardless of the browser timezone. */
var BS_EPOCH_DAYS = Math.floor(Date.UTC(1943, 3, 14) / 86400000);

function _bsYearDays(year) {
  var m = BS_YEARS[year];
  if (!m) return null;
  var total = 0;
  for (var i = 0; i < 12; i++) total += m[i];
  return total;
}

function _adSerial(y, m, d) {
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

function _parseAdDate(v) {
  if (v instanceof Date && !isNaN(v.getTime())) return { y: v.getFullYear(), m: v.getMonth() + 1, d: v.getDate() };
  if (typeof v === 'string') {
    var m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return { y: +m[1], m: +m[2], d: +m[3] };
    var dt = new Date(v);
    if (!isNaN(dt.getTime())) return { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() };
  }
  if (typeof v === 'number') {
    var d = new Date(v);
    if (!isNaN(d.getTime())) return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
  }
  return null;
}

/* AD date -> { year, month (1-12), day } in BS, or null when out of range. */
function adToBs(adDate) {
  var p = _parseAdDate(adDate);
  if (!p) return null;
  var diff = _adSerial(p.y, p.m, p.d) - BS_EPOCH_DAYS;
  if (diff < 0) return null;
  var year = 2000;
  while (year < 2099) {
    var yearDays = _bsYearDays(year);
    if (yearDays === null || diff < yearDays) break;
    diff -= yearDays;
    year++;
  }
  if (year > 2099) return null;
  var month = 0;
  while (month < 12 && diff >= BS_YEARS[year][month]) { diff -= BS_YEARS[year][month]; month++; }
  if (month >= 12) return null;
  return { year: year, month: month + 1, day: diff + 1 };
}

/* { year, month (1-12), day } in BS -> AD Date (UTC noon to avoid edge drift), or null. */
function bsToAd(bs) {
  if (!bs || !bs.year || bs.year < 1975 || bs.year > 2099 || !bs.month || bs.month < 1 || bs.month > 12) return null;
  var days = (bs.day || 1) - 1;
  if (bs.year >= 2000) {
    for (var y = 2000; y < bs.year; y++) days += _bsYearDays(y);
  } else {
    for (var y = bs.year; y < 2000; y++) days -= _bsYearDays(y);
  }
  for (var m = 0; m < bs.month - 1; m++) days += BS_YEARS[bs.year][m];
  return new Date((BS_EPOCH_DAYS + days) * 86400000 + 43200000);
}

/* AD value as 'YYYY-MM-DD' (from a date input) -> 'YYYY-MM-DD' BS, or ''. */
function adToBsStr(adDate) {
  var bs = adToBs(adDate);
  if (!bs) return '';
  var mm = bs.month < 10 ? '0' + bs.month : '' + bs.month;
  var dd = bs.day < 10 ? '0' + bs.day : '' + bs.day;
  return bs.year + '-' + mm + '-' + dd;
}

/* AD value -> '18 Chaitra 2082' style display string, or ''. */
function formatBsDate(adDate) {
  var bs = adToBs(adDate);
  if (!bs) return '';
  return bs.day + ' ' + BS_MONTHS_ORDER[bs.month - 1] + ' ' + bs.year;
}

/* Re-read a date input and refresh its sibling BS display span. Also exported
   so callers that set a date input's value programmatically (e.g. admin edit
   forms, exam modals) can refresh the display without a change event. */
function updateBsDate(inputEl) {
  if (!inputEl) return;
  var span = inputEl._bsDisplaySpan;
  if (!span) return;
  var v = inputEl.value;
  var bs = v ? adToBs(v) : null;
  if (bs) {
    span.textContent = formatBsDate(v) + ' BS';
    span.classList.remove('bs-date-display-empty');
  } else {
    span.textContent = '';
    span.classList.add('bs-date-display-empty');
  }
}

function _attachBsDateDisplay(inputEl) {
  if (!inputEl || inputEl.dataset && inputEl.dataset.bsAttached) return;
  if (inputEl.dataset) inputEl.dataset.bsAttached = '1';
  var span = document.createElement('span');
  span.className = 'bs-date-display';
  span.setAttribute('aria-hidden', 'true');
  if (inputEl.parentNode) {
    if (inputEl.nextSibling) inputEl.parentNode.insertBefore(span, inputEl.nextSibling);
    else inputEl.parentNode.appendChild(span);
  }
  inputEl._bsDisplaySpan = span;
  inputEl.addEventListener('input', function () { updateBsDate(inputEl); });
  inputEl.addEventListener('change', function () { updateBsDate(inputEl); });
  updateBsDate(inputEl);
}

/* Scan the document for date inputs that haven't been decorated yet. */
function _scanBsDateInputs(root) {
  var inputs = (root || document).querySelectorAll('input[type="date"]');
  for (var i = 0; i < inputs.length; i++) {
    if (!(inputs[i].dataset && inputs[i].dataset.bsAttached)) _attachBsDateDisplay(inputs[i]);
  }
}

/* Auto-decorate every <input type="date"> on the page, including ones added
   later by JS (modals, rendered exam rows, etc.), so no caller has to wire up
   anything — the BS date simply appears under/next to the field. */
var _bsObserver = null;
function initBsDateDisplays() {
  if (typeof document === 'undefined' || !document.body) return;
  _scanBsDateDisplays();
  if (_bsObserver) return;
  _bsObserver = new MutationObserver(function () {
    _scanBsDateDisplays();
  });
  _bsObserver.observe(document.body, { childList: true, subtree: true });
}

function _scanBsDateDisplays() {
  try { _scanBsDateInputs(document); } catch (e) { /* document not ready yet */ }
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBsDateDisplays);
  } else {
    initBsDateDisplays();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { adToBs, bsToAd, adToBsStr, formatBsDate, BS_YEARS, BS_MONTHS_ORDER, BS_EPOCH_DAYS, updateBsDate, initBsDateDisplays };
}
