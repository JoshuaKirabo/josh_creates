'use strict';

// A small kit of solids in a -1..1 space, y up and +z toward the viewer.
// Each lays points over its skin `gap` apart with the skin's outward normal,
// and can tell whether a point lies inside it, so where solids overlap only
// the outer skin of the whole is kept.
function craftKit(gap)
  {
    const points = [];
    const solids = [];
    const solid = (inside) =>
      {
        solids.push(inside);
        return solids.length - 1;
      };
    // A tag rides with each point for forms that move once built: which gear
    // it belongs to, or how far round a loop it sits. A function works it
    // out from the point.
    const put = (owner, x, y, z, nx, ny, nz) => points.push([x, y, z, nx, ny, nz, owner, typeof kit.tag === 'function' ? kit.tag(x, y, z) : kit.tag]);
    const along = (length) => Math.max(1, Math.round(length / gap));
    // A flat patch: a centre, two unit axes and their half-lengths.
    const patch = (owner, [cx, cy, cz], u, v, hu, hv, n) =>
      {
        const cu = along(hu * 2);
        const cv = along(hv * 2);
        for(let i = 0; i < cu; i++)
          {
            for(let j = 0; j < cv; j++)
              {
                const a = ((i + .5) / cu * 2 - 1) * hu;
                const b = ((j + .5) / cv * 2 - 1) * hv;
                put(owner, cx + u[0] * a + v[0] * b, cy + u[1] * a + v[1] * b, cz + u[2] * a + v[2] * b, ...n);
              }
          }
      };
    // Points on a sphere by the golden angle, so they sit evenly with no seams.
    const golden = Math.PI * (3 - Math.sqrt(5));
    const kit =
      {
        tag: -1,
        box(cx, cy, cz, hx, hy, hz)
          {
            const owner = solid((x, y, z, e) => Math.abs(x - cx) < hx - e && Math.abs(y - cy) < hy - e && Math.abs(z - cz) < hz - e);
            const X = [1, 0, 0], Y = [0, 1, 0], Z = [0, 0, 1];
            patch(owner, [cx, cy, cz + hz], X, Y, hx, hy, [0, 0, 1]);
            patch(owner, [cx, cy, cz - hz], X, Y, hx, hy, [0, 0, -1]);
            patch(owner, [cx, cy + hy, cz], X, Z, hx, hz, [0, 1, 0]);
            patch(owner, [cx, cy - hy, cz], X, Z, hx, hz, [0, -1, 0]);
            patch(owner, [cx + hx, cy, cz], Y, Z, hy, hz, [1, 0, 0]);
            patch(owner, [cx - hx, cy, cz], Y, Z, hy, hz, [-1, 0, 0]);
          },
        // A hollow sphere is only a shell of points, `spread` times the usual
        // spacing apart, and hides nothing inside it.
        sphere(cx, cy, cz, r, hollow = false, spread = 1)
          {
            const owner = solid((x, y, z, e) => !hollow && Math.hypot(x - cx, y - cy, z - cz) < r - e);
            const count = Math.max(6, Math.round(4 * Math.PI * r * r / (gap * spread) ** 2));
            for(let i = 0; i < count; i++)
              {
                const ny = 1 - (i + .5) / count * 2;
                const ring = Math.sqrt(1 - ny * ny);
                const nx = Math.cos(i * golden) * ring;
                const nz = Math.sin(i * golden) * ring;
                put(owner, cx + nx * r, cy + ny * r, cz + nz * r, nx, ny, nz);
              }
          },
        // A disc standing on the y axis, with both lids.
        cylinder(cx, cy, cz, r, h)
          {
            const owner = solid((x, y, z, e) => Math.hypot(x - cx, z - cz) < r - e && Math.abs(y - cy) < h / 2 - e);
            const rows = along(h);
            const round = Math.max(8, Math.round(2 * Math.PI * r / gap));
            for(let j = 0; j < rows; j++)
              {
                for(let i = 0; i < round; i++)
                  {
                    const a = (i + (j % 2) * .5) / round * Math.PI * 2;
                    put(owner, cx + Math.cos(a) * r, cy - h / 2 + (j + .5) / rows * h, cz + Math.sin(a) * r, Math.cos(a), 0, Math.sin(a));
                  }
              }
            const lid = Math.max(4, Math.round(Math.PI * r * r / (gap * gap)));
            [1, -1].forEach((side) =>
              {
                for(let i = 0; i < lid; i++)
                  {
                    const d = Math.sqrt((i + .5) / lid) * r;
                    put(owner, cx + Math.cos(i * golden) * d, cy + side * h / 2, cz + Math.sin(i * golden) * d, 0, side, 0);
                  }
              });
          },
        // A tube of radius r along a path of [x, y, z] points, rounded at its
        // ends and corners. A closed path loops back to its start.
        tube(path, r, closed = false)
          {
            const nodes = closed ? [...path, path[0]] : path;
            const lines = nodes.slice(1).map((end, i) => [nodes[i], end]);
            const near = (x, y, z) => Math.min(...lines.map(([a, b]) =>
              {
                const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
                const t = Math.max(0, Math.min(1, ((x - a[0]) * d[0] + (y - a[1]) * d[1] + (z - a[2]) * d[2]) / (d[0] ** 2 + d[1] ** 2 + d[2] ** 2 || 1)));
                return Math.hypot(x - a[0] - d[0] * t, y - a[1] - d[1] * t, z - a[2] - d[2] * t);
              }));
            const owner = solid((x, y, z, e) => near(x, y, z) < r - e);
            const round = Math.max(6, Math.round(2 * Math.PI * r / gap));
            let ring = 0;
            lines.forEach(([a, b]) =>
              {
                const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
                const length = Math.hypot(...d);
                const t = d.map(c => c / length);
                // Two axes across the tube, square to its direction.
                const up = Math.abs(t[2]) > .9 ? [0, 1, 0] : [0, 0, 1];
                let u = [t[1] * up[2] - t[2] * up[1], t[2] * up[0] - t[0] * up[2], t[0] * up[1] - t[1] * up[0]];
                const lu = Math.hypot(...u);
                u = u.map(c => c / lu);
                const v = [t[1] * u[2] - t[2] * u[1], t[2] * u[0] - t[0] * u[2], t[0] * u[1] - t[1] * u[0]];
                const steps = Math.max(1, Math.round(length / gap));
                for(let s = 0; s < steps; s++, ring++)
                  {
                    const f = (s + .5) / steps;
                    for(let i = 0; i < round; i++)
                      {
                        const turn = (i + (ring % 2) * .5) / round * Math.PI * 2;
                        const n = [0, 1, 2].map(k => u[k] * Math.cos(turn) + v[k] * Math.sin(turn));
                        put(owner, a[0] + d[0] * f + n[0] * r, a[1] + d[1] * f + n[1] * r, a[2] + d[2] * f + n[2] * r, ...n);
                      }
                  }
              });
            // Corners are rounded off; only a few long, straight tubes need them.
            if(nodes.length < 12) (closed ? path : nodes).forEach(([x, y, z]) => kit.sphere(x, y, z, r));
          },
        // A flat outline pushed out to a depth: `loops` are its edges as closed
        // [x, y] lists, `inside` says whether a point of the face is solid.
        slab(cx, cy, cz, depth, loops, inside)
          {
            const owner = solid((x, y, z, e) => Math.abs(z - cz) < depth / 2 - e && inside(x - cx, y - cy));
            const xs = loops.flat().map(p => p[0]);
            const ys = loops.flat().map(p => p[1]);

            for(let x = Math.min(...xs) + gap / 2; x < Math.max(...xs); x += gap)
              {
                for(let y = Math.min(...ys) + gap / 2; y < Math.max(...ys); y += gap)
                  {
                    if(!inside(x, y)) continue;
                    put(owner, cx + x, cy + y, cz + depth / 2, 0, 0, 1);
                    put(owner, cx + x, cy + y, cz - depth / 2, 0, 0, -1);
                  }
              }

            const rows = along(depth);
            loops.forEach((loop) =>
              {
                loop.forEach(([ax, ay], i) =>
                  {
                    const [bx, by] = loop[(i + 1) % loop.length];
                    const length = Math.hypot(bx - ax, by - ay);
                    let nx = (by - ay) / length, ny = -(bx - ax) / length;
                    const mx = (ax + bx) / 2, my = (ay + by) / 2;
                    // The normal points out of the solid, whichever way the loop runs.
                    if(inside(mx + nx * gap * .3, my + ny * gap * .3))
                      {
                        nx = -nx;
                        ny = -ny;
                      }
                    const steps = Math.max(1, Math.round(length / gap));
                    for(let s = 0; s < steps; s++)
                      {
                        for(let j = 0; j < rows; j++)
                          {
                            const f = (s + .5) / steps;
                            put(owner, cx + ax + (bx - ax) * f, cy + ay + (by - ay) * f, cz - depth / 2 + (j + .5) / rows * depth, nx, ny, 0);
                          }
                      }
                  });
              });
          },
        // Only the outer skin: points buried inside another solid are dropped.
        skin()
          {
            const e = gap * .3;
            return points.filter(([x, y, z, , , , owner]) => !solids.some((inside, k) => k !== owner && inside(x, y, z, e)));
          }
      };
    return kit;
  }

