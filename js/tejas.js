// ==== Configuration ====
const tejasMargin = { top: 40, right: 200, bottom: 80, left: 80 };
const tejasWidth = 1400 - tejasMargin.left - tejasMargin.right;
const tejasHeight = 500 - tejasMargin.top - tejasMargin.bottom;
const tejasEduLevels = ["High school or less", "More than high school"];
const tejasColorScale = d3.scaleOrdinal().domain(tejasEduLevels).range(["#e74c3c", "#3498db"]);

const tejasEducationMap = {
    0: "Child", 31: "<1st grade", 32: "1st–4th grade", 33: "5th–6th grade",
    34: "7th–8th grade", 35: "9th grade", 36: "10th grade", 37: "11th grade",
    38: "12th no diploma", 39: "High school graduate", 40: "Some college, no degree",
    41: "Associate degree (vocational)", 42: "Associate degree (academic)",
    43: "Bachelor's degree", 44: "Master's degree", 45: "Professional degree", 46: "Doctorate degree"
};

const tejasHighSchoolOrLess = new Set([
    "<1st grade", "1st–4th grade", "5th–6th grade", "7th–8th grade",
    "9th grade", "10th grade", "11th grade", "12th no diploma", "High school graduate"
]);

function tejasBroadEducation(ed) {
    const education = tejasEducationMap[ed];
    if (!education || education === "Child") return null;
    return tejasHighSchoolOrLess.has(education) ? "High school or less" : "More than high school";
}

function tejasGetAgeBin(age) {
    const binStart = Math.floor(age / 5) * 5;
    if (binStart < 15 || binStart >= 95) return null;
    return `[${binStart}, ${binStart + 5})`;
}

function tejasCalculatePercentile(values, percentile) {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    if (lower === Math.ceil(index)) return sorted[lower];
    return sorted[lower] * (1 - (index - lower)) + sorted[Math.ceil(index)] * (index - lower);
}

function tejasProcessData(rawData, percentile = 50) {
    const processed = rawData
        .filter(d => (d.ANN_YN === 1 || d.ANN_YN === "1") && +d.A_AGE >= 15 && +d.A_AGE < 95 && +d.ANN_VAL > 0)
        .map(d => ({ ageBin: tejasGetAgeBin(+d.A_AGE), eduBroad: tejasBroadEducation(+d.A_HGA), annVal: +d.ANN_VAL }))
        .filter(d => d.ageBin && d.eduBroad);

    const grouped = d3.group(processed, d => d.ageBin, d => d.eduBroad);
    const medians = [];
    for (const [ageBin, eduGroups] of grouped) {
        for (const [eduLevel, records] of eduGroups) {
            medians.push({ ageBin, eduLevel, median: tejasCalculatePercentile(records.map(r => r.annVal), percentile), count: records.length });
        }
    }
    const ageBinOrder = [...new Set(medians.map(d => d.ageBin))].sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));
    return { medians, ageBinOrder };
}

