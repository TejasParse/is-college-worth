console.log("Akhil's D3 Visualization Script");

function parseCurrencyOrNumber(value) {
  if (value == null || value === "") return 0;
  const cleaned = String(value).replace(/[$,\s]/g, "");
  const num = +cleaned;
  return Number.isNaN(num) ? 0 : num;
}

d3.csv("Data/StudentLoanDebtBySchool.csv").then((rows) => {
  rows.forEach((d) => {
    d.recipients = +d["Recipients"];
    d.loansOriginated = +d["# of Loans Originated"];
    d.amountOriginated = parseCurrencyOrNumber(d["$ of Loans Originated"]);
  });

  createBubbleChart(rows);
  buildStateMap(rows);
});


function createBubbleChart(data) {
  const container = d3.select("#bubbleChart");
  const rect = container.node().getBoundingClientRect();
  const width = rect.width || 900;
  const height = rect.height || 420;

  const svg = container
    .append("svg")
    .attr("class", "bubble-svg")
    .attr("viewBox", `0 0 ${width} ${height}`);

  const tooltip = container
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  const rolled = d3.rollups(
    data,
    (v) => ({
      totalLoans: d3.sum(v, (d) => d.loansOriginated),
      totalAmount: d3.sum(v, (d) => d.amountOriginated),
      recipients: d3.sum(v, (d) => d.recipients),
      city: v[0].City,
      state: v[0].State
    }),
    (d) => d.School,
    (d) => d["Loan Type"]
  );

  const schoolTotals = rolled
    .map(([school, loanTypes]) => [
      school,
      d3.sum(loanTypes, ([, v]) => v.totalLoans)
    ])
    .sort((a, b) => d3.descending(a[1], b[1]))
    .slice(0, 20);

  const topSchoolSet = new Set(schoolTotals.map((d) => d[0]));


  const bubbles = [];
  rolled.forEach(([school, loanTypes]) => {
    if (!topSchoolSet.has(school)) return;
    loanTypes.forEach(([loanType, stats]) => {
      if (stats.totalLoans <= 0) return;
      bubbles.push({
        school,
        loanType,
        totalLoans: stats.totalLoans,
        totalAmount: stats.totalAmount,
        recipients: stats.recipients,
        city: stats.city,
        state: stats.state
      });
    });
  });

  const loanTypeOrder = [
    "Subsidized",
    "Unsubsidized - Graduate",
    "Unsubsidized - Undergraduate",
    "Total"
  ];

  const colorScale = d3
    .scaleOrdinal()
    .domain(loanTypeOrder)
    .range(["#f2594b", "#f7ba3e", "#ffd86b", "#3b82f6"]); // red + two yellows

  const radiusScale = d3
    .scaleSqrt()
    .domain([0, d3.max(bubbles, (d) => d.totalLoans)])
    .range([6, 45]);

  const simulation = d3
    .forceSimulation(
      bubbles.map((d) => ({
        ...d,
        r: radiusScale(d.totalLoans)
      }))
    )
    .force("charge", d3.forceManyBody().strength(0.5))
    .force("center", d3.forceCenter(width * 0.4, height * 0.5))
    .force(
      "collision",
      d3.forceCollide().radius((d) => d.r + 2)
    )
    .on("tick", ticked);

  const node = svg
    .selectAll("circle")
    .data(simulation.nodes())
    .enter()
    .append("circle")
    .attr("class", "bubble")
    .attr("r", (d) => d.r)
    .attr("fill", (d) => colorScale(d.loanType))
    .on("mousemove", function (event, d) {
      const [x, y] = d3.pointer(event, container.node());
      tooltip
        .style("left", x + 12 + "px")
        .style("top", y + 12 + "px")
        .style("opacity", 1)
        .html(
          `
          <div class="title">${d.school}</div>
          <div>${d.city}, ${d.state}</div>
          <div><strong>Loan type:</strong> ${d.loanType}</div>
          <div><strong># Loans originated:</strong> ${d.totalLoans.toLocaleString()}</div>
          <div><strong>Total amount:</strong> $${d.totalAmount.toLocaleString()}</div>
          <div><strong>Recipients:</strong> ${d.recipients.toLocaleString()}</div>
        `
        );
    })
    .on("mouseleave", () => {
      tooltip.style("opacity", 0);
    });

  function ticked() {
    node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
  }


  const legend = container.append("div").attr("class", "legend");
  legend
    .selectAll(".legend-item")
    .data(loanTypeOrder)
    .enter()
    .append("div")
    .attr("class", "legend-item")
    .each(function (d) {
      const row = d3.select(this);
      row
        .append("span")
        .attr("class", "legend-swatch")
        .style("background", colorScale(d));
      row.append("span").text(d);
    });
}

