console.log("Adam's D3 Visualization Script");

// Set the dimensions of the canvas / graph

const margin = {top: 10, right: 20, bottom: 50, left: 50};
const width = 800 - margin.left - margin.right;
const height = 470 - margin.top - margin.bottom;


// append the svg object to the body of the page
// append a g (group) element to 'svg' and
// move the g element to the top+left margin
var svg = d3.select("#adam_health").append("svg")
                           .attr("width", width + margin.left + margin.right)
                           .attr("height", height + margin.top + margin.bottom)
                           .append("g")
                           .attr("transform", `translate(${margin.left},${margin.top})`);

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

// Get the data
d3.csv("/asecpub25csv/pppub25.csv", d3.autoType).then(data => {

    // format the data such that strings are converted to their appropriate types
    //INCOME = data['Ptotval']
    //HEALTH = data["HEA"]
    //DEGREE = data['A_HGA']

    data.forEach(d => {
        d["ageBracket"] = ageToBracket(d["A_AGE"]);
    });


    data.forEach(d => {
        d["education"] = degreeLevel(d['A_HGA']);
    });

    const bracketOrder = ["Under 25", "25–30", "30–35", "35–40", "40–50", "50+"];

    bracketOrder.forEach(b => {
        const edus = [...new Set(
          data
            .filter(d => d.ageBracket === b)
            .map(d => d.education)
        )];
    });


    const educationLevels = ["No Degree", "Bachelors Degree", "Graduate Degree"]; 

    let avgByBracketEdu = d3.flatRollup(
        data,
        v => ({
            avgIncome: d3.mean(v, d => d.PTOTVAL),
            avgHealth: d3.mean(v, d => d.HEA)
          }),
        d => d.ageBracket,
        d => d.education
      ).map(([ageBracket, education, values]) => ({
        ageBracket,
        education,
        avgIncome: values.avgIncome,
        avgHealth: values.avgHealth
      }));
      
    avgByBracketEdu = avgByBracketEdu
    .filter(d => d.ageBracket !== "Unknown")
    .sort((a, b) => bracketOrder.indexOf(a.ageBracket) - bracketOrder.indexOf(b.ageBracket));

    console.table(avgByBracketEdu);
    

    const sizeScale = d3.scaleOrdinal()
    .domain(educationLevels)
    .range([5, 10, 15]);   // small, medium, large radius

    const colorScale = d3.scaleLinear()
    .domain([1.5, 3.5])  
    .range(["green", "red"]);

    const x = d3.scaleBand()
    .domain(bracketOrder)
    .range([0, width])
    .paddingInner(0.3)
    .paddingOuter(0.2);

    // Inner scale: positions within each age bracket
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

});