"use client";

import { useRef, useState } from "react";
import {
  Check,
  ImagePlus,
  Loader2,
  MessageSquare,
  Plus,
  QrCode,
  Trash2,
} from "lucide-react";
import type {
  TenantFaqItem,
  TenantRow,
  TenantTestimonial,
} from "@/types/database.types";
import { defaultFaq } from "@/lib/faqDefaults";
import { ThemePicker } from "@/components/ThemePicker";

type Point = { pageviews: number; whatsappClicks: number };

const MAX_PHOTOS = 6;

/** Reduz a foto no navegador (lado maior 900px, JPEG) para caber no banco. */
async function shrinkPhoto(file: File): Promise<string | null> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return null;
  const scale = Math.min(1, 900 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  for (const q of [0.78, 0.66, 0.55]) {
    const url = canvas.toDataURL("image/jpeg", q);
    if (url.length < 200_000) return url;
  }
  return null;
}

const card = "rounded-2xl bg-white border border-slate-200 p-5 sm:p-6 space-y-4";
const input =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none";
const ghostBtn =
  "inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3.5 py-2.5 text-xs font-extrabold text-slate-900 cursor-pointer transition-colors";

export function SiteExtras({
  tenant,
  series,
}: {
  tenant: TenantRow;
  series: Point[];
}) {
  const [images, setImages] = useState<string[]>(tenant.images || []);
  const [testimonials, setTestimonials] = useState<TenantTestimonial[]>(
    tenant.testimonials || []
  );
  const [faq, setFaq] = useState<TenantFaqItem[]>(
    tenant.faq && tenant.faq.length > 0 ? tenant.faq : defaultFaq(tenant)
  );
  const [offer, setOffer] = useState(tenant.offer_text || "");
  const [reviewsUrl, setReviewsUrl] = useState(tenant.google_reviews_url || "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Resumo dos últimos 7 dias, pronto para mandar no próprio WhatsApp.
  const week = series.slice(-7);
  const views = week.reduce((n, p) => n + p.pageviews, 0);
  const clicks = week.reduce((n, p) => n + p.whatsappClicks, 0);
  const digits = tenant.whatsapp_number.replace(/\D/g, "");
  const ddi = digits.startsWith("55") ? digits : `55${digits}`;
  const summaryUrl = `https://wa.me/${ddi}?text=${encodeURIComponent(
    `Resumo da semana — ${tenant.business_name}\n` +
      `• ${views} visitas no site\n• ${clicks} clientes chamaram no WhatsApp`
  )}`;

  const addPhotos = async (files: FileList | null) => {
    if (!files) return;
    const room = MAX_PHOTOS - images.length;
    const next: string[] = [];
    for (const f of Array.from(files).slice(0, room)) {
      const url = await shrinkPhoto(f);
      if (url) next.push(url);
    }
    if (next.length) setImages((cur) => [...cur, ...next].slice(0, MAX_PHOTOS));
    if (fileRef.current) fileRef.current.value = "";
  };

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/tenants/extras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images,
          testimonials,
          faq,
          offer_text: offer,
          google_reviews_url: reviewsUrl,
        }),
      });
      const data = await res.json().catch(() => ({}));
      setMsg(
        res.ok && data.ok
          ? { ok: true, text: "Salvo! Seu site já foi atualizado." }
          : { ok: false, text: data.error || "Não foi possível salvar." }
      );
    } catch {
      setMsg({ ok: false, text: "Sem conexão. Tente de novo." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Resumo + cartaz */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className={card}>
          <h2 className="text-base font-extrabold">Resumo da semana</h2>
          <p className="text-sm text-slate-600">
            <strong className="text-slate-900">{views}</strong> visitas e{" "}
            <strong className="text-emerald-600">{clicks}</strong> pessoas
            chamaram no WhatsApp nos últimos 7 dias.
          </p>
          <a
            href={summaryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={ghostBtn}
          >
            <MessageSquare className="h-4 w-4 text-emerald-600" />
            Enviar resumo para o meu WhatsApp
          </a>
        </div>

        <div className={card}>
          <h2 className="text-base font-extrabold">Cartaz com QR Code</h2>
          <p className="text-sm text-slate-600">
            Imprima e cole no balcão, na vitrine ou no carro.
          </p>
          <div className="flex flex-wrap gap-2.5">
            <a
              href={`/cartaz/${tenant.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className={ghostBtn}
            >
              <QrCode className="h-4 w-4 text-blue-700" />
              QR do meu site
            </a>
            <a
              href={`/cartaz/${tenant.slug}?para=whatsapp`}
              target="_blank"
              rel="noopener noreferrer"
              className={ghostBtn}
            >
              <QrCode className="h-4 w-4 text-emerald-600" />
              QR direto no WhatsApp
            </a>
          </div>
        </div>
      </div>

      <ThemePicker initial={tenant.theme} brandColor={tenant.primary_color} />

      {/* Oferta */}
      <div className={card}>
        <h2 className="text-base font-extrabold">Oferta no topo do site</h2>
        <input
          value={offer}
          onChange={(e) => setOffer(e.target.value)}
          maxLength={100}
          placeholder="Ex: 10% de desconto no primeiro serviço"
          className={input}
        />
        <p className="text-xs text-slate-500">
          Deixe vazio para não mostrar nada.
        </p>
      </div>

      {/* Fotos */}
      <div className={card}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-extrabold">
            Fotos do seu trabalho ({images.length}/{MAX_PHOTOS})
          </h2>
          <button
            type="button"
            disabled={images.length >= MAX_PHOTOS}
            onClick={() => fileRef.current?.click()}
            className={`${ghostBtn} disabled:opacity-40`}
          >
            <ImagePlus className="h-4 w-4 text-blue-700" />
            Adicionar
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => addPhotos(e.target.files)}
          />
        </div>
        {images.length === 0 ? (
          <p className="text-sm text-slate-500">
            Mostre antes e depois, sua equipe ou sua loja. Site com fotos passa
            mais confiança.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((src, i) => (
              <li key={i} className="group relative overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`Foto ${i + 1}`}
                  className="aspect-[4/3] w-full object-cover"
                />
                <button
                  type="button"
                  aria-label="Remover foto"
                  onClick={() => setImages(images.filter((_, j) => j !== i))}
                  className="absolute right-2 top-2 rounded-full bg-black/70 p-2 text-white hover:bg-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Depoimentos */}
      <div className={card}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-extrabold">Depoimentos de clientes</h2>
          <button
            type="button"
            disabled={testimonials.length >= 5}
            onClick={() =>
              setTestimonials([...testimonials, { name: "", text: "" }])
            }
            className={`${ghostBtn} disabled:opacity-40`}
          >
            <Plus className="h-4 w-4 text-blue-700" />
            Adicionar
          </button>
        </div>
        {testimonials.length === 0 && (
          <p className="text-sm text-slate-500">
            Copie elogios que clientes reais mandaram e cole aqui, com a
            permissão deles.
          </p>
        )}
        {testimonials.map((t, i) => (
          <div key={i} className="space-y-2 rounded-xl bg-slate-50 p-3.5">
            <input
              value={t.name}
              onChange={(e) =>
                setTestimonials(
                  testimonials.map((x, j) =>
                    j === i ? { ...x, name: e.target.value } : x
                  )
                )
              }
              placeholder="Nome (ex: Maria S.)"
              maxLength={60}
              className={input}
            />
            <textarea
              value={t.text}
              onChange={(e) =>
                setTestimonials(
                  testimonials.map((x, j) =>
                    j === i ? { ...x, text: e.target.value } : x
                  )
                )
              }
              placeholder="O que o cliente disse"
              maxLength={280}
              rows={2}
              className={input}
            />
            <button
              type="button"
              onClick={() =>
                setTestimonials(testimonials.filter((_, j) => j !== i))
              }
              className="text-xs font-bold text-red-400 hover:text-red-600"
            >
              Remover
            </button>
          </div>
        ))}
        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-600">
            Link das suas avaliações no Google (opcional)
          </label>
          <input
            value={reviewsUrl}
            onChange={(e) => setReviewsUrl(e.target.value)}
            placeholder="https://g.page/r/..."
            className={input}
          />
        </div>
      </div>

      {/* FAQ */}
      <div className={card}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-extrabold">Perguntas frequentes</h2>
          <button
            type="button"
            disabled={faq.length >= 8}
            onClick={() => setFaq([...faq, { q: "", a: "" }])}
            className={`${ghostBtn} disabled:opacity-40`}
          >
            <Plus className="h-4 w-4 text-blue-700" />
            Adicionar
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Já deixamos algumas prontas. Edite com as respostas do seu negócio.
        </p>
        {faq.map((f, i) => (
          <div key={i} className="space-y-2 rounded-xl bg-slate-50 p-3.5">
            <input
              value={f.q}
              onChange={(e) =>
                setFaq(faq.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))
              }
              placeholder="Pergunta"
              maxLength={120}
              className={input}
            />
            <textarea
              value={f.a}
              onChange={(e) =>
                setFaq(faq.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))
              }
              placeholder="Resposta"
              maxLength={400}
              rows={2}
              className={input}
            />
            <button
              type="button"
              onClick={() => setFaq(faq.filter((_, j) => j !== i))}
              className="text-xs font-bold text-red-400 hover:text-red-600"
            >
              Remover
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {saving ? "Salvando..." : "Salvar fotos, depoimentos e perguntas"}
        </button>
        {msg && (
          <span
            className={`text-sm font-bold ${msg.ok ? "text-emerald-300" : "text-red-300"}`}
          >
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
}
