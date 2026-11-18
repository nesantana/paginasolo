"use client";

import { MessageCircle } from "lucide-react";
import { OwnerShell } from "@/components/OwnerShell";
import { FREE_CLIENT_LIMIT } from "@/lib/plans";

const SUPPORT = (process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "").replace(/\D/g, "");

const TOPICS: { q: string; a: React.ReactNode }[] = [
  {
    q: "Como faço um orçamento?",
    a: (
      <>
        Na tela inicial, escreva na barra "O que você precisa hoje?" como no WhatsApp: <i>orçamento para a Ana, instalação de chuveiro, R$ 300</i>. Confira o cartão e toque em Confirmar. Ou vá em <b>Meus clientes → Novo cliente</b>.
      </>
    ),
  },
  {
    q: "O cliente aprovou. E agora?",
    a: <>Em <b>Meus clientes</b>, toque em "O cliente aprovou" (ou o cliente aceita pelo link e você recebe um aviso). O contrato já vem pronto: confira, escolha como ele paga e envie pelo WhatsApp.</>,
  },
  {
    q: "Como cobro por Pix?",
    a: <>Cadastre sua chave Pix uma vez. Depois, em cada cliente, toque em "Mandar Pix no WhatsApp": a mensagem já vai com o valor certo e o Pix copia e cola. O dinheiro cai direto na sua conta, não passa pelo app.</>,
  },
  {
    q: "Como sei que o cliente pagou?",
    a: <>Você confere no seu banco. Quando o cliente toca em "Já paguei" você recebe um aviso. Depois toque em "Sim, o dinheiro entrou" e envie o recibo pelo WhatsApp.</>,
  },
  {
    q: "Posso dividir o pagamento?",
    a: <>Sim. No contrato escolha "Você escolhe": ex. 3 parcelas, uma ao assinar, outra em 15 dias e outra em 30. Cada parcela pode ter valor e data diferentes.</>,
  },
  {
    q: "Errei o orçamento que já enviei.",
    a: <>Em Meus clientes, toque em "Editar orçamento". O link que o cliente recebeu continua o mesmo e mostra a versão corrigida. Avise o cliente pelo WhatsApp.</>,
  },
  {
    q: "Como recebo avisos no celular?",
    a: <>Toque no sino e em "Ativar avisos". No iPhone, antes instale o app: no Safari toque em Compartilhar → Adicionar à Tela de Início, e abra pelo ícone novo.</>,
  },
  {
    q: "Como instalo o app no celular?",
    a: <>Android (Chrome): menu ⋮ → Instalar app. iPhone (Safari): Compartilhar → Adicionar à Tela de Início.</>,
  },
  {
    q: "O que é o catálogo de produtos e serviços?",
    a: <>É a lista do que você vende, com preço. No orçamento você toca no item e ele entra pronto, e o assistente usa esses preços quando você não diz o valor.</>,
  },
  {
    q: "O que muda se eu não assinar?",
    a: <>Tudo funciona de graça para até {FREE_CLIENT_LIMIT} clientes. Para atender mais, assine. Quem você já cadastrou continua normal.</>,
  },
];

export default function AjudaPage() {
  return (
    <OwnerShell title="Ajuda" subtitle="Respostas rápidas. Toque na pergunta para abrir.">
      <div className="space-y-2">
        {TOPICS.map((t) => (
          <details key={t.q} className="group rounded-2xl border border-white/10 bg-[#0f172a] p-4">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-bold [&::-webkit-details-marker]:hidden">
              {t.q}
              <span className="text-xl text-slate-400 group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">{t.a}</p>
          </details>
        ))}
      </div>
      {SUPPORT && (
        <a
          href={`https://wa.me/${SUPPORT}?text=${encodeURIComponent("Olá! Preciso de ajuda com o autonomIA.")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-6 font-extrabold text-zinc-950"
        >
          <MessageCircle className="h-5 w-5" /> Falar com a gente no WhatsApp
        </a>
      )}
    </OwnerShell>
  );
}
