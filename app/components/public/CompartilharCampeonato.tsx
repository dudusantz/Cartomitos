"use client";

import { useEffect, useRef, useState } from "react";
import { Download, LoaderCircle, Share2, X, Zap } from "lucide-react";
import { toPng } from "html-to-image";
import toast from "react-hot-toast";
import { findClassificationZone, type ClassificationZone } from "@/lib/classification-zones";

type Formato = "story" | "feed" | "square";
type TipoArte = "classificacao" | "mata_mata";

const formatos: Record<Formato, { label: string; width: number; height: number }> = {
  story: { label: "Story", width: 1080, height: 1920 },
  feed: { label: "Feed", width: 1080, height: 1350 },
  square: { label: "Quadrado", width: 1080, height: 1080 },
};

interface Props {
  aberto: boolean;
  onClose: () => void;
  tipo: TipoArte;
  campeonato: string;
  ano?: number | string;
  dadosOficiais: any[];
  dadosParciais?: any[] | null;
  rodadaParcial?: number;
  zonas?: ClassificationZone[];
  usarDecimais?: boolean;
  onCarregarParciais?: () => Promise<any[] | null>;
}

function imagemCompartilhavel(source?: string) {
  if (!source || source === "/shield-placeholder.png") return "/logo-atual.png";
  if (source.startsWith("/")) return source;
  return `/api/share-image?url=${encodeURIComponent(source)}`;
}

