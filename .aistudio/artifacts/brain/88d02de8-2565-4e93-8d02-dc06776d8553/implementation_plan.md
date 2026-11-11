# Plano Revisado: Central de Notificações, Correção do Login Google & Reorganização Intuitiva

Plano arquitetural revisado para corrigir o botão de notificações (transformando-o em uma Central de Notificações interativa), eliminar a falha de login do Google ("The requested action is invalid") e reorganizar as funcionalidades do aplicativo em categorias claras, eliminando todas as instruções técnicas e manuais de desenvolvedor.

---

### Decisões do Usuário & Revisões Confirmadas

> [!IMPORTANT]
> - **Botão de Notificação**: O botão de sino no topo passará a abrir um painel/modal completo de Notificações & Lembretes (exibindo tarefas com prazo vencendo hoje, compromissos da agenda, status de leitura e botão para ativar ou testar alertas silenciosos).
> - **Categorização Intuitiva & Foco no Usuário**: Reestruturar a interface para conter apenas funcionalidades reais de organização pessoal (sem commits de código, sem comandos de terminal `git`, sem checklists de backend/CORS, sem campos de token de programador).
> - **Correção do Login Google**: Eliminação do parâmetro `access_type: 'offline'` no `GoogleAuthProvider` para resolver a rejeição `"The requested action is invalid"`, com captura suave de cancelamento sem travamentos.

---

### 1. Visão Geral & Nova Estrutura de Funcionalidades

O aplicativo passa a ter uma navegação 100% voltada ao uso cotidiano, dividida em 5 pilares intuitivos:

1. **Início (Visão Geral)**: Visão unificada do dia, resumo de tarefas pendentes, saldo financeiro do mês e lembretes imediatos.
2. **Tarefas & Hábitos**: Gerenciamento de afazeres com prioridades, categorias de vida (Trabalho, Pessoal, Saúde, Finanças), subtarefas e filtros de conclusão.
3. **Finanças & Metas**: Controle de receitas e despesas, leitura inteligente de notas fiscais via IA (Google Gemini OCR), limites de orçamento mensal e metas com progresso visual.
4. **Agenda & Prazos**: Calendário dinâmico com sincronização bidirecional do Google Agenda e visualização diária/semanal.
5. **Preferências & Backup**: Painel limpo sem ruídos técnicos contendo apenas:
   - Aparência (Modo Escuro / Claro);
   - Notificações de Prazos;
   - Nuvem Google Drive (Sincronização com 1 clique e status da conta);
   - Backup em Arquivo JSON (Exportar e importar dados com total privacidade);
   - Versão do App com checagem simples de atualização direta.

---

### 2. Experiência do Usuário & Design Visual

#### A. Central de Notificações Interativa (Correção do Botão de Sino)
- Ao clicar no ícone de sino no cabeçalho:
  - Abre um modal / gaveta suspenso elegante com animação suave.
  - **Conteúdo**:
    - Indicador do status das notificações do navegador (com botão para conceder permissão se pendente).
    - Lista de lembretes ativos: tarefas que vencem hoje com hora marcada e eventos da Google Agenda próximos.
    - Ações rápidas: "Marcar todas como lidas", "Limpar lista" e "Emitir lembrete de teste".
    - Estado vazio acolhedor: "Tudo em ordem! Nenhuma notificação ou prazo pendente no momento."

#### B. Eliminação de Poluição e Jargões Técnicos
- **Remover**:
  - O modal antigo `InstallGuideModal` que exibia comandos de terminal `git init`, `git add`, referências a Gradle, Node.js e workflows de CI/CD.
  - A aba de commits de desenvolvimento com hashes SHA e o campo de Personal Access Token da tela de Ajustes.
  - Menções a códigos de erro internos ou endpoints de servidor (`POST /api/...`).
- **Substituir por**:
  - Dica simples e amigável caso o usuário queira instalar no celular ("No Chrome do celular: toque em Opções ⋮ > Adicionar à tela inicial").

