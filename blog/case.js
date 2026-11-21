/* A case-study page: draws the architecture from the page's JSON, lets the
   reader step through its stages, marks the section in view in "On this
   page", and raises each section as it arrives. blog.js still runs the top
   bar and the heading. */
(() =>
  {
    const SVG = "http://www.w3.org/2000/svg";
    const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const KIND_LABEL = { source: "Source", stage: "Stage", gate: "Decision gate", store: "Store", output: "Output" };

    const el = (name, attrs = {}, parent) =>
      {
        const node = document.createElementNS(SVG, name);
        for(const [key, value] of Object.entries(attrs))
          node.setAttribute(key, value);
        if(parent)
          parent.appendChild(node);
        return node;
      };

    /* ================================================================
       Architecture: regions, links and stages from #case-arch-data
       ================================================================ */
    // A link leaves a stage's right edge for the next one's left edge, with
    // one bend halfway; a stage below or above is reached through its top or
    // bottom instead, so links never cross a stage.
    const route = (a, b) =>
      {
        const ay = a.y + a.h / 2, by = b.y + b.h / 2;
        if(b.x >= a.x + a.w)
          {
            const sx = a.x + a.w, ex = b.x;
            if(Math.abs(ay - by) < 1)
              return { d: `M${sx} ${ay}H${ex}`, mid: [(sx + ex) / 2, ay] };
            const mx = Math.round((sx + ex) / 2);
            return { d: `M${sx} ${ay}H${mx}V${by}H${ex}`, mid: [mx, (ay + by) / 2] };
          }
        if(b.x + b.w <= a.x)
          {
            const sx = a.x, ex = b.x + b.w;
            const mx = Math.round((sx + ex) / 2);
            return { d: `M${sx} ${ay}H${mx}V${by}H${ex}`, mid: [mx, (ay + by) / 2] };
          }
        const ax = a.x + a.w / 2, bx = b.x + b.w / 2;
        const down = b.y > a.y;
        const sy = down ? a.y + a.h : a.y, ey = down ? b.y : b.y + b.h;
        const my = Math.round((sy + ey) / 2);
        return { d: `M${ax} ${sy}V${my}H${bx}V${ey}`, mid: [(ax + bx) / 2, my] };
      };

    const initArchitecture = (figure) =>
      {
        const source = document.getElementById(figure.dataset.source);
        if(!source)
          return;
        const data = JSON.parse(source.textContent);
        const svg = figure.querySelector(".case-arch-drawing");
        const [, , width, height] = data.viewBox.split(" ").map(Number);
        svg.setAttribute("viewBox", data.viewBox);
        svg.style.aspectRatio = `${width} / ${height}`;

        const defs = el("defs", {}, svg);
        const arrow = el("marker", { id: `${figure.id}-arrow`, viewBox: "0 0 8 8", refX: "7", refY: "4", markerWidth: "7", markerHeight: "7", orient: "auto-start-reverse" }, defs);
        el("path", { d: "M0 0L8 4L0 8Z", class: "case-arch-arrow" }, arrow);

        for(const region of data.regions || [])
          {
            const group = el("g", { class: "case-arch-region" }, svg);
            el("rect", { x: region.x, y: region.y, width: region.w, height: region.h }, group);
            el("text", { x: region.x + 12, y: region.y + 18 }, group).textContent = region.label;
          }

        const nodes = new Map(data.nodes.map((node) => [node.id, { w: 152, h: 76, ...node }]));
        const edgeLayer = el("g", {}, svg);
        const inkLayer = el("g", {}, svg);
        const nodeLayer = el("g", {}, svg);
        const edges = data.edges.map((edge) =>
          {
            const shape = route(nodes.get(edge.from), nodes.get(edge.to));
            const group = el("g", { class: "case-arch-edge", "data-kind": edge.kind || "data" }, edgeLayer);
            el("path", { d: shape.d, class: "case-arch-route", "marker-end": `url(#${figure.id}-arrow)` }, group);
            if(edge.label)
              el("text", { x: shape.mid[0], y: shape.mid[1] - 8, class: "case-arch-edge-label" }, group).textContent = edge.label;
            return { ...edge, d: shape.d, group };
          });

        const stages = [...nodes.values()];
        const buttons = stages.map((node, index) =>
          {
            const group = el("g", { class: "case-arch-node", role: "button", tabindex: "0", "aria-pressed": "false", "data-type": node.type || "stage", "aria-label": `${node.title.replace(/\n/g, " ")}, stage ${index + 1} of ${stages.length}` }, nodeLayer);
            el("rect", { x: node.x, y: node.y, width: node.w, height: node.h, class: "case-arch-node-body" }, group);
            const lines = node.title.split("\n");
            const title = el("text", { x: node.x + 12, y: node.y + 26, class: "case-arch-node-title" }, group);
            lines.forEach((line, i) => { el("tspan", { x: node.x + 12, dy: i ? 18 : 0 }, title).textContent = line; });
            if(node.sub)
              el("text", { x: node.x + 12, y: node.y + node.h - 14, class: "case-arch-node-sub" }, group).textContent = node.sub;
            group.addEventListener("click", () => select(index));
            group.addEventListener("keydown", (event) =>
              {
                if(event.key === "Enter" || event.key === " ")
                  {
                    event.preventDefault();
                    select(index);
                  }
              });
            return group;
          });

        // The inspector: what the stage is, what it does, what feeds it and
        // what it feeds. Data in and out are read from the links.
        const inspector = figure.querySelector(".case-arch-inspector");
        const typeLabel = inspector.querySelector(".case-arch-type");
        const heading = inspector.querySelector("h4");
        const step = inspector.querySelector("[data-step]");
        const text = inspector.querySelector(".case-arch-body p");
        const tags = inspector.querySelector(".case-arch-tags");
        const dataIn = inspector.querySelector("[data-in]");
        const dataOut = inspector.querySelector("[data-out]");
        const names = (list) => list.map((id) => nodes.get(id).title.replace(/\n/g, " ")).join(" / ") || "None";
        let current = -1;

        function select(index, quiet)
          {
            index = (index + stages.length) % stages.length;
            if(index === current)
              return;
            current = index;
            const node = stages[index];
            buttons.forEach((button, i) => button.setAttribute("aria-pressed", String(i === index)));
            inkLayer.replaceChildren();
            for(const edge of edges)
              {
                const touches = edge.from === node.id || edge.to === node.id;
                edge.group.toggleAttribute("data-active", touches);
                if(touches && !quiet && !reduced())
                  el("path", { d: edge.d, class: "case-arch-ink", pathLength: "1" }, inkLayer);
              }
            typeLabel.textContent = KIND_LABEL[node.type] || KIND_LABEL.stage;
            heading.textContent = node.title.replace(/\n/g, " ");
            step.textContent = String(index + 1).padStart(2, "0");
            text.textContent = node.detail || "[TO FILL]";
            tags.replaceChildren(...(node.tags || []).map((tag) =>
              {
                const item = document.createElement("li");
                item.textContent = tag;
                return item;
              }));
            dataIn.textContent = names(edges.filter((edge) => edge.to === node.id).map((edge) => edge.from));
            dataOut.textContent = names(edges.filter((edge) => edge.from === node.id).map((edge) => edge.to));
            // On a narrow screen the drawing scrolls sideways; bring the stage in.
            const viewport = figure.querySelector(".case-arch-viewport");
            if(viewport.scrollWidth > viewport.clientWidth)
              {
                const scale = viewport.scrollWidth / width;
                viewport.scrollTo({ left: (node.x + node.w / 2) * scale - viewport.clientWidth / 2, behavior: quiet || reduced() ? "auto" : "smooth" });
              }
            if(!quiet && !reduced())
              {
                inspector.removeAttribute("data-swap");
                void inspector.offsetWidth;
                inspector.setAttribute("data-swap", "");
              }
          }

        inspector.querySelector("[data-total]").textContent = String(stages.length).padStart(2, "0");
        inspector.querySelector("[data-prev]").addEventListener("click", () => select(current - 1));
        inspector.querySelector("[data-next]").addEventListener("click", () => select(current + 1));
        const start = Math.max(0, stages.findIndex((node) => node.start));
        select(start, true);
      };

    /* ================================================================
       On this page: the section nearest the top of the reading area
       ================================================================ */
    const initContents = () =>
      {
        const links = [...document.querySelectorAll(".case-toc a[href^='#']")];
        const sections = links.map((link) => document.querySelector(link.getAttribute("href"))).filter(Boolean);
        if(!sections.length)
          return;
        const mark = () =>
          {
            const line = window.innerHeight * .35;
            let active = sections[0];
            for(const section of sections)
              if(section.getBoundingClientRect().top <= line)
                active = section;
            links.forEach((link) => link.toggleAttribute("aria-current", link.getAttribute("href") === `#${active.id}`));
          };
        let queued = false;
        window.addEventListener("scroll", () =>
          {
            if(queued)
              return;
            queued = true;
            requestAnimationFrame(() => { queued = false; mark(); });
          }, { passive: true });
        mark();
      };

    /* ================================================================
       Entrance: sections rise in once as they come into view
       ================================================================ */
    const initReveal = () =>
      {
        const items = document.querySelectorAll(".case-reveal");
        if(reduced() || !("IntersectionObserver" in window))
          return;
        document.querySelector(".case").classList.add("case-motion");
        const watch = new IntersectionObserver((entries) =>
          {
            for(const entry of entries)
              if(entry.isIntersecting)
                {
                  entry.target.classList.add("is-in");
                  watch.unobserve(entry.target);
                }
          }, { rootMargin: "0px 0px -12% 0px", threshold: .05 });
        items.forEach((item) => watch.observe(item));
      };

    document.querySelectorAll(".case-arch").forEach(initArchitecture);
    initContents();
    initReveal();
  })();
