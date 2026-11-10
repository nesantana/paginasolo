/**
 * Conflitos e avisos da agenda. Funções puras: o formulário (navegador) e a API (servidor)
 * usam as mesmas regras. Os avisos nunca travam: a pessoa pode salvar mesmo assim.
 */
export type Slot = {
  id?: string;
  customer_name: string;
  starts_on: string; // YYYY-MM-DD
  start_time: string | null; // "HH:MM" ou "HH:MM:SS"
  duration_min: number;
  status?: string;
};

export const DURATIONS = [
  { min: 30, label: "30 min" },
  { min: 60, label: "1 hora" },
  { min: 120, label: "2 horas" },
  { min: 180, label: "3 horas" },
  { min: 240, label: "Meio período (4 h)" },
  { min: 480, label: "Dia todo (8 h)" },
];

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const pad = (n: number) => String(n).padStart(2, "0");
export const hhmm = (t: string | null) => (t ? t.slice(0, 5) : "");

/** "08:00" + 90 min → "09:30" (passa de meia-noite? corta em 23:59). */
export function endTime(start: string, durationMin: number): string {
  const end = Math.min(toMin(start) + durationMin, 23 * 60 + 59);
  return `${pad(Math.floor(end / 60))}:${pad(end % 60)}`;
}

const active = (s: Slot) => !s.status || s.status === "scheduled";

/** Dois serviços se sobrepõem se os dois têm horário, no mesmo dia, e os intervalos se cruzam. */
export function overlaps(a: Slot, b: Slot): boolean {
  if (a.starts_on !== b.starts_on || !a.start_time || !b.start_time) return false;
  const as = toMin(a.start_time);
  const bs = toMin(b.start_time);
  return as < bs + b.duration_min && bs < as + a.duration_min;
}

export function conflictsWith(candidate: Slot, others: Slot[]): Slot[] {
  return others.filter((o) => active(o) && o.id !== candidate.id && overlaps(candidate, o));
}

/** Ids dos serviços que se sobrepõem a algum outro (para marcar em vermelho no calendário). */
export function conflictIds(list: (Slot & { id: string })[]): Set<string> {
  const ids = new Set<string>();
  const open = list.filter(active);
  for (let i = 0; i < open.length; i++) {
    for (let j = i + 1; j < open.length; j++) {
      if (overlaps(open[i], open[j])) {
        ids.add(open[i].id);
        ids.add(open[j].id);
      }
    }
  }
  return ids;
}

export type Warning = { kind: "overlap" | "crowded" | "past" | "sunday" | "same_customer"; text: string };

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

export function warningsFor(candidate: Slot, others: Slot[], today: string): Warning[] {
  const out: Warning[] = [];
  const sameDay = others.filter((o) => active(o) && o.id !== candidate.id && o.starts_on === candidate.starts_on);

  for (const c of conflictsWith(candidate, sameDay)) {
    const when = `${hhmm(c.start_time)}–${endTime(c.start_time!, c.duration_min)}`;
    out.push({ kind: "overlap", text: `Conflita com ${c.customer_name} (${when}).` });
  }
  if (sameDay.some((o) => norm(o.customer_name) === norm(candidate.customer_name))) {
    out.push({ kind: "same_customer", text: `${candidate.customer_name} já tem outro serviço marcado nesse dia.` });
  }
  if (sameDay.length >= 3) {
    out.push({ kind: "crowded", text: `Esse dia já tem ${sameDay.length} serviços marcados.` });
  }
  if (candidate.starts_on < today) {
    out.push({ kind: "past", text: "Essa data já passou." });
  }
  if (new Date(`${candidate.starts_on}T12:00:00`).getDay() === 0) {
    out.push({ kind: "sunday", text: "Esse dia é domingo." });
  }
  return out;
}
