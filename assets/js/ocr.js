/* OCR parsing and merge helpers. */

  function parseOCR(text) {
    const raw = String(text || "").replace(/\r/g, "");
    const cleanedRaw = raw
      .split("\n")
      .map(l => l.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .filter(l => !/^(PENDING\s+PAPERWORK|NATIONAL\s+CRIME\s+CHECK|CRIMTRAC)$/i.test(l));
    const upperLines = cleanedRaw.map(l => l.toUpperCase());
    const upper = upperLines.join("\n");

    const officerNames = [];
    const itemLines = [];
    for (const l of cleanedRaw) {
      const u = l.toUpperCase();
      if (looksLikeOfficerLine(u)) {
        const nameOnly = extractOfficerName(l);
        if (nameOnly) officerNames.push(nameOnly);
        continue;
      }
      if (looksLikeItemLine(u) && !/^(PENDING\s+PAPERWORK)$/i.test(u)) {
        itemLines.push(l.trim());
      }
    }

    const normaliseBool = (v) => {
      const s = String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (!s) return "";
      if (/^Y(E|3)?S?$/.test(s)) return "YES";
      if (/^N(O|0)?$/.test(s)) return "NO";
      return "";
    };

    const normaliseDate = (v) => String(v || "").replace(/\s+/g, "").trim();

    const smartTitle = (v) => {
      return String(v || "")
        .toLowerCase()
        .replace(/(^|[\s'\-])([a-z])/g, (_, sep, ch) => sep + ch.toUpperCase())
        .replace(/\bMrc\b/g, 'MRC');
    };

    const flipName = (name) => {
      const s = String(name || "").trim().replace(/\s+/g, " ");
      if (!s) return "";
      if (s.includes(",")) {
        const [last, first] = s.split(",", 2);
        const combined = `${String(first || "").trim()} ${String(last || "").trim()}`.trim();
        return smartTitle(combined);
      }
      return smartTitle(s);
    };

    const findLabelValue = (labels, opts = {}) => {
      const variants = Array.isArray(labels) ? labels : [labels];
      const sameLine = opts.sameLine !== false;
      const nextLine = opts.nextLine !== false;
      const valuePattern = opts.valuePattern || /(.+)/;
      const clean = opts.clean || (v => String(v || "").trim());

      for (let i = 0; i < upperLines.length; i++) {
        const lineU = upperLines[i];
        for (const label of variants) {
          const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
          if (sameLine) {
            const re = new RegExp(`(?:^|\\b)${escaped}[\\s:;.,-]*${valuePattern.source}`, 'i');
            const m = lineU.match(re);
            if (m && m[1]) {
              const value = clean(cleanedRaw[i].slice(m.index + m[0].length - m[1].length));
              if (value) return value;
            }
          }
          if (nextLine && new RegExp(`(?:^|\\b)${escaped}(?:$|[\\s:;.,-]*$)`, 'i').test(lineU)) {
            const next = clean(cleanedRaw[i + 1] || "");
            if (next) return next;
          }
        }
      }
      return "";
    };

    const findAfterHeader = (headerMatchers, offset = 1, maxScan = 8) => {
      for (let i = 0; i < upperLines.length; i++) {
        if (headerMatchers.every(re => re.test(upperLines[i]) || re.test(upperLines[i + 1] || ""))) {
          const skipRe = /^(DRIVER|VICTORIA|AUSTRALIA|SEARCH PERSON|RUN PERSON CHECK|PENDING|LICEN[CS]E\s*(NO|EXPIRY|TYPE)|DATE\s+OF\s+BIRTH|NATIONAL\s+CRIME\s+CHECK|VIC\s*ROADS|CRIMTRAC)$/i;
          let seen = 0;
          for (let j = i + 1; j < Math.min(i + maxScan, cleanedRaw.length); j++) {
            const line = cleanedRaw[j];
            if (!line || skipRe.test(line)) continue;
            seen++;
            if (seen === offset) return line;
          }
        }
      }
      return "";
    };

    let leapName = findLabelValue(['NAME'], {
      valuePattern: /([A-Z][A-Z ,'.\-]{2,})/,
      clean: v => String(v || '').replace(/[^A-Z ,'.\-]/gi, '').trim()
    });
    let leapDob = normaliseDate(findLabelValue(['DOB', 'D O B'], {
      valuePattern: /([0-9]{1,4}[\-\/][0-9]{1,2}[\-\/][0-9]{1,4})/
    }));
    let leapSex = findLabelValue(['SEX', 'S E X'], { valuePattern: /([MFX])/i }).toUpperCase();
    let leapAddress = findLabelValue(['HOME ADDR', 'HOME ADDRESS', 'ADDRESS'], {
      valuePattern: /([A-Z0-9 ,'.\-]{3,})/,
      clean: v => String(v || '').trim()
    });
    let leapPhone = findLabelValue(['PHONE NO', 'PHONE NUMBER', 'PHONE'], {
      valuePattern: /([0-9][0-9 ]*)/,
      clean: v => String(v || '').replace(/\s+/g, '')
    });

    // Victoria licence fallback, positional extraction from screenshots/UI.
    let vicName = "";
    let vicAddress = "";
    if (!leapName) vicName = findAfterHeader([/DRIVER\s*LICEN[CS]E/i, /VICTORIA/i], 1, 10);
    if (!leapAddress) vicAddress = findAfterHeader([/DRIVER\s*LICEN[CS]E/i, /VICTORIA/i], 2, 10);

    const dobFromGrid = (() => {
      for (let i = 0; i < upperLines.length - 1; i++) {
        if (/DATE\s+OF\s+BIRTH/i.test(upperLines[i])) {
          const dates = cleanedRaw[i + 1].match(/[0-9]{1,4}[\-\/][0-9]{1,2}[\-\/][0-9]{1,4}/g);
          if (dates && dates.length) return normaliseDate(dates[dates.length - 1]);
        }
      }
      return "";
    })();

    const licenceTypeFromGrid = (() => {
      const sameLine = findLabelValue(['LICENCE TYPE', 'LICENSE TYPE'], {
        valuePattern: /([A-Z][A-Z ]{0,20})/,
        clean: v => String(v || '').trim()
      });
      if (sameLine) return sameLine;
      for (let i = 0; i < upperLines.length - 1; i++) {
        if (/LICEN[CS]E\s+TYPE/i.test(upperLines[i])) {
          const next = cleanedRaw[i + 1] || "";
          if (/^[A-Z][A-Z ]{0,15}$/.test(next)) return next.trim();
        }
      }
      return "";
    })();

    const outName = flipName(leapName || vicName);
    const outDob = leapDob || dobFromGrid;
    const outAddress = leapAddress || vicAddress;

    const licClass = findLabelValue(['LIC CLASS', 'LICENCE TYPE'], {
      valuePattern: /([A-Z][A-Z ]{0,30})/,
      clean: v => String(v || '').trim()
    }) || licenceTypeFromGrid;

    const licStatus = findLabelValue(['LIC STATUS'], {
      valuePattern: /(CURRENT|EXPIRED|SUSPENDED)/i,
      clean: v => String(v || '').toUpperCase().trim()
    });

    const expires = (() => {
      const same = findLabelValue(['EXPIRES', 'LICENCE EXPIRY', 'LICENSE EXPIRY'], {
        valuePattern: /([0-9A-Z:\-\/ ]+(?:AM|PM)?)/i,
        clean: v => String(v || '').trim()
      });
      if (same) return same;
      for (let i = 0; i < upperLines.length - 1; i++) {
        if (/LICEN[CS]E\s+EXPIRY/i.test(upperLines[i])) {
          const dates = cleanedRaw[i + 1].match(/[0-9]{1,4}[\-\/][0-9]{1,2}[\-\/][0-9]{1,4}(?:\s+[0-9:]+\s*(?:AM|PM)?)?/ig);
          if (dates && dates.length) return dates[0].trim();
        }
      }
      return "";
    })();

    const demeritPoints = (() => {
      const m = upper.match(/DEM[E3]R[I1]T\s+PTS?\s*[:;.,-]*\s*(\d+)/i);
      return m ? parseInt(m[1], 10) : 0;
    })();

    return {
      offender: {
        name: outName,
        dob: outDob,
        sex: leapSex,
        address: outAddress,
        phone: leapPhone
      },
      meta: {
        enteredBy: findLabelValue(['ENTERED BY'], { valuePattern: /([A-Z0-9 .,'\/-]+)/i }),
        unit: findLabelValue(['UNIT'], { valuePattern: /([A-Z0-9|\/ .,'\-]+)/i })
      },
      license: {
        demeritPoints,
        licenseStatus: licStatus,
        licenseClass: licClass,
        expires,
        wanted: normaliseBool(findLabelValue(['WANTED'], { valuePattern: /([A-Z0-9]+)/i })),
        bail: normaliseBool(findLabelValue(['BAIL'], { valuePattern: /([A-Z0-9]+)/i })),
        mentalHealth: normaliseBool(findLabelValue(['MEN. HEALTH', 'MENTAL HEALTH'], { valuePattern: /([A-Z0-9]+)/i })),
        violencePolice: normaliseBool(findLabelValue(['VIOLENCE POLICE'], { valuePattern: /([A-Z0-9]+)/i })),
        violence: normaliseBool(findLabelValue(['VIOLENCE'], { valuePattern: /([A-Z0-9]+)/i })),
        possWeap: normaliseBool(findLabelValue(['POS WEAP', 'POSS WEAP'], { valuePattern: /([A-Z0-9]+)/i })),
        weaponLongarm: normaliseBool(findLabelValue(['WEAPON LONGARM', 'LONGARM'], { valuePattern: /([A-Z0-9]+)/i })),
        weaponHandgun: normaliseBool(findLabelValue(['HANDGUN'], { valuePattern: /([A-Z0-9]+)/i })),
        concealCarry: normaliseBool(findLabelValue(['CONCEAL CARRY PERMIT', 'CONCEAL CARRY'], { valuePattern: /([A-Z0-9]+)/i })),
        firearmProhibOrder: normaliseBool(findLabelValue(['F/ARM PROHIB ORDER', 'F ARM PROHIB ORDER'], { valuePattern: /([A-Z0-9]+)/i }))
      },
      officerNames,
      itemLines,
      vehicle: {
        rego: findLabelValue(['REGISTRATION', 'REGO', 'LICENCE PLATE', 'LICENSE PLATE', 'PLATE'], { valuePattern: /([A-Z0-9 \-]{3,12})/i }).toUpperCase(),
        model: findLabelValue(['MODEL'], { valuePattern: /([A-Z0-9 \-]{2,40})/i }).toUpperCase(),
        colour: findLabelValue(['COLOUR', 'COLOR'], { valuePattern: /([A-Z0-9 \-]{2,30})/i }).toUpperCase(),
        registered: normaliseBool(findLabelValue(['REGISTERED'], { valuePattern: /([A-Z0-9]+)/i })),
        expires: findLabelValue(['EXPIRES'], { valuePattern: /([0-9A-Z:\-\/ ]+(?:AM|PM)?)/i }).trim(),
        stolen: normaliseBool(findLabelValue(['STOLEN'], { valuePattern: /([A-Z0-9]+)/i })),
        suspended: normaliseBool(findLabelValue(['SUSPENDED'], { valuePattern: /([A-Z0-9]+)/i })),
        owner: flipName(findLabelValue(['OWNER', 'REGISTERED OWNER'], { valuePattern: /([A-Z][A-Z ,'.\-]{2,})/i }))
      }
    };
  }

  // Weapon/Contraband filtering keywords
  const FIREARM_KW = ["pistol", "handgun", "revolver", "rifle", "shotgun", "carbine", "smg", "assault rifle", "marksman rifle", "sniper", "machine gun", "minigun", "firearm", "gun"];
  const AMMO_KW = ["ammo", "ammunition", "rounds", "bullets", "cartridge", "shell"];
  const DRUG_KW = ["cocaine", "crack", "heroin", "meth", "marijuana", "weed", "cannabis", "pills", "mdma", "ecstasy", "lsd", "mushroom", "drug", "narcotic"];
  const EXPLOSIVE_KW = ["explosive", "grenade", "c4", "dynamite", "tnt", "bomb", "mine"];
  const ATTACH_KW = ["suppressor", "silencer", "scope", "extended mag", "grip", "flashlight", "laser", "attachment"];
  const MELEE_KW = ["knife", "switchblade", "machete", "bat", "crowbar", "wrench", "hammer", "axe", "sword", "katana", "brass knuckles"];

  function buildWeaponsEvidenceLines(lines) {
    const clean = (s) => String(s || "").replace(/\s+/g, " ").trim();
    const parse = (raw) => {
      const s = clean(raw);
      if (!s) return null;
      let name = s;
      let qty = null;

      const m1 = s.match(/^(.*?)(?:\s*(?:x|×)\s*(\d+))\s*$/i);
      const m2 = s.match(/^(.*?)(?:\s*(\d+)\s*(?:x|×))\s*$/i);
      const m3 = s.match(/^(.*?)[\s:,-]+(\d+)\s*$/i);
      const pick = (m) => ({ name: (m[1] || "").trim(), qty: Number(m[2] || "") });

      if (m1) ({ name, qty } = pick(m1));
      else if (m2) ({ name, qty } = pick(m2));
      else if (m3) ({ name, qty } = pick(m3));

      name = clean(name);
      if (!name) return null;
      if (!Number.isFinite(qty)) qty = null;

      return { name, qty };
    };

    const normKey = (name) => clean(name).toUpperCase();
    const catOf = (name) => {
      const t = clean(name).toLowerCase();
      const has = (arr) => arr.some(k => t.includes(k));
      if (has(FIREARM_KW)) return 0;
      if (has(AMMO_KW)) return 1;
      if (has(DRUG_KW)) return 2;
      if (has(EXPLOSIVE_KW)) return 3;
      if (has(ATTACH_KW)) return 4;
      if (has(MELEE_KW)) return 5;
      return 9;
    };

    const relevant = [];
    for (const raw of lines) {
      const p = parse(raw);
      if (!p) continue;
      if (catOf(p.name) === 9) continue;
      relevant.push(p);
    }
    if (!relevant.length) return [];

    const map = new Map();
    for (const p of relevant) {
      const key = normKey(p.name);
      const cat = catOf(p.name);
      if (!map.has(key)) {
        map.set(key, { name: p.name, qty: p.qty, cat });
      } else {
        const cur = map.get(key);
        if (p.name.length > cur.name.length) cur.name = p.name;
        cur.cat = Math.min(cur.cat, cat);
        if (p.qty != null) {
          cur.qty = (cur.qty || 0) + p.qty;
        }
      }
    }

    const arr = Array.from(map.values())
      .sort((a, b) => (a.cat - b.cat) || a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

    return arr.map(v => v.qty != null ? `${v.name} x${v.qty}` : v.name);
  }

  function mergeEvidenceAppend(existingText, newLines) {
    const existingLines = ensureLines(existingText).split("\n").map(s => s.trim()).filter(Boolean);
    const parse = (raw) => {
      const s = String(raw || "").replace(/\s+/g, " ").trim();
      if (!s) return null;
      const m = s.match(/^(.*?)(?:\s*(?:x|×)\s*(\d+))\s*$/i);
      const name = (m ? m[1] : s).trim();
      const qty = m ? Number(m[2]) : null;
      return { name, qty };
    };
    const keyOf = (name) => String(name || "").trim().toUpperCase();

    const map = new Map();
    const order = [];

    const add = (line) => {
      const p = parse(line);
      if (!p || !p.name) return;
      const k = keyOf(p.name);
      if (!map.has(k)) {
        map.set(k, { name: p.name, qty: p.qty });
        order.push(k);
      } else {
        const cur = map.get(k);
        if (p.name.length > cur.name.length) cur.name = p.name;
        if (p.qty != null) {
          cur.qty = (cur.qty || 0) + p.qty;
        }
      }
    };

    for (const l of existingLines) add(l);
    for (const l of (newLines || [])) add(l);

    const out = order.map(k => {
      const v = map.get(k);
      return v.qty != null ? `${v.name} x${v.qty}` : v.name;
    });

    return out.join("\n");
  }

  // License Suspension Check
  function checkLicenseSuspension() {
    const currentPoints = state.currentDemeritPoints || 0;
    
    // Calculate points from selected PINs by looking up in PINS array
    let newPoints = 0;
    selectedPinsSet.forEach(pinName => {
      const pin = PINS.find(p => p.name === pinName);
      if (pin && pin.points) {
        const match = pin.points.match(/(\d+)\s*pts?/i);
        if (match) newPoints += parseInt(match[1]);
      }
    });
    
    if (newPoints === 0 && currentPoints < 8) return null;
    
    const totalPoints = currentPoints + newPoints;
    const SUSPENSION_THRESHOLD = 12;
    
    let warning = null;
    if (totalPoints >= SUSPENSION_THRESHOLD) {
      warning = {
        type: "SUSPEND",
        message: `🚨 LICENCE SUSPENSION REQUIRED — Total Demerit Points: ${totalPoints} (Current: ${currentPoints} + New: ${newPoints})`,
        totalPoints, currentPoints, newPoints
      };
    } else if (totalPoints >= 8 || newPoints > 0) {
      warning = {
        type: "WARNING",
        message: `Demerit Points: ${totalPoints}/${SUSPENSION_THRESHOLD} (Current: ${currentPoints} + New PINs: ${newPoints})`,
        totalPoints, currentPoints, newPoints
      };
    }
    
    return warning;
  }

  // Preprocess image for better OCR

  function parseEvidenceSerials(text) {
    const raw = String(text || "");
    const out = [];
    const lines = raw.split(/\n+/).map(l => l.trim()).filter(Boolean);
    const serialRe = /\b(?:S\/?N|SN|SERIAL)\s*[:#-]?\s*([A-Z0-9]{5,})\b/i;
    const itemRe = /(PISTOL|HANDGUN|REVOLVER|RIFLE|SHOTGUN|SMG|CARBINE|KNIFE|SWITCHBLADE|BAT|CROWBAR|AMMO|AMMUNITION|MAGAZINE|SILENCER|SUPPRESSOR|SCOPE|EXPLOSIVE|C4|GRENADE)/i;
    for (const line of lines) {
      const s = line.replace(/\s+/g, ' ').trim();
      if (!s) continue;
      const serial = s.match(serialRe);
      if (!serial) continue; // only match explicit SN:/S/N:/SERIAL: labels
      const serialVal = serial[1].toUpperCase();
      const item = s.match(itemRe);
      if (item) out.push(`${item[1].toUpperCase()} SN: ${serialVal}`);
      else out.push(`SN: ${serialVal}`);
    }
    return [...new Set(out)];
  }

  function blobToImage(blob) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(img.src); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(img.src); reject(new Error("Image load failed")); };
      img.src = URL.createObjectURL(blob);
    });
  }

  function canvasToBlob(canvas, type='image/png', quality=1) {
    return new Promise(resolve => canvas.toBlob(resolve, type, quality));
  }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  async function cropBlobFromImageBlob(blob, rect, options = {}) {
    const img = await blobToImage(blob);
    const sx = clamp(Math.round((rect.x || 0) * img.width), 0, img.width - 1);
    const sy = clamp(Math.round((rect.y || 0) * img.height), 0, img.height - 1);
    const sw = clamp(Math.round((rect.w || 1) * img.width), 1, img.width - sx);
    const sh = clamp(Math.round((rect.h || 1) * img.height), 1, img.height - sy);
    const scale = options.scale || 1;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sw * scale));
    canvas.height = Math.max(1, Math.round(sh * scale));
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    return canvasToBlob(canvas, 'image/png');
  }

  
  function parseLicenceZoneText(bundle) {
    const top = postProcessOCR(bundle.top || '');
    const middle = postProcessOCR(bundle.middle || '');
    const bottom = postProcessOCR(bundle.bottom || '');
    const all = [top, middle, bottom].filter(Boolean).join('\n');
    const allLines = [top, middle, bottom]
      .join('\n')
      .split(/\n+/)
      .map(s => s.trim().replace(/\s+/g, ' '))
      .filter(Boolean);

    const upperLines = allLines.map(s => s.toUpperCase());
    const headerSkip = /^(DRIVER LICEN[CS]E|VICTORIA AUSTRALIA|LICEN[CS]E NO\.?|VICROADS|VICTORIA|AUSTRALIA|CARD NUMBER|PHOTO)$/i;
    const isDate = (s) => /\b\d{2}[\-\/]\d{2}[\-\/]\d{4}\b/.test(s || '');
    const dateRe = /\b\d{2}[\-\/]\d{2}[\-\/]\d{4}\b/g;
    const normDate = (s) => {
      const m = String(s || '').match(dateRe);
      return m && m.length ? m[0] : '';
    };
    const yearOf = (s) => {
      const m = String(s || '').match(/[\-\/](\d{4})$/);
      return m ? parseInt(m[1], 10) : 0;
    };
    const streetHint = /\b(ST|STREET|RD|ROAD|AVE|AVENUE|DR|DRIVE|BLVD|LANE|LN|HWY|HIGHWAY|WAY|COURT|CT|PLACE|PL|UNIT|APT|CELL)\b/i;

    const findDateNear = (patterns) => {
      for (let i = 0; i < upperLines.length; i++) {
        const lineU = upperLines[i];
        if (!patterns.some(re => re.test(lineU))) continue;
        const same = normDate(allLines[i]);
        if (same) return same;
        const next = normDate(allLines[i + 1] || '');
        if (next) return next;
        const prev = normDate(allLines[i - 1] || '');
        if (prev) return prev;
      }
      return '';
    };

    let expiry = findDateNear([/EXP/i, /EXPIRES/i, /VALID TO/i, /LICEN[CS]E EXPIRY/i]);
    let dob = findDateNear([/\bDOB\b/i, /DATE OF BIRTH/i, /\bBIRTH\b/i]);

    const dates = [...new Set((all.match(dateRe) || []).map(normDate).filter(Boolean))];
    if ((!dob || !expiry) && dates.length) {
      const dated = dates.map(d => ({ value: d, year: yearOf(d) || 0 })).sort((a, b) => a.year - b.year);
      const oldest = dated[0] ? dated[0].value : '';
      const newest = dated.length ? dated[dated.length - 1].value : '';
      if (!dob && oldest) dob = oldest;
      if (!expiry && newest) expiry = newest;
      if (dob && expiry && dob === expiry && dated.length > 1) {
        dob = oldest;
        expiry = newest;
      }
    }

    let licenceType = '';
    const typeSameLine = all.match(/(?:LICEN[CS]E\s*TYPE|CLASS)[^A-Z0-9]*([CRHWL\s]{1,20})/i);
    if (typeSameLine) licenceType = typeSameLine[1].replace(/\s+/g, ' ').trim().toUpperCase();
    if (!licenceType) {
      const typeLine = bottom.split(/\n+/).map(s => s.trim()).find(s => /^[CRHWL\s]{1,20}$/i.test(s) && /[A-Z]/i.test(s));
      if (typeLine) licenceType = typeLine.replace(/\s+/g, ' ').trim().toUpperCase();
    }

    const candidateLines = allLines.filter(line => !headerSkip.test(line) && !isDate(line) && !/LICEN[CS]E\s*(TYPE|EXPIRY|NO\.?)/i.test(line));
    let name = '';
    let address = '';
    for (const line of candidateLines) {
      const clean = line.replace(/[^A-Z0-9 ,.'\-]/gi, ' ').replace(/\s+/g, ' ').trim();
      if (!clean) continue;
      if (!name && /[A-Z]/i.test(clean) && !/\d/.test(clean)) {
        name = clean;
        continue;
      }
      if (!address && (streetHint.test(clean) || /\d/.test(clean))) {
        address = clean;
      }
    }
    if (!address) address = candidateLines.find(line => streetHint.test(line) || /\d/.test(line)) || '';

    name = titleCaseName(String(name || '').replace(/\s+/g, ' ').trim());
    address = String(address || '').replace(/\s+/g, ' ').trim().toUpperCase();

    const score = [name, address, expiry, dob, licenceType].filter(Boolean).length;
    return {
      offender: { name, address, dob, sex: '', phone: '' },
      license: { licenseClass: licenceType, expires: expiry, demeritPoints: 0, licenseStatus: '' },
      score,
      raw: { top, middle, bottom }
    };
  }

  async function recognizeWithWorker(worker, blob, psm = '6') {
    await worker.setParameters({
      tessedit_pageseg_mode: psm,
      preserve_interword_spaces: '1'
    });
    const { data } = await worker.recognize(blob);
    return { text: data.text || '', confidence: data.confidence || 0 };
  }

  function scoreParsedOCRBundle(parsed) {
    if (!parsed) return 0;
    let score = 0;
    const name = String(parsed?.offender?.name || "").trim();
    const dob = String(parsed?.offender?.dob || "").trim();
    const address = String(parsed?.offender?.address || "").trim();
    const phone = String(parsed?.offender?.phone || "").trim();
    const licenseClass = String(parsed?.license?.licenseClass || "").trim();
    const expires = String(parsed?.license?.expires || "").trim();
    const rego = String(parsed?.vehicle?.rego || "").trim();

    if (name) score += name.split(/\s+/).length >= 2 ? 3 : 2;
    if (dob) score += 2;
    if (address) score += 2;
    if (phone) score += 1;
    if (licenseClass) score += 1;
    if (expires) score += 1;
    if (rego) score += 1;
    return score;
  }

  
  function mergeParsedOCR(base, candidate) {
    if (!candidate) return base;
    if (!base) return deepClone(candidate);

    const out = deepClone(base);

    const cleanText = (v) => String(v == null ? '' : v).trim();
    const isDateLike = (v) => /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/.test(cleanText(v));
    const yearFromDate = (v) => {
      const m = cleanText(v).match(/(\d{2,4})$/);
      if (!m) return 0;
      let y = parseInt(m[1], 10);
      if (y < 100) y += 2000;
      return y;
    };

    const scoreField = (key, value) => {
      const s = cleanText(value);
      if (!s) return 0;
      const u = s.toUpperCase();
      switch (key) {
        case 'name':
        case 'owner': {
          if (/PENDING PAPERWORK|DRIVER LICEN[CS]E|VICTORIA|VICROADS|CRIMTRAC/.test(u)) return 0.2;
          let score = s.split(/\s+/).length >= 2 ? 3.2 : 2.2;
          if (/[A-Z][a-z]+(?:[\s'\-][A-Z][a-z]+)/.test(s)) score += 1.2;
          if (/\d/.test(s)) score -= 1.5;
          return score;
        }
        case 'dob':
          if (!isDateLike(s)) return 0.4;
          return yearFromDate(s) >= 1900 && yearFromDate(s) <= 2026 ? 4 : 2.5;
        case 'expires':
          if (!isDateLike(s)) return 0.6;
          return yearFromDate(s) >= 2020 ? 4 : 2.5;
        case 'rego': {
          let score = /^[A-Z0-9 \-]{3,12}$/i.test(s) ? 3 : 1;
          if (/[A-Z]/i.test(s)) score += 0.8;
          if (/\d/.test(s)) score += 0.8;
          if (/REGO|REGISTRATION|PLATE/.test(u)) score -= 1.2;
          return score;
        }
        case 'licenseClass':
          return /^[CRHWL ]{1,20}$/i.test(s) ? 3.5 : 1;
        case 'sex':
          return /^[MFX]$/i.test(s) ? 3 : 0.5;
        case 'phone':
          return s.replace(/\D/g, '').length >= 4 ? 2.8 : 0.7;
        case 'address': {
          let score = s.length >= 6 ? 2 : 0.5;
          if (/\d/.test(s)) score += 0.8;
          if (/\b(ST|STREET|RD|ROAD|AVE|AVENUE|DR|DRIVE|BLVD|LANE|LN|HWY|HIGHWAY|WAY|COURT|CT|PLACE|PL|UNIT|CELL)\b/i.test(s)) score += 1.2;
          if (/DRIVER LICEN[CS]E|VICTORIA|VICROADS/.test(u)) score -= 1.5;
          return score;
        }
        case 'registered':
        case 'stolen':
        case 'suspended':
        case 'wanted':
        case 'bail':
        case 'mentalHealth':
        case 'violencePolice':
        case 'violence':
        case 'possWeap':
        case 'weaponLongarm':
        case 'weaponHandgun':
        case 'concealCarry':
        case 'firearmProhibOrder':
          return /^(YES|NO)$/i.test(s) ? 3 : 0.5;
        case 'model':
        case 'colour':
          return s.length >= 2 ? 2.4 : 0.5;
        default:
          return Math.min(3, 0.6 + (s.length / 12));
      }
    };

    const betterValue = (key, current, incoming) => {
      const inClean = cleanText(incoming);
      if (!inClean) return current;
      const curClean = cleanText(current);
      if (!curClean) return incoming;
      const currentScore = scoreField(key, current);
      const incomingScore = scoreField(key, incoming);
      return incomingScore > (currentScore + 0.35) ? incoming : current;
    };

    const mergeSection = (target, source) => {
      if (!target || !source) return;
      Object.keys(source).forEach((key) => {
        target[key] = betterValue(key, target[key], source[key]);
      });
    };

    mergeSection(out.offender, candidate.offender);
    mergeSection(out.meta, candidate.meta);
    mergeSection(out.license, candidate.license);
    mergeSection(out.vehicle, candidate.vehicle);

    const officerSet = new Set((out.officerNames || []).map(x => String(x || '').trim().toUpperCase()).filter(Boolean));
    for (const name of (candidate.officerNames || [])) {
      const clean = String(name || '').trim();
      const key = clean.toUpperCase();
      if (clean && !officerSet.has(key)) {
        out.officerNames.push(clean);
        officerSet.add(key);
      }
    }

    const itemSet = new Set((out.itemLines || []).map(x => String(x || '').trim().toUpperCase()).filter(Boolean));
    for (const line of (candidate.itemLines || [])) {
      const clean = String(line || '').trim();
      const key = clean.toUpperCase();
      if (clean && !itemSet.has(key)) {
        out.itemLines.push(clean);
        itemSet.add(key);
      }
    }

    return out;
  }

  async function createOCRWorker(logger) {
    const options = {
      logger,
      workerPath: `${OCR_ASSET_BASE}/worker.min.js`,
      corePath: `${OCR_ASSET_BASE}/tesseract-core.wasm.js`,
      langPath: OCR_LANG_BASE
    };

    let lastError = null;

    if (window.Tesseract && typeof window.Tesseract.createWorker === "function") {
      try {
        return await window.Tesseract.createWorker("eng", 1, options);
      } catch (e) {
        lastError = e;
      }

      try {
        const worker = await window.Tesseract.createWorker(options);
        if (typeof worker.loadLanguage === "function") await worker.loadLanguage("eng");
        if (typeof worker.initialize === "function") await worker.initialize("eng");
        return worker;
      } catch (e) {
        lastError = e;
      }
    }

    throw lastError || new Error("Unable to start OCR worker");
  }

  async function runRegionalOCRPasses(worker, originalBlob) {
    const img = await blobToImage(originalBlob);
    const ratio = img.width && img.height ? img.width / img.height : 1;
    const landscape = ratio >= 1.3;

    const regions = landscape
      ? [
          { label: "LEFT PANEL", rect: { x: 0.00, y: 0.10, w: 0.58, h: 0.82 }, scale: 2.2, psm: "6" },
          { label: "LEFT CENTRE", rect: { x: 0.00, y: 0.18, w: 0.50, h: 0.60 }, scale: 2.5, psm: "6" },
          { label: "CENTRE PANEL", rect: { x: 0.10, y: 0.08, w: 0.80, h: 0.82 }, scale: 2.0, psm: "11" },
          { label: "LOWER LEFT", rect: { x: 0.00, y: 0.46, w: 0.58, h: 0.38 }, scale: 2.1, psm: "6" }
        ]
      : [
          { label: "MAIN PANEL", rect: { x: 0.04, y: 0.06, w: 0.92, h: 0.88 }, scale: 2.2, psm: "6" },
          { label: "UPPER PANEL", rect: { x: 0.04, y: 0.04, w: 0.92, h: 0.54 }, scale: 2.3, psm: "6" }
        ];

    let best = null;
    for (const region of regions) {
      const cropped = await cropBlobFromImageBlob(originalBlob, region.rect, { scale: region.scale || 2 });
      const processed = await preprocessImage(cropped);
      const result = await recognizeWithWorker(worker, processed, region.psm || "6");
      const text = postProcessOCR(result.text || "");
      const parsed = parseOCR(text);
      const score = scoreParsedOCRBundle(parsed) + ((result.confidence || 0) / 100);
      if (!best || score > best.score) {
        best = { label: region.label, text, parsed, score };
      }
    }
    return best;
  }

  async function detectAndParseLicenceFromImage(worker, originalBlob) {
    const candidateRects = [
      { x: 0.00, y: 0.20, w: 0.42, h: 0.52 },
      { x: 0.00, y: 0.16, w: 0.40, h: 0.46 },
      { x: 0.00, y: 0.26, w: 0.44, h: 0.50 },
      { x: 0.00, y: 0.32, w: 0.44, h: 0.44 },
      { x: 0.02, y: 0.18, w: 0.34, h: 0.44 }
    ];
    let best = null;

    for (const rect of candidateRects) {
      const leftBlob = await cropBlobFromImageBlob(originalBlob, rect, { scale: 2 });
      const zoneTop = await cropBlobFromImageBlob(leftBlob, { x: 0.02, y: 0.00, w: 0.73, h: 0.42 }, { scale: 2 });
      const zoneMid = await cropBlobFromImageBlob(leftBlob, { x: 0.00, y: 0.40, w: 0.72, h: 0.22 }, { scale: 2 });
      const zoneBottom = await cropBlobFromImageBlob(leftBlob, { x: 0.00, y: 0.60, w: 0.62, h: 0.18 }, { scale: 2 });

      const [t1, t2, t3] = await Promise.all([
        recognizeWithWorker(worker, zoneTop, '6'),
        recognizeWithWorker(worker, zoneMid, '6'),
        recognizeWithWorker(worker, zoneBottom, '7')
      ]);
      const parsed = parseLicenceZoneText({ top: t1.text, middle: t2.text, bottom: t3.text });
      const confBonus = ((t1.confidence + t2.confidence + t3.confidence) / 3) / 100;
      const totalScore = parsed.score + confBonus;
      if (!best || totalScore > best.totalScore) {
        best = { parsed, rect, totalScore, text: [t1.text, t2.text, t3.text].join('\n') };
      }
    }
    return best;
  }

  async function preprocessImage(blob) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        
        // ── Step 1: Upscale small images ──────────────────────────────
        // Tesseract needs ~300 DPI; screenshots are 72-96 DPI.
        // Upscaling 2-3x is the single biggest accuracy improvement.
        const MIN_DIM = 1200;
        let scale = 1;
        const shortSide = Math.min(img.width, img.height);
        if (shortSide < MIN_DIM) {
          scale = Math.min(3, Math.ceil(MIN_DIM / shortSide));
        }
        const w = img.width * scale;
        const h = img.height * scale;
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = w;
        canvas.height = h;
        
        // Use better interpolation for upscale
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, w, h);
        
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;
        const pixelCount = w * h;
        
        // ── Step 2: Convert to grayscale + detect background ──────────
        const gray = new Uint8Array(pixelCount);
        let totalBrightness = 0;
        // Also build a histogram for Otsu's method
        const histogram = new Uint32Array(256);
        
        for (let i = 0; i < pixelCount; i++) {
          const off = i * 4;
          const r = data[off], g = data[off + 1], b = data[off + 2];
          // Weighted grayscale (Rec.601)
          const v = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
          gray[i] = v;
          totalBrightness += v;
          histogram[v]++;
        }
        const avgBrightness = totalBrightness / pixelCount;
        const isDarkBg = avgBrightness < 128;
        
        // ── Step 3: Invert if dark background ─────────────────────────
        if (isDarkBg) {
          for (let i = 0; i < pixelCount; i++) {
            gray[i] = 255 - gray[i];
          }
          // Rebuild histogram after inversion
          histogram.fill(0);
          for (let i = 0; i < pixelCount; i++) histogram[gray[i]]++;
        }
        
        // ── Step 4: Sharpen (3x3 unsharp-mask-like kernel) ───────────
        // This recovers thin strokes that blur during upscaling
        const sharpened = new Uint8Array(pixelCount);
        const strength = 0.5; // sharpen strength
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = y * w + x;
            if (x === 0 || x === w - 1 || y === 0 || y === h - 1) {
              sharpened[idx] = gray[idx];
              continue;
            }
            // 3x3 average of neighbours (excluding center)
            const neighbours = (
              gray[(y-1)*w + (x-1)] + gray[(y-1)*w + x] + gray[(y-1)*w + (x+1)] +
              gray[y*w + (x-1)]                           + gray[y*w + (x+1)] +
              gray[(y+1)*w + (x-1)] + gray[(y+1)*w + x] + gray[(y+1)*w + (x+1)]
            ) / 8;
            // Unsharp mask: pixel + strength * (pixel - blur)
            const val = gray[idx] + strength * (gray[idx] - neighbours);
            sharpened[idx] = Math.max(0, Math.min(255, Math.round(val)));
          }
        }
        
        // ── Step 5: Otsu's automatic threshold ───────────────────────
        // Finds the optimal threshold to separate text from background,
        // much better than the fixed 128 that was used before.
        const otsuHistogram = new Uint32Array(256);
        for (let i = 0; i < pixelCount; i++) otsuHistogram[sharpened[i]]++;
        
        let bestThresh = 128;
        let bestVariance = 0;
        let sumTotal = 0;
        for (let t = 0; t < 256; t++) sumTotal += t * otsuHistogram[t];
        
        let sumBG = 0, weightBG = 0;
        for (let t = 0; t < 256; t++) {
          weightBG += otsuHistogram[t];
          if (weightBG === 0) continue;
          const weightFG = pixelCount - weightBG;
          if (weightFG === 0) break;
          
          sumBG += t * otsuHistogram[t];
          const meanBG = sumBG / weightBG;
          const meanFG = (sumTotal - sumBG) / weightFG;
          const variance = weightBG * weightFG * (meanBG - meanFG) * (meanBG - meanFG);
          
          if (variance > bestVariance) {
            bestVariance = variance;
            bestThresh = t;
          }
        }
        
        // ── Step 6: Apply threshold → pure black/white ───────────────
        for (let i = 0; i < pixelCount; i++) {
          const bw = sharpened[i] > bestThresh ? 255 : 0;
          const off = i * 4;
          data[off] = bw;
          data[off + 1] = bw;
          data[off + 2] = bw;
          // alpha stays 255
        }
        
        // ── Step 7: Light morphological cleanup (close small gaps) ───
        // Single-pass dilate on black pixels to thicken thin strokes,
        // then erode back to preserve letter shapes. Helps with thin fonts.
        // Only do this if scale > 1 (upscaled images tend to have thin strokes)
        if (scale > 1) {
          // Dilate: if any neighbour is black, pixel becomes black
          const dilated = new Uint8Array(pixelCount);
          for (let i = 0; i < pixelCount; i++) dilated[i] = data[i * 4]; // copy R channel
          
          for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
              const idx = y * w + x;
              if (dilated[idx] === 0) continue; // already black
              // Check 4-connected neighbours for black
              if (dilated[(y-1)*w+x] === 0 || dilated[(y+1)*w+x] === 0 ||
                  dilated[y*w+(x-1)] === 0 || dilated[y*w+(x+1)] === 0) {
                const off = idx * 4;
                data[off] = 0; data[off+1] = 0; data[off+2] = 0;
              }
            }
          }
          
          // Erode: if any neighbour is white, pixel becomes white
          // This reverses the dilate to preserve letter shapes while
          // closing small gaps in thin strokes.
          const afterDilate = new Uint8Array(pixelCount);
          for (let i = 0; i < pixelCount; i++) afterDilate[i] = data[i * 4];
          
          for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
              const idx = y * w + x;
              if (afterDilate[idx] === 255) continue; // already white
              // Check 4-connected neighbours for white
              if (afterDilate[(y-1)*w+x] === 255 || afterDilate[(y+1)*w+x] === 255 ||
                  afterDilate[y*w+(x-1)] === 255 || afterDilate[y*w+(x+1)] === 255) {
                const off = idx * 4;
                data[off] = 255; data[off+1] = 255; data[off+2] = 255;
              }
            }
          }
        }
        
        ctx.putImageData(imageData, 0, 0);
        canvas.toBlob(resolve, 'image/png');
      };
      img.onerror = () => { URL.revokeObjectURL(img.src); reject(new Error("Image load failed")); };
      img.src = URL.createObjectURL(blob);
    });
  }

  // ── Post-process OCR text: fix common Tesseract mistakes ────────────
  function postProcessOCR(text) {
    if (!text) return "";
    let t = text;
    
    // Fix common LEAP/MDT label misreads
    t = t.replace(/\bNAME\s*[;:.,]\s*/gi, "NAME: ");
    t = t.replace(/\bDO[B8]\s*[;:.,]\s*/gi, "DOB: ");
    t = t.replace(/\bS[E3]X\s*[;:.,]\s*/gi, "SEX: ");
    t = t.replace(/\bHOME\s+ADDR\s*[;:.,]\s*/gi, "HOME ADDR: ");
    t = t.replace(/\bPHONE\s+N[O0]\s*[;:.,]\s*/gi, "PHONE NO: ");
    t = t.replace(/\bREG[I1]STRAT[I1]ON\s*[;:.,]\s*/gi, "REGISTRATION: ");
    t = t.replace(/\bMOD[E3]L\s*[;:.,]\s*/gi, "MODEL: ");
    t = t.replace(/\bCOLOU?R\s*[;:.,]\s*/gi, "COLOUR: ");
    t = t.replace(/\bOWN[E3]R\s*[;:.,]\s*/gi, "OWNER: ");
    t = t.replace(/\bST[O0]L[E3]N\s*[;:.,]\s*/gi, "STOLEN: ");
    t = t.replace(/\bSUSP[E3]ND[E3]D\s*[;:.,]\s*/gi, "SUSPENDED: ");
    t = t.replace(/\b[E3]XP[I1]R[E3]S?\s*[;:.,]\s*/gi, "EXPIRES: ");
    t = t.replace(/\bR[E3]G[I1]ST[E3]R[E3]D\s*[;:.,]\s*/gi, "REGISTERED: ");
    t = t.replace(/\bD[E3]M[E3]R[I1]T\s+PTS?\s*[;:.,]\s*/gi, "DEMERIT PTS: ");
    t = t.replace(/\bL[I1]C\s+CLASS\s*[;:.,]\s*/gi, "LIC CLASS: ");
    t = t.replace(/\bL[I1]C\s+STATUS\s*[;:.,]\s*/gi, "LIC STATUS: ");
    
    // Fix common character swaps in data values
    // "YE5" → "YES", "N0" → "NO" (in context of YES/NO fields)
    t = t.replace(/\b(STOLEN|SUSPENDED|REGISTERED)[:\s]+(YE5|YE\$)\b/gi, (m, label) => label + ": YES");
    t = t.replace(/\b(STOLEN|SUSPENDED|REGISTERED)[:\s]+(N0|NO)\b/gi, (m, label) => label + ": NO");
    
    // Victoria licence label fixes
    t = t.replace(/DR[I1]VER\s*L[I1]CEN[CS]E/gi, "DRIVER LICENCE");
    t = t.replace(/V[I1]CTOR[I1]A\s*AUSTRAL[I1]A/gi, "VICTORIA AUSTRALIA");
    t = t.replace(/L[I1]CEN[CS]E\s*EXP[I1]RY/gi, "LICENCE EXPIRY");
    t = t.replace(/DATE\s*[O0]F\s*B[I1]RTH/gi, "DATE OF BIRTH");
    t = t.replace(/L[I1]CEN[CS]E\s*TYPE/gi, "LICENCE TYPE");
    t = t.replace(/L[I1]CEN[CS]E\s*N[O0]\s*[.,]?\s*/gi, "LICENCE NO.");
    t = t.replace(/V[I1]C\s*R[O0]ADS/gi, "VIC ROADS");
    t = t.replace(/PEND[I1]NG\s*PAPERW[O0]RK/gi, "PENDING PAPERWORK");
    
    // "0" ↔ "O" in rego plates: context-dependent — leave for parseOCR to handle
    
    // Collapse excessive whitespace but preserve newlines
    t = t.replace(/[^\S\n]+/g, " ");
    // Remove lines that are just noise (single chars, dots, dashes)
    t = t.split("\n").map(l => l.trim()).filter(l => l.length > 1 || /[A-Z0-9]/i.test(l)).join("\n");
    
    return t;
  }


  // Event Binding (CONSOLIDATED)
  // ============================================================================
  // VEHICLE DEFECTS & MODIFICATIONS REFERENCE
  // ============================================================================
  



  const _defectHistory = []; // Stack of {reason: "line added", law: "line added"}

