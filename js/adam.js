function ageToBracket(age) {
    if (age == null || isNaN(age)) return "Unknown";

    if (age >= 22 && age <= 25) return "Under 25";
    else if (age <= 30)         return "25–30";
    else if (age <= 35)         return "30–35";
    else if (age <= 40)         return "35–40";
    else if (age <= 50)         return "40–50";
    else                        return "50+";
}

function degreeLevel(ed) {
    if (ed == null || isNaN(ed)) return "Unknown";

    if (ed <= 40) return "No Degree";
    else if (ed == 43)         return "Bachelors Degree";
    else if (ed <= 46)         return "Graduate Degree";
}
const bracketOrder = ["Under 25", "25–30", "30–35", "35–40", "40–50", "50+"];
const degreeOrder = ["No Degree", "Bachelors Degree", "Graduate Degree"];


document.addEventListener('DOMContentLoaded', () => {
    const gBtn = document.getElementById('adam_btn_1');
    const sBtn = document.getElementById('adam_btn_2');
    if (gBtn) gBtn.addEventListener('click', viz1);
    if (sBtn) sBtn.addEventListener('click', viz2);
  });



async function viz1() {
    d3.csv("avgByBracketEdu.csv", d3.autoType).then(data => {
        d3.select("#adam_health").selectAll("*").remove();
        const margin = {top: 10, right: 20, bottom: 50, left: 70};
        const width = 800 - margin.left - margin.right;
        const height = 470 - margin.top - margin.bottom;


        const svg = d3.select("#adam_health").append("svg")
                                .attr("width", width + margin.left + margin.right)
                                .attr("height", height + margin.top + margin.bottom)
                                .append("g")
                                .attr("transform", `translate(${margin.left},${margin.top})`);

        avgByBracketEdu = data;
        const educationLevels = [...new Set(avgByBracketEdu.map(d => d.education))];

        const sizeScale = d3.scaleOrdinal()
        .domain(educationLevels)
        .range([5, 10, 15]); 

        const colorScale = d3.scaleLinear()
        .domain([1.5, 3.5])  
        .range(["green", "red"]);

        const x = d3.scaleBand()
        .domain(bracketOrder)
        .range([0, width])
        .paddingInner(0.3)
        .paddingOuter(0.2);

        const xEdu = d3.scaleBand()
        .domain(educationLevels)
        .range([0, x.bandwidth()])
        .padding(0.2);

        const y = d3.scaleLinear()
        .domain([0, d3.max(avgByBracketEdu, d => d.avgIncome)]).nice()
        .range([height, 0]);

        const color = d3.scaleOrdinal()
        .domain(educationLevels)
        .range(d3.schemeCategory10);

        svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

        svg.append("g")
        .call(d3.axisLeft(y));

        svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 45)
        .attr("text-anchor", "middle")
        .style("font-weight", "bold")
        .text("Age Bracket");

        svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -50)
        .attr("text-anchor", "middle")
        .style("font-weight", "bold")
        .text("Average Income");

        svg.selectAll("circle")
        .data(avgByBracketEdu)
        .enter()
        .append("circle")
            .attr("cx", d => x(d.ageBracket) + xEdu(d.education) + xEdu.bandwidth() / 2)
            .attr("cy", d => y(d.avgIncome))
            .attr("r", d => sizeScale(d.education))
            .attr("fill", d => colorScale(d.avgHealth))                      
            .attr("opacity", 0.9);
            
        const healthLevels = [1, 2, 3, 4, 5]; 
        const legendX = 30;            
        const legendY = 20;
        
        const legend = svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${legendX}, ${legendY})`);
        
        legend.append("text")
            .text("Health Level (1 best, 5 worst)")
            .attr("font-weight", "bold")
            .attr("x", -10)
            .attr("y", -10);

        legend.selectAll("legend-dots")
            .data(healthLevels)
            .enter()
            .append("circle")
                .attr("cx", 0)
                .attr("cy", (d, i) => i * 20)
                .attr("r", 6)
                .attr("fill", d => colorScale(d))  
                .attr("opacity", 0.9);
        
        legend.selectAll("legend-labels")
            .data(healthLevels)
            .enter()
            .append("text")
                .attr("x", 15)
                .attr("y", (d, i) => i * 20 + 4)
                .text(d => `Health ${d}`)
                .style("font-size", "12px");

    });
}

async function viz2() {
    d3.csv("boxDataByEdu.csv", d3.autoType).then(data => {
    d3.select("#adam_health").selectAll("*").remove();
    const margin = {top: 10, right: 20, bottom: 50, left: 70};
    const width = 800 - margin.left - margin.right;
    const height = 470 - margin.top - margin.bottom;


    const svg = d3.select("#adam_health").append("svg")
                            .attr("width", width + margin.left + margin.right)
                            .attr("height", height + margin.top + margin.bottom)
                            .append("g")
                            .attr("transform", `translate(${margin.left},${margin.top})`);
    const colorScale = d3.scaleOrdinal()
    .domain(degreeOrder)
    .range(d3.schemeSet2); 
    
    const boxData = data;
    
    const x0 = d3.scaleBand()
        .domain(bracketOrder)
        .range([0, width])
        .paddingInner(0.2)
        .paddingOuter(0.1);
    
    const x1 = d3.scaleBand()
        .domain(degreeOrder)
        .range([0, x0.bandwidth()])
        .padding(0.2);
    
    const y = d3.scaleLinear()
        .domain([0, d3.max(boxData, d => d.max)])
        .nice()
        .range([height, 0]);
    
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x0));
    
    svg.append("g")
        .call(d3.axisLeft(y));
    
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 35)
        .attr("text-anchor", "middle")
        .text("Age Bracket");
    
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -60)
        .attr("text-anchor", "middle")
        .text("Income");
    
    const boxWidth = x1.bandwidth();
    
    svg.selectAll(".whisker")
        .data(boxData)
        .enter()
        .append("line")
        .attr("class", "whisker")
        .attr("x1", d => x0(d.ageBracket) + x1(d.degree) + boxWidth / 2)
        .attr("x2", d => x0(d.ageBracket) + x1(d.degree) + boxWidth / 2)
        .attr("y1", d => y(d.min))
        .attr("y2", d => y(d.max))
        .attr("stroke", "black");
    
    svg.selectAll(".box")
        .data(boxData)
        .enter()
        .append("rect")
        .attr("class", "box")
        .attr("x", d => x0(d.ageBracket) + x1(d.degree))
        .attr("y", d => y(d.q3))
        .attr("width", boxWidth)
        .attr("height", d => y(d.q1) - y(d.q3))
        .attr("stroke", "black")
        .attr("fill", d => colorScale(d.degree));
    
    svg.selectAll(".median")
        .data(boxData)
        .enter()
        .append("line")
        .attr("class", "median")
        .attr("x1", d => x0(d.ageBracket) + x1(d.degree))
        .attr("x2", d => x0(d.ageBracket) + x1(d.degree) + boxWidth)
        .attr("y1", d => y(d.median))
        .attr("y2", d => y(d.median))
        .attr("stroke", "black")
        .attr("stroke-width", 2);

    const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${width - 130}, 0)`);
    
    const legendItem = legend.selectAll(".legend-item")
    .data(degreeOrder)
    .enter()
    .append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0, ${i * 20})`);
    
    legendItem.append("rect")
    .attr("x", 0)
    .attr("y", -10)
    .attr("width", 14)
    .attr("height", 14)
    .attr("fill", d => colorScale(d))
    .attr("stroke", "black");
    
    legendItem.append("text")
    .attr("x", 20)
    .attr("y", 0)
    .attr("dominant-baseline", "middle")
    .style("font-size", "12px")
    .text(d => d);
      
})}
