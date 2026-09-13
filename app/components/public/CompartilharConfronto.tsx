"use client";

import { useRef, useState } from "react";
import { Download, LoaderCircle, Share2, X } from "lucide-react";
import { toPng } from "html-to-image";
import toast from "react-hot-toast";

function shareImageSrc(source?: string) {
  if (!source || source === "/shield-placeholder.png" || source === "/user-placeholder.png") return "/logo-atual.png";
  if (source.startsWith("/")) return source;
  return `/api/share-image?url=${encodeURIComponent(source)}`;
}

type Formato = "story" | "feed" | "square";

const formatos: Record<Formato, { label: string; width: number; height: number }> = {
  story: { label: "Story", width: 1080, height: 1920 },
  feed: { label: "Feed", width: 1080, height: 1350 },
  square: { label: "Quadrado", width: 1080, height: 1080 },
};

function slugArquivo(valor?: string | number) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface Props {
  aberto: boolean;
  onClose: () => void;
  casa: { nome?: string; escudo?: string; substituicoes?: any[] };
  visitante: { nome?: string; escudo?: string; substituicoes?: any[] };
  placarCasa: number;
  placarVisitante: number;
  campeonato?: string;
  rodada?: number | string;
  finalizado: boolean;
  jogadoresCasa?: any[];
  jogadoresVisitante?: any[];
  reservasCasa?: any[];
  reservasVisitante?: any[];
}

