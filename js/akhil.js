const fips = {
  "01":"AL","02":"AK","04":"AZ","05":"AR","06":"CA","08":"CO","09":"CT","10":"DE","11":"DC",
  "12":"FL","13":"GA","15":"HI","16":"ID","17":"IL","18":"IN","19":"IA","20":"KS","21":"KY",
  "22":"LA","23":"ME","24":"MD","25":"MA","26":"MI","27":"MN","28":"MS","29":"MO","30":"MT",
  "31":"NE","32":"NV","33":"NH","34":"NJ","35":"NM","36":"NY","37":"NC","38":"ND","39":"OH",
  "40":"OK","41":"OR","42":"PA","44":"RI","45":"SC","46":"SD","47":"TN","48":"TX","49":"UT",
  "50":"VT","51":"VA","53":"WA","54":"WV","55":"WI","56":"WY"
};

function cleanNum(v){
  if(!v) return 0;
  const n = +String(v).replace(/[$,\s]/g,'');
  return isNaN(n) ? 0 : n;
}

d3.csv("data/StudentLoanDebtBySchool.csv").then(function(rows){
  rows.forEach(r=>{
    r.recipients = +r["Recipients"];
    r.loans = +r["# of Loans Originated"];
    r.amount = cleanNum(r["$ of Loans Originated"]);
  });

  drawBubble(rows);
  drawMap(rows);
  hookControls();
});

function drawBubble(data){
  const wrap = d3.select("#bubbleChart");
  const size = wrap.node().getBoundingClientRect();
  const w = size.width || 900;
  const h = size.height || 420;

  const svg = wrap.append("svg")
    .attr("viewBox","0 0 "+w+" "+h);

  const tip = wrap.append("div")
    .attr("class","akhil_tt")
    .style("opacity",0);

  const grouped = d3.rollups(
    data,
    v => ({
      totalLoans: d3.sum(v, d=>d.loans),
      totalAmount: d3.sum(v, d=>d.amount),
      recipients: d3.sum(v, d=>d.recipients),
      city: v[0].City,
      state: v[0].State
    }),
    d=>d.School,
    d=>d["Loan Type"]
  );

  const top = grouped
    .map(([school,types])=>[school, d3.sum(types,t=>t[1].totalLoans)])
    .sort((a,b)=>d3.descending(a[1],b[1]))
    .slice(0,20)
    .map(d=>d[0]);

  const items = [];
  grouped.forEach(([school,types])=>{
    if(!top.includes(school)) return;
    types.forEach(([loanType,val])=>{
      if(val.totalLoans>0){
        items.push({
          school,
          loanType,
          totalLoans: val.totalLoans,
          totalAmount: val.totalAmount,
          recipients: val.recipients,
          city: val.city,
          state: val.state
        });
      }
    });
  });

  const loanTypes = ["Subsidized","Unsubsidized - Graduate","Unsubsidized - Undergraduate", "Total"];
  const colors = d3.scaleOrdinal()
    .domain(loanTypes)
    .range(["#f2594b","#f7ba3e","#ffd86b", "#0000FF"]);

  const rScale = d3.scaleSqrt()
    .domain([0,d3.max(items,d=>d.totalLoans)])
    .range([6,45]);

  const nodes = items.map(d=>({
    ...d,
    r: rScale(d.totalLoans)
  }));

  const sim = d3.forceSimulation(nodes)
    .force("charge", d3.forceManyBody().strength(0.5))
    .force("center", d3.forceCenter(w*0.4,h*0.5))
    .force("collide", d3.forceCollide().radius(d=>d.r+2))
    .on("tick",move);

  const circles = svg.selectAll("circle")
    .data(nodes)
    .enter().append("circle")
    .attr("class","bubble")
    .attr("r",d=>d.r)
    .attr("fill",d=>colors(d.loanType))
    .on("mousemove",function(ev,d){
      const p = d3.pointer(ev,wrap.node());
      tip.style("left",p[0]+10+"px")
        .style("top",p[1]+10+"px")
        .style("opacity",1)
        .html(
          "<div class='title'>"+d.school+"</div>"+
          "<div>"+d.city+", "+d.state+"</div>"+
          "<div><strong>Loan type:</strong> "+d.loanType+"</div>"+
          "<div><strong># Loans:</strong> "+d.totalLoans.toLocaleString()+"</div>"+
          "<div><strong>Total:</strong> $"+d.totalAmount.toLocaleString()+"</div>"+
          "<div><strong>Recipients:</strong> "+d.recipients.toLocaleString()+"</div>"
        );
    })
    .on("mouseleave",()=>tip.style("opacity",0));

  function move(){
    circles.attr("cx",d=>d.x).attr("cy",d=>d.y);
  }
}