function slug(valor?: string | number) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function CompartilharCampeonato({
  aberto,
  onClose,
  tipo,
  campeonato,
  ano,
  dadosOficiais,
  dadosParciais,
  rodadaParcial,
  zonas = [],
  usarDecimais = false,
  onCarregarParciais,
}: Props) {
  const [formato, setFormato] = useState<Formato>("feed");
  const [incluirParciais, setIncluirParciais] = useState(false);
  const [parciaisLocais, setParciaisLocais] = useState<any[] | null>(null);
  const [carregandoParciais, setCarregandoParciais] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [faseSelecionada, setFaseSelecionada] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    setIncluirParciais(false);
    setParciaisLocais(null);
    if (tipo === "mata_mata") {
      const fases = montarFases(dadosOficiais);
      const faseAtual = fases.findIndex((fase) => {
        const jogosReais = fase.confrontos.filter((confronto) => confronto.times.every((time) => time.id));
        return jogosReais.length > 0 && jogosReais.some((confronto) => !confronto.finalizado);
      });
      setFaseSelecionada(faseAtual >= 0 ? faseAtual : Math.max(0, fases.length - 1));
    }
  }, [aberto, dadosOficiais, tipo]);

  if (!aberto) return null;

  const fasesOficiais = tipo === "mata_mata" ? montarFases(dadosOficiais) : [];
  const faseEmAndamento = tipo === "mata_mata" ? encontrarFaseEmAndamento(fasesOficiais) : -1;
  const permiteParciais = tipo !== "mata_mata" || faseSelecionada === faseEmAndamento;
  const dados = incluirParciais ? (parciaisLocais || dadosParciais || dadosOficiais) : dadosOficiais;
  const fasesDisponiveis = tipo === "mata_mata" ? montarFases(dados) : [];
  const temFasePreliminar = (fasesDisponiveis[0]?.avancamDireto?.length || 0) > 0;
  const config = formatos[formato];
  const previewSize = formato === "story"
    ? "h-[480px] w-[270px] sm:h-[576px] sm:w-[324px]"
    : formato === "feed"
      ? "h-[337.5px] w-[270px] sm:h-[405px] sm:w-[324px]"
      : "h-[270px] w-[270px] sm:h-[324px] sm:w-[324px]";

  async function selecionarParciais(ativar: boolean) {
    if (!ativar) {
      setIncluirParciais(false);
      return;
    }
    if (!permiteParciais) return;
    if (!dadosParciais && !parciaisLocais && onCarregarParciais) {
      setCarregandoParciais(true);
      try {
        const resultado = await onCarregarParciais();
        if (!resultado) return;
        setParciaisLocais(resultado);
      } finally {
        setCarregandoParciais(false);
      }
    }
    setIncluirParciais(true);
  }

  async function gerarArquivo() {
    if (!cardRef.current) throw new Error("Prévia indisponível");
    const imagens = Array.from(cardRef.current.querySelectorAll("img"));
    await Promise.all(imagens.map(async (imagem) => {
      if (imagem.complete && imagem.naturalWidth > 0) return;
      await imagem.decode();
    }));
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
    const tipoNome = tipo === "classificacao" ? "classificacao" : "chaveamento";
    const estado = incluirParciais ? `parcial-rodada-${rodadaParcial || "atual"}` : "oficial";
    const faseNome = tipo === "mata_mata" ? `-fase-${faseSelecionada + 1}` : "";
    const nome = `cartomitos-${slug(campeonato) || "campeonato"}-${tipoNome}${faseNome}-${estado}-${slug(formatos[formato].label)}.png`;
    return new File([await resposta.blob()], nome, { type: "image/png" });
  }

  async function executar(acao: "share" | "download") {
    setGerando(true);
    try {
      const arquivo = await gerarArquivo();
      if (acao === "share" && navigator.share && navigator.canShare?.({ files: [arquivo] })) {
        await navigator.share({ files: [arquivo], title: campeonato, text: `${tipo === "classificacao" ? "Classificação" : "Chaveamento"} — ${campeonato}` });
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
      console.error("Erro ao gerar arte do campeonato:", error);
      if ((error as Error)?.name !== "AbortError") toast.error("Não foi possível gerar a imagem.");
    } finally {
      setGerando(false);
    }
  }

  const artwork = (
    <ArteCampeonato
      tipo={tipo}
      campeonato={campeonato}
      ano={ano}
      dados={dados}
      formato={formato}
      parcial={incluirParciais}
      rodadaParcial={rodadaParcial}
      zonas={zonas}
      usarDecimais={usarDecimais}
      faseSelecionada={faseSelecionada}
    />
  );

  return <div className="fixed inset-0 z-[140] grid place-items-center bg-black/90 p-3 backdrop-blur-xl" onClick={onClose}>
    <section className="custom-scrollbar max-h-[96dvh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-white/10 bg-[#111311] shadow-2xl" onClick={(event) => event.stopPropagation()}>
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#111311]/95 px-4 py-3 backdrop-blur md:px-6">
        <div><span className="text-[9px] font-black uppercase tracking-[.15em] text-yellow-400">Arte do campeonato</span><h3 className="text-lg font-black tracking-tight text-white">Compartilhar {tipo === "classificacao" ? "classificação" : "chaveamento"}</h3></div>
        <button onClick={onClose} aria-label="Fechar" className="rounded-lg border border-white/10 bg-black/25 p-2 text-slate-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"><X size={18} /></button>
      </header>

      <div className="grid gap-5 p-4 md:grid-cols-[minmax(0,1fr)_280px] md:p-6">
        <div className="flex min-h-[520px] items-center justify-center overflow-hidden rounded-xl bg-black/30 p-4">
          <div className={`${previewSize} relative max-w-full shrink-0 overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,.55)]`}>
            <div style={{ width: config.width, height: config.height }} className="absolute left-0 top-0 origin-top-left scale-[var(--share-scale,0.25)] sm:[--share-scale:0.3]">{artwork}</div>
          </div>
        </div>

        <aside className="flex flex-col gap-5">
          <div><label className="mb-2 block text-[9px] font-black uppercase tracking-[.12em] text-slate-500">Dados exibidos</label><div className="grid grid-cols-2 rounded-xl border border-white/10 bg-black/30 p-1"><button onClick={() => selecionarParciais(false)} className={`rounded-lg px-3 py-3 text-[9px] font-black uppercase tracking-[.07em] transition ${!incluirParciais ? "bg-white/10 text-white" : "text-slate-500 hover:text-white"}`}>Oficial</button><button disabled={carregandoParciais || !permiteParciais} title={!permiteParciais ? "Parciais disponíveis apenas na fase em andamento" : undefined} onClick={() => selecionarParciais(true)} className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-3 text-[9px] font-black uppercase tracking-[.07em] transition disabled:cursor-not-allowed disabled:opacity-35 ${incluirParciais ? "bg-emerald-400 text-[#07130d]" : "text-emerald-400 hover:bg-emerald-400/10"}`}>{carregandoParciais ? <LoaderCircle className="animate-spin" size={12} /> : <Zap size={11} />} Com parciais</button></div>{!permiteParciais && <p className="mt-2 text-[10px] leading-relaxed text-slate-500">Parciais disponíveis apenas na fase em andamento.</p>}</div>
          {tipo === "mata_mata" && fasesDisponiveis.length > 0 && <div><label htmlFor="fase-compartilhada" className="mb-2 block text-[9px] font-black uppercase tracking-[.12em] text-slate-500">Fase da copa</label><select id="fase-compartilhada" value={Math.min(faseSelecionada, fasesDisponiveis.length - 1)} onChange={(event) => { const novaFase = Number(event.target.value); setFaseSelecionada(novaFase); if (novaFase !== faseEmAndamento) setIncluirParciais(false); }} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-[10px] font-black uppercase tracking-[.07em] text-white outline-none transition focus:border-yellow-400/50 focus:ring-2 focus:ring-yellow-400/20">{fasesDisponiveis.map((fase, indice) => <option key={indice} value={indice} className="bg-[#111311]">{nomeFaseArte(fase.esperado, indice, temFasePreliminar)} · {fase.confrontos.length} {fase.confrontos.length === 1 ? "jogo" : "jogos"}</option>)}</select>{incluirParciais && faseSelecionada < fasesDisponiveis.length - 1 && <p className="mt-2 text-[10px] leading-relaxed text-emerald-400/75">A arte também mostrará a projeção da próxima fase, ainda sem placares.</p>}</div>}
          <div><label className="mb-2 block text-[9px] font-black uppercase tracking-[.12em] text-slate-500">Formato</label><div className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-black/30 p-1 md:grid-cols-1">{(Object.keys(formatos) as Formato[]).map((item) => <button key={item} onClick={() => setFormato(item)} className={`rounded-lg px-3 py-3 text-[9px] font-black uppercase tracking-[.07em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 ${formato === item ? "bg-yellow-400 text-black" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>{formatos[item].label}<span className="mt-0.5 hidden font-mono text-[8px] font-medium opacity-60 md:block">{formatos[item].width} × {formatos[item].height}</span></button>)}</div></div>
          <p className="text-xs leading-relaxed text-slate-500">A opção oficial nunca altera a tabela salva. “Com parciais” consulta a rodada atual apenas para montar a arte.</p>
          <div className="mt-auto grid gap-2"><button disabled={gerando || carregandoParciais} onClick={() => executar("share")} className="flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 py-3.5 text-[10px] font-black uppercase tracking-[.08em] text-black transition hover:bg-yellow-300 active:scale-[.98] disabled:opacity-60">{gerando ? <LoaderCircle className="animate-spin" size={16} /> : <Share2 size={16} />} Compartilhar</button><button disabled={gerando || carregandoParciais} onClick={() => executar("download")} className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.035] px-4 py-3 text-[10px] font-black uppercase tracking-[.08em] text-white transition hover:bg-white/[.07] active:scale-[.98] disabled:opacity-60"><Download size={15} /> Baixar PNG</button></div>
        </aside>
      </div>

      <div aria-hidden="true" className="pointer-events-none fixed left-[-20000px] top-0 overflow-hidden"><div ref={cardRef} style={{ width: config.width, height: config.height }}>{artwork}</div></div>
    </section>
  </div>;
}