export default function CompartilharConfronto({ aberto, onClose, casa, visitante, placarCasa, placarVisitante, campeonato, rodada, finalizado, jogadoresCasa = [], jogadoresVisitante = [], reservasCasa = [], reservasVisitante = [] }: Props) {
  const [formato, setFormato] = useState<Formato>("story");
  const [conteudo, setConteudo] = useState<"score" | "lineups">("score");
  const [gerando, setGerando] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  if (!aberto) return null;

  async function gerarArquivo() {
    if (!cardRef.current) throw new Error("Prévia indisponível");
    const imagens = Array.from(cardRef.current.querySelectorAll("img"));
    await Promise.all(imagens.map(async (imagem) => {
      if (imagem.complete && imagem.naturalWidth > 0) return;
      await imagem.decode();
    }));
    const config = formatos[formato];
    const dataUrl = await toPng(cardRef.current, {
      cacheBust: true,
      pixelRatio: 1,
      width: config.width,
      height: config.height,
      canvasWidth: config.width,
      canvasHeight: config.height,
      backgroundColor: "#090b09",
      skipFonts: true,
      includeQueryParams: true,
    });
    const resposta = await fetch(dataUrl);
    const nomeCasa = slugArquivo(casa.nome) || "mandante";
    const nomeVisitante = slugArquivo(visitante.nome) || "visitante";
    const numeroRodada = slugArquivo(rodada) || "sem-rodada";
    const nomeFormato = slugArquivo(formatos[formato].label);
    const nomeArquivo = `cartomitos-${nomeCasa}-x-${nomeVisitante}-rodada-${numeroRodada}-${nomeFormato}.png`;
    return new File([await resposta.blob()], nomeArquivo, { type: "image/png" });
  }

  async function executar(acao: "share" | "download") {
    setGerando(true);
    try {
      const arquivo = await gerarArquivo();
      if (acao === "share" && navigator.share && navigator.canShare?.({ files: [arquivo] })) {
        await navigator.share({ files: [arquivo], title: "Resultado Cartomitos", text: `${casa.nome} ${placarCasa} x ${placarVisitante} ${visitante.nome}` });
        return;
      }
      const url = URL.createObjectURL(arquivo);
      const link = document.createElement("a");
      link.href = url;
      link.download = arquivo.name;
      link.click();
      URL.revokeObjectURL(url);
      if (acao === "share") toast.success("Imagem baixada. Agora é só compartilhar.");
    } catch (error) {
      console.error("Erro ao gerar card compartilhável:", error);
      if ((error as Error)?.name !== "AbortError") toast.error("Não foi possível gerar a imagem. Tente novamente.");
    } finally {
      setGerando(false);
    }
  }

  const config = formatos[formato];
  const previewSize = formato === "story"
    ? "h-[480px] w-[270px] sm:h-[576px] sm:w-[324px]"
    : formato === "feed"
      ? "h-[337.5px] w-[270px] sm:h-[405px] sm:w-[324px]"
      : "h-[270px] w-[270px] sm:h-[324px] sm:w-[324px]";

  return (
    <div className="fixed inset-0 z-[140] grid place-items-center bg-black/90 p-3 backdrop-blur-xl" onClick={(event) => { event.stopPropagation(); onClose(); }}>
      <section className="custom-scrollbar max-h-[96dvh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-white/10 bg-[#111311] shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#111311]/95 px-4 py-3 backdrop-blur md:px-6">
          <div><span className="text-[9px] font-black uppercase tracking-[0.15em] text-yellow-400">Card do confronto</span><h3 className="text-lg font-black tracking-tight text-white">Compartilhar resultado</h3></div>
          <button onClick={onClose} aria-label="Fechar compartilhamento" className="rounded-lg border border-white/10 bg-black/25 p-2 text-slate-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"><X size={18} /></button>
        </header>

        <div className="grid gap-5 p-4 md:grid-cols-[minmax(0,1fr)_280px] md:p-6">
          <div className="flex min-h-[520px] items-center justify-center overflow-hidden rounded-xl bg-black/30 p-4">
            <div className={`${previewSize} relative max-w-full shrink-0 overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,.55)]`}>
              <div style={{ width: config.width, height: config.height }} className="absolute left-0 top-0 origin-top-left scale-[var(--share-scale,0.25)] sm:[--share-scale:0.3]">
                <ShareArtwork casa={casa} visitante={visitante} placarCasa={placarCasa} placarVisitante={placarVisitante} campeonato={campeonato} rodada={rodada} finalizado={finalizado} formato={formato} conteudo={conteudo} jogadoresCasa={jogadoresCasa} jogadoresVisitante={jogadoresVisitante} reservasCasa={reservasCasa} reservasVisitante={reservasVisitante} />
              </div>
            </div>
          </div>

          <aside className="flex flex-col gap-5">
            <div><label className="mb-2 block text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">Conteúdo do card</label><div className="grid grid-cols-2 rounded-xl border border-white/10 bg-black/30 p-1"><button onClick={() => setConteudo("score")} className={`rounded-lg px-3 py-3 text-[9px] font-black uppercase tracking-[0.07em] transition ${conteudo === "score" ? "bg-white/10 text-white" : "text-slate-500 hover:text-white"}`}>Placar</button><button disabled={!jogadoresCasa.length && !jogadoresVisitante.length} onClick={() => setConteudo("lineups")} className={`rounded-lg px-3 py-3 text-[9px] font-black uppercase tracking-[0.07em] transition disabled:cursor-not-allowed disabled:opacity-30 ${conteudo === "lineups" ? "bg-white/10 text-white" : "text-slate-500 hover:text-white"}`}>Escalações</button></div></div>
            <div><label className="mb-2 block text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">Formato da imagem</label><div className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-black/30 p-1 md:grid-cols-1">{(Object.keys(formatos) as Formato[]).map((item) => <button key={item} onClick={() => setFormato(item)} className={`rounded-lg px-3 py-3 text-[9px] font-black uppercase tracking-[0.07em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 ${formato === item ? "bg-yellow-400 text-black" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>{formatos[item].label}<span className="mt-0.5 hidden font-mono text-[8px] font-medium opacity-60 md:block">{formatos[item].width} × {formatos[item].height}</span></button>)}</div></div>
            <p className="text-xs leading-relaxed text-slate-500">A arte usa o placar exibido agora. Resultados em andamento recebem a marca “Parcial” automaticamente.</p>
            <div className="mt-auto grid gap-2">
              <button disabled={gerando} onClick={() => executar("share")} className="flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 py-3.5 text-[10px] font-black uppercase tracking-[0.08em] text-black transition hover:bg-yellow-300 active:scale-[.98] disabled:opacity-60">{gerando ? <LoaderCircle className="animate-spin" size={16} /> : <Share2 size={16} />} Compartilhar</button>
              <button disabled={gerando} onClick={() => executar("download")} className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-[10px] font-black uppercase tracking-[0.08em] text-white transition hover:bg-white/[0.07] active:scale-[.98] disabled:opacity-60"><Download size={15} /> Baixar PNG</button>
            </div>
          </aside>
        </div>
        <div aria-hidden="true" className="pointer-events-none fixed left-[-20000px] top-0 overflow-hidden">
          <div ref={cardRef} style={{ width: config.width, height: config.height }}>
            <ShareArtwork casa={casa} visitante={visitante} placarCasa={placarCasa} placarVisitante={placarVisitante} campeonato={campeonato} rodada={rodada} finalizado={finalizado} formato={formato} conteudo={conteudo} jogadoresCasa={jogadoresCasa} jogadoresVisitante={jogadoresVisitante} reservasCasa={reservasCasa} reservasVisitante={reservasVisitante} />
          </div>
        </div>
      </section>
    </div>
  );
}

