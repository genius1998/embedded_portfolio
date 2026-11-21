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
      // Miner threads in a circular queue (front, size), drawn as 12 representative slots of the 100-slot queue.
      // add: pthread_create, then the thread enters at rear. del: the front thread is cancelled and joined first, then front moves.
      const N = 12, gap = 650, T = 17000, c = t % T, px = pointer.current.x, py = pointer.current.y;
      const order = "aaaaaddaaaddaaaadddddddd";
      const slots = Array.from({ length: N }, () => ({ born: -1, del: -1 }));
      let front = 0, size = 0, frontFrom = 0, frontAt = -1e9, rearFrom = 0, rearAt = -1e9;
      for (let e = 0; e < order.length; e++) {
        const at = 300 + e * gap;
        if (at > c) break;
        if (order[e] === "a") { const k = (front + size) % N; rearFrom = front + size; rearAt = at; slots[k] = { born: at, del: -1 }; size++; }
        else { slots[front].del = at; frontFrom = front; frontAt = at + 450; front = (front + 1) % N; size--; }
      }
      const ease = (u: number) => { const v = Math.min(1, Math.max(0, u)); return v * v * (3 - 2 * v); };
      const frontPos = frontFrom + ease((c - frontAt) / 200) * (((front - frontFrom) % N + N) % N);
      const rearPos = rearFrom + ease((c - rearAt) / 250);
      const narrow = w < 640;
      const cx = narrow ? w * 0.5 : w * 0.6, cy = narrow ? h * 0.7 : h * 0.55, R = Math.min(narrow ? w * 0.3 : w * 0.3, h * 0.44);
      const yaw = px * 0.35, pitch = 0.62 + py * 0.15;
      const P = (ang: number, r: number, y: number, size2: number, light: number) => {
        const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
        const xx = x * Math.cos(yaw) - z * Math.sin(yaw), zz = x * Math.sin(yaw) + z * Math.cos(yaw);
        const sy = zz * Math.cos(pitch) - y * Math.sin(pitch), depth = zz * Math.sin(pitch) + y * Math.cos(pitch), k = 3.4 / (3.4 + depth);
        put(cx + xx * R * k, cy + sy * R * k, size2 * k, light * (dark ? 2.5 : 2));
      };
      const angle = (k: number) => -Math.PI / 2 + (k / N) * Math.PI * 2;
      let active = 0;
      for (let k = 0; k < N; k++) {
        const { born, del } = slots[k];
        let light = 0.14, lift = 0;
        if (born >= 0 && born <= c) {
          const grow = ease((c - born) / 250), flash = Math.exp(-(c - born) / 350);
          light = 0.14 + grow * (0.45 + 0.12 * Math.sin(c * 0.011 + k * 1.7)) + 0.9 * flash; lift = 0.06 * flash; active++;
          if (del >= 0 && c >= del) {
            const d = c - del; active--;
            light = d < 250 ? 1.4 + 0.4 * Math.sin(d * 0.08) : 0.14 + 1.2 * Math.max(0, 1 - (d - 250) / 250);
          }
        }
        const a0 = angle(k);
        for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) {
          const ang = a0 + ((i - 2.5) / 6) * (Math.PI * 2 / N) * 0.78, r = 0.8 + j * 0.07;
          P(ang, r, lift, 3.6, light * (j === 0 || j === 3 ? 0.85 : 1));
        }
      }
      // front (del) and rear (add) pointers outside the ring
      const tick = (pos: number, r0: number, light: number) => { for (let i = 0; i < 7; i++) for (const o of [-0.035, 0, 0.035]) P(angle(pos) + o * (1 - i / 7), r0 + i * 0.045, 0, 3.8, light * (1 - i * 0.08)); };
      tick(frontPos, 1.12, 1.1);
      for (let i = 0; i < 4; i++) P(angle(rearPos), 1.12 + i * 0.045, 0, 2.6, 0.4);
      // shared coin counter: each running miner adds a coin every 0.1 s
      for (let i = 0; i < 90; i++) { const a = i * 2.39996, r = Math.sqrt(i / 90) * 0.3; P(a, r, 0, 3, 0.1 + Math.min(1, active / 8) * 0.45 * (0.5 + 0.5 * Math.sin(c * 0.02 - i * 0.5))); }
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
    <LightField scene={scene} label={`${project.name}의 추상 장식 그림`} still={project.art === "nand" ? 6200 : project.art === "signal" ? 9900 : 3600}>
      <div className={`art-fallback art-fallback-${project.art}`} aria-hidden="true"><i /><i /><i /></div>
      {project.artLabels.map((label, i) => <span className="art-label" key={i} style={{ "--i": i } as CSSProperties}><b className="num">{String(i + 1).padStart(2, "0")}</b>{label}</span>)}
    </LightField>
    {project.art === "signal" ? <figcaption><span className="num">CIRCULAR QUEUE / FRONT · REAR</span><span>add → rear에 넣기, del → front 채굴기 cancel·join 뒤 front 이동</span></figcaption> : project.art === "nand" ? <figcaption><span className="num">NAND.TXT / LBA 0–99</span><span>testapp1: 전체 쓰기 → 읽어서 비교 → PASS</span></figcaption> : <figcaption><span className="num">{project.art.toUpperCase()} / ABSTRACT STUDY</span><span>장식용 추상 그래픽</span></figcaption>}
  </figure>;
}