// ==== Main visualization function (for modal) ====
function tejasViz() {
    d3.csv("data/filtered_output.csv", d3.autoType).then(rawData => {
        const container = d3.select("#viz-container");
        container.selectAll("*").remove();

        function render(percentile) {
            container.select("#tejas-svg-container").remove();
            const { medians, ageBinOrder } = tejasProcessData(rawData, percentile);

            const svgContainer = container.append("div").attr("id", "tejas-svg-container");
            const svg = svgContainer.append("svg")
                .attr("width", tejasWidth + tejasMargin.left + tejasMargin.right)
                .attr("height", tejasHeight + tejasMargin.top + tejasMargin.bottom)
                .append("g").attr("transform", `translate(${tejasMargin.left},${tejasMargin.top})`);

            const xScale = d3.scalePoint().domain(ageBinOrder).range([0, tejasWidth]).padding(0.5);
            const yScale = d3.scaleLinear().domain([0, d3.max(medians, d => d.median) * 1.1]).range([tejasHeight, 0]);

            svg.append("g").attr("class", "grid").attr("opacity", 0.1).call(d3.axisLeft(yScale).tickSize(-tejasWidth).tickFormat(""));
            svg.append("g").attr("transform", `translate(0,${tejasHeight})`).call(d3.axisBottom(xScale))
                .selectAll("text").attr("transform", "rotate(-45)").style("text-anchor", "end");
            svg.append("g").call(d3.axisLeft(yScale).ticks(10).tickFormat(d => d3.format(",.0f")(d)));

            svg.append("text").attr("x", tejasWidth / 2).attr("y", tejasHeight + 60)
                .attr("text-anchor", "middle").style("font-weight", "bold").text("Age Group (5-year bins)");
            svg.append("text").attr("transform", "rotate(-90)").attr("x", -tejasHeight / 2).attr("y", -60)
                .attr("text-anchor", "middle").style("font-weight", "bold").text("Retirement Income ($)");

            const label = percentile === 50 ? "Median" : `${percentile}th Percentile`;
            svg.append("text").attr("x", tejasWidth / 2).attr("y", -15)
                .attr("text-anchor", "middle").style("font-size", "18px").style("font-weight", "bold")
                .text(`${label} Retirement Income by Age Group and Education Level`);

            const line = d3.line().x(d => xScale(d.ageBin)).y(d => yScale(d.median)).curve(d3.curveMonotoneX);
            tejasEduLevels.forEach(eduLevel => {
                const eduData = medians.filter(d => d.eduLevel === eduLevel)
                    .sort((a, b) => parseInt(a.ageBin.match(/\d+/)[0]) - parseInt(b.ageBin.match(/\d+/)[0]));
                svg.append("path").datum(eduData).attr("fill", "none")
                    .attr("stroke", tejasColorScale(eduLevel)).attr("stroke-width", 3).attr("d", line);
                svg.selectAll(null).data(eduData).enter().append("circle")
                    .attr("cx", d => xScale(d.ageBin)).attr("cy", d => yScale(d.median))
                    .attr("r", 5).attr("fill", tejasColorScale(eduLevel)).attr("stroke", "white").attr("stroke-width", 2);
            });

            const legend = svg.append("g").attr("transform", `translate(${tejasWidth + 20}, 0)`);
            tejasEduLevels.forEach((eduLevel, i) => {
                const row = legend.append("g").attr("transform", `translate(0, ${i * 25})`);
                row.append("line").attr("x1", 0).attr("x2", 30).attr("stroke", tejasColorScale(eduLevel)).attr("stroke-width", 3);
                row.append("circle").attr("cx", 15).attr("r", 5).attr("fill", tejasColorScale(eduLevel)).attr("stroke", "white").attr("stroke-width", 2);
                row.append("text").attr("x", 40).attr("y", 5).style("font-size", "12px").text(eduLevel);
            });
        }

        // Slider controls
        const control = container.append("div").attr("class", "percentile-control");
        control.append("label").text("Select Percentile: ");
        const valueDisplay = control.append("span").attr("class", "percentile-value").text("50%");
        const sliderDiv = control.append("div").attr("class", "slider-container");
        sliderDiv.append("span").attr("class", "slider-label").text("0%");
        const slider = sliderDiv.append("input").attr("type", "range").attr("min", 0).attr("max", 100).attr("value", 50);
        sliderDiv.append("span").attr("class", "slider-label").text("100%");

        slider.on("input", function () {
            valueDisplay.text(`${this.value}%`);
            render(+this.value);
        });

        // Quick select buttons
        const btns = control.append("div").attr("class", "quick-select");
        btns.append("span").text("Quick: ");
        [0, 25, 50, 75, 100].forEach(p => {
            btns.append("button").attr("class", "percentile-btn").text(`${p}%`)
                .on("click", () => { slider.property("value", p); valueDisplay.text(`${p}%`); render(p); });
        });

        render(50);
    });
}