function drawMap(data){
  const wrap = d3.select("#stateMap");
  const box = wrap.node().getBoundingClientRect();
  const w = box.width || 900;
  const h = box.height || 420;

  const svg = wrap.append("svg")
    .attr("viewBox","0 0 "+w+" "+h);

  const tip = wrap.append("div")
    .attr("class","akhil_tt")
    .style("opacity",0);

  const stats = d3.rollup(
    data,
    v=>{
      const amt = d3.sum(v,d=>d.amount);
      const rc = d3.sum(v,d=>d.recipients);
      return {amt,rc,avg: rc>0 ? amt/rc : 0};
    },
    d=>d.State
  );

  const values = Array.from(stats.values(),d=>d.avg).filter(d=>d>0);

  const fill = d3.scaleQuantize()
    .domain([d3.min(values),d3.max(values)])
    .range([
      "#c7e9c0","#74c476","#31a354","#006d2c",
      "#00441b","#08306b","#08519c","#2171b5","#4292c6"
    ]);

  d3.json("data/us-states-10m.json").then(function(us){
    const st = topojson.feature(us, us.objects.states);
    const proj = d3.geoAlbersUsa().fitSize([w,h],st);
    const path = d3.geoPath(proj);

    svg.selectAll(".state")
      .data(st.features)
      .enter().append("path")
      .attr("class","state")
      .attr("d",path)
      .attr("fill",d=>{
        const abbr = fips[d.id];
        const row = stats.get(abbr);
        if(!row || row.avg<=0) return "#f0f0f0";
        return fill(row.avg);
      })
      .on("mousemove",function(ev,d){
        const p = d3.pointer(ev,wrap.node());
        const abbr = fips[d.id];
        const row = stats.get(abbr) || {avg:0,rc:0};
        tip.style("left",p[0]+10+"px")
          .style("top",p[1]+10+"px")
          .style("opacity",1)
          .html(
            "<div class='title'>"+d.properties.name+"</div>"+
            "<div><strong>State:</strong> "+(abbr || "")+"</div>"+
            "<div><strong>Avg loan:</strong> $"+Math.round(row.avg).toLocaleString()+"</div>"+
            "<div><strong>Recipients:</strong> "+row.rc.toLocaleString()+"</div>"
          );
      })
      .on("mouseleave",()=>tip.style("opacity",0));

    const lw = 20, lh = 180;
    const scale = d3.scaleLinear().domain(fill.domain()).range([lh,0]);
    const g = svg.append("g").attr("transform","translate("+(w-60)+",40)");

    const defs = svg.append("defs");
    const gid = "gradLoan";

    const grad = defs.append("linearGradient")
      .attr("id",gid)
      .attr("x1","0%")
      .attr("y1","100%")
      .attr("x2","0%")
      .attr("y2","0%");

    const stops = fill.range();
    stops.forEach((c,i)=>{
      grad.append("stop")
        .attr("offset",(i/(stops.length-1))*100+"%")
        .attr("stop-color",c);
    });

    g.append("rect")
      .attr("width",lw)
      .attr("height",lh)
      .attr("fill","url(#"+gid+")")
      .style("stroke","#444")
      .style("stroke-width","0.7");

    const axis = d3.axisRight(scale)
      .ticks(6)
      .tickFormat(d=>"$"+Math.round(d).toLocaleString());

    g.append("g")
      .attr("transform","translate("+lw+",0)")
      .call(axis)
      .selectAll("text")
      .style("font-size","10px");
  });
}

function hookControls(){
  const section = document.getElementById("akhil-section");
  if(!section) return;
  const bubble = document.getElementById("bubbleChart");
  const map = document.getElementById("stateMap");
  const buttons = section.querySelectorAll(".akhil_btn");

  buttons.forEach(btn=>{
    btn.addEventListener("click",()=>{
      const view = btn.getAttribute("data-view");
      if(view === "bubble"){
        bubble.style.display = "";
        map.style.display = "";
      }
      if(view === "map"){
        bubble.style.display = "none";
        map.style.display = "";
      }
    });
  });
}