function ArteCampeonato({ tipo, campeonato, ano, dados, formato, parcial, rodadaParcial, zonas, usarDecimais, faseSelecionada }: {
  tipo: TipoArte;
  campeonato: string;
  ano?: number | string;
  dados: any[];
  formato: Formato;
  parcial: boolean;
  rodadaParcial?: number;
  zonas: ClassificationZone[];
  usarDecimais: boolean;
  faseSelecionada: number;
}) {
  const compact = formato === "square";
  return <div style={{ display: "grid", gridTemplateRows: compact ? "126px minmax(0,1fr) 84px" : "138px minmax(0,1fr) 92px" }} className="relative h-full w-full overflow-hidden bg-[#090b09] text-white">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_5%_0%,rgba(250,204,21,.18),transparent_27%),radial-gradient(circle_at_96%_82%,rgba(21,128,61,.15),transparent_30%)]" />
    <div className="absolute inset-0 opacity-[.09] [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:54px_54px]" />
    <header className="relative flex h-full items-center justify-between border-b border-white/10 px-[66px]"><div className="flex items-center gap-[14px]"><img src="/logo-atual.png" alt="Cartomitos" className="h-[48px] w-[48px] object-contain" /><strong className="text-[30px] font-black tracking-[-.04em]">CARTO<span className="text-yellow-400">MITOS</span></strong></div><div className={`flex items-center gap-[9px] text-[11px] font-black uppercase tracking-[.14em] ${parcial ? "text-emerald-400" : "text-yellow-400"}`}><i className={`h-[7px] w-[7px] rounded-full ${parcial ? "bg-emerald-400" : "bg-yellow-400"}`} />{parcial ? `Parcial · R${rodadaParcial || "—"}` : "Dados oficiais"}</div></header>
    {tipo === "classificacao" ? <ArteClassificacao tabela={dados} campeonato={campeonato} formato={formato} parcial={parcial} zonas={zonas} /> : <ArteMataMata partidas={dados} campeonato={campeonato} formato={formato} parcial={parcial} usarDecimais={usarDecimais} faseSelecionada={faseSelecionada} />}
    <footer className="relative grid h-full grid-cols-[minmax(0,1fr)_auto] items-center gap-[42px] border-t-[5px] border-yellow-400 bg-[#0d100d] px-[66px]"><div className="min-w-0"><span className="block text-[9px] font-bold uppercase tracking-[.16em] text-slate-600">Campeonato</span><strong className="mt-[4px] block text-[13px] font-black uppercase leading-tight tracking-[.07em] text-white">{campeonato}</strong></div><strong className="shrink-0 text-[13px] font-black uppercase tracking-[.12em] text-slate-400">Temporada {ano || "—"}</strong></footer>
  </div>;
}

