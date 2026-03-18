"use client";

import { useState } from "react";
import { Save, RefreshCw } from "lucide-react";

interface Props {
  onSave: () => Promise<void>;
}

export default function BotaoSalvarMudancas({ onSave }: Props) {
  const [isSaving, setIsSaving] = useState(false);

  async function handleClick() {
    setIsSaving(true);
    await onSave();
    setIsSaving(false);
  }

  return (
    <button
      onClick={handleClick}
      disabled={isSaving}
      className="bg-yellow-600 hover:bg-yellow-500 text-black font-black py-3 px-8 rounded-xl uppercase tracking-widest text-xs transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-yellow-900/20"
    >
      {isSaving ? (
        <>
          <RefreshCw className="animate-spin w-4 h-4" />
          Salvando...
        </>
      ) : (
        <>
          <Save className="w-4 h-4" />
          Salvar Alterações
        </>
      )}
    </button>
  );
}