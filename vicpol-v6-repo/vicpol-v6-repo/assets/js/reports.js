/* Report builders, output generators, autosave/drafts, report-specific helpers. */

  function buildPrelimLines() {
    const t = norm(state.prelimTime);
    const d = norm(state.prelimDate);
    const l = norm(state.prelimLocation);
    const lines = [];
    if (t) lines.push(`- Time: ${t}`);
    if (d) lines.push(`- Date: ${d}`);
    if (l) lines.push(`- Location: ${l}`);
    if (!lines.length) {
      lines.push("- Time: NIL");
      lines.push("- Date: NIL");
      lines.push("- Location: NIL");
    }
    return lines;
  }

  // Builds output lines for selected vehicle defects (separate section)
  function buildDefectsOutputLines() {
    if (!_defectHistory.length || sectionExcluded("defects")) return [];
    const lines = [];
    lines.push("VEHICLE DEFECTS IDENTIFIED:");
    _defectHistory.forEach((d, i) => {
      lines.push(`${i+1}. ${d.name} — ${d.desc}. ${d.reason}.`);
      lines.push(`   Legislation: ${d.law}`);
    });
    lines.push("");
    return lines;
  }

  // Traffic Warrant Generator
  function generateTrafficWarrant() {
    const L = [];
    const add = (s = "") => L.push(s);
    const tw = state.trafficWarrant;
    const s = (v) => norm(v);
    let dn = 0; // dynamic numbering for DETAILS
    
    const dt = getHeaderDateTime(tw.date, tw.time);
    const enteredBy = getHeaderEnteredBy();
    add(`DATE: ${dt} - TRAFFIC WARRANT - Entered by: ${enteredBy}`);
    const headerUnit = getHeaderUnit();
    if (headerUnit) add(`UNIT: ${headerUnit}`);
    add("DETAILS:");
    add("");
    
    const who = s(state.offender.name) || s(tw.owner) || "UNKNOWN";
    add(`(${++dn}) Outstanding Traffic Warrant for Arrest for ${who} - REGO ${s(tw.rego) ? "CONFIRMED" : "NOT CONFIRMED"}`);
    add("");
    
    if (!sectionExcluded("charges")) {
      const chargesNum = ++dn;
      add(`(${chargesNum}) List of Charges:`);
      if (norm(state.chargesList)) {
        ensureLines(state.chargesList).split("\n").forEach(x => {
          const clean = x.trim();
          if (clean) add(clean.startsWith('-') ? clean : `- ${clean}`);
        });
      } else {
        add("- NIL");
      }
      add("");
    
      if (!sectionExcluded("pins")) {
        add(`(${chargesNum}.1) PINs:`);
        if (norm(state.pinsList)) {
          ensureLines(state.pinsList).split("\n").forEach(x => {
            const clean = x.trim();
            if (clean) add(clean.startsWith('-') ? clean : `- ${clean}`);
          });
        } else {
          add("- NIL");
        }
        add("");
      }
    } else if (!sectionExcluded("pins")) {
      add(`(${++dn}) PINs:`);
      if (norm(state.pinsList)) {
        ensureLines(state.pinsList).split("\n").forEach(x => {
          const clean = x.trim();
          if (clean) add(clean.startsWith('-') ? clean : `- ${clean}`);
        });
      } else {
        add("- NIL");
      }
      add("");
    }
    
    if (!sectionExcluded("items")) {
      add(`(${++dn}) Confiscated Items:`);
      if (norm(state.itemsList)) {
        getLines(state.itemsList).forEach(x => add(`- ${x}`));
      } else {
        add("- NIL");
      }
      add("");
    }
    
    if (!sectionExcluded("officers")) {
      add(`(${++dn}) Officers involved:`);
      if (norm(state.officersList)) {
        getLines(state.officersList).forEach(x => add(`- ${getOfficerLineForPreview(x)}`));
      } else {
        add("- NIL");
      }
      add("");
    }
    
    if (!sectionExcluded("sentence")) {
      add(`(${++dn}) Sentence:`);
      if (norm(state.sentence)) {
        add(`- ${norm(state.sentence)}`);
      } else {
        add("- NIL");
      }
      add("");
    }
    
    if (!sectionExcluded("sentence") && norm(state.evidenceLocker)) {
      add(`(${++dn}) Evidence Locker Number:`);
      add(`- ${norm(state.evidenceLocker)}`);
      add("");
    }
    
    let rn = 0; // dynamic numbering for REPORT section
    if (!sectionExcluded("narrative")) {
      add("REPORT:");
      add(`(${++rn}) Preliminary Details:`);
      buildPrelimLines().forEach(x => add(x));
      if (s(tw.speed)) add(`- Speed Detected / Speed Limit: ${s(tw.speed)}`);
      add("");
    }
    
    add("- MELROADS Excerpt:");
    add("");
    add("=====================  MELROADS  ====================");
    add(`    REGISTRATION:        ${s(tw.rego) || "NIL"}`);
    add(`    MODEL:               ${s(tw.model) || "NIL"}`);
    add(`    COLOUR:              ${s(tw.colour) || "NIL"}`);
    add(`    REGISTERED:          ${s(tw.registered) || "NIL"}`);
    add(`    EXPIRES:             ${s(tw.regoExpires) || "NIL"}`);
    add("");
    add(`    STOLEN:              ${s(tw.stolen) || "NIL"}`);
    add(`    SUSPENDED:           ${s(tw.suspended) || "NIL"}`);
    add("");
    add("---------------------  OWNER DETAILS ---------------------------");
    add(`    OWNER:               ${s(tw.owner) || "NIL"}`);
    add("");
    
    add("- MDT Profile Excerpt:");
    add("LEAP DATABASE ENTRY:");
    add(`NAME: ${s(state.offender.name) || "NIL"}`);
    add(`DOB: ${s(state.offender.dob) || "NIL"}`);
    add(`SEX: ${s(state.offender.sex) || "NIL"}`);
    add(`ADD: ${s(state.offender.address) || "NIL"}`);
    add(`PH: ${s(state.offender.phone) || "NIL"}`);
    add("");
    
    add(`(${++rn}) Reason for issuing PIN:`);
    if (s(tw.reason)) {
      add(s(tw.reason));
    } else if (s(state.summary)) {
      add(s(state.summary));
    } else {
      add("(Add reason here)");
    }
    add("");
    
    add(`(${++rn}) Relevant Evidence:`);
    if (s(state.evidence)) {
      getLines(state.evidence).forEach(x => add(`- ${x}`));
    } else {
      add("- Vehicle mount dash camera footage or image;");
      if (state.trafficWarrant.failedIntercept) {
        add("- A failed attempt to intercept the vehicle was made due to the excessive speed and the risk it posed to public safety.");
      }
    }
    add("");
    // Actions required
    const suspH = s(tw.suspHours);
    const impD = s(tw.impoundDays);
    
    if (s(tw.actions)) {
      add(`(${++rn}) Actions required by processing officer:`);
      getLines(tw.actions).forEach(x => add(`- ${x}`));
      add("");
    } else if (suspH || impD) {
      add(`(${++rn}) Actions required by processing officer:`);
      if (suspH) {
        add(`- On the execution of this warrant the above driver is to have their license suspended for a period of ${suspH} hours due to exceeding their demerit threshold;`);
      }
      if (impD) {
        const fineRaw = s(tw.fineAmount);
        const finePart = fineRaw ? ` — Fine: $${Number(fineRaw).toLocaleString()}` : "";
        const appr = s(tw.approvedBy);
        const apprPart = appr ? ` — Approved by ${appr}` : "";
        if (/crush/i.test(impD)) {
          add(`- VEHICLE CRUSH ordered${apprPart};`);
        } else {
          add(`- On the execution of this warrant the above driver is to present the vehicle matching the MELROADS excerpt for impound for a period of ${impD}${finePart}${apprPart};`);
        }
      }
      add("");
    }
    
    // Legislation notes
    if (s(tw.legNotes)) {
      add(ensureLines(tw.legNotes));
    } else {
      add("*The vehicle was not reported stolen at time of the offence, as such the registered owner is liable for penalties under Section 2.4.1 of the Road Safety Act 2025 (The Act). If they were not the driver at the time of the offence, they may subsequently nominate the driver. If the owner refuses to or is unable to nominate the driver of the vehicle they have hindered police and committed an additional offence under Section 2.4.2 of The Act.");
      add("");
      add("In the event the owner of the vehicle was not the driver and/or it was not reported stolen and/or properly secured, the vehicle is still liable to be impounded under Sections 2.4.3 & 2.4.4 of The Act.*");
    }
    add("");
    
    add(`(${++rn}) Witnesses Interviewed:`);
    add("- N/A");
    add("");
    
    // Interview questions
    if (!sectionExcluded("interview") && norm(state.interviewQs)) {
      add(`(${++rn}) Interview Questions Outstanding:`);
      getLines(state.interviewQs).forEach(x => add(`- ${x}`));
      add("");
    } else {
      add(`(${++rn}) Interview Questions Outstanding:`);
      add("- N/A");
      add("");
    }
    
    add(`(${++rn}) If any questions Call:`);
    add("- NIL");
    add("");
    
    buildDefectsOutputLines().forEach(x => add(x));
    add("Signed,");
    add(norm(state.sigName) || "NIL");
    add(norm(state.sigRank) || "NIL");
    add(norm(state.sigDivision) || "NIL");
    
    return L.join("\n");
  }
  // VicPol Arrest Generator
  function generateVicPolArrest() {
    const L = [];
    const add = (s = "") => L.push(s);
    const sw = state.vicpolWarrant;
    const s = (v) => norm(v);
    const lines = (txt) => getLines(txt);
    let dn = 0;
    
    const who = s(sw.warrantName) || s(state.offender.name) || s(sw.owner) || "UNKNOWN";
    const dt = getHeaderDateTime();
    const enteredBy = getHeaderEnteredBy();
    const idStatus = s(sw.idStatus) || "UNCONFIRMED";
    const idLabel = idStatus === "CONFIRMED" ? "ID CONFIRMED" : "ID UNCONFIRMED";
    
    add(`DATE: ${dt} - ARREST WARRANT - Entered by: ${enteredBy}`);
    const headerUnit = getHeaderUnit();
    if (headerUnit) add(`UNIT: ${headerUnit}`);
    add("WARRANT DETAILS:");
    add(`(${++dn}) Outstanding Warrant for Arrest — ${who} (${idLabel} | REGO ${s(sw.rego) ? "CONFIRMED" : "NOT CONFIRMED"})`);
    if (!sectionExcluded("offender")) {
      add(`(${dn}.1) SUBJECT DETAILS:`);
      add(`NAME: ${who}`);
      add(`DOB: ${s(state.offender.dob) || "NIL"}`);
      add(`SEX: ${s(state.offender.sex) || "NIL"}`);
      add(`ADD: ${s(state.offender.address) || "NIL"}`);
      add(`PH: ${s(state.offender.phone) || "NIL"}`);
      add("");
    }
    
    if (!sectionExcluded("charges")) {
      add(`(${++dn}) List of Charges:`);
      if (norm(state.chargesList)) {
        ensureLines(state.chargesList).split("\n").forEach(x => {
          const clean = x.trim();
          if (clean) add(clean.startsWith('-') ? clean : `- ${clean}`);
        });
      } else {
        add("- NIL");
      }
      add("");
    }
    
    if (!sectionExcluded("pins")) {
      add(`(${++dn}) PINs:`);
      if (norm(state.pinsList)) {
        ensureLines(state.pinsList).split("\n").forEach(x => {
          const clean = x.trim();
          if (clean) add(clean.startsWith('-') ? clean : `- ${clean}`);
        });
      } else {
        add("- NIL");
      }
      add("");
    }
    
    if (!sectionExcluded("items")) {
      add(`(${++dn}) Confiscated Items:`);
      const citems = lines(state.itemsList);
      if (citems.length) {
        citems.forEach(x => add(`- ${x}`));
      } else {
        add("- NIL");
      }
      add("");
    }
    
    if (!sectionExcluded("officers")) {
      add(`(${++dn}) Officers Involved:`);
      const off = lines(state.officersList);
      if (off.length) {
        off.forEach(x => add(`- ${getOfficerLineForPreview(x)}`));
      } else {
        add("- NIL");
      }
      add("");
    }
    
    if (!sectionExcluded("sentence")) {
      add(`(${++dn}) Sentence:`);
      if (norm(state.sentence)) {
        add(`- ${norm(state.sentence)}`);
      } else {
        add("- NIL");
      }
      add("");
    }
    
    if (!sectionExcluded("sentence") && norm(state.evidenceLocker)) {
      add(`(${++dn}) Evidence Locker Number:`);
      add(`- ${norm(state.evidenceLocker)}`);
      add("");
    }
    
    let rn = 0;
    if (!sectionExcluded("narrative")) {
      add("REPORT:");
      add(`(${++rn}) Preliminary Details:`);
      buildPrelimLines().forEach(x => add(x));
      add("");
      
      add(`(${++rn}) Summary of Events:`);
      const narrative2 = s(state.summary) || s(sw.details) || "(Add details here)";
      add(narrative2);
      add("");
    }
    
    if (s(sw.rego)) {
      add("=====================  MELROADS  ====================");
      add(`    REGISTRATION:        ${s(sw.rego) || "NIL"}`);
      add(`    MODEL:               ${s(sw.model) || "NIL"}`);
      add(`    COLOUR:              ${s(sw.colour) || "NIL"}`);
      add(`    REGISTERED:          ${s(sw.registered) || "NIL"}`);
      add(`    EXPIRES:             ${s(sw.regoExpires) || "NIL"}`);
      add("");
      add(`    STOLEN:              ${s(sw.stolen) || "NO"}`);
      add(`    SUSPENDED:           ${s(sw.suspended) || "NO"}`);
      add("");
      add("---------------------  OWNER DETAILS ---------------------------");
      add(`    OWNER:               ${s(sw.owner) || "NIL"}`);
      add("");
      add("*The vehicle was not reported stolen at time of the offence, as such the registered owner is liable for penalties under Section 2.4.1 of the Road Safety Act 2025 (The Act). If they were not the driver at the time of the offence, they may subsequently nominate the driver. If the owner refuses to or is unable to nominate the driver of the vehicle they have hindered police and committed an additional offence under Section 2.4.2 of The Act.");
      add("");
      add("In the event the owner of the vehicle was not the driver and/or it was not reported stolen and/or properly secured, the vehicle is still liable to be impounded under Sections 2.4.3 & 2.4.4 of The Act.*");
      add("");
    }
    
    if (!sectionExcluded("narrative")) {
      add(`(${++rn}) Evidence Outstanding:`);
      const ev = lines(state.evidence);
      if (ev.length) {
        ev.forEach(x => add(`- ${x}`));
      } else {
        add("- NIL");
      }
      add("");
      add(`(${++rn}) Witnesses Interviewed:`);
      add("- N/A");
      add("");
    }

    if (!sectionExcluded("interview") && norm(state.interviewQs)) {
      add(`(${++rn}) Interview Questions Outstanding:`);
      lines(state.interviewQs).forEach(x => add(`- ${x}`));
      add("");
    }
    
    buildDefectsOutputLines().forEach(x => add(x));
    add("Signed,");
    add(norm(state.sigName) || "NIL");
    add(norm(state.sigRank) || "NIL");
    add(norm(state.sigDivision) || "Victoria Police");
    
    return L.join("\n");
  }

  // VicPol Warrant Questioning Generator (Clean Format) - v5.0
  // v50: Added sectionExcluded gates + dynamic section numbering
  function generateVicPolWarrant() {
    const L = [];
    const add = (s = "") => L.push(s);
    const sw = state.vicpolWarrant;
    const s = (v) => norm(v);
    const lines = (txt) => getLines(txt);
    let dn = 0; // dynamic numbering for WARRANT DETAILS
    
    const who = s(sw.warrantName) || s(state.offender.name) || s(sw.owner) || "UNKNOWN";
    const dt = getHeaderDateTime();
    const enteredBy = getHeaderEnteredBy();
    const idStatus = s(sw.idStatus) || "UNCONFIRMED";
    const idLabel = idStatus === "CONFIRMED" ? "ID CONFIRMED" : "ID UNCONFIRMED";
    
    add(`DATE: ${dt} - CRIMINAL WARRANT - Entered by: ${enteredBy}`);
    add("WARRANT DETAILS:");
    add(`(${++dn}) Outstanding Warrant for ${who} (${idLabel} | REGO ${s(sw.rego) ? "CONFIRMED" : "NOT CONFIRMED"})`);
    if (!sectionExcluded("offender")) {
      add(`(${dn}.1) SUBJECT DETAILS:`);
      add(`NAME: ${who}`);
      add(`DOB: ${s(state.offender.dob) || "NIL"}`);
      add(`SEX: ${s(state.offender.sex) || "NIL"}`);
      add(`ADD: ${s(state.offender.address) || "NIL"}`);
      add(`PH: ${s(state.offender.phone) || "NIL"}`);
      add("");
    }
    
    if (!sectionExcluded("charges")) {
      add(`(${++dn}) List of Charges:`);
      if (norm(state.chargesList)) {
        ensureLines(state.chargesList).split("\n").forEach(x => {
          const clean = x.trim();
          if (clean) add(clean.startsWith('-') ? clean : `- ${clean}`);
        });
      } else {
        add("- NIL");
      }
      add("");
    }
    
    if (!sectionExcluded("pins")) {
      add(`(${++dn}) PINs:`);
      if (norm(state.pinsList)) {
        ensureLines(state.pinsList).split("\n").forEach(x => {
          const clean = x.trim();
          if (clean) add(clean.startsWith('-') ? clean : `- ${clean}`);
        });
      } else {
        add("- NIL");
      }
      add("");
    }
    
    if (!sectionExcluded("items")) {
      add(`(${++dn}) Confiscated Items:`);
      const citems = lines(state.itemsList);
      if (citems.length) {
        citems.forEach(x => add(`- ${x}`));
      } else {
        add("- NIL");
      }
      add("");
    }
    
    if (!sectionExcluded("officers")) {
      add(`(${++dn}) Officers Involved:`);
      const off = lines(state.officersList);
      if (off.length) {
        off.forEach(x => add(`- ${getOfficerLineForPreview(x)}`));
      } else {
        add("- NIL");
      }
      add("");
    }
    
    if (!sectionExcluded("sentence")) {
      add(`(${++dn}) Sentence:`);
      if (norm(state.sentence)) {
        add(`- ${norm(state.sentence)}`);
      } else {
        add("- NIL");
      }
      add("");
    }
    
    let rn = 0; // dynamic numbering for REPORT section
    if (!sectionExcluded("narrative")) {
      add("REPORT:");
      add(`(${++rn}) Preliminary Details:`);
      buildPrelimLines().forEach(x => add(x));
      add("");
      
      add(`(${++rn}) Summary of Events:`);
      const narrative2 = s(state.summary) || s(sw.details) || "(Add details here)";
      add(narrative2);
      add("");
    }
    
    if (s(sw.rego)) {
      add("=====================  MELROADS  ====================");
      add(`    REGISTRATION:        ${s(sw.rego) || "NIL"}`);
      add(`    MODEL:               ${s(sw.model) || "NIL"}`);
      add(`    COLOUR:              ${s(sw.colour) || "NIL"}`);
      add(`    REGISTERED:          ${s(sw.registered) || "NIL"}`);
      add(`    EXPIRES:             ${s(sw.regoExpires) || "NIL"}`);
      add("");
      add(`    STOLEN:              ${s(sw.stolen) || "NO"}`);
      add(`    SUSPENDED:           ${s(sw.suspended) || "NO"}`);
      add("");
      add("---------------------  OWNER DETAILS ---------------------------");
      add(`    OWNER:               ${s(sw.owner) || "NIL"}`);
      add("");
      add("*The vehicle was not reported stolen at time of the offence, as such the registered owner is liable for penalties under Section 2.4.1 of the Road Safety Act 2025 (The Act). If they were not the driver at the time of the offence, they may subsequently nominate the driver. If the owner refuses to or is unable to nominate the driver of the vehicle they have hindered police and committed an additional offence under Section 2.4.2 of The Act.");
      add("");
      add("In the event the owner of the vehicle was not the driver and/or it was not reported stolen and/or properly secured, the vehicle is still liable to be impounded under Sections 2.4.3 & 2.4.4 of The Act.*");
      add("");
    }
    
    if (!sectionExcluded("narrative")) {
      add(`(${++rn}) Evidence Outstanding:`);
      const ev = lines(state.evidence);
      if (ev.length) {
        ev.forEach(x => add(`- ${x}`));
      } else {
        add("- NIL");
      }
      add("");
      add(`(${++rn}) Witnesses Interviewed:`);
      add("- N/A");
      add("");
    }

    if (!sectionExcluded("interview") && norm(state.interviewQs)) {
      add(`(${++rn}) Interview Questions Outstanding:`);
      lines(state.interviewQs).forEach(x => add(`- ${x}`));
      add("");
    }
    
    buildDefectsOutputLines().forEach(x => add(x));
    add("Signed,");
    add(norm(state.sigName) || "NIL");
    add(norm(state.sigRank) || "NIL");
    add(norm(state.sigDivision) || "Victoria Police");
    
    return L.join("\n");
  }

  // Bail Conditions Generator
  function generateBailConditions() {
    const L = [];
    const add = (s = "") => L.push(s);
    const bc = state.bailConditions;
    const s = (v) => norm(v);
    
    add("DETAILS:");
    add("(1) Conditions of Bail");
    add("");
    if (norm(state.offender.name)) {
      add(`SUBJECT:  ${norm(state.offender.name)}`);
      if (norm(state.offender.dob)) add(`DOB:      ${norm(state.offender.dob)}`);
      add("");
    }
    add("The offender cannot be charged with any indictable or non-indictable offences. (PINs are permissible.)");
    add("");
    add("If the offender is charged, their bail amount will be forfeited, and they will be found guilty instantly of their bail charges as well as the new charges without the opportunity to fight the charges in the Magistrates' Court of Victoria. They can appeal in the District Court without reason later on.");
    add("");
    add("The offender will receive an additional breach of bail charge if they are charged with any offence.");
    add("");
    add("(2) Court Procedures");
    add("");
    add("The police officer will book a time in the magistrates' court for the case.");
    add("");
    add("The offender is to assume the case will proceed unless notified otherwise.");
    add("");
    add("If the offender does not appear without informing a magistrate or the arresting officer, they will be charged with breach of bail, failure to attend, and their bail charges. An arrest warrant will be issued, which they cannot contest in magistrates' court. They can appeal in the District Court without reason later on.");
    add("");
    add("The magistrate will wait up to 15 minutes after the case has begun for the offender to appear. If the offender does not show up within this time, it will count as a non-appearance, and their bail amount will be forfeited.");
    add("");
    add("If the offender appears, they will receive their bail amount back in full.");
    add("");
    add("");
    add("REPORT:");
    add(`(1) Bail Amount: ${s(bc.bailAmount) || "NIL"}`);
    add("");
    add(`(2) Date and Time of interaction: ${s(bc.date) || "NIL"} ${s(bc.time) || "NIL"}`);
    add("");
    add("(3) List of Charges:");
    if (norm(state.chargesList)) {
      ensureLines(state.chargesList).split("\n").forEach(x => {
        const clean = x.trim();
        if (clean) add(clean.startsWith('-') ? clean : `- ${clean}`);
      });
    } else {
      add("- NIL");
    }
    add("");
    add("(4) PINs (Penalty Infringement Notices):");
    if (norm(state.pinsList)) {
      ensureLines(state.pinsList).split("\n").forEach(x => {
        const clean = x.trim();
        if (clean) add(`- ${clean}`);
      });
    } else {
      add("- NIL");
    }
    add("");
    buildDefectsOutputLines().forEach(x => add(x));
    add("Signed,");
    add(norm(state.sigName) || "NIL");
    add(norm(state.sigRank) || "NIL");
    add(norm(state.sigDivision) || "NIL");
    
    return L.join("\n");
  }

  // Field Contact Generator
  function generateFieldContact() {
    const L = [];
    const add = (s = "") => L.push(s);
    const fc = state.fieldContact;
    const who = norm(fc.name) || "UNKNOWN";
    add(`FIELD CONTACT REPORT — ${who}`);
    add("");
    let sn = 0;
    add(`(${++sn}) TYPE OF CONTACT:`);
    add(norm(fc.reason) || "N/A");
    add("");
    add(`(${++sn}) OFFICERS INVOLVED:`);
    const fcOff = ensureLines(state.officersList).split("\n").map(x => x.trim()).filter(Boolean);
    if (fcOff.length) fcOff.forEach(x => add(`- ${getOfficerLineForPreview(x)}`)); else add("- NIL");
    add("");
    let pn = 0;
    add(`(${++pn}) PRELIMINARY DETAILS:`);
    if (norm(fc.time)) add(`- Time: ${norm(fc.time)}`);
    if (norm(fc.date)) add(`- Date: ${norm(fc.date)}`);
    if (norm(fc.location)) add(`- Location: ${norm(fc.location)}`);
    if (norm(fc.dob)) add(`- DOB: ${norm(fc.dob)}`);
    if (norm(fc.phone)) add(`- Phone: ${norm(fc.phone)}`);
    if (!norm(fc.time) && !norm(fc.date) && !norm(fc.location) && !norm(fc.dob) && !norm(fc.phone)) add("- N/A");
    add("");
    add(`(${++pn}) SUMMARY OF EVENTS:`);
    add(norm(fc.summary) || "N/A");
    add("");
    if (norm(fc.notes)) {
      add(`(${++pn}) ADDITIONAL NOTES:`);
      add(norm(fc.notes));
      add("");
    }
    add("Signed,");
    add(norm(state.sigRank) || "NIL");
    add(norm(state.sigName) || "NIL");
    const div = norm(state.sigDivision);
    add(div ? `${div} | Melbourne Police` : "Melbourne Police");
    return L.join("\n");
  }

  // Search & Seizure Generator
  function generateSearchSeizure() {
    const L = [];
    const add = (s = "") => L.push(s);
    const ss = state.searchSeizure;

    const time = norm(ss.time) || norm(state.prelimTime) || "N/A";
    const date = norm(ss.date) || norm(state.prelimDate) || "N/A";
    const location = norm(ss.location) || norm(state.prelimLocation) || "N/A";
    const summary = norm(ss.summary) || norm(state.summary) || "N/A";
    const dt = getHeaderDateTime(date !== "N/A" ? date : "", time !== "N/A" ? time : "");
    const enteredBy = getHeaderEnteredBy();

    add(`DATE: ${dt} - SEARCH & SEIZURE - Entered by: ${enteredBy}`);
    const headerUnit = getHeaderUnit();
    if (headerUnit) add(`UNIT: ${headerUnit}`);
    add("DETAILS:");
    add(`PERSON DETAILS:`);
    add(`NAME: ${norm(ss.name) || "N/A"}`);
    add(`DOB: ${norm(ss.dob) || "N/A"}`);
    add(`PH: ${norm(ss.phone) || "N/A"}`);
    add(`TIME: ${time}`);
    add(`DATE: ${date}`);
    add(`LOC: ${location}`);
    add(`AUTHORITY: ${norm(ss.authority) || "N/A"}`);
    add("");

    add(`Reason for Search:`);
    add(norm(ss.reason) || "N/A");
    add("");

    add(`Search Summary:`);
    add(summary);
    add("");

    add("OFFICERS PRESENT:");
    const officers = ensureLines(state.officersList).split("\n").filter(Boolean);
    if (officers.length) {
      officers.forEach(o => add(`- ${getOfficerLineForPreview(o)}`));
    } else {
      add("- NIL");
    }
    add("");

    add("ITEMS SEIZED:");
    const items = ensureLines(state.itemsList).split("\n").filter(Boolean);
    if (items.length) {
      items.forEach(i => add(`- ${i}`));
    } else {
      add("- NIL");
    }
    add("");

    if (norm(state.chargesList)) {
      add("CHARGES LAID:");
      ensureLines(state.chargesList).split("\n").forEach(x => {
        const clean = x.trim();
        if (clean) add(clean.startsWith('-') ? clean : `- ${clean}`);
      });
      add("");
    }

    if (norm(state.sentence)) {
      add("SENTENCE:");
      add(`- ${norm(state.sentence)}`);
      add("");
    }

    if (norm(ss.notes)) {
      add(`Additional Notes:`);
      add(norm(ss.notes));
      add("");
    }

    if (norm(state.evidence)) {
      add("EVIDENCE:");
      ensureLines(state.evidence).split("\n").filter(Boolean).forEach(x => add(`- ${x}`));
      add("");
    }

    buildDefectsOutputLines().forEach(x => add(x));
    add("Signed,");
    add(norm(state.sigName) || "NIL");
    add(norm(state.sigRank) || "NIL");
    add(norm(state.sigDivision) || "NIL");

    return L.join("\n");
  }

  // Vehicle Inspection Report Generator
  function generateVehicleInspection() {
    const L = [];
    const add = (s = "") => L.push(s);

    const dt = getHeaderDateTime();
    const enteredBy = getHeaderEnteredBy();

    // Vehicle details from state-backed inspection card
    const vi = state.vehicleInspection || {};
    const rego = norm(vi.rego).toUpperCase();
    const make = norm(vi.make);
    const colour = norm(vi.colour);
    const driver = norm(vi.driver).toUpperCase();
    const location = norm(vi.location);
    const notes = norm(vi.notes);
    const vehicle = [colour, make].filter(Boolean).join(' ') || '[VEHICLE]';
    const cl = vicType ? VIC_CHECKLISTS[vicType] : null;

    add(`VEHICLE INSPECTION REPORT`);
    add(`${'─'.repeat(36)}`);
    add(`Date    : ${dt}`);
    add(`Officer : ${enteredBy}`);
    add(`Rego    : ${rego || '[REGO]'}`);
    add(`Vehicle : ${vehicle}`);
    add(`Driver  : ${driver || '[DRIVER]'}`);
    add(`Location: ${location || '[LOCATION]'}`);
    add("");

    if (cl) {
      const items = cl.items;
      const checked = items.filter(i => vicState[i.id] !== 'pending');
      const passed = items.filter(i => vicState[i.id] === 'pass');
      const failed = items.filter(i => vicState[i.id] === 'fail');
      const mandFails = items.filter(i => i.mandatory && vicState[i.id] === 'fail');
      const advisFails = items.filter(i => !i.mandatory && vicState[i.id] === 'fail');

      add(`CHECKLIST — ${cl.label.toUpperCase()}`);
      add(`${'─'.repeat(36)}`);
      items.forEach(item => {
        const s = vicState[item.id];
        const mark = s === 'pass' ? '✓' : s === 'fail' ? '✗' : '·';
        add(`${mark} ${item.mandatory ? '[M]' : '[A]'} ${item.label}`);
      });
      add("");

      if (checked.length === items.length) {
        const score = Math.round((passed.length / items.length) * 100);
        const pass = score >= 90 && mandFails.length === 0;
        add(`${'─'.repeat(36)}`);
        add(`SCORE   : ${score}% (${passed.length}/${items.length} passed)`);
        add(`OUTCOME : ${pass ? 'PASS — ROADWORTHY' : 'FAIL — DEFECT NOTICE REQUIRED'}`);
        if (failed.length) {
          add("");
          add("FAILED ITEMS:");
          mandFails.forEach(i => add(`  ✗ [MANDATORY] ${i.label}`));
          advisFails.forEach(i => add(`  ✗ [ADVISORY]  ${i.label}`));
        }
      } else {
        add(`(${checked.length}/${items.length} items checked — complete all to see result)`);
      }
    } else {
      add("[Select a vehicle class to begin checklist]");
    }

    if (notes) { add(""); add("OFFICER NOTES:"); add(notes); }

    add("");
    add("OFFICERS PRESENT:");
    const officers = ensureLines(state.officersList).split("\n").filter(Boolean);
    if (officers.length) {
      officers.forEach(o => add(`- ${getOfficerLineForPreview(o)}`));
    } else {
      add("- NIL");
    }

    add("");
    buildDefectsOutputLines().forEach(x => add(x));
    add("Signed,");
    add(norm(state.sigName) || "NIL");
    add(norm(state.sigRank) || "NIL");
    add(norm(state.sigDivision) || "NIL");

    return L.join("\n");
  }

  // Arrest Report Generator
  function generateArrestReport() {
    const L = [];
    const add = (s = "") => L.push(s);
    let dn = 0; // dynamic numbering for DETAILS
    
    const dt = getHeaderDateTime(state.prelimDate, state.prelimTime);
    const enteredBy = getHeaderEnteredBy();
    add(`DATE: ${dt} - ARREST REPORT - Entered by: ${enteredBy}`);
    const headerUnit = getHeaderUnit();
    if (headerUnit) add(`UNIT: ${headerUnit}`);
    add("DETAILS:");
    if (!sectionExcluded("offender")) {
      add(`(${++dn}) SUSPECT DETAILS:`);
      add(`NAME: ${norm(state.offender.name) || "NIL"}`);
      add(`DOB: ${norm(state.offender.dob) || "NIL"}`);
      add(`SEX: ${norm(state.offender.sex) || "NIL"}`);
      add(`ADD: ${norm(state.offender.address) || "NIL"}`);
      add(`PH: ${norm(state.offender.phone) || "NIL"}`);
      add("");
    }
    
    if (!sectionExcluded("charges")) {
      const chargesNum = ++dn;
      add(`(${chargesNum}) List of Charges:`);
      if (norm(state.chargesList)) {
        ensureLines(state.chargesList).split("\n").forEach(x => {
          const clean = x.trim();
          if (clean) add(clean.startsWith('-') ? clean : `- ${clean}`);
        });
      } else {
        add("- NIL");
      }
      add("");
    
      if (!sectionExcluded("pins")) {
        add(`(${chargesNum}.1) PINs:`);
        if (norm(state.pinsList)) {
          ensureLines(state.pinsList).split("\n").forEach(x => {
            const clean = x.trim();
            if (clean) add(clean.startsWith('-') ? clean : `- ${clean}`);
          });
        } else {
          add("- NIL");
        }
        add("");
      }
    } else if (!sectionExcluded("pins")) {
      add(`(${++dn}) PINs:`);
      if (norm(state.pinsList)) {
        ensureLines(state.pinsList).split("\n").forEach(x => {
          const clean = x.trim();
          if (clean) add(clean.startsWith('-') ? clean : `- ${clean}`);
        });
      } else {
        add("- NIL");
      }
      add("");
    }
    
    if (!sectionExcluded("items")) {
      add(`(${++dn}) Confiscated Items:`);
      if (norm(state.itemsList)) {
        getLines(state.itemsList).forEach(x => add(`- ${x}`));
      } else {
        add("- NIL");
      }
      add("");
    }
    
    if (!sectionExcluded("officers")) {
      add(`(${++dn}) Officers involved:`);
      if (norm(state.officersList)) {
        getLines(state.officersList).forEach(x => add(`- ${getOfficerLineForPreview(x)}`));
      } else {
        add("- NIL");
      }
      add("");
    }
    
    if (!sectionExcluded("sentence")) {
      add(`(${++dn}) Sentence:`);
      if (norm(state.sentence)) {
        add(`- ${norm(state.sentence)}`);
      } else {
        add("- NIL");
      }
      if (norm(state.sentenceApproval)) add(`- ${norm(state.sentenceApproval)}`);
      add("");
      
      if (norm(state.victims)) {
        add(`(${++dn}) Victim(s):`);
        getLines(state.victims).forEach(x => add(`- ${x}`));
        add("");
      }
      
      if (norm(state.evidenceLocker)) {
        add(`(${++dn}) Evidence Locker Number:`);
        add(`- ${norm(state.evidenceLocker)}`);
        add("");
      }
    }
    
    add("REPORT:");
    let rn = 0; // dynamic numbering for REPORT
    if (!sectionExcluded("narrative")) {
      add(`(${++rn}) Preliminary Details:`);
      buildPrelimLines().forEach(x => add(x));
      add("");
      
      add(`(${++rn}) Summary of Events:`);
      if (norm(state.summary)) {
        add(state.summary);
      } else {
        add("(Add summary here)");
      }
      add("");
      
      add(`(${++rn}) Evidence:`);
      if (norm(state.evidence)) {
        getLines(state.evidence).forEach(x => add(`- ${x}`));
      } else {
        add("- NIL");
      }
      add("");
    }
    
    if (!sectionExcluded("interview") && norm(state.interviewQs)) {
      add(`(${++rn}) Interview Questions Outstanding:`);
      getLines(state.interviewQs).forEach(x => add(`- ${x}`));
      add("");
    }
    buildDefectsOutputLines().forEach(x => add(x));
    add("Signed,");
    add(norm(state.sigName) || "NIL");
    add(norm(state.sigRank) || "NIL");
    add(norm(state.sigDivision) || "NIL");
    
    return L.join("\n");
  }

  // Autosave (THROTTLED) — v47: uses safe storage with quota handling
  const throttledAutosave = throttle(() => {
    state.chargesList = Array.from(selectedChargesSet).join('\n');
    state.pinsList = Array.from(selectedPinsSet).join('\n');
    writeStoredJson(AUTOSAVE_KEY, state);
    saveBackupSnapshot();
  }, 2000);

  // Auto-backup: save timestamped snapshots every 60s of active editing, keep max 5
  const BACKUP_KEY = "vicpol_report_backups";
  const BACKUP_MAX = 5;
  const BACKUP_INTERVAL = 60000; // 60 seconds
  let _lastBackupTime = 0;

  function saveBackupSnapshot() {
    const now = Date.now();
    if (now - _lastBackupTime < BACKUP_INTERVAL) return;
    // Only backup if there's meaningful content
    if (!norm(state.offender.name) && !norm(state.chargesList) && !norm(state.summary) && !norm(state.fieldContact?.name) && !norm(state.searchSeizure?.name) && !norm(state.trafficWarrant?.rego) && !norm(state.vehicleInspection?.rego)) return;
    _lastBackupTime = now;
    try {
      const backups = readStoredJson(BACKUP_KEY, []);
      const snapshot = {
        state: deepClone(state),
        charges: [...selectedChargesSet],
        pins: [...selectedPinsSet],
        ts: now,
        label: (REPORT_TYPE_LABEL[state.reportType] || state.reportType) + " — " + (norm(state.offender.name) || norm(state.fieldContact?.name) || norm(state.searchSeizure?.name) || "Unnamed")
      };
      backups.unshift(snapshot);
      if (backups.length > BACKUP_MAX) backups.length = BACKUP_MAX;
      writeStoredJson(BACKUP_KEY, backups);
    } catch (e) {
      console.warn("Backup snapshot failed:", e);
    }
  }

  function loadBackup(idx) {
    try {
      const backups = readStoredJson(BACKUP_KEY, []);
      const b = backups[idx];
      if (!b) return;
      if (!confirm("Restore this backup? Current form data will be replaced.")) return;
      state = deepMerge(deepClone(INITIAL_STATE), b.state);
      selectedChargesSet = new Set(b.charges || []);
      selectedPinsSet = new Set(b.pins || []);
      renderAll();
      renderSelectedCharges();
      renderSelectedPins();
      renderChargeList();
      renderPinList();
      updateSentenceSuggestion();
      updateNarrativeHints();
      throttledAutosave();
      toast("Backup restored", "ok");
    } catch (e) {
      toast("Restore failed", "err");
    }
  }

  function clearAllBackups() {
    if (!confirm("Delete all backup snapshots?")) return;
    try { localStorage.removeItem(BACKUP_KEY); } catch(e) {}
    renderDrafts();
    toast("Backups cleared", "ok");
  }

  function loadAutosave() {
    try {
      const saved = localStorage.getItem(AUTOSAVE_KEY);
      if (saved) {
        state = deepMerge(deepClone(INITIAL_STATE), unpackStoredValue(saved, {}));
      }
    } catch (e) {
      console.warn("Load autosave failed:", e);
      setTimeout(() => toast("⚠ Autosave data was corrupted — starting fresh", "warn"), 500);
      try { localStorage.removeItem(AUTOSAVE_KEY); } catch(e2) {}
    }
  }

  // Drafts — v47: sync Sets before save, use safe storage
  function saveDraft() {
    const name = prompt("Draft name:");
    if (!name) return;
    try {
      state.chargesList = Array.from(selectedChargesSet).join('\n');
      state.pinsList = Array.from(selectedPinsSet).join('\n');
      const drafts = readStoredJson(DRAFTS_KEY, {});
      drafts[name] = { ...state, _charges: [...selectedChargesSet], _pins: [...selectedPinsSet], savedAt: Date.now() };
      if (writeStoredJson(DRAFTS_KEY, drafts)) {
        renderDrafts();
        toast("Draft saved: " + name, "ok");
      }
    } catch (e) {
      toast("Failed to save draft", "err");
    }
  }

  function loadDraft(name) {
    try {
      const hasWork = norm(state.offender.name) || norm(state.chargesList) || norm(state.summary) || norm(state.trafficWarrant?.rego);
      if (hasWork && !confirm(`Load draft "${name}"? Your current form will be replaced.`)) return;
      const drafts = readStoredJson(DRAFTS_KEY, {});
      if (drafts[name]) {
        const draft = drafts[name];
        state = deepMerge(deepClone(INITIAL_STATE), draft);
        if (draft._charges) selectedChargesSet = new Set(draft._charges);
        if (draft._pins) selectedPinsSet = new Set(draft._pins);
        renderAll();
        toast("Draft loaded: " + name, "ok");
      }
    } catch (e) {
      toast("Failed to load draft", "err");
    }
  }

  function deleteDraft(name) {
    if (!confirm("Delete draft: " + name + "?")) return;
    try {
      const drafts = readStoredJson(DRAFTS_KEY, {});
      delete drafts[name];
      writeStoredJson(DRAFTS_KEY, drafts);
      renderDrafts();
      toast("Draft deleted", "ok");
    } catch (e) {
      toast("Failed to delete draft", "err");
    }
  }

  function renderDrafts() {
    if (!el.draftsList) return;
    try {
      const drafts = readStoredJson(DRAFTS_KEY, {});
      const names = Object.keys(drafts);
      
      el.draftsList.innerHTML = "";

      if (names.length === 0) {
        el.draftsList.innerHTML = '<div class="muted">No saved drafts</div>';
      } else {
        names.forEach(name => {
          const row = document.createElement("div");
          row.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:8px 0";
          
          const loadBtn = document.createElement("button");
          loadBtn.className = "btn";
          loadBtn.style.cssText = "flex:1; text-align:left";
          loadBtn.textContent = name;
          loadBtn.addEventListener("click", () => loadDraft(name));
          
          const delBtn = document.createElement("button");
          delBtn.className = "danger";
          delBtn.style.marginLeft = "10px";
          delBtn.textContent = "Delete";
          delBtn.addEventListener("click", () => deleteDraft(name));
          
          row.appendChild(loadBtn);
          row.appendChild(delBtn);
          el.draftsList.appendChild(row);
        });
      }

      // Render backup snapshots
      const backups = readStoredJson(BACKUP_KEY, []);
      if (backups.length > 0) {
        const divider = document.createElement("div");
        divider.className = "divider";
        el.draftsList.appendChild(divider);

        const header = document.createElement("div");
        header.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:8px";
        header.innerHTML = '<span style="font-size:12px;font-weight:800;color:var(--muted)">Auto-Backups (' + backups.length + ')</span>';
        const clearBtn = document.createElement("button");
        clearBtn.className = "btn";
        clearBtn.style.cssText = "font-size:10px;padding:4px 8px";
        clearBtn.textContent = "Clear All";
        clearBtn.addEventListener("click", clearAllBackups);
        header.appendChild(clearBtn);
        el.draftsList.appendChild(header);

        backups.forEach((b, idx) => {
          const ago = formatTimeAgo(b.ts);
          const row = document.createElement("div");
          row.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-top:1px solid rgba(255,255,255,0.06)";
          
          const info = document.createElement("div");
          info.style.cssText = "flex:1;min-width:0";
          info.innerHTML = '<div style="font-size:11px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escapeHtml(b.label) + '</div>' +
            '<div style="font-size:10px;color:var(--muted)">' + escapeHtml(ago) + '</div>';
          
          const restoreBtn = document.createElement("button");
          restoreBtn.className = "btn";
          restoreBtn.style.cssText = "font-size:10px;padding:4px 8px;margin-left:8px;flex-shrink:0";
          restoreBtn.textContent = "Restore";
          restoreBtn.addEventListener("click", () => loadBackup(idx));
          
          row.appendChild(info);
          row.appendChild(restoreBtn);
          el.draftsList.appendChild(row);
        });
      }
    } catch (e) {
      el.draftsList.innerHTML = '<div class="muted">Error loading drafts</div>';
    }
  }

  function formatTimeAgo(ts) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return mins + " min" + (mins > 1 ? "s" : "") + " ago";
    const hours = Math.floor(mins / 60);
    if (hours < 24) return hours + " hour" + (hours > 1 ? "s" : "") + " ago";
    const days = Math.floor(hours / 24);
    return days + " day" + (days > 1 ? "s" : "") + " ago";
  }

  // Validation — checks core fields: subject, officers, charges + DOB, signature, prelim, summary
  function validateDraft() {
    const warnings = [];
    const type = state.reportType;
    const hasPrimarySubject = () => {
      if (type === "traffic_warrant") return !!norm(state.offender.name || state.trafficWarrant.owner);
      if (["vicpol_arrest", "vicpol_warrant"].includes(type)) return !!norm(state.vicpolWarrant.warrantName || state.offender.name || state.vicpolWarrant.owner);
      if (type === 'field_contact') return !!norm(state.fieldContact.name);
      if (type === 'search_seizure') return !!norm(state.searchSeizure.name);
      return !!norm(state.offender.name);
    };
    // Format validation on filled fields
    if (norm(state.offender.dob)) { const dobErr = VALIDATORS.dob(state.offender.dob); if (dobErr) warnings.push("DOB format: " + dobErr); }
    if (norm(state.fieldContact?.dob)) { const dobErr = VALIDATORS.dob(state.fieldContact.dob); if (dobErr) warnings.push("Field Contact DOB: " + dobErr); }
    if (norm(state.searchSeizure?.dob)) { const dobErr = VALIDATORS.dob(state.searchSeizure.dob); if (dobErr) warnings.push("Search & Seizure DOB: " + dobErr); }
    if (norm(state.trafficWarrant?.rego)) { const regoErr = VALIDATORS.rego(state.trafficWarrant.rego); if (regoErr) warnings.push("Vehicle rego: " + regoErr); }
    if (norm(state.vicpolWarrant?.rego)) { const regoErr = VALIDATORS.rego(state.vicpolWarrant.rego); if (regoErr) warnings.push("Vehicle rego: " + regoErr); }
    // Core required fields
    if (!hasPrimarySubject()) warnings.push("Missing subject / offender name.");
    if (type === "vehicle_inspection") {
      const vi = state.vehicleInspection || {};
      if (!norm(vi.vehicleType)) warnings.push("No vehicle class selected.");
      if (vicType) {
        const cl = VIC_CHECKLISTS[vicType];
        if (cl) {
          const checked = cl.items.filter(i => vicState[i.id] !== 'pending');
          if (checked.length < cl.items.length) warnings.push(`Checklist incomplete: ${checked.length}/${cl.items.length} items checked.`);
        } else {
          warnings.push("Invalid vehicle type — please reselect.");
        }
      }
      if (!norm(state.sigName)) warnings.push("Missing signature name.");
    } else if (type === "field_contact") {
      if (!norm(state.officersList)) warnings.push("No officers listed.");
      if (!norm(state.fieldContact?.summary)) warnings.push("Missing summary of events.");
      if (!norm(state.sigName)) warnings.push("Missing signature name.");
    } else if (type === "search_seizure") {
      if (!norm(state.officersList)) warnings.push("No officers listed.");
      if (!norm(state.searchSeizure?.summary)) warnings.push("Missing search summary.");
      if (!norm(state.sigName)) warnings.push("Missing signature name.");
    } else {
      // Arrest, warrant, traffic, bail — all need officers + charges + DOB + prelim + summary + sig
      if (!norm(state.chargesList) && !norm(state.pinsList)) warnings.push("No charges or PINs selected.");
      if (!norm(state.officersList)) warnings.push("No officers listed.");
      if (!norm(state.offender.dob) && type !== "traffic_warrant") warnings.push("Missing offender DOB.");
      if (!norm(state.prelimTime) || !norm(state.prelimDate) || !norm(state.prelimLocation)) warnings.push("Preliminary details incomplete (time, date, or location).");
      if (!norm(state.summary) && !norm(state.vicpolWarrant?.details)) warnings.push("Missing summary of events.");
      if (!norm(state.sigName)) warnings.push("Missing signature name.");
    }
    return warnings;
  }

  // ============================================================================
  // v47.2: NARRATIVE QUALITY SCANNER
  // ============================================================================
  // Scans the narrative text for common quality indicators and returns
  // amber-level suggestions (not errors) to help recruits write court-ready reports.
  function getQualityHints() {
    const hints = [];
    const type = state.reportType;
    const summary = (state.summary || "").toLowerCase();
    const allText = (summary + " " + (state.evidence || "") + " " + (state.interviewQs || "")).toLowerCase();
    const charges = Array.from(selectedChargesSet).join(" ").toLowerCase();

    // Only run quality hints on report types that have narratives
    if (!["arrest","vicpol_arrest","vicpol_warrant","traffic_warrant"].includes(type)) return hints;
    
    // Don't nag if no summary written yet (missing summary is already a warning)
    if (!norm(state.summary)) return hints;

    // ── Universal checks (any arrest/warrant report) ──────────────────
    
    // Identification method
    if (!/identif|licence|license|MDT|fingerprint|DNA|verbal.*confirm|photo.*ID|recognised|recognized/i.test(summary)) {
      hints.push("Consider adding: how the suspect was identified (licence, MDT profile, fingerprints, verbal confirmation)");
    }

    // Caution read
    if (["arrest","vicpol_arrest"].includes(type)) {
      if (!/caution|rights?\s*(were|was)?\s*read|miranda|informed.*rights|read.*rights|cautioned/i.test(summary)) {
        hints.push("Consider adding: was caution read to the suspect? Did they acknowledge?");
      }
    }

    // Processing location
    if (["arrest","vicpol_arrest"].includes(type)) {
      if (!/process|station|VIN\s*900|MEL\s*900|FKN|bolingbroke|MRC|remand/i.test(summary)) {
        hints.push("Consider adding: where was the suspect processed? (station name or code)");
      }
    }

    // ── Charge-specific quality checks ────────────────────────────────

    // Force charges → needs force justification
    if (/assault|injur|force|shoot|discharg|lethal|taser|baton|ois/i.test(charges)) {
      if (!/threat|produced.*weapon|aimed|lunged|attacked|swung|brandish|pointed|fired.*at|charged.*at/i.test(summary)) {
        hints.push("Force charges selected — consider adding: what threat justified the force used (state the threat BEFORE the response)");
      }
    }

    // Pursuit charges → needs pursuit details
    if (/evade|pursuit|fail.*stop/i.test(charges)) {
      if (!/pursuit.*end|boxed|spike|crash|broke.*off|abandon|voluntar|pulled.*over|came.*stop/i.test(summary)) {
        hints.push("Pursuit charges selected — consider adding: how the pursuit ended");
      }
      if (!/speed|km\/?h|mph|zone/i.test(summary)) {
        hints.push("Pursuit charges selected — consider adding: speeds reached and speed zones");
      }
    }

    // Weapon charges → needs weapon details
    if (/weapon|firearm|pistol|rifle|knife|prohibited.*weapon|carry.*weapon/i.test(charges)) {
      if (!/serial|S\/N|SN:|SER\.|weapon.*type|make.*model/i.test(summary) && !/serial|S\/N/i.test(state.itemsList || "")) {
        hints.push("Weapon charges selected — consider adding: weapon type and serial number in narrative or confiscated items");
      }
    }

    // Drug charges → needs substance details
    if (/drug|narcotic|substance|possess.*controlled/i.test(charges)) {
      if (!/NIK|test.*positive|test.*negative|substance.*identif|gram|bag|quantity/i.test(allText)) {
        hints.push("Drug charges selected — consider adding: substance type, quantity, and test result");
      }
    }

    // Murder/shooting → needs GSR and victim details
    if (/murder|manslaughter|discharge|shots?\s*fired/i.test(charges)) {
      if (!/GSR/i.test(allText)) {
        hints.push("Shooting/discharge charges — consider adding: GSR test result for suspect");
      }
      if (!/victim|deceased|injur.*party|ambulance|MAS|paramedic/i.test(summary)) {
        hints.push("Shooting/discharge charges — consider adding: victim details and medical response");
      }
    }

    // DUI/traffic → needs test results
    if (/DUI|drink.*driv|impair|intoxicat|alcohol/i.test(charges)) {
      if (!/breath|blood.*alcohol|BAC|PBT|roadside.*test|drug.*test|impairment.*assess/i.test(summary)) {
        hints.push("Impaired driving charges — consider adding: breath/drug test result");
      }
    }

    // Robbery/theft → needs victim and property
    if (/robbery|armed.*robbery|steal|theft|burgl/i.test(charges)) {
      if (!/victim|complainant|property.*stolen|taken|recover/i.test(summary)) {
        hints.push("Robbery/theft charges — consider adding: victim details and property stolen/recovered");
      }
    }

    // ── Word count check ──────────────────────────────────────────────
    const wordCount = (state.summary || "").trim().split(/\s+/).filter(Boolean).length;
    if (wordCount > 0 && wordCount < 50) {
      hints.push("Narrative is very short (" + wordCount + " words) — most court-ready reports need 100+ words to cover all required details");
    } else if (wordCount >= 50 && wordCount < 100) {
      hints.push("Narrative is " + wordCount + " words — consider expanding with more detail for court readiness");
    }

    return hints;
  }
  function getDefaultInterviewQuestions() {
    const type = state.reportType;

    if (type === "traffic_warrant") {
      return `Can you confirm your full name and date of birth?
Were you the driver of [VEHICLE] at the time of the offence?
Do you own or regularly drive this vehicle?
Do you hold a valid driver licence?
Were you aware of the road rules or restrictions applying at the time?
Do you wish to nominate another person as the driver if you were not driving?
Do you wish to contact a lawyer before answering further questions?
Is there anything you would like to say regarding the offence?`;
    }

    return `Can you confirm your full name and date of birth?
Do you understand why you have been arrested or detained?
Where were you at the relevant time and location?
Were you involved in the incident under investigation?
Were you in possession of any prohibited item, weapon, or substance?
Is there any lawful reason for your actions today?
Do you wish to contact a lawyer before answering further questions?
Is there anything you would like to say regarding the charges?`;
  }

  // Copy Functions
  function fillDefaultQuestions() {
    const defaultQuestions = getDefaultInterviewQuestions();
    if (defaultQuestions) {
      if (el.interviewQs) {
        const current = norm(el.interviewQs.value);
        if (current && !confirm("This will replace existing questions. Continue?")) {
          return;
        }
        el.interviewQs.value = defaultQuestions;
        state.interviewQs = defaultQuestions;
        debouncedRenderPreview();
        throttledAutosave();
        toast("Default questions filled", "ok");
      }
    } else {
      toast("No default questions for this report type", "warn");
    }
  }

  async function doCopyPreview() {
    const warnings = validateDraft();
    if (warnings.length > 0) {
      const proceed = confirm("Report has " + warnings.length + " issue(s):\n\n• " + warnings.slice(0, 5).join("\n• ") + (warnings.length > 5 ? "\n• ... and " + (warnings.length - 5) + " more" : "") + "\n\nCopy anyway?");
      if (!proceed) return;
    }
    const text = (el.preview?.textContent || "").trim();
    const success = await copyToClipboard(text);
    toast(success ? "Copied to clipboard" : "Failed to copy", success ? "ok" : "err");
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const success = document.execCommand("copy");
      ta.remove();
      return success;
    }
  }

  // OCR Functions
  function titleCaseName(name) {
    return (name || "")
      .toLowerCase()
      .replace(/(^|[\s'\-])([a-z])/g, (_, sep, ch) => sep + ch.toUpperCase());
  }

  function looksLikeOfficerLine(lineUpper) {
    return /^\s*[,•\-\u2022]*\s*[A-Z0-9]{2,4}[\s\-]?\d{1,4}\b/.test(lineUpper);
  }

  function extractOfficerName(line) {
    const s = (line || "").trim();
    const re = /^\s*[,•\-\u2022]*\s*[A-Z0-9]{2,4}[\s\-]?\d{1,4}\s*(?:\|\s*)?(?:(A\/SGT|A\/INSP|A\/SUPT|SGT|S\/SGT|INSP|SUPT|CHIEF|REC|RECRUIT|PROB|PO|CST|CONST|SC|S\/C|LSC|FC|FST)\b\.?\s*)?(.+?)\s*$/i;
    const m = s.match(re);
    if (!m) return "";
    let name = (m[2] || "").trim();
    name = name.replace(/^[:\-|]+\s*/, "").trim();
    name = name.replace(/[^A-Za-z'\- ]+/g, "").trim();
    name = name.replace(/\s{2,}/g, " ");
    return titleCaseName(name);
  }

  function looksLikeItemLine(lineUpper) {
    if (/\bWEAPON\s+LICENCES\b/.test(lineUpper)) return false;
    if (/\bWEAPON\s+LONGARM\b/.test(lineUpper)) return false;
    if (/\bCONCEAL\s+CARRY\b/.test(lineUpper)) return false;
    if (/\bF\/ARM\s+PROHIB\b/.test(lineUpper)) return false;
    if (/\bDNA\s+ON\s+FILE\b/.test(lineUpper)) return false;
    
    if (/\b(\d+\s*X|X\d+)\b/.test(lineUpper)) return true;
    if (/\b(S\/N|SN|SERIAL|SER\.?|AMMO|AMMUNITION|PISTOL|HANDGUN|LONGARM|MAGAZINE|KNIFE|SWITCHBLADE|FIREARM|GSR)\b/.test(lineUpper)) return true;
    return false;
  }