function ArteClassificacao({ tabela, campeonato, formato, parcial, zonas }: { tabela: any[]; campeonato: string; formato: Formato; parcial: boolean; zonas: ClassificationZone[] }) {
  const compact = formato === "square";
  const story = formato === "story";
  const linhas = tabela.slice(0, 24);
  const altura = compact ? Math.min(38, Math.floor(690 / Math.max(linhas.length, 1))) : story ? Math.min(62, Math.floor(1370 / Math.max(linhas.length, 1))) : Math.min(48, Math.floor(900 / Math.max(linhas.length, 1)));
  return <main className={`relative content-start ${compact ? "px-[48px] pt-[28px]" : "px-[62px] pt-[38px]"}`}>
    <div className="mb-[22px] flex items-end justify-between"><div><span className="text-[11px] font-black uppercase tracking-[.18em] text-yellow-400">Classificação</span><h2 className={`${compact ? "text-[34px]" : "text-[42px]"} mt-[5px] max-w-[760px] font-black leading-[.98] tracking-[-.045em]`}>{campeonato}</h2></div><div className="text-right"><strong className="block font-mono text-[28px] font-black tabular-nums">{linhas.length}</strong><span className="text-[9px] font-bold uppercase tracking-[.14em] text-slate-500">clubes</span></div></div>
    <section className="overflow-hidden rounded-[26px] border-2 border-white/10 bg-[#101310]/95">
      <div className="grid h-[42px] grid-cols-[62px_minmax(0,1fr)_72px_repeat(5,54px)] items-center border-b border-yellow-400/25 bg-yellow-400/[.055] px-[16px] text-[9px] font-black uppercase tracking-[.14em] text-slate-500"><span>Pos.</span><span>Clube</span><span className="text-center text-yellow-400">Pts</span><span className="text-center">J</span><span className="text-center">V</span><span className="text-center">E</span><span className="text-center">D</span><span className="text-center">SP</span></div>
      {linhas.map((item, index) => {
        const time = Array.isArray(item.times) ? item.times[0] : item.times;
        const zona = findClassificationZone(zonas, index + 1);
        const movimento = Number(item.posOriginal || index + 1) - (index + 1);
        return <div key={item.id || item.time_id || index} style={{ height: `${altura}px` }} className="relative grid grid-cols-[62px_minmax(0,1fr)_72px_repeat(5,54px)] items-center border-b border-white/[.055] px-[16px] last:border-b-0">
          {zona && <i className="absolute bottom-[6px] left-0 top-[6px] w-[4px] rounded-r" style={{ backgroundColor: zona.cor }} />}
          <span className="font-mono text-[14px] font-black" style={{ color: zona?.cor || "#64748b" }}>{index + 1}º</span>
          <div className="flex min-w-0 items-center gap-[11px]"><img src={imagemCompartilhavel(time?.escudo)} crossOrigin="anonymous" alt={`Escudo ${time?.nome || "do clube"}`} className={`${compact ? "h-[25px] w-[25px]" : "h-[30px] w-[30px]"} shrink-0 object-contain`} /><strong className={`${compact ? "text-[12px]" : "text-[14px]"} min-w-0 whitespace-nowrap font-black`}>{time?.nome || "Clube"}</strong>{parcial && movimento !== 0 && <small className={`font-mono text-[8px] font-black ${movimento > 0 ? "text-emerald-400" : "text-red-400"}`}>{movimento > 0 ? `▲${movimento}` : `▼${Math.abs(movimento)}`}</small>}</div>
          <strong className="text-center font-mono text-[18px] font-black text-yellow-400">{item.pts ?? 0}</strong><span className="text-center font-mono text-[12px] text-slate-400">{item.pj ?? 0}</span><span className="text-center font-mono text-[12px] text-slate-400">{item.v ?? 0}</span><span className="text-center font-mono text-[12px] text-slate-400">{item.e ?? 0}</span><span className="text-center font-mono text-[12px] text-slate-400">{item.d ?? 0}</span><strong className={`text-center font-mono text-[12px] ${Number(item.sg || 0) > 0 ? "text-emerald-400" : Number(item.sg || 0) < 0 ? "text-red-400" : "text-slate-500"}`}>{Math.trunc(Number(item.sg || 0))}</strong>
        </div>;
      })}
    </section>
    {zonas.length > 0 && <div className="mt-[16px] flex flex-wrap gap-x-[18px] gap-y-[7px]">{zonas.map((zona, index) => <span key={`${zona.texto}-${index}`} className="flex items-center gap-[7px] text-[9px] font-bold uppercase tracking-[.08em] text-slate-500"><i className="h-[7px] w-[7px] rounded-sm" style={{ backgroundColor: zona.cor }} />{zona.texto}</span>)}</div>}
  </main>;
}