// ==== For index_visualizations.html ====
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('tejas-load-btn');
    if (btn) btn.addEventListener('click', () => {
        btn.style.display = 'none';
        d3.csv("data/filtered_output.csv", d3.autoType).then(rawData => {
            const container = d3.select("#tejas-chart");
            let currentPercentile = 50;

            function render(percentile) {
                container.select("#tejas-svg-container").remove();
                const { medians, ageBinOrder } = tejasProcessData(rawData, percentile);

                const svgContainer = container.append("div").attr("id", "tejas-svg-container");
                const svg = svgContainer.append("svg")
                    .attr("width", tejasWidth + tejasMargin.left + tejasMargin.right)
                    .attr("height", tejasHeight + tejasMargin.top + tejasMargin.bottom)
                    .append("g").attr("transform", `translate(${tejasMargin.left},${tejasMargin.top})`);

                const xScale = d3.scalePoint().domain(ageBinOrder).range([0, tejasWidth]).padding(0.5);
                const yScale = d3.scaleLinear().domain([0, d3.max(medians, d => d.median) * 1.1]).range([tejasHeight, 0]);

                svg.append("g").attr("class", "grid").attr("opacity", 0.1).call(d3.axisLeft(yScale).tickSize(-tejasWidth).tickFormat(""));
                svg.append("g").attr("transform", `translate(0,${tejasHeight})`).call(d3.axisBottom(xScale))
                    .selectAll("text").attr("transform", "rotate(-45)").style("text-anchor", "end");
                svg.append("g").call(d3.axisLeft(yScale).ticks(10).tickFormat(d => d3.format(",.0f")(d)));

                svg.append("text").attr("x", tejasWidth / 2).attr("y", tejasHeight + 60)
                    .attr("text-anchor", "middle").style("font-weight", "bold").text("Age Group (5-year bins)");
                svg.append("text").attr("transform", "rotate(-90)").attr("x", -tejasHeight / 2).attr("y", -60)
                    .attr("text-anchor", "middle").style("font-weight", "bold").text("Retirement Income ($)");

                const label = percentile === 50 ? "Median" : `${percentile}th Percentile`;
                svg.append("text").attr("x", tejasWidth / 2).attr("y", -15)
                    .attr("text-anchor", "middle").style("font-size", "18px").style("font-weight", "bold")
                    .text(`${label} Retirement Income by Age Group and Education Level`);

                const line = d3.line().x(d => xScale(d.ageBin)).y(d => yScale(d.median)).curve(d3.curveMonotoneX);
                tejasEduLevels.forEach(eduLevel => {
                    const eduData = medians.filter(d => d.eduLevel === eduLevel)
                        .sort((a, b) => parseInt(a.ageBin.match(/\d+/)[0]) - parseInt(b.ageBin.match(/\d+/)[0]));
                    svg.append("path").datum(eduData).attr("fill", "none")
                        .attr("stroke", tejasColorScale(eduLevel)).attr("stroke-width", 3).attr("d", line);
                    svg.selectAll(null).data(eduData).enter().append("circle")
                        .attr("cx", d => xScale(d.ageBin)).attr("cy", d => yScale(d.median))
                        .attr("r", 5).attr("fill", tejasColorScale(eduLevel)).attr("stroke", "white").attr("stroke-width", 2);
                });

                const legend = svg.append("g").attr("transform", `translate(${tejasWidth + 20}, 0)`);
                tejasEduLevels.forEach((eduLevel, i) => {
                    const row = legend.append("g").attr("transform", `translate(0, ${i * 25})`);
                    row.append("line").attr("x1", 0).attr("x2", 30).attr("stroke", tejasColorScale(eduLevel)).attr("stroke-width", 3);
                    row.append("circle").attr("cx", 15).attr("r", 5).attr("fill", tejasColorScale(eduLevel)).attr("stroke", "white").attr("stroke-width", 2);
                    row.append("text").attr("x", 40).attr("y", 5).style("font-size", "12px").text(eduLevel);
                });
            }

            // Slider
            const control = container.insert("div", ":first-child").attr("class", "percentile-control");
            control.append("label").text("Select Percentile: ");
            const valueDisplay = control.append("span").attr("class", "percentile-value").text("50%");
            const sliderDiv = control.append("div").attr("class", "slider-container");
            sliderDiv.append("span").attr("class", "slider-label").text("0%");
            const slider = sliderDiv.append("input").attr("type", "range").attr("min", 0).attr("max", 100).attr("value", 50);
            sliderDiv.append("span").attr("class", "slider-label").text("100%");

            slider.on("input", function () {
                currentPercentile = +this.value;
                valueDisplay.text(`${currentPercentile}%`);
                render(currentPercentile);
            });

            const btns = control.append("div").attr("class", "quick-select");
            btns.append("span").text("Quick: ");
            [0, 25, 50, 75, 100].forEach(p => {
                btns.append("button").attr("class", "percentile-btn").text(`${p}%`)
                    .on("click", () => { slider.property("value", p); currentPercentile = p; valueDisplay.text(`${p}%`); render(p); });
            });

            render(50);
        });
    });
});



