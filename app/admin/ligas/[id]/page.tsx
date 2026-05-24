"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";
import {
  listarTimesDoCampeonato,
  listarTodosTimes,
  atualizarConfiguracaoLiga,
  atualizarCampeonato,
  gerarMataMataCopa,
  buscarTabelaGrupos,
  buscarPodium,
} from "@/app/actions";
import { supabase } from "@/lib/supabase";
import { ModalConfirmacao } from "@/app/components/ModalConfirmacao";
import BotaoFinalizarCampeonato from "@/app/components/BotaoFinalizarCampeonato";
import { Trophy, Calendar, Medal, AlertCircle, Save, RefreshCw, X } from "lucide-react";

import PainelPontosCorridos from "@/app/components/PainelPontosCorridos";
import PainelMataMata from "@/app/components/PainelMataMata";
import PainelFaseGrupos from "@/app/components/PainelFaseGrupos";
import PainelTimes from "@/app/components/PainelTimes";
import PainelGrid from "@/app/components/PainelGrid";

export default function GerenciarLiga() {
  const { id } = useParams();
  const campeonatoId = Number(id);

  const [liga, setLiga] = useState<any>(null);
  const [timesLiga, setTimesLiga] = useState<any[]>([]);
  const [todosTimes, setTodosTimes] = useState<any[]>([]);

  const [tabAtiva, setTabAtiva] = useState<string>("times");
  const [finalUnica, setFinalUnica] = useState(false);
  const [redirFeito, setRedirFeito] = useState(false);

  const [pote1, setPote1] = useState<any[]>([]);
  const [pote2, setPote2] = useState<any[]>([]);
  const [podium, setPodium] = useState<any[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<any>({});
  const [mmKey, setMmKey] = useState(0);

  // Valores editáveis do formulário
  const [nomeLiga, setNomeLiga] = useState("");
  const [anoLiga, setAnoLiga] = useState<number>(new Date().getFullYear());
  const [isPaga, setIsPaga] = useState(false);
  const [usarDecimais, setUsarDecimais] = useState(false);
  
  // NOVOS CAMPOS DINÂMICOS
  const [mensagemAtualizacao, setMensagemAtualizacao] = useState("");
  const [configZonas, setConfigZonas] = useState<any[]>([]);
  
  const [isSaving, setIsSaving] = useState(false);

  // Valores originais para detectar alterações
  const [origNome, setOrigNome] = useState("");
  const [origAno, setOrigAno] = useState<number>(new Date().getFullYear());
  const [origIsPaga, setOrigIsPaga] = useState(false);
  const [origUsarDecimais, setOrigUsarDecimais] = useState(false);
  const [origFinalUnica, setOrigFinalUnica] = useState(false);
  const [origMensagem, setOrigMensagem] = useState("");
  const [origConfigZonas, setOrigConfigZonas] = useState<any[]>([]);

  // Detecta se há alterações comparando com originais
  const temAlteracoes =
    nomeLiga !== origNome ||
    anoLiga !== origAno ||
    isPaga !== origIsPaga ||
    usarDecimais !== origUsarDecimais ||
    finalUnica !== origFinalUnica ||
    mensagemAtualizacao !== origMensagem ||
    JSON.stringify(configZonas) !== JSON.stringify(origConfigZonas);

  useEffect(() => {
    if (id) carregarDados();
  }, [id]);

  useEffect(() => {
    const tipo = getTipoNormalizado(liga?.tipo);
    if (tabAtiva === "jogos" && tipo === "copa") {
      atualizarPotes();
    }
  }, [tabAtiva, liga]);

  function getTipoNormalizado(tipoBruto: string | undefined) {
    if (!tipoBruto) return "";
    return tipoBruto.toLowerCase().replace("-", "_");
  }

  async function carregarDados() {
    const { data } = await supabase
      .from("campeonatos")
      .select("*")
      .eq("id", campeonatoId)
      .single();

    setLiga(data);
    setFinalUnica(data?.final_unica || false);
    setNomeLiga(data?.nome || "");
    setAnoLiga(data?.ano || new Date().getFullYear());
    setIsPaga(data?.is_paga || false);
    setUsarDecimais(data?.usar_decimais || false);
    
    // Carrega zonas e mensagem
    setMensagemAtualizacao(data?.mensagem_atualizacao || "");
    setConfigZonas(data?.config_zonas || []);

    // Salva os originais
    setOrigNome(data?.nome || "");
    setOrigAno(data?.ano || new Date().getFullYear());
    setOrigIsPaga(data?.is_paga || false);
    setOrigUsarDecimais(data?.usar_decimais || false);
    setOrigFinalUnica(data?.final_unica || false);
    setOrigMensagem(data?.mensagem_atualizacao || "");
    setOrigConfigZonas(data?.config_zonas || []);

    if (data && !data.ativo) {
      const p = await buscarPodium(campeonatoId);
      setPodium(p);
    }

    const _times = await listarTimesDoCampeonato(campeonatoId);
    setTimesLiga(_times);
    setTodosTimes(await listarTodosTimes());

    const tipo = getTipoNormalizado(data?.tipo);
    if (tipo === "copa") await atualizarPotes();

    if (!redirFeito && data) {
      if (tipo === "copa") setTabAtiva("grupos");
      else if (tipo === "pontos_corridos") setTabAtiva("classificacao");
      else if (tipo === "mata_mata") setTabAtiva("jogos");
      else if (tipo === "grid") setTabAtiva("grid");
      setRedirFeito(true);
    }
  }

  async function atualizarPotes() {
    const grupos = await buscarTabelaGrupos(campeonatoId);
    processarClassificados(grupos);
  }

  function processarClassificados(grupos: any) {
    const p1: any[] = [];
    const p2: any[] = [];
    if (grupos) {
      Object.keys(grupos).forEach((letra) => {
        const time1 = grupos[letra][0];
        const time2 = grupos[letra][1];
        if (time1) p1.push({ ...time1, gp_origem: letra });
        if (time2) p2.push({ ...time2, gp_origem: letra });
      });
    }
    p1.sort((a, b) => b.pts - a.pts || b.v - a.v || b.sp - a.sp || b.pp - a.pp);
    setPote1(p1);
    setPote2(p2);
  }

  async function handleGerarCopa() {
    setModalConfig({
      titulo: "Gerar Chave Final",
      descricao: "O sistema usará as regras: 1º vs 2º, trava de grupos e melhores campanhas em lados opostos. Confirmar?",
      onConfirm: async () => {
        const res = await gerarMataMataCopa(campeonatoId);
        if (res.success) {
          toast.success(res.msg);
          await carregarDados();
          setMmKey((prev) => prev + 1);
          setModalOpen(false);
        } else {
          toast.error(res.msg);
        }
      },
      corBotao: "green",
      textoBotao: "Sim, Gerar",
    });
    setModalOpen(true);
  }

  async function handleSalvarConfiguracoes() {
    if (!nomeLiga.trim()) {
      toast.error("O nome da liga não pode estar vazio.");
      return;
    }

    setIsSaving(true);

    const [resGeral, resConfig] = await Promise.all([
      // Passamos a mensagemAtualizacao e o configZonas para a nova função
      atualizarCampeonato(
        campeonatoId, nomeLiga.trim(), anoLiga, liga.tipo, isPaga, usarDecimais, 
        undefined, undefined, // Ignoramos os campos velhos de qtd
        mensagemAtualizacao, configZonas
      ),
      atualizarConfiguracaoLiga(campeonatoId, finalUnica),
    ]);

    setIsSaving(false);

    if (resGeral.success && resConfig.success) {
      toast.success("Configurações salvas com sucesso!");

      setLiga((prev: any) => ({ 
          ...prev, 
          nome: nomeLiga.trim(), 
          ano: anoLiga, 
          is_paga: isPaga, 
          usar_decimais: usarDecimais, 
          final_unica: finalUnica,
          mensagem_atualizacao: mensagemAtualizacao,
          config_zonas: configZonas
      }));

      // Sincroniza os originais
      setOrigNome(nomeLiga.trim());
      setOrigAno(anoLiga);
      setOrigIsPaga(isPaga);
      setOrigUsarDecimais(usarDecimais);
      setOrigFinalUnica(finalUnica);
      setOrigMensagem(mensagemAtualizacao);
      setOrigConfigZonas(configZonas);
    } else {
      toast.error("Erro ao atualizar algumas configurações.");
    }
  }

  if (!liga) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4 animate-fadeIn">
          <div className="w-12 h-12 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin"></div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Carregando...</p>
        </div>
      </div>
    );
  }

  const tipoLiga = getTipoNormalizado(liga.tipo);

  // Lógica de compatibilidade para exibir potes na Copa (baseado na primeira zona verde se existir)
  const qtdClassificadosCopa = configZonas.length > 0 ? configZonas[0].posicao : 2;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-yellow-500/30">
      <ModalConfirmacao
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={modalConfig.onConfirm}
        titulo={modalConfig.titulo || ""}
        descricao={modalConfig.descricao || ""}
        corBotao={modalConfig.corBotao || "blue"}
        textoBotao={modalConfig.textoBotao || "Confirmar"}
      />

      {/* HEADER */}
      <div className="p-8 border-b border-gray-800 bg-[#080808]">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-end gap-6">
          <div className="flex-1">
            <Link href="/admin/ligas" className="text-gray-500 text-xs font-bold hover:text-white uppercase mb-2 block transition">
              ← Voltar
            </Link>
            <div className="flex items-center gap-4">
              <h1 className="text-4xl font-black tracking-tighter text-white">
                {liga?.nome}
              </h1>
              <div className="ml-4">
                <BotaoFinalizarCampeonato campeonatoId={campeonatoId} />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] bg-gray-800 border border-gray-700 px-3 py-1 rounded-full uppercase font-bold text-gray-300 tracking-widest">
                {tipoLiga.replace("_", " ")}
              </span>
              {!liga?.ativo && (
                <span className="text-[10px] bg-red-900/30 border border-red-500/30 text-red-400 px-3 py-1 rounded-full uppercase font-bold tracking-widest">
                  Finalizado
                </span>
              )}
            </div>
          </div>

          {/* Abas de Navegação */}
          <div className="flex gap-2 bg-[#121212] p-1.5 rounded-xl border border-gray-800 shadow-xl overflow-x-auto max-w-full">
            {tipoLiga === "pontos_corridos" && (
              <button
                onClick={() => setTabAtiva("classificacao")}
                className={`px-5 py-2.5 rounded-lg font-bold text-xs uppercase transition tracking-wider whitespace-nowrap ${tabAtiva === "classificacao" ? "bg-blue-600 text-white shadow-lg" : "text-gray-500 hover:text-white hover:bg-white/5"}`}
              >
                Tabela
              </button>
            )}

            {tipoLiga === "grid" && (
              <button
                onClick={() => setTabAtiva("grid")}
                className={`px-5 py-2.5 rounded-lg font-bold text-xs uppercase transition tracking-wider whitespace-nowrap ${tabAtiva === "grid" ? "bg-yellow-600 text-black shadow-lg" : "text-gray-500 hover:text-white hover:bg-white/5"}`}
              >
                Ranking Geral
              </button>
            )}

            {tipoLiga === "copa" && (
              <button
                onClick={() => setTabAtiva("grupos")}
                className={`px-5 py-2.5 rounded-lg font-bold text-xs uppercase transition tracking-wider whitespace-nowrap ${tabAtiva === "grupos" ? "bg-yellow-600 text-black shadow-lg" : "text-gray-500 hover:text-white hover:bg-white/5"}`}
              >
                Grupos
              </button>
            )}

            {(tipoLiga === "mata_mata" || tipoLiga === "copa") && (
              <button
                onClick={() => setTabAtiva("jogos")}
                className={`px-5 py-2.5 rounded-lg font-bold text-xs uppercase transition tracking-wider whitespace-nowrap ${tabAtiva === "jogos" ? "bg-blue-600 text-white shadow-lg" : "text-gray-500 hover:text-white hover:bg-white/5"}`}
              >
                {tipoLiga === "mata_mata" ? "Chaveamento" : "Mata-Mata"}
              </button>
            )}

            <button
              onClick={() => setTabAtiva("times")}
              className={`px-5 py-2.5 rounded-lg font-bold text-xs uppercase transition tracking-wider whitespace-nowrap ${tabAtiva === "times" ? "bg-gray-700 text-white shadow-lg" : "text-gray-500 hover:text-white hover:bg-white/5"}`}
            >
              Times
            </button>

            <button
              onClick={() => setTabAtiva("config")}
              className={`px-5 py-2.5 rounded-lg font-bold text-xs uppercase transition tracking-wider whitespace-nowrap flex items-center gap-1.5 ${tabAtiva === "config" ? "bg-gray-700 text-white shadow-lg" : "text-gray-500 hover:text-white hover:bg-white/5"}`}
            >
              Config
              {temAlteracoes && (
                <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="p-8 max-w-[1600px] mx-auto">
        {["mata_mata", "copa", "pontos_corridos", "grid"].indexOf(tipoLiga) === -1 && (
          <div className="mb-6 bg-red-500/10 border border-red-500/50 p-4 rounded-xl flex items-center gap-3 text-red-200">
            <AlertCircle />
            <div>
              <strong className="block text-red-100">Tipo de Liga Desconhecido</strong>
              O tipo está salvo como <code>{liga.tipo}</code> no banco de dados.
            </div>
          </div>
        )}

        {/* CARD DE CAMPEÕES */}
        {!liga?.ativo && podium.length > 0 && (
          <div className="bg-gradient-to-br from-[#1a1a1a] to-black p-8 rounded-3xl border border-yellow-600/30 relative overflow-hidden mb-10 shadow-2xl">
            <div className="absolute top-0 right-0 p-10 opacity-10">
              <Trophy size={180} />
            </div>
            <div className="flex flex-col md:flex-row gap-8 items-center relative z-10">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 text-yellow-500">
                  <Trophy size={20} />
                  <span className="font-bold uppercase tracking-widest text-xs">Campeonato Encerrado</span>
                </div>
                <h2 className="text-3xl font-black text-white mb-2">Galeria de Honra</h2>
                {liga.data_fim && (
                  <p className="text-gray-500 text-sm flex items-center gap-2">
                    <Calendar size={14} />
                    Finalizado em:{" "}
                    {new Date(liga.data_fim).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                  </p>
                )}
              </div>
              <div className="flex gap-4 items-end">
                {podium[1] && (
                  <div className="flex flex-col items-center gap-2 mb-4">
                    <div className="w-16 h-16 rounded-full border-2 border-gray-400 p-1 bg-black">
                      <img src={podium[1].escudo} className="w-full h-full object-contain" />
                    </div>
                    <div className="text-center">
                      <span className="block text-gray-400 font-bold text-xs">2º Lugar</span>
                      <span className="text-gray-300 font-bold text-sm max-w-[100px] truncate block">{podium[1].nome}</span>
                    </div>
                  </div>
                )}
                {podium[0] && (
                  <div className="flex flex-col items-center gap-2 relative">
                    <Medal className="text-yellow-400 absolute -top-6 animate-bounce" size={24} />
                    <div className="w-24 h-24 rounded-full border-4 border-yellow-500 p-1 bg-black shadow-[0_0_30px_rgba(234,179,8,0.3)]">
                      <img src={podium[0].escudo} className="w-full h-full object-contain" />
                    </div>
                    <div className="text-center">
                      <span className="block text-yellow-500 font-black text-sm uppercase tracking-wider">Campeão</span>
                      <span className="text-white font-bold text-lg max-w-[140px] truncate block">{podium[0].nome}</span>
                    </div>
                  </div>
                )}
                {podium[2] && (
                  <div className="flex flex-col items-center gap-2 mb-2">
                    <div className="w-14 h-14 rounded-full border-2 border-amber-700 p-1 bg-black">
                      <img src={podium[2].escudo} className="w-full h-full object-contain" />
                    </div>
                    <div className="text-center">
                      <span className="block text-amber-700 font-bold text-xs">3º Lugar</span>
                      <span className="text-gray-400 font-bold text-xs max-w-[90px] truncate block">{podium[2].nome}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PAINÉIS */}
        {tabAtiva === "classificacao" && tipoLiga === "pontos_corridos" && (
          <PainelPontosCorridos campeonatoId={campeonatoId} times={timesLiga} />
        )}

        {tabAtiva === "grid" && tipoLiga === "grid" && (
          <PainelGrid campeonatoId={campeonatoId} />
        )}

        {tabAtiva === "jogos" && tipoLiga === "mata_mata" && (
          <PainelMataMata
            key={mmKey}
            campeonatoId={campeonatoId}
            rodadasCorte={liga.rodada_inicial_mata_mata || 0}
            bloquearGerador={false}
            isCopa={false}
          />
        )}

        {tabAtiva === "jogos" && tipoLiga === "copa" && (
          <div className="animate-fadeIn">
            <div className="mb-8 bg-[#121212] p-6 rounded-3xl border border-gray-800">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white uppercase tracking-wider mb-2">Fase Final</h3>
                  <p className="text-gray-400 text-xs">Regras: 1º vs 2º Colocado.</p>
                </div>
                {liga?.ativo && (
                  <button
                    onClick={handleGerarCopa}
                    className="bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black px-6 py-4 rounded-xl text-xs font-black uppercase transition shadow-lg shadow-yellow-900/20 tracking-widest flex items-center gap-2"
                  >
                    <span>⚡</span> Gerar Chave Final
                  </button>
                )}
              </div>
              {pote1.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-800">
                  <div className="bg-black/40 rounded-xl p-4 border border-gray-800/50">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">Pote 1</span>
                    </div>
                    <div className="space-y-1">
                      {pote1.map((t, idx) => (
                        <div key={t.time_id} className={`flex justify-between items-center p-2 rounded ${idx < qtdClassificadosCopa ? "bg-yellow-500/10 border border-yellow-500/30" : "bg-white/5"}`}>
                          <div className="flex items-center gap-3">
                            <span className={`font-mono font-bold text-[10px] w-4 ${idx < qtdClassificadosCopa ? "text-yellow-500" : "text-gray-500"}`}>#{idx + 1}</span>
                            <img src={t.times?.escudo || "/shield-placeholder.png"} className="w-5 h-5 object-contain" />
                            <span className="text-xs font-bold text-gray-300">{t.times?.nome}</span>
                          </div>
                          <div className="flex gap-3 text-[10px] font-mono text-gray-500">
                            <span>Gr.{t.gp_origem}</span>
                            <span className="text-white font-bold">{t.pts}pts</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-black/40 rounded-xl p-4 border border-gray-800/50">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">Pote 2</span>
                    </div>
                    <div className="space-y-1">
                      {pote2.map((t) => (
                        <div key={t.time_id} className="flex justify-between items-center p-2 rounded bg-white/5">
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-[10px] w-4 text-gray-500">-</span>
                            <img src={t.times?.escudo || "/shield-placeholder.png"} className="w-5 h-5 object-contain" />
                            <span className="text-xs font-bold text-gray-300">{t.times?.nome}</span>
                          </div>
                          <div className="flex gap-3 text-[10px] font-mono text-gray-500">
                            <span>Gr.{t.gp_origem}</span>
                            <span className="text-white font-bold">{t.pts}pts</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <PainelMataMata key={mmKey} campeonatoId={campeonatoId} rodadasCorte={6} bloquearGerador={true} isCopa={true} />
          </div>
        )}

        {tabAtiva === "grupos" && (
          <PainelFaseGrupos campeonatoId={campeonatoId} times={timesLiga} />
        )}

        {tabAtiva === "times" && (
          <PainelTimes campeonatoId={campeonatoId} ativo={liga.ativo} timesLiga={timesLiga} todosTimes={todosTimes} aoAtualizar={carregarDados} />
        )}

        {tabAtiva === "config" && (
          <div className="bg-[#121212] p-8 rounded-3xl border border-gray-800 max-w-4xl mx-auto animate-fadeIn space-y-8">
            <h3 className="text-xl font-bold text-white uppercase tracking-wider border-b border-gray-800 pb-4">
              Configurações Gerais
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nome da Liga</label>
                <input
                  type="text"
                  value={nomeLiga}
                  onChange={e => setNomeLiga(e.target.value)}
                  className="bg-[#080808] border border-gray-700 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 p-3 rounded-xl text-white outline-none transition"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ano de Referência</label>
                <input
                  type="number"
                  value={anoLiga}
                  onChange={e => setAnoLiga(Number(e.target.value))}
                  className="bg-[#080808] border border-gray-700 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 p-3 rounded-xl text-white outline-none transition"
                />
              </div>
            </div>

            {/* Mensagem do Modal */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mensagem de Confirmação (Ao Atualizar)</label>
              <textarea
                value={mensagemAtualizacao}
                onChange={e => setMensagemAtualizacao(e.target.value)}
                className="bg-[#080808] border border-gray-700 p-3 rounded-xl text-white outline-none h-20 text-sm focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition"
                placeholder="Ex: Você deseja validar os resultados da rodada X agora?"
              />
            </div>

            {/* ZONAS DE CLASSIFICAÇÃO DINÂMICAS */}
            <div className="space-y-4 pt-6 border-t border-gray-800">
              <div className="flex justify-between items-center">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Zonas de Classificação e Legendas</label>
                  <span className="text-[10px] text-gray-500">Defina as cores e legendas das posições na tabela pública.</span>
                </div>
                <button 
                  onClick={() => setConfigZonas([...configZonas, { posicao: 1, cor: "#22c55e", texto: "" }])}
                  className="text-[10px] bg-blue-600 px-4 py-2 rounded-xl font-bold uppercase tracking-wider hover:bg-blue-500 transition shadow-lg shadow-blue-900/20"
                >
                  + Adicionar Zona
                </button>
              </div>

              <div className="space-y-3">
                {configZonas.length === 0 && (
                  <div className="text-center p-6 border border-dashed border-gray-800 rounded-xl text-gray-500 text-xs">
                    Nenhuma zona de classificação configurada. A tabela ficará sem cores.
                  </div>
                )}
                {configZonas.map((zona, index) => (
                  <div key={index} className="flex items-center gap-4 bg-black/40 p-4 rounded-xl border border-gray-800 transition hover:border-gray-700">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[9px] text-gray-500 font-bold uppercase">Cor</span>
                      <input 
                        type="color" 
                        value={zona.cor} 
                        onChange={e => {
                          const novas = [...configZonas];
                          novas[index].cor = e.target.value;
                          setConfigZonas(novas);
                        }}
                        className="w-8 h-8 bg-transparent border-none cursor-pointer rounded overflow-hidden"
                      />
                    </div>
                    
                    <div className="flex flex-col">
                      <span className="text-[9px] text-gray-500 font-bold uppercase">Até Pos.</span>
                      <input 
                        type="number" 
                        min="1"
                        value={zona.posicao} 
                        onChange={e => {
                          const novas = [...configZonas];
                          novas[index].posicao = Number(e.target.value);
                          setConfigZonas(novas);
                        }}
                        className="w-16 bg-[#1a1a1a] border border-gray-800 text-white font-bold outline-none rounded-lg p-2 text-center focus:border-blue-500"
                      />
                    </div>

                    <div className="flex flex-col flex-1">
                      <span className="text-[9px] text-gray-500 font-bold uppercase">Nome da Zona / Legenda</span>
                      <input 
                        type="text" 
                        placeholder="Ex: Classificados Libertadores" 
                        value={zona.texto}
                        onChange={e => {
                          const novas = [...configZonas];
                          novas[index].texto = e.target.value;
                          setConfigZonas(novas);
                        }}
                        className="w-full bg-[#1a1a1a] border border-gray-800 text-sm text-gray-200 outline-none rounded-lg p-2 focus:border-blue-500"
                      />
                    </div>

                    <button 
                      onClick={() => setConfigZonas(configZonas.filter((_, i) => i !== index))}
                      className="text-red-500 hover:text-red-400 p-2 mt-4 transition"
                      title="Remover Zona"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-6 border-t border-gray-800">
              <ToggleVisual
                label="Final em Jogo Único"
                descricao="A final será decidida em apenas uma partida."
                checked={finalUnica}
                onChange={setFinalUnica}
                cor="yellow"
              />
              <ToggleVisual
                label="Liga Paga (Apostas)"
                descricao="Indica se este campeonato envolve dinheiro/premiação."
                checked={isPaga}
                onChange={setIsPaga}
                cor="green"
              />
              <ToggleVisual
                label="Pontuação Exata (Decimais)"
                descricao="Usa casas decimais (ex: 45.30) ao invés de arredondar."
                checked={usarDecimais}
                onChange={setUsarDecimais}
                cor="blue"
              />
            </div>

            <div className="flex justify-end items-center gap-4 pt-8 border-t border-gray-800">
              {temAlteracoes && !isSaving && (
                <span className="text-[10px] text-yellow-500/80 font-bold uppercase tracking-wider animate-pulse">
                  ● Alterações não salvas
                </span>
              )}
              <button
                onClick={handleSalvarConfiguracoes}
                disabled={isSaving || !temAlteracoes}
                className={`flex items-center gap-2 py-3 px-8 rounded-xl font-black text-xs uppercase tracking-widest transition
                  ${temAlteracoes && !isSaving
                    ? "bg-yellow-600 hover:bg-yellow-500 text-black shadow-lg shadow-yellow-900/20 cursor-pointer active:scale-[0.98]"
                    : "bg-gray-800 text-gray-600 cursor-not-allowed opacity-60"
                  }`}
              >
                {isSaving
                  ? <><RefreshCw size={14} className="animate-spin" /> Salvando...</>
                  : <><Save size={14} /> {temAlteracoes ? "Salvar Alterações" : "Sem alterações"}</>
                }
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface ToggleVisualProps {
  label: string;
  descricao: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  cor: "yellow" | "green" | "blue";
}

const toggleBg: Record<string, string> = {
  yellow: "bg-yellow-500",
  green: "bg-green-500",
  blue: "bg-blue-500",
};

function ToggleVisual({ label, descricao, checked, onChange, cor }: ToggleVisualProps) {
  return (
    <div
      onClick={() => onChange(!checked)}
      className="flex justify-between items-center p-4 bg-[#080808] hover:bg-[#1a1a1a] rounded-xl border border-gray-800 transition cursor-pointer select-none"
    >
      <div>
        <span className="font-bold block text-white text-sm">{label}</span>
        <span className="text-gray-500 text-xs mt-1 block">{descricao}</span>
      </div>
      <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ml-4 ${checked ? toggleBg[cor] : "bg-gray-700"}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${checked ? "translate-x-5" : "translate-x-0"}`} />
      </div>
    </div>
  );
}