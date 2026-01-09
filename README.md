# ⚽ Cartomitos

**Cartomitos** é uma aplicação web desenvolvida para gerenciar ligas, campeonatos e preservar o histórico de estatísticas de ligas de Fantasy Football (focada em Cartola FC).

O sistema permite visualizar rankings, chaves de mata-mata, recordes históricos e possui uma área administrativa completa para gestão dos dados.

## 🚀 Tecnologias Utilizadas

Este projeto foi desenvolvido com as tecnologias mais modernas do ecossistema React:

-   **[Next.js 14+](https://nextjs.org/)** - Framework React (App Router)
-   **[TypeScript](https://www.typescriptlang.org/)** - Tipagem estática
-   **[Tailwind CSS](https://tailwindcss.com/)** - Estilização utilitária
-   **[Supabase](https://supabase.com/)** - Banco de dados (PostgreSQL) e Autenticação
-   **[Lucide React](https://lucide.dev/)** - Ícones

## ✨ Funcionalidades

### Publico
-   🏆 **Rankings e Tabelas:** Visualização de classificações de pontos corridos.
-   ⚔️ **Mata-Mata:** Árvores de torneios (Brackets) visuais para campeonatos eliminatórios.
-   📜 **Histórico:** Acesso aos dados e campeões de temporadas anteriores (organizado por ano).
-   🏅 **Recordes e Campeões:** Hall da fama com os maiores pontuadores e vencedores.

### Administrativo (Área Restrita)
-   🔒 Login seguro via Supabase Auth.
-   ⚙️ Gerenciamento de Ligas e Times.
-   ⚙️ Criação e atualização de Campeonatos.
-   ⚙️ Sorteio e definição de chaves de Mata-mata.
-   ⚙️ Ferramentas para salvar histórico e recordes.

## 📦 Como rodar o projeto localmente

### Pré-requisitos
-   Node.js instalado (versão 18 ou superior).
-   Uma conta no Supabase (com um projeto criado).

### Passo a passo

1.  **Clone o repositório:**
    ```bash
    git clone [https://github.com/dudusantz/cartomitos.git](https://github.com/dudusantz/cartomitos.git)
    cd cartomitos
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    # ou
    yarn install
    ```

3.  **Configure as Variáveis de Ambiente:**
    Crie um arquivo `.env.local` na raiz do projeto e adicione suas credenciais do Supabase:

    ```env
    NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase_aqui
    NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima_aqui
    ```

4.  **Execute o servidor de desenvolvimento:**
    ```bash
    npm run dev
    ```

5.  **Acesse o projeto:**
    Abra [http://localhost:3000](http://localhost:3000) no seu navegador.

## 📂 Estrutura do Projeto

-   `/app`: Páginas e rotas do Next.js (App Router).
    -   `/admin`: Rotas protegidas para administração.
    -   `/campeonatos`: Visualização de ligas e mata-mata.
    -   `/historico`: Arquivos de anos anteriores.
-   `/components`: Componentes reutilizáveis (UI, Modais, Tabelas).
-   `/lib`: Configurações de serviços externos (Cliente Supabase).

## 🤝 Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir uma *issue* ou enviar um *pull request*.

## 📝 Licença

Este projeto está sob a licença MIT.
