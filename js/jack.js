/*
MIT License

Copyright (c) 2017 Vasco Asturiano

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
function Legend(color, {
  title,
  tickSize = 6,
  width = 320, 
  height = 44 + tickSize,
  marginTop = 18,
  marginRight = 0,
  marginBottom = 16 + tickSize,
  marginLeft = 0,
  ticks = width / 64,
  tickFormat,
  tickValues
} = {}) {

  function ramp(color, n = 256) {
    const canvas = document.createElement("canvas");
    canvas.width = n;
    canvas.height = 1;
    const context = canvas.getContext("2d");
    for (let i = 0; i < n; ++i) {
      context.fillStyle = color(i / (n - 1));
      context.fillRect(i, 0, 1, 1);
    }
    return canvas;
  }

  const svg = d3.create("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .style("overflow", "visible")
      .style("display", "block");

  let tickAdjust = g => g.selectAll(".tick line").attr("y1", marginTop + marginBottom - height);
  let x;

  // Continuous
  if (color.interpolate) {
    const n = Math.min(color.domain().length, color.range().length);

    x = color.copy().rangeRound(d3.quantize(d3.interpolate(marginLeft, width - marginRight), n));

    svg.append("image")
        .attr("x", marginLeft)
        .attr("y", marginTop)
        .attr("width", width - marginLeft - marginRight)
        .attr("height", height - marginTop - marginBottom)
        .attr("preserveAspectRatio", "none")
        .attr("xlink:href", ramp(color.copy().domain(d3.quantize(d3.interpolate(0, 1), n))).toDataURL());
  }

  // Sequential
  else if (color.interpolator) {
    x = Object.assign(color.copy()
        .interpolator(d3.interpolateRound(marginLeft, width - marginRight)),
        {range() { return [marginLeft, width - marginRight]; }});

    svg.append("image")
        .attr("x", marginLeft)
        .attr("y", marginTop)
        .attr("width", width - marginLeft - marginRight)
        .attr("height", height - marginTop - marginBottom)
        .attr("preserveAspectRatio", "none")
        .attr("xlink:href", ramp(color.interpolator()).toDataURL());

    // scaleSequentialQuantile doesn’t implement ticks or tickFormat.
    if (!x.ticks) {
      if (tickValues === undefined) {
        const n = Math.round(ticks + 1);
        tickValues = d3.range(n).map(i => d3.quantile(color.domain(), i / (n - 1)));
      }
      if (typeof tickFormat !== "function") {
        tickFormat = d3.format(tickFormat === undefined ? ",f" : tickFormat);
      }
    }
  }

  // Threshold
  else if (color.invertExtent) {
    const thresholds
        = color.thresholds ? color.thresholds() // scaleQuantize
        : color.quantiles ? color.quantiles() // scaleQuantile
        : color.domain(); // scaleThreshold

    const thresholdFormat
        = tickFormat === undefined ? d => d
        : typeof tickFormat === "string" ? d3.format(tickFormat)
        : tickFormat;

    x = d3.scaleLinear()
        .domain([-1, color.range().length - 1])
        .rangeRound([marginLeft, width - marginRight]);

    svg.append("g")
      .selectAll("rect")
      .data(color.range())
      .join("rect")
        .attr("x", (d, i) => x(i - 1))
        .attr("y", marginTop)
        .attr("width", (d, i) => x(i) - x(i - 1))
        .attr("height", height - marginTop - marginBottom)
        .attr("fill", d => d);

    tickValues = d3.range(thresholds.length);
    tickFormat = i => thresholdFormat(thresholds[i], i);
  }

  // Ordinal
  else {
    x = d3.scaleBand()
        .domain(color.domain())
        .rangeRound([marginLeft, width - marginRight]);

    svg.append("g")
      .selectAll("rect")
      .data(color.domain())
      .join("rect")
        .attr("x", x)
        .attr("y", marginTop)
        .attr("width", Math.max(0, x.bandwidth() - 1))
        .attr("height", height - marginTop - marginBottom)
        .attr("fill", color);

    tickAdjust = () => {};
  }

  svg.append("g")
      .attr("transform", `translate(0,${height - marginBottom})`)
      .call(d3.axisBottom(x)
        .ticks(ticks, typeof tickFormat === "string" ? tickFormat : undefined)
        .tickFormat(typeof tickFormat === "function" ? tickFormat : undefined)
        .tickSize(tickSize)
        .tickValues(tickValues))
      .call(tickAdjust)
      .call(g => g.select(".domain").remove())
      .call(g => g.append("text")
        .attr("x", marginLeft)
        .attr("y", marginTop + marginBottom - height - 6)
        .attr("fill", "currentColor")
        .attr("text-anchor", "start")
        .attr("font-weight", "bold")
        .attr("class", "title")
        .text(title));

  return svg.node();
}


function hexBinVisual() {
  const margin = {top: 10, right: 30, bottom: 60, left: 80},
    width = 1380 - margin.left - margin.right,
    height = 790 - margin.top - margin.bottom;

  
  d3.select("#viz-container").selectAll("*").remove();

  const hexBinSvg = d3.select("#viz-container").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

  d3.csv("data/CostvsEarnings.csv").then( function(data) {
    data.forEach(d => {
      d.COSTT4_A = +d.COSTT4_A;
      d.MD_EARN_WNE_P10 = +d.MD_EARN_WNE_P10;
    });

  const x = d3.scaleLinear()
    .domain(d3.extent(data, d => d.COSTT4_A))
    .range([0, width]);
  hexBinSvg.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(x));

  const y = d3.scaleLinear()
    .domain(d3.extent(data, d => d.MD_EARN_WNE_P10))
    .range([height, 0]);
  hexBinSvg.append("g").call(d3.axisLeft(y));

  const hexbin = d3.hexbin()
    .radius(7)
    .extent([[0, 0], [width, height]]);

  const points = data.map(d => ({
    x: x(d.COSTT4_A),
    y: y(d.MD_EARN_WNE_P10),
    o: d
  }))

  const lineData = x.domain().map(cost => ({
    cost: cost,
    earnings: cost * 4
  }));
    
  const bins = hexbin(points.map(d => [d.x, d.y]));
  const color = d3.scaleSequential(d3.interpolateOrRd)
    .domain([0, d3.max(bins, d => d.length)]);

  hexBinSvg.append("clipPath")
      .attr("id", "clip")
    .append("rect")
      .attr("width", width)
      .attr("height", height)

  function unique(arr) {
    var u = {}, a = [];
    for(var i = 0, l = arr.length; i < l; ++i){
      if(!u.hasOwnProperty(arr[i])) {
        a.push(arr[i]);
        u[arr[i]] = 1;
      }
    }
    return a;
  }

  var xs = unique(hexbin(points.map(d => [d.x, d.y])).map(h => parseFloat(h.x))).sort(function(a,b) { return a - b;});
  var ys = unique(hexbin(points.map(d => [d.x, d.y])).map(h => parseFloat(h.y))).sort(function(a,b) { return a - b;});

  hexBinSvg.append("path")
    .datum(lineData)
    .attr("fill", "red")
    .attr("fill-opacity", .3)
    .attr("stroke", "none")
    .attr("d", d3.area()
      .x(function(d) { return x(d.cost) })
      .y0( height )
      .y1(function(d) { return y(d.earnings) })
    )
    hexBinSvg.append("path")
    .datum(lineData)
    .attr("fill", "green")
    .attr("fill-opacity", .3)
    .attr("stroke", "none")
    .attr("d", d3.area()
      .x(function(d) { return x(d.cost) })
      .y0( -height )
      .y1(function(d) { return y(d.earnings) })
    )

  hexBinSvg.append("text")
    .attr("x", 700) 
    .attr("y", 160)
    .text("Negative ROI")
    .attr("font-size", 48)
    .attr("font-weight", "bold")
    .attr("fill", "rgba(120, 0, 0, 0.25)") 
    .attr("text-anchor", "start");

  hexBinSvg.append("g")
    .attr("clip-path", "url(#clip)")
    .selectAll("path")
    .data(bins)
    .enter().append("path")
      .attr("id", d => xs.indexOf(d.x) + "-" + ys.indexOf(d.y))
      .attr("length", d => d.length)
      .attr("d", hexbin.hexagon())
      .attr("transform", function(d) { return `translate(${d.x}, ${d.y})`})
      .attr("fill", function(d) { return color(d.length); })
      .attr("stroke", "black")
      .attr("stroke-width", 0.1);
      
  hexBinSvg.append("path")
    .datum(lineData)
    .attr("fill", "none")
    .attr("stroke", "red")
    .attr("stroke-width", 1.5)
    .attr("d", d3.line()
      .x(function(d) { return x(d.cost) })
      .y(function(d) { return y(d.earnings) })
    )
  
  const legendNode = Legend(color, {
    title: "Institution Bin Count",
    marginLeft: 5
  });

  hexBinSvg.append("foreignObject")
    .attr("x", 20)     
    .attr("y", 0)
    .attr("width", 1000)
    .attr("height", 80)
    .node()
    .appendChild(legendNode);

  hexBinSvg.append("text")
    .attr("class", "axis-label")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 20)
    .text("Average Accumulated Income 10 Years after Graduation ($)");
  
  hexBinSvg.append("text")
    .attr("class", "axis-label")
    .attr("text-anchor", "middle")
    .attr("x", width/2)
    .attr("y", height + margin.bottom - 20)
    .text("Average Annual Cost ($)")

  hexBinSvg.append("text")
    .attr("x", 60) 
    .attr("y", 160)
    .text("Positive ROI")
    .attr("font-size", 48)
    .attr("font-weight", "bold")
    .attr("fill", "rgba(0, 120, 0, 0.25)") 
    .attr("text-anchor", "start");
  })
}


