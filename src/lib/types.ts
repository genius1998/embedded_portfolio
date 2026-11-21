export type PublicLink = { label: string; url: string };
export type RecordEntry = { title: string; period: string; description: string };
export type SubSection = { title: string; body: string; image?: string; imageAlt?: string };
export type Section = SubSection & { subsections?: SubSection[] };
export type Project = {
  id: string; name: string; category: string; period: string; role: string;
  title: string; accent: string; summary: string; stack: string[]; links: PublicLink[];
  image: string; imageAlt: string; art: "orbit" | "layers" | "flow" | "nand" | "signal" | "quantization" | "none";
  artLabels: string[]; sections: Section[];
};
export type SubProject = {
  id: string; name: string; category: string; period: string; summary: string;
  stack: string[]; links: PublicLink[]; image: string; imageAlt: string; sections: Section[];
};
export type PortfolioData = {
  site: { title: string; description: string; example: boolean };
  profile: {
    name: string; role: string; intro: string; fields: string[]; links: PublicLink[];
    experiences: RecordEntry[]; education: RecordEntry[];
  };
  projects: Project[];
  others: SubProject[];
  skills: { name: string; usage: string }[];
  writing: { title: string; summary: string; url: string }[];
};
