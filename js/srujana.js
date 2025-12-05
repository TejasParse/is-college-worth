// js/srujana.js

function srujanaInitViz() {
  // --- DATA ---
  const srujanaDataOriginal = [
    { attainment: "Doctoral degree",                 earnings: 2278, unemployment: 1.2 },
    { attainment: "Professional degree",             earnings: 2363, unemployment: 1.3 },
    { attainment: "Master's degree",                 earnings: 1840, unemployment: 2.2 },
    { attainment: "Bachelor's degree",               earnings: 1543, unemployment: 2.5 },
    { attainment: "Associate's degree",              earnings: 1099, unemployment: 2.8 },
    { attainment: "Some college, no degree",         earnings: 1020, unemployment: 3.8 },
    { attainment: "High school diploma",             earnings: 930,  unemployment: 4.2 },
    { attainment: "Less than a high school diploma", earnings: 738,  unemployment: 6.2 },
    { attainment: "Total (all education levels)",    earnings: 1221, unemployment: 3.3 }
  ];

  let srujanaData = srujanaDataOriginal.slice();

  // --- ROOT CONTAINER INSIDE #viz-container ---
  let srujanaRoot = d3.select("#srujana-viz");
  if (srujanaRoot.empty()) {
    srujanaRoot = d3.select("#viz-container")
      .append("div")
      .attr("id", "srujana-viz");
  } else {
    srujanaRoot.selectAll("*").remove();
  }

  // Inner card container
  const srujanaContainer = srujanaRoot.append("div")
    .attr("class", "srujana-container");

  srujanaContainer.append("h2")
    .attr("class", "srujana-title")
    .text("Unemployment & Earnings by Educational Attainment (2024)");

  srujanaContainer.append("p")
    .attr("class", "srujana-subtitle")
    .text("Hover, sort, toggle, and download to explore how education level relates to median earnings and unemployment.");

  // CONTROLS
  const srujanaControls = srujanaContainer.append("div")
    .attr("class", "srujana-controls");

  const srujanaSortGroup = srujanaControls.append("div")
    .attr("class", "srujana-controls-group");

  srujanaSortGroup.append("span")
    .attr("class", "srujana-pill-label")
    .text("Sort");

  srujanaSortGroup.append("button")
    .attr("id", "srujana-sort-original")
    .attr("class", "srujana-btn srujana-sort-btn srujana-sort-btn-active")
    .text("Education level");

  srujanaSortGroup.append("button")
    .attr("id", "srujana-sort-earnings")
    .attr("class", "srujana-btn srujana-sort-btn")
    .text("Highest earnings");

  srujanaSortGroup.append("button")
    .attr("id", "srujana-sort-unemployment")
    .attr("class", "srujana-btn srujana-sort-btn")
    .text("Lowest unemployment");

  const srujanaToggleGroup = srujanaControls.append("div")
    .attr("class", "srujana-controls-group");

  const srujanaToggleEarnings = srujanaToggleGroup.append("label")
    .attr("class", "srujana-toggle");

  srujanaToggleEarnings.append("input")
    .attr("type", "checkbox")
    .attr("id", "srujana-toggle-earnings")
    .property("checked", true);

  srujanaToggleEarnings.append("span").text("Earnings bars");

  const srujanaToggleUnemp = srujanaToggleGroup.append("label")
    .attr("class", "srujana-toggle");

  srujanaToggleUnemp.append("input")
    .attr("type", "checkbox")
    .attr("id", "srujana-toggle-unemployment")
    .property("checked", true);

  srujanaToggleUnemp.append("span").text("Unemployment line");

  const srujanaRightGroup = srujanaControls.append("div")
    .attr("class", "srujana-controls-group srujana-controls-right");

  srujanaRightGroup.append("button")
    .attr("id", "srujana-downloadPNG")
    .attr("class", "srujana-btn")
    .text("Download as PNG");

  const srujanaSvg = srujanaContainer.append("svg")
    .attr("id", "srujana-chart");

  srujanaContainer.append("div")
    .attr("class", "srujana-source-note")
    .text("Source: Current Population Survey, U.S. Bureau of Labor Statistics. Data for persons age 25 and over.");

  const srujanaTooltip = srujanaRoot.append("div")
    .attr("id", "srujana-tooltip");

  // CHART SETUP
  const srujanaRect = srujanaSvg.node().getBoundingClientRect();
  const srujanaWidth = srujanaRect.width || 1100;
  const srujanaHeight = 450;

  const srujanaMargin = { top: 40, right: 70, bottom: 110, left: 70 };
  const srujanaInnerWidth = srujanaWidth - srujanaMargin.left - srujanaMargin.right;
  const srujanaInnerHeight = srujanaHeight - srujanaMargin.top - srujanaMargin.bottom;

  srujanaSvg.attr("height", srujanaHeight);

  const srujanaG = srujanaSvg.append("g")
    .attr("transform", `translate(${srujanaMargin.left},${srujanaMargin.top})`);

  const srujanaX = d3.scaleBand()
    .padding(0.25)
    .range([0, srujanaInnerWidth]);

  const srujanaYEarnings = d3.scaleLinear()
    .range([srujanaInnerHeight, 0]);

  const srujanaYUnemp = d3.scaleLinear()
    .range([srujanaInnerHeight, 0]);

  const srujanaEarningsColor = "#4f46e5";
  const srujanaUnempColor = "#e11d48";

  const srujanaXAxisG = srujanaG.append("g")
    .attr("class", "axis srujana-x-axis")
    .attr("transform", `translate(0,${srujanaInnerHeight})`);

  const srujanaYAxisLeftG = srujanaG.append("g")
    .attr("class", "axis srujana-y-axis-left");

  const srujanaYAxisRightG = srujanaG.append("g")
    .attr("class", "axis srujana-y-axis-right")
    .attr("transform", `translate(${srujanaInnerWidth},0)`);

  srujanaG.append("text")
    .attr("class", "y-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -srujanaInnerHeight / 2)
    .attr("y", -52)
    .attr("text-anchor", "middle")
    .text("Median usual weekly earnings ($)");

  srujanaG.append("text")
    .attr("class", "y-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -srujanaInnerHeight / 2)
    .attr("y", srujanaInnerWidth + 54)
    .attr("text-anchor", "middle")
    .text("Unemployment rate (%)");

  const srujanaLegend = srujanaG.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(0,-16)`);

  const srujanaLegendItems = [
    { label: "Median earnings",    color: srujanaEarningsColor, shape: "rect" },
    { label: "Unemployment rate", color: srujanaUnempColor,    shape: "circle" },
  ];

  const srujanaLegendItem = srujanaLegend.selectAll(".srujana-legend-item")
    .data(srujanaLegendItems)
    .enter()
    .append("g")
    .attr("class", "srujana-legend-item")
    .attr("transform", (d, i) => `translate(${i * 170}, 0)`);

  srujanaLegendItem.append("rect")
    .filter(d => d.shape === "rect")
    .attr("x", 0)
    .attr("y", -8)
    .attr("width", 16)
    .attr("height", 16)
    .attr("fill", d => d.color);

  srujanaLegendItem.append("circle")
    .filter(d => d.shape === "circle")
    .attr("cx", 8)
    .attr("cy", 0)
    .attr("r", 5)
    .attr("fill", d => d.color);

  srujanaLegendItem.append("text")
    .attr("x", 24)
    .attr("y", 4)
    .text(d => d.label);

  const srujanaLine = d3.line()
    .x(d => srujanaX(d.attainment) + srujanaX.bandwidth() / 2)
    .y(d => srujanaYUnemp(d.unemployment))
    .curve(d3.curveMonotoneX);

  const srujanaBarsG = srujanaG.append("g").attr("class", "srujana-bars-group");
  const srujanaLineG = srujanaG.append("g").attr("class", "srujana-line-group");
  const srujanaDotsG = srujanaG.append("g").attr("class", "srujana-dots-group");

  function srujanaShowTooltip(event, d) {
    const earningsFmt = d3.format(",");
    const html = `
      <strong>${d.attainment}</strong><br/>
      Median earnings: <strong>$${earningsFmt(d.earnings)}</strong>/week<br/>
      Unemployment rate: <strong>${d.unemployment.toFixed(1)}%</strong><br/>
    `;

    const rootRect = srujanaRoot.node().getBoundingClientRect();
    srujanaTooltip
      .html(html)
      .style("left", (event.clientX - rootRect.left + 12) + "px")
      .style("top", (event.clientY - rootRect.top + 12) + "px")
      .style("opacity", 1)
      .style("transform", "translateY(0px)");
  }

  function srujanaHideTooltip() {
    srujanaTooltip
      .style("opacity", 0)
      .style("transform", "translateY(4px)");
  }

  function srujanaUpdateChart(withTransition = true) {
    srujanaX.domain(srujanaData.map(d => d.attainment));
    srujanaYEarnings.domain([0, d3.max(srujanaData, d => d.earnings) * 1.1]);
    srujanaYUnemp.domain([0, d3.max(srujanaData, d => d.unemployment) * 1.15]);

    const t = withTransition ? srujanaSvg.transition().duration(700) : null;

    const xAxis = d3.axisBottom(srujanaX).tickSizeOuter(0);
    const yAxisLeft = d3.axisLeft(srujanaYEarnings)
      .ticks(6)
      .tickFormat(d => "$" + d3.format(",")(d));
    const yAxisRight = d3.axisRight(srujanaYUnemp)
      .ticks(6)
      .tickFormat(d => d + "%");

    if (withTransition) {
      srujanaXAxisG.transition(t).call(xAxis);
      srujanaYAxisLeftG.transition(t).call(yAxisLeft);
      srujanaYAxisRightG.transition(t).call(yAxisRight);
    } else {
      srujanaXAxisG.call(xAxis);
      srujanaYAxisLeftG.call(yAxisLeft);
      srujanaYAxisRightG.call(yAxisRight);
    }

    const showEarnings = d3.select("#srujana-toggle-earnings").property("checked");
    const showUnemp = d3.select("#srujana-toggle-unemployment").property("checked");

    // Bars
    const bars = srujanaBarsG.selectAll(".srujana-bar")
      .data(srujanaData, d => d.attainment);

    bars.enter()
      .append("rect")
      .attr("class", "srujana-bar")
      .attr("x", d => srujanaX(d.attainment))
      .attr("width", srujanaX.bandwidth())
      .attr("y", srujanaInnerHeight)
      .attr("height", 0)
      .attr("fill", srujanaEarningsColor)
      .attr("opacity", showEarnings ? 1 : 0)
      .on("mouseenter", function (event, d) {
        d3.select(this).attr("opacity", showEarnings ? 0.85 : 0);
        srujanaShowTooltip(event, d);
      })
      .on("mousemove", srujanaShowTooltip)
      .on("mouseleave", function () {
        d3.select(this).attr("opacity", showEarnings ? 1 : 0);
        srujanaHideTooltip();
      })
      .merge(bars)
      .transition(t)
      .attr("x", d => srujanaX(d.attainment))
      .attr("width", srujanaX.bandwidth())
      .attr("y", d => srujanaYEarnings(d.earnings))
      .attr("height", d => srujanaInnerHeight - srujanaYEarnings(d.earnings))
      .attr("opacity", showEarnings ? 1 : 0);

    bars.exit()
      .transition(t)
      .attr("y", srujanaInnerHeight)
      .attr("height", 0)
      .remove();

    // Line
    const linePath = srujanaLineG.selectAll(".srujana-unemp-line")
      .data(showUnemp ? [srujanaData] : []);

    linePath.enter()
      .append("path")
      .attr("class", "srujana-unemp-line")
      .attr("stroke", srujanaUnempColor)
      .attr("fill", "none")
      .attr("stroke-width", 2.5)
      .attr("d", srujanaLine)
      .attr("opacity", 0)
      .transition(t)
      .attr("opacity", 1)
      .attr("d", srujanaLine);

    linePath.transition(t)
      .attr("d", srujanaLine)
      .attr("opacity", showUnemp ? 1 : 0);

    linePath.exit()
      .transition(t)
      .attr("opacity", 0)
      .remove();

    // Dots
    const dots = srujanaDotsG.selectAll(".srujana-unemp-dot")
      .data(srujanaData, d => d.attainment);

    dots.enter()
      .append("circle")
      .attr("class", "srujana-unemp-dot")
      .attr("r", 5)
      .attr("fill", srujanaUnempColor)
      .attr("cx", d => srujanaX(d.attainment) + srujanaX.bandwidth() / 2)
      .attr("cy", srujanaInnerHeight)
      .attr("opacity", showUnemp ? 1 : 0)
      .on("mouseenter", function (event, d) {
        d3.select(this).attr("r", 6.5);
        srujanaShowTooltip(event, d);
      })
      .on("mousemove", srujanaShowTooltip)
      .on("mouseleave", function () {
        d3.select(this).attr("r", 5);
        srujanaHideTooltip();
      })
      .merge(dots)
      .transition(t)
      .attr("cx", d => srujanaX(d.attainment) + srujanaX.bandwidth() / 2)
      .attr("cy", d => srujanaYUnemp(d.unemployment))
      .attr("opacity", showUnemp ? 1 : 0);

    dots.exit()
      .transition(t)
      .attr("cy", srujanaInnerHeight)
      .attr("opacity", 0)
      .remove();
  }

  srujanaUpdateChart(false);

  function srujanaSetActiveSort(buttonId) {
    srujanaContainer.selectAll(".srujana-sort-btn").classed("srujana-sort-btn-active", false);
    d3.select(buttonId).classed("srujana-sort-btn-active", true);
  }

  d3.select("#srujana-sort-original").on("click", () => {
    srujanaData = srujanaDataOriginal.slice();
    srujanaSetActiveSort("#srujana-sort-original");
    srujanaUpdateChart(true);
  });

  d3.select("#srujana-sort-earnings").on("click", () => {
    srujanaData = srujanaData.slice().sort((a, b) => d3.descending(a.earnings, b.earnings));
    srujanaSetActiveSort("#srujana-sort-earnings");
    srujanaUpdateChart(true);
  });

  d3.select("#srujana-sort-unemployment").on("click", () => {
    srujanaData = srujanaData.slice().sort((a, b) => d3.ascending(a.unemployment, b.unemployment));
    srujanaSetActiveSort("#srujana-sort-unemployment");
    srujanaUpdateChart(true);
  });

  d3.select("#srujana-toggle-earnings").on("change", () => srujanaUpdateChart(true));
  d3.select("#srujana-toggle-unemployment").on("change", () => srujanaUpdateChart(true));

  function srujanaDownloadPNG() {
    const svgNode = document.querySelector("#srujana-chart");
    const rect = svgNode.getBoundingClientRect();
    const scale = 2;

    const svgData = new XMLSerializer().serializeToString(svgNode);
    const canvas = document.createElement("canvas");
    canvas.width = rect.width * scale;
    canvas.height = rect.height * scale;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const img = new Image();
    img.onload = function () {
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = "education_chart.png";
      link.href = pngFile;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    img.src = "data:image/svg+xml;base64," +
      btoa(unescape(encodeURIComponent(svgData)));
  }

  d3.select("#srujana-downloadPNG").on("click", srujanaDownloadPNG);
}
function srujanaViz2() {
  // --- root container inside #viz-container ---
  let root = d3.select("#srujana-viz");
  if (root.empty()) {
    root = d3.select("#viz-container").append("div").attr("id", "srujana-viz");
  } else {
    root.selectAll("*").remove(); // clear previous content
  }

  const container = root.append("div")
    .attr("class", "srujana-container");

  // Title + subtitle
  container.append("h2")
    .attr("class", "srujana-sankey-title")
    .text("Education Pathways into Occupations");

  container.append("p")
    .attr("class", "srujana-sankey-subtitle")
    .text("Each ribbon shows the share of workers flowing from an education level (left) into a specific occupation (right). Thicker links mean more workers.");

  // Controls
  const controls = container.append("div")
    .attr("class", "srujana-sankey-controls");

  const leftControls = controls.append("div")
    .attr("class", "srujana-sankey-controls-left");

  leftControls.append("span")
    .attr("class", "srujana-pill-label")
    .text("Highlight");

  const highlightChip = leftControls.append("label")
    .attr("class", "srujana-toggle-chip");

  highlightChip.append("input")
    .attr("type", "checkbox")
    .attr("id", "srujana-highlightCollege")
    .property("checked", false);

  highlightChip.append("span")
    .text("College-heavy occupations (≥ 60% Bachelor’s+)");

  const rightControls = controls.append("div")
    .attr("class", "srujana-sankey-controls-right");

  rightControls.append("button")
    .attr("id", "srujana-downloadSVG")
    .attr("class", "srujana-btn")
    .text("Download SVG");

  // SVG + tooltip
  const svg = container.append("svg")
    .attr("id", "srujana-sankey-chart")
    .attr("class", "srujana-sankey-svg")
    .attr("height", 540);

  container.append("div")
    .attr("class", "srujana-sankey-legend")
    .html(`
      <span>
        <span class="srujana-legend-swatch" style="background:#4f46e5;"></span>
        College degrees (Bachelor’s, Master’s, Doctoral)
      </span>
      <span>
        <span class="srujana-legend-swatch" style="background:#22c55e;"></span>
        Sub-bachelor education
      </span>
    `);

  container.append("div")
    .attr("class", "srujana-sankey-source-note")
    .text("Data: Educational attainment for workers 25+ by occupation (percent distribution by education level).");

  const tooltip = root.append("div")
    .attr("id", "srujana-sankey-tooltip");

  // ----- DATA -----
  const occupationRows = [
    ['Total, all occupations', '00-0000', 7.4, 22.5, 18.6, 9.5, 25.2, 11.9, 4.9],
    ['Chief executives', '11-1011', 1.5, 7.8, 13.1, 5.3, 40.7, 24.7, 6.9],
    ['Computer & information systems managers', '11-3021', 0.6, 4.2, 13.4, 8.2, 46.1, 24.8, 2.8],
    ['Software developers', '15-1252', 0.5, 2.2, 7.4, 3.9, 51.9, 30.1, 3.9],
    ['Registered nurses', '29-1141', 0.5, 1.2, 3.9, 25.6, 54.4, 11.8, 2.7],
    ['Elementary school teachers', '25-2021', 0.0, 0.0, 2.8, 2.3, 43.4, 47.0, 4.4],
    ['Licensed practical / vocational nurses', '29-2061', 1.6, 20.4, 55.1, 18.1, 3.8, 0.6, 0.3],
    ['Retail salespersons', '41-2031', 6.6, 29.6, 26.1, 10.6, 22.2, 4.2, 0.8],
    ['Construction laborers', '47-2061', 34.3, 39.5, 14.1, 4.9, 5.8, 1.0, 0.4],
    ['Home health & personal care aides', '31-1120', 17.0, 35.5, 23.7, 9.4, 10.8, 2.9, 0.7],
    ["Police & sheriff's patrol officers", '33-3051', 0.9, 13.1, 28.0, 16.3, 33.8, 7.2, 0.7],
    ['Carpenters', '47-2031', 25.6, 42.6, 17.8, 5.9, 6.6, 1.1, 0.3]
  ];

  const educationLevels = [
    'Less than HS',
    'High school diploma',
    'Some college, no degree',
    "Associate’s degree",
    "Bachelor’s degree",
    "Master’s degree",
    "Doctoral or professional degree"
  ];

  const eduNodes = educationLevels.map((name, i) => ({
    name,
    type: 'education',
    id: i
  }));

  const occBaseIndex = eduNodes.length;

  const occupationNodes = occupationRows.map((row, i) => {
    const [title, code, lessHS, hs, some, assoc, bach, mast, doc] = row;
    const collegeShare = bach + mast + doc;
    return {
      name: title,
      code,
      type: 'occupation',
      collegeShare,
      id: occBaseIndex + i
    };
  });

  const nodes = [...eduNodes, ...occupationNodes];
  const links = [];

  occupationRows.forEach((row, occIdx) => {
    const [title, code, lessHS, hs, some, assoc, bach, mast, doc] = row;
    const percents = [lessHS, hs, some, assoc, bach, mast, doc];

    percents.forEach((p, eduIndex) => {
      if (p > 0.1) {
        links.push({
          source: eduIndex,
          target: occBaseIndex + occIdx,
          value: p,
          occupation: title,
          education: educationLevels[eduIndex],
          percent: p
        });
      }
    });
  });

  const fullWidth = svg.node().getBoundingClientRect().width;
  const fullHeight = +svg.attr("height") || 540;

  const margin = { top: 10, right: 250, bottom: 10, left: 160 };
  const width = fullWidth - margin.left - margin.right;
  const height = fullHeight - margin.top - margin.bottom;

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const sankey = d3.sankey()
    .nodeWidth(16)
    .nodePadding(14)
    .size([width, height])
    .nodeId(d => d.id);

  const { nodes: sankeyNodes, links: sankeyLinks } = sankey({
    nodes: nodes.map(d => ({ ...d })),
    links: links.map(d => ({ ...d }))
  });

  const colorEdu = d3.scaleOrdinal()
    .domain(educationLevels)
    .range([
      "#22c55e", "#16a34a", "#65a30d",
      "#4ade80", "#4f46e5", "#6366f1", "#a855f7"
    ]);

  const colorOcc = d3.scaleLinear()
    .domain([0, 100])
    .range(["#94a3b8", "#111827"]);

  function showTooltip(html, event) {
    tooltip
      .html(html)
      .style("left", (event.pageX + 14) + "px")
      .style("top", (event.pageY + 12) + "px")
      .style("opacity", 1)
      .style("transform", "translateY(0px)");
  }

  function hideTooltip() {
    tooltip
      .style("opacity", 0)
      .style("transform", "translateY(4px)");
  }

  // links
  const link = g.append("g")
    .attr("fill", "none")
    .selectAll("path")
    .data(sankeyLinks)
    .join("path")
    .attr("class", "srujana-sankey-link")
    .attr("d", d3.sankeyLinkHorizontal())
    .attr("stroke", d => {
      const collegeEdu = ["Bachelor’s degree", "Master’s degree", "Doctoral or professional degree"];
      return collegeEdu.includes(d.education) ? "#4f46e5" : "#22c55e";
    })
    .attr("stroke-width", d => Math.max(1, d.width))
    .on("mousemove", function(event, d) {
      const html = `
        <strong>${d.occupation}</strong><br/>
        From: <strong>${d.education}</strong><br/>
        Workers in this occupation: <strong>${d.percent.toFixed(1)}%</strong>
      `;
      showTooltip(html, event);
    })
    .on("mouseleave", hideTooltip)
    .on("mouseenter", function(event, d) {
      link.attr("opacity", l => l === d ? 1 : 0.15);
      nodeRect.attr("opacity", n =>
        n.name === d.education || n.name === d.occupation ? 1 : 0.2
      );
    });

  svg.on("mouseleave", () => {
    link.attr("opacity", 1);
    nodeRect.attr("opacity", 1);
  });

  // nodes
  const node = g.append("g")
    .selectAll("g")
    .data(sankeyNodes)
    .join("g")
    .attr("class", "srujana-sankey-node")
    .attr("transform", d => `translate(${d.x0},${d.y0})`);

  const nodeRect = node.append("rect")
    .attr("height", d => Math.max(4, d.y1 - d.y0))
    .attr("width", d => d.type === "education" ? 14 : 16)
    .attr("fill", d =>
      d.type === "education" ? colorEdu(d.name) : colorOcc(d.collegeShare || 0)
    )
    .on("mousemove", function(event, d) {
      if (d.type === "education") {
        const outgoing = sankeyLinks.filter(l => l.source.id === d.id);
        const total = outgoing.reduce((sum, l) => sum + l.value, 0);
        const html = `
          <strong>${d.name}</strong><br/>
          Total share across selected occupations: <strong>${total.toFixed(1)}%</strong>
        `;
        showTooltip(html, event);
      } else {
        const collegeShare = d.collegeShare || 0;
        const html = `
          <strong>${d.name}</strong><br/>
          Bachelor’s+ in this occupation: <strong>${collegeShare.toFixed(1)}%</strong>
        `;
        showTooltip(html, event);
      }
    })
    .on("mouseleave", hideTooltip)
    .on("mouseenter", function(event, d) {
      link.attr("opacity", l => (l.source.id === d.id || l.target.id === d.id) ? 1 : 0.15);
      nodeRect.attr("opacity", n => n.id === d.id ? 1 : 0.25);
    });

  node.append("text")
    .attr("x", d => d.type === "education" ? -8 : 20)
    .attr("y", d => (d.y1 - d.y0) / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", d => d.type === "education" ? "end" : "start")
    .text(d => d.name);

  // Highlight toggle
  function applyHighlightCollege() {
    const checked = document.getElementById("srujana-highlightCollege").checked;
    if (!checked) {
      link.attr("opacity", 1);
      nodeRect.attr("opacity", 1);
      return;
    }

    const threshold = 60;
    const collegeOccIds = new Set(
      sankeyNodes
        .filter(d => d.type === "occupation" && (d.collegeShare || 0) >= threshold)
        .map(d => d.id)
    );

    link.attr("opacity", d => collegeOccIds.has(d.target.id) ? 1 : 0.12);
    nodeRect.attr("opacity", d => {
      if (d.type === "occupation") {
        return collegeOccIds.has(d.id) ? 1 : 0.25;
      } else {
        const connected = sankeyLinks.some(
          l => collegeOccIds.has(l.target.id) && l.source.id === d.id
        );
        return connected ? 1 : 0.25;
      }
    });
  }

  document.getElementById("srujana-highlightCollege")
    .addEventListener("change", applyHighlightCollege);

  // Download SVG
  function downloadSVG() {
    const svgNode = document.getElementById("srujana-sankey-chart");
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgNode);

    if (!source.match(/^<svg[^>]+xmlns="/)) {
      source = source.replace(
        /^<svg/,
        '<svg xmlns="http://www.w3.org/2000/svg"'
      );
    }

    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const linkEl = document.createElement("a");
    linkEl.href = url;
    linkEl.download = "education_pathways_sankey.svg";
    document.body.appendChild(linkEl);
    linkEl.click();
    document.body.removeChild(linkEl);
    URL.revokeObjectURL(url);
  }

  document.getElementById("srujana-downloadSVG")
    .addEventListener("click", downloadSVG);
}
