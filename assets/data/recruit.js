/* Recruit Helper handbook content.
   Summarised from the BBRP General Duties Handbook (2025) and BBRP Victoria Police
   Handbook (2024 Edition). Static reference only — not wired to report generation.
   Each entry: { id, group, icon, title, keywords, html }. */

const RECRUIT_HANDBOOK = [

  /* ───────────── QUICK REFERENCE ───────────── */
  {
    id: "radio-codes", group: "Quick Reference", icon: "📻",
    title: "Radio Codes",
    keywords: "code 0 1 2 3 4 5 6 8 9 10 12 15 16 duress traffic stop meal break alarm robbery collision disconnect headpop",
    html:
      '<p>Standard radio codes used over comms. <strong>Code 9</strong> (Duress) is the most critical — it sends a distress signal to all officers.</p>' +
      '<table class="rh-table"><thead><tr><th>Code</th><th>Meaning</th></tr></thead><tbody>' +
      '<tr><td>Code 0</td><td>Disconnected / Headpopped</td></tr>' +
      '<tr><td>Code 1</td><td>On Patrol / Available</td></tr>' +
      '<tr><td>Code 2</td><td>Arrived at station &lt;NAME&gt;</td></tr>' +
      '<tr><td>Code 3</td><td>Meal Break</td></tr>' +
      '<tr><td>Code 4</td><td>Traffic Stop</td></tr>' +
      '<tr><td>Code 5</td><td>Arrived at scene / job</td></tr>' +
      '<tr><td>Code 6</td><td>Unavailable / Busy</td></tr>' +
      '<tr><td>Code 8</td><td>Clocking off-duty for the shift</td></tr>' +
      '<tr><td><strong>Code 9</strong></td><td><strong>DURESS!</strong> Officer in immediate danger</td></tr>' +
      '<tr><td>Code 10</td><td>Domestic Dispute / Public Order Situation</td></tr>' +
      '<tr><td>Code 12</td><td>Traffic Crash / Collision</td></tr>' +
      '<tr><td>Code 15</td><td>Silent Alarm / Robbery</td></tr>' +
      '<tr><td>Code 16</td><td>Collision with serious injuries</td></tr>' +
      '</tbody></table>' +
      '<p class="rh-note">Driver took off during your Code 4? See <button class="rh-jump-link" data-rh-jump="code4-flee" type="button">Fled Traffic Stop — Which Warrant?</button></p>'
  },
  {
    id: "phonetic", group: "Quick Reference", icon: "🔤",
    title: "Phonetic Alphabet",
    keywords: "phonetic nato alpha bravo charlie spelling plate check names radio",
    html:
      '<p>Victoria Police use the standard <strong>NATO phonetic alphabet</strong> to spell plates and names clearly over radio.</p>' +
      '<p class="rh-note">Example plate check: <em>"MEL 269, can I get a plate check on NNH 726 — that\'s November, November, Hotel, Seven, Two, Six."</em></p>' +
      '<table class="rh-table"><tbody>' +
      '<tr><td>A — Alpha</td><td>B — Bravo</td><td>C — Charlie</td><td>D — Delta</td></tr>' +
      '<tr><td>E — Echo</td><td>F — Foxtrot</td><td>G — Golf</td><td>H — Hotel</td></tr>' +
      '<tr><td>I — India</td><td>J — Juliet</td><td>K — Kilo</td><td>L — Lima</td></tr>' +
      '<tr><td>M — Mike</td><td>N — November</td><td>O — Oscar</td><td>P — Papa</td></tr>' +
      '<tr><td>Q — Quebec</td><td>R — Romeo</td><td>S — Sierra</td><td>T — Tango</td></tr>' +
      '<tr><td>U — Uniform</td><td>V — Victor</td><td>W — Whiskey</td><td>X — X-ray</td></tr>' +
      '<tr><td>Y — Yankee</td><td>Z — Zulu</td><td></td><td></td></tr>' +
      '</tbody></table>'
  },
  {
    id: "callsigns", group: "Quick Reference", icon: "🆔",
    title: "Callsigns & Prefixes",
    keywords: "callsign prefix mel mtt vin grp k9 por melbourne mt thomas vinewood grapeseed van divvy pigeon unmarked region station auto gd",
    html:
      '<p>When deploying as General Duties use the <strong>"Login Auto GD Callsign"</strong> option. If your assigned callsign is taken, log out and use a different one. The prefix is based on the region/station you patrol from.</p>' +
      '<table class="rh-table"><thead><tr><th>Prefix</th><th>Region / Unit</th></tr></thead><tbody>' +
      '<tr><td><span class="rh-pill">MEL xxx</span></td><td>Melbourne</td></tr>' +
      '<tr><td><span class="rh-pill">MTT xxx</span></td><td>Mt. Thomas</td></tr>' +
      '<tr><td><span class="rh-pill">VIN xxx</span></td><td>Vinewood</td></tr>' +
      '<tr><td><span class="rh-pill">GRP xxx</span></td><td>Grapeseed</td></tr>' +
      '<tr><td><span class="rh-pill">K9 xxx</span></td><td>K9 unit (must be certified &amp; deployed as K9)</td></tr>' +
      '<tr><td><span class="rh-pill">POR xxx</span></td><td>PORT unit (must be certified &amp; deployed as PORT)</td></tr>' +
      '</tbody></table>' +
      '<p><strong>Number &amp; suffix conventions:</strong></p>' +
      '<ul>' +
      '<li><strong>2xx</strong> — standard car (MDT default).</li>' +
      '<li><strong>3xx</strong> — Van / Divvy Van (must log in manually, e.g. <span class="rh-pill">MEL 305</span> instead of MEL 205).</li>' +
      '<li><strong>P suffix</strong> — Pigeon / parking duty, e.g. <span class="rh-pill">MEL 249 P</span>.</li>' +
      '<li><strong>U suffix</strong> — Unmarked, e.g. <span class="rh-pill">MEL 269 U</span>.</li>' +
      '</ul>'
  },
  {
    id: "ranks", group: "Quick Reference", icon: "🎖️",
    title: "Rank Structure & Insignia",
    keywords: "rank structure chain of command recruit probationary constable first senior leading sergeant inspector superintendent insignia spc rct pcon con",
    html:
      '<p>Chain of command, junior to senior (<strong>Superintendent</strong> is highest):</p>' +
      '<table class="rh-table"><thead><tr><th>#</th><th>Rank</th><th>Abbr.</th></tr></thead><tbody>' +
      '<tr><td>1</td><td>Recruit</td><td>RCT</td></tr>' +
      '<tr><td>2</td><td>Probationary Constable</td><td>PCON</td></tr>' +
      '<tr><td>3</td><td>Constable</td><td>CON</td></tr>' +
      '<tr><td>4</td><td>First Constable</td><td>FC</td></tr>' +
      '<tr><td>5</td><td>Senior Constable</td><td>SC</td></tr>' +
      '<tr><td>6</td><td>Leading Senior Constable</td><td>LSC</td></tr>' +
      '<tr><td>7</td><td>Sergeant</td><td>SGT</td></tr>' +
      '<tr><td>8</td><td>Senior Sergeant</td><td>S/SGT</td></tr>' +
      '<tr><td>9</td><td>Inspector</td><td>INSP</td></tr>' +
      '<tr><td>10</td><td>Superintendent</td><td>SUPT</td></tr>' +
      '</tbody></table>' +
      '<p class="rh-note"><strong>Special Constable (SPC)</strong> is a separate stream and is recorded distinctly from Senior Constable (SC).</p>'
  },
  {
    id: "priority", group: "Quick Reference", icon: "🚨",
    title: "Priority Levels",
    keywords: "priority 1 2 3 lights sirens emergency pursuit non-urgent driving response",
    html:
      '<p>Three priority levels for attending a job:</p>' +
      '<table class="rh-table"><thead><tr><th>Priority</th><th>Lights/Sirens</th><th>Use</th></tr></thead><tbody>' +
      '<tr><td><strong>Priority 1</strong></td><td>Lights &amp; Sirens</td><td>Critical emergencies &amp; pursuits. May exceed speed limit &amp; break road rules if required.</td></tr>' +
      '<tr><td><strong>Priority 2</strong></td><td>Lights, sirens as necessary</td><td>Can exceed limit/road rules but use warning systems at crossings; control speed in built-up areas.</td></tr>' +
      '<tr><td><strong>Priority 3</strong></td><td>None</td><td>Non-urgent calls. Regular road rules apply.</td></tr>' +
      '</tbody></table>' +
      '<p class="rh-warn">When responding, ensure intersections are <strong>CLEAR</strong> — slow (look left &amp; right) or stop at every intersection. Change your siren tone periodically.</p>'
  },
  {
    id: "license-classes", group: "Quick Reference", icon: "🚓",
    title: "Licence & Vehicle Classes",
    keywords: "gold silver bronze license class vehicle speed pursue pursuit terminate armoured livery gold class",
    html:
      '<p>Three licence classes govern speed and pursuit ability. Abusing your class on or off duty can have it <strong>downgraded</strong>.</p>' +
      '<table class="rh-table"><thead><tr><th>Class</th><th>Conditions</th></tr></thead><tbody>' +
      '<tr><td><strong>Gold</strong></td><td>Unrestricted speed · can pursue · can terminate own &amp; others\' pursuits · may use opposite lanes.</td></tr>' +
      '<tr><td><strong>Silver</strong></td><td>250 kph limit · can be primary in pursuits · can terminate own pursuits (not others\').</td></tr>' +
      '<tr><td><strong>Bronze</strong></td><td>200 kph limit · cannot pursue · cannot intercept for a Code 4.</td></tr>' +
      '</tbody></table>' +
      '<p><strong>Vehicle classes:</strong> Gold vehicles — Senior Constable+ with a Gold licence (GD livery only). Silver — most common, Silver and above. Bronze — transport vehicles.</p>' +
      '<p class="rh-warn"><strong>DO NOT use armoured vehicles</strong> — all are approval-based only.</p>'
  },

  /* ───────────── ON DUTY & DRIVING ───────────── */
  {
    id: "start-of-shift", group: "On Duty & Driving", icon: "🟢",
    title: "Start of Shift",
    keywords: "start shift login auto gd callsign mdt caged unit s v mel mtt cbd patrol bendigo logout metric measurement police_callsign",
    html:
      '<p>Clock on and set your callsign before patrolling:</p>' +
      '<ul>' +
      '<li><strong>MDT &rarr; Login Auto GD Callsign &rarr; s/v &rarr; MEL/MTT.</strong></li>' +
      '<li><strong>s</strong> = anything else &nbsp;·&nbsp; <strong>v</strong> = caged unit (van).</li>' +
      '<li><strong>MEL</strong> = CBD patrol &nbsp;·&nbsp; <strong>MTT</strong> = Mt Thomas / Bendigo patrol.</li>' +
      '<li>Check your callsign anytime with <code>/police_callsign</code> (shows it top-right — handy when switching callsigns).</li>' +
      '<li>End of shift: <strong>MDT &rarr; Logout of MDT</strong> (Code 8).</li>' +
      '</ul>' +
      '<p class="rh-note">Set <strong>Settings &rarr; General &rarr; Measurement System &rarr; Metric</strong> so speeds read in KPH, not MPH.</p>'
  },
  {
    id: "loadout", group: "On Duty & Driving", icon: "🎽",
    title: "Standard Loadout & Equipment",
    keywords: "loadout equipment pistol taser flashlight asp baton gsr evidence bag access card radio bandage medkit fire extinguisher armoury",
    html:
      '<p><strong>Mandatory weapon / tool loadout:</strong></p>' +
      '<ul>' +
      '<li>1x S&amp;W Combat Pistol</li><li>1x Taser</li><li>1x Flashlight</li><li>1x ASP Baton</li>' +
      '<li>3x GSR Test Kit</li><li>1x Evidence Bag</li><li>1x Police Access Card</li><li>1x Police Radio</li>' +
      '</ul>' +
      '<p><strong>Optional support equipment:</strong> Bandages · Medkits · 1x Fire Extinguisher.</p>' +
      '<p class="rh-warn">Selling, stealing or misappropriating police equipment from the armoury is <strong>powergaming</strong> and grounds for removal.</p>'
  },
  {
    id: "patrol-ratios", group: "On Duty & Driving", icon: "📡",
    title: "ANPR, Radar, Unmarked & Pigeon Ratios",
    keywords: "anpr radar speed unmarked pigeon ratio 5:1 6:1 parking duty request gd support documents approval prefix",
    html:
      '<p>Deployment ratios limit how many specialist units are active at once. Requests go through <strong>GD Support Documents</strong> and require GD leadership approval.</p>' +
      '<table class="rh-table"><thead><tr><th>Capability</th><th>Ratio / Rule</th><th>Min Rank</th></tr></thead><tbody>' +
      '<tr><td>Speed Radar</td><td>Request to use</td><td>Constable+</td></tr>' +
      '<tr><td>ANPR / Radar</td><td><strong>5:1</strong> — no more than 5 highway units in MDT; turn off if more highway clock on</td><td>Constable+</td></tr>' +
      '<tr><td>Unmarked</td><td><strong>6:1</strong> — need 6 other units in MDT; use <strong>U</strong> prefix</td><td>First Constable+</td></tr>' +
      '<tr><td>Pigeon (parking)</td><td><strong>6:1</strong> · parking duty only · max <strong>3 hours</strong> · <strong>no pursuits</strong> · <strong>P</strong> suffix</td><td>—</td></tr>' +
      '</tbody></table>' +
      '<p>Submit via <em>Request Vehicle Approval</em> in gd-support-documents; a GD leader will Approve or Deny (with reasoning if denied).</p>'
  },
  {
    id: "radio-comms", group: "On Duty & Driving", icon: "🗣️",
    title: "Pursuit & Radio Comms",
    keywords: "radio comms pursuit callsign colour type location direction speed weather traffic conditions location communication westbound",
    html:
      '<p>Clear pursuit comms keep everyone informed. Lead with the major components, then minor ones as able.</p>' +
      '<p><strong>Major components:</strong></p><ul>' +
      '<li>Your Callsign</li><li>Vehicle Colour / Type</li><li>Location / Direction</li><li>Speed</li></ul>' +
      '<p><strong>Minor components:</strong> Licence / Vehicle Class · Weather Conditions · Traffic Conditions.</p>' +
      '<p class="rh-note">Location example: <em>"Westbound Vespucci Blvd."</em> — always pair direction with the road name.</p>' +
      '<p><strong>Common radio scripts:</strong></p><ul>' +
      '<li>Traffic stop: <em>"[CALLSIGN] Code 4 with a [VEHICLE DESCRIPTION] going [LOCATION], additional required / not required."</em></li>' +
      '<li>Responding: <em>"[CALLSIGN] enroute to [JOB], [DISTANCE] out."</em> Include the distance; over <strong>3 km</strong> add <strong>"Delayed Response"</strong>.</li>' +
      '</ul>'
  },
  {
    id: "rbt-rdt", group: "On Duty & Driving", icon: "🧪",
    title: "Mandatory RBT & RDT",
    keywords: "rbt rdt breath test drug test traffic offence dangerous driving code 4 mandatory alcohol",
    html:
      '<p>Traffic-based offences require a mandatory <strong>Random Breath Test (RBT)</strong> and <strong>Random Drug Test (RDT)</strong>. Dangerous driving is a common trigger.</p>' +
      '<p>Incorporate the RBT/RDT into your Code 4 (traffic stop) flow before charging traffic offences.</p>' +
      '<p class="rh-note">Driver fled before you could test? See <button class="rh-jump-link" data-rh-jump="code4-flee" type="button">Fled Traffic Stop — Which Warrant?</button></p>' +
      '<div class="rh-links"><span class="rh-links-label">Write it up:</span>' +
      '<button class="rh-tool-link" data-rh-report="arrest" type="button">📝 Arrest Report — DUI / drug-driving charges</button>' +
      '</div>'
  },
  {
    id: "impounds", group: "On Duty & Driving", icon: "🚙",
    title: "Vehicle & Boat Impounds",
    keywords: "impound boat pin anti-hoon offence level crush tbt sgt lsc supervisor request mdt f10 slip",
    html:
      '<p>Vehicles/boats are impounded under anti-hoon laws or for use in a crime. Always issue the <strong>Impound PIN</strong>. Periods are tiered by how many prior impound PINs are on the person\'s MDT history (1st, 2nd, 3rd, 4th offence).</p>' +
      '<p class="rh-note"><strong>Impound offence level resets after a crush.</strong></p>' +
      '<p><strong>To request an impound:</strong></p><ul>' +
      '<li>Use MDT &rarr; Supervisor panel; call an available <strong>SGT+</strong> via mobile.</li>' +
      '<li>If none available, a <strong>Leading Senior Constable</strong> has limited impound approval.</li>' +
      '<li>Otherwise submit via #police-request (pinned template) with reasoning &amp; priors, tagging @Police Supervisor.</li>' +
      '<li>Always attempt to contact TBT for approved impounds; use impound slips in F10.</li>' +
      '</ul>' +
      '<div class="rh-links"><span class="rh-links-label">Tools:</span>' +
      '<button class="rh-tool-link" data-rh-report="traffic_warrant" type="button">🚗 Traffic Warrant — impound schedule &amp; fines</button>' +
      '<button class="rh-tool-link" data-rh-page="traffic" type="button">📊 Traffic History — prior impounds &amp; next tier</button>' +
      '</div>'
  },

  /* ───────────── PROCEDURES ───────────── */
  {
    id: "arrest-caution", group: "Procedures", icon: "🚔",
    title: "Arrest, Caution & Legal Representation",
    keywords: "arrest caution method legal representation custody duty of care rights name dob address phone call lawyer",
    html:
      '<p><strong>Method of arrest</strong> — officers should:</p><ul>' +
      '<li>Use an <strong>absolute minimum</strong> of force;</li>' +
      '<li>Identify themselves as police (if in plain clothes);</li>' +
      '<li>Lay hands on / touch the arrested person;</li>' +
      '<li>Advise them they are under arrest, the grounds, and produce a warrant if applicable;</li>' +
      '<li>Be inconspicuous, not delay the decision, and treat them with courtesy.</li></ul>' +
      '<p>A <strong>duty of care</strong> applies — ensure no further injury occurs in custody.</p>' +
      '<p><strong>Caution</strong> must be read at the <strong>first available opportunity</strong>. It informs the suspect they are not obliged to answer questions, but anything said is recorded and may be used as evidence. Invite them to confirm they understood.</p>' +
      '<p class="rh-note">Suspects <strong>must</strong> by law provide <strong>Name, Date of Birth and Address</strong>. They may otherwise decline to answer questions.</p>' +
      '<div class="rh-links"><span class="rh-links-label">Write it up:</span>' +
      '<button class="rh-tool-link" data-rh-report="arrest" type="button">📝 Arrest Report</button>' +
      '</div>'
  },
  {
    id: "search-seizure", group: "Procedures", icon: "🔎",
    title: "Search & Seizure",
    keywords: "search seizure frisk police search reasonable suspicion pat down sharps fpo g-wheel /frisk weapons drugs",
    html:
      '<p>Two search types, both requiring <strong>reasonable suspicion</strong> that a crime was committed (or an FPO check):</p>' +
      '<p><strong>Frisk</strong> (non-invasive pat down):</p><ul>' +
      '<li>Inform the person you will pat them down for obvious weapons or drugs.</li>' +
      '<li>They are required by law to comply; refusal may escalate to a full police search.</li>' +
      '<li>Stand behind the suspect &mdash; G-Wheel &rarr; Frisk, or <code>/frisk</code>.</li>' +
      '<li>If you feel something suspicious, escalate to a police search at officer discretion.</li></ul>' +
      '<p class="rh-note">Search/frisk script: <em>"My name is [BADGE], I\'m going to be conducting a search / non-invasive pat down today. Do you have anything on you that could stick, stab or prod me? Anything you want to declare?"</em></p>' +
      '<p><strong>Police Search</strong> (full search) is justified when:</p><ul>' +
      '<li>You witnessed the suspect actively commit a crime;</li>' +
      '<li>The suspect has an active warrant;</li>' +
      '<li>You are arresting the suspect;</li>' +
      '<li>There is evidence on scene that would lead to an arrest;</li>' +
      '<li>The POI has a warrant or FPO.</li></ul>' +
      '<p>Prior to searching, always ask if they have any <strong>sharps</strong>.</p>' +
      '<div class="rh-links"><span class="rh-links-label">Write it up:</span>' +
      '<button class="rh-tool-link" data-rh-report="search_seizure" type="button">🔎 Search &amp; Seizure Report</button>' +
      '</div>'
  },
  {
    id: "charges-pins", group: "Procedures", icon: "📋",
    title: "Charges, PINs & Processing",
    keywords: "charges pins penalty infringement notice processing f6 offender dna indictable orange hammer issue leadership approval",
    html:
      '<p>You may issue up to <strong>three (3) charges</strong> and <strong>three (3) PINs</strong> <strong>without</strong> VicPol leadership approval.</p>' +
      '<p><strong>Processing a suspect:</strong></p><ul>' +
      '<li>Open <strong>F6 Menu</strong> &rarr; Offender Processing.</li>' +
      '<li>Charge Options &rarr; select charges &rarr; Issue Charges.</li>' +
      '<li>Select the closest person to you.</li></ul>' +
      '<p class="rh-warn">All <strong>Indictable</strong> charges (marked with an orange hammer) require the suspect\'s <strong>DNA</strong> taken &amp; placed on file — <em>even if already on file.</em></p>' +
      '<p>PINs (Penalty Infringement Notices) are issued the same way via the Fine Options &rarr; Issue Fines flow.</p>' +
      '<div class="rh-links"><span class="rh-links-label">In the Report Tool:</span>' +
      '<button class="rh-tool-link" data-rh-report="arrest" type="button">📝 Arrest Report — charge &amp; PIN pickers</button>' +
      '</div>'
  },
  {
    id: "sentencing", group: "Procedures", icon: "⚖️",
    title: "Sentencing",
    keywords: "sentencing indictable mrc melbourne remand centre weeks prison community service magistrate lsc sgt attempted murder fpo approval",
    html:
      '<p><strong>Indictable charges</strong> (orange dot) are serious offences requiring weeks in the <strong>Melbourne Remand Centre (MRC)</strong>. Sentencing caps depend on the approving rank:</p>' +
      '<table class="rh-table"><thead><tr><th>Authority</th><th>Max sentence</th></tr></thead><tbody>' +
      '<tr><td>Standard Min / Max</td><td>40 / 90 weeks</td></tr>' +
      '<tr><td>LSC+ (no SGT/Magistrate)</td><td>110 weeks</td></tr>' +
      '<tr><td>SGT+ (no Magistrate)</td><td>150 weeks</td></tr>' +
      '<tr><td>SGT+ — Attempted Murder w/ FPO</td><td>250 weeks</td></tr>' +
      '<tr><td>Magistrate</td><td>450 weeks (450–900 for FPO breaches)</td></tr>' +
      '</tbody></table>' +
      '<p>Other outcomes: <strong>Set Free</strong>, <strong>Community Service</strong>, or <strong>Send to Prison</strong> (MRC).</p>' +
      '<div class="rh-links"><span class="rh-links-label">In the Report Tool:</span>' +
      '<button class="rh-tool-link" data-rh-report="arrest" type="button">⚖️ Arrest Report — sentence suggestion from charges</button>' +
      '</div>'
  },
  {
    id: "fpo", group: "Procedures", icon: "🚫",
    title: "Firearms Prohibition Orders (FPO)",
    keywords: "fpo firearms prohibition order tier 1 2 3 4 days permanent lsc sgt insp pfpo search powers approval bot breach",
    html:
      '<p>An FPO grants police search powers over a person. FPOs auto-remove when their duration expires. Tiers:</p>' +
      '<table class="rh-table"><thead><tr><th>Tier</th><th>Duration</th><th>Approval</th><th>Search Powers</th></tr></thead><tbody>' +
      '<tr><td>Tier 1</td><td>30 Days</td><td>LSC+</td><td>Search the person for firearms.</td></tr>' +
      '<tr><td>Tier 2</td><td>60 Days</td><td>SGT+</td><td>Search the person &amp; the vehicle they operate.</td></tr>' +
      '<tr><td>Tier 3</td><td>90 Days</td><td>SGT+</td><td>Thoroughly search the person, their vehicle &amp; any occupants.</td></tr>' +
      '<tr><td>Tier 4</td><td>Permanent</td><td>INSP+</td><td>Same as Tier 3.</td></tr>' +
      '</tbody></table>' +
      '<p>FPOs may be issued for serious reasons (e.g. attempted murder of emergency services, mass murder). After issuing in-city, you <strong>must</strong> also log the request with the FPO BOT — this is as important as issuing the FPO itself.</p>' +
      '<div class="rh-links"><span class="rh-links-label">Write it up:</span>' +
      '<button class="rh-tool-link" data-rh-report="search_seizure" type="button">🔎 Search &amp; Seizure — FPO search powers</button>' +
      '</div>'
  },
  {
    id: "drugs", group: "Procedures", icon: "💊",
    title: "Drugs & Credit-Card Fraud",
    keywords: "drugs narcotics cultivation manufacturing possession trafficking large quantity processed unprocessed fraud credit card fines",
    html:
      '<p>Charging depends on amount &amp; classification. <strong>Large Quantity</strong> = 20 processed units <strong>or</strong> 50 unprocessed units.</p>' +
      '<table class="rh-table"><thead><tr><th>Charge</th><th>Max Fine</th></tr></thead><tbody>' +
      '<tr><td>Possession of a Large Quantity Drug of Dependence</td><td>$2,500</td></tr>' +
      '<tr><td>Trafficking a Drug of Dependence</td><td>$3,500</td></tr>' +
      '<tr><td>Cultivation of Narcotic Plants</td><td>$1,500</td></tr>' +
      '</tbody></table>' +
      '<p>Charge types include Cultivation, Manufacturing, Possession, Trafficking and Fraud (fake credit cards). Related legislation: <strong>Victorian Crimes Act 1958</strong> &amp; <strong>Victorian Police Act 2013</strong>.</p>' +
      '<div class="rh-links"><span class="rh-links-label">Write it up:</span>' +
      '<button class="rh-tool-link" data-rh-report="arrest" type="button">📝 Arrest Report — Drug charges &amp; NIK test evidence</button>' +
      '</div>'
  },
  {
    id: "code4-flee", group: "Procedures", icon: "🏃",
    title: "Fled Traffic Stop — Which Warrant?",
    keywords: "code 4 flee fled evade fail to stop failed intercept pursuit warrant arrest questioning bodycam bwc id confirmed unconfirmed rego registered owner plate reader melroads traffic warrant",
    html:
      '<p>Driver takes off during a simple <strong>Code 4</strong> (traffic stop)? The paperwork depends on what you locked in before they fled — <strong>body cam</strong>, <strong>ID</strong> and <strong>rego</strong>:</p>' +
      '<table class="rh-table"><thead><tr><th>What you have</th><th>Report to write</th></tr></thead><tbody>' +
      '<tr><td><strong>ID CONFIRMED</strong> — licence handed over, MDT/LEAP profile matched, fingerprints, or verbal ID on BWC</td><td>VicPol <strong>Warrant for Arrest</strong> — record the ID confirmation basis in the warrant</td></tr>' +
      '<tr><td><strong>ID unconfirmed</strong>, but <strong>rego confirmed</strong> (plate read / plate reader hit) and/or <strong>BWC</strong> captured the driver</td><td>VicPol <strong>Warrant for Questioning</strong> — the registered owner is a lead, not a confirmed ID</td></tr>' +
      '<tr><td><strong>No stop achieved</strong> — vehicle failed to pull over / intercept abandoned for public safety</td><td><strong>Traffic Warrant</strong> — tick <em>"Failed attempt to intercept"</em>; paste the MELROADS excerpt to fill the vehicle details</td></tr>' +
      '</tbody></table>' +
      '<p class="rh-note">Rule of thumb: an <strong>arrest warrant</strong> needs identity confirmed <strong>beyond reasonable doubt</strong>. Anything less — even a confirmed rego with a likely driver — stays a <strong>questioning warrant</strong> until identity is confirmed.</p>' +
      '<p>Evidence to log before writing: <strong>BWC</strong>, plate reader / rego check, MDT / MELROADS profile, radar reading. The report narrative has quick-add buttons for each.</p>' +
      '<div class="rh-links"><span class="rh-links-label">Write it now:</span>' +
      '<button class="rh-tool-link" data-rh-report="vicpol_arrest" type="button">📝 Warrant for Arrest</button>' +
      '<button class="rh-tool-link" data-rh-report="vicpol_warrant" type="button">❓ Warrant for Questioning</button>' +
      '<button class="rh-tool-link" data-rh-report="traffic_warrant" type="button">🚗 Traffic Warrant</button>' +
      '</div>'
  },
  {
    id: "warrants", group: "Procedures", icon: "📝",
    title: "Warrants, Reports & Move-On Orders",
    keywords: "warrant writing arrest report mdt who what when where how why magistrate hearing move on order disorderly conduct pin f10",
    html:
      '<p><strong>Warrant writing</strong> — focus on the facts: <strong>WHO, WHAT, WHEN, WHERE, HOW and WHY</strong>. Include time &amp; date and a full location (street, suburb, post code, landmarks). Add the warrant to the suspect\'s history via the MDT (Add Warrant).</p>' +
      '<p><strong>Arrest reports</strong> are added in the MDT and should stand alone without testimony.</p>' +
      '<p><strong>Move-On Orders</strong> require an individual to leave an area for a set period. Returning makes them liable to a <strong>Disorderly Conduct</strong> charge or a PIN for not obeying police direction. A verbal move-on is often sufficient.</p>' +
      '<p class="rh-note">Not sure which warrant fits a fleeing driver? See <button class="rh-jump-link" data-rh-jump="code4-flee" type="button">Fled Traffic Stop — Which Warrant?</button></p>' +
      '<div class="rh-links"><span class="rh-links-label">Write it now:</span>' +
      '<button class="rh-tool-link" data-rh-report="arrest" type="button">📝 Arrest Report</button>' +
      '<button class="rh-tool-link" data-rh-report="vicpol_arrest" type="button">📝 Warrant for Arrest</button>' +
      '<button class="rh-tool-link" data-rh-report="vicpol_warrant" type="button">❓ Warrant for Questioning</button>' +
      '<button class="rh-tool-link" data-rh-report="field_contact" type="button">🤝 Field Contact — move-ons &amp; street checks</button>' +
      '</div>'
  },
  {
    id: "critical-incidents", group: "Procedures", icon: "🏦",
    title: "Critical Incidents (Code 15 / Code 9)",
    keywords: "code 15 code 9 robbery alarm hostage negotiator additional units perimeter breach k9 sweep cirt port duress secure scene roles",
    html:
      '<p>On a robbery / alarm (Code 15) or duress (Code 9), arrive quietly, secure the area, and fill defined roles. Request specialist units (CIRT / PORT / HWY / K9) as needed.</p>' +
      '<table class="rh-table"><thead><tr><th>Role</th><th>Responsibilities</th></tr></thead><tbody>' +
      '<tr><td><strong>Negotiator</strong></td><td>Communicate with hostage-takers for demands · relay all information to the SC (scene commander).</td></tr>' +
      '<tr><td><strong>Additional Units</strong></td><td>Keep a secure perimeter · listen to directions · stand by for a possible breach.</td></tr>' +
      '<tr><td><strong>K9</strong></td><td>Sweep the area for possible suspects.</td></tr>' +
      '</tbody></table>' +
      '<p class="rh-warn">Do not use doors/abilities to powergame your way into an active scene — wait for direction.</p>' +
      '<div class="rh-links"><span class="rh-links-label">Write it up:</span>' +
      '<button class="rh-tool-link" data-rh-report="arrest" type="button">📝 Arrest Report — scene, roles, victims &amp; timeline</button>' +
      '</div>'
  },
  {
    id: "use-of-force", group: "Procedures", icon: "✊",
    title: "Use of Force",
    keywords: "use of force continuum tiers less than lethal lethal taze beanbag motorcycle excessive force physical presence securing scenes",
    html:
      '<p>Victoria Police use a <strong>Use of Force continuum</strong>. Lowest level is <strong>physical presence</strong>; the extreme option is <strong>lethal force</strong>. Always state the threat before the response. Excessive force is subject to disciplinary action.</p>' +
      '<p><strong>The tiers of force:</strong></p><ul>' +
      '<li><strong>Less than Lethal</strong> — unlikely to kill or cause serious injury.</li>' +
      '<li><strong>Less than Lethal +</strong> — unlikely to kill but may cause serious injury.</li>' +
      '<li><strong>Lethal</strong> — likely to result in serious injury or death.</li></ul>' +
      '<p><strong>Quick guidance:</strong></p><ul>' +
      '<li>Taze someone off a stationary/low-speed (&le;20 kph) motorcycle &mdash; <strong>yes</strong> (Less than Lethal +).</li>' +
      '<li>Taze/beanbag from a stationary/low-speed vehicle &mdash; <strong>yes</strong> (Less than Lethal +); RP breaking the window.</li>' +
      '<li>Lethal force on an occupant at speed (&gt;20 kph) &mdash; only if armed &amp; refusing orders, fleeing a violent crime, or using the vehicle as a weapon.</li>' +
      '<li>Tactical contact with a motorcycle &mdash; only while they are actively firing at police.</li></ul>' +
      '<div class="rh-links"><span class="rh-links-label">Write it up:</span>' +
      '<button class="rh-tool-link" data-rh-report="arrest" type="button">📝 Arrest Report — state the threat before the response</button>' +
      '</div>'
  },

  /* ───────────── CONDUCT & CAREER ───────────── */
  {
    id: "rp-rules", group: "Conduct & Career", icon: "📜",
    title: "RP Conduct Rules",
    keywords: "powergaming rdm random death match new life rule failrp vdm vehicle death match last resort city guidelines cop pockets",
    html:
      '<p>Core city guidelines every officer must uphold (breaches risk suspension or termination):</p>' +
      '<ul>' +
      '<li><strong>Powergaming</strong> — no selling armoury items; no using police abilities off duty (search, tackle, lockpick, cop pockets); no reattaching to pursuits after vehicle damage without a proper repair; don\'t exceed inventory capacity.</li>' +
      '<li><strong>RDM (Random Death Match)</strong> — police must abide by the <strong>last resort policy</strong>; use of force is an OOC catch to prevent RDM by police.</li>' +
      '<li><strong>New Life Rule</strong> — don\'t interview victims before AV arrives; don\'t use info from downed parties unless revived; only new-life once an active scene is over and no one is nearby.</li>' +
      '<li><strong>FailRP / VDM (Vehicle Death Match)</strong> — stay in character; don\'t use a vehicle as a weapon outside justified force.</li>' +
      '</ul>' +
      '<p class="rh-note">Cop pockets are for collecting evidence / removing items from suspects — not for unfair carry advantages.</p>'
  },
  {
    id: "professionalism", group: "Conduct & Career", icon: "🤝",
    title: "Professionalism & the S.E.L.F Test",
    keywords: "professionalism self test scrutiny ethical lawful fair discretional based policing respectful helpful understanding standards on off duty",
    html:
      '<p>As the face of the community you are held to the highest standard <strong>on and off duty</strong>. Be: <strong>Respectful · Helpful · Understanding · Professional.</strong></p>' +
      '<p><strong>Discretional Based Policing</strong> — consider your actions before deciding. Use the <strong>S.E.L.F test</strong>:</p>' +
      '<table class="rh-table"><tbody>' +
      '<tr><td><strong>S — Scrutiny</strong></td><td>Transparent, accountable, able to withstand scrutiny.</td></tr>' +
      '<tr><td><strong>E — Ethical</strong></td><td>Adheres to policy &amp; ethical standards; upholds integrity.</td></tr>' +
      '<tr><td><strong>L — Lawful</strong></td><td>Complies with law, regulations &amp; human rights.</td></tr>' +
      '<tr><td><strong>F — Fair</strong></td><td>Fair to all stakeholders; upholds equality &amp; equity.</td></tr>' +
      '</tbody></table>'
  },
  {
    id: "career-roadmap", group: "Conduct & Career", icon: "🛣️",
    title: "GD Roadmap & Certifications",
    keywords: "roadmap certification k9 cso port airwing fto motorcycle marine bru cirt highway patrol constable first senior eoi bot career pathway gold class",
    html:
      '<p><strong>Progression unlocks (General Duties):</strong></p>' +
      '<ul>' +
      '<li><strong>Constable +</strong> — request Speed Radar &amp; ANPR; apply for K9, Marine/Water Police, Crime Scene Services.</li>' +
      '<li><strong>First Constable +</strong> — request Unmarked patrols; apply for PORT, Bomb Response Unit, POLAIR/Airwing; transfer to Highway Patrol; become FTO/SFTO (on invite at S/CST); join CIU.</li>' +
      '<li><strong>Senior Constable +</strong> — RCV cert (PORT only); carry the service shotgun while PORT; transfer to CIRT; obtain Gold Class licence (min 30 days); apply for Certification FTO; considered for leadership (if invited).</li>' +
      '</ul>' +
      '<p><strong>Certifications &amp; how to apply:</strong></p>' +
      '<table class="rh-table"><thead><tr><th>Certification</th><th>Rank</th><th>How to Apply</th></tr></thead><tbody>' +
      '<tr><td>K9 (Dog Squad)</td><td>Constable+</td><td>Police EOI BOT — Certification EOI</td></tr>' +
      '<tr><td>Crime Scene Officer (CSO)</td><td>Constable+</td><td>Police EOI BOT — Certification EOI</td></tr>' +
      '<tr><td>Public Order Response Team (PORT)</td><td>First Constable+</td><td>Police EOI BOT — Certification EOI</td></tr>' +
      '<tr><td>Airwing</td><td>First Constable+</td><td>Police EOI BOT — Certification EOI</td></tr>' +
      '<tr><td>Field Training Officer (FTO)</td><td>First Constable+</td><td>Police EOI BOT — Certification EOI</td></tr>' +
      '<tr><td>Police Academy Training Officer</td><td>First Constable+</td><td>Contact General Duties S/SGT</td></tr>' +
      '<tr><td>Motorcycle</td><td>First Constable+</td><td>CIRT &amp; Highway Patrol — Police EOI BOT</td></tr>' +
      '</tbody></table>'
  },
  {
    id: "uniforms", group: "Conduct & Career", icon: "👮",
    title: "Uniforms & Dress Standards",
    keywords: "uniform dress appearance hi-vis vest formal navy pants cap beanie boots port k9 ciu marked t-shirt standards",
    html:
      '<p>Uniform standards provide clarity and professionalism. Approved General Duties uniform items:</p>' +
      '<ul>' +
      '<li>MelPol marked T-shirt, long sleeve, or button-up (plus certification uniforms in their handbooks).</li>' +
      '<li>MelPol issued Navy Pants (tucked / untucked).</li>' +
      '<li>MelPol issued Cap, plain black cap, or plain black beanie for cold weather.</li>' +
      '<li>MelPol issued plain black leather lace boots.</li>' +
      '<li>Hi-Vis (Fluro) vest; PORT vest, K9 vest; CIU may wear a black vest.</li>' +
      '<li>Wedding / engagement bands are allowed.</li>' +
      '</ul>' +
      '<p>The two supplied uniforms are the <strong>General Duties Uniform (Hi-Vis Vest)</strong> and the <strong>Formal Uniform</strong>. Leadership wall photos must be in formal uniform.</p>'
  },
  {
    id: "commands", group: "Conduct & Career", icon: "⌨️",
    title: "Commands & Keybinds (G-Wheel)",
    keywords: "commands keybind g wheel gwheel impound tow pduress dragout dragin drag cuff search frisk location spb f8 bind keyboard mdt",
    html:
      '<p><strong>G-Wheel tools:</strong></p>' +
      '<table class="rh-table"><thead><tr><th>Tool</th><th>Action</th></tr></thead><tbody>' +
      '<tr><td>Truck — ImpoundTow</td><td>Calls TBT/RACV to tow a vehicle.</td></tr>' +
      '<tr><td>Bell — PDuress</td><td>Code 9 distress signal to fellow officers.</td></tr>' +
      '<tr><td>Car — Dragout / Dragin</td><td>Force suspects out of / into a vehicle (transport only).</td></tr>' +
      '<tr><td>Person — Drag</td><td>Drag a cuffed, non-compliant suspect into cells.</td></tr>' +
      '<tr><td>Lock Person — Cuff</td><td>Cuff a suspect.</td></tr>' +
      '<tr><td>Magnifying Glass — Search</td><td>Search someone\'s inventory.</td></tr>' +
      '<tr><td>Hands — Frisk</td><td>Pat down a suspect (chance to find illegal goods).</td></tr>' +
      '</tbody></table>' +
      '<p><strong>Useful commands:</strong> <code>/location</code> · <code>/pduress</code> · <code>/cuff</code> (faster cuff, no G-Wheel) · <code>/drag</code> (faster drag) · <code>/dsleo</code> (opens MDT, no F6) · <code>/closeinventory</code> · <code>/pbackup</code> · <code>/hudsettings</code> · <code>/spb</code> (street names on minimap) · <code>/police_callsign</code>.</p>' +
      '<p><strong>RP shortcuts:</strong> <code>e medic2</code> — a tidier kneel for forensics &amp; first aid. Keybind handy texts like <em>"Looks for ID"</em> or <em>"Head to toe — what do I find?"</em> via <code>do</code>.</p>' +
      '<p class="rh-note">Keybind any command via the F8 menu: <code>bind keyboard &lt;key&gt; &lt;command&gt;</code>.</p>'
  },

  /* ───────────── RESOURCES ───────────── */
  {
    id: "resources", group: "Resources", icon: "🔗",
    title: "Resources & Legislation",
    keywords: "resources links legislation crimes act 1958 police act 2013 reference handbook",
    html:
      '<p>Public legislation referenced throughout the handbook:</p>' +
      '<ul>' +
      '<li><a href="https://www.legislation.vic.gov.au/in-force/acts/crimes-act-1958" target="_blank" rel="noopener noreferrer">Victorian Crimes Act 1958</a></li>' +
      '<li><a href="https://www.legislation.vic.gov.au/in-force/acts/victoria-police-act-2013" target="_blank" rel="noopener noreferrer">Victoria Police Act 2013</a></li>' +
      '</ul>' +
      '<p class="rh-note">Internal Discord channels &amp; BOTs (gd-support-documents, Police EOI BOT, FPO BOT, #police-request) are referenced in the handbook — direct links can be added here on request.</p>'
  }

];

if (typeof window !== "undefined") { window.RECRUIT_HANDBOOK = RECRUIT_HANDBOOK; }
