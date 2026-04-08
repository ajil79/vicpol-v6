/* Traffic defects, evidence lists, render-all, persons/officers/signature pools, OCR availability helpers. */

  function renderDefectsList(filterVal) {
    const container = document.getElementById("defectsList");
    if (!container) return;
    
    const q = (filterVal || "").trim().toUpperCase();
    const filtered = q ? VEHICLE_DEFECTS.filter(d =>
      d.name.toUpperCase().includes(q) ||
      d.cat.toUpperCase().includes(q) ||
      d.desc.toUpperCase().includes(q) ||
      d.law.toUpperCase().includes(q)
    ) : VEHICLE_DEFECTS;
    
    if (!filtered.length) {
      container.innerHTML = '<div class="muted" style="padding:8px;font-size:12px">No matching defects</div>';
      return;
    }
    
    container.innerHTML = "";
    let lastCat = "";
    filtered.forEach(d => {
      if (d.cat !== lastCat) {
        lastCat = d.cat;
        const header = document.createElement("div");
        header.style.cssText = "font-size:11px;font-weight:900;color:var(--accent);padding:6px 0 2px;text-transform:uppercase;letter-spacing:0.5px";
        header.textContent = d.cat;
        container.appendChild(header);
      }
      const row = document.createElement("div");
      row.style.cssText = "padding:8px 10px;background:rgba(0,0,0,0.2);border:1px solid var(--border);border-radius:8px;cursor:pointer;transition:all 0.15s";
      row.onmouseenter = () => row.style.background = "rgba(108,138,255,0.12)";
      row.onmouseleave = () => row.style.background = "rgba(0,0,0,0.2)";
      row.innerHTML =
        '<div style="font-size:12px;font-weight:800;margin-bottom:2px">' + escapeHtml(d.name) + '</div>' +
        '<div style="font-size:11px;color:var(--muted)">' + escapeHtml(d.desc) + '</div>' +
        '<div style="font-size:10px;color:var(--accent);margin-top:3px">' + escapeHtml(d.law) + '</div>';
      row.addEventListener("click", () => {
        const entry = { name: d.name, desc: d.desc, reason: d.reason, law: d.law };
        _defectHistory.push(entry);

        // Traffic warrant: also fill Reason + Legislation fields
        if (state.reportType === "traffic_warrant" && el.twReason) {
          const reasonLine = d.name + " — " + d.desc + ". " + d.reason + ".";
          const current = el.twReason.value.trim();
          el.twReason.value = current ? current + "\n" + reasonLine : reasonLine;
          state.trafficWarrant.reason = el.twReason.value;
          if (el.twLegNotes) {
            const lawLine = d.name + ": " + d.law;
            const curLeg = el.twLegNotes.value.trim();
            if (!curLeg.includes(d.law)) {
              el.twLegNotes.value = curLeg ? curLeg + "\n" + lawLine : lawLine;
              state.trafficWarrant.legNotes = el.twLegNotes.value;
            }
          }
        }
        renderSelectedDefectsChips();
        debouncedRenderPreview();
        throttledAutosave();
        toast("Added: " + d.name, "ok");
      });
      container.appendChild(row);
    });
  }

  function bindInputs() {
    // Report type
    if (el.reportType) {
      el.reportType.addEventListener("change", () => {
        state.reportType = sanitizeVicPolReportType(el.reportType.value);
        if (el.reportType.value !== state.reportType) el.reportType.value = state.reportType;
        try {
          localStorage.setItem("vicpol_report_last_report_type", state.reportType);
        } catch {}
        updateReportTypeUI();
        debouncedRenderPreview();
        throttledAutosave();
      });
    }

    // Header fields
    const headerFields = ['enteredBy', 'reportDateTime', 'enteredUnit'];
    headerFields.forEach(field => {
      if (el[field]) {
        el[field].addEventListener("input", () => {
          state[field] = el[field].value;
          // Changing "Entered By" updates the default callsign for officers
          if (field === 'enteredBy') {
            // Auto-save this callsign to pool
            const cs = extractCallsignFromLine(el[field].value);
            if (cs) addCallsignToPool(cs);
            renderOfficerTags();
          }
          debouncedRenderPreview();
          throttledAutosave();
        });
      }
    });

    // Offender fields
    const offenderFields = ['offenderName', 'offenderDOB', 'offenderSex', 'offenderAddress', 'offenderPhone'];
    offenderFields.forEach(field => {
      if (el[field]) {
        const updateFn = () => {
          const key = field.replace('offender', '').toLowerCase();
          const mappedKey = key === 'name' ? 'name' : key === 'dob' ? 'dob' : key === 'sex' ? 'sex' : key === 'address' ? 'address' : 'phone';
          state.offender[mappedKey] = el[field].value;
          debouncedRenderPreview();
          throttledAutosave();
        };
        el[field].addEventListener("input", updateFn);
        el[field].addEventListener("change", updateFn); // For select elements
      }
    });

    // Traffic Warrant fields
    const twFields = [
      'twRego', 'twModel', 'twColour', 'twRegistered', 'twRegoExpires', 'twStolen',
      'twSuspended', 'twOwner', 'twLocation', 'twTime', 'twDate', 'twSpeed',
      'twSuspHours', 'twApprovedBy',
      'twReason', 'twActions', 'twLegNotes'
    ];
    twFields.forEach(field => {
      if (el[field]) {
        const updateFn = () => {
          const key = field.substring(2);
          const lowerKey = key.charAt(0).toLowerCase() + key.slice(1);
          state.trafficWarrant[lowerKey] = el[field].value;
          debouncedRenderPreview();
          throttledAutosave();
        };
        el[field].addEventListener("input", updateFn);
        el[field].addEventListener("change", updateFn); // For select elements
      }
    });

    // MELROADS paste auto-parser for traffic warrant
    const twMelroadsPaste = document.getElementById("twMelroadsPaste");
    if (twMelroadsPaste) {
      twMelroadsPaste.addEventListener("input", () => {
        const text = twMelroadsPaste.value.trim();
        if (!text || text.length < 20) return;
        // Only parse if it looks like a MELROADS excerpt
        if (!/registration|rego|model|owner/i.test(text)) return;
        const p = parseOCR(text);
        if (!p.vehicle) return;
        const v = p.vehicle;
        const tw = state.trafficWarrant;
        const fill = (elId, stateKey, val) => {
          if (!val) return;
          const field = document.getElementById(elId);
          if (field && !field.value) {
            field.value = val;
            tw[stateKey] = val;
          }
        };
        fill('twRego', 'rego', v.rego);
        fill('twModel', 'model', v.model);
        fill('twColour', 'colour', v.colour);
        fill('twRegoExpires', 'regoExpires', v.expires);
        fill('twOwner', 'owner', v.owner);
        // Selects need special handling
        if (v.registered && el.twRegistered && !el.twRegistered.value) {
          el.twRegistered.value = v.registered; tw.registered = v.registered;
        }
        if (v.stolen && el.twStolen && !el.twStolen.value) {
          el.twStolen.value = v.stolen; tw.stolen = v.stolen;
        }
        if (v.suspended && el.twSuspended && !el.twSuspended.value) {
          el.twSuspended.value = v.suspended; tw.suspended = v.suspended;
        }
        // Also fill offender name from owner if empty
        if (v.owner && el.offenderName && !el.offenderName.value) {
          el.offenderName.value = v.owner;
          state.offender.name = v.owner;
        }
        debouncedRenderPreview();
        throttledAutosave();
        toast("MELROADS auto-filled vehicle details", "ok");
      });
    }

    // Impound schedule dropdown for traffic warrant
    const twImpoundNum = document.getElementById("twImpoundNum");
    if (twImpoundNum) {
      twImpoundNum.addEventListener("change", () => {
        applyTrafficImpoundSelection(twImpoundNum.value, { updateState: true });
        debouncedRenderPreview();
        throttledAutosave();
      });
    }

    // Failed intercept checkbox
    const twFailedIntercept = document.getElementById("twFailedIntercept");
    if (twFailedIntercept) {
      twFailedIntercept.checked = !!state.trafficWarrant.failedIntercept;
      twFailedIntercept.addEventListener("change", () => {
        state.trafficWarrant.failedIntercept = twFailedIntercept.checked;
        debouncedRenderPreview();
        throttledAutosave();
      });
    }

    // Vehicle Defects Reference panel toggle & search
    const defectsToggle = document.getElementById("defectsToggle");
    const defectsPanel = document.getElementById("defectsPanel");
    const defectsToggleIcon = document.getElementById("defectsToggleIcon");
    if (defectsToggle && defectsPanel) {
      defectsToggle.addEventListener("click", (e) => {
        if (e.target.closest('.section-toggle-btn')) return; // let eye toggle handle itself
        const open = defectsPanel.style.display !== "none";
        defectsPanel.style.display = open ? "none" : "block";
        defectsToggle.setAttribute('aria-expanded', open ? 'false' : 'true');
        if (defectsToggleIcon) defectsToggleIcon.textContent = open ? "▶ Show" : "▼ Hide";
        if (!open) renderDefectsList();
      });
    }
    const defectSearch = document.getElementById("defectSearch");
    if (defectSearch) {
      defectSearch.addEventListener("input", () => renderDefectsList(defectSearch.value));
    }
    // Undo Last defect
    const defectClearLast = document.getElementById("defectClearLast");
    if (defectClearLast) {
      defectClearLast.addEventListener("click", () => {
        if (!_defectHistory.length) { toast("Nothing to undo", "warn"); return; }
        const last = _defectHistory.pop();
        // Also undo from traffic warrant fields if applicable
        if (state.reportType === "traffic_warrant" && el.twReason) {
          const reasonLine = last.name + " — " + last.desc + ". " + last.reason + ".";
          const lawLine = last.name + ": " + last.law;
          const rLines = el.twReason.value.split("\n"); const ri = rLines.lastIndexOf(reasonLine);
          if (ri >= 0) rLines.splice(ri, 1);
          el.twReason.value = rLines.join("\n").trim(); state.trafficWarrant.reason = el.twReason.value;
          if (el.twLegNotes) {
            const lLines = el.twLegNotes.value.split("\n"); const li = lLines.lastIndexOf(lawLine);
            if (li >= 0) lLines.splice(li, 1);
            el.twLegNotes.value = lLines.join("\n").trim(); state.trafficWarrant.legNotes = el.twLegNotes.value;
          }
        }
        renderSelectedDefectsChips();
        debouncedRenderPreview();
        throttledAutosave();
        toast("Undone last defect", "ok");
      });
    }
    // Clear All defects
    const defectClearAll = document.getElementById("defectClearAll");
    if (defectClearAll) {
      defectClearAll.addEventListener("click", () => {
        if (!_defectHistory.length) { toast("No defects to clear", "warn"); return; }
        if (!confirm("Clear all selected defects?")) return;
        if (state.reportType === "traffic_warrant") {
          if (el.twReason) { el.twReason.value = ""; state.trafficWarrant.reason = ""; }
          if (el.twLegNotes) { el.twLegNotes.value = ""; state.trafficWarrant.legNotes = ""; }
        }
        _defectHistory.length = 0;
        renderSelectedDefectsChips();
        debouncedRenderPreview();
        throttledAutosave();
        toast("All defects cleared", "ok");
      });
    }

  function renderSelectedDefectsChips() {
    const container = document.getElementById("selectedDefectsChips");
    if (!container) return;
    if (!_defectHistory.length) { container.innerHTML = ""; return; }
    container.innerHTML = '<div style="font-size:10px;font-weight:700;color:var(--muted);width:100%;margin-bottom:2px">SELECTED DEFECTS (' + _defectHistory.length + ')</div>' +
      _defectHistory.map((d, i) =>
        '<span style="display:inline-flex;align-items:center;gap:4px;padding:4px 8px;background:rgba(255,100,100,0.1);border:1px solid rgba(255,100,100,0.25);border-radius:8px;font-size:11px;font-weight:700;color:rgba(255,180,180,0.9)">' +
        escapeHtml(d.name) +
        '<button data-remove-defect="' + i + '" style="background:none;border:none;color:rgba(255,100,100,0.7);cursor:pointer;padding:0;margin:0;font-size:12px;font-family:inherit">✕</button></span>'
      ).join("");
  }
  // Delegated click for defect chip removal
  document.getElementById("selectedDefectsChips")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-remove-defect]");
    if (!btn) return;
    const idx = parseInt(btn.dataset.removeDefect);
    if (!isNaN(idx)) {
      _defectHistory.splice(idx, 1);
      renderSelectedDefectsChips();
      debouncedRenderPreview();
      throttledAutosave();
    }
  });
  window.renderSelectedDefectsChips = renderSelectedDefectsChips;

    // Shared warrant fields fields
    const swFields = [
      'swIdStatus', 'swIdBasis', 'swWarrantName',
      'swPaste', 'swRego', 'swModel', 'swColour', 'swRegistered', 'swRegoExpires',
       'swStolen', 'swSuspended', 'swOwner', 'swInstruction'
    ];
    swFields.forEach(field => {
      if (el[field]) {
        const updateFn = () => {
          const key = field.substring(2);
          const lowerKey = key.charAt(0).toLowerCase() + key.slice(1);
          state.vicpolWarrant[lowerKey] = el[field].value;
          if (field==="swPaste"&&el[field].value.trim()){const sp=parseOCR(el[field].value);const mg={name:sp.offender.name||state.offender.name,dob:sp.offender.dob||state.offender.dob,sex:sp.offender.sex||state.offender.sex,address:sp.offender.address||state.offender.address,phone:sp.offender.phone||state.offender.phone};if(sp.offender.name||sp.offender.dob){fillOffenderFields(mg);if(mg.name)upsertPerson(mg);}if(sp.license){state.currentDemeritPoints=sp.license.demeritPoints||0;state.licenseStatus=sp.license.licenseStatus||"";state.licenseClass=sp.license.licenseClass||"";const _di=document.getElementById("currentDemeritPoints");if(_di)_di.value=state.currentDemeritPoints;updateLicenseWarning();}if(sp.vehicle){const v=sp.vehicle,sw=state.vicpolWarrant;if(v.rego&&!sw.rego){sw.rego=v.rego;if(el.swRego)el.swRego.value=v.rego;}if(v.model&&!sw.model){sw.model=v.model;if(el.swModel)el.swModel.value=v.model;}if(v.colour&&!sw.colour){sw.colour=v.colour;if(el.swColour)el.swColour.value=v.colour;}if(v.registered&&!sw.registered){sw.registered=v.registered;if(el.swRegistered)el.swRegistered.value=v.registered;}if(v.expires&&!sw.regoExpires){sw.regoExpires=v.expires;if(el.swRegoExpires)el.swRegoExpires.value=v.expires;}if(v.stolen){sw.stolen=v.stolen;if(el.swStolen)el.swStolen.value=v.stolen;}if(v.suspended){sw.suspended=v.suspended;if(el.swSuspended)el.swSuspended.value=v.suspended;}if(v.owner&&!sw.owner){sw.owner=v.owner;if(el.swOwner)el.swOwner.value=v.owner;}}toast("MDT paste auto-filled fields", "ok");}
          if (field === "swIdStatus" || field === "swIdBasis") enforceVicpolWarrantIdStatus(field === "swIdStatus");
          debouncedRenderPreview();
          throttledAutosave();
        };
        el[field].addEventListener("input", updateFn);
        el[field].addEventListener("change", updateFn);
      }
    });

    const fcCopySubjectBtn = document.getElementById('fcCopySubjectBtn');
    if (fcCopySubjectBtn && !fcCopySubjectBtn.dataset.bound) { fcCopySubjectBtn.dataset.bound = '1'; fcCopySubjectBtn.addEventListener('click', () => syncReportSubjectInto('fieldContact', { overwrite: false, includePerson: true, includePrelim: false, showToast: true })); }
    const fcCopyPrelimBtn = document.getElementById('fcCopyPrelimBtn');
    if (fcCopyPrelimBtn && !fcCopyPrelimBtn.dataset.bound) { fcCopyPrelimBtn.dataset.bound = '1'; fcCopyPrelimBtn.addEventListener('click', () => syncReportSubjectInto('fieldContact', { overwrite: false, includePerson: false, includePrelim: true, showToast: true })); }
    const ssCopySubjectBtn = document.getElementById('ssCopySubjectBtn');
    if (ssCopySubjectBtn && !ssCopySubjectBtn.dataset.bound) { ssCopySubjectBtn.dataset.bound = '1'; ssCopySubjectBtn.addEventListener('click', () => syncReportSubjectInto('searchSeizure', { overwrite: false, includePerson: true, includePrelim: false, showToast: true })); }
    const ssCopyPrelimBtn = document.getElementById('ssCopyPrelimBtn');
    if (ssCopyPrelimBtn && !ssCopyPrelimBtn.dataset.bound) { ssCopyPrelimBtn.dataset.bound = '1'; ssCopyPrelimBtn.addEventListener('click', () => syncReportSubjectInto('searchSeizure', { overwrite: false, includePerson: false, includePrelim: true, showToast: true })); }


    // Bail Conditions fields
    const bcFields = ['bcBailAmount', 'bcDate', 'bcTime', 'bcLeapHistory'];
    bcFields.forEach(field => {
      if (el[field]) {
        el[field].addEventListener("input", () => {
          const key = field.substring(2);
          const lowerKey = key.charAt(0).toLowerCase() + key.slice(1);
          state.bailConditions[lowerKey] = el[field].value;
          if (field === 'bcLeapHistory') calculateBailAmount();
          debouncedRenderPreview();
          throttledAutosave();
        });
      }
    });
    
    // (bail checkbox bindings handled below with calculateBailAmount integration)

    // Field Contact fields
    const fcFields = ['fcName', 'fcDOB', 'fcPhone', 'fcTime', 'fcDate', 'fcLocation', 'fcReason', 'fcSummary', 'fcNotes'];
    fcFields.forEach(field => {
      if (el[field]) {
        el[field].addEventListener("input", () => {
          const key = field.substring(2);
          const lowerKey = key === 'DOB' ? 'dob' : key.charAt(0).toLowerCase() + key.slice(1);
          state.fieldContact[lowerKey] = el[field].value;
          debouncedRenderPreview();
          throttledAutosave();
        });
      }
    });

    // Search & Seizure fields
    const ssFields = ['ssName', 'ssDOB', 'ssPhone', 'ssTime', 'ssDate', 'ssLocation', 'ssAuthority', 'ssReason', 'ssSummary', 'ssNotes'];
    ssFields.forEach(field => {
      if (el[field]) {
        el[field].addEventListener("input", () => {
          const key = field.substring(2);
          const lowerKey = key === 'DOB' ? 'dob' : key.charAt(0).toLowerCase() + key.slice(1);
          state.searchSeizure[lowerKey] = el[field].value;
          debouncedRenderPreview();
          throttledAutosave();
        });
      }
    });

    // Preliminary details structured inputs
    ['prelimTime', 'prelimDate', 'prelimLocation'].forEach(field => {
      if (el[field]) {
        el[field].addEventListener("input", () => {
          state[field] = el[field].value;
          debouncedRenderPreview();
          throttledAutosave();
        });
      }
    });

    // Narrative fields
    const narrativeFields = ['summary', 'interviewQs'];
    narrativeFields.forEach(field => {
      if (el[field]) {
        el[field].addEventListener("input", () => {
          state[field] = el[field].value;
          debouncedRenderPreview();
          throttledAutosave();
        });
      }
    });

    // Evidence entry system
    // (evidenceItems is module-scoped and pre-populated by renderAll)
    const evidenceQty = document.getElementById('evidenceQty');
    const evidenceItem = document.getElementById('evidenceItem');
    const addEvidenceBtn = document.getElementById('addEvidenceBtn');
    const evidenceList = document.getElementById('evidenceList');
    
    function renderEvidenceList() {
      if (!evidenceList) return;
      evidenceList.innerHTML = evidenceItems.map((item, idx) => {
        // Parse qty prefix if present (e.g. "3x BWC" -> qty=3, text="BWC")
        const qtyMatch = item.match(/^(\d+)\s*x\s+(.+)$/i);
        const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
        const text = qtyMatch ? qtyMatch[2] : item;
        return `<div class="evidence-row">
          <input type="number" class="ev-qty-edit" data-ev-qty="${idx}" value="${qty}" min="1" max="50000" title="Quantity"/>
          <span style="font-size:11px;color:var(--muted)">x</span>
          <span class="ev-text">${escapeHtml(text)}</span>
          <button class="btn" data-remove-evidence="${idx}" style="padding:6px 10px; font-size:11px">Remove</button>
        </div>`;
      }).join('');
      
      // Update the readonly textarea
      if (el.evidence) {
        el.evidence.value = evidenceItems.join('\n');
        state.evidence = el.evidence.value;
        debouncedRenderPreview();
        throttledAutosave();
      }

      // Update evidence counter badge
      updateEvidenceCounter();
    }

    function updateEvidenceCounter() {
      const badge = document.getElementById("evidenceCountBadge");
      const suggestions = document.getElementById("evidenceSuggestions");
      if (badge) {
        badge.textContent = evidenceItems.length > 0 ? `(${evidenceItems.length} item${evidenceItems.length !== 1 ? 's' : ''})` : '';
      }
      if (!suggestions) return;

      // Recommend common evidence based on report type
      const type = state.reportType;
      const has = (keyword) => evidenceItems.some(e => e.toLowerCase().includes(keyword.toLowerCase()));
      const missing = [];

      // Common across most types
      if (!has("BWC") && !has("bodycam") && !has("body cam")) missing.push("BWC");
      if (!has("ID") && !has("licence") && !has("license")) missing.push("ID");

      // Arrest types
      if (["arrest","vicpol_arrest","vicpol_warrant"].includes(type)) {
        if (!has("pocket")) missing.push("Pockets");
        if (!has("fingerprint")) missing.push("Fingerprints");
      }

      // If weapons confiscated, suggest weapon photo
      if (norm(state.itemsList) && /pistol|rifle|smg|shotgun|launcher|knife|machete/i.test(state.itemsList)) {
        if (!has("weapon") && !has("firearm")) missing.push("Weapon photo");
      }

      // If charges include discharge/murder, suggest GSR
      if (norm(state.chargesList) && /discharge|murder|shots fired/i.test(state.chargesList)) {
        if (!has("GSR")) missing.push("GSR test");
      }

      if (missing.length > 0 && evidenceItems.length > 0) {
        suggestions.textContent = "Consider: " + missing.join(", ");
      } else {
        suggestions.textContent = "";
      }
    }
    
    window.removeEvidence = (idx) => {
      evidenceItems.splice(idx, 1);
      renderEvidenceList();
    };

    // Delegated click handler for evidence remove buttons
    if (evidenceList) {
      evidenceList.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-remove-evidence]');
        if (btn) {
          const idx = parseInt(btn.dataset.removeEvidence);
          if (!isNaN(idx)) removeEvidence(idx);
        }
      });
      evidenceList.addEventListener('change', (e) => {
        const input = e.target.closest('input[data-ev-qty]');
        if (!input) return;
        const idx = parseInt(input.dataset.evQty);
        if (isNaN(idx) || idx < 0 || idx >= evidenceItems.length) return;
        const newQty = Math.max(1, parseInt(input.value) || 1);
        // Parse existing text out of the item
        const qtyMatch = evidenceItems[idx].match(/^\d+\s*x\s+(.+)$/i);
        const text = qtyMatch ? qtyMatch[1] : evidenceItems[idx];
        evidenceItems[idx] = `${newQty}x ${text}`;
        // Update textarea and state without full re-render
        if (el.evidence) {
          el.evidence.value = evidenceItems.join('\n');
          state.evidence = el.evidence.value;
          debouncedRenderPreview();
          throttledAutosave();
        }
      });
    }
    
    if (addEvidenceBtn) {
      addEvidenceBtn.addEventListener('click', () => {
        const qty = evidenceQty && evidenceQty.value ? parseInt(evidenceQty.value) : 1;
        const item = evidenceItem && evidenceItem.value ? evidenceItem.value.trim() : '';
        
        if (!item) { toast("Enter an evidence item first", "warn"); return; }
        if (item) {
          const evidenceEntry = qty > 1 ? `${qty}x ${item}` : `1x ${item}`;
          evidenceItems.push(evidenceEntry);
          renderEvidenceList();
          
          // Clear input
          if (evidenceItem) evidenceItem.value = '';
          if (evidenceQty) evidenceQty.value = '1';
          if (evidenceItem) evidenceItem.focus();
        }
      });
    }
    
    if (evidenceItem) {
      evidenceItem.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addEvidenceBtn?.click();
        }
      });
    }

    // Render evidence list from restored state (evidenceItems populated in renderAll)
    renderEvidenceList();

    // Quick-evidence buttons — v47fix: normalize to "1x " prefix, match manual add format
    document.querySelectorAll('.quick-evidence').forEach(btn => {
      btn.addEventListener('click', () => {
        const ev = btn.dataset.ev;
        if (!ev) return;
        // Check for duplicates regardless of "Nx " prefix
        const isDupe = evidenceItems.some(existing => {
          const existText = existing.replace(/^\d+\s*x\s+/i, '');
          return existText.toLowerCase() === ev.toLowerCase();
        });
        if (!isDupe) {
          evidenceItems.push(`1x ${ev}`);
          renderEvidenceList();
        } else {
          toast("Already added: " + ev, "warn");
        }
      });
    });

    // Sentence & Signature
    const miscFields = ['sentence', 'sentenceApproval', 'victims', 'evidenceLocker', 'sigName', 'sigRank', 'sigDivision'];
    miscFields.forEach(field => {
      if (el[field]) {
        el[field].addEventListener("input", () => {
          state[field] = el[field].value;
          debouncedRenderPreview();
          throttledAutosave();
        });
      }
    });

    // Officers & Items
    if (el.officersList) {
      el.officersList.addEventListener("input", () => {
        state.officersList = el.officersList.value;
        renderOfficerTags();
        debouncedRenderPreview();
        throttledAutosave();
      });
      el.officersList.addEventListener("blur", () => {
        const cleaned = dedupeLines(el.officersList.value);
        if (cleaned !== el.officersList.value) {
          el.officersList.value = cleaned;
          state.officersList = cleaned;
          renderOfficerTags();
          debouncedRenderPreview();
          throttledAutosave();
        }
        // Save any new officers from the textarea to the DB
        ensureLines(state.officersList).split("\n").map(l => l.trim()).filter(Boolean).forEach(line => {
          const parsed = parseOfficerLine(line);
          if (parsed && (parsed.callsign || parsed.name.length >= 2)) upsertOfficer(parsed);
          // Auto-save callsign to pool
          const cs = extractCallsignFromLine(line);
          if (cs) addCallsignToPool(cs);
        });
      });
    }

    if (el.addOfficerBtn && el.officerText && el.officersList) {
      el.addOfficerBtn.addEventListener("click", () => {
        const val = (el.officerText.value || "").trim();
        if (!val) { toast("Enter an officer name or callsign first", "warn"); return; }
        // Don't add duplicates
        const existing = (el.officersList.value || "").split("\n").map(l => l.trim().toUpperCase());
        if (existing.includes(val.toUpperCase())) { toast("Officer already added", "warn"); el.officerText.value = ""; return; }
        const current = (el.officersList.value || "").trimEnd();
        el.officersList.value = current ? current + "\n" + val : val;
        state.officersList = el.officersList.value;
        // Save to officers DB
        const parsed = parseOfficerLine(val);
        if (parsed) upsertOfficer(parsed);
        // Auto-save callsign to pool
        const cs = extractCallsignFromLine(val);
        if (cs) addCallsignToPool(cs);
        el.officerText.value = "";
        el.officerText.focus();
        renderOfficerTags();
        debouncedRenderPreview();
        throttledAutosave();
      });
      // Also allow Enter key to add
      el.officerText.addEventListener("keypress", (e) => {
        if (e.key === "Enter") { e.preventDefault(); el.addOfficerBtn.click(); }
      });
    }

    // Add callsign button
    if (el.addCallsignBtn && el.newCallsignInput) {
      el.addCallsignBtn.addEventListener("click", () => {
        const val = (el.newCallsignInput.value || "").trim();
        if (!val) return;
        addCallsignToPool(val);
        el.newCallsignInput.value = "";
        el.newCallsignInput.focus();
      });
      el.newCallsignInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") { e.preventDefault(); el.addCallsignBtn.click(); }
      });
    }

    if (el.itemsList) {
      el.itemsList.addEventListener("input", () => {
        state.itemsList = el.itemsList.value;
        debouncedRenderPreview();
        throttledAutosave();
      });
      el.itemsList.addEventListener("blur", () => {
        const cleaned = dedupeLines(el.itemsList.value);
        if (cleaned !== el.itemsList.value) {
          el.itemsList.value = cleaned;
          state.itemsList = cleaned;
          debouncedRenderPreview();
          throttledAutosave();
        }
      });
    }

    if (el.addItemBtn && el.itemText && el.itemsList) {
      // ── Searchable Item Catalog ──
      



      const CAT_COLORS = {
        firearms: "rgba(255,100,100,0.8)", melee: "rgba(255,180,80,0.8)",
        ammo: "rgba(100,200,255,0.8)", drugs: "rgba(100,255,150,0.8)", gear: "rgba(200,180,255,0.8)"
      };
      const CAT_LABELS = {
        firearms: "Firearm", melee: "Melee/Explosive", ammo: "Ammo/Attachment", drugs: "Drug", gear: "Gear"
      };

      const itemSearchInput = document.getElementById("itemSearchInput");
      const itemSearchClear = document.getElementById("itemSearchClear");
      const itemCategoryFilter = document.getElementById("itemCategoryFilter");
      const itemSearchResults = document.getElementById("itemSearchResults");
      const itemQtyInput = document.getElementById("itemQtyInput");
      const itemSerialInput = document.getElementById("itemSerialInput");

      const renderItemResults = () => {
        const query = (itemSearchInput?.value || "").trim().toLowerCase();
        const cat = itemCategoryFilter?.value || "all";
        itemSearchClear.style.display = query ? "block" : "none";

        let filtered = ITEM_CATALOG;
        if (cat !== "all") filtered = filtered.filter(i => i.cat === cat);
        if (query) filtered = filtered.filter(i => i.name.toLowerCase().includes(query));

        if (filtered.length === 0) {
          itemSearchResults.innerHTML = '<span style="font-size:11px;color:var(--muted)">No items found — type a custom item in the field below</span>';
          return;
        }

        itemSearchResults.innerHTML = filtered.map(i => {
          const col = CAT_COLORS[i.cat] || "var(--muted)";
          const tag = CAT_LABELS[i.cat] || "";
          return `<button type="button" class="btn item-pick-btn" data-itemname="${escapeHtml(i.name)}" style="font-size:11px;padding:3px 9px;position:relative" title="${tag}"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${col};margin-right:4px;flex-shrink:0"></span>${escapeHtml(i.name)}</button>`;
        }).join("");
      }

      // Show all items on load (or by category)
      if (itemSearchInput && itemCategoryFilter && itemSearchResults) {
        renderItemResults();
        itemSearchInput.addEventListener("input", renderItemResults);
        itemCategoryFilter.addEventListener("change", () => { itemSearchInput.value = ""; renderItemResults(); });
        if (itemSearchClear) itemSearchClear.addEventListener("click", () => { itemSearchInput.value = ""; renderItemResults(); itemSearchInput.focus(); });

        // Delegated click for item pick buttons
        itemSearchResults.addEventListener("click", (e) => {
          const btn = e.target.closest(".item-pick-btn");
          if (!btn) return;
          const name = btn.dataset.itemname;
          el.itemText.value = name;
          el.itemText.focus();
          if (itemSerialInput) itemSerialInput.focus();
        });
      }

      // Add button — builds formatted line from qty + name + serial
      el.addItemBtn.addEventListener("click", () => {
        const name = (el.itemText.value || "").trim();
        if (!name) { toast("Enter an item name first", "warn"); return; }
        const qty = parseInt(itemQtyInput?.value) || 1;
        const serial = (itemSerialInput?.value || "").trim();
        let line = qty + "x " + name;
        if (serial) line += " (SN: " + serial + ")";
        const current = (el.itemsList.value || "").trimEnd();
        el.itemsList.value = current ? current + "\n" + line : line;
        state.itemsList = el.itemsList.value;
        el.itemText.value = "";
        if (itemSerialInput) itemSerialInput.value = "";
        if (itemQtyInput) itemQtyInput.value = "1";
        el.itemText.focus();
        debouncedRenderPreview();
        throttledAutosave();
      });

      // Enter key on serial field triggers Add
      if (itemSerialInput) {
        itemSerialInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter") { e.preventDefault(); el.addItemBtn.click(); }
        });
      }
      // Enter key on item name field moves to serial
      el.itemText.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); if (itemSerialInput) itemSerialInput.focus(); else el.addItemBtn.click(); }
      });
    }

    // Buttons
    if (el.copyBtn) {
      el.copyBtn.addEventListener("click", doCopyPreview);
    }

    if (el.saveDraftBtn) {
      el.saveDraftBtn.addEventListener("click", saveDraft);
    }

    if (el.clearBtn) {
      el.clearBtn.addEventListener("click", () => {
        if (!confirm("Clear all form data and preview?\n\nOfficer details (callsign, unit, signature) will be kept.")) return;
        // Capture officer details before clearing
        const carry = getOfficerCarryOver();
        // Store pre-clear state for undo
        try {
          localStorage.setItem("vicpol_report_undo_state", JSON.stringify(state));
          localStorage.setItem("vicpol_report_undo_charges", JSON.stringify([...selectedChargesSet]));
          localStorage.setItem("vicpol_report_undo_pins", JSON.stringify([...selectedPinsSet]));
        } catch(e) {}
        state = deepClone(INITIAL_STATE);
        selectedChargesSet.clear();
        selectedPinsSet.clear();
        // Clear defects
        _defectHistory.length = 0;
        if (typeof renderSelectedDefectsChips === 'function') renderSelectedDefectsChips();
        // Clear vehicle inspection
        vicType = null;
        vicState = {};
        const vicIdle = document.getElementById('vicIdle');
        const vicWrap = document.getElementById('vicChecklistWrap');
        const vicBanner = document.getElementById('vicOutcomeBanner');
        if (vicIdle) vicIdle.style.display = 'block';
        if (vicWrap) vicWrap.style.display = 'none';
        if (vicBanner) vicBanner.style.display = 'none';
        ['vicVehicleType','vicRego','vicMake','vicColour','vicDriver','vicLocation','vicNotes'].forEach(id => {
          const e = document.getElementById(id); if (e) e.value = '';
        });
        if (el.reportType) state.reportType = el.reportType.value || state.reportType;
        // Restore callsigns from persistent storage (not wiped by Clear)
        state.savedCallsigns = loadCallsignPool();
        // Restore officer carry-over
        applyOfficerCarryOver(carry);
        renderAll();
        // Re-apply carry-over after renderAll (which may overwrite from state)
        applyOfficerCarryOver(carry);
        throttledAutosave();
        toast("Form cleared — officer details kept — click Undo to restore everything", "ok");
        // Show undo button temporarily
        showUndoClear();
      });
    }

    // Undo Clear function
    function showUndoClear() {
      let undoBar = document.getElementById("undoBar");
      if (!undoBar) {
        undoBar = document.createElement("div");
        undoBar.id = "undoBar";
        document.body.appendChild(undoBar);
      }

      undoBar.innerHTML = "";
      undoBar.style.cssText = "position:fixed;bottom:60px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.92);border:1px solid rgba(108,138,255,0.4);padding:10px 16px;border-radius:12px;z-index:1000;display:flex;gap:12px;align-items:center;font-size:13px;box-shadow:0 8px 24px rgba(0,0,0,0.5);animation:cardIn 0.2s ease both";

      const label = document.createElement("span");
      label.textContent = "Form cleared";
      label.style.color = "var(--muted)";

      const btn = document.createElement("button");
      btn.className = "btn";
      btn.textContent = "↩ Undo";
      btn.style.cssText = "background:rgba(108,138,255,0.2);border-color:rgba(108,138,255,0.4);color:var(--accent);font-weight:900";
      btn.addEventListener("click", () => {
        try {
          const saved = localStorage.getItem("vicpol_report_undo_state");
          if (saved) {
            state = deepMerge(deepClone(INITIAL_STATE), unpackStoredValue(saved, {}));
            const savedCharges = JSON.parse(localStorage.getItem("vicpol_report_undo_charges") || "[]");
            const savedPins = JSON.parse(localStorage.getItem("vicpol_report_undo_pins") || "[]");
            selectedChargesSet = new Set(savedCharges);
            selectedPinsSet = new Set(savedPins);
            renderAll();
            renderSelectedCharges();
            renderSelectedPins();
            renderChargeList();
            renderPinList();
            updateSentenceSuggestion();
            throttledAutosave();
            toast("Form restored", "ok");
          }
        } catch(e) {
          toast("Undo failed", "err");
        }
        undoBar.style.display = "none";
        undoBar.innerHTML = "";
      });

      undoBar.appendChild(label);
      undoBar.appendChild(btn);

      clearTimeout(showUndoClear._timer);
      showUndoClear._timer = setTimeout(() => {
        if (undoBar) {
          undoBar.style.display = "none";
          undoBar.innerHTML = "";
        }
      }, 10000);
    }

    if (el.validateBtn) {
      el.validateBtn.addEventListener("click", () => {
        const warnings = validateDraft();
        const qualityHints = getQualityHints();
        const panel = document.getElementById("validationPanel");
        if (!panel) return;
        const totalIssues = warnings.length;
        const hasQuality = qualityHints.length > 0;
        
        if (totalIssues === 0 && !hasQuality) {
          panel.innerHTML = '<div class="validation-panel ok">✓ Looks good — no issues found. Ready to submit. <button class="validation-close-btn" type="button" style="float:right;background:none;border:none;color:inherit;cursor:pointer;font-size:14px;line-height:1;opacity:0.7">✕</button></div>';
          toast("✓ Validation passed", "ok");
        } else {
          let html = '<div class="validation-panel ' + (totalIssues > 0 ? 'issues' : 'ok') + '">';
          html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><span style="font-weight:900;font-size:13px">';
          if (totalIssues > 0) {
            html += '⚠ ' + totalIssues + ' issue' + (totalIssues > 1 ? 's' : '') + ' found';
            if (hasQuality) html += ' + ' + qualityHints.length + ' suggestion' + (qualityHints.length > 1 ? 's' : '');
          } else {
            html += '✓ No missing fields — ' + qualityHints.length + ' suggestion' + (qualityHints.length > 1 ? 's' : '') + ' to improve quality';
          }
          html += '</span><button class="validation-close-btn" type="button" style="background:none;border:none;color:inherit;cursor:pointer;font-size:14px;line-height:1;opacity:0.7;flex-shrink:0">✕</button></div>';
          // Required field warnings
          html += warnings.map(w => '<div class="vi"><span>' + escapeHtml(w) + '</span></div>').join("");
          // Quality hints (amber, different icon)
          if (hasQuality) {
            if (totalIssues > 0) html += '<div style="height:1px;background:var(--border);margin:8px 0"></div>';
            html += qualityHints.map(h => '<div class="vi vi-quality"><span>' + escapeHtml(h) + '</span></div>').join("");
          }
          html += '</div>';
          panel.innerHTML = html;
          if (totalIssues > 0) {
            toast("⚠ " + totalIssues + " issue" + (totalIssues > 1 ? "s" : "") + (hasQuality ? " + " + qualityHints.length + " suggestion" + (qualityHints.length > 1 ? "s" : "") : ""), "warn");
          } else {
            toast("💡 " + qualityHints.length + " suggestion" + (qualityHints.length > 1 ? "s" : "") + " to improve report", "ok");
          }
        }
      });
    }

    // Edit Preview toggle
    window._editPreviewMode = false;
    const editPreviewBtn = document.getElementById('editPreviewBtn');
    if (editPreviewBtn && el.preview) {
      editPreviewBtn.addEventListener('click', () => {
        window._editPreviewMode = !window._editPreviewMode;
        el.preview.contentEditable = window._editPreviewMode ? 'true' : 'false';
        el.preview.style.outline = window._editPreviewMode ? '2px solid var(--accent)' : '';
        el.preview.style.outlineOffset = window._editPreviewMode ? '2px' : '';
        editPreviewBtn.textContent = window._editPreviewMode ? '✓ Done Editing' : '✏ Edit';
        editPreviewBtn.style.background = window._editPreviewMode ? 'rgba(100,200,120,0.18)' : '';
        editPreviewBtn.style.borderColor = window._editPreviewMode ? 'rgba(100,200,120,0.4)' : '';
        if (window._editPreviewMode) {
          el.preview.focus();
          toast('Preview is now editable — auto-update paused', 'ok');
        } else {
          toast('Edit mode off — auto-update resumed', 'ok');
        }
      });
    }

    if (el.fillQuestionsBtn) {
      el.fillQuestionsBtn.addEventListener("click", fillDefaultQuestions);
    }

    const useBailAmountBtn = document.getElementById('useBailAmountBtn');
    if (useBailAmountBtn) {
      useBailAmountBtn.addEventListener("click", useBailAmount);
    }

    // Bail calculator checkboxes
    const bcOrgMember = document.getElementById('bcOrgMember');
    const bcViolence = document.getElementById('bcViolence');
    const bcFPO = document.getElementById('bcFPO');
    
    if (bcOrgMember) bcOrgMember.addEventListener('change', () => { state.bailConditions.orgMember = bcOrgMember.checked; calculateBailAmount(); throttledAutosave(); });
    if (bcViolence) bcViolence.addEventListener('change', () => { state.bailConditions.violence = bcViolence.checked; calculateBailAmount(); throttledAutosave(); });
    if (bcFPO) bcFPO.addEventListener('change', () => { state.bailConditions.fpo = bcFPO.checked; calculateBailAmount(); throttledAutosave(); });

    // ============================================================================
    // EVENT HANDLERS
    // ============================================================================

    // Templates modal
    const presetsBtn = document.getElementById("presetsBtn");
    if (presetsBtn) presetsBtn.addEventListener("click", openPresetModal);
    const presetCloseBtn = document.getElementById("presetCloseBtn");
    if (presetCloseBtn) presetCloseBtn.addEventListener("click", closePresetModal);
    const presetSaveBtn = document.getElementById("presetSaveBtn");
    if (presetSaveBtn) presetSaveBtn.addEventListener("click", saveCurrentPreset);
    const presetApplyBtn = document.getElementById("presetApplyBtn");
    if (presetApplyBtn) presetApplyBtn.addEventListener("click", applyPresetToForm);
    // Close preset modal on backdrop click
    const presetOverlay = document.getElementById("presetModalOverlay");
    if (presetOverlay) {
      presetOverlay.addEventListener("click", (e) => {
        if (e.target === presetOverlay) closePresetModal();
      });
    }

    // "Same as report" button for preliminary details
    const sameAsReportBtn = document.getElementById("sameAsReportBtn");
    if (sameAsReportBtn) {
      sameAsReportBtn.addEventListener("click", () => {
        const dt = norm(state.reportDateTime);
        if (!dt) { toast("Fill report date/time first", "warn"); return; }
        // Parse "DD/MM/YYYY HH:MM HRS" format
        const match = dt.match(/^(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.+)$/);
        if (match) {
          if (el.prelimDate) { el.prelimDate.value = match[1]; state.prelimDate = match[1]; }
          if (el.prelimTime) { el.prelimTime.value = match[2]; state.prelimTime = match[2]; }
        } else {
          // Just put the whole string in time
          if (el.prelimTime) { el.prelimTime.value = dt; state.prelimTime = dt; }
        }
        debouncedRenderPreview();
        throttledAutosave();
        toast("Prelim date/time synced from report header", "ok");
      });
    }

    // DOB live validation on blur
    if (el.offenderDOB) {
      el.offenderDOB.addEventListener("blur", () => {
        const err = VALIDATORS.dob(el.offenderDOB.value);
        showFieldError("offenderDOB", "dobError", err);
      });
      el.offenderDOB.addEventListener("input", () => {
        // Clear error as they type
        showFieldError("offenderDOB", "dobError", null);
      });
    }

    // Keyboard navigation for charge search (arrow keys + enter)
    if (el.chargeSearch) {
      let _chargeNavIdx = -1;
      el.chargeSearch.addEventListener("keydown", (e) => {
        const items = el.chargeList?.querySelectorAll("[data-charge-name]");
        if (!items || !items.length) return;
        if (e.key === "ArrowDown") {
          e.preventDefault();
          _chargeNavIdx = Math.min(_chargeNavIdx + 1, items.length - 1);
          items.forEach((it, i) => it.classList.toggle("charge-item-highlight", i === _chargeNavIdx));
          items[_chargeNavIdx]?.scrollIntoView({ block: "nearest" });
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          _chargeNavIdx = Math.max(_chargeNavIdx - 1, 0);
          items.forEach((it, i) => it.classList.toggle("charge-item-highlight", i === _chargeNavIdx));
          items[_chargeNavIdx]?.scrollIntoView({ block: "nearest" });
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (_chargeNavIdx >= 0 && items[_chargeNavIdx]) {
            const name = items[_chargeNavIdx].getAttribute("data-charge-name");
            if (name) toggleCharge(name);
          }
          _chargeNavIdx = -1;
          items.forEach(it => it.classList.remove("charge-item-highlight"));
        } else {
          _chargeNavIdx = -1;
          items.forEach(it => it.classList.remove("charge-item-highlight"));
        }
      });
    }

    // Keyboard navigation for PIN search
    if (el.pinSearch) {
      let _pinNavIdx = -1;
      el.pinSearch.addEventListener("keydown", (e) => {
        const items = el.pinList?.querySelectorAll("[data-pin-name]");
        if (!items || !items.length) return;
        if (e.key === "ArrowDown") {
          e.preventDefault();
          _pinNavIdx = Math.min(_pinNavIdx + 1, items.length - 1);
          items.forEach((it, i) => it.classList.toggle("charge-item-highlight", i === _pinNavIdx));
          items[_pinNavIdx]?.scrollIntoView({ block: "nearest" });
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          _pinNavIdx = Math.max(_pinNavIdx - 1, 0);
          items.forEach((it, i) => it.classList.toggle("charge-item-highlight", i === _pinNavIdx));
          items[_pinNavIdx]?.scrollIntoView({ block: "nearest" });
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (_pinNavIdx >= 0 && items[_pinNavIdx]) {
            const name = items[_pinNavIdx].getAttribute("data-pin-name");
            if (name) togglePin(name);
          }
          _pinNavIdx = -1;
          items.forEach(it => it.classList.remove("charge-item-highlight"));
        } else {
          _pinNavIdx = -1;
          items.forEach(it => it.classList.remove("charge-item-highlight"));
        }
      });
    }
    // ============================================================================
    // END v47 EVENT HANDLERS
    // ============================================================================
    // Charge & PIN Event Listeners
    if (el.chargeSearch) {
      el.chargeSearch.addEventListener("input", renderChargeList);
    }
    
    if (el.chargeFilter) {
      el.chargeFilter.addEventListener("change", renderChargeList);
    }
    
    if (el.clearChargesBtn) {
      el.clearChargesBtn.addEventListener("click", () => {
        selectedChargesSet.clear();
        renderSelectedCharges();
        renderChargeList();
        updateSentenceSuggestion();
        state.chargesList = "";
        debouncedRenderPreview();
        throttledAutosave();
      });
    }
    
    if (el.pinSearch) {
      el.pinSearch.addEventListener("input", renderPinList);
    }
    
    if (el.pinFilter) {
      el.pinFilter.addEventListener("change", renderPinList);
    }
    
    if (el.clearPinsBtn) {
      el.clearPinsBtn.addEventListener("click", () => {
        selectedPinsSet.clear();
        renderSelectedPins();
        renderPinList();
        state.pinsList = "";
        updateLicenseWarning();
        debouncedRenderPreview();
        throttledAutosave();
      });
    }

    // Current demerit points input
    const demeritInput = document.getElementById("currentDemeritPoints");
    if (demeritInput) {
      demeritInput.value = state.currentDemeritPoints || 0;
      demeritInput.addEventListener("input", () => {
        state.currentDemeritPoints = parseInt(demeritInput.value) || 0;
        updateLicenseWarning();
        throttledAutosave();
      });
    }

    
    // OCR Events
    if (el.pasteZone) {
      el.pasteZone.addEventListener("click", () => {
        el.pasteZone.focus();
        if (el.imgFile) el.imgFile.click();
      });

      el.pasteZone.addEventListener("paste", (e) => {
        const item = [...e.clipboardData.items].find(i => i.type.startsWith("image/"));
        if (item) {
          e.preventDefault();
          const file = item.getAsFile();
          ocrLab.blob = file;
          const src = document.getElementById('ocrLabSourcePreview');
          if (src) { src.src = URL.createObjectURL(file); src.style.display = 'block'; }
          const grid = document.getElementById('ocrLabResultsGrid');
          const hint = document.getElementById('ocrNoResultsHint');
          if (grid) grid.style.display = 'grid';
          if (hint) hint.style.display = 'none';
          runOcrLabScan(file, { autoApply: true });
        }
      });

      el.pasteZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        el.pasteZone.style.outline = "2px dashed rgba(255,255,255,0.35)";
        el.pasteZone.style.outlineOffset = "6px";
      });

      el.pasteZone.addEventListener("dragleave", () => {
        el.pasteZone.style.outline = "none";
        el.pasteZone.style.outlineOffset = "0";
      });

      el.pasteZone.addEventListener("drop", (e) => {
        e.preventDefault();
        el.pasteZone.style.outline = "none";
        el.pasteZone.style.outlineOffset = "0";
        const file = [...(e.dataTransfer?.files || [])].find(f => f.type && f.type.startsWith("image/"));
        if (file) {
          ocrLab.blob = file;
          const src = document.getElementById('ocrLabSourcePreview');
          if (src) { src.src = URL.createObjectURL(file); src.style.display = 'block'; }
          const grid = document.getElementById('ocrLabResultsGrid');
          const hint = document.getElementById('ocrNoResultsHint');
          if (grid) grid.style.display = 'grid';
          if (hint) hint.style.display = 'none';
          runOcrLabScan(file, { autoApply: true });
        }
      });
    }

    if (el.imgFile) {
      el.imgFile.addEventListener("change", () => {
        const file = el.imgFile.files[0];
        if (!file) return;
        ocrLab.blob = file;
        const src = document.getElementById('ocrLabSourcePreview');
        if (src) { src.src = URL.createObjectURL(file); src.style.display = 'block'; }
        const grid = document.getElementById('ocrLabResultsGrid');
        const hint = document.getElementById('ocrNoResultsHint');
        if (grid) grid.style.display = 'grid';
        if (hint) hint.style.display = 'none';
        runOcrLabScan(file, { autoApply: true });
      });
    }

    if (el.clearOcrBtn) {
      el.clearOcrBtn.addEventListener("click", () => {
        state.ocrText = "";
        if (el.ocrText) el.ocrText.value = "";
        if (el.ocrStatus) { el.ocrStatus.value = "Ready — load an image to begin"; el.ocrStatus.style.color = ""; }
        if (el.imgFile) el.imgFile.value = "";
        if (typeof clearOcrLab === 'function') clearOcrLab();
        toast("OCR cleared", "ok");
      });
    }

    if (el.ocrWeaponsOnly) {
      el.ocrWeaponsOnly.addEventListener("change", () => {
        state.ocrWeaponsOnly = !!el.ocrWeaponsOnly.checked;
        const modeSelect = document.getElementById('ocrLabMode');
        if (modeSelect && el.ocrWeaponsOnly.checked) modeSelect.value = 'weapons';
        else if (modeSelect) modeSelect.value = 'auto';
        if (el.ocrStatus) {
          el.ocrStatus.value = el.ocrWeaponsOnly.checked ? "Weapons & Contraband mode — load image to scan" : "Ready — load an image to begin";
          el.ocrStatus.style.color = el.ocrWeaponsOnly.checked ? "rgba(255,160,80,0.95)" : "";
        }
        throttledAutosave();
      });
    }
    if (el.ocrText) {
      el.ocrText.addEventListener("input", () => {
        const raw = el.ocrText.value || "";
        state.ocrText = raw;
        if (!raw.trim()) return;
        const p = parseOCR(raw);
        if (!p) return;
        applyParsedOcrBundleToReport(p, raw, 'all');
      });
    }

  }

  // Render All
  function renderAll() {
    sanitizeVicPolState(false);
    // Populate fields from state
    if (el.reportType) el.reportType.value = state.reportType;
    if (el.enteredBy) el.enteredBy.value = state.enteredBy || "";
    if (el.reportDateTime) el.reportDateTime.value = state.reportDateTime || "";
    if (el.enteredUnit) el.enteredUnit.value = state.enteredUnit || "";
    if (el.offenderName) el.offenderName.value = state.offender.name;
    if (el.offenderDOB) el.offenderDOB.value = state.offender.dob;
    if (el.offenderSex) el.offenderSex.value = state.offender.sex;
    if (el.offenderAddress) el.offenderAddress.value = state.offender.address;
    if (el.offenderPhone) el.offenderPhone.value = state.offender.phone;
    if (el.officersList) el.officersList.value = state.officersList;
    renderOfficerTags();
    if (el.itemsList) el.itemsList.value = state.itemsList;
    // Restore selected charges/PINs from state
    if (state.chargesList) {
      selectedChargesSet = new Set(state.chargesList.split('\n').map(s => s.trim()).filter(Boolean));
    } else {
      selectedChargesSet.clear();
    }
    if (state.pinsList) {
      selectedPinsSet = new Set(state.pinsList.split('\n').map(s => s.trim()).filter(Boolean));
    } else {
      selectedPinsSet.clear();
    }
    renderSelectedCharges();
    renderSelectedPins();
    renderChargeList();
    renderPinList();
    if (el.ocrWeaponsOnly) {
      el.ocrWeaponsOnly.checked = !!state.ocrWeaponsOnly;
      if (el.ocrStatus) {
        el.ocrStatus.value = state.ocrWeaponsOnly ? "⚠ Weapons & Contraband mode active" : "OCR idle";
        el.ocrStatus.style.color = state.ocrWeaponsOnly ? "rgba(255,160,80,0.95)" : "";
      }
    }
    if (el.ocrText) el.ocrText.value = state.ocrText || "";

    // Restore evidenceItems array from state so evidence list panel is repopulated
    if (state.evidence) {
      evidenceItems = state.evidence.split('\n').map(s => s.trim()).filter(Boolean);
    } else {
      evidenceItems = [];
    }

    // Traffic Warrant
    if (state.trafficWarrant) {
      const tw = state.trafficWarrant;
      if (el.twRego) el.twRego.value = tw.rego || "";
      if (el.twModel) el.twModel.value = tw.model || "";
      if (el.twColour) el.twColour.value = tw.colour || "";
      if (el.twRegistered) el.twRegistered.value = tw.registered || "";
      if (el.twRegoExpires) el.twRegoExpires.value = tw.regoExpires || "";
      if (el.twStolen) el.twStolen.value = tw.stolen || "NO";
      if (el.twSuspended) el.twSuspended.value = tw.suspended || "NO";
      if (el.twOwner) el.twOwner.value = tw.owner || "";
      if (el.twLocation) el.twLocation.value = tw.location || "";
      if (el.twTime) el.twTime.value = tw.time || "";
      if (el.twDate) el.twDate.value = tw.date || "";
      if (el.twSpeed) el.twSpeed.value = tw.speed || "";
      if (el.twSuspHours) el.twSuspHours.value = tw.suspHours || "";
      if (el.twImpoundDays) el.twImpoundDays.value = tw.impoundDays || "";
      if (el.twFineAmount) el.twFineAmount.value = tw.fineAmount || "";
      if (el.twApprovedBy) el.twApprovedBy.value = tw.approvedBy || "";
      if (el.twReason) el.twReason.value = tw.reason || "";
      if (el.twActions) el.twActions.value = tw.actions || "";
      if (el.twLegNotes) el.twLegNotes.value = tw.legNotes || "";
      const _twFI = document.getElementById("twFailedIntercept");
      if (_twFI) _twFI.checked = !!tw.failedIntercept;
      const _twMP = document.getElementById("twMelroadsPaste");
      if (_twMP) _twMP.value = "";
      if (tw.impoundNum) {
        applyTrafficImpoundSelection(tw.impoundNum, { updateState: false });
      } else {
        const _twIN = document.getElementById("twImpoundNum");
        const _twII = document.getElementById("twImpoundInfo");
        if (_twIN) _twIN.value = "";
        if (_twII) { _twII.textContent = "Select an offence number"; _twII.style.color = "var(--muted)"; }
      }
    }

    // Shared warrant fields
    if (state.vicpolWarrant) {
      const sw = state.vicpolWarrant;
      if (el.swIdStatus) el.swIdStatus.value = sw.idStatus || "UNCONFIRMED";
      if (el.swWarrantName) el.swWarrantName.value = sw.warrantName || "";
      if (el.swPaste) el.swPaste.value = sw.paste || "";
      if (el.swRego) el.swRego.value = sw.rego || "";
      if (el.swModel) el.swModel.value = sw.model || "";
      if (el.swColour) el.swColour.value = sw.colour || "";
      if (el.swRegistered) el.swRegistered.value = sw.registered || "";
      if (el.swRegoExpires) el.swRegoExpires.value = sw.regoExpires || "";
      if (el.swStolen) el.swStolen.value = sw.stolen || "NO";
      if (el.swSuspended) el.swSuspended.value = sw.suspended || "NO";
      if (el.swOwner) el.swOwner.value = sw.owner || "";
      if (el.swInstruction) el.swInstruction.value = sw.instruction || "";
    }


    // Bail Conditions
    if (state.bailConditions) {
      const bc = state.bailConditions;
      if (el.bcBailAmount) el.bcBailAmount.value = bc.bailAmount || "";
      if (el.bcDate) el.bcDate.value = bc.date || "";
      if (el.bcTime) el.bcTime.value = bc.time || "";
      if (el.bcLeapHistory) el.bcLeapHistory.value = bc.leapHistory || "";
      const bcOrgMemberEl = document.getElementById('bcOrgMember');
      const bcViolenceEl = document.getElementById('bcViolence');
      const bcFPOEl = document.getElementById('bcFPO');
      if (bcOrgMemberEl) bcOrgMemberEl.checked = !!bc.orgMember;
      if (bcViolenceEl) bcViolenceEl.checked = !!bc.violence;
      if (bcFPOEl) bcFPOEl.checked = !!bc.fpo;
      calculateBailAmount();
    }

    // Field Contact
    if (state.fieldContact) {
      const fc = state.fieldContact;
      if (el.fcName) el.fcName.value = fc.name || "";
      if (el.fcDOB) el.fcDOB.value = fc.dob || "";
      if (el.fcPhone) el.fcPhone.value = fc.phone || "";
      if (el.fcTime) el.fcTime.value = fc.time || "";
      if (el.fcDate) el.fcDate.value = fc.date || "";
      if (el.fcLocation) el.fcLocation.value = fc.location || "";
      if (el.fcReason) el.fcReason.value = fc.reason || "";
      if (el.fcSummary) el.fcSummary.value = fc.summary || "";
      if (el.fcNotes) el.fcNotes.value = fc.notes || "";
    }

    // Search & Seizure
    if (state.searchSeizure) {
      const ss = state.searchSeizure;
      if (el.ssName) el.ssName.value = ss.name || "";
      if (el.ssDOB) el.ssDOB.value = ss.dob || "";
      if (el.ssPhone) el.ssPhone.value = ss.phone || "";
      if (el.ssTime) el.ssTime.value = ss.time || "";
      if (el.ssDate) el.ssDate.value = ss.date || "";
      if (el.ssLocation) el.ssLocation.value = ss.location || "";
      if (el.ssAuthority) el.ssAuthority.value = ss.authority || "";
      if (el.ssReason) el.ssReason.value = ss.reason || "";
      if (el.ssSummary) el.ssSummary.value = ss.summary || "";
      if (el.ssNotes) el.ssNotes.value = ss.notes || "";
    }

    // Vehicle Inspection
    if (state.vehicleInspection) {
      const vi = state.vehicleInspection;
      const viTypeEl = document.getElementById('vicVehicleType');
      const viRegoEl = document.getElementById('vicRego');
      const viMakeEl = document.getElementById('vicMake');
      const viColourEl = document.getElementById('vicColour');
      const viDriverEl = document.getElementById('vicDriver');
      const viLocationEl = document.getElementById('vicLocation');
      const viNotesEl = document.getElementById('vicNotes');
      if (viTypeEl) viTypeEl.value = vi.vehicleType || "";
      if (viRegoEl) viRegoEl.value = vi.rego || "";
      if (viMakeEl) viMakeEl.value = vi.make || "";
      if (viColourEl) viColourEl.value = vi.colour || "";
      if (viDriverEl) viDriverEl.value = vi.driver || "";
      if (viLocationEl) viLocationEl.value = vi.location || "";
      if (viNotesEl) viNotesEl.value = vi.notes || "";
      if (vi.vehicleType) {
        vicLoadChecklist(vi.vehicleType, vi.checklistState || {});
      } else {
        resetVehicleInspectionSection(true);
      }
    }

    // Narrative
    // Preliminary details
    if (el.prelimTime) el.prelimTime.value = state.prelimTime || "";
    if (el.prelimDate) el.prelimDate.value = state.prelimDate || "";
    if (el.prelimLocation) el.prelimLocation.value = state.prelimLocation || "";
    if (el.summary) el.summary.value = state.summary;
    if (el.evidence) el.evidence.value = state.evidence;
    // Restore evidence items array from state so add/remove buttons work after draft load
    evidenceItems.length = 0;
    if (state.evidence) {
      ensureLines(state.evidence).split("\n").filter(Boolean).forEach(l => evidenceItems.push(l));
    }
    const evidenceListEl = document.getElementById('evidenceList');
    if (evidenceListEl) {
      evidenceListEl.innerHTML = evidenceItems.map((item, idx) => {
        const qtyMatch = item.match(/^(\d+)\s*x\s+(.+)$/i);
        const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
        const text = qtyMatch ? qtyMatch[2] : item;
        return `<div class="evidence-row">
          <input type="number" class="ev-qty-edit" data-ev-qty="${idx}" value="${qty}" min="1" max="50000" title="Quantity"/>
          <span style="font-size:11px;color:var(--muted)">x</span>
          <span class="ev-text">${escapeHtml(text)}</span>
          <button class="btn" data-remove-evidence="${idx}" style="padding:6px 10px; font-size:11px">Remove</button>
        </div>`;
      }).join('');
    }
    if (el.interviewQs) el.interviewQs.value = state.interviewQs;

    // Sentence & Sig
    if (el.sentence) el.sentence.value = state.sentence;
    if (el.sentenceApproval) el.sentenceApproval.value = state.sentenceApproval || "";
    if (el.victims) el.victims.value = state.victims || "";
    if (el.evidenceLocker) el.evidenceLocker.value = state.evidenceLocker;
    if (el.sigName) el.sigName.value = state.sigName;
    if (el.sigRank) el.sigRank.value = state.sigRank;
    if (el.sigDivision) el.sigDivision.value = state.sigDivision;

    // Callsigns — always sync from persistent storage
    if (!state.officerCallsigns) state.officerCallsigns = {};
    state.savedCallsigns = loadCallsignPool();
    renderCallsignTags();

    // Demerit points input
    const demeritInput = document.getElementById("currentDemeritPoints");
    if (demeritInput) demeritInput.value = state.currentDemeritPoints || 0;

    updateReportTypeUI();
    renderDrafts();
    updateLicenseWarning();
    updateSentenceSuggestion();
    updateNarrativeHints();
    applyExcludedClasses();
    debouncedRenderPreview();
  }

  // Expose functions for inline onclick
  window.loadDraft = loadDraft;
  window.deleteDraft = deleteDraft;

  // ============================================================================
  // OFFENDER AUTOCOMPLETE + LOCAL PERSONS DATABASE
  // ============================================================================
  const PERSONS_KEY = "vicpol_report_persons_db";
  const PERSONS_MAX = 300;
  function loadPersonsDB() { try { return JSON.parse(localStorage.getItem(PERSONS_KEY)||"[]"); } catch(e) { return []; } }
  function savePersonsDB(arr) { safeLocalStorageSet(PERSONS_KEY, JSON.stringify(arr.slice(0,PERSONS_MAX))); }
  function upsertPerson(person) {
    if (!person || !person.name || person.name.trim().length < 2) return;
    const arr = loadPersonsDB();
    const key = person.name.trim().toUpperCase();
    const idx = arr.findIndex(p => (p.name || "").trim().toUpperCase() === key);
    const existing = idx >= 0 ? arr[idx] : null;
    const record = {
      name: person.name.trim(),
      dob: norm(person.dob) || norm(existing?.dob) || "",
      sex: norm(person.sex) || norm(existing?.sex) || "",
      address: norm(person.address) || norm(existing?.address) || "",
      phone: norm(person.phone) || norm(existing?.phone) || "",
      source: norm(person.source) || norm(existing?.source) || "",
      ts: Date.now()
    };
    if (idx >= 0) {
      arr[idx] = record;
    } else {
      arr.unshift(record);
    }
    arr.sort((a,b)=>(b.ts||0)-(a.ts||0));
    savePersonsDB(arr);
    updatePersonsBadge();
  }
  function deletePerson(nameKey) {
    const arr = loadPersonsDB();
    const key = (nameKey||"").trim().toUpperCase();
    const filtered = arr.filter(p => p.name.trim().toUpperCase() !== key);
    savePersonsDB(filtered);
    updatePersonsBadge();
  }
  function updatePersonsBadge() {
    const badge=document.getElementById("savedPersonsBadge"); if(!badge) return;
    const n=loadPersonsDB().length; badge.textContent=n+" saved"; badge.style.display=n?"inline":"none";
  }
  function closeAllDropdowns() {
    document.querySelectorAll(".ac-drop").forEach(d=>{
      d.style.display="none";
      d.innerHTML="";
      d.removeAttribute("data-active");
      d.dataset.hovering = "0";
      const wrap = d.closest(".ac-wrap");
      if (wrap) {
        wrap.classList.remove("ac-open");
        wrap.style.zIndex = "";
        const input = wrap.querySelector('input[role="combobox"]');
        if (input) input.setAttribute('aria-expanded', 'false');
        const parent = wrap.parentElement;
        if (parent && parent.dataset.acRaised === "1") {
          parent.style.zIndex = parent.dataset.prevZIndex || "";
          delete parent.dataset.prevZIndex;
          delete parent.dataset.acRaised;
        }
      }
    });
  }
  function renderDrop(dropEl,items,onSelect,onDelete) {
    dropEl.innerHTML=""; dropEl.removeAttribute("data-active");
    const wrap = dropEl.closest(".ac-wrap");
    if (wrap) {
      wrap.classList.add("ac-open");
      wrap.style.zIndex = "250000";
      const input = wrap.querySelector('input[role="combobox"]');
      if (input) input.setAttribute('aria-expanded', 'true');
      const parent = wrap.parentElement;
      if (parent && parent.style) {
        if (parent.dataset.acRaised !== "1") {
          parent.dataset.prevZIndex = parent.style.zIndex || "";
        }
        parent.style.zIndex = "250000";
        parent.dataset.acRaised = "1";
      }
    }
    dropEl.dataset.hovering = "0";
    if(!items.length){const empty=document.createElement("div");empty.className="ac-empty";empty.textContent="No matches";dropEl.appendChild(empty);dropEl.style.display="block";return;}
    items.forEach((item,i)=>{
      const row=document.createElement("div"); row.className="ac-item"; row.setAttribute("role","option");
      const left=document.createElement("div"); left.style.cssText="min-width:0;overflow:hidden";
      const main=document.createElement("div"); main.className="ac-item-main"; main.textContent=item.main; left.appendChild(main);
      if(item.sub){const sub=document.createElement("div");sub.className="ac-item-sub";sub.textContent=item.sub;left.appendChild(sub);}
      row.appendChild(left);
      const selectItem = e => {e.preventDefault();e.stopPropagation();onSelect(item);closeAllDropdowns();};
      row.addEventListener("pointerdown", selectItem);
      row.addEventListener("click", selectItem);
      row.addEventListener("mousedown",e=>{e.preventDefault();e.stopPropagation();});
      dropEl.appendChild(row);
    });
    dropEl.addEventListener("mouseenter", () => { dropEl.dataset.hovering = "1"; });
    dropEl.addEventListener("mouseleave", () => { dropEl.dataset.hovering = "0"; });
    dropEl.style.display="block";
  }
  function fillPersonFields(prefix, person) {
    if (!person) return;
    const map = {
      offender: {
        name: ['offenderName', 'offender', 'name'],
        dob: ['offenderDOB', 'offender', 'dob'],
        sex: ['offenderSex', 'offender', 'sex'],
        address: ['offenderAddress', 'offender', 'address'],
        phone: ['offenderPhone', 'offender', 'phone']
      },
      fc: {
        name: ['fcName', 'fieldContact', 'name'],
        dob: ['fcDOB', 'fieldContact', 'dob'],
        phone: ['fcPhone', 'fieldContact', 'phone']
      },
      ss: {
        name: ['ssName', 'searchSeizure', 'name'],
        dob: ['ssDOB', 'searchSeizure', 'dob'],
        phone: ['ssPhone', 'searchSeizure', 'phone']
      }
    };
    const spec = map[prefix];
    if (!spec) return;
    Object.entries(spec).forEach(([field, cfg]) => {
      const [elKey, stateKey, prop] = cfg;
      if (el[elKey]) el[elKey].value = person[field] || '';
      if (state[stateKey]) state[stateKey][prop] = person[field] || '';
    });
    debouncedRenderPreview();
    throttledAutosave();
  }

  function buildSharedPersonFromPrefix(prefix) {
    if (prefix === 'offender') {
      return {
        name: norm(state.offender?.name),
        dob: norm(state.offender?.dob),
        sex: norm(state.offender?.sex),
        address: norm(state.offender?.address),
        phone: norm(state.offender?.phone),
        source: 'Offender / Subject'
      };
    }
    if (prefix === 'fc') {
      return {
        name: norm(state.fieldContact?.name),
        dob: norm(state.fieldContact?.dob),
        phone: norm(state.fieldContact?.phone),
        source: 'Field Contact'
      };
    }
    if (prefix === 'ss') {
      return {
        name: norm(state.searchSeizure?.name),
        dob: norm(state.searchSeizure?.dob),
        phone: norm(state.searchSeizure?.phone),
        source: 'Search & Seizure'
      };
    }
    return null;
  }

  function maybeSaveSharedPerson(prefix) {
    const person = buildSharedPersonFromPrefix(prefix);
    if (!person || !person.name || person.name.length < 2) return;
    upsertPerson(person);
  }

  function setupSharedPeopleAutocomplete(prefix, fieldConfigs) {
    fieldConfigs.forEach(cfg => {
      const input = el[cfg.inputKey];
      const drop = document.getElementById(cfg.dropId);
      if (!input || !drop) return;
      makeFieldAC(input, drop,
        val => {
          const q = val.trim().toUpperCase();
          const people = loadPersonsDB();
          if (!q) return people.slice(0, 8);
          return people.filter(p => {
            const source = norm(p.source).toUpperCase();
            return (cfg.matchers || []).some(fn => fn(p, q, source));
          }).slice(0, 8);
        },
        p => ({
          main: cfg.main(p),
          sub: cfg.sub(p),
          person: p
        }),
        item => fillPersonFields(prefix, item.person),
        item => deletePerson(item.person.name)
      );
      input.addEventListener('blur', () => {
        setTimeout(() => maybeSaveSharedPerson(prefix), 200);
      });
    });
  }

  function fillOffenderFields(person) {
    fillPersonFields('offender', person);
  }
  function makeFieldAC(input,drop,getResults,toItem,onSelect,onDelete) {
    if(!input||!drop) return;
    const wrap = input.closest(".ac-wrap");
    let closeTimer = null;

    function cancelClose() {
      if (closeTimer) {
        clearTimeout(closeTimer);
        closeTimer = null;
      }
    }

    function scheduleClose(delay = 15900) {
      cancelClose();
      closeTimer = setTimeout(() => {
        const active = document.activeElement;
        const wrapHovered = !!(wrap && wrap.matches(":hover"));
        const dropHovered = !!(drop && drop.matches(":hover"));
        const wrapFocused = !!(wrap && active && wrap.contains(active));
        const dropFocused = !!(active && drop.contains(active));
        if (!wrapHovered && !dropHovered && !wrapFocused && !dropFocused) {
          closeAllDropdowns();
        }
      }, delay);
    }

    function show(val) {
      cancelClose();
      const results=getResults(val);
      if(!results.length){closeAllDropdowns();return;}
      renderDrop(drop,results.map(toItem),onSelect,item=>{
        onDelete(item);
        const r2=getResults(input.value);
        if(r2.length) renderDrop(drop,r2.map(toItem),onSelect,it2=>onDelete(it2));
        else closeAllDropdowns();
      });
    }

    if (wrap) {
      wrap.addEventListener("mouseenter", cancelClose);
      wrap.addEventListener("mouseleave", () => {
        if (document.activeElement !== input) scheduleClose(15250);
      });
    }
    drop.addEventListener("mouseenter", cancelClose);
    drop.addEventListener("mouseleave", () => {
      if (document.activeElement !== input) scheduleClose(10250);
    });

    input.addEventListener("input",()=>show(input.value));
    input.addEventListener("focus",()=>{cancelClose(); if(!input.value.trim())show("");else show(input.value);});
    input.addEventListener("blur",()=>scheduleClose(16200));
    input.addEventListener("keydown",e=>{
      if(drop.style.display==="none") return;
      const items=drop.querySelectorAll(".ac-item"); if(!items.length) return;
      let idx=parseInt(drop.getAttribute("data-active")||"-1");
      if(e.key==="ArrowDown"){e.preventDefault();idx=Math.min(idx+1,items.length-1);}
      else if(e.key==="ArrowUp"){e.preventDefault();idx=Math.max(idx-1,-1);}
      else if(e.key==="Enter"&&idx>=0){e.preventDefault();items[idx].dispatchEvent(new MouseEvent("click",{bubbles:true}));return;}
      else if(e.key==="Escape"){cancelClose(); closeAllDropdowns();return;}
      drop.setAttribute("data-active",idx);
      items.forEach((it,i)=>it.classList.toggle("ac-active",i===idx));
    });
  }
  function setupOffenderAutocomplete() {
    setupSharedPeopleAutocomplete('offender', [
      {
        inputKey: 'offenderName',
        dropId: 'acName',
        matchers: [
          (p, q) => norm(p.name).toUpperCase().includes(q),
          (p, q) => norm(p.address).toUpperCase().includes(q),
          (p, q) => norm(p.phone).includes(q)
        ],
        main: p => p.name,
        sub: p => [p.dob, p.address, p.phone, p.source].filter(Boolean).join('  |  ')
      },
      {
        inputKey: 'offenderDOB',
        dropId: 'acDOB',
        matchers: [(p, q) => norm(p.dob).startsWith(q)],
        main: p => p.dob,
        sub: p => [p.name, p.source].filter(Boolean).join('  |  ')
      },
      {
        inputKey: 'offenderAddress',
        dropId: 'acAddress',
        matchers: [(p, q) => norm(p.address).toUpperCase().includes(q), (p, q) => norm(p.name).toUpperCase().includes(q)],
        main: p => p.address || p.name,
        sub: p => [p.name, p.phone, p.source].filter(Boolean).join('  |  ')
      },
      {
        inputKey: 'offenderPhone',
        dropId: 'acPhone',
        matchers: [(p, q) => norm(p.phone).includes(q), (p, q) => norm(p.name).toUpperCase().includes(q)],
        main: p => p.phone || p.name,
        sub: p => [p.name, p.dob, p.source].filter(Boolean).join('  |  ')
      }
    ]);

    setupSharedPeopleAutocomplete('fc', [
      {
        inputKey: 'fcName',
        dropId: 'acFcName',
        matchers: [(p, q) => norm(p.name).toUpperCase().includes(q), (p, q) => norm(p.phone).includes(q)],
        main: p => p.name,
        sub: p => [p.dob, p.phone, p.source].filter(Boolean).join('  |  ')
      },
      {
        inputKey: 'fcDOB',
        dropId: 'acFcDOB',
        matchers: [(p, q) => norm(p.dob).startsWith(q)],
        main: p => p.dob || p.name,
        sub: p => [p.name, p.source].filter(Boolean).join('  |  ')
      },
      {
        inputKey: 'fcPhone',
        dropId: 'acFcPhone',
        matchers: [(p, q) => norm(p.phone).includes(q), (p, q) => norm(p.name).toUpperCase().includes(q)],
        main: p => p.phone || p.name,
        sub: p => [p.name, p.dob, p.source].filter(Boolean).join('  |  ')
      }
    ]);

    setupSharedPeopleAutocomplete('ss', [
      {
        inputKey: 'ssName',
        dropId: 'acSsName',
        matchers: [(p, q) => norm(p.name).toUpperCase().includes(q), (p, q) => norm(p.phone).includes(q)],
        main: p => p.name,
        sub: p => [p.dob, p.phone, p.source].filter(Boolean).join('  |  ')
      },
      {
        inputKey: 'ssDOB',
        dropId: 'acSsDOB',
        matchers: [(p, q) => norm(p.dob).startsWith(q)],
        main: p => p.dob || p.name,
        sub: p => [p.name, p.source].filter(Boolean).join('  |  ')
      },
      {
        inputKey: 'ssPhone',
        dropId: 'acSsPhone',
        matchers: [(p, q) => norm(p.phone).includes(q), (p, q) => norm(p.name).toUpperCase().includes(q)],
        main: p => p.phone || p.name,
        sub: p => [p.name, p.dob, p.source].filter(Boolean).join('  |  ')
      }
    ]);

    const manageBtn = document.getElementById('manageSavedPersonsBtn');
    if (manageBtn) manageBtn.addEventListener('click', () => {
      const panel = document.getElementById('savedPersonsPanel'); if (!panel) return;
      const open = panel.style.display !== 'none';
      panel.style.display = open ? 'none' : 'block';
      if (!open) renderSavedPersonsList();
    });

    document.addEventListener('mousedown', e => {
      if (!e.target.closest('.ac-wrap') && !e.target.closest('.ac-drop')) closeAllDropdowns();
    });
    updatePersonsBadge();
  }
  function renderSavedPersonsList() {
    const container = document.getElementById("savedPersonsList"); if (!container) return;
    const persons = loadPersonsDB();
    container.innerHTML = "";
    
    if (!persons.length) {
      const empty = document.createElement("div");
      empty.className = "muted";
      empty.style.cssText = "padding:8px;font-size:12px";
      empty.textContent = "No saved people yet. Offender, Field Contact, and Search & Seizure person details all save into this shared pool.";
      container.appendChild(empty);
    } else {
      persons.forEach((p, idx) => {
        const details = [p.dob, p.sex, p.address, p.phone, p.source].filter(Boolean).join("  |  ") || "No details";
        const row = document.createElement("div");
        row.style.cssText = "display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;padding:8px 10px;background:rgba(0,0,0,0.2);border:1px solid var(--border);border-radius:8px";
        
        const info = document.createElement("div");
        const nameEl = document.createElement("div");
        nameEl.style.cssText = "font-size:12px;font-weight:800";
        nameEl.textContent = p.name;
        const detailEl = document.createElement("div");
        detailEl.style.cssText = "font-size:11px;color:var(--muted)";
        detailEl.textContent = details;
        info.appendChild(nameEl);
        info.appendChild(detailEl);
        
        const btns = document.createElement("div");
        btns.style.cssText = "display:flex;gap:6px";
        const useBtn = document.createElement("button");
        useBtn.className = "btn";
        useBtn.style.cssText = "font-size:11px;padding:5px 9px";
        useBtn.textContent = "Use for Offender";
        useBtn.addEventListener("click", () => fillOffenderFromPanel(idx));
        const editBtn = document.createElement("button");
        editBtn.className = "btn";
        editBtn.style.cssText = "font-size:11px;padding:5px 9px;border-color:rgba(108,138,255,0.4);color:rgba(180,200,255,0.9)";
        editBtn.textContent = "✏ Edit";
        editBtn.addEventListener("click", () => openPersonModal(idx));
        btns.appendChild(useBtn);
        btns.appendChild(editBtn);
        
        row.appendChild(info);
        row.appendChild(btns);
        container.appendChild(row);
      });
    }
    
    // Add New Person row
    const addRow = document.createElement("div");
    addRow.className = "add-person-row";
    const countSpan = document.createElement("span");
    countSpan.style.cssText = "font-size:12px;color:var(--muted);align-self:center";
    countSpan.textContent = persons.length ? persons.length + " saved" : "No people yet";
    const addBtn = document.createElement("button");
    addBtn.className = "btn";
    addBtn.style.cssText = "font-size:11px;padding:5px 10px";
    addBtn.textContent = "+ Add New Person";
    addBtn.addEventListener("click", () => openPersonModal(null));
    addRow.appendChild(countSpan);
    addRow.appendChild(addBtn);
    container.appendChild(addRow);
  }
  // Use a person by index from the panel
  window.fillOffenderFromPanel = function(idx) {
    try {
      const persons = loadPersonsDB();
      const p = persons[idx];
      if (!p) return;
      fillOffenderFields(p);
      const panel = document.getElementById("savedPersonsPanel");
      if (panel) panel.style.display = "none";
    } catch(e) {}
  };

  // Open edit modal for index (null = add new)
  window.openPersonModal = function(idx) {
    document.body.style.overflow = 'hidden';
    const overlay = document.getElementById("personsModalOverlay");
    if (!overlay) return;
    const persons = loadPersonsDB();
    const p = idx !== null ? persons[idx] : null;

    document.getElementById("personsModalTitle").textContent = p ? "Edit Saved Person" : "Add New Person";
    document.getElementById("pmOriginalName").value = p ? p.name : "";
    document.getElementById("pmName").value = p ? p.name : "";
    document.getElementById("pmDOB").value = p ? (p.dob||"") : "";
    document.getElementById("pmSex").value = p ? (p.sex||"") : "";
    document.getElementById("pmAddress").value = p ? (p.address||"") : "";
    document.getElementById("pmPhone").value = p ? (p.phone||"") : "";

    const delBtn = document.getElementById("pmDeleteBtn");
    if (delBtn) delBtn.style.display = p ? "inline-block" : "none";

    overlay.classList.add("open");
    trapFocus(overlay.querySelector('.persons-modal') || overlay);
    setTimeout(() => { const n = document.getElementById("pmName"); if(n) n.focus(); }, 120);
  };

  // Modal wiring (runs once after DOM ready - called at end of init)
  function initPersonsModal() {
    const overlay = document.getElementById("personsModalOverlay");
    const saveBtn = document.getElementById("pmSaveBtn");
    const cancelBtn = document.getElementById("pmCancelBtn");
    const delBtn = document.getElementById("pmDeleteBtn");
    if (!overlay) return;

    function closeModal() { overlay.classList.remove("open"); releaseFocusTrap(); }

    overlay.addEventListener("mousedown", e => { if (e.target === overlay) closeModal(); });
    if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        const newName = (document.getElementById("pmName").value||"").trim();
        if (!newName) { toast("Name is required", "warn"); return; }

        const originalName = document.getElementById("pmOriginalName").value.trim();
        const arr = loadPersonsDB();
        const existingRecord = originalName
          ? (arr.find(p => p.name.trim().toUpperCase() === originalName.toUpperCase()) || null)
          : null;

        const record = {
          name: newName,
          dob:     (document.getElementById("pmDOB").value||"").trim(),
          sex:     (document.getElementById("pmSex").value||""),
          address: (document.getElementById("pmAddress").value||"").trim(),
          phone:   (document.getElementById("pmPhone").value||"").trim(),
          ts: Date.now()
        };

        if (existingRecord) {
          const changed = ["name","dob","sex","address","phone"].some(key => norm(existingRecord[key]) !== norm(record[key]));
          if (!changed) {
            closeModal();
            toast("No changes made", "warn");
            return;
          }
          if (!confirm('Save changes to ' + originalName + '?')) return;
        }

        // If renaming, remove the old record first
        let filtered = originalName
          ? arr.filter(p => p.name.trim().toUpperCase() !== originalName.toUpperCase())
          : arr.slice();

        // Check for duplicate name (after removing old)
        const dupIdx = filtered.findIndex(p => p.name.trim().toUpperCase() === newName.toUpperCase());
        if (dupIdx >= 0) {
          if (!existingRecord && !confirm('Overwrite existing shared person entry for ' + newName + '?')) return;
          filtered[dupIdx] = { ...filtered[dupIdx], ...record };
        } else {
          filtered.unshift(record);
        }
        filtered.sort((a,b) => (b.ts||0)-(a.ts||0));
        savePersonsDB(filtered);
        updatePersonsBadge();
        renderSavedPersonsList();
        closeModal();
        toast((originalName ? "Updated " : "Added ") + newName, "ok");
      });
    }

    if (delBtn) {
      delBtn.addEventListener("click", () => {
        const originalName = document.getElementById("pmOriginalName").value.trim();
        if (!originalName) return;
        if (!confirm("Delete " + originalName + " from the shared people pool?")) return;
        deletePerson(originalName);
        renderSavedPersonsList();
        closeModal();
        toast("Deleted " + originalName, "ok");
      });
    }

    // Enter key in modal fields triggers save
    ["pmName","pmDOB","pmAddress","pmPhone"].forEach(id => {
      const el2 = document.getElementById(id);
      if (el2) el2.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); saveBtn && saveBtn.click(); }});
    });
  }

  // ============================================================================
  // OFFICERS AUTOCOMPLETE + LOCAL OFFICERS DATABASE
  // ============================================================================
  const OFFICERS_KEY = "vicpol_report_officers_db";
  const OFFICERS_MAX = 300;

  function dedupeUpperList(values) {
    const out = [];
    (values || []).forEach(v => {
      const clean = norm(v).toUpperCase();
      if (clean && !out.includes(clean)) out.push(clean);
    });
    return out;
  }

  function dedupeKeepCase(values) {
    const seen = new Set();
    const out = [];
    (values || []).forEach(v => {
      const clean = norm(v);
      const key = clean.toUpperCase();
      if (clean && !seen.has(key)) {
        seen.add(key);
        out.push(clean);
      }
    });
    return out;
  }

  function officerIdentityKeyFromRecord(officer) {
    if (!officer) return "";
    const nameKey = norm(officer.name || stripCallsignFromLine(officer.full || "")).toUpperCase();
    return nameKey || norm(officer.full).toUpperCase();
  }

  function normalizeOfficerRecord(officer) {
    if (!officer) return null;
    const full = norm(officer.full);
    if (!full) return null;
    const parsed = parseOfficerLine(full);
    const currentCallsign = norm(officer.callsign || parsed?.callsign).toUpperCase();
    const callsigns = dedupeUpperList([currentCallsign, ...(officer.callsigns || [])]);
    const division = norm(officer.division || parsed?.division);
    const divisions = dedupeKeepCase([...(officer.divisions || []), division]);
    const rank = norm(officer.rank || parsed?.rank).toUpperCase();
    const name = norm(officer.name || parsed?.name || stripCallsignFromLine(full));
    return {
      full,
      callsign: currentCallsign,
      callsigns,
      rank,
      name,
      division,
      divisions,
      ts: officer.ts || Date.now()
    };
  }

  function getOfficerRecordByLine(line) {
    const key = officerIdentityKeyFromRecord(parseOfficerLine(line) || { full: line, name: stripCallsignFromLine(line) || line });
    return loadOfficersDB().find(o => officerIdentityKeyFromRecord(o) === key) || null;
  }

  function parseOfficerLine(line) {
    const s = (line || "").trim();
    if (!s) return null;
    // Patterns: "MEL 228 | SC Smith", "MEL 228 | SC Smith | Ops", "POR440 SC Jones", "MEL 228"
    const m = s.match(/^([A-Z]{2,5}\s*\d{1,4})\s*(?:\||\s)\s*(?:(A\/SGT|A\/INSP|A\/SUPT|SGT|S\/SGT|INSP|SUPT|CHIEF|REC|RECRUIT|PROB|PO|CST|CONST|SC|S\/C|LSC|FC|FST)\b\.?\s+)?(.+?)$/i);
    if (m) {
      const callsign = m[1].trim().toUpperCase();
      const rank = (m[2] || "").trim().toUpperCase();
      let name = (m[3] || "").trim();
      // Strip trailing " | Division" info from name
      const divSplit = name.split("|");
      const nameOnly = divSplit[0].trim();
      const division = divSplit.length > 1 ? divSplit.slice(1).join("|").trim() : "";
      return { full: s, callsign, rank, name: nameOnly, division, ts: Date.now() };
    }
    // Fallback: just a name or unrecognized format
    return { full: s, callsign: "", rank: "", name: s, division: "", ts: Date.now() };
  }

  function loadOfficersDB() {
    try {
      const raw = JSON.parse(localStorage.getItem(OFFICERS_KEY)||"[]");
      return raw.map(normalizeOfficerRecord).filter(Boolean);
    } catch(e) { return []; }
  }
  function saveOfficersDB(arr) {
    try {
      const normalized = (arr || []).map(normalizeOfficerRecord).filter(Boolean);
      localStorage.setItem(OFFICERS_KEY, JSON.stringify(normalized.slice(0,OFFICERS_MAX)));
    } catch(e) {}
  }

  // Default officer roster from VicPol February 2026 Hours
  const DEFAULT_OFFICERS = [
    // Leadership Team
    {name:"Harvey Decker", rank:"", division:"Leadership"},
    {name:"Mike Frosties", rank:"", division:"Leadership"},
    {name:"Sergeant Burton", rank:"SGT", division:"Leadership"},
    {name:"Zoe Prime", rank:"", division:"Leadership"},
    {name:"Brad Bentley", rank:"", division:"Leadership"},
    {name:"Alexander Hale", rank:"", division:"Leadership"},
    {name:"Lachie Milton", rank:"", division:"Leadership"},
    {name:"Alicia Draykos", rank:"", division:"Leadership"},
    {name:"Anders Luciano", rank:"", division:"Leadership"},
    {name:"Angus Porter", rank:"", division:"Leadership"},
    {name:"Ben Ghost-Winters", rank:"", division:"Leadership"},
    {name:"Bruce D-Shark", rank:"", division:"Leadership"},
    {name:"Ford Robinson", rank:"", division:"Leadership"},
    {name:"Frank Robinson", rank:"", division:"Leadership"},
    {name:"James Edwin", rank:"", division:"Leadership"},
    {name:"Jonathan Cow-Kelly", rank:"", division:"Leadership"},
    {name:"Lewis Ashburn", rank:"", division:"Leadership"},
    {name:"Mike Simple", rank:"", division:"Leadership"},
    {name:"Mitch Erdstein", rank:"", division:"Leadership"},
    {name:"Nunya Biznus", rank:"", division:"Leadership"},
    {name:"Oliver Burton-Stater", rank:"", division:"Leadership"},
    {name:"Daniel Squelch-Ashburn", rank:"", division:"Leadership"},
    {name:"Joey Hale-Vale", rank:"", division:"Leadership"},
    {name:"Ronny Decker-Jones", rank:"", division:"Leadership"},
    // Special Constables
    {name:"Jake Jay-Ashburn", rank:"SC", division:"Special Constable"},
    {name:"Zelda Panchak", rank:"SC", division:"Special Constable"},
    {name:"Alfred Pier", rank:"SC", division:"Special Constable"},
    {name:"Hercules Draykos", rank:"SC", division:"Special Constable"},
    {name:"James Kade", rank:"SC", division:"Special Constable"},
    {name:"Ross Owans", rank:"SC", division:"Special Constable"},
    {name:"Titus Jorgan", rank:"SC", division:"Special Constable"},
    {name:"Wiggy Donovan", rank:"SC", division:"Special Constable"},
    // Victoria Police Officers
    {name:"Aaron Hudson", rank:"", division:"Victoria Police"},
    {name:"Alex Michaels", rank:"", division:"Victoria Police"},
    {name:"Alisha Taumata", rank:"", division:"Victoria Police"},
    {name:"Chris Gray", rank:"", division:"Victoria Police"},
    {name:"David Ace", rank:"", division:"Victoria Police"},
    {name:"Dexter Gutho-Ross", rank:"", division:"Victoria Police"},
    {name:"Domonic Crooks", rank:"", division:"Victoria Police"},
    {name:"Jake Ramirez", rank:"", division:"Victoria Police"},
    {name:"Emily Cumpson", rank:"", division:"Victoria Police"},
    {name:"Ethan Osbourne", rank:"", division:"Victoria Police"},
    {name:"Harvey Taumata", rank:"", division:"Victoria Police"},
    {name:"Hester Cow-Kelly", rank:"", division:"Victoria Police"},
    {name:"Jake Death-Ghost", rank:"", division:"Victoria Police"},
    {name:"Hunter Simmons", rank:"", division:"Victoria Police"},
    {name:"Jason Hunter", rank:"", division:"Victoria Police"},
    {name:"Jim Morgan", rank:"", division:"Victoria Police"},
    {name:"Jeffery Cumpson", rank:"", division:"Victoria Police"},
    {name:"Joseph O'Connelley", rank:"", division:"Victoria Police"},
    {name:"Michael Cumpson", rank:"", division:"Victoria Police"},
    {name:"Luigi Johnson-Cow", rank:"", division:"Victoria Police"},
    {name:"Luke Not", rank:"", division:"Victoria Police"},
    {name:"Moey Oshae", rank:"", division:"Victoria Police"},
    {name:"Mike Ray", rank:"", division:"Victoria Police"},
    {name:"Phoenix Pierce", rank:"", division:"Victoria Police"},
    {name:"Nemo DaFish", rank:"", division:"Victoria Police"},
    {name:"Nicholas Minjaj", rank:"", division:"Victoria Police"},
    {name:"Rob Jones", rank:"", division:"Victoria Police"},
    {name:"Robert-Ross Draykos", rank:"", division:"Victoria Police"},
    {name:"Ryan Booth", rank:"", division:"Victoria Police"},
    {name:"Samantha Snow-Cow", rank:"", division:"Victoria Police"},
    {name:"Spencer King", rank:"", division:"Victoria Police"},
    {name:"Stella Bear", rank:"", division:"Victoria Police"},
    {name:"Stephen Palmes", rank:"", division:"Victoria Police"},
    {name:"Tim Sandero", rank:"", division:"Victoria Police"},
    {name:"Tony Pier", rank:"", division:"Victoria Police"},
    {name:"Alfred Grey", rank:"", division:"Victoria Police"},
    {name:"Arlo Bobby-Brown", rank:"", division:"Victoria Police"},
    {name:"Bonnie Rose", rank:"", division:"Victoria Police"},
    {name:"Braxton Miller", rank:"", division:"Victoria Police"},
    {name:"Billy Cooper", rank:"", division:"Victoria Police"},
    {name:"Chad Flaskman", rank:"", division:"Victoria Police"},
    {name:"David Windsor", rank:"", division:"Victoria Police"},
    {name:"Flamingo Bird", rank:"", division:"Victoria Police"},
    {name:"Elijah Frosties", rank:"", division:"Victoria Police"},
    {name:"Fetu Alofaitauli-Momokik", rank:"", division:"Victoria Police"},
    {name:"Finny K-Maclean", rank:"", division:"Victoria Police"},
    {name:"Jack Blasco", rank:"", division:"Victoria Police"},
    {name:"James Liesman", rank:"", division:"Victoria Police"},
    {name:"Jay Michael", rank:"", division:"Victoria Police"},
    {name:"Lachy Jones", rank:"", division:"Victoria Police"},
    {name:"Lexi Rivera", rank:"", division:"Victoria Police"},
    {name:"Liam Kone-Galetto", rank:"", division:"Victoria Police"},
    {name:"Lucy Fraser-Luciano-Cow", rank:"", division:"Victoria Police"},
    {name:"Luke Croyden-Robinson", rank:"", division:"Victoria Police"},
    {name:"Rob Oshae", rank:"", division:"Victoria Police"},
    {name:"Robert Balding", rank:"", division:"Victoria Police"},
    {name:"Shane Winters", rank:"", division:"Victoria Police"},
    {name:"Sir Reginald", rank:"", division:"Victoria Police"},
    {name:"Sonny Bagwell", rank:"", division:"Victoria Police"},
    {name:"Xavier Hendrix", rank:"", division:"Victoria Police"},
    {name:"Tommy Dextra", rank:"", division:"Victoria Police"},
    {name:"Zak Ghost", rank:"", division:"Victoria Police"},
  ];

  function seedOfficersDB() {
    const existing = loadOfficersDB();
    const existingKeys = new Set(existing.map(o => o.name.trim().toUpperCase()));
    
    // Build list of officers not yet in DB
    const toAdd = [];
    DEFAULT_OFFICERS.forEach((o, i) => {
      const nameUpper = o.name.trim().toUpperCase();
      if (!existingKeys.has(nameUpper)) {
        const rankPart = o.rank ? o.rank + " " : "";
        const full = rankPart + o.name;
        toAdd.push({ full, callsign: "", rank: o.rank, name: o.name, division: o.division, ts: Date.now() - 1000 - i });
      }
    });
    
    if (toAdd.length > 0) {
      const merged = [...existing, ...toAdd];
      merged.sort((a,b) => (b.ts||0) - (a.ts||0));
      saveOfficersDB(merged);
    }
  }
  seedOfficersDB();

  function upsertOfficer(officer) {
    if (!officer || !officer.full || officer.full.trim().length < 2) return;
    const arr = loadOfficersDB();
    const record = normalizeOfficerRecord({
      full: officer.full.trim(),
      callsign: officer.callsign || "",
      callsigns: officer.callsigns || [],
      rank: officer.rank || "",
      name: officer.name || "",
      division: officer.division || "",
      divisions: officer.divisions || [],
      ts: Date.now()
    });
    const key = officerIdentityKeyFromRecord(record);
    const idx = arr.findIndex(o => officerIdentityKeyFromRecord(o) === key);
    if (idx >= 0) {
      const existing = normalizeOfficerRecord(arr[idx]);
      arr[idx] = normalizeOfficerRecord({
        full: record.full || existing.full,
        callsign: record.callsign || existing.callsign,
        callsigns: dedupeUpperList([record.callsign, ...(record.callsigns || []), existing.callsign, ...(existing.callsigns || [])]),
        rank: record.rank || existing.rank,
        name: record.name || existing.name,
        division: record.division || existing.division,
        divisions: [...(existing.divisions || []), ...(record.divisions || []), record.division, existing.division],
        ts: Date.now()
      });
    } else {
      arr.unshift(record);
    }
    arr.sort((a,b) => (b.ts||0) - (a.ts||0));
    saveOfficersDB(arr);
    updateOfficersBadge();
  }

  function deleteOfficer(fullKey) {
    if (!fullKey) return;
    const arr = loadOfficersDB();
    const key = fullKey.trim().toUpperCase();
    const filtered = arr.filter(o => o.full.trim().toUpperCase() !== key);
    if (filtered.length === arr.length) return; // not found
    saveOfficersDB(filtered);
    updateOfficersBadge();
    renderSavedOfficersList(document.getElementById("savedOfficersSearch")?.value);
  }

  function buildOfficerDisplayName(officer) {
    return [norm(officer?.rank), norm(officer?.name)].filter(Boolean).join(" ") || stripCallsignFromLine(officer?.full || "") || norm(officer?.full);
  }

  function buildOfficerBaseLine(officer) {
    return buildOfficerDisplayName(officer) || norm(officer?.full);
  }

  function updateOfficerRecord(oldFullKey, updater) {
    if (!oldFullKey) return null;
    const arr = loadOfficersDB();
    const oldKey = oldFullKey.trim().toUpperCase();
    const idx = arr.findIndex(r => norm(r.full).toUpperCase() === oldKey);
    if (idx < 0) return null;
    const existing = normalizeOfficerRecord(arr[idx]);
    const updatedRaw = typeof updater === 'function' ? updater(existing) : { ...existing, ...(updater || {}) };
    const updated = normalizeOfficerRecord({ ...existing, ...updatedRaw, ts: Date.now() });
    if (!updated) return null;
    arr[idx] = updated;
    saveOfficersDB(arr);
    updateOfficersBadge();
    renderSavedOfficersList(document.getElementById("savedOfficersSearch")?.value);
    return updated;
  }

  function addAssignedCallsignToOfficer(fullKey, callsign) {
    const clean = norm(callsign).toUpperCase();
    if (!clean) return null;
    const updated = updateOfficerRecord(fullKey, existing => ({
      ...existing,
      callsign: clean,
      callsigns: dedupeUpperList([clean, ...(existing.callsigns || []), existing.callsign]),
      full: buildOfficerBaseLine(existing) || existing.full
    }));
    if (!updated) return null;
    addCallsignToPool(clean);
    rememberRecentCallsign(clean);
    renderCallsignTags();
    renderOfficerTags();
    debouncedRenderPreview();
    throttledAutosave();
    return updated;
  }

  function removeAssignedCallsignFromOfficer(fullKey, callsign) {
    const clean = norm(callsign).toUpperCase();
    if (!clean) return null;
    const updated = updateOfficerRecord(fullKey, existing => {
      const remaining = dedupeUpperList((existing.callsigns || []).filter(cs => norm(cs).toUpperCase() !== clean));
      const nextPrimary = norm(existing.callsign).toUpperCase() === clean ? (remaining[0] || "") : existing.callsign;
      return {
        ...existing,
        callsign: nextPrimary,
        callsigns: remaining,
        full: buildOfficerBaseLine(existing) || existing.full
      };
    });
    if (!updated) return null;
    renderCallsignTags();
    renderOfficerTags();
    debouncedRenderPreview();
    throttledAutosave();
    return updated;
  }

  // ============================================================================
  // CALLSIGN MANAGEMENT (Persistent localStorage)
  // ============================================================================
  const CALLSIGNS_KEY = "vicpol_report_callsigns_pool";
  const RECENT_CALLSIGNS_KEY = "vicpol_report_recent_callsigns";
  const RECENT_CALLSIGNS_MAX = 12;

  function loadRecentCallsigns() {
    try { return JSON.parse(localStorage.getItem(RECENT_CALLSIGNS_KEY) || "[]"); } catch(e) { return []; }
  }
  function saveRecentCallsigns(arr) {
    try { localStorage.setItem(RECENT_CALLSIGNS_KEY, JSON.stringify((arr || []).slice(0, RECENT_CALLSIGNS_MAX))); } catch(e) {}
  }
  function rememberRecentCallsign(cs) {
    const clean = norm(cs).toUpperCase();
    if (!clean) return [];
    const recent = dedupeUpperList([clean, ...loadRecentCallsigns()]);
    saveRecentCallsigns(recent);
    return recent;
  }
  function removeRecentCallsign(cs) {
    const clean = norm(cs).toUpperCase();
    if (!clean) return;
    const recent = loadRecentCallsigns().filter(item => norm(item).toUpperCase() !== clean);
    saveRecentCallsigns(recent);
  }

  function loadCallsignPool() {
    try { return JSON.parse(localStorage.getItem(CALLSIGNS_KEY) || "[]"); } catch(e) { return []; }
  }
  function saveCallsignPool(arr) {
    try { localStorage.setItem(CALLSIGNS_KEY, JSON.stringify(arr)); } catch(e) {} 
  }

  // Migrate: if state has callsigns but localStorage doesn't, seed it
  try {
    (function migrateCallsigns() {
      const stored = loadCallsignPool();
      if (stored.length === 0 && state.savedCallsigns && state.savedCallsigns.length > 0) {
        saveCallsignPool(state.savedCallsigns);
      }
      state.savedCallsigns = loadCallsignPool();
    })();
  } catch(e) { /* migration not critical */ }

  function addCallsignToPool(cs) {
    if (!cs || !cs.trim()) return;
    const upper = cs.trim().toUpperCase();
    const pool = loadCallsignPool();
    if (!pool.includes(upper)) {
      pool.push(upper);
      saveCallsignPool(pool);
    }
    state.savedCallsigns = loadCallsignPool();
    renderCallsignTags();
    renderOfficerTags(); // Rebuild picker dropdowns with new callsign
  }

  function removeCallsignFromPool(cs) {
    const clean = norm(cs).toUpperCase();
    const pool = loadCallsignPool().filter(c => c !== clean);
    saveCallsignPool(pool);
    state.savedCallsigns = pool;
    if (state.officerCallsigns) {
      Object.keys(state.officerCallsigns).forEach(key => {
        if (norm(state.officerCallsigns[key]).toUpperCase() === clean) delete state.officerCallsigns[key];
      });
    }
    removeRecentCallsign(clean);
    renderCallsignTags();
    renderOfficerTags();
    debouncedRenderPreview();
    throttledAutosave();
    toast(clean + " removed from callsign pool", "ok");
  }

  function extractCallsignFromLine(line) {
    const m = (line || "").trim().match(/^([A-Z]{2,5}\s*\d{1,4})\b/i);
    return m ? m[1].trim().toUpperCase() : "";
  }

  function stripCallsignFromLine(line) {
    return (line || "").trim().replace(/^[A-Z]{2,5}\s*\d{1,4}\s*(?:\|\s*)?/i, "").trim();
  }

  function getDefaultCallsign() {
    // Extract callsign from the "Entered By" field (e.g. "MEL 228")
    const eb = norm(state.enteredBy);
    const m = eb.match(/^([A-Z]{2,5}\s*\d{1,4})\b/i);
    return m ? m[1].trim().toUpperCase() : eb.toUpperCase() || "";
  }

  function officerKey(line) {
    // Stable key for an officer line: just the rank+name part, uppercased
    return stripCallsignFromLine(line).toUpperCase() || line.trim().toUpperCase();
  }

  function getAssignedCallsign(line) {
    if (!state.officerCallsigns) state.officerCallsigns = {};
    const key = officerKey(line);
    if (state.officerCallsigns[key]) return state.officerCallsigns[key];
    const embedded = extractCallsignFromLine(line);
    if (embedded) return embedded;
    const officerRecord = getOfficerRecordByLine(line);
    if (officerRecord?.callsigns?.length) return officerRecord.callsigns[0];
    return getDefaultCallsign();
  }

  function setOfficerCallsign(line, cs) {
    if (!state.officerCallsigns) state.officerCallsigns = {};
    const clean = cs.trim().toUpperCase();
    const key = officerKey(line);
    state.officerCallsigns[key] = clean;
    rememberRecentCallsign(clean);
    addCallsignToPool(clean);
    const officerRecord = getOfficerRecordByLine(line);
    if (officerRecord) {
      updateOfficerRecord(officerRecord.full, existing => ({
        ...existing,
        callsign: clean,
        callsigns: dedupeUpperList([clean, ...(existing.callsigns || []), existing.callsign]),
        full: buildOfficerBaseLine(existing) || existing.full
      }));
    }
    debouncedRenderPreview();
    throttledAutosave();
    renderOfficerTags();
    renderSavedOfficersList(document.getElementById("savedOfficersSearch")?.value);
  }

  function getOfficerLineForPreview(line) {
    const cs = getAssignedCallsign(line);
    const nameOnly = stripCallsignFromLine(line) || line.trim();
    if (cs) return cs + " | " + nameOnly;
    return nameOnly;
  }

  function closeAllCsPickers() {
    document.querySelectorAll(".cs-picker-drop").forEach(d => d.classList.remove("open"));
    document.querySelectorAll(".cs-picker").forEach(p => p.classList.remove("cs-open"));
  }

  // Close callsign pickers when clicking elsewhere
  document.addEventListener("mousedown", (e) => {
    if (!e.target.closest(".cs-picker")) closeAllCsPickers();
  });

  function updateCallsignsBadge() {
    const badge = document.getElementById("savedCallsignsBadge"); if (!badge) return;
    const n = loadCallsignPool().length;
    badge.textContent = n + " saved";
    badge.style.display = n ? "inline" : "none";
    const countEl = document.getElementById("savedCallsignsCount");
    if (countEl) countEl.textContent = n ? "(" + n + ")" : "";
  }

  function renderCallsignTags() {
    const container = document.getElementById("callsignTags");
    if (!container) return;
    const callsigns = loadCallsignPool().slice().sort();
    updateCallsignsBadge();
    if (!callsigns.length) {
      container.innerHTML = '<span class="muted" style="font-size:11px;padding:4px">No callsigns saved. They auto-save when adding officers with callsigns, or add manually above.</span>';
      return;
    }
    container.innerHTML = "";
    callsigns.forEach(cs => {
      const related = loadOfficersDB().filter(o => (o.callsigns || []).includes(cs) || norm(o.callsign).toUpperCase() === cs);
      const deptSummary = dedupeKeepCase(related.flatMap(o => o.divisions || (o.division ? [o.division] : []))).slice(0, 2).join(" / ");
      const tag = document.createElement("span");
      tag.style.cssText = "display:inline-flex; gap:6px; align-items:center; padding:4px 8px; border-radius:8px; border:1px solid rgba(170,255,210,0.3); background:rgba(170,255,210,0.08); font-size:11px; font-weight:900; color:rgba(170,255,210,0.95)";

      const label = document.createElement("span");
      label.textContent = cs;
      label.title = deptSummary ? `${cs} • ${deptSummary}` : cs;
      tag.appendChild(label);

      if (deptSummary) {
        const meta = document.createElement("span");
        meta.style.cssText = "font-size:10px;color:var(--muted);font-weight:700";
        meta.textContent = deptSummary;
        tag.appendChild(meta);
      }

      const del = document.createElement("button");
      del.type = "button";
      del.textContent = "×";
      del.title = "Remove from callsign pool";
      del.style.cssText = "border:none;background:transparent;color:inherit;cursor:pointer;font-weight:900;padding:0 2px;line-height:1;font-size:13px";
      del.addEventListener("click", e => {
        e.preventDefault();
        e.stopPropagation();
        removeCallsignFromPool(cs);
      });
      tag.appendChild(del);
      container.appendChild(tag);
    });
  }

  function updateOfficersBadge() {
    const badge = document.getElementById("savedOfficersBadge"); if (!badge) return;
    const n = loadOfficersDB().length;
    badge.textContent = n + " saved";
    badge.style.display = n ? "inline" : "none";
  }

  function renderOfficerTags() {
    const container = document.getElementById("officerTags");
    if (!container) return;
    const lines = ensureLines(state.officersList).split("\n").map(l => l.trim()).filter(Boolean);
    if (!lines.length) {
      container.innerHTML = '<div class="muted" style="padding:4px">No officers added</div>';
      return;
    }
    container.innerHTML = "";
    lines.forEach((line, idx) => {
      const parsed = parseOfficerLine(line);
      const tag = document.createElement("div");
      tag.style.cssText = "display:inline-flex; gap:6px; align-items:center; padding:6px 10px; border-radius:10px; border:1px solid var(--border); background:rgba(0,0,0,0.3); font-size:12px; max-width:100%";

      // Callsign picker
      const assignedCS = getAssignedCallsign(line);
      const picker = document.createElement("div");
      picker.className = "cs-picker";

      const label = document.createElement("span");
      label.className = "cs-picker-label";
      label.textContent = assignedCS || "Callsign";
      picker.appendChild(label);

      const drop = document.createElement("div");
      drop.className = "cs-picker-drop";

      // Build callsign options with officer-specific callsigns first, then report/global pool
      const defaultCS = getDefaultCallsign();
      const officerRecord = getOfficerRecordByLine(line);
      const embedded = extractCallsignFromLine(line);
      const pool = dedupeUpperList([
        assignedCS,
        ...((officerRecord && officerRecord.callsigns) || []),
        ...loadRecentCallsigns(),
        embedded,
        defaultCS,
        ...loadCallsignPool()
      ]);

      if (pool.length === 0) {
        const empty = document.createElement("div");
        empty.style.cssText = "padding:10px 14px; font-size:12px; color:var(--muted); text-align:center";
        empty.innerHTML = 'No callsigns yet.<br>Set <strong>Entered By</strong> above or add to <strong>Callsign Pool</strong> below.';
        drop.appendChild(empty);
      } else {
        pool.forEach(cs => {
          const opt = document.createElement("div");
          opt.className = "cs-picker-opt" + (cs === assignedCS ? " active" : "");
          const isRecent = loadRecentCallsigns().includes(cs);
          opt.textContent = cs;
          if (cs === defaultCS && cs === assignedCS && !state.officerCallsigns?.[officerKey(line)]) {
            opt.textContent = cs + " (report)";
          } else if (isRecent && cs !== assignedCS) {
            opt.textContent = cs + " (recent)";
          }
          opt.addEventListener("mousedown", (e) => {
            e.preventDefault();
            e.stopPropagation();
            setOfficerCallsign(line, cs);
            closeAllCsPickers();
          });
          drop.appendChild(opt);
        });
      }

      label.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isOpen = drop.classList.contains("open");
        closeAllCsPickers();
        if (!isOpen) { drop.classList.add("open"); picker.classList.add("cs-open"); } else { picker.classList.remove("cs-open"); }
      });

      picker.appendChild(drop);
      tag.appendChild(picker);

      const sep = document.createElement("span");
      sep.style.cssText = "color:var(--muted)";
      sep.textContent = "|";
      tag.appendChild(sep);

      const nameEl = document.createElement("span");
      nameEl.style.cssText = "font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis";
      const nameOnly = stripCallsignFromLine(line) || line;
      nameEl.textContent = nameOnly;
      tag.appendChild(nameEl);

      if (parsed && parsed.division) {
        const divEl = document.createElement("span");
        divEl.style.cssText = "color:var(--muted); font-size:11px; white-space:nowrap";
        divEl.textContent = parsed.division;
        tag.appendChild(divEl);
      }

      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "×";
      btn.style.cssText = "border:none; background:transparent; color:rgba(255,255,255,0.7); cursor:pointer; font-weight:900; padding:0 2px; line-height:1; font-size:14px; flex-shrink:0";
      btn.addEventListener("click", () => {
        const allLines = ensureLines(state.officersList).split("\n").map(l => l.trim()).filter(Boolean);
        // Clean up callsign assignment for this officer
        const key = officerKey(allLines[idx]);
        if (state.officerCallsigns && state.officerCallsigns[key]) delete state.officerCallsigns[key];
        allLines.splice(idx, 1);
        state.officersList = allLines.join("\n");
        if (el.officersList) el.officersList.value = state.officersList;
        renderOfficerTags();
        debouncedRenderPreview();
        throttledAutosave();
      });
      tag.appendChild(btn);
      container.appendChild(tag);
    });
  }

  function renderSavedOfficersList(filterVal) {
    const container = document.getElementById("savedOfficersList"); if (!container) return;
    const countEl = document.getElementById("savedOfficersCount");
    const officers = loadOfficersDB();
    if (countEl) countEl.textContent = "(" + officers.length + ")";

    if (!officers.length) {
      container.innerHTML = '<div class="muted" style="padding:8px;font-size:12px">No saved officers yet. Add officers and they save automatically.</div>';
      return;
    }

    const q = (filterVal || "").trim().toUpperCase();
    const filtered = q ? officers.filter(o =>
      (o.full||"").toUpperCase().includes(q) ||
      (o.name||"").toUpperCase().includes(q) ||
      (o.division||"").toUpperCase().includes(q) ||
      (o.rank||"").toUpperCase().includes(q) ||
      (o.callsign||"").toUpperCase().includes(q) || (o.callsigns||[]).some(cs => cs.toUpperCase().includes(q)) || (o.divisions||[]).some(div => div.toUpperCase().includes(q))
    ) : officers;

    if (!filtered.length) {
      container.innerHTML = '<div class="muted" style="padding:8px;font-size:12px">No matching officers</div>';
      return;
    }

    container.innerHTML = "";
    filtered.forEach(o => {
      const row = document.createElement("div");
      row.style.cssText = "display:grid;grid-template-columns:1fr auto;gap:10px;align-items:start;padding:10px;background:rgba(0,0,0,0.2);border:1px solid var(--border);border-radius:8px";

      const info = document.createElement("div");
      const displayName = buildOfficerDisplayName(o);
      const divisionList = dedupeKeepCase([...(o.divisions || []), o.division]);
      info.innerHTML = '<div style="font-size:12px;font-weight:800">' + escapeHtml(displayName || o.full) + '</div>'
        + (divisionList.length ? '<div style="font-size:11px;color:var(--muted);margin-top:4px">' + escapeHtml(divisionList.join(' • ')) + '</div>' : '');

      const callsignWrap = document.createElement("div");
      callsignWrap.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;margin-top:8px";
      const assignedCallsigns = dedupeUpperList([...(o.callsigns || []), o.callsign]);
      if (assignedCallsigns.length) {
        assignedCallsigns.forEach(cs => {
          const chip = document.createElement("span");
          chip.style.cssText = "display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border-radius:999px;border:1px solid rgba(170,255,210,0.3);background:rgba(170,255,210,0.08);font-size:11px;font-weight:800;color:rgba(170,255,210,0.95)";
          const label = document.createElement("span");
          label.textContent = cs;
          chip.appendChild(label);
          const removeBtn = document.createElement("button");
          removeBtn.type = "button";
          removeBtn.textContent = "×";
          removeBtn.title = "Remove allotted callsign";
          removeBtn.style.cssText = "border:none;background:transparent;color:inherit;cursor:pointer;font-weight:900;padding:0 1px;line-height:1;font-size:12px";
          removeBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!confirm('Remove allotted callsign ' + cs + ' from ' + displayName + '?')) return;
            removeAssignedCallsignFromOfficer(o.full, cs);
            toast('Removed ' + cs + ' from ' + displayName, 'ok');
          });
          chip.appendChild(removeBtn);
          callsignWrap.appendChild(chip);
        });
      } else {
        const none = document.createElement("span");
        none.className = "muted";
        none.style.cssText = "font-size:11px;padding:4px 0";
        none.textContent = "No allotted callsigns saved";
        callsignWrap.appendChild(none);
      }
      info.appendChild(callsignWrap);

      const recentWrap = document.createElement("div");
      recentWrap.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;align-items:center";
      const recentLabel = document.createElement("span");
      recentLabel.className = "muted";
      recentLabel.style.cssText = "font-size:10px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase";
      recentLabel.textContent = "Recent";
      recentWrap.appendChild(recentLabel);
      const selectableRecent = loadRecentCallsigns().filter(cs => !assignedCallsigns.includes(cs)).slice(0, 6);
      if (selectableRecent.length) {
        selectableRecent.forEach(cs => {
          const quickBtn = document.createElement("button");
          quickBtn.type = "button";
          quickBtn.className = "same-btn";
          quickBtn.textContent = cs;
          quickBtn.title = "Assign recent callsign";
          quickBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!confirm('Assign recent callsign ' + cs + ' to ' + displayName + '?')) return;
            addAssignedCallsignToOfficer(o.full, cs);
            toast('Assigned ' + cs + ' to ' + displayName, 'ok');
          });
          recentWrap.appendChild(quickBtn);
        });
      } else {
        const noneRecent = document.createElement("span");
        noneRecent.className = "muted";
        noneRecent.style.cssText = "font-size:11px";
        noneRecent.textContent = "No recent callsigns";
        recentWrap.appendChild(noneRecent);
      }
      info.appendChild(recentWrap);

      const btns = document.createElement("div");
      btns.style.cssText = "display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end";

      const addBtn = document.createElement("button");
      addBtn.className = "btn";
      addBtn.style.cssText = "font-size:11px;padding:5px 8px";
      addBtn.textContent = "Add";
      addBtn.addEventListener("click", () => {
        const line = buildOfficerBaseLine(o) || o.full || "";
        if (!line) return;
        const current = (el.officersList?.value || "").trimEnd();
        const existing = current ? current.split("\n").map(l => l.trim().toUpperCase()) : [];
        if (existing.includes(line.trim().toUpperCase())) { toast("Officer already added", "warn"); return; }
        el.officersList.value = current ? current + "\n" + line : line;
        state.officersList = el.officersList.value;
        const preferredCs = assignedCallsigns[0] || extractCallsignFromLine(line);
        if (preferredCs) {
          if (!state.officerCallsigns) state.officerCallsigns = {};
          state.officerCallsigns[officerKey(line)] = preferredCs;
          addCallsignToPool(preferredCs);
        }
        renderOfficerTags();
        debouncedRenderPreview();
        throttledAutosave();
        toast("Officer added", "ok");
      });

      const addCsBtn = document.createElement("button");
      addCsBtn.className = "btn";
      addCsBtn.style.cssText = "font-size:11px;padding:5px 8px";
      addCsBtn.textContent = "Custom CS";
      addCsBtn.addEventListener("click", () => {
        const newCs = prompt('Add allotted callsign for ' + displayName + ':', '');
        if (newCs === null) return;
        const cleanCs = norm(newCs).toUpperCase();
        if (!cleanCs) return;
        if ((assignedCallsigns || []).includes(cleanCs)) { toast('Callsign already allotted', 'warn'); return; }
        if (!confirm('Add allotted callsign ' + cleanCs + ' to ' + displayName + '?')) return;
        addAssignedCallsignToOfficer(o.full, cleanCs);
        toast('Added ' + cleanCs + ' to ' + displayName, 'ok');
      });

      const editBtn = document.createElement("button");
      editBtn.className = "btn";
      editBtn.style.cssText = "font-size:11px;padding:5px 8px";
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", () => {
        if (!confirm('Edit saved officer details for ' + displayName + '?')) return;
        const newName = prompt("Edit officer name:", o.name || stripCallsignFromLine(o.full) || o.full);
        if (newName === null || !newName.trim()) return;
        const primaryDivision = divisionList[0] || o.division || "";
        const newDiv = prompt("Edit primary division:", primaryDivision);
        if (newDiv === null) return;
        const newRank = prompt("Edit rank (leave blank for none):", o.rank || "");
        if (newRank === null) return;
        const rankClean = norm(newRank).toUpperCase();
        const nameClean = norm(newName);
        const divClean = norm(newDiv);
        const summary = ['Name: ' + nameClean, 'Rank: ' + (rankClean || 'None'), 'Primary division: ' + (divClean || 'None')].join('\n');
        if (!confirm('Save these officer changes?\n\n' + summary)) return;

        const updated = updateOfficerRecord(o.full, existing => ({
          ...existing,
          full: [rankClean, nameClean].filter(Boolean).join(' ') || existing.full,
          rank: rankClean,
          name: nameClean,
          division: divClean,
          divisions: dedupeKeepCase([...(existing.divisions || []), existing.division, divClean])
        }));
        if (updated) {
          const oldOfficerKey = officerKey(o.full);
          const newOfficerLine = buildOfficerBaseLine(updated) || updated.full;
          const lines = ensureLines(state.officersList).split("\n").map(l => l.trim()).filter(Boolean);
          let touched = false;
          for (let i = 0; i < lines.length; i++) {
            if (officerKey(lines[i]) === oldOfficerKey) {
              lines[i] = newOfficerLine;
              touched = true;
            }
          }
          if (touched) {
            if (!state.officerCallsigns) state.officerCallsigns = {};
            const assigned = state.officerCallsigns[oldOfficerKey];
            if (assigned) {
              state.officerCallsigns[officerKey(newOfficerLine)] = assigned;
              delete state.officerCallsigns[oldOfficerKey];
            }
            state.officersList = lines.join("\n");
            if (el.officersList) el.officersList.value = state.officersList;
            renderOfficerTags();
            debouncedRenderPreview();
            throttledAutosave();
          }
          toast("Officer updated", "ok");
        }
      });

      const delBtn = document.createElement("button");
      delBtn.className = "btn";
      delBtn.style.cssText = "font-size:11px;padding:5px 8px;color:rgba(255,150,150,0.9)";
      delBtn.textContent = "Del";
      delBtn.addEventListener("click", () => {
        if (!confirm('Delete "' + displayName + '" from saved officers?')) return;
        deleteOfficer(o.full);
        toast("Officer deleted", "ok");
      });

      btns.appendChild(addBtn);
      btns.appendChild(addCsBtn);
      btns.appendChild(editBtn);
      btns.appendChild(delBtn);
      row.appendChild(info);
      row.appendChild(btns);
      container.appendChild(row);
    });
  }

  function setupOfficerAutocomplete() {
    const input = el.officerText;
    const drop = document.getElementById("acOfficer");
    if (!input || !drop) return;

    makeFieldAC(input, drop,
      val => {
        const q = val.trim().toUpperCase();
        const all = loadOfficersDB();
        return q
          ? all.filter(o => o.full.toUpperCase().includes(q) || o.callsign.toUpperCase().includes(q) || (o.callsigns||[]).some(cs => cs.toUpperCase().includes(q)) || o.name.toUpperCase().includes(q) || (o.division||"").toUpperCase().includes(q) || (o.divisions||[]).some(div => div.toUpperCase().includes(q))).slice(0, 10)
          : all.slice(0, 10);
      },
      o => {
        const csTag = (o.callsigns && o.callsigns.length ? o.callsigns.join(" • ") : o.callsign) ? ((o.callsigns && o.callsigns.length ? o.callsigns.join(" • ") : o.callsign) + " | ") : "";
        const rankName = [o.rank, o.name].filter(Boolean).join(" ");
        const divisionText = (o.divisions && o.divisions.length ? o.divisions.join(" • ") : o.division) || "";
        return { main: csTag + rankName, sub: divisionText, officer: o };
      },
      item => {
        // On select: fill the input with the full string
        input.value = item.officer.full;
        closeAllDropdowns();
      },
      item => { deleteOfficer(item.officer.full); }
    );

    // Manage panel toggle
    const manageBtn = document.getElementById("manageSavedOfficersBtn");
    if (manageBtn) manageBtn.addEventListener("click", () => {
      const panel = document.getElementById("savedOfficersPanel"); if (!panel) return;
      const open = panel.style.display !== "none";
      panel.style.display = open ? "none" : "block";
      if (!open) {
        const searchInput = document.getElementById("savedOfficersSearch");
        if (searchInput) searchInput.value = "";
        renderSavedOfficersList();
      }
    });
    // Wire up search filter for saved officers
    const savedOfficersSearch = document.getElementById("savedOfficersSearch");
    if (savedOfficersSearch) {
      savedOfficersSearch.addEventListener("input", () => {
        renderSavedOfficersList(savedOfficersSearch.value);
      });
    }

    updateOfficersBadge();
    updateCallsignsBadge();

    // Manage callsigns panel toggle
    const manageCallsignsBtn = document.getElementById("manageSavedCallsignsBtn");
    if (manageCallsignsBtn) manageCallsignsBtn.addEventListener("click", () => {
      const panel = document.getElementById("savedCallsignsPanel"); if (!panel) return;
      const open = panel.style.display !== "none";
      panel.style.display = open ? "none" : "block";
      if (!open) renderCallsignTags();
    });
  }

  // ============================================================================
  // SIGNATURE AUTOCOMPLETE + PERSISTENCE
  // ============================================================================
  const SIG_KEY = "vicpol_report_last_signature";

  function saveLastSignature() {
    try {
      const sig = { name: state.sigName || "", rank: state.sigRank || "", division: state.sigDivision || "" };
      if (sig.name.trim()) localStorage.setItem(SIG_KEY, JSON.stringify(sig));
    } catch(e) {}
  }

  function loadLastSignature() {
    try {
      const raw = localStorage.getItem(SIG_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch(e) { return null; }
  }

  // ── Signature pools (separate from officers) ─────────────────────────
  const VICPOL_RANKS = [
    "Recruit","Probationary Constable","Constable","First Constable","Senior Constable","Leading Senior Constable",
    "Sergeant","Senior Sergeant","Inspector","Superintendent"
  ];
  const ALL_RANKS = [...VICPOL_RANKS];
  const SIG_PROFILES_KEY = "vicpol_report_signature_profiles";
  const SIG_RANKS_KEY = "vicpol_report_signature_ranks_pool";
  const SIG_DIVISIONS_KEY = "vicpol_report_signature_divisions_pool";
  const PRESET_SIG_DIVISIONS = ["General Duties","P.O.R.T","Highway Patrol","CIRT","Victoria Police","Court Security","Corrections Victoria","IBAC","AFP"];

  function uniqueCaseInsensitive(values) {
    const out = [];
    const seen = new Set();
    values.forEach(v => {
      const clean = norm(v);
      if (!clean) return;
      const upper = clean.toUpperCase();
      if (seen.has(upper)) return;
      seen.add(upper);
      out.push(clean);
    });
    return out;
  }

  function loadSignatureProfiles() {
    try {
      const raw = JSON.parse(localStorage.getItem(SIG_PROFILES_KEY) || "[]");
      return Array.isArray(raw) ? raw.filter(p => norm(p?.name)).map(p => ({
        name: norm(p.name),
        rank: norm(p.rank),
        division: norm(p.division)
      })) : [];
    } catch(e) { return []; }
  }

  function saveSignatureProfiles(profiles) {
    try {
      localStorage.setItem(SIG_PROFILES_KEY, JSON.stringify(profiles));
    } catch(e) {}
  }

  function loadSignatureRanksPool() {
    try {
      const stored = JSON.parse(localStorage.getItem(SIG_RANKS_KEY) || "[]");
      const profileRanks = loadSignatureProfiles().map(p => p.rank);
      return uniqueCaseInsensitive([...ALL_RANKS, ...stored, ...profileRanks]);
    } catch(e) {
      return uniqueCaseInsensitive([...ALL_RANKS, ...loadSignatureProfiles().map(p => p.rank)]);
    }
  }

  function saveSignatureRankToPool(rank) {
    const clean = norm(rank);
    if (!clean) return;
    try {
      const stored = JSON.parse(localStorage.getItem(SIG_RANKS_KEY) || "[]");
      const updated = uniqueCaseInsensitive([...stored, clean]);
      localStorage.setItem(SIG_RANKS_KEY, JSON.stringify(updated));
    } catch(e) {}
  }

  function loadSignatureDivisionsPool() {
    try {
      const stored = JSON.parse(localStorage.getItem(SIG_DIVISIONS_KEY) || "[]");
      const profileDivs = loadSignatureProfiles().map(p => p.division);
      return uniqueCaseInsensitive([...PRESET_SIG_DIVISIONS, ...stored, ...profileDivs]);
    } catch(e) {
      return uniqueCaseInsensitive([...PRESET_SIG_DIVISIONS, ...loadSignatureProfiles().map(p => p.division)]);
    }
  }

  function saveSignatureDivisionToPool(div) {
    const clean = norm(div);
    if (!clean) return;
    try {
      const stored = JSON.parse(localStorage.getItem(SIG_DIVISIONS_KEY) || "[]");
      const updated = uniqueCaseInsensitive([...stored, clean]);
      localStorage.setItem(SIG_DIVISIONS_KEY, JSON.stringify(updated));
    } catch(e) {}
  }

  function saveCurrentSignatureToPool() {
    const profile = {
      name: norm(state.sigName || el.sigName?.value),
      rank: norm(state.sigRank || el.sigRank?.value),
      division: norm(state.sigDivision || el.sigDivision?.value)
    };
    if (!profile.name) {
      toast("Add a signature name first", "warn");
      return;
    }
    const profiles = loadSignatureProfiles();
    const idx = profiles.findIndex(p => p.name.toUpperCase() === profile.name.toUpperCase());
    if (idx >= 0) {
      const existing = profiles[idx];
      if (!confirm(`Update saved signature for ${existing.name}?`)) return;
      profiles[idx] = {
        name: profile.name,
        rank: profile.rank || existing.rank,
        division: profile.division || existing.division
      };
    } else {
      profiles.unshift(profile);
    }
    saveSignatureProfiles(profiles);
    if (profile.rank) saveSignatureRankToPool(profile.rank);
    if (profile.division) saveSignatureDivisionToPool(profile.division);
    renderSignaturePoolList(document.getElementById("signaturePoolSearch")?.value || "");
    toast("Signature saved to pool", "ok");
  }

  function applySignatureProfile(profile) {
    if (!profile) return;
    if (el.sigName) { el.sigName.value = profile.name || ""; state.sigName = el.sigName.value; }
    if (el.sigRank) { el.sigRank.value = profile.rank || ""; state.sigRank = el.sigRank.value; }
    if (el.sigDivision) { el.sigDivision.value = profile.division || ""; state.sigDivision = el.sigDivision.value; }
    saveLastSignature();
    debouncedRenderPreview();
    throttledAutosave();
  }

  function editSignatureProfile(name) {
    const profiles = loadSignatureProfiles();
    const idx = profiles.findIndex(p => p.name.toUpperCase() === String(name || "").toUpperCase());
    if (idx === -1) return;
    const current = profiles[idx];
    if (!confirm(`Edit saved signature for ${current.name}?`)) return;
    const nextName = prompt("Signature name", current.name);
    if (nextName === null) return;
    const nextRank = prompt("Rank", current.rank || "");
    if (nextRank === null) return;
    const nextDivision = prompt("Division", current.division || "");
    if (nextDivision === null) return;
    const updated = {
      name: norm(nextName) || current.name,
      rank: norm(nextRank),
      division: norm(nextDivision)
    };
    if (!confirm(`Save changes to ${updated.name}?`)) return;
    profiles[idx] = updated;
    saveSignatureProfiles(profiles);
    if (updated.rank) saveSignatureRankToPool(updated.rank);
    if (updated.division) saveSignatureDivisionToPool(updated.division);
    renderSignaturePoolList(document.getElementById("signaturePoolSearch")?.value || "");
    toast("Signature profile updated", "ok");
  }

  function deleteSignatureProfile(name) {
    const profiles = loadSignatureProfiles();
    const idx = profiles.findIndex(p => p.name.toUpperCase() === String(name || "").toUpperCase());
    if (idx === -1) return;
    if (!confirm(`Delete saved signature for ${profiles[idx].name}?`)) return;
    profiles.splice(idx, 1);
    saveSignatureProfiles(profiles);
    renderSignaturePoolList(document.getElementById("signaturePoolSearch")?.value || "");
    toast("Signature profile removed", "ok");
  }

  function renderSignaturePoolList(filter = "") {
    const container = document.getElementById("signaturePoolList");
    const countEl = document.getElementById("signaturePoolCount");
    if (!container) return;
    const q = norm(filter).toUpperCase();
    const profiles = loadSignatureProfiles().filter(p => {
      const hay = [p.name, p.rank, p.division].join(" ").toUpperCase();
      return !q || hay.includes(q);
    });
    if (countEl) countEl.textContent = `(${profiles.length})`;
    if (!profiles.length) {
      container.innerHTML = '<div class="muted" style="padding:6px 2px">No saved signatures yet.</div>';
      return;
    }
    container.innerHTML = profiles.map(p => `
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;padding:10px;border:1px solid var(--border);border-radius:8px;background:rgba(0,0,0,0.14)">
        <div>
          <div style="font-weight:800">${escapeHtml(p.name)}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">${escapeHtml([p.rank, p.division].filter(Boolean).join(" | ") || "No rank/division saved")}</div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">
          <button class="btn" type="button" data-apply-signature="${escapeHtml(p.name)}" style="font-size:11px;padding:5px 9px">Apply</button>
          <button class="btn" type="button" data-edit-signature="${escapeHtml(p.name)}" style="font-size:11px;padding:5px 9px">Edit</button>
          <button class="btn danger" type="button" data-delete-signature="${escapeHtml(p.name)}" style="font-size:11px;padding:5px 9px">Delete</button>
        </div>
      </div>
    `).join("");
  }

  function setupSignatureAutocomplete() {
    const input = el.sigName;
    const drop = document.getElementById("acSigName");
    const rankInput = el.sigRank;
    const rankDrop = document.getElementById("acSigRank");
    const divInput = el.sigDivision;
    const divDrop = document.getElementById("acSigDivision");

    if (input && drop) {
      makeFieldAC(input, drop,
        val => {
          const q = val.trim().toUpperCase();
          const all = loadSignatureProfiles();
          return q
            ? all.filter(p => [p.name, p.rank, p.division].some(part => String(part || "").toUpperCase().includes(q))).slice(0, 8)
            : all.slice(0, 8);
        },
        p => ({ main: p.name, sub: [p.rank, p.division].filter(Boolean).join("  |  "), profile: p }),
        item => {
          applySignatureProfile(item.profile);
          closeAllDropdowns();
        },
        () => {}
      );
    }

    if (rankInput && rankDrop) {
      makeFieldAC(rankInput, rankDrop,
        val => {
          const q = val.trim().toUpperCase();
          const pool = loadSignatureRanksPool();
          return q ? pool.filter(r => r.toUpperCase().includes(q)) : pool;
        },
        r => ({ main: r, sub: "", rank: r }),
        item => {
          rankInput.value = item.rank;
          state.sigRank = item.rank;
          saveSignatureRankToPool(item.rank);
          debouncedRenderPreview();
          throttledAutosave();
          saveLastSignature();
          closeAllDropdowns();
          if (divInput && !divInput.value) divInput.focus();
        },
        () => {}
      );
    }

    if (divInput && divDrop) {
      makeFieldAC(divInput, divDrop,
        val => {
          const q = val.trim().toUpperCase();
          const pool = loadSignatureDivisionsPool();
          return q ? pool.filter(d => d.toUpperCase().includes(q)) : pool;
        },
        d => ({ main: d, sub: "", div: d }),
        item => {
          divInput.value = item.div;
          state.sigDivision = item.div;
          saveSignatureDivisionToPool(item.div);
          debouncedRenderPreview();
          throttledAutosave();
          saveLastSignature();
          closeAllDropdowns();
        },
        () => {}
      );

      divInput.addEventListener("blur", () => {
        const val = divInput.value.trim();
        if (val) saveSignatureDivisionToPool(val);
        saveLastSignature();
      });
    }

    if (rankInput) rankInput.addEventListener("blur", () => {
      const val = rankInput.value.trim();
      if (val) saveSignatureRankToPool(val);
      saveLastSignature();
    });
    if (input) input.addEventListener("blur", () => saveLastSignature());

    const manageBtn = document.getElementById("manageSignaturePoolBtn");
    if (manageBtn) manageBtn.addEventListener("click", () => {
      const panel = document.getElementById("signaturePoolPanel");
      if (!panel) return;
      const open = panel.style.display !== "none";
      panel.style.display = open ? "none" : "block";
      if (!open) {
        const searchInput = document.getElementById("signaturePoolSearch");
        if (searchInput) searchInput.value = "";
        renderSignaturePoolList();
      }
    });

    const saveBtn = document.getElementById("saveSignatureProfileBtn");
    if (saveBtn) saveBtn.addEventListener("click", saveCurrentSignatureToPool);

    const searchInput = document.getElementById("signaturePoolSearch");
    if (searchInput) searchInput.addEventListener("input", () => renderSignaturePoolList(searchInput.value));

    const poolList = document.getElementById("signaturePoolList");
    if (poolList) {
      poolList.addEventListener("click", (e) => {
        const applyBtn = e.target.closest("button[data-apply-signature]");
        if (applyBtn) {
          const profile = loadSignatureProfiles().find(p => p.name.toUpperCase() === applyBtn.dataset.applySignature.toUpperCase());
          if (profile) {
            applySignatureProfile(profile);
            toast("Signature applied", "ok");
          }
          return;
        }
        const editBtn = e.target.closest("button[data-edit-signature]");
        if (editBtn) {
          editSignatureProfile(editBtn.dataset.editSignature);
          return;
        }
        const deleteBtn = e.target.closest("button[data-delete-signature]");
        if (deleteBtn) {
          deleteSignatureProfile(deleteBtn.dataset.deleteSignature);
        }
      });
    }

    if (!state.sigName && !state.sigRank && !state.sigDivision) {
      const last = loadLastSignature();
      if (last) {
        if (input && last.name) { input.value = last.name; state.sigName = last.name; }
        if (rankInput && last.rank) { rankInput.value = last.rank; state.sigRank = last.rank; }
        if (divInput && last.division) { divInput.value = last.division; state.sigDivision = last.division; }
        debouncedRenderPreview();
        throttledAutosave();
      }
    }
  }

  // ==========================================================================
  // CHARACTER COUNT
  // ==========================================================================
  function updateCharCount() {
    const cc = document.getElementById("charCount");
    if (cc && el.preview) {
      const len = (el.preview.textContent || "").length;
      cc.textContent = len.toLocaleString() + " chars";
    }
    updateSectionCopyBar();
  }

  // ==========================================================================
  // SECTION COPY BUTTONS — parse preview into sections, offer per-section copy
  // ==========================================================================
  function updateSectionCopyBar() {
    const bar = document.getElementById("sectionCopyBar");
    if (!bar || !el.preview) return;
    const text = (el.preview.textContent || "").trim();
    if (!text || text === "Start filling out the form...") { bar.innerHTML = ""; bar.style.display = "none"; return; }

    // Detect sections by known header patterns
    const sectionDefs = [
      { label: "Charges", pattern: /^.*List of Charges:|^.*CHARGES:/m },
      { label: "PINs", pattern: /^.*PINs:/m },
      { label: "Officers", pattern: /^.*Officers\s*(?:Involved|PRESENT):/mi },
      { label: "MELROADS", pattern: /^=+\s*MELROADS\s*=+/m },
      { label: "VICROADS", pattern: /^=+\s*VICROADS\s*=+|^VICROADS VEHICLE LOOK-UP:/m },
      { label: "Subject", pattern: /^.*SUSPECT DETAILS:|^.*SUBJECT DETAILS:|^PERSON DETAILS:/m },
      { label: "Evidence", pattern: /^.*Evidence.*:|^EVIDENCE:/m },
      { label: "Sentence", pattern: /^.*Sentence:/m },
      { label: "Items", pattern: /^.*Confiscated Items:|^ITEMS SEIZED:/m },
      { label: "Summary", pattern: /^.*Summary of Events:|^Search Summary:/m },
      { label: "Signature", pattern: /^Signed[,:]$/m },
      { label: "Field Contact", pattern: /^FIELD CONTACT REPORT/m },
      { label: "Bail", pattern: /^\(1\) Conditions of Bail/m },
      { label: "Interview", pattern: /^.*Interview Questions:/mi },
      { label: "Preliminary", pattern: /^.*PRELIMINARY DETAILS:/mi },
    ];

    const lines = text.split("\n");
    const found = [];
    sectionDefs.forEach(def => {
      for (let i = 0; i < lines.length; i++) {
        if (def.pattern.test(lines[i])) {
          // Find end: next section start or end of text
          let end = lines.length;
          for (let j = i + 1; j < lines.length; j++) {
            if (sectionDefs.some(d => d !== def && d.pattern.test(lines[j]))) { end = j; break; }
          }
          const sectionText = lines.slice(i, end).join("\n").replace(/\n{3,}/g, "\n\n").trim();
          if (sectionText) found.push({ label: def.label, text: sectionText });
          break;
        }
      }
    });

    if (found.length === 0) { bar.innerHTML = ""; bar.style.display = "none"; return; }
    bar.style.display = "flex";
    bar.innerHTML = '<span style="color:var(--muted);font-weight:700;align-self:center;margin-right:2px">Copy section:</span>';
    found.forEach(s => {
      const btn = document.createElement("button");
      btn.className = "btn";
      btn.style.cssText = "font-size:9px;padding:3px 7px;letter-spacing:0.04em";
      btn.textContent = "📋 " + s.label;
      btn.addEventListener("click", async () => {
        const ok = await copyToClipboard(s.text);
        toast(ok ? s.label + " copied" : "Failed to copy", ok ? "ok" : "err");
      });
      bar.appendChild(btn);
    });
  }

  // ==========================================================================
  // SMART TIME NORMALISATION — on blur, convert common formats to HH:MM HRS
  // ==========================================================================
  function normalizeTimeValue(raw) {
    const s = String(raw || "").trim();
    if (!s) return s;
    // Skip if it already looks formal or contains non-time text like "Approx"
    if (/HRS$/i.test(s)) return s;
    if (/approx|between|around|unknown|nil|n\/a/i.test(s)) return s;
    let h = null, m = 0;
    // "3am", "3:00am", "3:00 am", "3:00PM", "11pm"
    const ampm = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
    if (ampm) {
      h = parseInt(ampm[1]);
      m = parseInt(ampm[2] || "0");
      if (ampm[3].toLowerCase() === "pm" && h < 12) h += 12;
      if (ampm[3].toLowerCase() === "am" && h === 12) h = 0;
    }
    // "15:00", "3:45", "03:00"
    if (h === null) {
      const col = s.match(/^(\d{1,2}):(\d{2})$/);
      if (col) { h = parseInt(col[1]); m = parseInt(col[2]); }
    }
    // "0300", "1500", "2359" (4-digit military)
    if (h === null) {
      const mil = s.match(/^(\d{2})(\d{2})$/);
      if (mil) { h = parseInt(mil[1]); m = parseInt(mil[2]); }
    }
    if (h !== null && h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return String(h).padStart(2, "0") + String(m).padStart(2, "0") + " HRS";
    }
    return s; // Return as-is if not recognisable
  }

  // Apply to all time fields on blur
  ['prelimTime', 'twTime', 'fcTime', 'ssTime', 'bcTime'].forEach(id => {
    const field = document.getElementById(id);
    if (field) {
      field.addEventListener("blur", () => {
        const normalized = normalizeTimeValue(field.value);
        if (normalized !== field.value) {
          field.value = normalized;
          field.dispatchEvent(new Event("input", { bubbles: true }));
        }
      });
    }
  });

  // ==========================================================================
  // CARRY-OVER OFFICER DETAILS — preserve officer info across Clear
  // ==========================================================================
  function getOfficerCarryOver() {
    return {
      enteredBy: norm(state.enteredBy),
      enteredUnit: norm(state.enteredUnit),
      sigName: norm(state.sigName),
      sigRank: norm(state.sigRank),
      sigDivision: norm(state.sigDivision),
      officersList: norm(state.officersList),
    };
  }

  function applyOfficerCarryOver(carry) {
    if (!carry) return;
    if (carry.enteredBy) { state.enteredBy = carry.enteredBy; if (el.enteredBy) el.enteredBy.value = carry.enteredBy; }
    if (carry.enteredUnit) { state.enteredUnit = carry.enteredUnit; if (el.enteredUnit) el.enteredUnit.value = carry.enteredUnit; }
    if (carry.sigName) { state.sigName = carry.sigName; const e = document.getElementById("sigName"); if (e) e.value = carry.sigName; }
    if (carry.sigRank) { state.sigRank = carry.sigRank; const e = document.getElementById("sigRank"); if (e) e.value = carry.sigRank; }
    if (carry.sigDivision) { state.sigDivision = carry.sigDivision; const e = document.getElementById("sigDivision"); if (e) e.value = carry.sigDivision; }
    if (carry.officersList) { state.officersList = carry.officersList; if (el.officersList) el.officersList.value = carry.officersList; renderOfficerTags(); }
  }

  // ==========================================================================
  // OCR AVAILABILITY INDICATOR
  // ==========================================================================
  function updateOcrAvailability() {
    const statusEl = document.getElementById("ocrLabStatus");
    if (!statusEl) return;
    if (state.ocrWeaponsOnly) return; // Don't override weapons-mode display
    if (window.Tesseract && typeof window.Tesseract.recognize === "function") {
      statusEl.value = "🟢 OCR ready";
      statusEl.style.color = "var(--ok)";
    } else if (typeof navigator !== "undefined" && navigator.onLine === false) {
      statusEl.value = "🔴 OCR unavailable (offline)";
      statusEl.style.color = "rgba(255,100,100,0.9)";
    } else {
      statusEl.value = "⚪ OCR will load on first use";
      statusEl.style.color = "var(--muted)";
    }
  }
  // Check on init and when online status changes
  updateOcrAvailability();
  window.addEventListener("online", updateOcrAvailability);
  window.addEventListener("offline", updateOcrAvailability);