function ShareArtwork({ casa, visitante, placarCasa, placarVisitante, campeonato, rodada, finalizado, formato, conteudo, jogadoresCasa = [], jogadoresVisitante = [], reservasCasa = [], reservasVisitante = [] }: Omit<Props, "aberto" | "onClose"> & { formato: Formato; conteudo: "score" | "lineups" }) {
  const compact = formato === "square";
  const story = formato === "story";
  const casaVenceu = finalizado && placarCasa > placarVisitante;
  const visitanteVenceu = finalizado && placarVisitante > placarCasa;
  const empatou = finalizado && placarCasa === placarVisitante;

  return <div style={{ display: "grid", gridTemplateRows: compact ? "126px minmax(0, 1fr) 88px" : "138px minmax(0, 1fr) 96px" }} className="relative h-full w-full overflow-hidden bg-[#090b09] text-white">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_5%_0%,rgba(250,204,21,.2),transparent_27%),radial-gradient(circle_at_96%_82%,rgba(21,128,61,.17),transparent_30%)]" />
    <div className="absolute inset-0 opacity-[.11] [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:54px_54px]" />
    <div className="absolute -right-[150px] top-[280px] h-[480px] w-[480px] rounded-full border-[80px] border-yellow-400/[.025]" />
    <div className="absolute left-[70px] top-[48%] h-[2px] w-[940px] rotate-[-9deg] bg-gradient-to-r from-transparent via-yellow-400/20 to-transparent" />

    <header className="relative flex h-full items-center justify-between border-b border-white/10 px-[76px]">
      <div className="flex items-center gap-[16px]"><img src="/logo-atual.png" alt="Cartomitos" className="h-[54px] w-[54px] object-contain" /><strong className="text-[34px] font-black tracking-[-0.04em]">CARTO<span className="text-yellow-400">MITOS</span></strong></div>
      <div className="flex items-center gap-[16px] text-[12px] font-black uppercase tracking-[.14em]"><span className="text-white">Rodada {rodada || "—"}</span><span className="h-[18px] w-px bg-white/15" /><span className={`flex items-center gap-[8px] ${finalizado ? "text-yellow-400" : "text-emerald-400"}`}><i className={`h-[7px] w-[7px] rounded-full ${finalizado ? "bg-yellow-400" : "bg-emerald-400"}`} />{finalizado ? "Final" : "Parcial"}</span></div>
    </header>

    {conteudo === "lineups" ? <LineupsArtwork casa={casa} visitante={visitante} placarCasa={placarCasa} placarVisitante={placarVisitante} campeonato={campeonato} rodada={rodada} formato={formato} jogadoresCasa={jogadoresCasa} jogadoresVisitante={jogadoresVisitante} reservasCasa={reservasCasa} reservasVisitante={reservasVisitante} /> : <main className={`relative grid h-full place-content-center px-[62px] ${compact ? "gap-[34px]" : story ? "gap-[72px]" : "gap-[48px]"}`}>
      <div className="text-center">
        <p className="text-[18px] font-black uppercase tracking-[.18em] text-yellow-400">{campeonato || "Campeonato Cartomitos"}</p>
        <div className="mx-auto mt-[14px] h-[3px] w-[52px] bg-yellow-400" />
        <h2 className={`${story ? "mt-[26px] text-[62px]" : "mt-[20px] text-[52px]"} font-black leading-none tracking-[-0.055em]`}>Rodada {rodada || "—"}</h2>
        <p className="mt-[10px] text-[14px] font-bold uppercase tracking-[.16em] text-slate-500">Confronto oficial do Cartola</p>
      </div>

      <section className="relative w-[956px] overflow-hidden rounded-[44px] border-2 border-white/10 bg-[#111510]/95 shadow-[0_40px_100px_rgba(0,0,0,.5)]">
        <div className="absolute inset-x-0 top-0 h-[8px] bg-yellow-400" />
        <div className={`grid grid-cols-[minmax(0,1fr)_300px_minmax(0,1fr)] items-center gap-[20px] px-[38px] ${compact ? "py-[46px]" : "py-[66px]"}`}>
          <TeamArtwork team={casa} side="Mandante" winner={casaVenceu} />
          <div className="text-center">
            <span className="text-[14px] font-black uppercase tracking-[.18em] text-slate-500">{finalizado ? "Placar final" : "Parcial agora"}</span>
            <div className="mt-[18px] flex items-center justify-center gap-[13px] font-mono text-[82px] font-black leading-none tabular-nums tracking-[-0.065em]"><span>{Math.trunc(placarCasa)}</span><span className="text-[30px] text-yellow-400">×</span><span>{Math.trunc(placarVisitante)}</span></div>
            <strong className={`mx-auto mt-[24px] inline-flex items-center gap-[9px] rounded-full px-[20px] py-[9px] text-[13px] font-black uppercase tracking-[.13em] ${finalizado ? "bg-yellow-400 text-black" : "bg-emerald-400 text-[#07130d]"}`}><i className="h-[7px] w-[7px] rounded-full bg-current" />{empatou ? "Empate" : finalizado ? "Finalizado" : "Em andamento"}</strong>
          </div>
          <TeamArtwork team={visitante} side="Visitante" winner={visitanteVenceu} />
        </div>
        <div className="flex items-center justify-center border-t border-white/10 bg-black/20 px-[42px] py-[20px]"><span className="text-[13px] font-black uppercase tracking-[.16em] text-slate-400">Pontuação da rodada do Cartola</span></div>
      </section>

      <p className="text-center text-[15px] font-bold uppercase tracking-[.18em] text-slate-500">{finalizado ? "Resultado confirmado" : "Os pontos podem mudar até o fechamento da rodada"}</p>
    </main>}

    <footer className="relative grid h-full grid-cols-[minmax(0,1fr)_auto] items-center gap-[48px] border-t-[5px] border-yellow-400 bg-[#0d100d] px-[70px]"><div className="min-w-0"><span className="block text-[9px] font-bold uppercase tracking-[.17em] text-slate-600">Campeonato</span><strong className="mt-[5px] block whitespace-normal text-[14px] font-black uppercase leading-[1.12] tracking-[.08em] text-white">{campeonato || "Campeonato Cartomitos"}</strong></div><div className="flex shrink-0 items-center gap-[14px]"><strong className="text-[15px] font-black uppercase tracking-[.1em] text-white">{rodada || "—"}ª rodada</strong><span className={`rounded-full px-[12px] py-[6px] text-[10px] font-black uppercase tracking-[.12em] ${finalizado ? "bg-yellow-400/15 text-yellow-400" : "bg-emerald-400/15 text-emerald-400"}`}>{finalizado ? "Final" : "Parcial"}</span></div></footer>
  </div>;
}