// A rounded rectangle as a closed path, flat at depth z, for kit.tube.
function craftRoundRect(cx, cy, z, hw, hh, r, steps = 6)
  {
    const path = [];
    [[hw - r, hh - r, 0], [-hw + r, hh - r, Math.PI / 2], [-hw + r, -hh + r, Math.PI], [hw - r, -hh + r, Math.PI * 1.5]].forEach(([ox, oy, from]) =>
      {
        for(let i = 0; i <= steps; i++)
          {
            const a = from + i / steps * Math.PI / 2;
            path.push([cx + ox + Math.cos(a) * r, cy + oy + Math.sin(a) * r, z]);
          }
      });
    return path;
  }

// Automation's gears as centre x, centre y and how fast each turns. The
// small one has seven teeth to the large one's ten, so it runs 10/7 as fast
// the other way and the teeth stay meshed.
const CRAFT_GEARS = [[-.28, -.18, .5], [.5, .44, -.5 * 10 / 7]];

// A tag for points along an open path: `base` plus how far along it, 0 to
// just under 1, the nearest point of the path sits.
function craftAlong(path, base)
  {
    const parts = path.slice(1).map((end, i) => [path[i], end, Math.hypot(end[0] - path[i][0], end[1] - path[i][1], end[2] - path[i][2])]);
    const total = parts.reduce((sum, part) => sum + part[2], 0);
    return (x, y, z) =>
      {
        let best = Infinity, at = 0, before = 0;
        parts.forEach(([a, b, length]) =>
          {
            const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
            const t = Math.max(0, Math.min(1, ((x - a[0]) * d[0] + (y - a[1]) * d[1] + (z - a[2]) * d[2]) / (length * length)));
            const gap = Math.hypot(x - a[0] - d[0] * t, y - a[1] - d[1] * t, z - a[2] - d[2] * t);
            if(gap < best)
              {
                best = gap;
                at = before + t * length;
              }
            before += length;
          });
        return base + .999 * at / total;
      };
  }