// ==== SUNBURST VIZ #2 – CAP + TASSEL CONTROLLER ====

// Helper: college vs less-than-college bucket
function tejasCollegeBucket(edCode) {
    const education = tejasEducationMap[edCode]; // already defined above
    if (!education || education === "Child") return null;

    const collegeOrMore = new Set([
        "Some college, no degree",
        "Associate degree (vocational)",
        "Associate degree (academic)",
        "Bachelor's degree",
        "Master's degree",
        "Professional degree",
        "Doctorate degree"
    ]);

    return collegeOrMore.has(education) ? "College or more" : "Less than college";
}

// Build hierarchy AgeBin -> CollegeBucket -> Certification
function tejasBuildHierarchyForSunburst(rawData) {
    const root = { name: "All", children: [] };
    const ageMap = new Map();

    rawData.forEach(d => {
        const age = +d.A_AGE;
        const ageBin = tejasGetAgeBin(age);        // uses your 5-year bins
        const collegeBucket = tejasCollegeBucket(+d.A_HGA);
        if (!ageBin || !collegeBucket) return;

        const hasCert = (d.PECERT1 === 1 || d.PECERT1 === "1");
        const certBucket = hasCert ? "Has certification" : "No / not reported";

        // Age node
        let ageNode = ageMap.get(ageBin);
        if (!ageNode) {
            ageNode = { name: ageBin, children: [] };
            ageMap.set(ageBin, ageNode);
            root.children.push(ageNode);
        }

        // College bucket under that age
        let eduNode = ageNode.children.find(c => c.name === collegeBucket);
        if (!eduNode) {
            eduNode = { name: collegeBucket, children: [] };
            ageNode.children.push(eduNode);
        }

        // Certification bucket
        let certNode = eduNode.children.find(c => c.name === certBucket);
        if (!certNode) {
            certNode = { name: certBucket, value: 0 };
            eduNode.children.push(certNode);
        }
        certNode.value += 1;
    });

    // Sort age bins numerically
    root.children.sort((a, b) =>
        parseInt(a.name.match(/\d+/)[0]) - parseInt(b.name.match(/\d+/)[0])
    );

    return {
        hierarchy: root,
        ageBins: root.children.map(d => d.name)
    };
}

function tejasArcLabelTransform(d) {
    const angle = (d.x0 + d.x1) / 2;
    const deg = angle * 180 / Math.PI - 90;
    const r = (d.y0 + d.y1) / 2;
    const rotate = deg;
    const flip = angle > Math.PI ? 180 : 0;

    return `
        rotate(${rotate})
        translate(${r},0)
        rotate(${flip})
    `;
}

// Display labels: age bin names, > / < for college, Y / N for cert
function tejasDisplayName(d) {
    const name = d.data.name;

    if (name === "College or more") return ">=";
    if (name === "Less than college") return "<";
    if (name === "Has certification") return "Y";
    if (name === "No / not reported") return "N";

    // default: age bins or anything else
    return name;
}