function LineupsArtwork({ casa, visitante, placarCasa, placarVisitante, rodada, formato, jogadoresCasa, jogadoresVisitante, reservasCasa, reservasVisitante }: {
  casa: Props["casa"];
  visitante: Props["visitante"];
  placarCasa: number;
  placarVisitante: number;
  campeonato?: string;
  rodada?: number | string;
  formato: Formato;
  jogadoresCasa: any[];
  jogadoresVisitante: any[];
  reservasCasa: any[];
  reservasVisitante: any[];
}) {
  const compact = formato === "square";
  const story = formato === "story";
  const idJogador = (jogador: any) => {
    if (typeof jogador === "string" || typeof jogador === "number") return String(jogador);
    return String(jogador?.id || jogador?.atleta_id || "");
  };
  const posicoes: Record<number, string> = { 1: "GOL", 2: "LAT", 3: "ZAG", 4: "MEI", 5: "ATA", 6: "TEC" };
  const completarJogador = (jogador: any, fallback?: any) => {
    const dadosJogador = jogador && typeof jogador === "object" ? jogador : {};
    const dadosFallback = fallback && typeof fallback === "object" ? fallback : {};
    return ({
    ...dadosFallback,
    ...dadosJogador,
    id: idJogador(jogador) || idJogador(fallback),
    nome: jogador?.apelido || jogador?.nome || fallback?.apelido || fallback?.nome || "Jogador",
    foto: jogador?.foto ? jogador.foto.replace("FORMATO", "140x140") : fallback?.foto,
    posicao_id: jogador?.posicao_id || fallback?.posicao_id,
    posicao: jogador?.posicao || fallback?.posicao || posicoes[Number(jogador?.posicao_id || fallback?.posicao_id)] || "—",
    pontos: jogador?.pontos ?? jogador?.pontos_num ?? jogador?.pontuacao ?? fallback?.pontos ?? 0,
    pontosCalculados: jogador?.pontosCalculados ?? jogador?.pontos_num ?? jogador?.pontuacao ?? fallback?.pontosCalculados,
    jogou: jogador?.jogou ?? fallback?.jogou ?? true,
  });
  };
  const prepararEscalacao = (titulares: any[], reservas: any[], substituicoes: any[] = []) => {
    let ativos = titulares.map((jogador) => jogador.substituidoPor
      ? completarJogador(jogador.substituidoPor, { ...jogador, isSubIn: true })
      : completarJogador(jogador));
    const sairam = titulares.filter((jogador) => jogador.substituidoPor).map((jogador) => ({ ...completarJogador(jogador), substituidoPor: undefined, isSubOut: true }));

    substituicoes.forEach((evento) => {
      const entrouRaw = evento?.entrou;
      const saiuRaw = evento?.saiu;
      const entrouId = idJogador(entrouRaw);
      const saiuId = idJogador(saiuRaw);
      const reservaConhecido = reservas.find((jogador) => idJogador(jogador) === entrouId);
      const titularConhecido = titulares.find((jogador) => idJogador(jogador) === saiuId);
      const entrou = { ...completarJogador(entrouRaw, reservaConhecido), isSubIn: true };
      const saiu = { ...completarJogador(saiuRaw, titularConhecido), isSubOut: true };
      const indiceSaida = ativos.findIndex((jogador) => idJogador(jogador) === saiuId);
      const indiceEntrada = ativos.findIndex((jogador) => idJogador(jogador) === entrouId);

      if (indiceSaida >= 0 && entrouId) ativos[indiceSaida] = entrou;
      else if (indiceEntrada >= 0) ativos[indiceEntrada] = { ...ativos[indiceEntrada], ...entrou, isSubIn: true };
      else if (entrouId) ativos.push(entrou);
      if (saiuId && !sairam.some((jogador) => idJogador(jogador) === saiuId)) sairam.push(saiu);
    });

    const idsAtivos = new Set(ativos.map(idJogador));
    const banco = [...sairam, ...reservas.filter((jogador) => !idsAtivos.has(idJogador(jogador))).map((jogador) => completarJogador(jogador))];
    const bancoUnico = Array.from(new Map(banco.map((jogador, index) => [idJogador(jogador) || `sem-id-${index}`, jogador])).values())
      .sort((a, b) => Number(a.posicao_id || 99) - Number(b.posicao_id || 99));
    ativos = ativos
      .sort((a, b) => Number(a.posicao_id || 99) - Number(b.posicao_id || 99))
      .slice(0, 11);
    return { ativos, banco: bancoUnico.slice(0, 6) };
  };
  const escalaCasa = prepararEscalacao(jogadoresCasa, reservasCasa, casa.substituicoes);
  const escalaVisitante = prepararEscalacao(jogadoresVisitante, reservasVisitante, visitante.substituicoes);

  return <main className={`relative grid h-full content-start ${compact ? "gap-[12px] px-[48px] pt-[18px]" : story ? "gap-[22px] px-[62px] pt-[30px]" : "gap-[16px] px-[54px] pt-[22px]"}`}>
    <div className={`grid grid-cols-[1fr_auto_1fr] items-center ${compact ? "gap-[18px]" : "gap-[28px]"}`}>
      <ShareTeamHeader team={casa} align="left" compact={compact} feed={!story && !compact} />
      <div className="text-center"><span className={`${compact ? "text-[10px]" : "text-[12px]"} font-black uppercase tracking-[.18em] text-yellow-400`}>Rodada {rodada || "—"}</span><div className={`${compact ? "mt-[5px] rounded-[13px] px-[18px] py-[8px] text-[34px]" : "mt-[8px] rounded-[18px] px-[24px] py-[12px] text-[44px]"} border border-white/10 bg-black/40 font-mono font-black leading-none tabular-nums`}><span>{Math.trunc(placarCasa)}</span><span className={`${compact ? "mx-[7px] text-[14px]" : "mx-[10px] text-[18px]"} text-yellow-400`}>×</span><span>{Math.trunc(placarVisitante)}</span></div></div>
      <ShareTeamHeader team={visitante} align="right" compact={compact} feed={!story && !compact} />
    </div>

    <section className={`${compact ? "rounded-[22px]" : "rounded-[28px]"} overflow-hidden border-2 border-white/10 bg-[#101310]/95`}>
      <div className="grid grid-cols-2">
        <TeamShareLineup titulares={escalaCasa.ativos} reservas={escalaCasa.banco} compact={compact} story={story} />
        <TeamShareLineup titulares={escalaVisitante.ativos} reservas={escalaVisitante.banco} compact={compact} story={story} bordered />
      </div>
    </section>
    <div className="flex items-center justify-end"><div className={`flex items-center font-black uppercase tracking-[.12em] ${compact ? "gap-[13px] text-[9px]" : "gap-[18px] text-[11px]"}`}><span className="text-yellow-400">C Capitão</span><span className="text-orange-400">L Luxo</span><span className="text-emerald-400">↗ Entrou</span><span className="text-red-400">↙ Saiu</span></div></div>
  </main>;
}

