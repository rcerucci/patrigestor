import { auth } from '../auth.js'
import { router } from '../router.js'
import { unidadeService } from '../unidadeService.js'
import { uploadLogo, deleteImage } from '../imageUpload.js'  // ✅ Adicionar deleteImage
import { UI } from '../ui.js'

let editingUnidadeId = null
let logoFile = null
let logoAlterada = false      // ✅ NOVO: Controla se logo foi modificada
let logoUrlOriginal = null    // ✅ NOVO: URL da logo antiga para deleção
let unidadeAtual = null

// ============================================
// FUNÇÃO PARA LIMPAR CACHE DE IMAGENS
// ============================================
function adicionarCacheBusting(url) {
    if (!url) return url
    
    // Adiciona um timestamp como parâmetro para forçar o navegador a buscar a nova imagem
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}v=${Date.now()}`
}

export async function renderGerenciarUnidades() {
    const user = await auth.getCurrentUser()

    if (!user || !await auth.hasPermission('admin')) {
        router.navigate('dashboard')
        return
    }

    const app = document.getElementById('app')

    app.innerHTML = `
        <div class="header">
            <h1>🏢 Resultt - PatriGestor</h1>
            <div class="user-info">
                <button class="btn btn-secondary btn-small" onclick="window.appRouter.navigate('dashboard')">← Voltar</button>
            </div>
        </div>

        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
                <h2 class="card-title" style="margin: 0;">Gerenciar Unidades</h2>
                <button class="btn btn-primary" onclick="abrirModalNovaUnidade()">+ Criar Unidade</button>
            </div>

            <div id="unidades-content" style="margin-top: 20px;">
                <div class="loading"><div class="spinner"></div><p>Carregando...</p></div>
            </div>
        </div>

        <!-- Modal Criar/Editar Unidade -->
        <div id="modal-unidade" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="modal-titulo">Criar Nova Unidade</h3>
                    <span class="modal-close" onclick="fecharModalUnidade()">×</span>
                </div>

                <div id="modal-alert"></div>

                <form id="form-unidade">
                    <div class="form-group">
                        <label>Nome *</label>
                        <input 
                            type="text" 
                            class="form-control" 
                            id="unidade-nome" 
                            required
                            placeholder="Ex: Matriz São Paulo"
                        >
                    </div>

                    <div class="form-group">
                        <label>CNPJ</label>
                        <input 
                            type="text" 
                            class="form-control" 
                            id="unidade-cnpj" 
                            placeholder="00.000.000/0000-00"
                            maxlength="18"
                        >
                    </div>

                    <!-- Logo Upload -->
                    <div class="form-group">
                        <label>Logo da Unidade</label>
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            <div 
                                class="logo-preview" 
                                id="logo-preview" 
                                onclick="document.getElementById('logo-input').click()"
                                style="
                                    width: 200px;
                                    height: 200px;
                                    border: 3px dashed #cbd5e1;
                                    border-radius: 12px;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    cursor: pointer;
                                    background: #f8fafc;
                                    transition: all 0.3s;
                                    overflow: hidden;
                                "
                            >
                                <span style="font-size: 48px; color: #94a3b8;">🖼️</span>
                            </div>
                            <input 
                                type="file" 
                                id="logo-input" 
                                accept="image/*"
                                style="display: none;"
                            >
                            <small style="color: #6b7280;">
                                💡 Clique na área acima para selecionar a logo (recomendado: 200x200px ou maior)
                            </small>
                        </div>
                    </div>

                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <button type="submit" class="btn btn-success" id="btn-salvar" style="flex: 1; min-width: 120px;">💾 Salvar</button>
                        <button type="button" class="btn btn-secondary" onclick="fecharModalUnidade()">Cancelar</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Modal Confirmar Exclusão UNIDADE -->
        <div id="modal-confirmar-exclusao-unidade" class="modal">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3>⚠️ Confirmar Exclusão</h3>
                    <span class="modal-close" onclick="UI.hideModal('modal-confirmar-exclusao-unidade')">×</span>
                </div>

                <div style="padding: 20px;">
                    <p style="font-size: 16px; margin-bottom: 20px;">
                        Tem certeza que deseja <strong style="color: #ef4444;">excluir permanentemente</strong> esta unidade?
                    </p>
                    <p id="unidade-excluir-info" style="font-weight: bold; color: #2c3e50; background: #f3f4f6; padding: 15px; border-radius: 8px;"></p>
                    <p style="color: #f59e0b; margin-top: 15px; font-size: 14px;">
                        ⚠️ Patrimônios vinculados a esta unidade ficarão sem unidade!<br>
                        🖼️ O logo da unidade também será deletado permanentemente!
                    </p>

                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button class="btn btn-danger" onclick="confirmarExclusaoUnidade()">Sim, Excluir</button>
                        <button class="btn btn-secondary" onclick="UI.hideModal('modal-confirmar-exclusao-unidade')">Cancelar</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal Detalhes da Unidade -->
        <div id="modal-detalhes-unidade" class="modal">
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h3>Detalhes da Unidade</h3>
                    <span class="modal-close" onclick="fecharModalDetalhes()">×</span>
                </div>

                <div id="detalhes-unidade-content"></div>
            </div>
        </div>

        <!-- Modal Logo Ampliado -->
        <div id="modal-logo-ampliado" class="modal" style="display: none; background: rgba(0,0,0,0.95);">
            <div style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                
                <!-- Botão Fechar -->
                <button onclick="fecharLogoAmpliado()" style="position: absolute; top: 20px; right: 20px; background: rgba(255,255,255,0.2); border: none; color: white; font-size: 36px; width: 50px; height: 50px; border-radius: 50%; cursor: pointer; z-index: 1001; transition: background 0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                    ×
                </button>

                <!-- Logo -->
                <div style="max-width: 90%; max-height: 90%; display: flex; align-items: center; justify-content: center;">
                    <img id="logo-ampliado-img" src="" style="max-width: 100%; max-height: 90vh; object-fit: contain; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
                </div>
            </div>
        </div>
    `

    // Event listeners
    document.getElementById('form-unidade').addEventListener('submit', handleSalvarUnidade)
    document.getElementById('logo-input').addEventListener('change', handleLogoSelect)
    document.getElementById('unidade-cnpj').addEventListener('input', aplicarMascaraCNPJ)

    await carregarUnidades()
}

async function carregarUnidades() {
    try {
        const unidades = await unidadeService.listar()
        renderUnidades(unidades)
    } catch (error) {
        console.error('Erro ao carregar unidades:', error)
        const contentElement = document.getElementById('unidades-content')
        if (contentElement) {
            contentElement.innerHTML = `
                <div class="alert alert-error">Erro ao carregar unidades: ${error.message}</div>
            `
        }
    }
}

function renderUnidades(unidades) {
    const content = document.getElementById('unidades-content')
    
    if (!content) {
        console.error('Elemento unidades-content não encontrado')
        return
    }

    if (unidades.length === 0) {
        content.innerHTML = '<p class="text-center">Nenhuma unidade cadastrada.</p>'
        return
    }

    content.innerHTML = `
        <!-- 📱 MOBILE: Cards -->
        <div class="mobile-only" style="display: none;">
            ${unidades.map(u => renderUnidadeCard(u)).join('')}
        </div>

        <!-- 💻 DESKTOP: Tabela -->
        <div class="desktop-only table-container">
            <table>
                <thead>
                    <tr>
                        <th style="width: 80px;">Logo</th>
                        <th>Nome</th>
                        <th>CNPJ</th>
                        <th style="width: 280px;">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${unidades.map(u => renderUnidadeRow(u)).join('')}
                </tbody>
            </table>
        </div>

        <style>
            @media (max-width: 768px) {
                .mobile-only { display: block !important; }
                .desktop-only { display: none !important; }
            }
            @media (min-width: 769px) {
                .mobile-only { display: none !important; }
                .desktop-only { display: block !important; }
            }
        </style>
    `
}

// ✅ Card para mobile
function renderUnidadeCard(u) {
    const logoHtml = u.logo_url 
        ? `<img src="${adicionarCacheBusting(u.logo_url)}" alt="${u.nome}" style="width: 60px; height: 60px; object-fit: contain; border-radius: 8px; background: white; border: 2px solid #e5e7eb; padding: 5px;">` 
        : `<div style="width: 60px; height: 60px; background: #f3f4f6; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 24px;">🏢</div>`

    return `
        <div style="background: white; border: 2px solid #e5e7eb; border-radius: 12px; padding: 15px; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 12px;">
                ${logoHtml}
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #1e3a8a; font-size: 16px; margin-bottom: 4px;">
                        ${u.nome}
                    </div>
                    <div style="font-size: 14px; color: #6b7280;">
                        ${u.cnpj || '<em style="color: #9ca3af;">Sem CNPJ</em>'}
                    </div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px;">
                <button 
                    class="btn btn-secondary btn-small" 
                    onclick='abrirDetalhesUnidade(${JSON.stringify(u).replace(/'/g, "&#39;")})'
                    title="Ver detalhes"
                >
                    👁️ Detalhes
                </button>
                <button 
                    class="btn btn-primary btn-small" 
                    onclick='editarUnidade(${JSON.stringify(u).replace(/'/g, "&#39;")})'
                >
                    ✏️ Editar
                </button>
                <button 
                    class="btn btn-danger btn-small" 
                    onclick="abrirModalExcluirUnidade('${u.id}', '${u.nome.replace(/'/g, "\\'")}')"
                    title="Deletar unidade"
                >
                    🗑️ Deletar
                </button>
            </div>
        </div>
    `
}

// ✅ Linha para desktop
function renderUnidadeRow(u) {
    const logoHtml = u.logo_url 
        ? `<img src="${adicionarCacheBusting(u.logo_url)}" alt="${u.nome}" style="width: 50px; height: 50px; object-fit: contain; border-radius: 8px; background: white; border: 2px solid #e5e7eb; padding: 5px;">` 
        : `<div style="width: 50px; height: 50px; background: #f3f4f6; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px;">🏢</div>`

    return `
        <tr>
            <td>${logoHtml}</td>
            <td><strong>${u.nome}</strong></td>
            <td>${u.cnpj || '-'}</td>
            <td>
                <div style="display: flex; gap: 5px;">
                    <button 
                        class="btn btn-secondary btn-small" 
                        onclick='abrirDetalhesUnidade(${JSON.stringify(u).replace(/'/g, "&#39;")})'
                        title="Ver detalhes"
                    >
                        👁️ Detalhes
                    </button>
                    <button 
                        class="btn btn-primary btn-small" 
                        onclick='editarUnidade(${JSON.stringify(u).replace(/'/g, "&#39;")})'
                        title="Editar unidade"
                    >
                        ✏️ Editar
                    </button>
                    <button 
                        class="btn btn-danger btn-small" 
                        onclick="abrirModalExcluirUnidade('${u.id}', '${u.nome.replace(/'/g, "\\'")}')"
                        title="Deletar unidade"
                    >
                        🗑️ Deletar
                    </button>
                </div>
            </td>
        </tr>
    `
}

window.abrirModalNovaUnidade = function() {
    editingUnidadeId = null
    logoFile = null
    logoAlterada = false      // ✅ Resetar flag
    logoUrlOriginal = null    // ✅ Resetar URL original
    
    document.getElementById('modal-titulo').textContent = 'Criar Nova Unidade'
    document.getElementById('btn-salvar').textContent = '💾 Criar Unidade'
    document.getElementById('form-unidade').reset()
    document.getElementById('modal-alert').innerHTML = ''
    
    // Reset logo preview
    document.getElementById('logo-preview').innerHTML = '<span style="font-size: 48px; color: #94a3b8;">🖼️</span>'
    
    UI.showModal('modal-unidade')
    
    // Focar no campo nome
    setTimeout(() => {
        document.getElementById('unidade-nome').focus()
    }, 100)
}

window.editarUnidade = function(unidade) {
    editingUnidadeId = unidade.id
    logoFile = null
    logoAlterada = false                  // ✅ Resetar flag
    logoUrlOriginal = unidade.logo_url    // ✅ IMPORTANTE: Salvar URL original para deletar depois
    
    document.getElementById('modal-titulo').textContent = 'Editar Unidade'
    document.getElementById('btn-salvar').textContent = '💾 Salvar Alterações'
    document.getElementById('unidade-nome').value = unidade.nome
    document.getElementById('unidade-cnpj').value = unidade.cnpj || ''
    document.getElementById('modal-alert').innerHTML = ''
    
    // Preview da logo existente
    const logoPreview = document.getElementById('logo-preview')
    if (unidade.logo_url) {
        logoPreview.innerHTML = `<img src="${adicionarCacheBusting(unidade.logo_url)}" alt="Logo" style="max-width: 100%; max-height: 100%; object-fit: contain;">`
    } else {
        logoPreview.innerHTML = '<span style="font-size: 48px; color: #94a3b8;">🖼️</span>'
    }
    
    UI.showModal('modal-unidade')
    
    // Focar no campo nome
    setTimeout(() => {
        document.getElementById('unidade-nome').focus()
        document.getElementById('unidade-nome').select()
    }, 100)
}

window.fecharModalUnidade = function() {
    editingUnidadeId = null
    logoFile = null
    logoAlterada = false      // ✅ Resetar flag
    logoUrlOriginal = null    // ✅ Resetar URL original
    document.getElementById('form-unidade').reset()
    UI.hideModal('modal-unidade')
}

let unidadeParaExcluir = null

window.abrirModalExcluirUnidade = function(id, nome) {
    unidadeParaExcluir = id
    
    const infoElement = document.getElementById('unidade-excluir-info')
    if (infoElement) {
        infoElement.textContent = nome
    } else {
        console.error('Elemento unidade-excluir-info não encontrado no DOM')
    }
    
    UI.showModal('modal-confirmar-exclusao-unidade')
}

window.confirmarExclusaoUnidade = async function() {
    if (!unidadeParaExcluir) return

    try {
        // O unidadeService.deletar() já cuida de deletar o logo do storage
        await unidadeService.deletar(unidadeParaExcluir)
        UI.hideModal('modal-confirmar-exclusao-unidade')
        await carregarUnidades()
        alert('✅ Unidade excluída com sucesso! (Logo também foi deletado)')
    } catch (error) {
        alert('❌ Erro ao excluir unidade: ' + error.message)
    }

    unidadeParaExcluir = null
}

function handleLogoSelect(event) {
    const file = event.target.files[0]
    if (file) {
        logoFile = file
        logoAlterada = true  // ✅ IMPORTANTE: Marcar que logo foi alterada

        const reader = new FileReader()
        reader.onload = (e) => {
            document.getElementById('logo-preview').innerHTML = `<img src="${e.target.result}" alt="Preview" style="max-width: 100%; max-height: 100%; object-fit: contain;">`
        }
        reader.readAsDataURL(file)
    }
}

function aplicarMascaraCNPJ(e) {
    let valor = e.target.value.replace(/\D/g, '')
    
    if (valor.length <= 14) {
        valor = valor.replace(/^(\d{2})(\d)/, '$1.$2')
        valor = valor.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        valor = valor.replace(/\.(\d{3})(\d)/, '.$1/$2')
        valor = valor.replace(/(\d{4})(\d)/, '$1-$2')
    }
    
    e.target.value = valor
}

async function handleSalvarUnidade(e) {
    e.preventDefault()

    const alertDiv = document.getElementById('modal-alert')

    try {
        const nome = document.getElementById('unidade-nome').value.trim()
        const cnpj = document.getElementById('unidade-cnpj').value.trim()

        if (!nome) {
            UI.showError('modal-alert', '⚠️ O nome é obrigatório')
            return
        }

        let unidade = {
            nome,
            cnpj: cnpj || null
        }

        if (editingUnidadeId) {
            // ===== EDITAR UNIDADE EXISTENTE =====
            
            console.log('🔄 Processando logo alterada...')
            console.log('Logo alterada?', logoAlterada)
            console.log('Logo URL original:', logoUrlOriginal)
            
            // Processar logo se foi alterada
            if (logoAlterada) {
                if (logoFile) {
                    // Nova logo selecionada
                    alertDiv.innerHTML = '<div class="loading"><div class="spinner"></div><p>🖼️ Enviando nova logo...</p></div>'
                    console.log('📤 Fazendo upload de nova logo...')
                    
                    // ✅ IMPORTANTE: Deletar logo antiga ANTES de fazer upload da nova
                    if (logoUrlOriginal) {
                        console.log('🗑️ Deletando logo antiga:', logoUrlOriginal)
                        await deleteImage(logoUrlOriginal)
                    }
                    
                    unidade.logo_url = await uploadLogo(logoFile, editingUnidadeId)
                    console.log('✅ Nova logo URL:', unidade.logo_url)
                } else {
                    // Logo foi removida
                    if (logoUrlOriginal) {
                        console.log('🗑️ Deletando logo removida:', logoUrlOriginal)
                        await deleteImage(logoUrlOriginal)
                    }
                    unidade.logo_url = null
                    console.log('🗑️ Logo removida')
                }
            }
            
            UI.showLoading('modal-alert')
            await unidadeService.atualizar(editingUnidadeId, unidade)
            UI.showSuccess('modal-alert', '✅ Unidade atualizada com sucesso!')
        } else {
            // ===== CRIAR NOVA UNIDADE =====
            
            // Primeiro cria sem logo para pegar o ID
            UI.showLoading('modal-alert')
            const novaUnidade = await unidadeService.criar(unidade)
            
            // Se tiver logo, fazer upload depois
            if (logoFile) {
                alertDiv.innerHTML = '<div class="loading"><div class="spinner"></div><p>🖼️ Enviando logo...</p></div>'
                const logoUrl = await uploadLogo(logoFile, novaUnidade.id)
                
                // Atualizar unidade com a URL da logo
                await unidadeService.atualizar(novaUnidade.id, { logo_url: logoUrl })
            }
            
            UI.showSuccess('modal-alert', '✅ Unidade criada com sucesso!')
        }

        setTimeout(() => {
            fecharModalUnidade()
            carregarUnidades()
        }, 1500)

    } catch (error) {
        console.error('❌ Erro ao salvar unidade:', error)
        UI.showError('modal-alert', 'Erro: ' + error.message)
    }
}

// ============================================
// FUNÇÕES DE DETALHES E LOGO AMPLIADO
// ============================================

window.abrirDetalhesUnidade = function(unidade) {
    try {
        unidadeAtual = unidade
        
        const detalhesContent = document.getElementById('detalhes-unidade-content')
        
        const logoHtml = unidade.logo_url 
            ? `<div style="text-align: center; margin-bottom: 20px;">
                   <img src="${adicionarCacheBusting(unidade.logo_url)}" 
                        alt="${unidade.nome}" 
                        style="max-width: 300px; max-height: 300px; object-fit: contain; border-radius: 12px; border: 3px solid #e5e7eb; padding: 10px; background: white; cursor: pointer; transition: transform 0.2s;"
                        onclick="abrirLogoAmpliado('${adicionarCacheBusting(unidade.logo_url)}')"
                        onmouseover="this.style.transform='scale(1.05)'" 
                        onmouseout="this.style.transform='scale(1)'">
                   <p style="font-size: 12px; color: #7f8c8d; margin-top: 10px;">💡 Clique na logo para ampliar</p>
               </div>`
            : `<div style="text-align: center; margin-bottom: 20px;">
                   <div style="width: 200px; height: 200px; background: #f3f4f6; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 80px; margin: 0 auto; border: 3px solid #e5e7eb;">🏢</div>
                   <p style="font-size: 14px; color: #9ca3af; margin-top: 10px;">Sem logo cadastrada</p>
               </div>`
        
        detalhesContent.innerHTML = `
            <div style="padding: 20px;">
                ${logoHtml}
                
                <div style="border-top: 2px solid #e5e7eb; padding-top: 20px;">
                    <p style="margin-bottom: 15px;"><strong style="color: #1e3a8a;">Nome:</strong> ${unidade.nome}</p>
                    <p style="margin-bottom: 15px;"><strong style="color: #1e3a8a;">CNPJ:</strong> ${unidade.cnpj || '<em style="color: #9ca3af;">Não informado</em>'}</p>
                    <p style="margin-bottom: 15px;"><strong style="color: #1e3a8a;">Cadastrado em:</strong> ${new Date(unidade.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
            </div>
        `

        UI.showModal('modal-detalhes-unidade')
        
    } catch (error) {
        console.error('Erro ao abrir detalhes:', error)
        alert('Erro ao carregar detalhes: ' + error.message)
    }
}

window.fecharModalDetalhes = function() {
    unidadeAtual = null
    UI.hideModal('modal-detalhes-unidade')
}

window.abrirLogoAmpliado = function(logoUrl) {
    const modal = document.getElementById('modal-logo-ampliado')
    const img = document.getElementById('logo-ampliado-img')
    
    img.src = logoUrl
    modal.style.display = 'block'
    
    // Fechar ao clicar fora da imagem
    modal.onclick = function(e) {
        if (e.target === modal) {
            fecharLogoAmpliado()
        }
    }
}

window.fecharLogoAmpliado = function() {
    const modal = document.getElementById('modal-logo-ampliado')
    modal.style.display = 'none'
}