// ==== Main “grad cap + tassel + sunburst” visualization ====
function tejasSunburstViz() {
    d3.csv("data/filtered_output.csv", d3.autoType).then(rawData => {

        // Remember previous arc geometry so we can animate between levels
        const previousArcState = new Map();

        const container = d3.select("#viz-container");
        container.selectAll("*").remove();

        const width = 1400;
        const height = 800;

        const svg = container.append("svg")
            .attr("width", width)
            .attr("height", height);

        const sunburstRadius = Math.min(width, height - 220) / 2;
        const sunburstCenterX = width / 2;
        const sunburstCenterY = height * 0.62-50;

        const { hierarchy: dataRoot, ageBins } = tejasBuildHierarchyForSunburst(rawData);
        const root = d3.hierarchy(dataRoot).sum(d => d.value || 0);

        const partition = d3.partition()
            .size([2 * Math.PI, sunburstRadius]);

        const arc = d3.arc()
            .startAngle(d => d.x0)
            .endAngle(d => d.x1)
            .innerRadius(d => d.y0)
            .outerRadius(d => d.y1);

        // Color by top-level age bin, lighter for deeper levels
        const ageColor = d3.scaleOrdinal()
            .domain(ageBins)
            .range([
                "#e41a1c", "#377eb8", "#4daf4a", "#984ea3",
                "#ff7f00", "#a65628", "#f781bf", "#999999",
                "#1b9e77", "#d95f02", "#7570b3", "#e7298a"
            ]);

        function sunburstColor(d) {
            const top = d.ancestors().find(a => a.depth === 1);
            if (!top) return "#ccc";
            const base = d3.color(ageColor(top.data.name));
            if (!base) return "#ccc";
            const factor = 1 + (d.depth - 1) * 0.25; // deeper = lighter
            return base.brighter(factor);
        }

        const sunburstG = svg.append("g")
            .attr("class", "tejas-sunburst")
            .attr("transform", `translate(${sunburstCenterX},${sunburstCenterY})`);

        // Title + level label
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", 30)
            .attr("text-anchor", "middle")
            .style("font-size", "18px")
            .style("font-weight", "bold")
            .text("Pull the tassel to reveal more detail in the sunburst");

        const levelLabel = svg.append("text")
            .attr("x", width / 2)
            .attr("y", 52)
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .text("Age only");

        // Center label inside sunburst
        const centerLabel = sunburstG.append("text")
            .attr("class", "sun-center-label")
            .attr("text-anchor", "middle")
            .attr("dy", "0.35em")
            .style("font-size", "14px")
            .style("font-weight", "bold")
            .text("Age bins");

        // Legend for symbols (> < Y N)
        const legend = svg.append("g")
            .attr("class", "symbol-legend")
            .attr("transform", `translate(${width - 220}, 40)`);

        const legendItems = [
            { symbol: ">=", text: "College or more" },
            { symbol: "<", text: "Less than college" },
            { symbol: "Y", text: "Has certification" },
            { symbol: "N", text: "No / not reported" }
        ];

        legend.selectAll("text.legend-row")
            .data(legendItems)
            .enter()
            .append("text")
            .attr("class", "legend-row")
            .attr("x", 0)
            .attr("y", (d, i) => i * 16)
            .style("font-size", 11)
            .text(d => `${d.symbol}  –  ${d.text}`);

        // Pull levels: y position + description + max depth for sunburst
        const pullLevels = [
            { y: 150, depth: 1, label: "Age only" },
            { y: 200, depth: 2, label: "Age → > / < college" },
            { y: 250, depth: 3, label: "Age → > / < college → Y / N cert" }
        ];
        let currentLevelIndex = 0;

        // --- Graduation cap + tassel controller ---

        const capCenterX = 120;
        const capTopY = 80;

        const capGroup = svg.append("g")
            .attr("class", "grad-cap")
            .attr("transform", `translate(${capCenterX},${capTopY})`);

        // Mortarboard (diamond)
        capGroup.append("polygon")
            .attr("points", "-60,0 0,-25 60,0 0,25")
            .attr("fill", "#333")
            .attr("stroke", "#111")
            .attr("stroke-width", 1.5);

        // Cap base (band)
        capGroup.append("rect")
            .attr("x", -35)
            .attr("y", 20)
            .attr("width", 70)
            .attr("height", 16)
            .attr("rx", 4)
            .attr("ry", 4)
            .attr("fill", "#444");

        // Tassel anchor – right edge of mortarboard
        const tasselAnchorX = capCenterX + 45;
        const tasselAnchorY = capTopY + 5;

        // Group for tassel + handle
        const tasselGroup = svg.append("g")
            .attr("class", "grad-tassel");

        // Draw tassel at a given level
        function renderTassel(levelIndex, animate = false) {
            currentLevelIndex = levelIndex;
            const level = pullLevels[levelIndex];
            const y = level.y;

            const t = animate ? tasselGroup.transition().duration(250) : tasselGroup;

            // Tassel string (line)
            let line = tasselGroup.selectAll("line.tassel-string").data([null]);
            line.enter()
                .append("line")
                .attr("class", "tassel-string")
                .attr("x1", tasselAnchorX)
                .attr("y1", tasselAnchorY)
                .attr("x2", tasselAnchorX)
                .attr("y2", tasselAnchorY) // start collapsed
                .attr("stroke", "#c7902f")
                .attr("stroke-width", 4)
                .attr("stroke-linecap", "round")
                .merge(line)
                .call(sel => sel.transition(t)
                    .attr("x1", tasselAnchorX)
                    .attr("y1", tasselAnchorY)
                    .attr("x2", tasselAnchorX)
                    .attr("y2", y)
                );

            // Knot above the handle
            let knot = tasselGroup.selectAll("circle.tassel-knot").data([null]);
            knot.enter()
                .append("circle")
                .attr("class", "tassel-knot")
                .attr("cx", tasselAnchorX)
                .attr("cy", y - 10)
                .attr("r", 4)
                .attr("fill", "#c7902f")
                .merge(knot)
                .call(sel => sel.transition(t).attr("cy", y - 10));

            // Handle at the bottom of string
            let handle = tasselGroup.selectAll("circle.tassel-handle").data([null]);
            handle = handle.enter()
                .append("circle")
                .attr("class", "tassel-handle")
                .attr("cx", tasselAnchorX)
                .attr("cy", y)
                .attr("r", 10)
                .attr("fill", "#ff5722")
                .attr("stroke", "#ffffff")
                .attr("stroke-width", 2)
                .style("cursor", "ns-resize")
                .merge(handle);

            handle.call(
                d3.drag()
                    .on("drag", (event) => {
                        const yMin = pullLevels[0].y;
                        const yMax = pullLevels[pullLevels.length - 1].y;
                        const newY = Math.max(yMin, Math.min(yMax, event.y));

                        // Move tassel live while dragging
                        tasselGroup.select(".tassel-handle").attr("cy", newY);
                        tasselGroup.select(".tassel-string").attr("y2", newY);
                        tasselGroup.select(".tassel-knot").attr("cy", newY - 10);
                    })
                    .on("end", (event) => {
                        const yDragged = event.y;
                        // Snap to nearest level
                        let nearestIndex = 0;
                        let minDist = Infinity;
                        pullLevels.forEach((lvl, i) => {
                            const dist = Math.abs(lvl.y - yDragged);
                            if (dist < minDist) {
                                minDist = dist;
                                nearestIndex = i;
                            }
                        });
                        const target = pullLevels[nearestIndex];

                        // Animate tassel to snapped position
                        tasselGroup.select(".tassel-handle")
                            .transition().duration(200).attr("cy", target.y);
                        tasselGroup.select(".tassel-string")
                            .transition().duration(200).attr("y2", target.y);
                        tasselGroup.select(".tassel-knot")
                            .transition().duration(200).attr("cy", target.y - 10);

                        // Update label + sunburst
                        levelLabel.text(target.label);
                        updateSunburst(target.depth);
                    })
            );

            levelLabel.text(level.label);
        }

        function updateSunburst(maxDepth) {
            const nodes = partition(root).descendants()
                .filter(d => d.depth > 0 && d.depth <= maxDepth);

            const key = d => d.ancestors().map(a => a.data.name).reverse().join(" / ");

            // Attach previous geometry (if we have it) to each node for animation
            nodes.forEach(d => {
                const prev = previousArcState.get(key(d));
                if (prev) {
                    d.old = prev;
                }
            });

            // ---------- ARCS ----------
            const paths = sunburstG.selectAll("path.sun-arc")
                .data(nodes, key);

            const pathsEnter = paths.enter()
                .append("path")
                .attr("class", "sun-arc")
                .attr("stroke", "#fff")
                .attr("stroke-width", 1)
                .attr("fill", d => sunburstColor(d))
                // start collapsed at center
                .attr("d", d => {
                    const start = d.old || {
                        x0: d.x0,
                        x1: d.x0,
                        y0: 0,
                        y1: 0
                    };
                    return arc(start);
                });

            pathsEnter.append("title")
                .text(d => {
                    const chain = d.ancestors().map(a => a.data.name).reverse().slice(1).join(" → ");
                    return `${chain}\n${d.value.toLocaleString()} people`;
                });

            function arcTween(d) {
                const start = d.old || {
                    x0: d.x0,
                    x1: d.x0,
                    y0: 0,
                    y1: 0
                };
                const i = d3.interpolate(start, d);
                return t => arc(i(t));
            }

            // Update + enter with smooth morph
            paths.merge(pathsEnter)
                .transition().duration(600)
                .attr("fill", d => sunburstColor(d))
                .attrTween("d", arcTween)
                .selection()
                .select("title")
                .text(d => {
                    const chain = d.ancestors().map(a => a.data.name).reverse().slice(1).join(" → ");
                    return `${chain}\n${d.value.toLocaleString()} people`;
                });

            // Exit: collapse arcs back to center
            paths.exit()
                .transition().duration(400)
                .attrTween("d", function (d) {
                    const end = {
                        x0: (d.x0 + d.x1) / 2,
                        x1: (d.x0 + d.x1) / 2,
                        y0: d.y0,
                        y1: d.y0
                    };
                    const i = d3.interpolate(d, end);
                    return t => arc(i(t));
                })
                .style("opacity", 0)
                .remove();

            // ---------- LABELS ----------
            const minAngle = 0.05; // radians (~3°) – don’t label tiny slices
            const labelNodes = nodes.filter(d => (d.x1 - d.x0) > minAngle);

            const labels = sunburstG.selectAll("text.sun-label")
                .data(labelNodes, key);

            const labelsEnter = labels.enter()
                .append("text")
                .attr("class", "sun-label")
                .attr("dy", "0.32em")
                .style("font-size", "10px")
                .style("fill", "#222")
                .style("pointer-events", "none")
                .attr("text-anchor", d => ((d.x0 + d.x1) / 2) < Math.PI ? "start" : "end")
                .attr("transform", tejasArcLabelTransform)
                .text(d => tejasDisplayName(d)); // uses >, <, Y, N or age bin

            labels.merge(labelsEnter)
                .transition().duration(600)
                .attr("text-anchor", d => ((d.x0 + d.x1) / 2) < Math.PI ? "start" : "end")
                .attr("transform", tejasArcLabelTransform)
                .tween("text", function (d) {
                    const self = d3.select(this);
                    const label = tejasDisplayName(d);
                    return function () { self.text(label); };
                });

            labels.exit()
                .transition().duration(300)
                .style("opacity", 0)
                .remove();

            // ---------- CENTER LABEL ----------
            let centerText = "Age bins";
            if (maxDepth === 2) centerText = "Age → > / < college";
            if (maxDepth === 3) centerText = "Age → > / < college → Y / N cert";
            centerLabel.text(centerText);

            // ---------- STORE CURRENT GEOMETRY FOR NEXT ANIMATION ----------
            previousArcState.clear();
            nodes.forEach(d => {
                previousArcState.set(key(d), {
                    x0: d.x0,
                    x1: d.x1,
                    y0: d.y0,
                    y1: d.y1
                });
            });
        }

        // Initial render: tassel at level 0 (age-only)
        renderTassel(0, false);
        updateSunburst(pullLevels[0].depth);
    });
}