function ShareTeamHeader({ team, align, compact, feed }: { team: Props["casa"]; align: "left" | "right"; compact: boolean; feed: boolean }) {
  const imageSize = compact ? "h-[60px] w-[60px]" : feed ? "h-[70px] w-[70px]" : "h-[86px] w-[86px]";
  const textSize = compact ? "text-[20px]" : feed ? "text-[23px]" : "text-[27px]";
  return <div className={`flex min-w-0 items-center ${compact ? "gap-[12px]" : "gap-[18px]"} ${align === "right" ? "flex-row-reverse text-right" : ""}`}><img src={shareImageSrc(team.escudo)} crossOrigin="anonymous" alt={`Escudo ${team.nome || "do time"}`} className={`${imageSize} shrink-0 object-contain`} /><strong className={`${textSize} break-words font-black leading-[1.02] tracking-[-0.035em]`}>{team.nome || "A definir"}</strong></div>;
}

function TeamShareLineup({ titulares, reservas, compact, story, bordered = false }: { titulares: any[]; reservas: any[]; compact: boolean; story: boolean; bordered?: boolean }) {
  return <div className={`${bordered ? "border-l border-white/10" : ""}`}>
    <div className={`border-b border-yellow-400/30 bg-yellow-400/[.06] px-[20px] ${compact ? "py-[7px]" : story ? "py-[12px]" : "py-[9px]"}`}><span className={`${compact ? "text-[9px]" : "text-[11px]"} font-black uppercase tracking-[.16em] text-yellow-400`}>Titulares</span></div>
    <PlayerShareList jogadores={titulares} compact={compact} story={story} />
    <div className={`border-y border-white/10 bg-white/[.035] px-[20px] ${compact ? "py-[6px]" : story ? "py-[9px]" : "py-[7px]"}`}><span className={`${compact ? "text-[8px]" : "text-[10px]"} font-black uppercase tracking-[.16em] text-slate-400`}>Banco de reservas</span></div>
    <PlayerShareList jogadores={reservas} compact={compact} story={story} reserve />
  </div>;
}

