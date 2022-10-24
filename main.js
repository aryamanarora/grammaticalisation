var width = window.innerWidth, height = window.innerHeight;

var tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)

var svg = d3.select("body").append("svg")
var marker = svg.append("svg:defs").selectAll("marker")
    .data(["end"])      // Different link/path types can be defined here
  .enter().append("svg:marker")    // This section adds in the arrows
    .attr("id", String)
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 20)
    .attr("refY", 0)
    .attr("markerWidth", 5)
    .attr("markerHeight", 5)
    .attr("orient", "auto")
    .style("fill", "#999")
  .append("svg:path")
    .attr("d", "M0,-5L10,0L0,5");

var test = d3.json("data.json")
Promise.all([test]).then(d => {
    ForceGraph(d[0], {
        nodeId: d => d.id,
        nodeGroup: d => d.group,
        nodeTitle: d => `${d.id}\n${d.group}`,
        linkStrokeWidth: l => Math.sqrt(l.value),
        width: width,
        height: height,
        nodeStrength: -20
    })}
)

// Copyright 2021 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/force-directed-graph
function ForceGraph({
    nodes, // an iterable of node objects (typically [{id}, …])
    links // an iterable of link objects (typically [{source, target}, …])
  }, {
    nodeId = d => d.id, // given d in nodes, returns a unique identifier (string)
    nodeGroup, // given d in nodes, returns an (ordinal) value for color
    nodeGroups, // an array of ordinal values representing the node groups
    nodeTitle, // given d in nodes, a title string
    nodeFill = "currentColor", // node stroke fill (if not using a group color encoding)
    nodeStroke = "#fff", // node stroke color
    nodeStrokeWidth = 1.5, // node stroke width, in pixels
    nodeStrokeOpacity = 1, // node stroke opacity
    nodeRadius = 5, // node radius, in pixels
    nodeStrength,
    linkSource = ({source}) => source, // given d in links, returns a node identifier string
    linkTarget = ({target}) => target, // given d in links, returns a node identifier string
    linkStroke = "#999", // link stroke color
    linkStrokeOpacity = 0.6, // link stroke opacity
    linkStrokeWidth = 1.5, // given d in links, returns a stroke width in pixels
    linkStrokeLinecap = "round", // link stroke linecap
    linkStrength,
    colors = d3.schemeTableau10, // an array of color strings, for the node groups
    width = 640, // outer width, in pixels
    height = 400 // outer height, in pixels
  } = {}) {
    // Compute values.
    const N = d3.map(nodes, nodeId).map(intern);
    const LS = d3.map(links, linkSource).map(intern);
    const LT = d3.map(links, linkTarget).map(intern);
    if (nodeTitle === undefined) nodeTitle = (_, i) => N[i];
    const T = nodeTitle == null ? null : d3.map(nodes, nodeTitle);
    const G = nodeGroup == null ? null : d3.map(nodes, nodeGroup).map(intern);
    const W = typeof linkStrokeWidth !== "function" ? null : d3.map(links, linkStrokeWidth);
    const L = typeof linkStroke !== "function" ? null : d3.map(links, linkStroke);
  
    // Replace the input nodes and links with mutable objects for the simulation.
    nodes = d3.map(nodes, (_, i) => ({id: N[i]}));
    links = d3.map(links, (_, i) => ({source: LS[i], target: LT[i]}));

    console.log(nodes)
  
    // Compute default domains.
    if (G && nodeGroups === undefined) nodeGroups = d3.sort(G);
  
    // Construct the scales.
    const color = nodeGroup == null ? null : d3.scaleOrdinal(nodeGroups, colors);
    
    const colours = {}
    function get_colour(id) {
        if (id in colours) return colours[id];
        colours[id] = 0;
        links.forEach(d => {
            if (d.target == id) {
                colours[id] = Math.max(colours[id], get_colour(d.source) + 1);
            }
        })
        return colours[id];
    }

    nodes.forEach(d => {
        console.log(d, get_colour(d.id))
    })
  
    // Construct the forces.
    const forceNode = d3.forceManyBody();
    const forceLink = d3.forceLink(links).id(({index: i}) => N[i]);
    if (nodeStrength !== undefined) forceNode.strength(nodeStrength);
    if (linkStrength !== undefined) forceLink.strength(linkStrength);
  
    const simulation = d3.forceSimulation(nodes)
        .force("link", forceLink)
        .force("charge", forceNode)
        .force("center",  d3.forceCenter())
        // .force("x", d => {50 * colours[d.id] - 300})
        .on("tick", ticked);
  
    const svg = d3.select("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [-width / 2, -height / 2, width, height])
        .attr("style", "max-width: 100%; height: auto; height: intrinsic;");
  
    const link = svg.append("g")
        .attr("stroke", typeof linkStroke !== "function" ? linkStroke : null)
        .attr("stroke-opacity", linkStrokeOpacity)
        .attr("stroke-width", typeof linkStrokeWidth !== "function" ? linkStrokeWidth : null)
        .attr("stroke-linecap", linkStrokeLinecap)
      .selectAll("line")
      .data(links)
      .join("line")
        .attr("marker-end", "url(#end)")
  
    const n = svg.append("g")
        .attr("fill", nodeFill)
        .attr("stroke", nodeStroke)
        .attr("stroke-opacity", nodeStrokeOpacity)
        .attr("stroke-width", nodeStrokeWidth)

    const sc = d3.scaleLinear()
        .interpolate(() => d3.interpolateViridis)
        .domain([5, 0])

    function get_relations(id) {
        var ret = ""
        links.forEach(d => {
            if (d.source.id == id) {
                ret += `<p>${d.source.id} \u{2192} ${d.target.id}</p>`
            }
        })
        var ret2 = ""
        links.forEach(d => {
            if (d.target.id == id) {
                ret2 += `<p>${d.source.id} \u{2192} ${d.target.id}</p>`
            }
        })
        return (ret ? "<hr>" : "") + ret + (ret2 ? "<hr>" : "") + ret2
    }
      
    const node = n.selectAll("circle")
        .data(nodes)
        .join("circle")
        .attr("r", nodeRadius)
        .call(drag(simulation))
        .on("mousemove", function (event, d) {
            tooltip
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 28) + "px")
                .html(`<p><b>${d.id}</b> (max depth: ${colours[d.id]})</p>` + get_relations(d.id))
                .style("opacity", 1)
            d3.select(this).attr("stroke", "black")
        })
        .on("mouseout", function(event, d) {
            tooltip.style("opacity", 0)
            d3.select(this).attr("stroke", "white")
        })
    
    const text = n.selectAll("text")
        .data(nodes)
        .join("text")
        .style("fill", "black !important")
        .style("stroke-width", "0")
        // .style("stroke", "black")
        .style("font-size", "8px")
        .style("font-weight", "100")
        .style("opacity", "60%")
        .style("pointer-events", "none")
        .attr("dominant-baseline", "middle")
        .attr("text-anchor", "middle")
        .text(function (d) {
            return d.id;
        })
  
    if (W) link.attr("stroke-width", ({index: i}) => W[i]);
    if (L) link.attr("stroke", ({index: i}) => L[i]);
    if (G) node.attr("fill", ({index: i}) => sc(get_colour(nodes[i].id)));
    console.log(colours)
    // if (G) node.attr("fill", ({index: i}) => color(G[i]));
    // if (T) node.append("title").text(({index: i}) => T[i]);
  
    function intern(value) {
      return value !== null && typeof value === "object" ? value.valueOf() : value;
    }
  
    function ticked() {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
  
      node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);
  
      text
        .attr("x", d => d.x)
        .attr("y", d => d.y - 10)
        .raise();
    }
  
    function drag(simulation) {    
      function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }
      
      function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }
      
      function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }
      
      return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }
  
    return Object.assign(svg.node(), {scales: {color}});
  }