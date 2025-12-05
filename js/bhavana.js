console.log("Bhavana's D3 Visualization Script");

(function () {
  const CSV_FILE = "salaries-by-major.csv";

  function setDebug(msg) {
    const el = document.querySelector("#bhavana-section .bhavana_hint");
    if (el) el.textContent = msg;
    console.log("[Bhavana debug]", msg);
  }

  async function loadMajorSalaries() {
    let text;
    try {
      const res = await fetch(CSV_FILE, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      text = await res.text();
    } catch (e) {
      console.warn("Fetch failed, using mock data", e);
      const m = mockData();
      m.__mock = true;
      setDebug("Using mock data (fetch error).");
      return m;
    }

    text = text
      .replace(/^\uFEFF/, "")
      .replace(/[\u200B-\u200D\u00A0]/g, "");

    const firstLine = text.split(/\r?\n/)[0] || "";
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semiCount = (firstLine.match(/;/g) || []).length;
    const delim = semiCount > commaCount ? ";" : ",";

    const parser = d3.dsvFormat(delim);
    let raw = parser.parse(text);

    if (!raw.columns || !raw.columns.length) {
      console.warn("No columns after parse, using mock");
      const m = mockData();
      m.__mock = true;
      setDebug("Using mock data (no columns).");
      return m;
    }

    const norm = s =>
      String(s || "")
        .toLowerCase()
        .replace(/^\uFEFF/, "")
        .replace(/[\u200B-\u200D\u00A0]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const colMap = new Map(raw.columns.map(c => [norm(c), c]));

    const pick = regexes => {
      for (const [k] of colMap.entries()) {
        if (regexes.some(r => r.test(k))) return colMap.get(k);
      }
      return null;
    };

    let majorCol = pick([/major$/i, /undergraduate.*major/i, /^major/i]);
    let startCol = pick([
      /early.*career.*pay/i,
      /starting.*median.*salary/i,
      /starting.*salary/i,
      /start.*pay/i
    ]);
    let midCol = pick([
      /mid.*career.*pay/i,
      /mid.*career.*median/i,
      /mid.*salary/i
    ]);

    if (!startCol || !midCol) {
      const cols = raw.columns.filter(c => c !== majorCol);
      const scores = cols
        .map(c => {
          let ok = 0;
          for (let i = 0; i < Math.min(raw.length, 50); i++) {
            const v = toNum(raw[i][c]);
            if (Number.isFinite(v)) ok++;
          }
          return { c, ok };
        })
        .sort((a, b) => b.ok - a.ok);

      if (!startCol && scores[0]) startCol = scores[0].c;
      if (!midCol && scores[1]) midCol = scores[1].c;
    }

    if (!majorCol) {
      majorCol =
        raw.columns.find(c => /major/i.test(c)) || raw.columns[0];
    }

    setDebug(
      `Using: ${CSV_FILE} | delim "${delim}" | Major: ${majorCol} | Start: ${startCol} | Mid: ${midCol}`
    );

    const data = raw
      .map(d => ({
        major: String(d[majorCol]).trim(),
        start: toNum(d[startCol]),
        mid: toNum(d[midCol])
      }))
      .filter(
        d =>
          d.major &&
          Number.isFinite(d.start) &&
          Number.isFinite(d.mid)
      );

    data.forEach(d => {
      d.growth = (d.mid - d.start) / d.start;
      d.multiple = d.mid / d.start;
    });

    if (!data.length) {
      console.error("Zero valid rows after parsing. Columns:", raw.columns);
      throw new Error("Parse produced zero rows");
    }
    return data;
  }

  function toNum(v) {
    const s = String(v ?? "")
      .replace(/[\$,]/g, "")
      .replace(/\s/g, "")
      .trim();
    if (!s || /^na$|^n\/a$/i.test(s)) return NaN;
    const n = +s;
    return Number.isFinite(n) ? n : NaN;
  }

  function mockData() {
    const rows = [
      { major: "Computer Science", start: 65000, mid: 120000 },
      { major: "Mechanical Engineering", start: 62000, mid: 112000 },
      { major: "Economics", start: 58000, mid: 110000 },
      { major: "Nursing", start: 54000, mid: 93000 },
      { major: "Psychology", start: 42000, mid: 72000 },
      { major: "Education", start: 41000, mid: 61000 }
    ];
    rows.forEach(d => {
      d.growth = (d.mid - d.start) / d.start;
      d.multiple = d.mid / d.start;
    });
    return rows;
  }

  // --------------------------------------------------------
  // Viz 1: Growth slopegraph (Bhavana Visualization 1)
  // --------------------------------------------------------
  async function renderGrowthSlopegraph() {
    const mountEl = document.getElementById("bhavana_growth");
    if (!mountEl) return;
    const mount = d3.select(mountEl);
    mount.selectAll("*").remove();

    // Title + subtitle
    mount
      .append("h2")
      .attr("class", "bhavana_title")
      .text("Which majors grow the most from early to mid career?");
    mount
      .append("p")
      .attr("class", "bhavana_subtitle")
      .text("Top majors by salary growth; hover to see details.");

    const tt = mount.append("div").attr("class", "bhavana_tt");

    let data;
    try {
      data = await loadMajorSalaries();
    } catch (e) {
      console.error(e);
      mount
        .append("p")
        .text("Could not parse CSV. Check path and headers.");
      return;
    }

    const TOP = 24;
    data.sort((a, b) => d3.descending(a.growth, b.growth));
    const view = data.slice(0, TOP);

    const margin = { top: 32, right: 260, bottom: 40, left: 160 };
    const width = 1100;
    const height = Math.max(
      480,
      22 * view.length + margin.top + margin.bottom
    );

    const svg = mount
      .append("svg")
      .attr("class", "bhavana_svg")
      .attr("viewBox", [0, 0, width, height]);

    // Soft background
    svg
      .append("rect")
      .attr("x", margin.left - 40)
      .attr("y", margin.top - 20)
      .attr("width", width - margin.left - margin.right + 80)
      .attr("height", height - margin.top - margin.bottom + 40)
      .attr("rx", 18)
      .attr("ry", 18)
      .attr("fill", "#f8fafc");

    const x = d3
      .scalePoint()
      .domain(["Early career", "Mid career"])
      .range([margin.left, width - margin.right])
      .padding(0.6);

    const y = d3
      .scaleLinear()
      .domain([
        0,
        d3.max(view, d => Math.max(d.start, d.mid)) * 1.12
      ])
      .nice()
      .range([height - margin.bottom, margin.top]);

    const fmt = d3.format("$,.0f");
    const color = d3
      .scaleSequential()
      .domain(d3.extent(view, d => d.multiple))
      .interpolator(d3.interpolateYlGnBu);

    // Axes
    svg
      .append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).tickSize(0))
      .call(g => {
        g.select(".domain").remove();
        g
          .selectAll("text")
          .attr("class", "bhavana_axis_label")
          .attr("dy", "1.5em");
      });

    svg
      .append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(8).tickFormat(fmt))
      .call(g => {
        g.select(".domain").remove();
        g.selectAll("line").attr("stroke", "#e2e8f0");
        g
          .selectAll("text")
          .attr("class", "bhavana_axis_label");
      });

    // Gridlines
    svg
      .append("g")
      .attr("class", "bhavana_grid")
      .attr("transform", `translate(${margin.left},0)`)
      .call(
        d3
          .axisLeft(y)
          .tickSize(-1 * (width - margin.left - margin.right))
          .tickFormat("")
      )
      .call(g => {
        g.select(".domain").remove();
        g.selectAll("line").attr("stroke", "#e5e7eb").attr("opacity", 0.7);
      });

    // Lines
    svg
      .append("g")
      .selectAll("path.line")
      .data(view)
      .join("path")
      .attr("fill", "none")
      .attr("stroke", d => color(d.multiple))
      .attr("stroke-width", d =>
        d === view[0] || d === view[1] || d === view[2] ? 3 : 2
      )
      .attr("opacity", 0.9)
      .attr("d", d =>
        d3.line()([
          [x("Early career"), y(d.start)],
          [x("Mid career"), y(d.mid)]
        ])
      )
      .on("mousemove", function (event, d) {
        d3.select(this).attr("stroke-width", 4);
        tt
          .style("opacity", 1)
          .style("left", event.pageX + 12 + "px")
          .style("top", event.pageY + 12 + "px")
          .html(
            `<strong>${d.major}</strong><br>` +
              `Early career: ${fmt(d.start)}<br>` +
              `Mid career: ${fmt(d.mid)}<br>` +
              `Growth: ${(d.growth * 100).toFixed(0)}%`
          );
      })
      .on("mouseleave", function () {
        d3.select(this).attr("stroke-width", 2);
        tt.style("opacity", 0);
      });

    // End dots
    svg
      .append("g")
      .selectAll("circle.early")
      .data(view)
      .join("circle")
      .attr("cx", x("Early career"))
      .attr("cy", d => y(d.start))
      .attr("r", 3)
      .attr("fill", "#64748b");

    svg
      .append("g")
      .selectAll("circle.mid")
      .data(view)
      .join("circle")
      .attr("cx", x("Mid career"))
      .attr("cy", d => y(d.mid))
      .attr("r", 4)
      .attr("fill", "#2563eb");

    function dodgePositions(items, yAccessor, gap, minY, maxY) {
      const nodes = items
        .map((d, i) => ({ i, target: yAccessor(d) }))
        .sort((a, b) => a.target - b.target);
      const pos = new Array(items.length);
      let prev = -Infinity;
      for (let k = 0; k < nodes.length; k++) {
        const t = Math.min(
          Math.max(nodes[k].target, minY),
          maxY
        );
        const yk = Math.max(t, prev + gap);
        pos[nodes[k].i] = yk;
        prev = yk;
      }

      for (let k = nodes.length - 2; k >= 0; k--) {
        pos[nodes[k].i] = Math.min(
          pos[nodes[k].i],
          pos[nodes[k + 1].i] - gap
        );
      }
      for (let k = 0; k < pos.length; k++) {
        pos[k] = Math.max(minY, Math.min(maxY, pos[k]));
      }
      return pos;
    }

    const gap = 14;
    const minY = margin.top;
    const maxY = height - margin.bottom;
    const leftLabelY = dodgePositions(
      view,
      d => y(d.start),
      gap,
      minY,
      maxY
    );
    const rightLabelY = dodgePositions(
      view,
      d => y(d.mid),
      gap,
      minY,
      maxY
    );
    const leftX = x("Early career") - 8;
    const rightX = x("Mid career") + 8;

    // Leaders
    svg
      .append("g")
      .selectAll("path.leaderL")
      .data(view)
      .join("path")
      .attr("fill", "none")
      .attr("stroke", "#cbd5e1")
      .attr("stroke-width", 1)
      .attr("d", (d, i) =>
        d3.line()([
          [x("Early career"), y(d.start)],
          [leftX, leftLabelY[i]]
        ])
      );

    svg
      .append("g")
      .selectAll("path.leaderR")
      .data(view)
      .join("path")
      .attr("fill", "none")
      .attr("stroke", "#cbd5e1")
      .attr("stroke-width", 1)
      .attr("d", (d, i) =>
        d3.line()([
          [x("Mid career"), y(d.mid)],
          [rightX, rightLabelY[i]]
        ])
      );

    // Numeric labels
    svg
      .append("g")
      .selectAll("text.labL")
      .data(view)
      .join("text")
      .attr("x", leftX - 6)
      .attr("y", (d, i) => leftLabelY[i])
      .attr("text-anchor", "end")
      .attr("dy", "0.32em")
      .attr("class", "bhavana_value_label")
      .text(d => fmt(d.start));

    svg
      .append("g")
      .selectAll("text.labR")
      .data(view)
      .join("text")
      .attr("x", rightX + 6)
      .attr("y", (d, i) => rightLabelY[i])
      .attr("text-anchor", "start")
      .attr("dy", "0.32em")
      .attr("class", "bhavana_value_label")
      .text(d => fmt(d.mid));

    // Top majors labels
    const topK = 6;
    svg
      .append("g")
      .selectAll("text.nameR")
      .data(view.slice(0, topK))
      .join("text")
      .attr("x", rightX + 130)
      .attr("y", (d, i) => rightLabelY[i])
      .attr("dy", "0.32em")
      .attr("class", "bhavana_major_label")
      .text(d => d.major);
  }

  // --------------------------------------------------------
  // Viz 2: Salary simulator line chart (Bhavana Visualization 2)
  // --------------------------------------------------------
  async function renderSimulator() {
    const mountEl = document.getElementById("bhavana_sim");
    if (!mountEl) return;
    const mount = d3.select(mountEl);
    mount.selectAll("*").remove();

    // Title + subtitle
    mount
      .append("h2")
      .attr("class", "bhavana_title")
      .text("Will this major pay back your tuition?");
    mount
      .append("p")
      .attr("class", "bhavana_subtitle")
      .text("Compare cumulative earnings for a major against an alternative path.");

    const panel = mount.append("div").attr("class", "bhavana_panel");
    const tt = mount.append("div").attr("class", "bhavana_tt");

    let data;
    try {
      data = await loadMajorSalaries();
    } catch (e) {
      console.error(e);
      mount
        .append("p")
        .text("Could not parse CSV. See console for details.");
      return;
    }
    data.sort((a, b) => d3.ascending(a.major, b.major));

    const select = panel.append("select").attr("class", "bhavana_input");
    select
      .selectAll("option")
      .data(data)
      .join("option")
      .attr("value", d => d.major)
      .text(d => d.major);

    panel
      .append("label")
      .attr("class", "bhavana_label")
      .text("Years in career");
    const years = panel
      .append("input")
      .attr("type", "range")
      .attr("min", 0)
      .attr("max", 20)
      .attr("step", 1)
      .attr("value", 0)
      .attr("class", "bhavana_input");

    panel
      .append("label")
      .attr("class", "bhavana_label")
      .text("Alternative path yearly salary");
    const altInput = panel
      .append("input")
      .attr("type", "number")
      .attr("class", "bhavana_input")
      .attr("placeholder", "35000");

    panel
      .append("label")
      .attr("class", "bhavana_label")
      .text("Total tuition cost");
    const costInput = panel
      .append("input")
      .attr("type", "number")
      .attr("class", "bhavana_input")
      .attr("placeholder", "80000");

    const stat = mount.append("div").attr("class", "bhavana_stat");

    const margin = { top: 20, right: 32, bottom: 40, left: 72 };
    const width = 1100;
    const height = 440;

    const svg = mount
      .append("svg")
      .attr("class", "bhavana_svg")
      .attr("viewBox", [0, 0, width, height]);

    // Background card
    svg
      .append("rect")
      .attr("x", margin.left - 40)
      .attr("y", margin.top - 20)
      .attr("width", width - margin.left - margin.right + 80)
      .attr("height", height - margin.top - margin.bottom + 40)
      .attr("rx", 18)
      .attr("ry", 18)
      .attr("fill", "#f8fafc");

    const x = d3
      .scaleLinear()
      .domain([0, 20])
      .range([margin.left, width - margin.right]);
    const yMax = d3.max(data, d => d.mid) * 1.1;
    const y = d3
      .scaleLinear()
      .domain([0, yMax])
      .nice()
      .range([height - margin.bottom, margin.top]);

    svg
      .append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(
        d3
          .axisBottom(x)
          .ticks(10)
          .tickFormat(d => d + " years")
      )
      .call(g => {
        g.select(".domain").remove();
        g
          .selectAll("text")
          .attr("class", "bhavana_axis_label");
      });

    svg
      .append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(8).tickFormat(d3.format("$,.0f")))
      .call(g => {
        g.select(".domain").remove();
        g.selectAll("line").attr("stroke", "#e2e8f0");
        g
          .selectAll("text")
          .attr("class", "bhavana_axis_label");
      });

    // Gridlines
    svg
      .append("g")
      .attr("class", "bhavana_grid")
      .attr("transform", `translate(${margin.left},0)`)
      .call(
        d3
          .axisLeft(y)
          .tickSize(-1 * (width - margin.left - margin.right))
          .tickFormat("")
      )
      .call(g => {
        g.select(".domain").remove();
        g.selectAll("line").attr("stroke", "#e5e7eb").attr("opacity", 0.7);
      });

    const BLUE = "#2563eb";
    const GRAY = "#64748b";
    const RED = "#ef4444";
    const lineCollege = svg
      .append("path")
      .attr("fill", "none")
      .attr("stroke", BLUE)
      .attr("stroke-width", 3);
    const lineAlt = svg
      .append("path")
      .attr("fill", "none")
      .attr("stroke", GRAY)
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,4");
    const breakevenLine = svg
      .append("line")
      .attr("stroke", RED)
      .attr("stroke-width", 2)
      .attr("opacity", 0);

    const fmt = d3.format("$,.0f");

    const salaryPath = major =>
      d3.range(0, 21).map(yidx => ({
        year: yidx,
        salary:
          yidx <= 10
            ? d3.interpolateNumber(major.start, major.mid)(yidx / 10)
            : major.mid
      }));

    const constantPath = v =>
      d3
        .range(0, 21)
        .map(yidx => ({ year: yidx, salary: +v || 0 }));

    const cumulative = arr => {
      let c = 0;
      return arr.map(p => (c += p.salary));
    };

    function update() {
      const major =
        data.find(d => d.major === select.node().value) || data[0];
      const path1 = salaryPath(major);
      const altVal = +altInput.node().value || 0;
      const path2 = constantPath(altVal);

      lineCollege.attr(
        "d",
        d3
          .line()
          .x(d => x(d.year))
          .y(d => y(d.salary))(path1)
      );
      lineAlt.attr(
        "d",
        d3
          .line()
          .x(d => x(d.year))
          .y(d => y(d.salary))(path2)
      );

      const cost = +costInput.node().value || 0;
      let breakevenYear = null;
      if (altVal > 0 && cost > 0) {
        const c1 = cumulative(path1);
        const c2 = cumulative(path2).map(v => v + cost);
        for (let i = 0; i < c1.length; i++) {
          if (c1[i] >= c2[i]) {
            breakevenYear = i;
            break;
          }
        }
      }

      if (breakevenYear != null) {
        breakevenLine
          .attr("x1", x(breakevenYear))
          .attr("x2", x(breakevenYear))
          .attr("y1", y.range()[0])
          .attr("y2", y.range()[1])
          .attr("opacity", 1);
        stat.text(
          `Major: ${major.major} | Early ${fmt(
            major.start
          )}, Mid ${fmt(
            major.mid
          )} | Break even near year ${breakevenYear}`
        );
      } else {
        breakevenLine.attr("opacity", 0);
        stat.text(
          `Major: ${major.major} | Early ${fmt(
            major.start
          )}, Mid ${fmt(
            major.mid
          )}. Enter an alternative salary and tuition to see break even.`
        );
      }
    }

    select.on("change", update);
    years.on("input", function () {
      const yr = +this.value;
      const major =
        data.find(d => d.major === select.node().value) || data[0];
      const s =
        yr <= 10
          ? d3.interpolateNumber(major.start, major.mid)(yr / 10)
          : major.mid;
      const px = x(yr);
      const py = y(s);
      tt
        .style("opacity", 1)
        .style("left", px + 24 + "px")
        .style("top", py + "px")
        .html(
          `<strong>${major.major}</strong><br>Year ${yr}: ${fmt(s)}`
        );
    });
    altInput.on("input", update);
    costInput.on("input", update);

    update();
  }

  // --------------------------------------------------------
  // Entry points for the map (no buttons)
  // --------------------------------------------------------
  function bhavanaEnsureGrowthSection() {
    const root = d3.select("#viz-container");
    if (root.empty()) {
      console.warn("Bhavana viz: #viz-container not found");
      return null;
    }

    root.html("");

    const section = root
      .append("section")
      .attr("id", "bhavana-section");

    section
      .append("div")
      .attr("class", "bhavana_hint")
      .text("Growth in pay from early career to mid career across majors.");

    section
      .append("div")
      .attr("id", "bhavana_growth")
      .attr("class", "bhavana_chart");

    return section;
  }

  function bhavanaEnsureSimSection() {
    const root = d3.select("#viz-container");
    if (root.empty()) {
      console.warn("Bhavana viz: #viz-container not found");
      return null;
    }

    root.html("");

    const section = root
      .append("section")
      .attr("id", "bhavana-section");

    section
      .append("div")
      .attr("class", "bhavana_hint")
      .text("Simulate a major against an alternative path and tuition cost.");

    section
      .append("div")
      .attr("id", "bhavana_sim")
      .attr("class", "bhavana_chart");

    return section;
  }

  // Called from map.js
  window.bhavanaViz1 = async function () {
    if (!bhavanaEnsureGrowthSection()) return;
    await renderGrowthSlopegraph();
  };

  window.bhavanaViz2 = async function () {
    if (!bhavanaEnsureSimSection()) return;
    await renderSimulator();
  };
})();
