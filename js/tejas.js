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
        
        slider.on("input", function() {
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
            
            slider.on("input", function() {
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