type TimeConfrontoArte = {
  id: number;
  nome: string;
  escudo?: string;
  pontos: number;
  pontosIda?: number | null;
  pontosVolta?: number | null;
};

type ConfrontoArte = {
  times: TimeConfrontoArte[];
  parcial: boolean;
  finalizado: boolean;
  idaEVolta?: boolean;
  projecao?: boolean;
};

function montarFases(partidas: any[]) {
  const rodadas = [...new Set(partidas.map((jogo) => Number(jogo.rodada)).filter(Boolean))].sort((a, b) => a - b);
  if (!rodadas.length) return [];
  const base = rodadas[0];
  const primeira = partidas.filter((jogo) => Number(jogo.rodada) === base || Number(jogo.rodada) === base + 1);
  const chavesIniciais = new Set(primeira.map((jogo) => [jogo.time_casa, jogo.time_visitante].sort().join("-")));
  const quantidadeInicial = Math.max(chavesIniciais.size, 1);
  const totalFases = Math.ceil(Math.log2(quantidadeInicial)) + 1;

  return Array.from({ length: totalFases }, (_, fase) => {
    const ida = base + fase * 2;
    const volta = ida + 1;
    const jogos = partidas.filter((jogo) => Number(jogo.rodada) === ida || Number(jogo.rodada) === volta);
    const avancamDireto = jogos
      .filter((jogo) => jogo.status === "bye")
      .map((jogo) => jogo.casa?.nome || "Clube")
      .filter(Boolean);
    const grupos = new Map<string, any[]>();
    jogos.filter((jogo) => jogo.status !== "bye" && jogo.time_casa && jogo.time_visitante).forEach((jogo) => {
      const chave = jogo.time_casa && jogo.time_visitante ? [jogo.time_casa, jogo.time_visitante].sort().join("-") : `jogo-${jogo.id}`;
      grupos.set(chave, [...(grupos.get(chave) || []), jogo]);
    });
    const confrontos: ConfrontoArte[] = Array.from(grupos.values()).map((partidasConfronto) => {
      const partidasOrdenadas = [...partidasConfronto].sort((a, b) => Number(a.rodada) - Number(b.rodada) || Number(a.id) - Number(b.id));
      const referencia = partidasOrdenadas[0];
      const ids = [referencia.time_casa, referencia.time_visitante];
      const times = ids.map((id) => {
        const aparicao = partidasOrdenadas.find((jogo) => jogo.time_casa === id || jogo.time_visitante === id) || referencia;
        const info = aparicao.time_casa === id ? aparicao.casa : aparicao.visitante;
        const pontuacoes = partidasOrdenadas.map((jogo) => {
          const valor = jogo.time_casa === id ? jogo.placar_casa : jogo.placar_visitante;
          return valor === null || valor === undefined ? null : Number(valor);
        });
        const pontos = pontuacoes.reduce<number>((total, valor) => total + Number(valor || 0), 0);
        return { id, nome: info?.nome || "A definir", escudo: info?.escudo, pontos, pontosIda: pontuacoes[0], pontosVolta: pontuacoes[1] };
      });
      return { times, idaEVolta: partidasOrdenadas.length > 1, parcial: partidasOrdenadas.some((jogo) => jogo.is_parcial), finalizado: partidasOrdenadas.every((jogo) => jogo.status === "finalizado" && !jogo.is_parcial) };
    });
    const esperado = Math.max(1, Math.ceil(quantidadeInicial / Math.pow(2, fase)));
    if (fase > 0) {
      while (confrontos.length < esperado) confrontos.push({ times: [{ id: 0, nome: "A definir", pontos: 0 }, { id: 0, nome: "A definir", pontos: 0 }], parcial: false, finalizado: false });
    }
    return { confrontos: confrontos.slice(0, esperado), esperado, avancamDireto };
  });
}

function nomeFase(quantidade: number) {
  if (quantidade <= 1) return "Final";
  if (quantidade === 2) return "Semifinal";
  if (quantidade === 4) return "Quartas";
  if (quantidade === 8) return "Oitavas";
  return `${quantidade * 2} clubes`;
}

