/* Recruit Helper page — renders the RECRUIT_HANDBOOK reference as searchable accordion
   sections. Standalone reference; never writes report state on its own. Handbook entries
   may embed shortcut buttons (data-rh-report / data-rh-page / data-rh-jump) that jump to
   the Report Tool with the matching report type selected, open another tool page, or
   scroll to a sibling handbook section. */

(function () {
  "use strict";

  var rendered = false;

  function rhEsc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function rhStripText(html) {
    var d = document.createElement("div");
    d.innerHTML = html || "";
    // Shortcut pill labels ("Arrest Report", ...) must not pollute the search haystack,
    // or every linked topic would match a search for "arrest".
    var links = d.querySelectorAll(".rh-links");
    for (var i = 0; i < links.length; i++) links[i].parentNode.removeChild(links[i]);
    return (d.textContent || d.innerText || "").replace(/\s+/g, " ");
  }

  function host() { return document.getElementById("recruitSections"); }

  function toggleSection(wrap, force) {
    var open = typeof force === "boolean" ? force : !wrap.classList.contains("open");
    wrap.classList.toggle("open", open);
    var tog = wrap.querySelector(".rh-toggle");
    if (tog) tog.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function renderRecruitHelper() {
    var container = host();
    if (!container || typeof RECRUIT_HANDBOOK === "undefined") return;
    container.innerHTML = "";
    var lastGroup = null;
    RECRUIT_HANDBOOK.forEach(function (sec) {
      if (sec.group !== lastGroup) {
        lastGroup = sec.group;
        var gh = document.createElement("div");
        gh.className = "rh-group-head";
        gh.dataset.rhGroup = sec.group;
        gh.textContent = sec.group;
        container.appendChild(gh);
      }
      var wrap = document.createElement("div");
      wrap.className = "rh-section";
      wrap.id = "rh-sec-" + sec.id;
      wrap.dataset.rhSection = "1";
      wrap.dataset.haystack = (sec.title + " " + (sec.keywords || "") + " " + rhStripText(sec.html)).toLowerCase();

      var tog = document.createElement("div");
      tog.className = "rh-toggle";
      tog.setAttribute("role", "button");
      tog.setAttribute("tabindex", "0");
      tog.setAttribute("aria-expanded", "false");
      tog.innerHTML =
        '<span class="rh-title"><span aria-hidden="true">' + (sec.icon || "") + "</span>" +
        '<span class="rh-title-text">' + rhEsc(sec.title) + "</span></span>" +
        '<span class="rh-chev" aria-hidden="true">▼</span>';

      var body = document.createElement("div");
      body.className = "rh-body";
      body.innerHTML = '<div class="rh-body-inner">' + sec.html + "</div>";

      tog.addEventListener("click", function () { toggleSection(wrap); });
      tog.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleSection(wrap); }
      });

      wrap.appendChild(tog);
      wrap.appendChild(body);
      container.appendChild(wrap);
    });
    updateCount();
  }

  function updateCount(visible, total) {
    var el = document.getElementById("rhCount");
    if (!el) return;
    if (visible === undefined) {
      var all = host() ? host().querySelectorAll("[data-rh-section]").length : 0;
      el.textContent = all + " topics";
    } else {
      el.textContent = visible + " of " + total + " topics";
    }
  }

  function filterRecruit(q) {
    var container = host();
    if (!container) return;
    var query = (q || "").trim().toLowerCase();
    var tokens = query ? query.split(/\s+/) : [];
    var sections = Array.prototype.slice.call(container.querySelectorAll("[data-rh-section]"));
    var visible = 0;
    sections.forEach(function (sec) {
      var hay = sec.dataset.haystack || "";
      var match = tokens.every(function (t) { return hay.indexOf(t) !== -1; });
      sec.style.display = match ? "" : "none";
      if (match) {
        visible++;
        toggleSection(sec, !!query); // auto-expand while searching, collapse when cleared
      }
    });
    // hide group headers whose sections are all hidden
    container.querySelectorAll("[data-rh-group]").forEach(function (gh) {
      var n = gh.nextElementSibling, any = false;
      while (n && !n.dataset.rhGroup) {
        if (n.dataset.rhSection && n.style.display !== "none") { any = true; break; }
        n = n.nextElementSibling;
      }
      gh.style.display = any ? "" : "none";
    });
    // empty state
    var empty = document.getElementById("rhEmpty");
    if (visible === 0) {
      if (!empty) {
        empty = document.createElement("div");
        empty.id = "rhEmpty";
        empty.className = "rh-empty";
        container.appendChild(empty);
      }
      empty.textContent = 'No matching topics for "' + q + '"';
      empty.style.display = "";
    } else if (empty) {
      empty.style.display = "none";
    }
    updateCount(visible, sections.length);
  }

  function expandAll(open) {
    var container = host();
    if (!container) return;
    container.querySelectorAll("[data-rh-section]").forEach(function (sec) {
      if (sec.style.display === "none") return;
      toggleSection(sec, open);
    });
  }

  // Switch to the Report Tool with the given report type pre-selected. Dispatches a
  // real change event so the existing binding handles state, persistence and preview.
  function openReportTool(reportType) {
    var sel = document.getElementById("reportType");
    if (sel && reportType && sel.value !== reportType) {
      sel.value = reportType;
      if (sel.value === reportType) sel.dispatchEvent(new Event("change", { bubbles: true }));
    }
    if (typeof window.showToolPage === "function") window.showToolPage("report");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function jumpToSection(id) {
    var sec = document.getElementById("rh-sec-" + id);
    if (!sec) return;
    if (sec.style.display === "none") {
      // Target is filtered out by the current search — clear it first
      var search = document.getElementById("rhSearch");
      if (search) search.value = "";
      filterRecruit("");
    }
    toggleSection(sec, true);
    sec.scrollIntoView({ behavior: "smooth", block: "start" });
    // Flash the section so the reader sees where they landed
    sec.classList.remove("rh-flash");
    void sec.offsetWidth;
    sec.classList.add("rh-flash");
    sec.addEventListener("animationend", function () { sec.classList.remove("rh-flash"); }, { once: true });
    setTimeout(function () { sec.classList.remove("rh-flash"); }, 1600);
  }

  // Entry point for "📖 guide" buttons elsewhere in the app ([data-guide-topic]):
  // switch to the Recruit Helper page and open + scroll to the given topic.
  function openRecruitTopic(id) {
    if (!id) return;
    initRecruitHelper();
    if (typeof window.showToolPage === "function") window.showToolPage("recruit");
    jumpToSection(id);
  }

  function bindGuideTopicLinks() {
    if (document.body.dataset.guideTopicBound === "1") return;
    document.body.dataset.guideTopicBound = "1";
    document.addEventListener("click", function (e) {
      var btn = e.target && e.target.closest ? e.target.closest("[data-guide-topic]") : null;
      if (!btn || !btn.dataset.guideTopic) return;
      openRecruitTopic(btn.dataset.guideTopic);
    });
  }

  function bindShortcutLinks() {
    var container = host();
    if (!container) return;
    container.addEventListener("click", function (e) {
      var link = e.target && e.target.closest
        ? e.target.closest("[data-rh-report],[data-rh-page],[data-rh-jump]")
        : null;
      if (!link || !container.contains(link)) return;
      if (link.dataset.rhReport) {
        openReportTool(link.dataset.rhReport);
      } else if (link.dataset.rhPage) {
        if (typeof window.showToolPage === "function") window.showToolPage(link.dataset.rhPage);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (link.dataset.rhJump) {
        jumpToSection(link.dataset.rhJump);
      }
    });
  }

  function initRecruitHelper() {
    if (rendered) return;
    if (!host()) return;
    rendered = true;
    renderRecruitHelper();
    bindShortcutLinks();
    bindGuideTopicLinks();

    var search = document.getElementById("rhSearch");
    if (search) search.addEventListener("input", function () { filterRecruit(search.value); });

    var clearBtn = document.getElementById("rhClear");
    if (clearBtn) clearBtn.addEventListener("click", function () {
      if (search) { search.value = ""; search.focus(); }
      filterRecruit("");
    });

    var expandBtn = document.getElementById("rhExpandAll");
    if (expandBtn) expandBtn.addEventListener("click", function () { expandAll(true); });

    var collapseBtn = document.getElementById("rhCollapseAll");
    if (collapseBtn) collapseBtn.addEventListener("click", function () { expandAll(false); });
  }

  if (typeof window !== "undefined") {
    window.initRecruitHelper = initRecruitHelper;
    window.renderRecruitHelper = renderRecruitHelper;
    window.filterRecruit = filterRecruit;
    window.openRecruitTopic = openRecruitTopic;
  }
})();
