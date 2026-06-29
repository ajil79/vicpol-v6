/* Recruit Helper page — renders the RECRUIT_HANDBOOK reference as searchable accordion
   sections. Standalone reference; does NOT touch report state, output or persistence. */

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

  function initRecruitHelper() {
    if (rendered) return;
    if (!host()) return;
    rendered = true;
    renderRecruitHelper();

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
  }
})();