function encontrarFaseEmAndamento(fases: ReturnType<typeof montarFases>) {
  return fases.findIndex((fase) => {
    const confrontosReais = fase.confrontos.filter((confronto) => confronto.times.every((time) => time.id));
    return confrontosReais.length > 0 && confrontosReais.some((confronto) => !confronto.finalizado);
  });
}

function nomeFaseArte(quantidade: number, indice: number, temFasePreliminar: boolean) {
  if (temFasePreliminar && indice === 0) return "1ª fase";
  if (temFasePreliminar && indice === 1) return "2ª fase";
  return nomeFase(quantidade);
}

function CardConfrontoArte({ confronto, compact, usarDecimais, mostrarIdaVolta = false, preencher = false }: { confronto: ConfrontoArte; compact: boolean; usarDecimais: boolean; mostrarIdaVolta?: boolean; preencher?: boolean }) {
  const formatar = (valor: number) => usarDecimais && !Number.isInteger(valor) ? valor.toFixed(1) : String(Math.trunc(valor));
  const formatarPerna = (valor?: number | null) => valor === null || valor === undefined ? "—" : formatar(valor);
  const [primeiro, segundo] = confronto.times;
  const placarComparavel = !confronto.projecao && (confronto.finalizado || confronto.parcial) && primeiro.pontos !== segundo.pontos;
  const primeiroVenceu = placarComparavel && primeiro.pontos > segundo.pontos;
  const segundoVenceu = placarComparavel && segundo.pontos > primeiro.pontos;
  const detalhar = mostrarIdaVolta && confronto.idaEVolta;

  return <article className={`relative flex h-full flex-col overflow-hidden rounded-[9px] border ${confronto.parcial ? "border-emerald-400/35 bg-emerald-400/[.055]" : confronto.finalizado ? "border-white/[.09] bg-[#111410]" : "border-white/[.06] bg-black/20"}`}>
    <i className={`absolute bottom-[6px] left-0 top-[6px] w-[2px] rounded-r ${confronto.parcial ? "bg-emerald-400" : confronto.finalizado ? "bg-yellow-400/60" : "bg-slate-700"}`} />
    <div className={`grid items-center ${preencher ? "min-h-[72px] flex-1 grid-cols-[42px_minmax(0,1fr)_auto_13px_auto_minmax(0,1fr)_42px] gap-[12px] px-[18px]" : compact ? "h-[31px] grid-cols-[16px_minmax(0,1fr)_auto_7px_auto_minmax(0,1fr)_16px] gap-[4px] px-[6px]" : "h-[42px] grid-cols-[23px_minmax(0,1fr)_auto_9px_auto_minmax(0,1fr)_23px] gap-[6px] px-[9px]"}`}>
      <img src={imagemCompartilhavel(primeiro.escudo)} crossOrigin="anonymous" alt={`Escudo ${primeiro.nome}`} className={`${preencher ? "h-[38px] w-[38px]" : compact ? "h-[15px] w-[15px]" : "h-[22px] w-[22px]"} object-contain`} />
      <strong className={`${preencher ? "text-[15px]" : compact ? "text-[7px]" : "text-[11px]"} min-w-0 truncate font-black tracking-[-.02em] ${primeiroVenceu ? "text-white" : "text-slate-400"}`}>{primeiro.nome}</strong>
      <span className={`${preencher ? "text-[22px]" : compact ? "text-[9px]" : "text-[14px]"} font-mono font-black tabular-nums ${primeiroVenceu ? "text-yellow-400" : primeiro.id && !confronto.projecao ? "text-white" : "text-slate-600"}`}>{primeiro.id && !confronto.projecao ? formatar(primeiro.pontos) : "—"}</span>
      <span className={`${preencher ? "text-[11px]" : compact ? "text-[6px]" : "text-[8px]"} text-center font-black text-slate-700`}>×</span>
      <span className={`${preencher ? "text-[22px]" : compact ? "text-[9px]" : "text-[14px]"} text-right font-mono font-black tabular-nums ${segundoVenceu ? "text-yellow-400" : segundo.id && !confronto.projecao ? "text-white" : "text-slate-600"}`}>{segundo.id && !confronto.projecao ? formatar(segundo.pontos) : "—"}</span>
      <strong className={`${preencher ? "text-[15px]" : compact ? "text-[7px]" : "text-[11px]"} min-w-0 truncate text-right font-black tracking-[-.02em] ${segundoVenceu ? "text-white" : "text-slate-400"}`}>{segundo.nome}</strong>
      <img src={imagemCompartilhavel(segundo.escudo)} crossOrigin="anonymous" alt={`Escudo ${segundo.nome}`} className={`${preencher ? "h-[38px] w-[38px]" : compact ? "h-[15px] w-[15px]" : "h-[22px] w-[22px]"} object-contain`} />
    </div>
    {detalhar && <div className={`${compact ? "h-[17px] px-[7px] text-[6px]" : "h-[23px] px-[10px] text-[8px]"} grid grid-cols-[1fr_auto_1fr] items-center border-t border-emerald-400/15 bg-black/15 font-mono font-black uppercase tracking-[.06em] text-slate-500`}><span>Ida {formatarPerna(primeiro.pontosIda)} · Volta <b className="text-emerald-400">{formatarPerna(primeiro.pontosVolta)}</b></span><span className="px-[8px] text-slate-700">Total</span><span className="text-right">Ida {formatarPerna(segundo.pontosIda)} · Volta <b className="text-emerald-400">{formatarPerna(segundo.pontosVolta)}</b></span></div>}
  </article>;
}

