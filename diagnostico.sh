#!/bin/bash

# Script de Diagnóstico - PatriGestor
# Verifica se a estrutura do projeto está correta para Vite

echo "🔍 DIAGNÓSTICO DO PROJETO PATRIGESTOR"
echo "========================================"
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador de problemas
PROBLEMAS=0

# Verificar se está no diretório correto
if [ ! -f "package.json" ]; then
    echo "${RED}❌ Erro: Execute este script na raiz do projeto (onde está o package.json)${NC}"
    exit 1
fi

echo "✅ Diretório correto encontrado"
echo ""

# 1. Verificar package.json
echo "📦 1. Verificando package.json..."
if [ -f "package.json" ]; then
    echo "${GREEN}  ✓ package.json existe${NC}"
    
    # Verificar scripts
    if grep -q '"dev".*"vite"' package.json; then
        echo "${GREEN}  ✓ Script 'dev' configurado${NC}"
    else
        echo "${RED}  ✗ Script 'dev' não encontrado ou incorreto${NC}"
        PROBLEMAS=$((PROBLEMAS + 1))
    fi
    
    if grep -q '"build".*"vite build"' package.json; then
        echo "${GREEN}  ✓ Script 'build' configurado${NC}"
    else
        echo "${RED}  ✗ Script 'build' não encontrado ou incorreto${NC}"
        PROBLEMAS=$((PROBLEMAS + 1))
    fi
else
    echo "${RED}  ✗ package.json não encontrado${NC}"
    PROBLEMAS=$((PROBLEMAS + 1))
fi
echo ""

# 2. Verificar vite.config.js
echo "⚙️  2. Verificando vite.config.js..."
if [ -f "vite.config.js" ]; then
    echo "${GREEN}  ✓ vite.config.js existe${NC}"
    
    if grep -q "root.*src" vite.config.js || grep -q "root:.*'src'" vite.config.js; then
        echo "${GREEN}  ✓ root configurado para 'src'${NC}"
    else
        echo "${YELLOW}  ⚠ root pode não estar configurado corretamente${NC}"
        echo "    Verifique se tem: root: 'src'"
    fi
else
    echo "${RED}  ✗ vite.config.js não encontrado${NC}"
    PROBLEMAS=$((PROBLEMAS + 1))
fi
echo ""

