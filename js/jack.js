const margin = {top: 10, right: 30, bottom: 30, left: 60},
    width = 800 - margin.left - margin.right,
    height = 600 - margin.top - margin.bottom;

const svg = d3.select("#hex-bin")
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
  svg.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(x));

  const y = d3.scaleLinear()
    .domain(d3.extent(data, d => d.MD_EARN_WNE_P10))
    .range([height, 0]);
  svg.append("g").call(d3.axisLeft(y));

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
    earnings: 4 * cost
  }));
  
  const bins = hexbin(points.map(d => [d.x, d.y]));
  const color = d3.scaleSequential(d3.interpolateOrRd)
    .domain([0, d3.max(bins, d => d.length)]);

  var Tooltip = d3.select("#jack-section")
    .append("div")
    .style("opacity", 0)
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("background-color", "white")
    .style("border", "solid")
    .style("border-width", "2px")
    .style("border-radius", "5px")
    .style("padding", "5px")

  var mouseover = function() {
    Tooltip
      .style("opacity", 1)
    d3.select(this)
      .style("stroke", "black")
  }
  var mousemove = function(event, d) {
    const indices = d.map(p => points.find(pt => pt.x === p[0] && pt.y === p[1]).o);
    var averageRoi = 0;
    for (i = 0; i < indices.length; i++) {
      averageRoi += ((indices[i].MD_EARN_WNE_P10 - (indices[i].COSTT4_A * 4)) / (indices[i].COSTT4_A * 4)) / indices.length;
    }

    Tooltip
      .html(`Average ROI: ${averageRoi}<br>Percentage of colleges: ${(indices.length / data.length) * 100}%`)
      .style("left", (d.x + 70) + "px")
      .style("top", (d.y + 50) + "px");
  }
  var mouseleave = function() {
    Tooltip
      .style("opacity", 0)
  }

  svg.append("clipPath")
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

  svg.append("g")
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
      .attr("stroke-width", 0.1)
    .on("mouseover", mouseover)
    .on("mousemove", mousemove)
    .on("mouseleave", mouseleave);

  svg.append("path")
      .datum(lineData)
      .attr("fill", "none")
      .attr("stroke", "red")
      .attr("stroke-width", 1.5)
      .attr("d", d3.line()
        .x(function(d) { return x(d.cost) })
        .y(function(d) { return y(d.earnings) })
      )
  

})