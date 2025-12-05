document.addEventListener("DOMContentLoaded", function () {

    // ---------------- Chat State & Helpers ----------------
    const chatMessages = []; // list of { text, role, timestamp }

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
            {
                id: 2,
                x: 420, y: 260,
                text: "Stop 1",
                type: "vis",
                onEnter: () => {
                    updateFacts("Welcome to Stop 1 – great place to start your journey!");
                    // showVizModal();
                }
            },
            {
                id: 3,
                x: 700, y: 180,
                text: "Stop 2",
                type: "vis",
                onEnter: () => updateFacts("This is Stop 2 – did you know this place is historic?")
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
                text: "Srujana Viz 1",
                type: "vis",
                onEnter: () => {
                    showVizModal();
                    srujanaInitViz();   // earnings + unemployment chart
                }
            },
            // Srujana Viz 2
            {
                id: 9,
                x: 100, y: 360,
                text: "Srujana Viz 2",
                type: "vis",
                onEnter: () => {
                    showVizModal();
                    srujanaViz2();      // Sankey chart
                }
            }
        ],

        // Story 2 markers
        story2: [
            {
                id: 1,
                x: 150, y: 120,
                text: "Story 2 – Start",
                type: "vis",
                onEnter: () => {
                    addChatMessage("This is another stop in the story");
                    updateFacts("Story 2: Welcome to the alternate route!");
                }
            },
            {
                id: 2,
                x: 625, y: 200,
                text: "Story 2 – Fact point",
                type: "fact",
                onEnter: () => {
                    addChatMessage("THis is the fist stop in story 2");
                    updateFacts("Story 2: Here's a fun fact stop.");
                }
            },
            {
                id: 4,
                x: 600, y: 500,
                text: "Akhil's Bubble Visualization",
                type: "vis",
                onEnter: () => {
                    addChatMessage("THis is just a chat feature for narration");
                    updateFacts("Story 2: Schools by loans originated")
                    showVizModal();
                    akhilBubble(akhilData);
                }
            },
            {
                id: 5,
                x: 150, y: 400,
                text: "Tejas's Visualization",
                type: "vis",
                onEnter: () => {
                    updateFacts(`
                    The promise of many institutions in the country is that universities are supposed to be a return on investment. You go for four years and take on 
                    tens to hundreds of thousands of dollars in debt so you can make all of it back with the career you got from the degree you earned. However, is that even
                    true? Is the promise of making all your money back in this day in age even possible? According to the U.S Department of Education\'s College Scorecard from
                    the most recent institution level data nearly 90% don\'t make a return on their investment after 10 years! 
                `);
                    showVizModal();
                    tejasViz();
                }
            },
            {
                id: 6,
                x: 200, y: 500,
                text: "Jack's Visualization",
                type: "vis",
                onEnter: () => {
                    updateFacts(`
                        
                `);
                    showVizModal();
                    hexBinVisual();
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
        updateCharacterPosition(); // 🔹 moves green dot to first marker

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
        const speed = 0.00009;

        progress += delta * speed;
        progress = Math.max(0, Math.min(1, progress));

        updateCharacterPosition();
    });

    // Close button hides the modal
    if (vizCloseBtn) {
        vizCloseBtn.addEventListener("click", hideVizModal);
    }
});