#### C. Fluxo de Login com Google Limpo e Sem Erros
- Botão "Conectar Google" estilizado conforme padrão oficial.
- Autenticação direta com popup limpo e escopos de Google Drive (`drive.file`) e Google Agenda (`calendar.events`).
- Se o usuário fechar a tela de login sem escolher conta, o app apenas fecha a janela sem exibir mensagens de erro em inglês.

---

### 3. Decisões de Produto & Arquitetura

- **Decisão 1: Criação do Componente Dedicado `NotificationCenterModal`**
  - *Abordagem*: Isolar a lógica da central de notificações em um componente modal acessível tanto pelo Header quanto pela tela de preferências.
  - *Benefício*: O botão de sino passa a ter feedback visual instantâneo e útil para o usuário.
- **Decisão 2: Remoção do Parâmetro Conflitante no `firebase.ts`**
  - *Abordagem*: Remover `access_type: 'offline'` do `GoogleAuthProvider`, mantendo apenas os escopos e `prompt: 'select_account'`.
  - *Benefício*: Elimina a causa raiz do erro `"The requested action is invalid"` que ocorre em clientes web.
- **Decisão 3: Reestruturação da Tela de Ajustes (`SettingsView`)**
  - *Abordagem*: Redesenhar a tela em seções limpas de cartões com ícones funcionais:
    1. Perfil & Nuvem (Google Drive);
    2. Preferências do Sistema (Tema e Notificações);
    3. Cópia de Segurança (Download e Restauração de JSON);
    4. Atualização do Aplicativo (Versão instalada e botão de verificar nova versão).

---

### 4. Diagrama da Arquitetura de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                          Header                             │
│   [Logo]  [Início | Tarefas | Finanças | Agenda | Ajustes]  │
│   [Tema]  [Sino Notificações 🔔]  [Conta Google / Entrar]   │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼ (Ao clicar no sino)          ▼ (Ao clicar em entrar)
┌───────────────────────────────┐  ┌───────────────────────────┐
│   NotificationCenterModal     │  │      Firebase Auth        │
│ - Status de permissão         │  │ - GoogleAuthProvider     │
│ - Lembretes de hoje & agenda  │  │ - Escopos Drive/Agenda    │
│ - Limpar e testar alertas     │  │ - Sem parâmetros inválidos│
└───────────────────────────────┘  └─────────────┬─────────────┘
                                                 │
                                                 ▼
                                   ┌───────────────────────────┐
                                   │ Google Drive & Agenda     │
                                   └───────────────────────────┘
```

---

### 5. Plano de Execução Detalhado

1. **Correção do Serviço de Autenticação (`src/services/firebase.ts`)**:
   - Ajustar `GoogleAuthProvider` removendo `access_type: 'offline'` e `prompt: 'consent'`.
   - Adicionar tratamento para fechamento manual do popup sem disparar erro no console.

2. **Criação da Central de Notificações (`src/components/Notifications/NotificationCenterModal.tsx`)**:
   - Criar modal interativo que lista notificações e lembretes visuais em tempo real.
   - Conectar o botão de sino do `Header.tsx` para abrir esse modal.

3. **Limpeza da Tela de Ajustes (`src/components/Settings/SettingsView.tsx`)**:
   - Remover seções de código de desenvolvedor (commits com SHA, tokens de programador e referências a branches).
   - Manter apenas funcionalidades reais: tema, notificações, nuvem Google Drive, exportação/importação de dados e versão do app.

4. **Remoção de Instruções Técnicas Desnecessárias**:
   - Desativar o modal técnico de comandos git (`InstallGuideModal.tsx`) do `App.tsx` e `Header.tsx`.
   - Remover menções a builds do GitHub Actions de dentro do `DriveSyncModal.tsx`.

5. **Validação & Testes**:
   - Executar `compile_applet` e `lint_applet` garantindo 0 erros de compilação.
   - Reiniciar dev server e verificar a navegação responsiva em desktop e mobile.
