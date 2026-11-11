export type ContractStatus = "draft" | "sent" | "signed" | "completed" | "cancelled";
export type PaymentStatus = "pending" | "informed" | "paid" | "cancelled";
export type DueKind = "upfront" | "date" | "on_completion";

export type ContractRow = {
  id: string;
  tenant_id: string;
  quote_id: string | null;
  code: string;
  title: string;
  scope: string;
  customer_name: string;
  customer_phone: string;
  customer_doc: string | null;
  customer_address: string | null;
  total_cents: number;
  delivery_date: string | null;
  extra_terms: string | null;
  status: ContractStatus;
  sent_at: string | null;
  viewed_at: string | null;
  signed_at: string | null;
  signed_name: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PaymentRow = {
  id: string;
  contract_id: string;
  tenant_id: string;
  position: number;
  label: string;
  amount_cents: number;
  due_kind: DueKind;
  due_date: string | null;
  status: PaymentStatus;
  paid_at: string | null;
  paid_method: string | null;
  informed_at: string | null;
  note: string | null;
  last_reminder_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ContractWithPayments = ContractRow & { payments: PaymentRow[] };

export type AppointmentStatus = "scheduled" | "done" | "cancelled";
export type AppointmentRow = {
  id: string;
  tenant_id: string;
  contract_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  title: string;
  address: string | null;
  notes: string | null;
  starts_on: string;
  /** "HH:MM:SS" ou null */
  start_time: string | null;
  /** duração em minutos (padrão 60) */
  duration_min: number;
  status: AppointmentStatus;
  done_at: string | null;
  created_at: string;
  updated_at: string;
};

export type VisitNote = { id: string; text: string; at: string };
export type VisitItem = { title: string; qty: number; price_cents: number };
export type VisitRow = {
  id: string;
  tenant_id: string;
  quote_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  title: string;
  address: string | null;
  starts_on: string;
  start_time: string | null;
  duration_min: number;
  status: AppointmentStatus;
  notes: VisitNote[];
  items: VisitItem[];
  followup_at: string | null;
  followup_done_at: string | null;
  followup_note: string | null;
  done_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Retorno a fazer (aparece no calendário): vem de um orçamento parado ou de uma visita. */
export type Followup = {
  key: string;
  kind: "quote" | "visit";
  id: string;
  customer_name: string;
  customer_phone: string | null;
  date: string;
  note: string | null;
  /** ex.: "Orçamento de R$ 800,00" ou "Visita técnica" */
  about: string;
  /** código público do orçamento (para montar o link na mensagem) */
  code?: string;
};
