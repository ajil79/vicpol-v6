/* Event bindings, theme/now actions, OCR lab preview/apply flows, startup hooks. */

  // ==========================================================================
  // "NOW" — fills current date/time (Ctrl+Shift+N)
  // ==========================================================================
  function fillNow() {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yyyy = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    const formatted = `${dd}/${mm}/${yyyy} ${hh}:${min} HRS`;
    if (el.reportDateTime) {
      el.reportDateTime.value = formatted;
      state.reportDateTime = formatted;
      debouncedRenderPreview();
      throttledAutosave();
      toast("Date/time set to now", "ok");
    }
  }
  const nowBtn = document.getElementById("nowBtn");
  if (nowBtn) nowBtn.addEventListener("click", fillNow);

  // ==========================================================================
  // DARK/LIGHT MODE TOGGLE
  // ==========================================================================
  const themeToggleBtn = document.getElementById("themeToggleBtn");
  if (themeToggleBtn) {
    // Restore saved preference
    const savedTheme = localStorage.getItem("vicpol_report_theme");
    if (savedTheme === "light") {
      document.body.classList.add("light-mode");
      themeToggleBtn.textContent = "🌙 Dark";
    }
    themeToggleBtn.addEventListener("click", () => {
      const isLight = document.body.classList.toggle("light-mode");
      themeToggleBtn.textContent = isLight ? "🌙 Dark" : "☀ Light";
      try { localStorage.setItem("vicpol_report_theme", isLight ? "light" : "dark"); } catch(e) {}
    });
  }

  // ==========================================================================
  // KEYBOARD SHORTCUTS
  // ==========================================================================
  document.title = APP_TITLE;
  updateToolChrome('report');

  document.addEventListener("keydown", (e) => {
    const key = String(e.key || "").toLowerCase();

    // Escape → close open modals
    if (key === "escape") {
      const personsOverlay = document.getElementById("personsModalOverlay");
      if (personsOverlay && personsOverlay.classList.contains("open")) { personsOverlay.classList.remove("open"); releaseFocusTrap(); return; }
      const presetOverlay = document.getElementById("presetModalOverlay");
      if (presetOverlay && presetOverlay.classList.contains("open")) { closePresetModal(); return; }
    }

    // Ctrl+S / Cmd+S → Save Draft
    if ((e.ctrlKey || e.metaKey) && key === "s") {
      e.preventDefault();
      saveDraft();
      return;
    }

    // Ctrl+Shift+C / Cmd+Shift+C → Copy Preview
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === "c") {
      e.preventDefault();
      doCopyPreview();
      return;
    }

    // Ctrl+Shift+N / Cmd+Shift+N → Fill current date/time
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === "n") {
      e.preventDefault();
      fillNow();
      return;
    }

    // Ctrl+Shift+O / Cmd+Shift+O → Switch to OCR tab
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === "o") {
      e.preventDefault();
      showToolPage('ocr');
      return;
    }
  });

  // ============================================================================
  // SECTION EXCLUDE TOGGLE
  // ============================================================================
  function sectionExcluded(name) {
    return Array.isArray(state.excludedSections) && state.excludedSections.includes(name);
  }

  function applyExcludedClasses() {
    document.querySelectorAll('[data-section]').forEach(card => {
      const sec = card.dataset.section;
      const excluded = sectionExcluded(sec);
      card.classList.toggle('section-excluded', excluded);
      const btn = card.querySelector('.section-toggle-btn');
      if (btn) {
        btn.textContent = excluded ? '🚫' : '👁';
        btn.title = excluded ? 'Click to include in report' : 'Click to exclude from report';
        btn.setAttribute('aria-expanded', excluded ? 'false' : 'true');
      }
    });
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.section-toggle-btn');
    if (!btn) return;
    const card = btn.closest('[data-section]');
    if (!card) return;
    const sec = card.dataset.section;
    if (!Array.isArray(state.excludedSections)) state.excludedSections = [];
    const idx = state.excludedSections.indexOf(sec);
    if (idx === -1) {
      state.excludedSections.push(sec);
    } else {
      state.excludedSections.splice(idx, 1);
    }
    applyExcludedClasses();
    debouncedRenderPreview();
    throttledAutosave();
  });

  // Section clear buttons
  const SECTION_CLEAR_ORDER = [
    ["reportMeta", () => document.getElementById("reportMetaCard")],
    ["offender", () => document.getElementById("offenderCard")],
    ["charges", () => document.getElementById("chargesCard")],
    ["pins", () => document.getElementById("pinsCard")],
    ["trafficWarrant", () => document.getElementById("trafficWarrantCard")],
    ["vicpolWarrant", () => document.getElementById("vicpolWarrantCard")],
    ["bailConditions", () => document.getElementById("bailConditionsCard")],
    ["fieldContact", () => document.getElementById("fieldContactCard")],
    ["searchSeizure", () => document.getElementById("searchSeizureCard")],
    ["items", () => document.getElementById("itemsCard")],
    ["vehicleInspection", () => document.getElementById("vehicleInspectionCard")],
    ["officers", () => document.getElementById("officersCard")],
    ["narrative", () => document.getElementById("narrativeCard")],
    ["interview", () => document.getElementById("interviewCard")],
    ["sentence", () => document.getElementById("sentenceCard")],
    ["signature", () => document.getElementById("signatureCard")]
  ];

  function resetVehicleInspectionSection(preserveState = false) {
    vicType = null;
    vicState = {};
    if (!preserveState) state.vehicleInspection = deepClone(INITIAL_STATE.vehicleInspection);
    const ids = ['vicVehicleType','vicRego','vicMake','vicColour','vicDriver','vicLocation','vicNotes'];
    ids.forEach(id => {
      const node = document.getElementById(id);
      if (!node) return;
      if (node.tagName === 'SELECT') node.value = '';
      else node.value = '';
    });
    const idle = document.getElementById('vicIdle');
    const wrap = document.getElementById('vicChecklistWrap');
    const items = document.getElementById('vicItems');
    const banner = document.getElementById('vicOutcomeBanner');
    const checked = document.getElementById('vicCheckedCount');
    const total = document.getElementById('vicTotalCount');
    const bar = document.getElementById('vicProgressBar');
    if (idle) idle.style.display = 'block';
    if (wrap) wrap.style.display = 'none';
    if (items) items.innerHTML = '';
    if (banner) { banner.style.display = 'none'; banner.textContent = ''; }
    if (checked) checked.textContent = '0';
    if (total) total.textContent = '0';
    if (bar) { bar.style.width = '0%'; bar.style.background = 'var(--accent)'; }
  }

  function clearSection(section) {
    switch (section) {
      case 'reportMeta':
        state.reportDateTime = '';
        state.enteredBy = '';
        state.enteredUnit = '';
        break;
      case 'offender':
        state.offender = deepClone(INITIAL_STATE.offender);
        break;
      case 'ocr':
        state.ocrText = '';
        state.ocrWeaponsOnly = false;
        break;
      case 'charges':
        selectedChargesSet.clear();
        state.chargesList = '';
        if (el.chargeSearch) el.chargeSearch.value = '';
        if (el.chargeFilter) el.chargeFilter.value = 'all';
        break;
      case 'pins':
        selectedPinsSet.clear();
        state.pinsList = '';
        state.currentDemeritPoints = 0;
        if (el.pinSearch) el.pinSearch.value = '';
        if (el.pinFilter) el.pinFilter.value = 'all';
        break;
      case 'trafficWarrant':
        state.trafficWarrant = deepClone(INITIAL_STATE.trafficWarrant);
        break;
      case 'vicpolWarrant':
        state.vicpolWarrant = deepClone(INITIAL_STATE.vicpolWarrant);
        break;
      case 'bailConditions':
        state.bailConditions = deepClone(INITIAL_STATE.bailConditions);
        break;
      case 'fieldContact':
        state.fieldContact = deepClone(INITIAL_STATE.fieldContact);
        break;
      case 'searchSeizure':
        state.searchSeizure = deepClone(INITIAL_STATE.searchSeizure);
        break;
      case 'items':
        state.itemsList = '';
        break;
      case 'vehicleInspection':
        resetVehicleInspectionSection();
        break;
      case 'officers':
        state.officersList = '';
        state.officerCallsigns = {};
        break;
      case 'narrative':
        state.prelimTime = '';
        state.prelimDate = '';
        state.prelimLocation = '';
        state.summary = '';
        state.evidence = '';
        evidenceItems = [];
        break;
      case 'interview':
        state.interviewQs = '';
        break;
      case 'sentence':
        state.sentence = '';
        state.sentenceApproval = '';
        state.victims = '';
        state.evidenceLocker = '';
        break;
      case 'signature':
        state.sigName = '';
        state.sigRank = '';
        state.sigDivision = '';
        break;
      default:
        return;
    }

    renderAll();

    if (section === 'ocr') {
      if (el.ocrText) el.ocrText.value = '';
      if (el.ocrStatus) { el.ocrStatus.value = 'OCR idle'; el.ocrStatus.style.color = ''; }
      if (el.imgFile) el.imgFile.value = '';
    }
    if (section === 'items') {
      const itemSerialInput = document.getElementById('itemSerialInput');
      const itemQtyInput = document.getElementById('itemQtyInput');
      if (el.itemText) el.itemText.value = '';
      if (itemSerialInput) itemSerialInput.value = '';
      if (itemQtyInput) itemQtyInput.value = '1';
    }
    if (section === 'officers') {
      if (el.officerText) el.officerText.value = '';
    }
    if (section === 'sentence') {
      if (el.sentenceApproval) el.sentenceApproval.value = '';
      if (el.victims) el.victims.value = '';
    }
    if (section === 'vehicleInspection') {
      debouncedRenderPreview();
    }

    throttledAutosave();
    toast('Section cleared', 'ok');
  }

  function ensureSectionHeader(card) {
    if (!card) return null;
    let row = card.querySelector(':scope > .section-header-row');
    if (row) return row;
    const heading = card.querySelector('h2');
    if (!heading) return null;

    const parent = heading.parentElement;
    const parentIsTopLevel = parent && parent.parentElement === card;
    const parentLooksLikeHeader = parentIsTopLevel && /flex/.test((parent.getAttribute('style') || '').toLowerCase());

    if (parentLooksLikeHeader) {
      row = parent;
      row.classList.add('section-header-row');
      return row;
    }

    row = document.createElement('div');
    row.className = 'section-header-row';
    row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px';
    heading.parentNode.insertBefore(row, heading);
    row.appendChild(heading);
    heading.style.margin = '0';
    return row;
  }

  function initSectionClearButtons() {
    SECTION_CLEAR_ORDER.forEach(([section, resolve]) => {
      const card = resolve();
      if (!card) return;
      card.dataset.section = card.dataset.section || section;
      const row = ensureSectionHeader(card);
      if (!row || row.querySelector('[data-clear-section="' + section + '"]')) return;

      let controls = row.lastElementChild;
      const heading = row.querySelector('h2');
      if (!controls || controls === heading) {
        controls = document.createElement('div');
        controls.style.cssText = 'display:flex;gap:8px;align-items:center;flex-wrap:wrap';
        row.appendChild(controls);
      } else if (controls.tagName !== 'DIV') {
        const wrap = document.createElement('div');
        wrap.style.cssText = 'display:flex;gap:8px;align-items:center;flex-wrap:wrap';
        row.appendChild(wrap);
        controls = wrap;
      }

      const toggleEligible = new Set(['offender','charges','pins','fieldContact','searchSeizure','defects','items','officers','narrative','interview','sentence']);
      if (toggleEligible.has(section) && !row.querySelector('.section-toggle-btn')) {
        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'section-toggle-btn';
        toggleBtn.title = 'Toggle section in/out of report';
        toggleBtn.textContent = sectionExcluded(section) ? '🚫' : '👁';
        controls.appendChild(toggleBtn);
      }

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn danger';
      btn.dataset.clearSection = section;
      btn.textContent = 'Clear';
      btn.style.cssText = 'font-size:11px;padding:6px 10px';
      btn.addEventListener('click', () => {
        if (!confirm('Clear this section?')) return;
        clearSection(section);
      });
      controls.appendChild(btn);
    });
  }

  // Initialize
  loadAutosave();
  sanitizeVicPolState(false);
  renderAll();
  bindInputs();
  setupOffenderAutocomplete();
  initPersonsModal();
  setupOfficerAutocomplete();
  setupSignatureAutocomplete();
  initSectionClearButtons();
  initChargeFilters();
  renderChargeList();
  renderPinList();
  renderSelectedCharges();
  renderSelectedPins();
  updateSentenceSuggestion();
  updateLicenseWarning();
  applyExcludedClasses();
  setPreviewStickyOffset();
  updateToolChrome('report');

  // Delegated remove buttons (avoids fragile inline onclick escaping)
  if (el.selectedCharges) {
    el.selectedCharges.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-charge]');
      if (!btn) return;
      toggleCharge(btn.dataset.charge);
    });
  }
  if (el.selectedPins) {
    el.selectedPins.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-pin]');
      if (!btn) return;
      togglePin(btn.dataset.pin);
    });
  }

  // Force initial preview render after a short delay
  setTimeout(() => {
    debouncedRenderPreview();
    updateCharCount();
  }, 100);

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE NAVIGATION
  // ═══════════════════════════════════════════════════════════════════════════

  
  function showToolPage(page) {
    const allowedPages = new Set(['report', 'traffic', 'ocr']);
    const target = allowedPages.has(page) ? page : 'report';
    document.querySelectorAll('.tool-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tool-nav button').forEach(b => { b.classList.remove('nav-active'); b.setAttribute('aria-selected', 'false'); });

    const pageMap = {
      report: { panel: 'reportPage', tab: 'tab-report' },
      traffic: { panel: 'trafficPage', tab: 'tab-traffic' },
      ocr: { panel: 'ocrPage', tab: 'tab-ocr' }
    };

    const cfg = pageMap[target] || pageMap.report;
    const panel = document.getElementById(cfg.panel);
    const tab = document.getElementById(cfg.tab);
    if (panel) panel.classList.add('active');
    if (tab) {
      tab.classList.add('nav-active');
      tab.setAttribute('aria-selected', 'true');
    }
    updateToolChrome(target);
  }

  window.showToolPage = showToolPage;

  function initUiBindings() {
    document.querySelectorAll('.tool-nav button[data-tool-page]').forEach(btn => {
      if (btn.dataset.bound === '1') return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', () => showToolPage(btn.dataset.toolPage));
    });

    const guidelinesToggle = document.getElementById('guidelinesToggle');
    const guidelinesBody = document.getElementById('guidelinesBody');
    if (guidelinesToggle && guidelinesBody && guidelinesToggle.dataset.bound !== '1') {
      guidelinesToggle.dataset.bound = '1';
      guidelinesToggle.addEventListener('click', () => {
        guidelinesToggle.classList.toggle('open');
        guidelinesBody.classList.toggle('open');
        const isOpen = guidelinesBody.classList.contains('open');
        guidelinesToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
    }

    const presetList = document.getElementById('presetList');
    if (presetList && presetList.dataset.bound !== '1') {
      presetList.dataset.bound = '1';
      presetList.addEventListener('click', (event) => {
        const btn = event.target.closest('[data-preset-action]');
        if (!btn) return;
        const name = decodeURIComponent(btn.dataset.presetName || '');
        if (!name) return;
        if (btn.dataset.presetAction === 'load') {
          loadPresetIntoModal(name);
        } else if (btn.dataset.presetAction === 'delete') {
          deletePreset(name);
        }
      });
    }

    if (!document.body.dataset.validationCloseBound) {
      document.body.dataset.validationCloseBound = '1';
      document.addEventListener('click', (event) => {
        const closeBtn = event.target.closest('.validation-close-btn');
        if (closeBtn) {
          const panel = closeBtn.closest('.validation-panel');
          if (panel && panel.parentElement) panel.parentElement.innerHTML = '';
          return;
        }

        const vicBtn = event.target.closest('[data-vic-item][data-vic-state]');
        if (vicBtn) {
          window.vicSetItem(vicBtn.dataset.vicItem, vicBtn.dataset.vicState);
        }
      });
    }
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // TRAFFIC HISTORY CHECKER
  // ═══════════════════════════════════════════════════════════════════════════

  const TT_IMPOUND_SCHEDULE = [
    { n:1,  duration:"12 Hours",  fine:6500,   approval:"LSC+" },
    { n:2,  duration:"24 Hours",  fine:13000,  approval:"LSC+" },
    { n:3,  duration:"48 Hours",  fine:19500,  approval:"LSC+" },
    { n:4,  duration:"7 Days",    fine:26000,  approval:"LSC+" },
    { n:5,  duration:"10 Days",   fine:39000,  approval:"LSC+" },
    { n:6,  duration:"14 Days",   fine:52000,  approval:"SGT+" },
    { n:7,  duration:"18 Days",   fine:65000,  approval:"SGT+" },
    { n:8,  duration:"24 Days",   fine:78000,  approval:"SGT+" },
    { n:9,  duration:"28 Days",   fine:91000,  approval:"SGT+" },
    { n:10, duration:"35 Days",   fine:104000, approval:"SGT+" },
    { n:11, duration:"40 Days",   fine:117000, approval:"SGT+" },
    { n:12, duration:"VEHICLE CRUSH", fine:null, approval:"SGT+" },
  ];

  const TT_PIN_INDEX = PINS
    .map(pin => {
      const pointsMatch = String(pin.points || "").match(/(\d+)/);
      return {
        name: norm(pin.name),
        alias: getEntryUiAlias(pin.name),
        points: pointsMatch ? parseInt(pointsMatch[1], 10) : 0
      };
    })
    .filter(pin => pin.points > 0);

  function ttNormalize(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function ttWordOverlapScore(a, b) {
    const aWords = ttNormalize(a).split(" ").filter(w => w.length > 2);
    const bWords = ttNormalize(b).split(" ").filter(w => w.length > 2);
    if (!aWords.length || !bWords.length) return 0;
    const hits = aWords.filter(word => bWords.some(candidate => candidate.includes(word) || word.includes(candidate)));
    return hits.length / Math.max(aWords.length, bWords.length);
  }

  function ttGetPoints(name) {
    const target = ttNormalize(name);
    if (!target) return 0;

    let bestPoints = 0;
    let bestScore = 0;

    TT_PIN_INDEX.forEach(pin => {
      [pin.name, pin.alias].filter(Boolean).forEach(candidateText => {
        const candidate = ttNormalize(candidateText);
        if (!candidate) return;

        let score = 0;
        if (target === candidate) {
          score = 1;
        } else if (target.includes(candidate) || candidate.includes(target)) {
          score = 0.95;
        } else {
          score = ttWordOverlapScore(target, candidate);
        }

        if (score >= 0.5 && (score > bestScore || (score === bestScore && pin.points > bestPoints))) {
          bestScore = score;
          bestPoints = pin.points;
        }
      });
    });

    return bestPoints;
  }

  function ttAnalyse() {
    const text = (document.getElementById('ttLeap')?.value || '').trim();
    if (!text) { document.getElementById('ttResults').style.display = 'none'; return; }

    const now = Date.now();
    const MS_7 = 7*24*60*60*1000, MS_30 = 30*24*60*60*1000;
    const impoundDates = [], demeritEntries = [];
    let pts7 = 0, pts30 = 0;

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      // Tab format: DD/MM/YYYY Y $AMOUNT Fine: desc
      const tab = line.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+[YN]\s+\$([0-9,]+)\s+((?:Fine|Warning):.+)$/i);
      if (tab) { proc(tab[1],tab[2],tab[3],tab[4],tab[5].trim()); i++; continue; }
      // Two-line: header then desc
      const hdr = line.match(/^(\d{2})\/(\d{2})\/(\d{4})[YN]\$([0-9,]+)/i);
      if (hdr) { proc(hdr[1],hdr[2],hdr[3],hdr[4],(lines[i+1]||'').trim()); i+=2; continue; }
      i++;
    }

    function proc(dd,mm,yyyy,amtRaw,desc) {
      const d = new Date(+yyyy, mm-1, +dd, 12, 0, 0);
      if (/impounded vehicle/i.test(desc)) { impoundDates.push(d); return; }
      const amt = parseInt(amtRaw.replace(/,/g,''));
      if (amt === 0 || !/^fine:/i.test(desc)) return;
      const name = desc.replace(/^fine:\s*/i,'').trim();
      const pts = ttGetPoints(name);
      if (pts > 0) {
        demeritEntries.push({ date: d, pts, label: name });
        const age = now - d.getTime();
        if (age <= MS_7) pts7 += pts;
        if (age <= MS_30) pts30 += pts;
      }
    }

    // Impound calc (resets at 12)
    const total = impoundDates.length;
    const eff = total % 12;
    const display = eff === 0 && total > 0 ? 12 : eff;
    const nextNum = Math.min((eff === 0 && total > 0 ? 1 : eff + 1), 12);
    const next = TT_IMPOUND_SCHEDULE[nextNum - 1];

    // Show results
    document.getElementById('ttResults').style.display = 'block';

    // Stats
    const ic = document.getElementById('ttImpoundCount');
    ic.textContent = display;
    ic.style.color = display >= 10 ? 'rgba(255,100,100,0.95)' : display >= 6 ? 'rgba(255,180,80,0.95)' : 'var(--accent)';
    document.getElementById('ttImpoundReset').textContent = total > 0 ? `${total} total` + (Math.floor(total/12) > 0 ? ` (reset ${Math.floor(total/12)}x)` : '') : '';

    const p7 = document.getElementById('ttPts7'), p30 = document.getElementById('ttPts30');
    p7.textContent = pts7; p7.style.color = pts7 >= 12 ? 'rgba(255,100,100,0.95)' : 'var(--accent)';
    p30.textContent = pts30; p30.style.color = pts30 >= 36 ? 'rgba(255,100,100,0.95)' : 'var(--accent)';

    // Warnings
    let warn = '';
    if (pts7 >= 12) warn += `<div style="padding:10px 14px;border-radius:10px;margin-bottom:8px;background:rgba(255,200,60,0.12);border:1px solid rgba(255,200,60,0.3);color:rgba(255,220,120,0.95);font-size:12px;font-weight:700">⚠ ${pts7} DEMERITS IN 7 DAYS — CONSIDER SUSPENSION</div>`;
    if (pts30 >= 36) warn += `<div style="padding:10px 14px;border-radius:10px;margin-bottom:8px;background:rgba(255,200,60,0.12);border:1px solid rgba(255,200,60,0.3);color:rgba(255,220,120,0.95);font-size:12px;font-weight:700">⚠ ${pts30} DEMERITS IN 30 DAYS — CONSIDER REVOCATION</div>`;
    if (display === 12) warn += `<div style="padding:10px 14px;border-radius:10px;margin-bottom:8px;background:rgba(255,60,60,0.12);border:1px solid rgba(255,60,60,0.3);color:rgba(255,160,160,0.95);font-size:12px;font-weight:700">⚠ IMPOUND #12 — VEHICLE CRUSH</div>`;
    document.getElementById('ttWarnings').innerHTML = warn;

    // Next impound
    const ne = document.getElementById('ttNextImpoundContent');
    if (next) {
      const crush = next.duration === 'VEHICLE CRUSH';
      const col = crush ? 'rgba(255,100,100,0.95)' : 'var(--text)';
      ne.innerHTML = `<span style="font-size:22px;font-weight:900;color:${col}">Offence #${next.n}</span>
        <span style="margin-left:12px;font-size:14px;color:${col}">${next.duration}</span>
        ${next.fine ? `<span style="margin-left:12px;font-size:14px;color:${col}">$${next.fine.toLocaleString()}</span>` : ''}
        <span style="margin-left:12px;font-size:12px;color:rgba(255,180,80,0.9)">${next.approval}</span>`;
    }

    // Demerit list
    const dl = document.getElementById('ttDemeritListContent');
    if (demeritEntries.length === 0) {
      dl.innerHTML = '<div style="color:var(--muted);font-size:12px">No demerit fines found.</div>';
    } else {
      dl.innerHTML = demeritEntries.map(e => {
        const age = now - e.date.getTime();
        const badge = age <= MS_7 ? ' <span style="color:rgba(255,220,80,0.9);font-size:10px;font-weight:700">7D</span>' : age <= MS_30 ? ' <span style="color:rgba(255,180,80,0.9);font-size:10px;font-weight:700">30D</span>' : '';
        return `<div style="display:flex;gap:10px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-size:12px;align-items:center">
          <span style="color:var(--muted);min-width:70px">${e.date.toLocaleDateString('en-AU')}</span>
          <span style="flex:1;color:var(--text)">${escapeHtml(e.label)}</span>
          <span style="font-weight:800;color:rgba(255,180,80,0.95)">${e.pts}pts${badge}</span>
        </div>`;
      }).join('');
    }
  }

  // Impound schedule table
  (function() {
    const el = document.getElementById('ttImpoundScheduleTable');
    if (!el) return;
    el.innerHTML = TT_IMPOUND_SCHEDULE.map(s => {
      const crush = s.duration === 'VEHICLE CRUSH';
      const col = crush ? 'rgba(255,100,100,0.9)' : 'var(--text)';
      return `<div style="display:flex;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-size:11px;align-items:center">
        <span style="color:var(--muted);min-width:22px;font-weight:700">#${s.n}</span>
        <span style="color:${col};flex:1;font-weight:${crush?'800':'600'}">${s.duration}</span>
        <span style="color:${col};min-width:65px;text-align:right">${s.fine ? '$'+s.fine.toLocaleString() : '—'}</span>
        <span style="color:rgba(255,180,80,0.8);min-width:36px;text-align:right;font-size:10px">${s.approval}</span>
      </div>`;
    }).join('');
  })();

  // Wire buttons
  document.getElementById('ttAnalyseBtn')?.addEventListener('click', ttAnalyse);
  document.getElementById('ttLeap')?.addEventListener('input', ttAnalyse);
  document.getElementById('ttClearBtn')?.addEventListener('click', () => {
    const leap = document.getElementById('ttLeap'), name = document.getElementById('ttName');
    if (leap) leap.value = ''; if (name) name.value = '';
    document.getElementById('ttResults').style.display = 'none';
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // VEHICLE INSPECTION CHECKLIST (integrated into report tool)
  // ═══════════════════════════════════════════════════════════════════════════

  const VIC_CHECKLISTS = {
    car: {
      label: "Car / SUV / Ute",
      items: [
        { id:"c01", label:"Tyres — Min 1.5mm tread, no bulging or damage", mandatory:true },
        { id:"c02", label:"Brakes — Stops straight, no grinding or pulling", mandatory:true },
        { id:"c03", label:"Headlights and tail lights present and working", mandatory:true },
        { id:"c04", label:"Windscreen — No cracks blocking driver view", mandatory:true },
        { id:"c05", label:"Steering — Correct response, no excessive play", mandatory:true },
        { id:"c06", label:"Body — No sharp edges likely to cause injury", mandatory:true },
        { id:"c07", label:"Ground clearance — Min 100mm (excl. tyres)", mandatory:true },
        { id:"c08", label:"Number plates — Front and rear, legible, unobscured", mandatory:false },
        { id:"c09", label:"Window tint — VLT above 20% on front windows", mandatory:false },
        { id:"c10", label:"Exhaust — No excessive smoke, under 95dB", mandatory:false },
        { id:"c11", label:"Ride height — Not dragging or raised beyond 75mm", mandatory:false },
        { id:"c12", label:"Tyre protrusion — Not beyond 5mm outside panels", mandatory:false },
        { id:"c13", label:"Bumpers — Front and rear present and secured", mandatory:false },
        { id:"c14", label:"Load — Cargo secured, not overhanging unsafely", mandatory:false },
        { id:"c15", label:"Registration — Current rego displayed", mandatory:false },
      ]
    },
    bike: {
      label: "Motorcycle",
      items: [
        { id:"b01", label:"Tyres — Min 1.5mm tread, no damage", mandatory:true },
        { id:"b02", label:"Brakes — Front and rear functional", mandatory:true },
        { id:"b03", label:"Headlight — Present and functional", mandatory:true },
        { id:"b04", label:"Tail light — Present and functional", mandatory:true },
        { id:"b05", label:"Steering — Handlebars free, no head stem play", mandatory:true },
        { id:"b06", label:"Frame — No cracks or structural damage", mandatory:true },
        { id:"b07", label:"Fuel system — No leaks, tank secured", mandatory:true },
        { id:"b08", label:"Engine — No excessive smoke or oil leaks", mandatory:true },
        { id:"b09", label:"Number plate — Rear fitted and legible", mandatory:false },
        { id:"b10", label:"Exhaust — Under 95dB", mandatory:false },
        { id:"b11", label:"Chain / drive — Adequate tension, no excessive wear", mandatory:false },
        { id:"b12", label:"Mirrors — At least one rear-view mirror", mandatory:false },
        { id:"b13", label:"Handlebars — Not raised above shoulder height", mandatory:false },
        { id:"b14", label:"Foot pegs — Present and secure both sides", mandatory:false },
        { id:"b15", label:"Registration — Current rego displayed", mandatory:false },
      ]
    },
    heavy: {
      label: "Heavy Vehicle (Truck / Bus)",
      items: [
        { id:"h01", label:"Tyres — All axles min 1.5mm, matching duals", mandatory:true },
        { id:"h02", label:"Brakes — Service and park brake functional", mandatory:true },
        { id:"h03", label:"Lights — Headlights, taillights and markers working", mandatory:true },
        { id:"h04", label:"Steering — No excessive play under load", mandatory:true },
        { id:"h05", label:"Load restraint — Cargo secured, not overloaded", mandatory:true },
        { id:"h06", label:"Body / chassis — No cracks or major corrosion", mandatory:true },
        { id:"h07", label:"Windscreen — No cracks, wipers operational", mandatory:true },
        { id:"h08", label:"Fuel / fluids — No leaks, tanks secured", mandatory:true },
        { id:"h09", label:"Number plates — Front and rear, legible", mandatory:false },
        { id:"h10", label:"Exhaust — No excessive smoke, within noise limits", mandatory:false },
        { id:"h11", label:"Height clearance — Within legal limits for route", mandatory:false },
        { id:"h12", label:"Coupling / tow — Secure, chains present", mandatory:false },
        { id:"h13", label:"Mudguards — Present over all axles", mandatory:false },
        { id:"h14", label:"Mirrors — All required mirrors fitted", mandatory:false },
        { id:"h15", label:"Registration — Current rego displayed", mandatory:false },
      ]
    }
  };

  var vicType = null, vicState = {};

  function vicLoadChecklist(forcedType = null, savedState = null) {
    const typeEl = document.getElementById('vicVehicleType');
    const type = forcedType || typeEl?.value;
    if (!type) return;
    if (typeEl && typeEl.value !== type) typeEl.value = type;
    vicType = type;
    const cl = VIC_CHECKLISTS[type];
    if (!cl) return;
    const restored = savedState && typeof savedState === 'object' ? savedState : (state.vehicleInspection?.checklistState || {});
    vicState = {};
    cl.items.forEach(item => {
      const savedValue = restored[item.id];
      vicState[item.id] = savedValue === 'pass' || savedValue === 'fail' ? savedValue : 'pending';
    });
    if (!state.vehicleInspection) state.vehicleInspection = deepClone(INITIAL_STATE.vehicleInspection);
    state.vehicleInspection.vehicleType = type;
    state.vehicleInspection.checklistState = { ...vicState };

    document.getElementById('vicIdle').style.display = 'none';
    document.getElementById('vicChecklistWrap').style.display = 'block';
    document.getElementById('vicOutcomeBanner').style.display = 'none';
    document.getElementById('vicCheckedCount').textContent = '0';
    document.getElementById('vicTotalCount').textContent = cl.items.length;
    document.getElementById('vicProgressBar').style.width = '0%';

    const container = document.getElementById('vicItems');
    container.innerHTML = '';
    cl.items.forEach((item, idx) => {
      const row = document.createElement('div');
      row.id = `vicrow_${item.id}`;
      row.className = `vic-row ${idx%2===0?'vic-row-even':'vic-row-odd'}`;
      row.innerHTML = `
        <span class="vic-badge ${item.mandatory ? 'vic-badge-mandatory' : 'vic-badge-advisory'}"></span>
        <span class="vic-num">${String(idx+1).padStart(2,'0')}</span>
        <span class="vic-label">${escapeHtml(item.label)}</span>
        <button id="vicpass_${item.id}" class="vic-btn" data-vic-item="${item.id}" data-vic-state="pass" type="button" aria-pressed="false">✓ PASS</button>
        <button id="vicfail_${item.id}" class="vic-btn" data-vic-item="${item.id}" data-vic-state="fail" type="button" aria-pressed="false">✗ FAIL</button>`;
      container.appendChild(row);
    });
    // Batch-restore saved states in a single animation frame to avoid blocking
    const itemsToRestore = cl.items.filter(item => vicState[item.id] === 'pass' || vicState[item.id] === 'fail');
    if (itemsToRestore.length) {
      requestAnimationFrame(() => {
        itemsToRestore.forEach(item => window.vicSetItem(item.id, vicState[item.id], { skipAutosave: true }));
      });
    }
    vicUpdateProgress();
    debouncedRenderPreview();
  }

  window.vicSetItem = function(id, s, options = {}) {
    vicState[id] = s;
    if (!state.vehicleInspection) state.vehicleInspection = deepClone(INITIAL_STATE.vehicleInspection);
    state.vehicleInspection.vehicleType = vicType || state.vehicleInspection.vehicleType || '';
    state.vehicleInspection.checklistState = { ...vicState };
    const passBtn = document.getElementById(`vicpass_${id}`);
    const failBtn = document.getElementById(`vicfail_${id}`);
    const row = document.getElementById(`vicrow_${id}`);
    if (!passBtn || !failBtn || !row) return;
    passBtn.className = 'vic-btn';
    failBtn.className = 'vic-btn';
    passBtn.setAttribute('aria-pressed', 'false');
    failBtn.setAttribute('aria-pressed', 'false');
    row.classList.remove('vic-row-pass', 'vic-row-fail');
    if (s === 'pass') {
      passBtn.classList.add('vic-btn-active-pass');
      passBtn.setAttribute('aria-pressed', 'true');
      row.classList.add('vic-row-pass');
    } else {
      failBtn.classList.add('vic-btn-active-fail');
      failBtn.setAttribute('aria-pressed', 'true');
      row.classList.add('vic-row-fail');
    }
    vicUpdateProgress();
    debouncedRenderPreview();
    if (!options.skipAutosave) throttledAutosave();
  };

  function vicUpdateProgress() {
    if (!vicType) return;
    const cl = VIC_CHECKLISTS[vicType];
    if (!cl) return;
    const items = cl.items;
    const checked = items.filter(i => vicState[i.id] !== 'pending');
    const passed = items.filter(i => vicState[i.id] === 'pass');
    const mandFails = items.filter(i => i.mandatory && vicState[i.id] === 'fail');
    const advisFails = items.filter(i => !i.mandatory && vicState[i.id] === 'fail');

    document.getElementById('vicCheckedCount').textContent = checked.length;
    const pct = items.length ? Math.round((checked.length / items.length) * 100) : 0;
    const progressBar = document.getElementById('vicProgressBar');
    progressBar.style.width = pct + '%';
    const progressContainer = progressBar.parentElement;
    if (progressContainer) progressContainer.setAttribute('aria-valuenow', pct);

    const banner = document.getElementById('vicOutcomeBanner');
    if (checked.length === items.length) {
      const score = Math.round((passed.length / items.length) * 100);
      const pass = score >= 90 && mandFails.length === 0;
      document.getElementById('vicProgressBar').style.background = pass ? 'rgba(100,255,150,0.7)' : 'rgba(255,100,100,0.7)';
      banner.style.display = 'block';
      if (pass) {
        banner.style.background = 'rgba(100,255,150,0.08)'; banner.style.border = '1px solid rgba(100,255,150,0.3)';
        banner.style.color = 'rgba(100,255,150,0.95)';
        banner.textContent = '✓ PASS — ROADWORTHY' + (advisFails.length ? ` (${advisFails.length} advisory fix-it)` : '');
      } else {
        banner.style.background = 'rgba(255,100,100,0.08)'; banner.style.border = '1px solid rgba(255,100,100,0.3)';
        banner.style.color = 'rgba(255,100,100,0.95)';
        banner.textContent = '✗ FAIL — DEFECT NOTICE REQUIRED' + (mandFails.length ? ` (${mandFails.length} mandatory)` : ` (score ${score}%)`);
      }
    } else {
      document.getElementById('vicProgressBar').style.background = 'var(--accent)';
      banner.style.display = 'none';
    }
  }

  // Wire inspection fields
  document.getElementById('vicVehicleType')?.addEventListener('change', () => {
    const type = document.getElementById('vicVehicleType')?.value || '';
    if (!state.vehicleInspection) state.vehicleInspection = deepClone(INITIAL_STATE.vehicleInspection);
    state.vehicleInspection.vehicleType = type;
    state.vehicleInspection.checklistState = {};
    if (!type) {
      resetVehicleInspectionSection();
      debouncedRenderPreview();
      throttledAutosave();
      return;
    }
    vicLoadChecklist(type, {});
    throttledAutosave();
  });
  const vicFieldMap = { vicRego: 'rego', vicMake: 'make', vicColour: 'colour', vicDriver: 'driver', vicLocation: 'location', vicNotes: 'notes' };
  Object.entries(vicFieldMap).forEach(([id, key]) => {
    document.getElementById(id)?.addEventListener('input', (e) => {
      if (!state.vehicleInspection) state.vehicleInspection = deepClone(INITIAL_STATE.vehicleInspection);
      state.vehicleInspection[key] = e.target.value || '';
      debouncedRenderPreview();
      throttledAutosave();
    });
  });

  const CARD_COLLAPSE_STORAGE_KEY = 'vicpol_tool_collapsed_cards_v1';
  const COLLAPSIBLE_CARD_CONFIGS = {
    chargesCard: { mobileCollapsed: true },
    pinsCard: { mobileCollapsed: true },
    trafficWarrantCard: { mobileCollapsed: true },
    vicpolWarrantCard: { mobileCollapsed: true },
    bailConditionsCard: { mobileCollapsed: true },
    fieldContactCard: { mobileCollapsed: true },
    searchSeizureCard: { mobileCollapsed: true },
    itemsCard: { mobileCollapsed: true },
    vehicleInspectionCard: { mobileCollapsed: true },
    officersCard: { mobileCollapsed: true },
    narrativeCard: { mobileCollapsed: true },
    interviewCard: { mobileCollapsed: true },
    sentenceCard: { mobileCollapsed: true }
  };

  function cardHasMeaningfulContent(card) {
    if (!card) return false;
    switch (card.id) {
      case 'chargesCard':
        return selectedChargesSet.size > 0;
      case 'pinsCard':
        return selectedPinsSet.size > 0;
      case 'trafficWarrantCard': {
        const tw = state.trafficWarrant || {};
        return Object.values(tw).some(v => !!norm(v));
      }
      case 'vicpolWarrantCard': {
        const sw = state.vicpolWarrant || {};
        return Object.values(sw).some(v => !!norm(v));
      }
      case 'bailConditionsCard': {
        const bc = state.bailConditions || {};
        return Object.values(bc).some(v => !!norm(v));
      }
      case 'itemsCard':
        return !!norm(el.itemsList?.value);
      case 'officersCard':
        return getLines(el.officersList?.value).length > 0;
      case 'narrativeCard':
        return [
          el.prelimTime?.value,
          el.prelimDate?.value,
          el.prelimLocation?.value,
          el.summary?.value,
          el.evidence?.value
        ].some(v => !!norm(v));
      case 'interviewCard':
        return !!norm(el.interviewQs?.value);
      case 'sentenceCard':
        return [
          el.sentence?.value,
          el.evidenceLocker?.value,
          el.victims?.value,
          el.sentenceApproval?.value
        ].some(v => !!norm(v));
      case 'vehicleInspectionCard': {
        const vi = state.vehicleInspection || {};
        return !!norm(vi.vehicleType) ||
          !!norm(vi.rego) ||
          !!norm(vi.make) ||
          !!norm(vi.colour) ||
          !!norm(vi.driver) ||
          !!norm(vi.location) ||
          !!norm(vi.notes) ||
          Object.keys(vi.checklistState || {}).length > 0;
      }
      case 'fieldContactCard': {
        const fc = state.fieldContact || {};
        return Object.values(fc).some(v => !!norm(v));
      }
      case 'searchSeizureCard': {
        const ss = state.searchSeizure || {};
        return Object.values(ss).some(v => !!norm(v));
      }
      default: {
        const body = card.querySelector('.card-collapsible-body') || card;
        return Array.from(body.querySelectorAll('textarea, input[type="text"], input[type="search"], input[type="date"], input[type="time"], input[type="number"]')).some(field => {
          if (!field || field.disabled || field.readOnly) return false;
          if (field.type === 'number' && field.defaultValue === field.value) return false;
          return !!norm(field.value);
        });
      }
    }
  }

  function readCollapsedCards() {
    try {
      const raw = localStorage.getItem(CARD_COLLAPSE_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function writeCollapsedCards(map) {
    try {
      localStorage.setItem(CARD_COLLAPSE_STORAGE_KEY, JSON.stringify(map || {}));
    } catch (_) {}
  }

  let collapsedCardState = readCollapsedCards();

  function setCardCollapsed(card, collapsed, persist = true) {
    if (!card) return;
    const btn = card.querySelector('.card-collapse-btn');
    card.classList.toggle('card-collapsed', !!collapsed);
    if (btn) {
      btn.textContent = collapsed ? '▶' : '▼';
      btn.title = collapsed ? 'Expand section' : 'Collapse section';
      btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      btn.setAttribute('aria-label', collapsed ? 'Expand section' : 'Collapse section');
    }
    if (persist && card.id) {
      collapsedCardState[card.id] = !!collapsed;
      writeCollapsedCards(collapsedCardState);
    }
  }

  function toggleCardCollapsed(card) {
    if (!card) return;
    setCardCollapsed(card, !card.classList.contains('card-collapsed'));
  }

  function initializeCollapsibleCards() {
    const mobileDefault = window.matchMedia && window.matchMedia('(max-width: 700px)').matches;

    Object.entries(COLLAPSIBLE_CARD_CONFIGS).forEach(([id, cfg]) => {
      const card = document.getElementById(id);
      if (!card || card.dataset.collapseInit === '1') return;

      const row = ensureSectionHeader(card);
      if (!row) return;

      let controls = row.lastElementChild;
      const heading = row.querySelector('h1,h2,h3,h4,h5,h6');
      if (!controls || controls === heading) {
        controls = document.createElement('div');
        controls.style.cssText = 'display:flex;gap:8px;align-items:center;flex-wrap:wrap';
        row.appendChild(controls);
      } else if (controls.tagName !== 'DIV') {
        const wrap = document.createElement('div');
        wrap.style.cssText = 'display:flex;gap:8px;align-items:center;flex-wrap:wrap';
        row.appendChild(wrap);
        controls = wrap;
      }

      if (!row.querySelector('.card-collapse-btn')) {
        const collapseBtn = document.createElement('button');
        collapseBtn.type = 'button';
        collapseBtn.className = 'card-collapse-btn';
        collapseBtn.title = 'Collapse section';
        collapseBtn.setAttribute('aria-label', 'Collapse section');
        collapseBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleCardCollapsed(card);
        });
        controls.insertBefore(collapseBtn, controls.firstChild || null);
      }

      let body = card.querySelector(':scope > .card-collapsible-body');
      if (!body) {
        body = document.createElement('div');
        body.className = 'card-collapsible-body';
        let node = row.nextSibling;
        while (node) {
          const next = node.nextSibling;
          body.appendChild(node);
          node = next;
        }
        card.appendChild(body);
      }

      const hasSavedState = Object.prototype.hasOwnProperty.call(collapsedCardState, id);
      const hasContent = cardHasMeaningfulContent(card);
      const defaultCollapsed = hasSavedState ? !!collapsedCardState[id] : (!!cfg.mobileCollapsed && mobileDefault && !hasContent);
      setCardCollapsed(card, defaultCollapsed, false);
      card.dataset.collapseInit = '1';
    });
  }

  function expandCardsWithContentDefaults() {
    const mobileDefault = window.matchMedia && window.matchMedia('(max-width: 700px)').matches;
    if (!mobileDefault) return;
    Object.keys(COLLAPSIBLE_CARD_CONFIGS).forEach((id) => {
      if (Object.prototype.hasOwnProperty.call(collapsedCardState, id)) return;
      const card = document.getElementById(id);
      if (!card || card.dataset.collapseInit !== '1') return;
      if (cardHasMeaningfulContent(card)) {
        setCardCollapsed(card, false, false);
      }
    });
  }

  // OCR Lab
  const ocrLab = {
    blob: null,
    objectUrl: '',
    result: null,
    previews: []
  };

  function ocrLabSetStatus(message, tone = '') {
    const node = document.getElementById('ocrLabStatus');
    if (!node) return;
    node.value = message;
    node.style.color = tone === 'ok' ? 'var(--ok)' : tone === 'err' ? 'rgba(255,120,120,0.95)' : tone === 'warn' ? 'rgba(255,180,80,0.95)' : '';
  }

  function revokeOcrLabUrls() {
    if (ocrLab.objectUrl) {
      try { URL.revokeObjectURL(ocrLab.objectUrl); } catch (_) {}
      ocrLab.objectUrl = '';
    }
    (ocrLab.previews || []).forEach(url => {
      try { URL.revokeObjectURL(url); } catch (_) {}
    });
    ocrLab.previews = [];
  }

  function renderOcrLabRows(node, rows) {
    if (!node) return;
    if (!rows || !rows.length) {
      node.innerHTML = '<div class="muted">No pertinent fields found yet.</div>';
      return;
    }
    node.innerHTML = rows.map(([label, value]) => `<div class="ocr-lab-row"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value || '—')}</span></div>`).join('');
  }

  
  async function preprocessImageVariant(blob, style = 'detail', opts = {}) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        const shortSide = Math.min(img.width, img.height);
        const scale = opts.scale || (shortSide < 1200 ? Math.min(3, Math.ceil(1200 / Math.max(1, shortSide))) : 1);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        if (style === 'raw') {
          canvas.toBlob(resolve, 'image/png');
          return;
        }

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const totalPixels = canvas.width * canvas.height;
        const gray = new Uint8Array(totalPixels);

        const clamp255 = (v) => Math.max(0, Math.min(255, Math.round(v)));
        const gammaMap = {
          detail: 0.92,
          invert: 0.86,
          threshold: 0.88,
          binaryInvert: 0.88,
          green: 0.78,
          gamma: 0.72,
          darkpanel: 0.70,
          brightrecover: 1.15,
          adaptive: 0.82,
          denoise: 0.95,
          morph: 0.82,
          clahe: 0.80,
          inventory: 0.84,
          hovercard: 0.68,
          licensecard: 0.90,
          banner: 0.76
        };
        const contrastMap = {
          detail: 1.45,
          invert: 1.6,
          threshold: 1.75,
          binaryInvert: 1.75,
          green: 1.95,
          gamma: 1.6,
          darkpanel: 2.05,
          brightrecover: 1.35,
          adaptive: 1.75,
          denoise: 1.35,
          morph: 1.8,
          clahe: 1.55,
          inventory: 1.95,
          hovercard: 2.1,
          licensecard: 1.55,
          banner: 2.2
        };

        const gamma = gammaMap[style] || 0.9;
        const contrast = contrastMap[style] || 1.4;
        const useGreen = style === 'green' || style === 'darkpanel';

        for (let i = 0; i < totalPixels; i++) {
          const off = i * 4;
          const r = data[off], g = data[off + 1], b = data[off + 2];
          let v = useGreen
            ? clamp255((g * 1.9) - (r * 0.75) - (b * 0.6) + 36)
            : clamp255(0.299 * r + 0.587 * g + 0.114 * b);
          if (style === 'brightrecover') v = clamp255(255 * Math.pow(v / 255, 1.15));
          else v = clamp255(255 * Math.pow(v / 255, gamma));
          gray[i] = v;
        }

        const meanBlur = (src, radius) => {
          const w = canvas.width, h = canvas.height;
          const integral = new Uint32Array((w + 1) * (h + 1));
          for (let y = 1; y <= h; y++) {
            let rowSum = 0;
            for (let x = 1; x <= w; x++) {
              rowSum += src[(y - 1) * w + (x - 1)];
              integral[y * (w + 1) + x] = integral[(y - 1) * (w + 1) + x] + rowSum;
            }
          }
          const out = new Uint8Array(src.length);
          for (let y = 0; y < h; y++) {
            const y0 = Math.max(0, y - radius);
            const y1 = Math.min(h - 1, y + radius);
            for (let x = 0; x < w; x++) {
              const x0 = Math.max(0, x - radius);
              const x1 = Math.min(w - 1, x + radius);
              const A = integral[y0 * (w + 1) + x0];
              const B = integral[y0 * (w + 1) + (x1 + 1)];
              const C = integral[(y1 + 1) * (w + 1) + x0];
              const D = integral[(y1 + 1) * (w + 1) + (x1 + 1)];
              const area = (x1 - x0 + 1) * (y1 - y0 + 1);
              out[y * w + x] = clamp255((D - B - C + A) / Math.max(1, area));
            }
          }
          return out;
        };

        const median3 = (src) => {
          const w = canvas.width, h = canvas.height;
          const out = new Uint8Array(src.length);
          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              const vals = [];
              for (let yy = Math.max(0, y - 1); yy <= Math.min(h - 1, y + 1); yy++) {
                for (let xx = Math.max(0, x - 1); xx <= Math.min(w - 1, x + 1); xx++) {
                  vals.push(src[yy * w + xx]);
                }
              }
              vals.sort((a, b) => a - b);
              out[y * w + x] = vals[(vals.length / 2) | 0];
            }
          }
          return out;
        };

        let working = gray;
        if (['denoise', 'adaptive', 'morph', 'clahe', 'inventory', 'hovercard', 'licensecard', 'banner'].includes(style)) working = median3(working);

        const localMean = ['clahe', 'adaptive', 'morph', 'darkpanel', 'brightrecover', 'inventory', 'hovercard', 'licensecard', 'banner'].includes(style)
          ? meanBlur(working, style === 'darkpanel' || style === 'hovercard' ? 10 : 7)
          : null;

        const sharpened = new Uint8Array(totalPixels);
        const sharpenStrength = style === 'detail' ? 0.6 : (style === 'green' || style === 'darkpanel' || style === 'hovercard' ? 0.72 : (style === 'inventory' ? 0.66 : 0.48));
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const idx = y * canvas.width + x;
            if (x === 0 || y === 0 || x === canvas.width - 1 || y === canvas.height - 1) {
              sharpened[idx] = working[idx];
              continue;
            }
            const neighbours = (
              working[(y-1)*canvas.width + (x-1)] + working[(y-1)*canvas.width + x] + working[(y-1)*canvas.width + (x+1)] +
              working[y*canvas.width + (x-1)] + working[y*canvas.width + (x+1)] +
              working[(y+1)*canvas.width + (x-1)] + working[(y+1)*canvas.width + x] + working[(y+1)*canvas.width + (x+1)]
            ) / 8;
            let val = working[idx] + sharpenStrength * (working[idx] - neighbours);
            if (localMean && (style === 'clahe' || style === 'darkpanel')) val += (working[idx] - localMean[idx]) * 0.65;
            sharpened[idx] = clamp255(val);
          }
        }

        const contrasted = new Uint8Array(totalPixels);
        for (let i = 0; i < totalPixels; i++) {
          let v = clamp255((sharpened[i] - 128) * contrast + 128);
          if (style === 'darkpanel' && localMean) v = clamp255(v + Math.max(0, 110 - localMean[i]) * 0.45);
          if (style === 'hovercard' && localMean) v = clamp255(v + Math.max(0, 118 - localMean[i]) * 0.55);
          if (style === 'banner' && localMean) v = clamp255(v + Math.max(0, 125 - localMean[i]) * 0.65);
          if (style === 'licensecard' && localMean) v = clamp255(v + (128 - localMean[i]) * 0.12);
          if (style === 'brightrecover' && localMean) v = clamp255(v + (128 - localMean[i]) * 0.22);
          contrasted[i] = v;
        }

        let globalThreshold = 128;
        if (['threshold', 'binaryInvert', 'green', 'darkpanel', 'inventory', 'hovercard', 'licensecard', 'banner'].includes(style)) {
          const hist = new Uint32Array(256);
          for (let i = 0; i < totalPixels; i++) hist[contrasted[i]]++;
          let weightedTotal = 0;
          for (let t = 0; t < 256; t++) weightedTotal += t * hist[t];
          let sumB = 0, weightB = 0, bestVar = 0;
          for (let t = 0; t < 256; t++) {
            weightB += hist[t];
            if (!weightB) continue;
            const weightF = totalPixels - weightB;
            if (!weightF) break;
            sumB += t * hist[t];
            const meanB = sumB / weightB;
            const meanF = (weightedTotal - sumB) / weightF;
            const variance = weightB * weightF * Math.pow(meanB - meanF, 2);
            if (variance > bestVar) {
              bestVar = variance;
              globalThreshold = t;
            }
          }
        }

        const outMono = new Uint8Array(totalPixels);
        for (let i = 0; i < totalPixels; i++) {
          let v = contrasted[i];
          if (style === 'invert') v = 255 - v;
          if (['threshold', 'binaryInvert', 'green', 'darkpanel', 'inventory', 'hovercard', 'licensecard', 'banner'].includes(style)) {
            v = v > globalThreshold ? 255 : 0;
            if (style === 'binaryInvert') v = 255 - v;
          } else if (style === 'adaptive' || style === 'morph') {
            const mean = localMean ? localMean[i] : 128;
            const offset = style === 'morph' ? 8 : 10;
            v = contrasted[i] > (mean - offset) ? 255 : 0;
          }
          outMono[i] = v;
        }

        if (style === 'morph') {
          const morph = new Uint8Array(totalPixels);
          const w = canvas.width, h = canvas.height;
          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              let white = 0;
              for (let yy = Math.max(0, y - 1); yy <= Math.min(h - 1, y + 1); yy++) {
                for (let xx = Math.max(0, x - 1); xx <= Math.min(w - 1, x + 1); xx++) {
                  if (outMono[yy * w + xx] > 127) white++;
                }
              }
              morph[y * w + x] = white >= 4 ? 255 : 0;
            }
          }
          for (let i = 0; i < totalPixels; i++) outMono[i] = morph[i];
        }

        for (let i = 0; i < totalPixels; i++) {
          const off = i * 4;
          const v = outMono[i];
          data[off] = data[off + 1] = data[off + 2] = v;
          data[off + 3] = 255;
        }
        ctx.putImageData(imageData, 0, 0);
        canvas.toBlob(resolve, 'image/png');
      };
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = URL.createObjectURL(blob);
    });
  }

  
  async function buildOcrLabPreviewData(blob) {
    const previewDefs = [
      ['Detail', 'detail'],
      ['Adaptive', 'adaptive'],
      ['Dark panel', 'darkpanel'],
      ['Green text', 'green'],
      ['Threshold', 'threshold'],
      ['Inventory', 'inventory'],
      ['Hovercard', 'hovercard'],
      ['Licence', 'licensecard'],
      ['Banner', 'banner'],
      ['Bright recover', 'brightrecover'],
      ['Invert', 'invert']
    ];
    const results = [];
    for (const [label, style] of previewDefs) {
      const processed = await preprocessImageVariant(blob, style, { scale: 1 });
      const url = URL.createObjectURL(processed);
      ocrLab.previews.push(url);
      results.push({ label, url });
    }
    return results;
  }

  function renderOcrLabPreviews(previews) {
    const source = document.getElementById('ocrLabSourcePreview');
    const variants = document.getElementById('ocrLabVariants');
    if (source) {
      if (ocrLab.objectUrl) {
        source.src = ocrLab.objectUrl;
        source.style.display = 'block';
      } else {
        source.removeAttribute('src');
        source.style.display = 'none';
      }
    }
    if (variants) {
      if (!previews || !previews.length) {
        variants.innerHTML = '';
      } else {
        variants.innerHTML = previews.map(p => `<div class="ocr-lab-variant"><img src="${p.url}" alt="${escapeHtml(p.label)} preview" /><div class="cap">${escapeHtml(p.label)}</div></div>`).join('');
      }
    }
  }

  function scoreOcrLabBundle(parsed) {
    let score = scoreParsedOCRBundle(parsed);
    if (!parsed) return score;
    if (norm(parsed.vehicle?.owner)) score += 1.5;
    if (norm(parsed.vehicle?.model)) score += 1;
    if ((parsed.itemLines || []).length) score += Math.min(5, (parsed.itemLines || []).length * 0.9);
    if ((parsed.officerNames || []).length) score += Math.min(2, (parsed.officerNames || []).length * 0.5);
    if (norm(parsed.license?.weaponHandgun) || norm(parsed.license?.weaponLongarm)) score += 1;
    if (norm(parsed.meta?.drugTest)) score += 1.4;
    if (norm(parsed.weaponCard?.serial)) score += 1.2;
    return score;
  }

  async function runSingleOcrLabPass(worker, sourceBlob, label, style, psm = '6') {
    const processed = style === 'processed' ? await preprocessImage(sourceBlob) : await preprocessImageVariant(sourceBlob, style || 'detail');
    const result = await recognizeWithWorker(worker, processed, psm);
    const text = postProcessOCR(result.text || '');
    const parsed = parseOCR(text);
    const score = scoreOcrLabBundle(parsed) + ((result.confidence || 0) / 100);
    return { label, text, parsed, score, confidence: result.confidence || 0 };
  }

  
  async function runFocusedDetailOCRPasses(worker, originalBlob, mode = 'auto') {
    const passes = [];
    const targets = [];
    if (mode === 'auto' || mode === 'person' || mode === 'vehicle') {
      targets.push({ label: 'MDT PANEL', rect: { x: 0.40, y: 0.10, w: 0.58, h: 0.78 }, styles: ['green', 'darkpanel', 'adaptive', 'detail'], psm: '6' });
      targets.push({ label: 'LEAP FULL', rect: { x: 0.02, y: 0.04, w: 0.96, h: 0.92 }, styles: ['green', 'darkpanel', 'adaptive'], psm: '6' });
    }
    if (mode === 'auto' || mode === 'weapons') {
      targets.push({ label: 'HOVERCARD LEFT', rect: { x: 0.04, y: 0.02, w: 0.54, h: 0.54 }, styles: ['hovercard', 'darkpanel', 'adaptive', 'threshold'], psm: '6' });
      targets.push({ label: 'HOVERCARD MID', rect: { x: 0.14, y: 0.04, w: 0.60, h: 0.56 }, styles: ['hovercard', 'darkpanel', 'adaptive', 'threshold'], psm: '6' });
      targets.push({ label: 'INVENTORY FULL', rect: { x: 0.00, y: 0.00, w: 1.00, h: 1.00 }, styles: ['inventory', 'adaptive', 'threshold'], psm: '11' });
      targets.push({ label: 'UPPER INVENTORY', rect: { x: 0.00, y: 0.00, w: 1.00, h: 0.45 }, styles: ['inventory', 'adaptive'], psm: '11' });
      targets.push({ label: 'LOWER INVENTORY', rect: { x: 0.00, y: 0.40, w: 1.00, h: 0.60 }, styles: ['inventory', 'adaptive'], psm: '11' });
      targets.push({ label: 'RESULT BANNER', rect: { x: 0.00, y: 0.00, w: 0.50, h: 0.24 }, styles: ['banner', 'threshold', 'invert'], psm: '7' });
    }
    if (mode === 'auto' || mode === 'license') {
      targets.push({ label: 'LICENCE FULL', rect: { x: 0.00, y: 0.00, w: 1.00, h: 1.00 }, styles: ['licensecard', 'adaptive', 'threshold'], psm: '6' });
      targets.push({ label: 'LEFT LICENCE PANEL', rect: { x: 0.00, y: 0.16, w: 0.52, h: 0.60 }, styles: ['licensecard', 'adaptive', 'threshold', 'brightrecover'], psm: '6' });
    }
    let best = null;
    for (const target of targets) {
      const cropped = await cropBlobFromImageBlob(originalBlob, target.rect, { scale: target.psm === '11' ? 2.0 : 2.5 });
      for (const style of target.styles) {
        const pass = await runSingleOcrLabPass(worker, cropped, `${target.label} • ${style}`, style, target.psm || '6');
        passes.push(pass);
        if (!best || pass.score > best.score) best = pass;
      }
    }
    return { best, passes };
  }

  function summariseOcrLabPasses(passes) {
    const list = document.getElementById('ocrLabPasses');
    if (!list) return;
    if (!passes || !passes.length) {
      list.innerHTML = '<div class="muted">No OCR run yet.</div>';
      return;
    }
    const top = [...passes].sort((a, b) => b.score - a.score).slice(0, 6);
    list.innerHTML = top.map(pass => `<div class="ocr-lab-pass"><strong>${escapeHtml(pass.label)}</strong><div>Score: ${Number(pass.score || 0).toFixed(2)} | Confidence: ${Math.round(pass.confidence || 0)}%</div><div class="muted" style="margin-top:4px">${escapeHtml(String(pass.text || '').replace(/\s+/g, ' ').slice(0, 140) || 'No text')}</div></div>`).join('');
  }

  function renderOcrLabResult(result) {
    const parsed = result?.parsed || {};
    const personRows = [
      ['Name', parsed.offender?.name],
      ['DOB', parsed.offender?.dob],
      ['Sex', parsed.offender?.sex],
      ['Address', parsed.offender?.address],
      ['Phone', parsed.offender?.phone],
      ['Licence class', parsed.license?.licenseClass],
      ['Licence status', parsed.license?.licenseStatus],
      ['Expiry', parsed.license?.expires],
      ['Demerit pts', parsed.license?.demeritPoints ? String(parsed.license.demeritPoints) : ''],
      ['Drug result', parsed.meta?.drugTest],
      ['Gang Aff', parsed.license?.gangAffiliation],
      ['Violence Police', parsed.license?.violencePolice],
      ['Longarm', parsed.license?.weaponLongarm],
      ['Handgun', parsed.license?.weaponHandgun]
    ].filter(row => norm(row[1]));
    const vehicleRows = [
      ['Rego', parsed.vehicle?.rego],
      ['Model', parsed.vehicle?.model],
      ['Colour', parsed.vehicle?.colour],
      ['Registered', parsed.vehicle?.registered],
      ['Expires', parsed.vehicle?.expires],
      ['Stolen', parsed.vehicle?.stolen],
      ['Suspended', parsed.vehicle?.suspended],
      ['Owner', parsed.vehicle?.owner]
    ].filter(row => norm(row[1]));
    const itemRows = (parsed.itemLines || []).map((line, idx) => [`Item ${idx + 1}`, line]);
    if (parsed.weaponCard?.serial) itemRows.unshift(['Serial', parsed.weaponCard.serial]);
    renderOcrLabRows(document.getElementById('ocrLabPersonFields'), personRows);
    renderOcrLabRows(document.getElementById('ocrLabVehicleFields'), vehicleRows);
    renderOcrLabRows(document.getElementById('ocrLabItemsFields'), itemRows);
    const text = document.getElementById('ocrLabText');
    if (text) text.value = result?.rawText || '';
    summariseOcrLabPasses(result?.passes || []);
  }

  function applyParsedOcrBundleToReport(parsed, rawText = '', scope = 'all') {
    if (!parsed) return;
    const applyPerson = scope === 'all' || scope === 'person';
    const applyVehicle = scope === 'all' || scope === 'vehicle';
    const applyItems = scope === 'all' || scope === 'items';
    const applyLicense = scope === 'all' || scope === 'license';
    const applyRaw = scope === 'all' || scope === 'raw';

    if (applyPerson) {
      const person = {
        name: parsed.offender?.name || state.offender.name,
        dob: parsed.offender?.dob || state.offender.dob,
        sex: parsed.offender?.sex || state.offender.sex,
        address: parsed.offender?.address || state.offender.address,
        phone: parsed.offender?.phone || state.offender.phone
      };
      fillOffenderFields(person);
      if (person.name) upsertPerson(person);
    }

    if (applyVehicle && parsed.vehicle) {
      if (state.vicpolWarrant) syncVehicleFields(parsed.vehicle, state.vicpolWarrant, 'sw');
      if (state.trafficWarrant) syncVehicleFields(parsed.vehicle, state.trafficWarrant, 'tw');
    }

    if (applyLicense && parsed.license) {
      if (typeof parsed.license.demeritPoints === 'number') {
        state.currentDemeritPoints = parsed.license.demeritPoints || 0;
        const demeritInput = document.getElementById('currentDemeritPoints');
        if (demeritInput) demeritInput.value = state.currentDemeritPoints;
      }
      state.licenseStatus = parsed.license.licenseStatus || state.licenseStatus;
      state.licenseClass = parsed.license.licenseClass || state.licenseClass;
      updateLicenseWarning();
    }

    if (applyItems && parsed.itemLines && parsed.itemLines.length) {
      const lines = buildWeaponsEvidenceLines(parsed.itemLines);
      if (lines.length) {
        state.itemsList = mergeEvidenceAppend(state.itemsList, lines);
        if (el.itemsList) el.itemsList.value = state.itemsList;
      }
    }

    if (applyRaw) {
      state.ocrText = rawText || '';
      if (el.ocrText) el.ocrText.value = state.ocrText;
    }

    // Serial numbers detected by OCR → append (SN: XXXX) to matching item in itemsList
    if ((scope === 'all' || scope === 'items') && rawText) {
      const serials = parseEvidenceSerials(rawText);
      if (serials.length) {
        let itemLines = ensureLines(state.itemsList).split('\n').map(x => x.trim()).filter(Boolean);
        let changed = false;

        for (const serial of serials) {
          const snMatch = serial.match(/SN:\s*([A-Z0-9]+)/i);
          const snVal = snMatch ? snMatch[1].toUpperCase() : null;
          if (!snVal) continue;

          // Skip if serial already present in itemsList
          if (itemLines.some(l => l.toUpperCase().includes(snVal))) continue;

          // Try to match weapon keyword to an existing item line
          const weaponMatch = serial.match(/^([A-Z]+)\s+SN:/i);
          const weaponKeyword = weaponMatch ? weaponMatch[1].toUpperCase() : null;

          let matched = false;
          if (weaponKeyword) {
            for (let i = 0; i < itemLines.length; i++) {
              if (itemLines[i].toUpperCase().includes(weaponKeyword)) {
                itemLines[i] = itemLines[i].replace(/\s*\(SN:[^)]*\)/i, '') + ` (SN: ${snVal})`;
                matched = true;
                changed = true;
                break;
              }
            }
          }

          // No matching item found — add as a new line
          if (!matched) {
            const label = weaponKeyword
              ? `${weaponKeyword.charAt(0) + weaponKeyword.slice(1).toLowerCase()} (SN: ${snVal})`
              : `Item (SN: ${snVal})`;
            itemLines.push(label);
            changed = true;
          }
        }

        if (changed) {
          state.itemsList = itemLines.join('\n');
          if (el.itemsList) el.itemsList.value = state.itemsList;
        }
      }
    }

    renderAll();
    throttledAutosave();
  }

  
  async function runOcrLabScan(blob, opts = {}) {
    if (!blob) {
      toast('Load an image first', 'warn');
      return null;
    }
    const mode = opts.mode || (document.getElementById('ocrLabMode')?.value || 'auto');
    const autoApply = !!(opts.autoApply ?? document.getElementById('ocrLabAutoApply')?.checked);

    ocrLabSetStatus('Loading OCR library...');
    const ok = await ensureTesseract();
    if (!ok || !window.Tesseract || typeof window.Tesseract.recognize !== 'function') {
      ocrLabSetStatus('OCR unavailable offline.', 'warn');
      toast('OCR unavailable offline', 'warn');
      return null;
    }

    let worker = null;
    try {
      const previewData = await buildOcrLabPreviewData(blob);
      renderOcrLabPreviews(previewData);
      ocrLabSetStatus('Running multi-pass OCR...');

      worker = await createOCRWorker((m) => {
        if (m.status === 'recognizing text') ocrLabSetStatus(`Advanced OCR: ${Math.round((m.progress || 0) * 100)}%`);
        else if (m.status === 'loading language traineddata') ocrLabSetStatus(`Loading OCR data: ${Math.round((m.progress || 0) * 100)}%`);
        else if (m.status === 'initializing tesseract') ocrLabSetStatus('Initialising OCR worker...');
      });

      const passes = [];
      const primaryPass = await runSingleOcrLabPass(worker, blob, 'FULL IMAGE • processed', 'processed', mode === 'weapons' ? '11' : '6');
      passes.push(primaryPass);
      let parsed = primaryPass.parsed;
      let rawText = primaryPass.text;
      let bestScore = primaryPass.score;

      const extraFullStyles = mode === 'weapons'
        ? ['adaptive', 'morph', 'threshold']
        : mode === 'license'
          ? ['adaptive', 'gamma', 'brightrecover', 'threshold']
          : ['adaptive', 'darkpanel', 'brightrecover', 'gamma'];

      for (const style of extraFullStyles) {
        const pass = await runSingleOcrLabPass(worker, blob, `FULL IMAGE • ${style}`, style, mode === 'weapons' ? '11' : '6');
        passes.push(pass);
        parsed = mergeParsedOCR(parsed, pass.parsed);
        rawText = [rawText, '', `--- ${pass.label} ---`, pass.text].filter(Boolean).join('\n');
        bestScore = Math.max(bestScore, pass.score);
      }

      if (mode !== 'license') {
        const regional = await runRegionalOCRPasses(worker, blob);
        if (regional && regional.parsed) {
          const pass = { label: regional.label, text: regional.text, parsed: regional.parsed, score: scoreOcrLabBundle(regional.parsed), confidence: 0 };
          passes.push(pass);
          parsed = mergeParsedOCR(parsed, regional.parsed);
          rawText = [rawText, '', `--- ${regional.label} ---`, regional.text].filter(Boolean).join('\n');
          bestScore = Math.max(bestScore, pass.score);
        }
      }

      if (mode === 'auto' || mode === 'license') {
        const licence = await detectAndParseLicenceFromImage(worker, blob);
        if (licence && licence.parsed) {
          const pass = { label: 'LICENCE ZONE', text: licence.text || '', parsed: licence.parsed, score: licence.parsed.score || scoreOcrLabBundle(licence.parsed), confidence: 0 };
          passes.push(pass);
          parsed = mergeParsedOCR(parsed, licence.parsed);
          rawText = [rawText, '', '--- LICENCE ZONE OCR ---', licence.text].filter(Boolean).join('\n');
          bestScore = Math.max(bestScore, pass.score);
        }
      }

      const focused = await runFocusedDetailOCRPasses(worker, blob, mode);
      if (focused && focused.passes && focused.passes.length) {
        focused.passes.forEach(pass => passes.push(pass));
        for (const pass of focused.passes) {
          parsed = mergeParsedOCR(parsed, pass.parsed);
          rawText = [rawText, '', `--- ${pass.label} ---`, pass.text].filter(Boolean).join('\n');
          bestScore = Math.max(bestScore, pass.score);
        }
      }

      if (bestScore < 9.2) {
        const retryStyles = ['invert', 'denoise', 'clahe'];
        for (const style of retryStyles) {
          const retryPass = await runSingleOcrLabPass(worker, blob, `FULL IMAGE • ${style}`, style, '6');
          passes.push(retryPass);
          parsed = mergeParsedOCR(parsed, retryPass.parsed);
          rawText = [rawText, '', `--- ${retryPass.label} ---`, retryPass.text].filter(Boolean).join('\n');
          bestScore = Math.max(bestScore, retryPass.score);
        }
      }

      if (worker && typeof worker.terminate === 'function') {
        await worker.terminate();
        worker = null;
      }

      const result = { parsed, rawText, passes, score: bestScore, mode };
      ocrLab.result = result;
      renderOcrLabResult(result);
      ocrLabSetStatus('Advanced OCR complete', 'ok');
      if (autoApply) {
        applyParsedOcrBundleToReport(parsed, rawText, 'all');
        toast('Advanced OCR results applied to report', 'ok');
      } else {
        toast('Advanced OCR results ready', 'ok');
      }
      return result;
    } catch (err) {
      console.error(err);
      if (worker && typeof worker.terminate === 'function') {
        try { await worker.terminate(); } catch (_) {}
      }
      ocrLabSetStatus('Advanced OCR failed', 'err');
      toast('Advanced OCR error: ' + err.message, 'err');
      return null;
    }
  }

  function clearOcrLab() {
    ocrLab.blob = null;
    ocrLab.result = null;
    revokeOcrLabUrls();
    const source = document.getElementById('ocrLabSourcePreview');
    if (source) {
      source.removeAttribute('src');
      source.style.display = 'none';
    }
    const variants = document.getElementById('ocrLabVariants');
    if (variants) variants.innerHTML = '';
    const file = document.getElementById('ocrLabFile');
    if (file) file.value = '';
    renderOcrLabResult(null);
    ocrLabSetStatus('Advanced OCR idle');
  }

  function initOcrLabBindings() {
    const runBtn = document.getElementById('ocrLabRunBtn');
    const applyBtn = document.getElementById('ocrLabApplyBtn');
    const clearBtn = document.getElementById('ocrLabClearBtn');
    const applyPersonBtn = document.getElementById('ocrLabApplyPersonBtn');
    const applyLicenseBtn = document.getElementById('ocrLabApplyLicenseBtn');
    const applyVehicleBtn = document.getElementById('ocrLabApplyVehicleBtn');
    const applyItemsBtn = document.getElementById('ocrLabApplyItemsBtn');
    const applyRawBtn = document.getElementById('ocrLabApplyRawBtn');

    // OCR results grid — show after first run

    if (runBtn && runBtn.dataset.bound !== '1') {
      runBtn.dataset.bound = '1';
      runBtn.addEventListener('click', () => {
        if (!ocrLab.blob) return toast('Load an image first using the file pickers above', 'warn');
        const grid = document.getElementById('ocrLabResultsGrid');
        const hint = document.getElementById('ocrNoResultsHint');
        if (grid) grid.style.display = 'grid';
        if (hint) hint.style.display = 'none';
        runOcrLabScan(ocrLab.blob, { autoApply: document.getElementById('ocrLabAutoApply')?.checked ?? true });
      });
    }
    if (applyBtn && applyBtn.dataset.bound !== '1') {
      applyBtn.dataset.bound = '1';
      applyBtn.addEventListener('click', () => {
        if (!ocrLab.result) return toast('Run Advanced OCR first', 'warn');
        applyParsedOcrBundleToReport(ocrLab.result.parsed, ocrLab.result.rawText, 'all');
        toast('Advanced OCR results applied to report', 'ok');
      });
    }
    if (clearBtn && clearBtn.dataset.bound !== '1') {
      clearBtn.dataset.bound = '1';
      clearBtn.addEventListener('click', clearOcrLab);
    }
    const ocrLabFileInput = document.getElementById('ocrLabFile');
    if (ocrLabFileInput && ocrLabFileInput.dataset.bound !== '1') {
      ocrLabFileInput.dataset.bound = '1';
      ocrLabFileInput.addEventListener('change', () => {
        const f = ocrLabFileInput.files[0];
        if (!f) return;
        ocrLab.blob = f;
        const src = document.getElementById('ocrLabSourcePreview');
        if (src) { src.src = URL.createObjectURL(f); src.style.display = 'block'; }
        const grid = document.getElementById('ocrLabResultsGrid');
        const hint = document.getElementById('ocrNoResultsHint');
        if (grid) grid.style.display = 'grid';
        if (hint) hint.style.display = 'none';
        runOcrLabScan(f, { autoApply: true });
      });
    }
    if (applyPersonBtn && applyPersonBtn.dataset.bound !== '1') {
      applyPersonBtn.dataset.bound = '1';
      applyPersonBtn.addEventListener('click', () => {
        if (!ocrLab.result) return toast('Run Advanced OCR first', 'warn');
        applyParsedOcrBundleToReport(ocrLab.result.parsed, ocrLab.result.rawText, 'person');
        toast('Person fields applied', 'ok');
      });
    }
    if (applyLicenseBtn && applyLicenseBtn.dataset.bound !== '1') {
      applyLicenseBtn.dataset.bound = '1';
      applyLicenseBtn.addEventListener('click', () => {
        if (!ocrLab.result) return toast('Run Advanced OCR first', 'warn');
        applyParsedOcrBundleToReport(ocrLab.result.parsed, ocrLab.result.rawText, 'license');
        toast('Licence fields applied', 'ok');
      });
    }
    if (applyVehicleBtn && applyVehicleBtn.dataset.bound !== '1') {
      applyVehicleBtn.dataset.bound = '1';
      applyVehicleBtn.addEventListener('click', () => {
        if (!ocrLab.result) return toast('Run Advanced OCR first', 'warn');
        applyParsedOcrBundleToReport(ocrLab.result.parsed, ocrLab.result.rawText, 'vehicle');
        toast('Vehicle fields applied', 'ok');
      });
    }
    if (applyItemsBtn && applyItemsBtn.dataset.bound !== '1') {
      applyItemsBtn.dataset.bound = '1';
      applyItemsBtn.addEventListener('click', () => {
        if (!ocrLab.result) return toast('Run Advanced OCR first', 'warn');
        applyParsedOcrBundleToReport(ocrLab.result.parsed, ocrLab.result.rawText, 'items');
        toast('Items applied', 'ok');
      });
    }
    if (applyRawBtn && applyRawBtn.dataset.bound !== '1') {
      applyRawBtn.dataset.bound = '1';
      applyRawBtn.addEventListener('click', () => {
        if (!ocrLab.result) return toast('Run Advanced OCR first', 'warn');
        applyParsedOcrBundleToReport(ocrLab.result.parsed, ocrLab.result.rawText, 'raw');
        toast('Raw OCR copied into report OCR text', 'ok');
      });
    }
  }

  initializeCollapsibleCards();
  expandCardsWithContentDefaults();
  initUiBindings();
  initOcrLabBindings();