const CRAFT_FORMS =
  {
    // A browser window drawn in tubes: its frame, the bar with its three
    // lights, a heading and a line of text, then three cards floating forward
    // and a pointer in front of them all, clicking the last. The window is
    // wider than the other solids, so the whole of it is drawn at `k`.
    frontend(kit)
      {
        const k = .78;
        const tube = (path, r, closed) => kit.tube(path.map(p => p.map(c => c * k)), r * k, closed);
        tube(craftRoundRect(0, .06, 0, .94, .7, .12), .045, true);
        tube([[-.94, .5, 0], [.94, .5, 0]], .03);
        [-.78, -.64, -.5].forEach(x => kit.sphere(x * k, .63 * k, 0, .045 * k));
        tube([[-.66, .3, .16], [.1, .3, .16]], .05);
        tube([[-.66, .14, .16], [.34, .14, .16]], .028);
        [-.46, 0, .46].forEach((x) =>
          {
            kit.tag = x > 0 ? 2 : -1;
            tube(craftRoundRect(x, -.3, .28, .17, .2, .05, 3), .03, true);
          });
        // The pointer and the card it clicks are tagged for the click; see
        // craftClick and craftGlow.
        kit.tag = 1;
        const pointer = [[0, 0], [0, -.5], [.12, -.38], [.21, -.56], [.29, -.52], [.2, -.35], [.36, -.35], [0, 0]];
        tube(pointer.map(([x, y]) => [.5 + x, -.2 + y, .52]), .04);
      },
    // Code: the APIs behind the page, as a pair of brackets and a slash.
    backend(kit)
      {
        kit.tube([[-.28, .46, 0], [-.72, 0, 0], [-.28, -.46, 0]], .09);
        kit.tube([[.28, .46, 0], [.72, 0, 0], [.28, -.46, 0]], .09);
        kit.tube([[.14, .58, 0], [-.14, -.58, 0]], .09);
      },
    // A database as a solid stack: three thick discs with a sliver of air
    // between them, so the lid of each one below catches the light, and a
    // status light set into the front of each. The discs know how far down
    // the stack they sit, 0 at the top, for the query that runs down it; the
    // lights are tagged 2, 3 and 4 from the top.
    database(kit)
      {
        [.5, 0, -.5].forEach((y, i) =>
          {
            kit.tag = (x, py) => Math.min(1, Math.max(0, (.68 - py) / 1.36));
            kit.cylinder(0, y, 0, .7, .36);
            kit.tag = 2 + i;
            kit.sphere(.4, y, .57, .06);
          });
      },

    // AI as a chip: the package and its pins, the die raised off it, and the
    // letters AI standing in front. For its beat, input comes in on the left
    // and top pins, closes in on the die, the letters are written stroke by
    // stroke and the answer leaves by the right and bottom pins; see
    // craftGlow. Input pins are tagged 200 plus their number, output pins 210
    // plus theirs, strokes 400 plus theirs, each plus how far along it a
    // point sits in the direction the signal runs. The package and die are
    // tagged 3 to 4 from the outside in.
    ai(kit)
      {
        kit.tag = (x, y) => 3 + .999 * Math.min(1, Math.max(0, (.6 - Math.max(Math.abs(x), Math.abs(y))) / .25));
        kit.tube(craftRoundRect(0, 0, 0, .56, .56, .1), .045, true);
        const pin = (base, from, to) =>
          {
            kit.tag = craftAlong([from, to], base);
            kit.tube([from, to], .035);
          };
        [-.33, -.11, .11, .33].forEach((p, i) =>
          {
            pin(200 + i, [-.8, -p, 0], [-.6, -p, 0]);
            pin(204 + i, [p, .8, 0], [p, .6, 0]);
            pin(210 + i, [.6, -p, 0], [.8, -p, 0]);
            pin(214 + i, [p, -.6, 0], [p, -.8, 0]);
          });
        kit.tag = (x, y) => 3 + .999 * Math.min(1, Math.max(0, (.6 - Math.max(Math.abs(x), Math.abs(y))) / .25));
        kit.tube(craftRoundRect(0, 0, .14, .38, .38, .06), .03, true);
        const z = .3;
        [
          [[[-.25, -.2, z], [-.12, .2, z], [.01, -.2, z]], .05],
          [[[-.2, -.06, z], [-.04, -.06, z]], .045],
          [[[.08, .2, z], [.26, .2, z]], .045],
          [[[.17, .2, z], [.17, -.2, z]], .05],
          [[[.08, -.2, z], [.26, -.2, z]], .045]
        ].forEach(([path, r], stroke) =>
          {
            kit.tag = craftAlong(path, 400 + stroke);
            kit.tube(path, r);
          });
        kit.tag = -1;
      },
    // A small neural network: three layers of nodes set round in depth, every
    // node wired to each one in the next layer.
    ml(kit)
      {
        const layers = [[-.74, 3, .46], [0, 4, .6], [.74, 2, .32]].map(([x, count, spread]) =>
          Array.from({ length: count }, (_, i) =>
            {
              const a = i / count * Math.PI * 2 + (count === 4 ? Math.PI / 4 : Math.PI / 2);
              return [x, Math.sin(a) * spread, Math.cos(a) * spread];
            }));
        // Signals travel the graph node to node; see CRAFT_ROUTES. Each node is
        // tagged 10 plus its number, inputs first. Each wire is tagged 100 plus
        // its number, plus how far along it a point sits from its input end.
        layers.flat().forEach(([x, y, z], n) =>
          {
            kit.tag = 10 + n;
            kit.sphere(x, y, z, .11);
          });
        let wire = 0;
        layers.slice(0, -1).forEach((layer, l) => layer.forEach(a => layers[l + 1].forEach((b) =>
          {
            const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
            const length = d[0] ** 2 + d[1] ** 2 + d[2] ** 2;
            const base = 100 + wire++;
            kit.tag = (x, y, z) => base + .999 * Math.min(1, Math.max(0, ((x - a[0]) * d[0] + (y - a[1]) * d[1] + (z - a[2]) * d[2]) / length));
            kit.tube([a, b], .016);
          })));
      },
    // A cloud as a thick slab with a rounded rim, held in a glass globe of
    // sparse points that turns slowly round it once built. The globe is kept
    // smaller than the other solids: its near side swells in perspective, and
    // it needs air above and below it in the field.
    cloud(kit)
      {
        const k = .64;
        const puffs = [[-.36, -.14, .24], [.02, .08, .34], [.38, -.1, .25]];
        const inside = (x, y) => puffs.some(([px, py, r]) => Math.hypot(x - px, y - py) < r) || (x > -.36 && x < .38 && y > -.38 && y < -.14);
        // The outline, found by walking out from the middle along each bearing.
        const loop = Array.from({ length: 144 }, (_, i) =>
          {
            const a = i / 144 * Math.PI * 2;
            let lo = 0, hi = 1;
            for(let n = 0; n < 20; n++)
              {
                const mid = (lo + hi) / 2;
                if(inside(Math.cos(a) * mid, -.08 + Math.sin(a) * mid)) lo = mid; else hi = mid;
              }
            return [Math.cos(a) * lo * k, (-.08 + Math.sin(a) * lo) * k];
          });
        kit.slab(0, 0, 0, .18, [loop], (x, y) => inside(x / k, y / k));
        [.09, -.09].forEach(z => kit.tube(loop.map(([x, y]) => [x, y, z]), .045, true));
        kit.tag = 0;
        kit.sphere(0, 0, 0, .72, true, 2.2);
        kit.tag = -1;
      },
    // DevOps' endless loop in two halves, each running into an arrowhead at
    // the top of its lobe where it hands over to the other. The halves pass
    // one in front of the other where they cross.
    devops(kit)
      {
        const at = (t) =>
          {
            const d = 1 + Math.sin(t) ** 2;
            return [.95 * Math.cos(t) / d, .95 * Math.sin(t) * Math.cos(t) / d, .16 * Math.sin(t)];
          };
        const gap = .22;
        // Each point knows how far round the loop it sits, 0 to 1, for the
        // pulse that runs through it.
        const samples = Array.from({ length: 96 }, (_, i) =>
          {
            const half = i < 48 ? .62 : Math.PI + .62;
            const t = half + gap / 2 + (Math.PI - gap) * (i % 48) / 47;
            return [...at(t), t];
          });
        kit.tag = (x, y, z) =>
          {
            let best = samples[0], near = Infinity;
            samples.forEach((sample) =>
              {
                const d = (sample[0] - x) ** 2 + (sample[1] - y) ** 2 + (sample[2] - z) ** 2;
                if(d < near)
                  {
                    near = d;
                    best = sample;
                  }
              });
            return ((best[3] - .62 - gap / 2) / (Math.PI * 2) + 1) % 1;
          };
        [.62, Math.PI + .62].forEach((start) =>
          {
            const from = start + gap / 2;
            const to = start + Math.PI - gap / 2;
            kit.tube(Array.from({ length: 49 }, (_, i) => at(from + (to - from) * i / 48)), .05);
            const [px, py, pz] = at(to);
            const [qx, qy] = at(to - .02);
            const length = Math.hypot(px - qx, py - qy);
            const tx = (px - qx) / length, ty = (py - qy) / length;
            const wing = side => [px - tx * .22 + ty * side * .19, py - ty * .22 - tx * side * .19, pz];
            kit.tube([wing(1), [px + tx * .06, py + ty * .06, pz], wing(-1)], .05);
          });
      },
    // Two meshed gears with depth, the small one set a little behind. They
    // turn once built; see CRAFT_GEARS.
    automation(kit)
      {
        const gear = (cx, cy, cz, outer, inner, teeth, turn, hole) =>
          {
            const rim = Array.from({ length: teeth * 4 }, (_, i) =>
              {
                const a = turn + i / (teeth * 4) * Math.PI * 2;
                const r = i % 4 < 2 ? outer : inner;
                return [Math.cos(a) * r, Math.sin(a) * r];
              });
            const bore = Array.from({ length: 28 }, (_, i) => [Math.cos(i / 28 * Math.PI * 2) * hole, Math.sin(i / 28 * Math.PI * 2) * hole]);
            const inside = (x, y) =>
              {
                if(Math.hypot(x, y) < hole) return false;
                let within = false;
                rim.forEach(([ax, ay], i) =>
                  {
                    const [bx, by] = rim[(i + 1) % rim.length];
                    if((ay > y) !== (by > y) && x < ax + (y - ay) / (by - ay) * (bx - ax)) within = !within;
                  });
                return within;
              };
            kit.slab(cx, cy, cz, .2, [rim, bore], inside);
          };
        kit.tag = 0;
        gear(...CRAFT_GEARS[0].slice(0, 2), 0, .62, .5, 10, 0, .24);
        kit.tag = 1;
        gear(...CRAFT_GEARS[1].slice(0, 2), -.12, .38, .3, 7, .22, .13);
      },
    // A server rack: three units, each with two lights and a vent. The six
    // lights are tagged 0 to 5 so each can blink on its own.
    server(kit)
      {
        [.46, 0, -.46].forEach((y, i) =>
          {
            kit.box(0, y, 0, .7, .16, .44);
            [-.5, -.34].forEach((x, j) =>
              {
                kit.tag = i * 2 + j;
                kit.sphere(x, y, .45, .06);
                kit.tag = -1;
              });
            kit.tube([[-.1, y, .46], [.5, y, .46]], .03);
          });
      }
  };

