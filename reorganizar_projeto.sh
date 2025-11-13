#!/bin/bash

# Script para reorganizar projeto PatriGestor para deploy no Vercel
# Execute este script na raiz do projeto: bash reorganizar_projeto.sh

echo "🚀 Reorganizando projeto PatriGestor para deploy no Vercel..."
echo ""

# Verificar se está no diretório correto
if [ ! -f "router.js" ] && [ ! -f "main.js" ]; then
    echo "❌ Erro: Execute este script na raiz do projeto (onde estão os arquivos .js)"
    exit 1
fi

# Criar backup
echo "📦 Criando backup..."
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r . "$BACKUP_DIR/" 2>/dev/null
echo "✅ Backup criado em: $BACKUP_DIR"
echo ""

# Criar estrutura de diretórios
echo "📁 Criando estrutura de diretórios..."
mkdir -p public/js
mkdir -p public/css
mkdir -p public/icons

# Mover arquivos JavaScript para public/js/
echo "📄 Movendo arquivos JavaScript..."
JS_FILES=(
    "auth.js"
    "cadastroPatrimonio.js"
    "centroCustoService.js"
    "dashboard.js"
    "editarPatrimonio.js"
    "gerenciarCentros.js"
    "gerenciarRoot.js"
    "gerenciarUsuarios.js"
    "imageUpload.js"
    "listaPatrimonios.js"
    "login.js"
    "main.js"
    "patrimonioService.js"
    "relatorioService.js"
    "relatorios.js"
    "rootService.js"
    "router.js"
    "setupRoot.js"
    "supabaseClient.js"
    "ui.js"
    "usuarioService.js"
)

for file in "${JS_FILES[@]}"; do
    if [ -f "$file" ]; then
        mv "$file" public/js/
        echo "  ✓ $file → public/js/"
    fi
done

# Mover arquivos para public/
echo ""
echo "📄 Movendo arquivos para public/..."

# index.html
if [ -f "index.html" ]; then
    mv index.html public/
    echo "  ✓ index.html → public/"
elif [ -f "src/index.html" ]; then
    mv src/index.html public/
    echo "  ✓ src/index.html → public/"
fi

# manifest.json
if [ -f "manifest.json" ]; then
    mv manifest.json public/
    echo "  ✓ manifest.json → public/"
elif [ -f "public/manifest.json" ]; then
    echo "  ✓ manifest.json já está em public/"
fi

# sw.js (Service Worker)
if [ -f "sw.js" ]; then
    mv sw.js public/
    echo "  ✓ sw.js → public/"
elif [ -f "public/sw.js" ]; then
    echo "  ✓ sw.js já está em public/"
fi

# CSS
if [ -f "style.css" ]; then
    mv style.css public/css/
    echo "  ✓ style.css → public/css/"
elif [ -f "css/style.css" ]; then
    mv css/style.css public/css/
    echo "  ✓ css/style.css → public/css/"
elif [ -f "public/css/style.css" ]; then
    echo "  ✓ style.css já está em public/css/"
fi

# Imagens
echo ""
echo "🖼️  Movendo imagens..."
if [ -f "favicon.png" ]; then
    mv favicon.png public/
    echo "  ✓ favicon.png → public/"
fi

if [ -f "logo.png" ]; then
    mv logo.png public/
    echo "  ✓ logo.png → public/"
fi

# Ícones e splash screens
if [ -d "icons" ] && [ ! -d "public/icons" ]; then
    mv icons public/
    echo "  ✓ icons/ → public/icons/"
elif [ -d "public/icons" ]; then
    echo "  ✓ icons/ já está em public/"
fi

if [ -d "splashscreens" ] && [ ! -d "public/splashscreens" ]; then
    mv splashscreens public/
    echo "  ✓ splashscreens/ → public/splashscreens/"
elif [ -d "public/splashscreens" ]; then
    echo "  ✓ splashscreens/ já está em public/"
fi

# Criar novo vercel.json
echo ""
echo "⚙️  Criando vercel.json otimizado..."
cat > vercel.json << 'EOF'
{
  "version": 2,
  "public": true,
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    },
    {
      "source": "/sw.js",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        },
        {
          "key": "Service-Worker-Allowed",
          "value": "/"
        }
      ]
    },
    {
      "source": "/(.*)\\.js",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(.*)\\.css",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
EOF
echo "✅ vercel.json criado"

# Criar .gitignore se não existir
echo ""
echo "📝 Criando .gitignore..."
if [ ! -f ".gitignore" ]; then
    cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment
.env
.env.local
.env.*.local

# Build
dist/
build/

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Vercel
.vercel

# Backup
backup_*/
EOF
    echo "✅ .gitignore criado"
else
    echo "✅ .gitignore já existe"
fi

# Limpar diretórios vazios
echo ""
echo "🧹 Limpando diretórios vazios..."
find . -type d -empty -not -path "./.git/*" -delete 2>/dev/null

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Reorganização concluída com sucesso!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Estrutura final:"
echo ""
tree -L 3 -I 'node_modules|backup_*' || ls -R public/ | head -30
echo ""
echo "🎯 Próximos passos:"
echo ""
echo "1. Verificar estrutura:"
echo "   ls -la public/"
echo ""
echo "2. Testar localmente:"
echo "   cd public && python3 -m http.server 8000"
echo "   Depois acesse: http://localhost:8000"
echo ""
echo "3. Fazer deploy no Vercel:"
echo "   npm install -g vercel"
echo "   vercel login"
echo "   vercel --prod"
echo ""
echo "   Durante o deploy, configure:"
echo "   - Directory: ./public"
echo "   - Build Command: (deixar vazio)"
echo "   - Output Directory: ./"
echo ""
echo "📦 Backup salvo em: $BACKUP_DIR"
echo ""
