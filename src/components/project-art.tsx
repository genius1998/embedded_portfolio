"use client";

import { useRef, type CSSProperties } from "react";
import { LightField, type Scene } from "./light-field";
import type { Project } from "@/lib/types";
import { sitePath } from "@/lib/content";
import { QuantizationArt } from "./quantization-art";

// Decorative abstract studies, not measured data or a claim about a project's architecture.
// The brightness palette and additive point light are shared by all three studies.
export function ProjectArt({ project }: { project: Project }) {
  const pointer = useRef({ x: 0, y: 0 });
  const scene: Scene = (put, t, w, h, dark) => {
    const turn = t * 0.00009 + pointer.current.x * 0.3, tilt = -0.55 + pointer.current.y * 0.18;
    const scale = Math.min(w * 0.36, h * 0.43);
    const draw = (x: number, y: number, z: number, light: number, size = 4) => {
      const xx = x * Math.cos(turn) - z * Math.sin(turn), zz = x * Math.sin(turn) + z * Math.cos(turn);
      const yy = y * Math.cos(tilt) - zz * Math.sin(tilt), depth = y * Math.sin(tilt) + zz * Math.cos(tilt);
      const perspective = 3.6 / (3.6 + depth);
      put(w / 2 + xx * scale * perspective, h / 2 + yy * scale * perspective, size * perspective, light * (dark ? 2.5 : 1) * (0.7 + (1 - depth) * 0.15));
    };
    if (project.art === "nand") {
      // nand.txt as LBA 0~99 on a 10x10 plane: testapp1 writes every cell in order, reads each back to compare, then holds PASS.
      const cycle = t % 10000, px = pointer.current.x, py = pointer.current.y;
      const yaw = -0.62 + px * 0.25, pitch = 0.95 + py * 0.15, s = Math.min(w * 0.36, h * 0.5);
      const project3 = (x: number, z: number) => {
        const xx = x * Math.cos(yaw) - z * Math.sin(yaw), zz = x * Math.sin(yaw) + z * Math.cos(yaw);
        const yy = zz * Math.cos(pitch), depth = zz * Math.sin(pitch), k = 3.2 / (3.2 + depth);
        return [w / 2 + xx * s * k, h * 0.56 + yy * s * k, k] as const;
      };
      const pulse = (dt: number) => (dt < 0 ? 0 : Math.exp(-dt / 260));
      for (let lba = 0; lba < 100; lba++) {
        const row = Math.floor(lba / 10), col = lba % 10;
        const written = 300 + lba * 40, checked = 4900 + lba * 30;
        let light = 0.06;
        if (cycle >= written) light = 0.3 + 0.7 * pulse(cycle - written);
        if (cycle >= checked) light = 0.55 + 0.45 * pulse(cycle - checked);
        if (cycle >= 8200) light = 0.6 + 0.12 * Math.sin((cycle - 8200) * 0.006);
        if (cycle >= 9300) light = 0.06 + 0.6 * (1 - (cycle - 9300) / 700);
        for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
          const x = (col - 4.5) * 0.17 + (i - 2) * 0.026, z = (row - 4.5) * 0.17 + (j - 2) * 0.026;
          const [sx, sy, k] = project3(x, z);
          put(sx, sy, 4.2 * k, light * (dark ? 2.6 : 1.15));
        }
      }
      return;
    }
    if (project.art === "signal") {
      // Logic analyzer view, newest sample at the right: SIGRTMIN command pulses, main-loop kicks, and the watchdog counter.
      // The hang command stops the kicks, the counter climbs to the timeout, a reset marker drops and the kicks start again.
      const T = 12000, span = 7000 * Math.min(1, Math.max(0.5, w / 900)), x0 = w * 0.05, x1 = w * 0.97, step = 3.5;
      const sends = [500, 1400, 2300, 4100, 5900, 7400], hangAt = 7600, resetAt = 9600, backAt = 10000, timeout = resetAt - hangAt;
      const L = (v: number) => v * (dark ? 2.4 : 1.9);
      const phase = (tau: number) => ((tau % T) + T) % T;
      const alive = (f: number) => f < hangAt || f >= backAt;
      const sig = (f: number) => (sends.some((at) => f >= at && f < at + 170) ? 1 : 0);
      const kick = (f: number) => (alive(f) && f % 400 < 70 ? 1 : 0);
      const wdt = (f: number) => (f >= hangAt && f < resetAt ? (f - hangAt + 30) / timeout : f >= resetAt && f < backAt ? 0 : (f % 400) / timeout);
      const lanes = [{ fn: sig, digital: true }, { fn: kick, digital: true }, { fn: wdt, digital: false }];
      const amp = h * 0.11;
      const timeAt = (x: number) => t - (1 - (x - x0) / (x1 - x0)) * span;
      const xAt = (tau: number) => x0 + (1 - (t - tau) / span) * (x1 - x0);
      // faint time grid, one division per second, scrolling with the trace
      for (let g = Math.ceil((t - span) / 1000) * 1000; g <= t; g += 1000) { const gx = xAt(g); for (let y = h * 0.12; y < h * 0.9; y += 7) put(gx, y, 2, L(0.045)); }
      lanes.forEach(({ fn, digital }, i) => {
        const base = h * (0.33 + i * 0.25);
        if (!digital) for (let x = x0; x <= x1; x += 7) put(x, base - amp, 2.2, L(0.14)); // timeout threshold
        let prev = -1;
        for (let x = x0; x <= x1; x += step) {
          const f = phase(timeAt(x)), v = Math.min(1, fn(f)), y = base - v * amp;
          const fresh = Math.exp(-(x1 - x) / (w * 0.04));
          const light = (digital ? 0.32 + 0.6 * v : 0.36 + 0.5 * v) + 0.6 * fresh;
          if (prev >= 0 && Math.abs(prev - y) > step) { const lo = Math.min(prev, y), hi = Math.max(prev, y); for (let yy = lo + step; yy < hi; yy += step) put(x, yy, 3, L(light * 0.85)); }
          put(x, y, 3.4, L(light));
          prev = y;
        }
      });
      // reset marker across every lane where the counter hits the timeout
      for (let k = Math.floor((t - span) / T); k <= Math.floor(t / T); k++) {
        const at = k * T + resetAt, rx = xAt(at);
        if (rx < x0 || rx > x1) continue;
        const flash = Math.exp(-Math.max(0, t - at) / 700);
        for (let y = h * 0.1; y < h * 0.9; y += 5) put(rx, y, 3, L(0.35 + 1.1 * flash));
      }
      return;
    }
    if (project.art === "orbit") {
      for (let ring = 0; ring < 9; ring++) for (let i = 0; i < 210; i++) {
        const a = i / 210 * Math.PI * 2, r = 0.85 + ring * 0.016;
        const glow = 0.2 + 0.65 * Math.pow((1 + Math.cos(a - t * 0.0005)) / 2, 8);
        draw(r * Math.cos(a), (ring - 4) * 0.03, r * Math.sin(a), glow, 4.2);
      }
      for (let i = 0; i < 180; i++) { const a = i * 2.39996, r = Math.sqrt(i / 180) * 0.23; draw(r * Math.cos(a), r * Math.sin(a), Math.sin(a) * 0.12, 0.32, 3.4); }
    } else if (project.art === "layers") {
      for (let layer = 0; layer < 3; layer++) for (let i = 0; i < 42; i++) for (let j = 0; j < 28; j++) {
        const x = i / 41 * 1.8 - 0.9, z = j / 27 * 1.25 - 0.625;
        const edge = i === 0 || i === 41 || j === 0 || j === 27;
        draw(x, (layer - 1) * 0.46, z, edge ? 0.65 : 0.055 + 0.11 * (1 + Math.sin(i * 0.3 + j * 0.2 + t * 0.0007)) / 2, edge ? 4 : 2.6);
      }
    } else {
      for (let stream = 0; stream < 18; stream++) for (let i = 0; i < 150; i++) {
        const x = i / 149 * 2.8 - 1.4;
        const y = Math.sin(x * 2.5 + stream * 0.09 + t * 0.00035) * 0.26 + (stream - 8.5) * 0.018;
        draw(x, y, (stream - 8.5) * 0.032, 0.1 + 0.45 * Math.pow((1 + Math.cos(x * 3 - t * 0.001)) / 2, 8), 3.7);
      }
    }
  };
  if (project.image) return <figure className="project-image"><img src={sitePath(project.image)} alt={project.imageAlt} /><figcaption>{project.imageAlt}</figcaption></figure>;
  if (project.art === "quantization") return <QuantizationArt />;
  if (project.art === "none") return <div className="art-blank" aria-hidden="true"><span>{project.name}</span></div>;
  return <figure className={`art-study art-study-${project.art}`} onPointerMove={(e) => { const b = e.currentTarget.getBoundingClientRect(); pointer.current = { x: (e.clientX - b.left) / b.width - 0.5, y: (e.clientY - b.top) / b.height - 0.5 }; }} onPointerLeave={() => { pointer.current = { x: 0, y: 0 }; }}>
    <LightField scene={scene} label={`${project.name}의 추상 장식 그림`} still={project.art === "nand" ? 6200 : project.art === "signal" ? 11000 : 3600}>
      <div className={`art-fallback art-fallback-${project.art}`} aria-hidden="true"><i /><i /><i /></div>
      {project.artLabels.map((label, i) => <span className="art-label" key={i} style={{ "--i": i } as CSSProperties}><b className="num">{String(i + 1).padStart(2, "0")}</b>{label}</span>)}
    </LightField>
    {project.art === "signal" ? <figcaption><span className="num">LOGIC ANALYZER / 3 CH</span><span>hang 명령 → kick 중단 → 워치독 타임아웃 → 재시작</span></figcaption> : project.art === "nand" ? <figcaption><span className="num">NAND.TXT / LBA 0–99</span><span>testapp1: 전체 쓰기 → 읽어서 비교 → PASS</span></figcaption> : <figcaption><span className="num">{project.art.toUpperCase()} / ABSTRACT STUDY</span><span>장식용 추상 그래픽</span></figcaption>}
  </figure>;
}