# 3. Verificar estrutura src/
echo "📁 3. Verificando estrutura src/..."
if [ -d "src" ]; then
    echo "${GREEN}  ✓ Pasta src/ existe${NC}"
    
    # index.html em src/
    if [ -f "src/index.html" ]; then
        echo "${GREEN}  ✓ src/index.html encontrado${NC}"
    else
        echo "${RED}  ✗ src/index.html NÃO encontrado${NC}"
        PROBLEMAS=$((PROBLEMAS + 1))
        
        # Procurar index.html em outros lugares
        if [ -f "index.html" ]; then
            echo "${YELLOW}    ⚠ index.html encontrado na RAIZ (deveria estar em src/)${NC}"
        fi
        if [ -f "public/index.html" ]; then
            echo "${YELLOW}    ⚠ index.html encontrado em public/ (deveria estar em src/)${NC}"
        fi
    fi
    
    # src/css/
    if [ -d "src/css" ]; then
        echo "${GREEN}  ✓ src/css/ existe${NC}"
        if [ -f "src/css/style.css" ]; then
            echo "${GREEN}  ✓ src/css/style.css encontrado${NC}"
        else
            echo "${YELLOW}    ⚠ style.css não encontrado em src/css/${NC}"
        fi
    else
        echo "${YELLOW}  ⚠ src/css/ não existe${NC}"
    fi
    
    # src/js/
    if [ -d "src/js" ]; then
        echo "${GREEN}  ✓ src/js/ existe${NC}"
        
        if [ -f "src/js/main.js" ]; then
            echo "${GREEN}  ✓ src/js/main.js encontrado${NC}"
        else
            echo "${RED}  ✗ src/js/main.js NÃO encontrado${NC}"
            PROBLEMAS=$((PROBLEMAS + 1))
        fi
        
        if [ -f "src/js/router.js" ]; then
            echo "${GREEN}  ✓ src/js/router.js encontrado${NC}"
        else
            echo "${YELLOW}  ⚠ src/js/router.js não encontrado${NC}"
        fi
        
        # src/js/pages/
        if [ -d "src/js/pages" ]; then
            PAGE_COUNT=$(ls -1 src/js/pages/*.js 2>/dev/null | wc -l)
            echo "${GREEN}  ✓ src/js/pages/ existe ($PAGE_COUNT arquivos)${NC}"
        else
            echo "${YELLOW}  ⚠ src/js/pages/ não existe${NC}"
        fi
    else
        echo "${RED}  ✗ src/js/ NÃO existe${NC}"
        PROBLEMAS=$((PROBLEMAS + 1))
    fi
    
else
    echo "${RED}  ✗ Pasta src/ NÃO existe${NC}"
    PROBLEMAS=$((PROBLEMAS + 1))
fi
echo ""

# 4. Verificar estrutura public/
echo "📂 4. Verificando estrutura public/..."
if [ -d "public" ]; then
    echo "${GREEN}  ✓ Pasta public/ existe${NC}"
    
    if [ -f "public/manifest.json" ]; then
        echo "${GREEN}  ✓ public/manifest.json encontrado${NC}"
    else
        echo "${YELLOW}  ⚠ public/manifest.json não encontrado${NC}"
    fi
    
    if [ -f "public/sw.js" ]; then
        echo "${GREEN}  ✓ public/sw.js encontrado${NC}"
    else
        echo "${YELLOW}  ⚠ public/sw.js não encontrado${NC}"
    fi
    
    if [ -d "public/icons" ]; then
        ICON_COUNT=$(ls -1 public/icons/*.png 2>/dev/null | wc -l)
        echo "${GREEN}  ✓ public/icons/ existe ($ICON_COUNT ícones)${NC}"
    else
        echo "${YELLOW}  ⚠ public/icons/ não existe${NC}"
    fi
else
    echo "${RED}  ✗ Pasta public/ NÃO existe${NC}"
    PROBLEMAS=$((PROBLEMAS + 1))
fi
echo ""

# 5. Verificar node_modules
echo "📦 5. Verificando node_modules..."
if [ -d "node_modules" ]; then
    echo "${GREEN}  ✓ node_modules/ existe${NC}"
    
    if [ -d "node_modules/vite" ]; then
        echo "${GREEN}  ✓ Vite instalado${NC}"
    else
        echo "${RED}  ✗ Vite NÃO instalado${NC}"
        echo "${YELLOW}    Execute: npm install${NC}"
        PROBLEMAS=$((PROBLEMAS + 1))
    fi
else
    echo "${RED}  ✗ node_modules/ NÃO existe${NC}"
    echo "${YELLOW}    Execute: npm install${NC}"
    PROBLEMAS=$((PROBLEMAS + 1))
fi
echo ""

# 6. Verificar .env
echo "🔐 6. Verificando arquivo .env..."
if [ -f ".env" ]; then
    echo "${GREEN}  ✓ .env existe${NC}"
    
    if grep -q "VITE_SUPABASE_URL" .env; then
        echo "${GREEN}  ✓ VITE_SUPABASE_URL configurado${NC}"
    else
        echo "${YELLOW}  ⚠ VITE_SUPABASE_URL não encontrado em .env${NC}"
    fi
    
    if grep -q "VITE_SUPABASE_ANON_KEY" .env; then
        echo "${GREEN}  ✓ VITE_SUPABASE_ANON_KEY configurado${NC}"
    else
        echo "${YELLOW}  ⚠ VITE_SUPABASE_ANON_KEY não encontrado em .env${NC}"
    fi
else
    echo "${YELLOW}  ⚠ .env não existe${NC}"
    echo "    Crie o arquivo .env com suas credenciais do Supabase"
fi
echo ""

# 7. Verificar imports no src/index.html
echo "📄 7. Verificando src/index.html..."
if [ -f "src/index.html" ]; then
    if grep -q 'type="module"' src/index.html; then
        echo "${GREEN}  ✓ Script com type=\"module\" encontrado${NC}"
    else
        echo "${YELLOW}  ⚠ Script principal pode não ter type=\"module\"${NC}"
    fi
    
    if grep -q '/js/main.js' src/index.html; then
        echo "${GREEN}  ✓ Referência a main.js encontrada${NC}"
    else
        echo "${YELLOW}  ⚠ Referência a main.js não encontrada${NC}"
    fi
fi
echo ""

# 8. Resumo
echo "========================================"
echo "📊 RESUMO DO DIAGNÓSTICO"
echo "========================================"
echo ""

if [ $PROBLEMAS -eq 0 ]; then
    echo "${GREEN}✅ NENHUM PROBLEMA ENCONTRADO!${NC}"
    echo ""
    echo "Seu projeto parece estar configurado corretamente."
    echo ""
    echo "Próximos passos:"
    echo "  1. Execute: npm run dev"
    echo "  2. Acesse: http://localhost:5173"
    echo "  3. Se funcionar, faça deploy: vercel --prod"
else
    echo "${RED}❌ $PROBLEMAS PROBLEMA(S) ENCONTRADO(S)${NC}"
    echo ""
    echo "Revise os itens marcados com ✗ ou ⚠ acima."
    echo ""
    echo "Comandos úteis:"
    echo "  - Reinstalar dependências: rm -rf node_modules && npm install"
    echo "  - Ver estrutura: tree -L 3 -I 'node_modules'"
    echo "  - Criar .env: nano .env"
fi
echo ""

# 9. Mostrar estrutura resumida
echo "📁 Estrutura atual (resumo):"
echo ""
tree -L 3 -I 'node_modules' --filesfirst 2>/dev/null || {
    echo "  patrigestor/"
    [ -f "package.json" ] && echo "  ├── package.json"
    [ -f "vite.config.js" ] && echo "  ├── vite.config.js"
    [ -f ".env" ] && echo "  ├── .env"
    [ -d "src" ] && echo "  ├── src/"
    [ -f "src/index.html" ] && echo "  │   ├── index.html"
    [ -d "src/css" ] && echo "  │   ├── css/"
    [ -d "src/js" ] && echo "  │   └── js/"
    [ -d "public" ] && echo "  └── public/"
}
echo ""

exit $PROBLEMAS