const fipsToPostal = {
  "01": "AL","02": "AK","04": "AZ","05": "AR","06": "CA","08": "CO","09": "CT",
  "10": "DE","11": "DC","12": "FL","13": "GA","15": "HI","16": "ID","17": "IL",
  "18": "IN","19": "IA","20": "KS","21": "KY","22": "LA","23": "ME","24": "MD",
  "25": "MA","26": "MI","27": "MN","28": "MS","29": "MO","30": "MT","31": "NE",
  "32": "NV","33": "NH","34": "NJ","35": "NM","36": "NY","37": "NC","38": "ND",
  "39": "OH","40": "OK","41": "OR","42": "PA","44": "RI","45": "SC","46": "SD",
  "47": "TN","48": "TX","49": "UT","50": "VT","51": "VA","53": "WA","54": "WV",
  "55": "WI","56": "WY"
};

function buildStateMap(data) {
  const container = d3.select("#stateMap");
  const rect = container.node().getBoundingClientRect();
  const width = rect.width || 900;
  const height = rect.height || 420;

  const svg = container
    .append("svg")
    .attr("class", "map-svg")
    .attr("viewBox", `0 0 ${width} ${height}`);

  const tooltip = container
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);


  const stateStats = d3.rollup(
    data,
    (v) => {
      const totalAmount = d3.sum(v, (d) => d.amountOriginated);
      const totalRecipients = d3.sum(v, (d) => d.recipients);
      return {
        totalAmount,
        totalRecipients,
        avgLoan: totalRecipients > 0 ? totalAmount / totalRecipients : 0
      };
    },
    (d) => d.State
  );

  const avgValues = Array.from(stateStats.values(), (d) => d.avgLoan).filter(
    (d) => d > 0
  );


  const color = d3
    .scaleQuantize()
    .domain([d3.min(avgValues), d3.max(avgValues)])
    .range([
      "#c7e9c0", 
      "#74c476",
      "#31a354",
      "#006d2c",
      "#00441b", 
    ]);

  d3.json("data/us-states-10m.json").then((us) => {
    const statesFeature = topojson.feature(us, us.objects.states);

    const projection = d3
      .geoAlbersUsa()
      .fitSize([width, height], statesFeature);

    const path = d3.geoPath(projection);


    svg
      .selectAll(".state")
      .data(statesFeature.features)
      .enter()
      .append("path")
      .attr("class", "state")
      .attr("d", path)
      .attr("fill", (d) => {
        const postal = fipsToPostal[d.id];
        const stats = stateStats.get(postal);
        if (!stats || stats.avgLoan <= 0) return "#f0f0f0";
        return color(stats.avgLoan);
      })
      .on("mousemove", (event, d) => {
        const [x, y] = d3.pointer(event, container.node());
        const postal = fipsToPostal[d.id];
        const stats = stateStats.get(postal);

        tooltip
          .style("left", x + 12 + "px")
          .style("top", y + 12 + "px")
          .style("opacity", 1)
          .html(`
            <div class="title">${d.properties.name}</div>
            <div><strong>State:</strong> ${postal}</div>
            <div><strong>Avg Loan / Student:</strong> $${stats.avgLoan.toFixed(0)}</div>
            <div><strong>Total Recipients:</strong> ${stats.totalRecipients.toLocaleString()}</div>
          `);
      })
      .on("mouseleave", () => tooltip.style("opacity", 0));

    const legendWidth = 20;
    const legendHeight = 180;

    const legendScale = d3
      .scaleLinear()
      .domain(color.domain())
      .range([legendHeight, 0]);

    const legend = svg
      .append("g")
      .attr("transform", `translate(${width - 60}, 40)`);


    const gradientId = "loanGradient";

    const defs = svg.append("defs");
    const gradient = defs
      .append("linearGradient")
      .attr("id", gradientId)
      .attr("x1", "0%")
      .attr("x2", "0%")
      .attr("y1", "100%")
      .attr("y2", "0%");


    const range = color.range();
    range.forEach((c, i) => {
      gradient
        .append("stop")
        .attr("offset", `${(i / (range.length - 1)) * 100}%`)
        .attr("stop-color", c);
    });


    legend
      .append("rect")
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", `url(#${gradientId})`)
      .style("stroke", "#444")
      .style("stroke-width", 0.7);


    const legendAxis = d3
      .axisRight(legendScale)
      .ticks(6)
      .tickFormat((d) => "$" + Math.round(d).toLocaleString());

    legend
      .append("g")
      .attr("transform", `translate(${legendWidth}, 0)`)
      .call(legendAxis)
      .selectAll("text")
      .style("font-size", "10px");
  });
}