function PlayerShareList({ jogadores, compact, story, reserve = false }: { jogadores: any[]; compact: boolean; story: boolean; reserve?: boolean }) {
  return <div>
    {jogadores.map((jogador, index) => {
      const pontosBase = Number(jogador.pontos ?? jogador.pontosCalculados ?? 0);
      const pontos = Number(jogador.pontosCalculados ?? (jogador.isCapitao ? pontosBase * 1.5 : pontosBase));
      const jogou = jogador.jogou !== false || jogador.isSubIn;
      const rowHeight = compact ? (reserve ? "h-[30px]" : "h-[36px]") : story ? (reserve ? "h-[62px]" : "h-[76px]") : (reserve ? "h-[39px]" : "h-[49px]");
      const avatarSize = compact ? "h-[22px] w-[22px]" : story ? "h-[33px] w-[33px]" : "h-[28px] w-[28px]";
      const nameSize = compact ? "text-[11px]" : story ? "text-[9.5px]" : "text-[12px]";
      return <div key={`${jogador.id}-${index}`} className={`flex items-center border-b border-white/[.065] last:border-b-0 ${compact ? "gap-[6px] px-[10px]" : "gap-[8px] px-[13px]"} ${rowHeight}`}>
        <span className={`${compact ? "w-[22px] text-[7px]" : "w-[24px] text-[8px]"} shrink-0 text-center font-mono font-black uppercase tracking-[-0.02em] text-slate-500`}>{jogador.posicao || "—"}</span>
        <img src={shareImageSrc(jogador.foto)} crossOrigin="anonymous" alt={`Foto de ${jogador.nome}`} className={`${avatarSize} shrink-0 rounded-full border border-white/10 bg-black object-cover`} />
        <div className="min-w-0 flex-1"><div className="flex min-w-0 items-center gap-[4px]"><strong className={`${nameSize} min-w-0 whitespace-nowrap font-black uppercase leading-none text-white`}>{jogador.nome || "Jogador"}</strong>{jogador.isCapitao && <b className="grid h-[14px] min-w-[14px] shrink-0 place-items-center rounded bg-yellow-400 px-[3px] text-[7px] font-black text-black">C</b>}{jogador.isLuxo && <b className="grid h-[14px] min-w-[14px] shrink-0 place-items-center rounded bg-orange-400 px-[3px] text-[8px] font-black text-black">L</b>}{jogador.isSubIn && <b className="grid h-[14px] min-w-[14px] shrink-0 place-items-center rounded bg-emerald-400/15 px-[3px] text-[9px] font-black text-emerald-400">↗</b>}{jogador.isSubOut && <b className="grid h-[14px] min-w-[14px] shrink-0 place-items-center rounded bg-red-400/15 px-[3px] text-[9px] font-black text-red-400">↙</b>}</div></div>
        {jogador.isCapitao && jogou ? (
          <div className={`flex shrink-0 items-center font-mono tabular-nums ${compact ? "gap-[2px]" : "gap-[4px]"}`}>
            <span className={`${compact ? "text-[8px]" : "text-[10px]"} font-bold text-slate-500`}>{pontosBase.toFixed(1)}</span>
            <span className={`${compact ? "text-[6px]" : "text-[8px]"} font-black text-yellow-400`}>×1,5</span>
            <strong className={`${compact ? "text-[12px]" : "text-[16px]"} font-black ${pontos < 0 ? "text-red-400" : "text-emerald-400"}`}>{pontos.toFixed(1)}</strong>
          </div>
        ) : (
          <strong className={`${compact ? "text-[12px]" : "text-[16px]"} shrink-0 font-mono font-black tabular-nums ${!jogou ? "text-slate-600" : pontos < 0 ? "text-red-400" : "text-emerald-400"}`}>{jogou ? pontos.toFixed(1) : "—"}</strong>
        )}
      </div>;
    })}
  </div>;
}

function TeamArtwork({ team, side, winner }: { team: { nome?: string; escudo?: string }; side: string; winner: boolean }) {
  return <div className="flex min-w-0 flex-col items-center text-center"><div className={`relative grid h-[190px] w-[190px] place-items-center rounded-[38px] border-2 bg-black/30 ${winner ? "border-yellow-400 shadow-[0_0_50px_rgba(250,204,21,.16)]" : "border-white/10"}`}><img src={shareImageSrc(team.escudo)} crossOrigin="anonymous" alt={`Escudo ${team.nome || "do time"}`} className="h-[150px] w-[150px] object-contain" />{winner && <span className="absolute -bottom-[14px] rounded-full bg-yellow-400 px-[16px] py-[7px] text-[10px] font-black uppercase tracking-[.12em] text-black">Vencedor</span>}</div><span className="mt-[30px] text-[12px] font-bold uppercase tracking-[.18em] text-slate-500">{side}</span><strong className="mt-[8px] w-full break-words text-[29px] font-black leading-[1.04] tracking-[-0.035em]">{team.nome || "A definir"}</strong></div>;
}
