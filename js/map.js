document.addEventListener("DOMContentLoaded", function () {

    // ---------------- Chat State & Helpers ----------------
    const chatMessages = []; // list of { text, role, timestamp }
    let endReached = false;

    const chatMessagesDiv = document.getElementById("chat-messages");

    function renderChatMessages() {
        if (!chatMessagesDiv) return;

        chatMessagesDiv.innerHTML = "";

        chatMessages.forEach(msg => {
            const div = document.createElement("div");
            div.classList.add("chat-message");

            // optional role styling: "system", "user", "marker"
            if (msg.role) {
                div.classList.add(msg.role);
            }

            div.textContent = msg.text;
            chatMessagesDiv.appendChild(div);
        });

        // Make sure the latest message is in view
        chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
    }

    function addChatMessage(text, role = "marker") {
        chatMessages.push({
            text,
            role,
            timestamp: Date.now()
        });
        renderChatMessages();
    }


    const vizModal = document.getElementById("viz-modal");
    const vizContainer = document.getElementById("viz-container");
    const vizCloseBtn = document.getElementById("viz-close-btn");

    function showVizModal() {
        if (vizModal) {
            vizModal.style.display = "flex";
        }
    }

    function hideVizModal() {
        if (vizModal) {
            vizModal.style.display = "none";
            vizContainer.innerHTML = "";
        }
    }

    const TARGET_WIDTH = 1000;
    const TARGET_HEIGHT = 700;

    const container = d3.select("#map-container")
        .style("width", TARGET_WIDTH + "px")
        .style("height", TARGET_HEIGHT + "px")
        .style("overflow", "hidden");

    const svg = container.append("svg")
        .attr("id", "asu-map")
        .attr("width", TARGET_WIDTH)
        .attr("height", TARGET_HEIGHT);

    // ---------------- Background Map ----------------
    svg.append("image")
        .attr("href", "img/asu_map.png")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", TARGET_WIDTH)
        .attr("height", TARGET_HEIGHT);

    const completionLineList = [
        {
            points: [[912, 699], [912, 295], [891, 293], [801, 353], [520, 353]],
            hasCompleted: true
        },
        {
            points: [[906, 1], [903, 78], [752, 78], [752, 353], [520, 353]],
            hasCompleted: true
        },
        {
            points: [[1, 90], [70, 90], [70, 418], [280, 418], [383, 353], [520, 353]],
            hasCompleted: true
        },
        {
            points: [[652, 699], [642, 664], [642, 572], [744, 447], [755, 353], [520, 353]],
            hasCompleted: true
        },
        {
            points: [[384,699], [384, 353], [520, 353]],
            hasCompleted: true
        },
        {
            points: [[278, 1], [278, 310]],
            hasCompleted: false
        },
        {
            points: [[998, 302], [910, 209], [912, 295]],
            hasCompleted: false
        },
        {
            points: [[1, 617], [376, 617]],
            hasCompleted: false
        },
        {
            points: [[381, 1], [381, 353], [400, 353]],
            hasCompleted: false
        },
        {
            points: [[999, 467], [888, 467], [841, 479], [733, 475]],
            hasCompleted: false
        },
    ]

    function startPaths() {
        const line = d3.line()
            .x(d => d[0])
            .y(d => d[1])
            .curve(d3.curveLinear);
        
        
        svg.append("circle")
            .attr("class", "graduation-circles")
            .attr("cx", 520)
            .attr("cy", 333)
            .attr("r", 15)
            .attr("fill", "#96694f")

        svg.append("circle")
            .attr("class", "graduation-circles")
            .attr("cx", 520)
            .attr("cy", 353)
            .attr("r", 5)
            .attr("fill", "#96694f")
        
        svg.append("g")
            .attr("class", "graduation-icon")
            .html(`
                <svg width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M22 9L12 4L2 9L12 14L22 9ZM22 9V15M19 10.5V16.5L12 20L5 16.5V10.5" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>`)
            .attr("transform", "translate(510, 323)");

        svg.selectAll(".route-line")
            .data(completionLineList)
            .enter()
            .append("path")
                .attr("class", "route-line")
                .attr("d", d => line(d.points))
                .attr("fill", "none")
                .attr("stroke", d => d.hasCompleted ? "green" : "red")   
                .attr("stroke-width", 6)
                .attr("opacity", 0)

        let scrollProgress = 0;

        svg.selectAll(".route-line").each(function() {
            const length = this.getTotalLength();
            d3.select(this)
                .attr("stroke-dasharray", length)
                .attr("stroke-dashoffset", length)
                .attr("opacity", .5);
        });

        svg.on("wheel", function(event) {
            if (scrollProgress > 0 && svg.selectAll(".route-line")._groups[0].length!== 0) {
                endReached = true;
            }

            event.preventDefault();
            const delta = event.deltaY;
            const speed = 0.0003;

            scrollProgress += delta * speed;
            scrollProgress = Math.max(0, Math.min(1, scrollProgress));

            svg.selectAll(".route-line").each(function() {
                const length = this.getTotalLength();
                const offset = length * (1 - scrollProgress);
                d3.select(this).attr("stroke-dashoffset", offset);
            });

            if(scrollProgress <= 0) {
                endReached = false;
                svg.selectAll(".route-line").remove();
                svg.select(".graduation-icon").remove();
                svg.selectAll(".graduation-circles").remove();
            }
        });
    }

    // ---------------- Helper: Update Facts Box ----------------
    function updateFacts(text) {
        const div = document.getElementById("facts-container");
        if (div) {
            div.innerHTML = `<p>${text}</p>`;
        }
    }

    const STORY_MARKERS = {
        story1: [
            {
                id: 1,
                x: 390, y: 50,
                text: "Bus Stop",
                type: "vis",
                onEnter: () => updateFacts("You reached the Bus Stop! Here's a fun fact.")
            },

            // Bhavana Visualization 1 (Slopegraph)
{
    id: 2,
    x: 460, 
    y: 299,
    text: "Life Sciences Building",
    type: "vis",
    onEnter: () => {
        updateFacts("Explore how salaries grow between early and mid career across different majors.");
        addChatMessage("Slopegraph loaded near the LSE Building.");
        showVizModal();
        bhavanaViz1();
    }
},

// Bhavana Visualization 2 
{
    id: 3,
    x: 305, 
    y: 465,
    text: "Student Services Bldg",
    type: "vis",
    onEnter: () => {
        updateFacts("Simulate career paths, tuition costs, and alternative salary options to see when a major pays off.");
        addChatMessage("ROI Simulator loaded near the ISSC Building.");
        showVizModal();
        bhavanaViz2();
    }
},
{
                id: 4,
                x: 860, y: 410,
                text: "Stop 3",
                type: "vis",
                onEnter: () => updateFacts("Stop 3: You are doing great on this tour!")
            },
            {
                id: 5,
                x: 550, y: 500,
                text: "Invisible turn helper",
                type: "invisible"
            },
                   
            {
                id: 6,
                x: 300, y: 410,
                text: "Adam's Visualization 2",
                type: "vis",
                onEnter: () => {
                    updateFacts("Story 2: Main visualization stop.");
                    showVizModal();
                    viz2();
                }
            },
            {
                id: 7,
                x: 300, y: 150,
                text: "Adam's Visualization 1",
                type: "vis",
                onEnter: () => {
                    updateFacts("Story 2: Main visualization stop.");
                    showVizModal();
                    viz1();
                }
            },
            
            // Srujana Viz 1 
{
    id: 8,
    x: 260, y: 320,
    text: "Student Financial Services",   
    type: "vis",
    onEnter: () => {
        updateFacts(`
A college degree is more than just time in class—it's one of the strongest predictors
of stable income and job security. As education levels rise, weekly earnings climb
and unemployment drops. The data here shows how investing in your education
consistently leads to better long-term outcomes.
        `);
        addChatMessage("Here at Student Financial Services, you can see how finishing a degree strengthens both your earning power and job stability.");
        showVizModal();
        srujanaInitViz();   // earnings + unemployment chart
    }
},

// Srujana Viz 2 
{
    id: 9,
    x: 100, y: 360,
    text: "Career Services",   
    type: "vis",
    onEnter: () => {
        updateFacts(`
Your education doesn’t just affect how much you earn—it shapes which careers
are even available to you. Many high-growth, high-paying jobs rely heavily on
workers with bachelor’s and advanced degrees. This view shows how different
education levels flow into real occupations.
        `);
        addChatMessage("At Career Services, you can trace how your degree connects to real jobs and see how college opens doors that might not exist otherwise.");
        showVizModal();
        srujanaViz2();      // Sankey chart
    }
}


            
        ],

        // Story 2 markers
        story2: [
            {
                id: 1,
                x: 70, y: 70,
                text: "Bus Stop",
                type: "vis",
                onEnter: () => {
                    addChatMessage("The ASU bus stop is where thousands of students begin and end their daily campus journeys. From here, we start exploring the financial pathways students take, beginning with understanding the environment surrounding higher education.");
                }
            },
            {
                id: 2,
                x: 70, y: 150,
                text: "Bus Stop",
                type: "fact",
                onEnter: () => {
                    addChatMessage("Chase Bank sits just across from campus and represents the financial institutions students often rely on for loans or credit. Our next visualization explores the geographic spread of colleges and how tuition costs vary across the country.");
                }
            },
            {
                id: 3,
                x: 60, y: 180,
                text: "Chase Bank",
                type: "vis",
                onEnter: () => {
                    addChatMessage("This map shows the locations of colleges and universities across the U.S. The color of the region reflects the average tuition fees, with darker colors indicating higher costs. This visualization helps us understand the geographical distribution of educational institutions and highlights that some regions leave students in deeper in debts, showing structural inequality.");
                    updateFacts("Access to higher education is not uniform across the country. This map reveals significant disparities in the availability and cost of colleges and universities. Regions with fewer institutions or higher tuition fees may pose barriers for students seeking affordable education. By visualizing these patterns, we can better understand the challenges faced by prospective students and work towards creating a more equitable educational landscape.");
                    showVizModal();
                    akhilMap(akhilData);
                }
            },
            {
                id: 4,
                x: 200, y: 400,
                text: "Financial Aid Office",
                type: "fact",
                onEnter: () => {
                    addChatMessage("The Financial Aid Office is where students learn how much support they are eligible for and what loans they may need to take. The upcoming visualization shows how different schools across the nation rely on federal loans, highlighting the uneven financial burden students face.")
                }
            },
            {
                id: 4,
                x: 300, y: 500,
                text: "Financial Aid Office",
                type: "vis",
                onEnter: () => {
                    addChatMessage("Here at this stop, you are shown how students across different schools use federal loans. Each bubble is a school. Bigger bubbles mean more borrowing, and the colors show different loan types. It gives you a quick snapshot of where financial aid is most used and how students needs vary by program. Every bubble represents real students working towards their goals.");
                    updateFacts("We're taught that college is an investment: borrow now, succeed later. But students taking on thousands in loans just to earn a degree, the promise starts to feel less certain. Some programs require far more borrowing than others, reminding us that the cost of opportunity isn’t shared equally. This forces us to ask a hard question: if so many students must take on this much debt, what future are we really preparing them for?")
                    showVizModal();
                    akhilBubble(akhilData);
                }
            },  
            {
                id: 5,
                x: 400, y: 540,
                text: "Chase Bank",
                type: "fact",
                onEnter: () => {
                    addChatMessage("W. P. Carey is ASU’s business school and a place where students learn about investment, risk, and financial returns. In this visualization, each hexagon shows schools grouped by their average annual cost and the income students earn ten years after graduation. The boundary line helps you see which areas have a positive return on investment and which do not, raising the question of whether the price of a degree truly pays off.");
                }
            },          
            {
                id: 6,
                x: 500, y: 480,
                text: "WP Carey School of Business",
                type: "vis",
                onEnter: () => {
                    updateFacts(`
                        This visual is a hex bin plot that compares the average annual cost and the average income accumulation 10 years after graduation. It also has a ROI boundar
                        to show what bins have a positive ROI and which do not. Each hexagon on the plot is a bin that contains a specificed number of datapoints. The darker the hexagon 
                        the greater number of datapoints inside that bin. 
                    `);
                    showVizModal();
                    hexBinVisual();
                }
            },
            {
                id: 7,
                x: 350, y: 450,
                text: "Chase Bank",
                type: "fact",
                onEnter: () => {
                    addChatMessage(`
                        Career Services is where students come to build skills and explore certifications that often matter just as much as a college degree. Many students invest years into earning a degree only to find that they still need additional certifications to stay competitive in the job market. What is even more surprising is that, in many age groups, the income of people with a college degree is very similar to those without one who simply hold relevant certifications. If both paths lead to nearly the same earnings, it raises an important question: why spend so much time and money on a degree at all?

                        `)
                }
            },         
            {
                id: 8,
                x: 300, y: 420,
                text: "Career Services",
                type: "vis",
                onEnter: () => {
                    updateFacts(`
                        This visualization highlights how different age groups, education levels, and certification choices shape opportunities in the job market and how skills beyond a degree can influence long term outcomes.
                    `);
                    showVizModal();
                    tejasSunburstViz();
                }
            },
            {
                id: 9,
                x: 300, y: 300,
                text: "Chase Bank",
                type: "fact",
                onEnter: () => {
                    addChatMessage(`
                        The next visualization shows retirement income across age bins, comparing people 
with a college degree to those without one. You’ll notice that at the median, the 
difference between the two groups isn’t as large as most people expect. Let’s take a closer look at what 
this means for the long-term value of a college education.
`)
                }
            },        
            {
                id: 10,
                x: 300, y: 120,
                text: "Church",
                type: "vis",
                onEnter: () => {
                    updateFacts(`
                        This quiet corner of campus gives us space to reflect on long-term outcomes. 
Here, we examine how retirement income changes across age groups for those 
with and without a college degree. While it's commonly believed that earning 
a degree guarantees higher lifetime earnings, the data shows a more complex 
story—especially when comparing different percentiles of income.
                        `)
                    
                    showVizModal();
                    tejasViz();
                }
            },
            {
                id: 11,
                x: 390, y: 150,
                text: "Old Main",
                type: "fact",
                onEnter: () => {
                    addChatMessage(`
                    We are now approaching Old Main, one of the most iconic spots on campus and a place where students often come to take their graduation photos. It represents the finish line of the college journey and the moment every student hopes to reach. Before we look at the final visualization, take a moment to reflect on how many students actually make it to this stage and how many never get the chance. Our last visual will help us understand that journey.
                        `)
                }
            },    
            {
                id: 12,
                x: 443, y: 195,
                text: "Old Main",
                type: "vis",
                onEnter: () => {
                    updateFacts(`
                        This visualization traces the journeys of individual students as they move through college. Each line represents a student, with green lines showing those who graduate within six years and red lines showing those who drop out. The animation helps reveal how many students reach the goal of earning a degree and how many fall off the path along the way.
                    `);
                    addChatMessage(`
                        As you scroll you will see 10 lines routing to the graduation cap icon. Each line represents a student, if the line is green the student graduated in less than 6
                        years and red if they dropped out. The graduation cap icon represents reaching the goal of graduating or earning the degree. 
                    `)
                    startPaths();
                }
            },

        ]
    };


    // ---------------- Markers ----------------
    // const markers = [
    //     {
    //         id: 1,
    //         x: 390, y: 50,
    //         text: "Bus Stop",
    //         type: "vis",
    //         onEnter: () => updateFacts("You reached the Bus Stop! Here's a fun fact.")
    //     },
    //     {
    //         id: 2,
    //         x: 420, y: 260,
    //         text: "Stop 1",
    //         type: "vis",
    //         onEnter: () => {
    //             updateFacts("Welcome to Stop 1 – great place to start your journey!");
    //             showVizModal();
    //         }
    //     },
    //     {
    //         id: 3,
    //         x: 700, y: 180,
    //         text: "Stop 2",
    //         type: "vis",
    //         onEnter: () => updateFacts("This is Stop 2 – did you know this place is historic?")
    //     },
    //     {
    //         id: 4,
    //         x: 860, y: 410,
    //         text: "Stop 3",
    //         type: "vis",
    //         onEnter: () => updateFacts("Stop 3: You are doing great on this tour!")
    //     },
    //     {
    //         id: 5,
    //         x: 550, y: 500,
    //         text: "Stop 4",
    //         type: "invisible",
    //         onEnter: () => updateFacts("Stop 4 – A relaxing area for students.")
    //     },
    //     {
    //         id: 6,
    //         x: 300, y: 410,
    //         text: "Stop 4",
    //         type: "fact",
    //         onEnter: () => updateFacts("Stop 4 – A relaxing area for students.")
    //     },
    //     {
    //         id: 7,
    //         x: 370, y: 50,
    //         text: "Church",
    //         type: "vis",
    //         onEnter: () => updateFacts("You have arrived at the Church stop!")
    //     }
    // ];

    const params = new URLSearchParams(window.location.search);
    const storyId = params.get("story") || "story1";

    const markers = STORY_MARKERS[storyId] || STORY_MARKERS.story1;

    // ---------------- Road Path ----------------
    const roadLine = d3.line()
        .x(d => d.x)
        .y(d => d.y)
        .curve(d3.curveMonotoneX);

    const roadPath = svg.append("g")
        .attr("id", "map-road")
        .append("path")
        .datum(markers)
        .attr("class", "map-road-path")
        .attr("d", roadLine);

    // ---------------- Tooltip ----------------
    const tooltip = d3.select("body")
        .append("div")
        .attr("class", "marker-tooltip")
        .style("position", "absolute")
        .style("pointer-events", "none")
        .style("padding", "6px 10px")
        .style("background", "rgba(0,0,0,0.7)")
        .style("color", "#fff")
        .style("border-radius", "6px")
        .style("font-size", "13px")
        .style("white-space", "nowrap")
        .style("opacity", 0)
        .style("z-index", 1000);

    // ---------------- Draw Markers ----------------
    const markerGroup = svg.append("g")
        .attr("id", "map-markers");

    const visibleMarkers = markers.filter(m => m.type !== "invisible");

    markerGroup.selectAll("circle")
        .data(visibleMarkers)
        .enter()
        .append("circle")
        .attr("class", d =>
            "map-marker " +
            (d.type === "vis" ? "marker-vis" :
                d.type === "fact" ? "marker-fact" : "")
        )
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("r", d => d.type === "vis" ? 8 : 4)  // vis bigger, fact smaller
        .on("mouseover", (event, d) => {
            tooltip.style("opacity", 1).text(d.text);
        })
        .on("mousemove", (event) => {
            tooltip
                .style("left", (event.pageX + 12) + "px")
                .style("top", (event.pageY + 12) + "px");
        })
        .on("mouseout", () => tooltip.style("opacity", 0));

    // ---------------- Character Movement ----------------
    const pathNode = roadPath.node();
    const totalLength = pathNode.getTotalLength();

    let progress = 0;
    let activeMarkerIndex = 0;  // start at first marker

    const character = svg.append("circle")
        .attr("class", "tour-character")
        .attr("r", 10);

    // --- NEW: update active marker based on actual position, not just progress ---
    function updateActiveMarkerFromPoint(point) {
        let closestIndex = -1;
        let closestDist2 = Infinity;

        for (let i = 0; i < markers.length; i++) {
            const m = markers[i];
            const dx = point.x - m.x;
            const dy = point.y - m.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < closestDist2) {
                closestDist2 = d2;
                closestIndex = i;
            }
        }

        // how close do we need to be to "reach" a marker? (in pixels)
        const THRESHOLD = 5;         // tweak this if needed
        const THRESHOLD2 = THRESHOLD * THRESHOLD;

        if (closestIndex !== -1 &&
            closestIndex !== activeMarkerIndex &&
            closestDist2 <= THRESHOLD2) {

            activeMarkerIndex = closestIndex;
            const m = markers[closestIndex];
            if (m.onEnter) {
                m.onEnter(m);
            }
        }
    }

    function updateCharacterPosition() {
        const point = pathNode.getPointAtLength(progress * totalLength);
        character.attr("cx", point.x).attr("cy", point.y);

        // check if we've reached a marker
        updateActiveMarkerFromPoint(point);
    }

    // Position character at the start and trigger first marker once on load
    if (markers.length > 0) {
        progress = 0;              // make it explicit
        updateCharacterPosition();

        if (markers[0].onEnter) {
            markers[0].onEnter(markers[0]);
        }
    } else {
        // no markers: hide character so it doesn't sit at (0,0)
        character.attr("visibility", "hidden");
    }


    // ---------------- Scroll Interaction ----------------
    container.on("wheel", function (event) {
        event.preventDefault();

        const delta = event.deltaY;
        const speed = 0.00005;

        progress += delta * speed;
        progress = Math.max(0, Math.min(1, progress));

        updateCharacterPosition();
    });

    // Close button hides the modal
    if (vizCloseBtn) {
        vizCloseBtn.addEventListener("click", hideVizModal);
    }
});
