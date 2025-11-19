# PatriGestor v2.0 - Guia Rápido de Referência

## 🎯 Propósito
Sistema web de gestão patrimonial da Resultt para controlar ativos com documentação fotográfica, depreciação e localização por unidades. PWA mobile-first que funciona como app nativo Android com suporte desktop.

## 🏗️ Arquitetura
- **Frontend**: Vanilla JavaScript ES6 Modules + HTML/CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Deploy**: Vercel
- **Paradigma**: SPA (Single Page Application) com roteamento client-side

## 📂 Estrutura de Arquivos

### `/js` - Núcleo do Sistema
```
main.js              → Ponto de entrada (inicializa router e modalManager)
router.js            → Gerencia navegação entre páginas
modalManager.js      → Sistema de modais reutilizável
supabaseClient.js    → Cliente Supabase configurado
auth.js              → Autenticação e controle de permissões
ui.js                → Componentes de UI (alertas, spinners, etc)
```

### `/js/services` - Camada de Dados
```
patrimonioService.js    → CRUD de patrimônios
centroCustoService.js   → CRUD de centros de custo
unidadeService.js       → CRUD de unidades organizacionais (NOVO)
depreciacaoService.js   → Cálculo e gestão de depreciação (NOVO)
usuarioService.js       → Gestão de usuários
relatorioService.js     → Geração de relatórios (Excel)
rootService.js          → Funções administrativas (backup/restore)
imageUpload.js          → Upload e compressão de imagens
```

### `/js/pages` - Páginas da Aplicação
```
login.js                  → Autenticação
dashboard.js              → Página inicial com menu
cadastroPatrimonio.js     → Cadastro de novos ativos
listaPatrimonios.js       → Listagem e busca
editarPatrimonio.js       → Edição de ativos
relatorios.js             → Interface de filtros e export
gerenciarCentros.js       → CRUD de centros de custo
gerenciarUnidades.js      → CRUD de unidades (NOVO)
gerenciarDepreciacoes.js  → Gestão de depreciação (NOVO)
gerenciarUsuarios.js      → Gestão de contas
setupRoot.js              → Primeiro acesso (criar ROOT)
gerenciarRoot.js          → Painel administrativo (backup/restore)
```

## 🔐 Sistema de Permissões
- **ROOT**: Acesso total (backup, restore, usuários)
- **ADMIN**: Gestão completa (exceto operações ROOT)
- **EDITOR**: Criar e editar patrimônios
- **VIEWER**: Apenas visualização

## 🏢 Gestão de Unidades (NOVO)
Sistema hierárquico para organizar patrimônios por localização física ou organizacional:
- Filiais, departamentos, salas, etc.
- Permite filtros e relatórios por unidade
- Facilita inventário físico por localização
- Vinculação no cadastro de patrimônio

## 📉 Sistema de Depreciação (NOVO)
Cálculo automático de depreciação de ativos:
- Métodos suportados (linear, acelerado, etc.)
- Vida útil configurável por tipo de ativo
- Cálculo de valor residual e depreciado
- Relatórios de depreciação acumulada
- Integração com relatórios financeiros

## 🔄 Fluxo de Funcionamento

### Inicialização
```
1. main.js carrega todos os módulos
2. modalManager.init() → prepara sistema de modais
3. router.init() → verifica autenticação e carrega página inicial
```

### Navegação
```
router.navigate('pagina') → Atualiza hash (#pagina) → Router detecta mudança 
→ Limpa #app → Carrega página correspondente
```

### Cadastro de Patrimônio
```
1. Usuário preenche formulário em cadastroPatrimonio.js
2. Seleciona Centro de Custo e Unidade
3. Define parâmetros de depreciação
4. Fotos são comprimidas progressivamente (imageUpload.js)
5. Upload para Supabase Storage com nome padronizado (PLACA_N.jpg)
6. Registro salvo em patrimonios table com URLs das fotos
```

### Sistema de Backup/Restore
```
BACKUP:
- Extrai dados tabulares (JSON): patrimônios, centros, unidades, usuários
- Baixa todas as imagens do Storage
- Gera ZIP com estrutura: data.json + /images

RESTORE:
- Valida ZIP
- Limpa dados existentes
- Restaura tables preservando UUIDs
- Re-upload de imagens
- Atualiza referências
- Recalcula depreciações
```

## 📸 Gestão de Imagens
- Máximo 3 fotos por patrimônio
- Compressão progressiva (começa em 0.9 → reduz até caber em 1.9MB)
- Conversão para JPEG
- Nomenclatura: `{PLACA}_1.jpg`, `{PLACA}_2.jpg`, `{PLACA}_3.jpg`
- Armazenamento: Supabase Storage bucket `patrigestor-images/patrimonios/`

## 📊 Relatórios
- **Filtros**: Centro de Custo, Unidade, Período
- **Dados**: Valores originais, depreciados e residuais
- **Export**: Excel com formatação profissional
- **Estatísticas**: Totais por centro, unidade e depreciação acumulada
- Gerado client-side com SheetJS

## 🎨 UI/UX
- Mobile-first com touch targets adequados
- Teclado numérico para campos de valores
- Enter key navigation
- Modal system para confirmações
- PWA com splash screens e ícones
- Cores corporativas Resultt (azul e laranja)

## 🔧 Tecnologias Principais
- **Supabase**: Auth, PostgreSQL, Storage
- **SheetJS**: Export Excel
- **JSZip**: Backup/Restore
- **Vite**: Dev server e build
- **Canvas API**: Compressão de imagens

## 📱 Deployment
- Vercel (auto-deploy via GitHub)
- Service Worker para PWA
- Manifest.json configurado
- Suporte fullscreen mobile

## 📋 Estrutura Completa (29 arquivos)
```
src/
├── assets/
├── css/
│   └── style.css
├── favicon.png
├── index.html
└── js/
    ├── auth.js
    ├── centroCustoService.js
    ├── depreciacaoService.js          ← NOVO
    ├── imageUpload.js
    ├── main.js
    ├── modalManager.js
    ├── pages/
    │   ├── cadastroPatrimonio.js
    │   ├── dashboard.js
    │   ├── editarPatrimonio.js
    │   ├── gerenciarCentros.js
    │   ├── gerenciarDepreciacoes.js   ← NOVO
    │   ├── gerenciarRoot.js
    │   ├── gerenciarUnidades.js       ← NOVO
    │   ├── gerenciarUsuarios.js
    │   ├── listaPatrimonios.js
    │   ├── login.js
    │   ├── relatorios.js
    │   └── setupRoot.js
    ├── patrimonioService.js
    ├── relatorioService.js
    ├── rootService.js
    ├── router.js
    ├── supabaseClient.js
    ├── ui.js
    ├── unidadeService.js              ← NOVO
    └── usuarioService.js
```

---
**Versão**: 2.0  
**Empresa**: Resultt - Consultoria Empresarial  
**Desenvolvedor**: Ronaldo Cerucci  
**Última Atualização**: Novembro 2025