// Builds a form as exactly `count` points, each with its normal and tag, as
// a flat run of x, y, z, nx, ny, nz, tag. The spacing is tuned until the skin holds
// about that many; the last few are then dropped or doubled evenly.
function buildCraftForm(name, count)
  {
    let gap = .05;
    let found = [];
    for(let pass = 0; pass < 5; pass++)
      {
        const kit = craftKit(gap);
        CRAFT_FORMS[name](kit);
        found = kit.skin();
        if(Math.abs(found.length - count) < count * .01) break;
        gap *= Math.sqrt(found.length / count);
      }
    const form = new Float32Array(count * 7);
    for(let i = 0; i < count; i++)
      {
        const point = found[Math.floor(i * found.length / count)];
        for(let a = 0; a < 6; a++) form[i * 7 + a] = point[a];
        form[i * 7 + 6] = point[7];
      }
    return form;
  }

// The page uses the same geometry for its desktop renderer. Phones transfer each
// finished array from a worker so the next discipline can be drawn while the
// remaining forms are still being prepared.
if(typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope)
  {
    self.onmessage = ({ data: count }) =>
      {
        for(const name of Object.keys(CRAFT_FORMS))
          {
            const points = buildCraftForm(name, count);
            self.postMessage({ name, points }, [points.buffer]);
          }
        self.close();
      };
  }
