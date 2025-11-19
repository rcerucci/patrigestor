import { auth } from '../auth.js'
import { router } from '../router.js'
import { depreciacaoService } from '../depreciacaoService.js'
import { UI } from '../ui.js'

let editingDepreciacaoId = null

export async function renderGerenciarDepreciacoes() {
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
                <h2 class="card-title" style="margin: 0;">Gerenciar Depreciações</h2>
                <button class="btn btn-primary" onclick="abrirModalNovaDepreciacao()">+ Criar Depreciação</button>
            </div>

            <div id="depreciacoes-content" style="margin-top: 20px;">
                <div class="loading"><div class="spinner"></div><p>Carregando...</p></div>
            </div>
        </div>

        <!-- Modal Criar/Editar Depreciação -->
        <div id="modal-depreciacao" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="modal-titulo">Criar Nova Depreciação</h3>
                    <span class="modal-close" onclick="fecharModalDepreciacao()">×</span>
                </div>

                <div id="modal-alert"></div>

                <form id="form-depreciacao">
                    <div class="form-group">
                        <label>Nome *</label>
                        <input 
                            type="text" 
                            class="form-control" 
                            id="depreciacao-nome" 
                            required
                            placeholder="Ex: Linear Anual"
                        >
                    </div>

                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <button type="submit" class="btn btn-success" id="btn-salvar" style="flex: 1; min-width: 120px;">💾 Salvar</button>
                        <button type="button" class="btn btn-secondary" onclick="fecharModalDepreciacao()">Cancelar</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Modal Confirmar Exclusão DEPRECIAÇÃO -->
        <div id="modal-confirmar-exclusao-depreciacao" class="modal">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3>⚠️ Confirmar Exclusão</h3>
                    <span class="modal-close" onclick="UI.hideModal('modal-confirmar-exclusao-depreciacao')">×</span>
                </div>

                <div style="padding: 20px;">
                    <p style="font-size: 16px; margin-bottom: 20px;">
                        Tem certeza que deseja <strong style="color: #ef4444;">excluir permanentemente</strong> este tipo de depreciação?
                    </p>
                    <p id="depreciacao-excluir-info" style="font-weight: bold; color: #2c3e50; background: #f3f4f6; padding: 15px; border-radius: 8px;"></p>
                    <p style="color: #f59e0b; margin-top: 15px; font-size: 14px;">
                        ⚠️ Patrimônios vinculados a esta depreciação ficarão sem tipo de depreciação!
                    </p>

                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button class="btn btn-danger" onclick="confirmarExclusaoDepreciacao()">Sim, Excluir</button>
                        <button class="btn btn-secondary" onclick="UI.hideModal('modal-confirmar-exclusao-depreciacao')">Cancelar</button>
                    </div>
                </div>
            </div>
        </div>
    `

    document.getElementById('form-depreciacao').addEventListener('submit', handleSalvarDepreciacao)

    await carregarDepreciacoes()
}

async function carregarDepreciacoes() {
    try {
        const depreciacoes = await depreciacaoService.listar()
        renderDepreciacoes(depreciacoes)
    } catch (error) {
        console.error('Erro ao carregar depreciações:', error)
        const contentElement = document.getElementById('depreciacoes-content')
        if (contentElement) {
            contentElement.innerHTML = `
                <div class="alert alert-error">Erro ao carregar depreciações: ${error.message}</div>
            `
        }
    }
}

function renderDepreciacoes(depreciacoes) {
    const content = document.getElementById('depreciacoes-content')
    
    if (!content) {
        console.error('Elemento depreciacoes-content não encontrado')
        return
    }

    if (depreciacoes.length === 0) {
        content.innerHTML = '<p class="text-center">Nenhuma depreciação cadastrada.</p>'
        return
    }

    content.innerHTML = `
        <!-- 📱 MOBILE: Cards -->
        <div class="mobile-only" style="display: none;">
            ${depreciacoes.map(d => renderDepreciacaoCard(d)).join('')}
        </div>

        <!-- 💻 DESKTOP: Tabela -->
        <div class="desktop-only table-container">
            <table>
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th style="width: 200px;">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${depreciacoes.map(d => renderDepreciacaoRow(d)).join('')}
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
function renderDepreciacaoCard(d) {
    return `
        <div style="background: white; border: 2px solid #e5e7eb; border-radius: 12px; padding: 15px; margin-bottom: 12px;">
            <div style="margin-bottom: 12px;">
                <div style="font-weight: 600; color: #1e3a8a; font-size: 16px; margin-bottom: 4px;">
                    ${d.nome}
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                <button 
                    class="btn btn-primary btn-small" 
                    onclick="editarDepreciacao('${d.id}', '${d.nome.replace(/'/g, "\\'")}')"
                >
                    ✏️ Editar
                </button>
                <button 
                    class="btn btn-danger btn-small" 
                    onclick="abrirModalExcluirDepreciacao('${d.id}', '${d.nome.replace(/'/g, "\\'")}')"
                    title="Deletar depreciação"
                >
                    🗑️ Deletar
                </button>
            </div>
        </div>
    `
}

// ✅ Linha para desktop
function renderDepreciacaoRow(d) {
    return `
        <tr>
            <td><strong>${d.nome}</strong></td>
            <td>
                <div style="display: flex; gap: 5px;">
                    <button 
                        class="btn btn-primary btn-small" 
                        onclick="editarDepreciacao('${d.id}', '${d.nome.replace(/'/g, "\\'")}')"
                        title="Editar depreciação"
                    >
                        ✏️ Editar
                    </button>
                    <button 
                        class="btn btn-danger btn-small" 
                        onclick="abrirModalExcluirDepreciacao('${d.id}', '${d.nome.replace(/'/g, "\\'")}')"
                        title="Deletar depreciação"
                    >
                        🗑️ Deletar
                    </button>
                </div>
            </td>
        </tr>
    `
}

window.abrirModalNovaDepreciacao = function() {
    editingDepreciacaoId = null
    document.getElementById('modal-titulo').textContent = 'Criar Nova Depreciação'
    document.getElementById('btn-salvar').textContent = '💾 Criar Depreciação'
    document.getElementById('form-depreciacao').reset()
    document.getElementById('modal-alert').innerHTML = ''
    UI.showModal('modal-depreciacao')
    
    // Focar no campo nome
    setTimeout(() => {
        document.getElementById('depreciacao-nome').focus()
    }, 100)
}

window.editarDepreciacao = function(id, nome) {
    editingDepreciacaoId = id
    document.getElementById('modal-titulo').textContent = 'Editar Depreciação'
    document.getElementById('btn-salvar').textContent = '💾 Salvar Alterações'
    document.getElementById('depreciacao-nome').value = nome
    document.getElementById('modal-alert').innerHTML = ''
    UI.showModal('modal-depreciacao')
    
    // Focar no campo nome
    setTimeout(() => {
        document.getElementById('depreciacao-nome').focus()
        document.getElementById('depreciacao-nome').select()
    }, 100)
}

window.fecharModalDepreciacao = function() {
    editingDepreciacaoId = null
    document.getElementById('form-depreciacao').reset()
    UI.hideModal('modal-depreciacao')
}

let depreciacaoParaExcluir = null

window.abrirModalExcluirDepreciacao = function(id, nome) {
    depreciacaoParaExcluir = id
    
    const infoElement = document.getElementById('depreciacao-excluir-info')
    if (infoElement) {
        infoElement.textContent = nome
    } else {
        console.error('Elemento depreciacao-excluir-info não encontrado no DOM')
    }
    
    UI.showModal('modal-confirmar-exclusao-depreciacao')
}

window.confirmarExclusaoDepreciacao = async function() {
    if (!depreciacaoParaExcluir) return

    try {
        await depreciacaoService.deletar(depreciacaoParaExcluir)
        UI.hideModal('modal-confirmar-exclusao-depreciacao')
        await carregarDepreciacoes()
        alert('✅ Depreciação excluída com sucesso!')
    } catch (error) {
        alert('❌ Erro ao excluir depreciação: ' + error.message)
    }

    depreciacaoParaExcluir = null
}

async function handleSalvarDepreciacao(e) {
    e.preventDefault()

    const alertDiv = document.getElementById('modal-alert')

    try {
        UI.showLoading('modal-alert')

        const nome = document.getElementById('depreciacao-nome').value.trim()

        if (!nome) {
            UI.showError('modal-alert', '⚠️ O nome é obrigatório')
            return
        }

        if (editingDepreciacaoId) {
            // Editar depreciação existente
            await depreciacaoService.atualizar(editingDepreciacaoId, { nome })
            UI.showSuccess('modal-alert', '✅ Depreciação atualizada com sucesso!')
        } else {
            // Criar nova depreciação
            await depreciacaoService.criar({ nome })
            UI.showSuccess('modal-alert', '✅ Depreciação criada com sucesso!')
        }

        setTimeout(() => {
            fecharModalDepreciacao()
            carregarDepreciacoes()
        }, 1500)

    } catch (error) {
        console.error('❌ Erro ao salvar depreciação:', error)
        UI.showError('modal-alert', 'Erro: ' + error.message)
    }
}
