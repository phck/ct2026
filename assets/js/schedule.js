/* CT programme renderer.
   Expects three globals (schedule.html injects them via | jsonify):
     window.CT_SCHEDULE  -> _data/schedule.yml
     window.CT_ABSTRACTS -> _data/abstracts.yml  (list of {slug,title,author,permalink})
     window.CT_BASEURL   -> site.baseurl
   Renders the week grid and per-day views, wired to the floating day selector. */
(function () {
  "use strict";
  var S = window.CT_SCHEDULE, ABS = {};
  (window.CT_ABSTRACTS || []).forEach(function (a) { ABS[a.slug] = a; });
  var BASE = window.CT_BASEURL || "";
  var ROOMS = S.rooms, PROOM = S.plenary_room, DAYS = S.days;
  var root = document.querySelector(".ctprog");
  var elWeek = root.querySelector("#ct-week"), elDay = root.querySelector("#ct-day"),
      elGrid = root.querySelector("#ct-grid"), elSel = root.querySelector("#ct-selector");
  var activeRoom = 0;

  function res(t) {
    if (!t) return null;
    if (t.tbd) return { name: t.name, last: t.last, title: null, url: null, mode: t.mode || null, tbd: true, time: t.time };
    var a = ABS[t.slug] || {};
    return {
      name: t.name || a.author || t.slug,
      last: t.last || String(a.author || "").split(" ").pop(),
      title: a.title || null, url: a.permalink ? BASE + a.permalink : null,
      mode: t.mode || null, tbd: false, time: t.time
    };
  }
  function esc(s){ return String(s).replace(/[&<>]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;'}[c];}); }
  var MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  function fmtDate(iso){ if(!iso) return ""; var p=String(iso).split("-"); return MONTHS[+p[1]-1]+" "+(+p[2]); }
  function link(r){ return r.url ? '<a class="lnk" href="'+r.url+'">'+esc(r.name)+'</a>' : esc(r.name); }
  function titleLink(r){ return r.url ? '<a class="lnk" href="'+r.url+'">'+esc(r.title)+'</a>' : esc(r.title||""); }
  function modeTag(m){ return m ? '<span class="tag">'+esc(m)+'</span>' : ""; }

  /* ---------- day view ---------- */
  function plenaryCard(kind, label, r, time) {
    var title = r.tbd ? '<div class="ctba">TBD</div>'
              : (r.title ? '<div class="ctitle">'+titleLink(r)+'</div>' : "");
    return '<div class="card '+kind+'">'
      + '<div class="ctop"><span class="ctime mono">'+esc(time)+'</span>'
      + '<span class="ckind">'+label+'</span><span class="croom">'+esc(PROOM)+'</span></div>'
      + '<div class="cname">'+link(r)+' '+modeTag(r.mode)+'</div>'+title+'</div>';
  }
  function roomsSession(sess, kind) {
    var kc = kind === "lightning" ? "var(--lightning)" : "var(--parallel)";
    var klabel = kind === "lightning" ? "Lightning · 7 min" : "Parallel · 25 min";
    var n = sess.rooms.length;
    // rows shared by the desktop subgrid: 1 room-name header + the longest track
    var nrows = sess.rooms.reduce(function (m, r) { return Math.max(m, r.length); }, 0) + 1;
    var tabs = '<div class="roomtabs">';
    ROOMS.forEach(function (rm, i) {
      tabs += '<button class="roomtab" data-room="'+i+'" aria-pressed="'+(i===activeRoom)+'">'+esc(rm)+'</button>';
    });
    tabs += '</div>';
    var tracks = '<div class="tracks" style="--ncols:'+n+';--nrows:'+nrows+'">';
    sess.rooms.forEach(function (room, i) {
      var cards = room.map(res).map(function (t) {
        return '<div class="card" style="--c:'+kc+'">'
          + '<div class="ctop"><span class="ctime mono">'+esc(t.time)+'</span></div>'
          + '<div class="cname">'+link(t)+' '+modeTag(t.mode)+'</div>'
          + (t.title ? '<div class="ctitle">'+titleLink(t)+'</div>' : "") + '</div>';
      }).join("");
      tracks += '<div class="track '+(i===activeRoom?'shown':'')+'" data-room="'+i+'">'
        + '<div class="ttheme">'+esc(ROOMS[i])+'</div>'+cards+'</div>';
    });
    tracks += '</div>';
    var note = sess.note ? '<div class="snote">'+esc(sess.note)+'</div>' : "";
    return '<div class="sessgap"></div><div class="rooms '+kind+'" style="--kc:'+kc+'">'
      + '<div class="rhead"><span class="ckind">'+klabel+' · '+esc(sess.time)+'</span>'+tabs+'</div>'
      + '<div class="stackwrap" data-n="'+n+'">'+tracks+'</div>'+note+'</div>';
  }
  function renderDay(day) {
    var h = '<div class="dayhead"><h2>'+esc(day.full)
          + (day.date ? ' <span class="ddate">• '+esc(fmtDate(day.date))+'</span>' : '')
          + '</h2>';
    if (day.note) h += '<span class="dnote">'+esc(day.note)+'</span>';
    h += '</div><div class="tznote">All times in Baltimore (EDT, UTC−4) · <a href="'+BASE+'/assets/pdf/ct2026-program.pdf">download the full program (PDF)</a></div><div class="stream">';
    if (day.invited) h += plenaryCard("invited", "Invited · 55 min", res(day.invited), day.invited.time || "09:00");
    (day.contributed || []).forEach(function (t, i) {
      h += plenaryCard("contributed", "Contributed · 25 min", res(t), t.time);
      if (i === 0) h += '<div class="brk">10:30 · Coffee break</div>';
    });
    if (day.parallel) {
      h += '<div class="brk big">12:30 · Lunch break</div>';
      h += roomsSession(day.parallel, "parallel");
      h += '<div class="brk">16:00 · Coffee break</div>';
    }
    if (day.lightning) h += roomsSession(day.lightning, "lightning");
    (day.socials || []).forEach(function (s) {
      var u = s.until ? " – " + esc(s.until) : "";
      h += '<div class="card social"><div class="ctop"><span class="ctime mono">'+esc(s.time)+u+'</span></div>'
        + '<div class="cname">'+esc(s.title)+'</div>'
        + (s.venue ? '<div class="cvenue">'+esc(s.venue)+'</div>' : '') + '</div>';
    });
    h += '</div>';
    elDay.innerHTML = h;
    elDay.querySelectorAll(".roomtab").forEach(function (b) {
      b.addEventListener("click", function () { setRoom(+b.dataset.room); });
    });
  }
  function setRoom(i) {
    activeRoom = i;
    root.querySelectorAll(".roomtab").forEach(function (b) { b.setAttribute("aria-pressed", +b.dataset.room === i); });
    root.querySelectorAll(".track").forEach(function (tr) { tr.classList.toggle("shown", +tr.dataset.room === i); });
  }

  /* ---------- week grid (derived from the same day data) ---------- */
  var DI = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  function nm(t) { var r = res(t); return r.url ? '<a class="nm" href="'+r.url+'">'+esc(r.last)+'</a>' : '<span class="nm tba">'+esc(r.last)+'</span>'; }
  function socialBtn(id, label) { return '<button type="button" class="lbl socialbtn" data-day="'+id+'">'+esc(label)+'</button>'; }
  function pslot(day, s) { if (!day.parallel) return null; var o = day.parallel.rooms.map(function (r) { return r[s]; }).filter(Boolean); return o.length ? o : null; }
  function buildGrid() {
    var D = {}; DAYS.forEach(function (d) { D[d.id] = d; });
    var rows = [
      { k: "inv", t: "9:00" }, { k: "c0", t: "10:00" }, { k: "coffeeAM", t: "10:30" },
      { k: "c1", t: "11:00" }, { k: "c2", t: "11:30" }, { k: "c3", t: "12:00" },
      { k: "lunch", t: "12:30" }, { k: "p0", t: "2:30" }, { k: "p1", t: "3:00" }, { k: "p2", t: "3:30" },
      { k: "coffeePM", t: "4:00" }, { k: "late", t: "4:30" }, { k: "eve", t: "eve" }
    ];
    var R = rows.length, cells = []; for (var r = 0; r < R; r++) cells.push({});
    rows.forEach(function (row, ri) {
      DI.forEach(function (id) {
        var d = D[id], c = null; if (!d) { cells[ri][id] = null; return; }
        switch (row.k) {
          case "inv": if (d.invited) c = { t: "invited", html: nm(d.invited) }; break;
          case "c0": case "c1": case "c2": case "c3": {
            var idx = +row.k[1]; if (d.contributed && d.contributed[idx]) c = { t: "contributed", html: nm(d.contributed[idx]) }; break;
          }
          case "coffeeAM": if (d.invited || (d.contributed && d.contributed.length)) c = { t: "break", brk: "Coffee break" }; break;
          case "lunch":
            if (d.excursion) c = { t: "social", html: socialBtn(id, "Excursion"), rs: 7 };
            else if (d.parallel) c = { t: "break", brk: "Lunch break" }; break;
          case "p0": case "p1": case "p2": {
            var s = +row.k[1], list = pslot(d, s); if (list) c = { t: "parallel", html: list.map(nm).join("") }; break;
          }
          case "coffeePM": if (d.parallel) c = { t: "break", brk: "Coffee break" }; break;
          case "late":
            if (d.lightning) c = { t: "lightning", html: '<button type="button" class="lbl lightbtn" data-day="'+id+'">⚡ Lightning</button>' };
            break;
          case "eve": if (d.socials && d.socials.length && !d.excursion) c = { t: "social", html: socialBtn(id, d.socials[0].title) }; break;
        }
        cells[ri][id] = c;
      });
    });
    // horizontal-merge adjacent identical break cells
    rows.forEach(function (row, ri) {
      var i = 0;
      while (i < 7) {
        var c = cells[ri][DI[i]];
        if (c && c.t === "break") {
          var j = i + 1;
          while (j < 7) { var cc = cells[ri][DI[j]]; if (cc && cc.t === "break" && cc.brk === c.brk) { cells[ri][DI[j]] = "COVERED"; j++; } else break; }
          if (j - i > 1) c.cs = j - i; i = j;
        } else i++;
      }
    });
    // vertical-merge excursion
    var lunchRow = 6;
    if (cells[lunchRow]["wed"] && cells[lunchRow]["wed"].rs) {
      for (var rr = lunchRow + 1; rr < lunchRow + 7; rr++) cells[rr]["wed"] = "COVERED";
    }
    var h = '<table class="grid"><thead><tr><th></th>';
    ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach(function (d) { h += '<th>'+d+'</th>'; });
    h += '</tr></thead><tbody>';
    rows.forEach(function (row, ri) {
      h += '<tr><th class="time">'+row.t+'</th>';
      DI.forEach(function (id) {
        var c = cells[ri][id];
        if (c === "COVERED") return;
        if (!c) { h += '<td class="empty"></td>'; return; }
        var span = (c.cs ? ' colspan="'+c.cs+'"' : "") + (c.rs ? ' rowspan="'+c.rs+'"' : "");
        var inner = c.brk !== undefined ? c.brk : c.html;
        h += '<td class="'+c.t+'"'+span+'>'+inner+'</td>';
      });
      h += '</tr>';
    });
    h += '</tbody></table>';
    elGrid.innerHTML = h;
    elGrid.querySelectorAll("button.lightbtn").forEach(function (b) {
      b.addEventListener("click", function () { goLightning(b.dataset.day); });
    });
    elGrid.querySelectorAll("button.socialbtn").forEach(function (b) {
      b.addEventListener("click", function () { goSocial(b.dataset.day); });
    });
  }
  // From the week grid's "⚡ Lightning" cell: open that day and scroll to its
  // lightning section.
  function goLightning(id) {
    show(id, true);
    var sec = elDay.querySelector(".rooms.lightning");
    if (sec) sec.scrollIntoView({ behavior: "smooth", block: "start" });
    else window.scrollTo({ top: 0 });
  }
  // From the week grid's social cell (Reception / dinner / excursion): open that
  // day and scroll to its social card, where the venue is shown.
  function goSocial(id) {
    show(id, true);
    var sec = elDay.querySelector(".card.social");
    if (sec) sec.scrollIntoView({ behavior: "smooth", block: "center" });
    else window.scrollTo({ top: 0 });
  }

  /* ---------- selector / routing ---------- */
  function buildSelector() {
    var h = '<button class="daybtn week" data-day="week" aria-pressed="false">Week</button><span class="sep"></span>';
    DAYS.forEach(function (d) { h += '<button class="daybtn" data-day="'+d.id+'" aria-pressed="false">'+esc(d.label)+'</button>'; });
    elSel.innerHTML = h;
    elSel.querySelectorAll(".daybtn").forEach(function (b) { b.addEventListener("click", function () { show(b.dataset.day); }); });
  }
  function show(key, keepScroll) {
    root.querySelectorAll(".daybtn").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.day === key); });
    if (key === "week") { elWeek.classList.add("active"); elDay.classList.remove("active"); }
    else {
      var d = DAYS.filter(function (x) { return x.id === key; })[0] || DAYS[1];
      renderDay(d); elDay.classList.add("active"); elWeek.classList.remove("active");
    }
    if (!keepScroll) window.scrollTo({ top: 0 });
  }
  buildGrid(); buildSelector();
  // "YYYY-MM-DD" for the current date in the conference's timezone (US Eastern),
  // so remote viewers in Asia/Australia still see the venue's day, not their own.
  function todayET(){
    try {
      return new Intl.DateTimeFormat("en-CA", { timeZone:"America/New_York", year:"numeric", month:"2-digit", day:"2-digit" }).format(new Date());
    } catch (e) {
      var d=new Date(),p=function(n){return(n<10?"0":"")+n;};
      return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate());
    }
  }
  // On phones, open on today's session day during the conference (Mon–Sat only,
  // since Sunday is just the reception); desktop always opens on the week grid.
  var initial = "week";
  if (window.matchMedia("(max-width:720px)").matches) {
    var iso = todayET(), today = DAYS.filter(function (x) { return x.date === iso && x.id !== "sun"; })[0];
    if (today) initial = today.id;
  }
  show(initial);
})();
