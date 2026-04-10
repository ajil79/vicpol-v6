/* OCR parsing and merge helpers. */


  const OCR_ITEM_ALIASES = {
    "TACTICAL SMG": "Tactical SMG",
    "TACTICAL RIFLE": "Tactical Rifle",
    "SPECIAL CARBINE MK2": "Special Carbine MK2",
    "ASSAULT RIFLE MK2": "Assault Rifle MK2",
    "MARKSMAN PISTOL": "Marksman Pistol",
    "SNS PISTOL": "SNS Pistol",
    "HEAVY BULLET PROOF VEST": "Heavy Bulletproof Vest",
    "HEAVY BULLETPROOF VEST": "Heavy Bulletproof Vest",
    "LIGHT BULLET PROOF VEST": "Light Bulletproof Vest",
    "LIGHT BULLETPROOF VEST": "Light Bulletproof Vest",
    "MOBILE PHONE": "Mobile Phone",
    "DIRTY MONEY": "Dirty Money",
    "BANK CARD": "Principal Bank Card",
    "PRINCIPAL BANK CARD": "Principal Bank Card",
    "CONTRACT TABLET": "Contract Tablet",
    "SPOOFING CARD": "Spoofing Card",
    "PINK/BLACK BANDANA": "Pink/Black Bandana",
    "ZAILRIDD BANDANA": "Zailridd Bandana",
    "PINK MOBILE PHONE": "Pink Mobile Phone",
    "BULLET PROOF VEST": "Bulletproof Vest"
  };

  function cleanOcrLine(line) {
    return String(line || '')
      .replace(/[_|]+/g, ' ')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normaliseInventoryCandidate(line) {
    return cleanOcrLine(line)
      .replace(/\b\d+(?:\.\d+)?\s*kg\b/gi, ' ')
      .replace(/\b\d+(?:,\d{3})*x\b/gi, ' ')
      .replace(/\b\d+x\b/gi, ' ')
      .replace(/\b(?:Durability|Ammo|Weapon Age|Repair Count|Components|Serial number|Ammo type)\b.*$/i, ' ')
      .replace(/^[^A-Z0-9]+/i, '')
      .replace(/[^A-Z0-9 .\/\-]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function titleCaseLoose(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/(^|[\s'\-\/])([a-z])/g, (_, sep, ch) => sep + ch.toUpperCase())
      .replace(/\bSmg\b/g, 'SMG')
      .replace(/\bMk2\b/g, 'MK2')
      .replace(/\bNos\b/g, 'NOS');
  }

  function bestCatalogItemMatch(line) {
    const src = normaliseInventoryCandidate(line).toUpperCase();
    if (!src || src.length < 3) return '';
    const catalogue = Array.isArray(window.ITEM_CATALOG) ? window.ITEM_CATALOG : [];
    const candidates = [];
    catalogue.forEach(item => candidates.push(item.name));
    Object.keys(OCR_ITEM_ALIASES).forEach(alias => candidates.push(alias));

    const compact = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const diceScore = (a, b) => {
      const aa = compact(a), bb = compact(b);
      if (!aa || !bb) return 0;
      if (aa === bb) return 1;
      if (aa.length < 2 || bb.length < 2) return aa === bb ? 1 : 0;
      const counts = new Map();
      for (let i = 0; i < aa.length - 1; i++) {
        const bg = aa.slice(i, i + 2);
        counts.set(bg, (counts.get(bg) || 0) + 1);
      }
      let overlap = 0;
      for (let i = 0; i < bb.length - 1; i++) {
        const bg = bb.slice(i, i + 2);
        const count = counts.get(bg) || 0;
        if (count > 0) {
          overlap += 1;
          counts.set(bg, count - 1);
        }
      }
      return (2 * overlap) / ((aa.length - 1) + (bb.length - 1));
    };

    let bestName = '';
    let bestScore = 0;
    const srcWords = src.split(/\s+/).filter(Boolean);

    for (const rawName of candidates) {
      const displayName = OCR_ITEM_ALIASES[rawName.toUpperCase()] || rawName;
      const tgt = String(rawName || '').toUpperCase();
      if (!tgt) continue;
      let score = 0;
      if (src === tgt) score = 10;
      else if (src.includes(tgt) || tgt.includes(src)) score = 8;
      else {
        const tgtWords = tgt.split(/\s+/).filter(Boolean);
        const overlap = tgtWords.filter(word => srcWords.includes(word)).length;
        score = overlap * 2;
        if (overlap >= 2) score += 2;
        score += diceScore(src, tgt) * 5.5;
      }
      if (/AMMO/i.test(tgt) && /AMMO/i.test(src)) score += 1;
      if (/VEST/i.test(tgt) && /VEST/i.test(src)) score += 1;
      if (/PHONE/i.test(tgt) && /PHONE/i.test(src)) score += 1;
      if (score > bestScore) {
        bestScore = score;
        bestName = displayName;
      }
    }

    return bestScore >= 4 ? bestName : '';
  }

  function extractInventoryItemLines(lines) {
    const out = [];
    const seen = new Set();
    const push = (value) => {
      const clean = cleanOcrLine(value);
      const key = clean.toUpperCase();
      if (!clean || seen.has(key)) return;
      seen.add(key);
      out.push(clean);
    };

    for (const rawLine of (lines || [])) {
      const line = cleanOcrLine(rawLine);
      if (!line) continue;
      if (/(NAME|DOB|SEX|HOME\s*ADDR|HOMEADDR|PHONE\s*NO|PHONENO|LIC\s*CLASS|UC\s*CLASS|LIC\s*STATUS|UC\s*STATUS|UCSTATUS|EXPIRES|CONDITIONS|DEMERIT\s*PTS|WANTED|BAIL|GANG\s*AFF|VIOLENCE\s*POLICE|VIOLENCE|POS\s*WEAP|WEAPON\s*LONGARM|HANDGUN|CONCEAL\s*CARRY|F\/ARM\s*PROHIB\s*ORDER|ROAD\s*TRAFFIC\s*AUTHORITY|LEAP\s*DATABASE\s*ENTRY)/i.test(line)) continue;
      const direct = bestCatalogItemMatch(line);
      if (direct) {
        push(direct);
        continue;
      }
      const parts = line.split(/\s{2,}|\|/g).map(normaliseInventoryCandidate).filter(Boolean);
      for (const part of parts) {
        const hit = bestCatalogItemMatch(part);
        if (hit) push(hit);
      }
    }
    return out;
  }

  function parseWeaponCardText(rawText) {
    const text = String(rawText || '').replace(/\r/g, '');
    if (!/Durability\s*[:.]|Ammo\s*[:.]|Serial\s*number\s*[:.]/i.test(text)) return null;
    const lines = text.split(/\n+/).map(cleanOcrLine).filter(Boolean);
    const nonMeta = lines.filter(line => !/^[^A-Za-z]*(Durability|Ammo|Ammo type|Serial number|Components|Weapon Age|Repair Count)\s*[:.]/i.test(line));
    const rawName = nonMeta.find(line => /[A-Za-z]/.test(line)) || '';
    const itemName = bestCatalogItemMatch(rawName) || titleCaseLoose(rawName);
    const serial = (text.match(/Serial\s*number\s*[:.]\s*([A-Z0-9]{6,})/i) || [])[1] || '';
    const ammo = (text.match(/Ammo\s*[:.]\s*(\d{1,5})/i) || [])[1] || '';
    const ammoTypeRaw = (text.match(/Ammo\s*type\s*[:.]\s*([^\n]+)/i) || [])[1] || '';
    const ammoType = bestCatalogItemMatch(ammoTypeRaw) || cleanOcrLine(ammoTypeRaw).trim();
    const componentsRaw = (text.match(/Components\s*[:.]\s*([^\n]+)/i) || [])[1] || '';
    const components = cleanOcrLine(componentsRaw).split(/,\s*/).map(bestCatalogItemMatch).filter(Boolean);
    const itemLines = [];
    if (itemName) itemLines.push(serial ? `${itemName} SN: ${serial}` : itemName);
    if (ammoType) itemLines.push(ammo ? `${ammoType} x${ammo}` : ammoType);
    components.forEach(c => itemLines.push(c));
    return { name: itemName, serial, ammo, ammoType, components, itemLines };
  }

  function parseDrugResultText(rawText) {
    const text = String(rawText || '');
    const m = text.match(/Result\s+indicated\s*[:.]\s*(POSITIVE|NEGATIVE)/i);
    return m ? m[1].toUpperCase() : '';
  }

  function parseOCR(text) {
    const raw = String(text || '').replace(/\r/g, '');
    const cleanedRaw = raw.split('\n').map(cleanOcrLine).filter(Boolean)
      .filter(l => !/^(PENDING\s+PAPERWORK|NATIONAL\s+CRIME\s+CHECK|CRIMTRAC)$/i.test(l));
    const upperLines = cleanedRaw.map(l => l.toUpperCase());
    const upper = upperLines.join('\n');

    const normaliseBool = (v) => {
      const s = String(v || '').toUpperCase().replace(/[^A-Z0-9\- ]/g, '').trim();
      if (!s) return '';
      if (/YES/.test(s)) return /SHORT TERM/.test(s) ? 'YES - SHORT TERM' : 'YES';
      if (/NO|N0/.test(s)) return 'NO';
      return '';
    };
    const normaliseDate = (v) => {
      const m = String(v || '').replace(/\s+/g, ' ').match(/\b\d{1,4}[\-\/]\d{1,2}[\-\/]\d{1,4}(?:\s+[0-9:]+\s*(?:AM|PM|HRS)?)?/i);
      return m ? m[0].trim() : String(v || '').replace(/\s+/g, ' ').trim();
    };
    const smartTitle = (v) => String(v || '').toLowerCase().replace(/(^|[\s'\-])([a-z])/g, (_, sep, ch) => sep + ch.toUpperCase()).replace(/\bMrc\b/g, 'MRC').replace(/\bSmg\b/g, 'SMG');
    const flipName = (name) => {
      const s = String(name || '').trim().replace(/\s+/g, ' ');
      if (!s) return '';
      if (s.includes(',')) {
        const [last, first] = s.split(',', 2);
        return smartTitle(`${String(first || '').trim()} ${String(last || '').trim()}`.trim());
      }
      return smartTitle(s);
    };
    const findLabelValue = (labels, opts = {}) => {
      const variants = Array.isArray(labels) ? labels : [labels];
      const sameLine = opts.sameLine !== false;
      const nextLine = opts.nextLine !== false;
      const valuePattern = opts.valuePattern || /(.+)/;
      const clean = opts.clean || (v => String(v || '').trim());
      for (let i = 0; i < upperLines.length; i++) {
        const lineU = upperLines[i];
        for (const label of variants) {
          const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
          if (sameLine) {
            const re = new RegExp(`(?:^|\\b)${escaped}[\\s:;.,-]*${valuePattern.source}`, 'i');
            const m = lineU.match(re);
            if (m && m[1]) {
              const value = clean(cleanedRaw[i].slice(m.index + m[0].length - m[1].length));
              if (value) return value;
            }
          }
          if (nextLine && new RegExp(`(?:^|\\b)${escaped}(?:$|[\\s:;.,-]*$)`, 'i').test(lineU)) {
            const next = clean(cleanedRaw[i + 1] || '');
            if (next) return next;
          }
        }
      }
      return '';
    };
    const findInlineField = (label, stopLabels = []) => {
      for (let i = 0; i < cleanedRaw.length; i++) {
        const line = cleanedRaw[i];
        const upperLine = upperLines[i];
        const idx = upperLine.indexOf(label.toUpperCase());
        if (idx === -1) continue;
        let tail = line.slice(idx + label.length).replace(/^[\s:;.,-]+/, '').trim();
        for (const stop of stopLabels) {
          const stopPattern = String(stop || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
          const re = new RegExp(`\\s+${stopPattern}\\b`, 'i');
          const m = tail.match(re);
          if (m) tail = tail.slice(0, m.index).trim();
        }
        if (tail) return tail;
      }
      return '';
    };

    const officerNames = [];
    for (const l of cleanedRaw) {
      const u = l.toUpperCase();
      if (looksLikeOfficerLine(u)) {
        const nameOnly = extractOfficerName(l);
        if (nameOnly) officerNames.push(nameOnly);
      }
    }

    const inventoryHits = extractInventoryItemLines(cleanedRaw);
    const weaponCard = parseWeaponCardText(raw);
    const drugResult = parseDrugResultText(raw);

    let leapName = findLabelValue(['NAME'], { valuePattern: /([A-Z][A-Z ,'.\-]{2,})/, clean: v => String(v || '').replace(/[^A-Z ,'.\-]/gi, '').trim() });
    let leapDob = normaliseDate(findLabelValue(['DOB', 'D O B'], { valuePattern: /([0-9]{1,4}[\-\/][0-9]{1,2}[\-\/][0-9]{1,4})/ }));
    let leapSex = findLabelValue(['SEX', 'S E X'], { valuePattern: /([MFX])/i }).toUpperCase();
    let leapAddress = findLabelValue(['HOME ADDR', 'HOME ADDRESS', 'HOMEADDR', 'ADDRESS'], { valuePattern: /([A-Z0-9 ,'.\-]{3,})/, clean: v => String(v || '').trim() });
    let leapPhone = findLabelValue(['PHONE NO', 'PHONENO', 'PHONE NUMBER', 'PHONE'], { valuePattern: /([0-9][0-9 ]*)/, clean: v => String(v || '').replace(/\s+/g, '') });

    let vicName = '';
    let vicAddress = '';
    const licenceHeaderIndex = upperLines.findIndex(line => /DRIVER\s*LICEN[CS]E|VICTORIA\s+AUSTRALIA/i.test(line));
    if (licenceHeaderIndex >= 0) {
      const body = cleanedRaw.slice(licenceHeaderIndex, licenceHeaderIndex + 12);
      const useful = body.filter(line => !/^(DRIVER\s*LICEN[CS]E|VICTORIA\s+AUSTRALIA|LICEN[CS]E\s*NO\.?|VICROADS|NO PHOTO)$/i.test(line));
      const nameLine = useful.find(line => /[A-Z]/i.test(line) && !/\d/.test(line) && !/LICEN[CS]E TYPE|DATE OF BIRTH|EXPIRY/i.test(line));
      const addrLine = useful.find(line => /\d/.test(line) || /LOS SANTOS|VINEWOOD|DESERT|LAP|WAY|LANE|ROAD|HILLS|HOUSE|GUY/i.test(line));
      if (!leapName && nameLine) vicName = nameLine;
      if (!leapAddress && addrLine) vicAddress = addrLine;
      if (!leapDob) {
        const cardDates = useful.join(' ').match(/\b\d{2}[\-\/]\d{2}[\-\/]\d{4}\b/g) || [];
        if (cardDates.length) leapDob = cardDates[cardDates.length - 1];
      }
    }

    const outName = flipName(leapName || vicName);
    const outDob = leapDob;
    const outAddress = (leapAddress || vicAddress || '').replace(/\s+/g, ' ').trim().toUpperCase();
    const licClass = findInlineField('LIC CLASS', ['LIC STATUS']) || findInlineField('UC CLASS', ['LIC STATUS','UCSTATUS']) || findLabelValue(['LIC CLASS', 'UC CLASS', 'LICENCE TYPE'], { valuePattern: /([A-Z][A-Z ]{0,40})/, clean: v => String(v || '').trim() }) || (() => {
      const line = upperLines.find(x => /^([CRHWL]\s*){1,6}$/.test(x.replace(/\s+/g, ' ').trim()));
      return line ? line.replace(/\s+/g, ' ').trim() : '';
    })();
    const licStatus = (findInlineField('LIC STATUS', ['EXPIRES']) || findInlineField('UC STATUS', ['EXPIRES']) || findInlineField('UCSTATUS', ['EXPIRES']) || findLabelValue(['LIC STATUS', 'UC STATUS', 'UCSTATUS'], { valuePattern: /(CURRENT|EXPIRED|SUSPENDED)/i, clean: v => String(v || '').toUpperCase().trim() })).toUpperCase();
    let expires = (() => {
      const same = findLabelValue(['EXPIRES', 'LICENCE EXPIRY', 'LICENSE EXPIRY'], { valuePattern: /([0-9A-Z:\-\/ ]+(?:AM|PM|HRS)?)/i, clean: v => String(v || '').trim() });
      if (same) return normaliseDate(same);
      const dates = raw.match(/\b\d{2}[\-\/]\d{2}[\-\/]\d{4}(?:\s+[0-9:]+\s*(?:AM|PM|HRS)?)?/ig) || [];
      return dates.length ? normaliseDate(dates[0]) : '';
    })();
    const demeritPoints = (() => {
      const m = upper.match(/DEM[E3]R[I1]T\s+PTS?\s*[:;.,-]*\s*(\d+)/i);
      return m ? parseInt(m[1], 10) : 0;
    })();

    const itemLines = [];
    const pushItem = (value) => {
      const clean = cleanOcrLine(value);
      if (!clean) return;
      if (!itemLines.some(x => x.toUpperCase() === clean.toUpperCase())) itemLines.push(clean);
    };
    const weaponNameUpper = String(weaponCard?.name || '').toUpperCase();
    inventoryHits.filter(line => String(line || '').toUpperCase() !== weaponNameUpper).forEach(pushItem);
    (weaponCard?.itemLines || []).forEach(pushItem);

    return {
      offender: { name: outName, dob: outDob, sex: leapSex, address: outAddress, phone: leapPhone },
      meta: { enteredBy: findLabelValue(['ENTERED BY'], { valuePattern: /([A-Z0-9 .,'\/\-]+)/i }), unit: findLabelValue(['UNIT'], { valuePattern: /([A-Z0-9|\/ .,'\-]+)/i }), drugTest: drugResult },
      license: {
        demeritPoints, licenseStatus: licStatus, licenseClass: licClass, expires,
        wanted: normaliseBool(findLabelValue(['WANTED'], { valuePattern: /([A-Z0-9\- ]+)/i })),
        bail: normaliseBool(findLabelValue(['BAIL'], { valuePattern: /([A-Z0-9\- ]+)/i })),
        mentalHealth: normaliseBool(findLabelValue(['MEN. HEALTH', 'MENTAL HEALTH'], { valuePattern: /([A-Z0-9\- ]+)/i })),
        gangAffiliation: normaliseBool(findInlineField('GANG AFF', ['VIOLENCE POLICE', 'VIOLENCE', 'POS WEAP']) || findLabelValue(['GANG AFF', 'GANG AF'], { valuePattern: /(YES(?:\s*-\s*SHORT TERM)?|NO)/i })),
        violencePolice: normaliseBool(findInlineField('VIOLENCE POLICE', ['VIOLENCE']) || findLabelValue(['VIOLENCE POLICE'], { valuePattern: /(YES(?:\s*-\s*SHORT TERM)?|NO)/i })),
        violence: normaliseBool(findInlineField('VIOLENCE', ['WEAPON LICENCES']) || findLabelValue(['VIOLENCE'], { valuePattern: /(YES(?:\s*-\s*SHORT TERM)?|NO)/i })),
        possWeap: normaliseBool(findInlineField('POS WEAP', ['VIOLENCE']) || findLabelValue(['POS WEAP', 'POSS WEAP'], { valuePattern: /(YES(?:\s*-\s*SHORT TERM)?|NO)/i })),
        weaponLongarm: normaliseBool(findInlineField('WEAPON LONGARM', ['HANDGUN']) || findLabelValue(['WEAPON LONGARM', 'LONGARM'], { valuePattern: /(YES(?:\s*-\s*SHORT TERM)?|NO)/i })),
        weaponHandgun: normaliseBool(findInlineField('HANDGUN', ['CONCEAL CARRY PERMIT']) || findLabelValue(['HANDGUN'], { valuePattern: /(YES(?:\s*-\s*SHORT TERM)?|NO)/i })),
        concealCarry: normaliseBool(findInlineField('CONCEAL CARRY PERMIT', ['F/ARM PROHIB ORDER']) || findLabelValue(['CONCEAL CARRY PERMIT', 'CONCEAL CARRY'], { valuePattern: /(YES(?:\s*-\s*SHORT TERM)?|NO)/i })),
        firearmProhibOrder: normaliseBool(findInlineField('F/ARM PROHIB ORDER') || findInlineField('F ARM PROHIB ORDER') || findLabelValue(['F/ARM PROHIB ORDER', 'F ARM PROHIB ORDER'], { valuePattern: /(YES(?:\s*-\s*SHORT TERM)?|NO)/i }))
      },
      officerNames,
      itemLines,
      vehicle: {
        rego: String(findLabelValue(['REGISTRATION', 'REGO', 'LICENCE PLATE', 'LICENSE PLATE', 'PLATE'], { valuePattern: /([A-Z0-9 \-]{3,12})/i }) || '').toUpperCase().replace(/\s+/g, ' ').trim(),
        model: findLabelValue(['MODEL'], { valuePattern: /([A-Z0-9 \-]{2,40})/i }).toUpperCase(),
        colour: findLabelValue(['COLOUR', 'COLOR'], { valuePattern: /([A-Z0-9 \-]{2,30})/i }).toUpperCase(),
        registered: normaliseBool(findLabelValue(['REGISTERED'], { valuePattern: /([A-Z0-9\- ]+)/i })),
        expires: findLabelValue(['EXPIRES'], { valuePattern: /([0-9A-Z:\-\/ ]+(?:AM|PM|HRS)?)/i }).trim(),
        stolen: normaliseBool(findLabelValue(['STOLEN'], { valuePattern: /([A-Z0-9\- ]+)/i })),
        suspended: normaliseBool(findLabelValue(['SUSPENDED'], { valuePattern: /([A-Z0-9\- ]+)/i })),
        owner: flipName(findLabelValue(['OWNER', 'REGISTERED OWNER'], { valuePattern: /([A-Z][A-Z ,'.\-]{2,})/i }))
      },
      weaponCard
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


  async function runBlobThroughStyle(worker, blob, style = 'processed', psm = '6') {
    const processed = (style === 'processed') ? await preprocessImage(blob) : (typeof preprocessImageVariant === 'function' ? await preprocessImageVariant(blob, style, { scale: 1 }) : await preprocessImage(blob));
    return recognizeWithWorker(worker, processed, psm);
  }

  async function runRegionalOCRPasses(worker, originalBlob) {
    const img = await blobToImage(originalBlob);
    const ratio = img.width && img.height ? img.width / img.height : 1;
    const landscape = ratio >= 1.18;
    const regions = landscape ? [
      { label: 'LEAP FULL', rect: { x: 0.02, y: 0.04, w: 0.96, h: 0.92 }, scale: 2.1, psm: '6', styles: ['green', 'darkpanel', 'adaptive'] },
      { label: 'LEFT LICENCE / PANEL', rect: { x: 0.00, y: 0.12, w: 0.54, h: 0.76 }, scale: 2.2, psm: '6', styles: ['licensecard', 'adaptive', 'threshold'] },
      { label: 'INVENTORY FULL', rect: { x: 0.00, y: 0.00, w: 1.00, h: 1.00 }, scale: 2.0, psm: '11', styles: ['inventory', 'adaptive', 'threshold'] },
      { label: 'OVERLAY DETAIL', rect: { x: 0.08, y: 0.05, w: 0.62, h: 0.54 }, scale: 2.4, psm: '6', styles: ['hovercard', 'darkpanel', 'adaptive'] },
      { label: 'RESULT BANNER', rect: { x: 0.00, y: 0.00, w: 0.50, h: 0.24 }, scale: 2.8, psm: '7', styles: ['banner', 'threshold', 'invert'] }
    ] : [
      { label: 'LICENCE CARD', rect: { x: 0.00, y: 0.00, w: 1.00, h: 1.00 }, scale: 2.5, psm: '6', styles: ['licensecard', 'adaptive', 'threshold'] },
      { label: 'DETAIL CARD', rect: { x: 0.00, y: 0.00, w: 1.00, h: 1.00 }, scale: 2.8, psm: '6', styles: ['hovercard', 'darkpanel', 'adaptive'] },
      { label: 'RESULT BANNER', rect: { x: 0.00, y: 0.00, w: 1.00, h: 1.00 }, scale: 3.0, psm: '7', styles: ['banner', 'threshold', 'invert'] }
    ];
    let best = null;
    for (const region of regions) {
      const cropped = await cropBlobFromImageBlob(originalBlob, region.rect, { scale: region.scale || 2 });
      for (const style of (region.styles || ['processed'])) {
        const result = await runBlobThroughStyle(worker, cropped, style, region.psm || '6');
        const text = postProcessOCR(result.text || '');
        const parsed = parseOCR(text);
        const score = scoreParsedOCRBundle(parsed) + ((result.confidence || 0) / 100) + ((parsed.itemLines || []).length * 0.6);
        if (!best || score > best.score) best = { label: `${region.label} • ${style}`, text, parsed, score };
      }
    }
    return best;
  }

  async function detectAndParseLicenceFromImage(worker, originalBlob) {
    const candidateRects = [
      { x: 0.00, y: 0.00, w: 1.00, h: 1.00 },
      { x: 0.00, y: 0.16, w: 0.46, h: 0.58 },
      { x: 0.00, y: 0.12, w: 0.52, h: 0.64 },
      { x: 0.00, y: 0.22, w: 0.44, h: 0.52 },
      { x: 0.02, y: 0.14, w: 0.42, h: 0.54 }
    ];
    let best = null;
    for (const rect of candidateRects) {
      const leftBlob = await cropBlobFromImageBlob(originalBlob, rect, { scale: 2.5 });
      const variants = [{ style: 'licensecard', blob: leftBlob }, { style: 'adaptive', blob: leftBlob }, { style: 'threshold', blob: leftBlob }];
      for (const variant of variants) {
        const baseBlob = (typeof preprocessImageVariant === 'function') ? await preprocessImageVariant(variant.blob, variant.style, { scale: 1 }) : await preprocessImage(variant.blob);
        const zoneTop = await cropBlobFromImageBlob(baseBlob, { x: 0.02, y: 0.00, w: 0.82, h: 0.46 }, { scale: 2.2 });
        const zoneMid = await cropBlobFromImageBlob(baseBlob, { x: 0.00, y: 0.36, w: 0.82, h: 0.24 }, { scale: 2.2 });
        const zoneBottom = await cropBlobFromImageBlob(baseBlob, { x: 0.00, y: 0.58, w: 0.72, h: 0.22 }, { scale: 2.2 });
        const [t1, t2, t3] = await Promise.all([recognizeWithWorker(worker, zoneTop, '6'), recognizeWithWorker(worker, zoneMid, '6'), recognizeWithWorker(worker, zoneBottom, '7')]);
        const parsed = parseLicenceZoneText({ top: t1.text, middle: t2.text, bottom: t3.text });
        const confBonus = ((t1.confidence + t2.confidence + t3.confidence) / 3) / 100;
        const totalScore = parsed.score + confBonus;
        if (!best || totalScore > best.totalScore) best = { parsed, rect, totalScore, text: [t1.text, t2.text, t3.text].join('\n') };
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

