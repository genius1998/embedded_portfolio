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
      // User App -> signals -> main loop (kicks the watchdog) -> miner threads; a hang stops the kicks and the watchdog resets.
      const T = 14000, c = t % T, s = Math.min(w / 2.9, h / 1.55), ox = w / 2 + pointer.current.x * 12, oy = h * 0.54 + pointer.current.y * 8;
      const P = (x: number, y: number, size: number, light: number) => put(ox + x * s, oy + y * s, size, light * (dark ? 2.4 : 1.1));
      const pulse = (dt: number, k = 300) => (dt < 0 ? 0 : Math.exp(-dt / k));
      const hangAt = 9000, resetAt = 11600;
      const sends = [800, 1700, 2600, 4400, 6200, 8400];
      // User App node
      const sendGlow = sends.reduce((g, at) => g + pulse(c - at, 250), 0);
      for (let i = 0; i < 140; i++) { const a = i * 2.39996, r = Math.sqrt(i / 140) * 0.14; P(-1.25 + r * Math.cos(a), r * Math.sin(a), 3.8, 0.5 + 0.6 * sendGlow); }
      // signal line and travelling pulses (add, add, add, del, show, hang)
      for (let i = 0; i <= 50; i++) { const x = -1.1 + i / 50 * 0.88; let light = 0.12; for (const at of sends) { const head = -1.1 + (c - at) / 700 * 0.88; const d = Math.abs(x - head); if (c > at && c < at + 900) light += 1.5 * Math.exp(-d * d / 0.004); } P(x, 0, 3.4, light); }
      // main loop ring; kicks pulse until the hang, then go dark until reset
      const alive = c < hangAt || c > resetAt;
      const kick = alive ? pulse((c % 500), 160) : 0;
      const resetFlash = pulse(c - resetAt, 500);
      for (let i = 0; i < 90; i++) { const a = i / 90 * Math.PI * 2; P(0.18 * Math.cos(a), 0.18 * Math.sin(a), 4, (alive ? 0.45 : 0.12) + 0.6 * kick + 1.2 * resetFlash); }
      // watchdog ring, dim normally, brightening while kicks are missing
      const starving = c > hangAt && c < resetAt ? (c - hangAt) / (resetAt - hangAt) : 0;
      for (let i = 0; i < 140; i++) { const a = i / 140 * Math.PI * 2; P(0.34 * Math.cos(a), 0.34 * Math.sin(a), 3, 0.12 + 0.9 * starving * (0.6 + 0.4 * Math.sin(c * 0.02)) + 0.9 * resetFlash); }
      // miner threads: 1 at boot, +3 adds, oldest removed by del, back to 1 after reset
      const born = [-1, 1700 + 700, 2600 + 700, 3500 + 700];
      const delAt = 4400 + 700;
      for (let m = 0; m < born.length; m++) {
        let on = c >= born[m] ? Math.min(1, (c - born[m]) / 300) : 0;
        if (m === 0 && c > delAt) on = Math.max(0, 1 - (c - delAt) / 400);
        if (m > 0 && c > resetAt) on = 0;
        if (m === 0 && c > resetAt) on = Math.min(1, (c - resetAt) / 400);
        if (on <= 0) continue;
        const cx = 0.62 + (m % 2) * 0.32, cy = -0.22 + Math.floor(m / 2) * 0.44;
        const work = alive || m === 0 ? 0.5 + 0.5 * Math.sin(c * 0.012 + m) : 0.4;
        for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) P(cx + (i - 2.5) * 0.034, cy + (j - 2.5) * 0.034, 3.8, on * (0.4 + 0.5 * work * ((i + j + Math.floor(c / 100)) % 5 === 0 ? 1 : 0.35)));
      }
      // main loop -> miners connector
      for (let i = 0; i <= 20; i++) P(0.36 + i / 20 * 0.2, 0, 3, 0.15);
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
  return <figure className="art-study" onPointerMove={(e) => { const b = e.currentTarget.getBoundingClientRect(); pointer.current = { x: (e.clientX - b.left) / b.width - 0.5, y: (e.clientY - b.top) / b.height - 0.5 }; }} onPointerLeave={() => { pointer.current = { x: 0, y: 0 }; }}>
    <LightField scene={scene} label={`${project.name}의 추상 장식 그림`} still={project.art === "nand" ? 6200 : project.art === "signal" ? 10500 : 3600}>
      <div className={`art-fallback art-fallback-${project.art}`} aria-hidden="true"><i /><i /><i /></div>
      {project.artLabels.map((label, i) => <span className="art-label" key={i} style={{ "--i": i } as CSSProperties}><b className="num">{String(i + 1).padStart(2, "0")}</b>{label}</span>)}
    </LightField>
    {project.art === "signal" ? <figcaption><span className="num">SIGNAL / THREADS / WATCHDOG</span><span>add·del 시그널 → 채굴기 스레드 증감, hang → 워치독 재시작</span></figcaption> : project.art === "nand" ? <figcaption><span className="num">NAND.TXT / LBA 0–99</span><span>testapp1: 전체 쓰기 → 읽어서 비교 → PASS</span></figcaption> : <figcaption><span className="num">{project.art.toUpperCase()} / ABSTRACT STUDY</span><span>장식용 추상 그래픽</span></figcaption>}
  </figure>;
}
