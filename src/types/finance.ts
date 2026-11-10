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
  status: AppointmentStatus;
  done_at: string | null;
  created_at: string;
  updated_at: string;
};