function vencedorProjetado(confronto?: ConfrontoArte) {
  if (!confronto) return null;
  const [primeiro, segundo] = confronto.times;
  if (!primeiro?.id || !segundo?.id || primeiro.pontos === segundo.pontos) return null;
  return primeiro.pontos > segundo.pontos ? primeiro : segundo;
}

function projetarFaseSeguinte(faseAtual: ReturnType<typeof montarFases>[number], proximaFase: ReturnType<typeof montarFases>[number]) {
  return Array.from({ length: proximaFase.esperado }, (_, indice): ConfrontoArte => {
    const primeiro = vencedorProjetado(faseAtual.confrontos[indice * 2]);
    const segundo = vencedorProjetado(faseAtual.confrontos[indice * 2 + 1]);
    const classificadoSemPlacar = (time: TimeConfrontoArte | null) => time
      ? { ...time, pontos: 0, pontosIda: null, pontosVolta: null }
      : { id: 0, nome: "A definir", pontos: 0 };
    return {
      times: [
        classificadoSemPlacar(primeiro),
        classificadoSemPlacar(segundo),
      ],
      parcial: true,
      finalizado: false,
      projecao: true,
    };
  });
}

function ArteMataMata({ partidas, campeonato, formato, parcial, usarDecimais, faseSelecionada }: { partidas: any[]; campeonato: string; formato: Formato; parcial: boolean; usarDecimais: boolean; faseSelecionada: number }) {
  const fases = montarFases(partidas);
  const compact = formato === "square";
  const story = formato === "story";
  const temFasePreliminar = (fases[0]?.avancamDireto?.length || 0) > 0;
  const indiceAtual = Math.min(Math.max(faseSelecionada, 0), Math.max(fases.length - 1, 0));
  const faseAtual = fases[indiceAtual];
  const proximaFase = fases[indiceAtual + 1];
  const confrontosProjetados = parcial && faseAtual && proximaFase ? projetarFaseSeguinte(faseAtual, proximaFase) : [];
  const totalCards = (faseAtual?.confrontos.length || 0) + confrontosProjetados.length;
  const temDetalhesIdaVolta = parcial && faseAtual?.confrontos.some((confronto) => confronto.idaEVolta);
  const colunas = story ? (totalCards > 12 ? 2 : 1) : totalCards > 8 || (temDetalhesIdaVolta && totalCards > 6) ? 2 : 1;
  const nomeAtual = faseAtual ? nomeFaseArte(faseAtual.esperado, indiceAtual, temFasePreliminar) : "Fase da copa";
  const nomeProxima = proximaFase ? nomeFaseArte(proximaFase.esperado, indiceAtual + 1, temFasePreliminar) : "Próxima fase";

  const linhasAtuais = Math.ceil((faseAtual?.confrontos.length || 0) / colunas);
  const linhasProjetadas = Math.ceil(confrontosProjetados.length / colunas);
  const totalLinhasStory = linhasAtuais + linhasProjetadas;
  const alturaLinhaStory = totalLinhasStory > 12 ? 72 : confrontosProjetados.length > 0 ? 94 : 112;

  return <main className={`relative overflow-hidden ${story ? "flex min-h-0 flex-col" : ""} ${compact ? "px-[48px] pt-[28px]" : "px-[66px] pt-[46px]"}`}>
    <div className={`${story ? "shrink-0" : ""} ${compact ? "mb-[24px]" : "mb-[38px]"}`}>
      <div className="flex items-center gap-[12px]"><span className={`${compact ? "text-[9px]" : "text-[11px]"} font-black uppercase tracking-[.18em] text-yellow-400`}>Fase eliminatória</span><i className="h-px flex-1 bg-gradient-to-r from-yellow-400/45 to-transparent" /></div>
      <div className="mt-[8px] flex items-end justify-between gap-[28px]"><h2 className={`${compact ? "text-[34px]" : "text-[46px]"} max-w-[790px] text-balance font-black leading-[.98] tracking-[-.045em]`}>{campeonato}</h2><div className="shrink-0 text-right"><strong className={`${compact ? "text-[12px]" : "text-[15px]"} block font-mono font-black uppercase text-white`}>Fase {String(indiceAtual + 1).padStart(2, "0")}</strong><span className={`${compact ? "text-[7px]" : "text-[9px]"} font-black uppercase tracking-[.14em] text-slate-600`}>de {String(fases.length).padStart(2, "0")}</span></div></div>
      <p className={`${compact ? "mt-[8px] text-[9px]" : "mt-[11px] text-[11px]"} font-bold uppercase tracking-[.13em] ${parcial ? "text-emerald-400" : "text-slate-500"}`}>{parcial ? "Cenário ao vivo com os resultados parciais" : "Resultados oficiais da fase selecionada"}</p>
    </div>

    {faseAtual && <section>
      <header className={`${compact ? "mb-[9px] pb-[9px]" : "mb-[14px] pb-[13px]"} flex items-end justify-between border-b border-yellow-400/25`}><div><span className={`${compact ? "text-[8px]" : "text-[10px]"} font-black uppercase tracking-[.16em] text-yellow-400`}>Fase selecionada</span><h3 className={`${compact ? "mt-[3px] text-[22px]" : "mt-[4px] text-[30px]"} font-black uppercase tracking-[-.035em] text-white`}>{nomeAtual}</h3></div><strong className={`${compact ? "text-[9px]" : "text-[11px]"} font-mono font-black uppercase text-slate-500`}>{faseAtual.confrontos.length} {faseAtual.confrontos.length === 1 ? "confronto" : "confrontos"}</strong></header>
      <div className="grid" style={{ gridTemplateColumns: `repeat(${colunas}, minmax(0, 1fr))`, gridTemplateRows: story ? `repeat(${Math.max(linhasAtuais, 1)}, ${alturaLinhaStory}px)` : undefined, gap: compact ? "7px" : "10px" }}>{faseAtual.confrontos.map((confronto, indice) => <CardConfrontoArte key={indice} confronto={confronto} compact={compact} usarDecimais={usarDecimais} mostrarIdaVolta={parcial} preencher={story} />)}</div>
      {faseAtual.avancamDireto.length > 0 && <div className={`${compact ? "mt-[9px] h-[30px] px-[10px] text-[8px]" : "mt-[14px] h-[42px] px-[14px] text-[11px]"} flex items-center justify-between rounded-[9px] border border-dashed border-yellow-400/25 bg-yellow-400/[.04] font-bold uppercase tracking-[.1em]`}><span className="text-yellow-400">Avanço direto</span><span className="text-slate-400">{faseAtual.avancamDireto.length} clubes já classificados para a fase seguinte</span></div>}
    </section>}

    {confrontosProjetados.length > 0 && <section className={compact ? "mt-[26px]" : "mt-[42px]"}>
      <header className={`${compact ? "mb-[9px] pb-[9px]" : "mb-[14px] pb-[13px]"} flex items-end justify-between border-b border-emerald-400/25`}><div><span className={`${compact ? "text-[8px]" : "text-[10px]"} font-black uppercase tracking-[.16em] text-emerald-400`}>Próxima fase</span><h3 className={`${compact ? "mt-[3px] text-[20px]" : "mt-[4px] text-[28px]"} font-black uppercase tracking-[-.035em] text-white`}>{nomeProxima}</h3></div><strong className={`${compact ? "text-[8px]" : "text-[10px]"} font-black uppercase tracking-[.12em] text-emerald-400`}>Projeção ao vivo</strong></header>
      <div className="grid" style={{ gridTemplateColumns: `repeat(${colunas}, minmax(0, 1fr))`, gridTemplateRows: story ? `repeat(${Math.max(linhasProjetadas, 1)}, ${alturaLinhaStory}px)` : undefined, gap: compact ? "7px" : "10px" }}>{confrontosProjetados.map((confronto, indice) => <CardConfrontoArte key={indice} confronto={confronto} compact={compact} usarDecimais={usarDecimais} preencher={story} />)}</div>
      <p className={`${compact ? "mt-[9px] text-[7px]" : "mt-[13px] text-[9px]"} font-bold uppercase tracking-[.12em] text-slate-600`}>Empates permanecem como “A definir” até o critério de desempate.</p>
    </section>}
  </main>;
}
