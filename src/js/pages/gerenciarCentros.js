import { auth } from '../auth.js'
import { router } from '../router.js'
import { centroCustoService } from '../centroCustoService.js'
import { UI } from '../ui.js'

let editingCentroId = null

export async function renderGerenciarCentros() {
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
                <h2 class="card-title" style="margin: 0;">Gerenciar Centros de Custo</h2>
                <button class="btn btn-primary" onclick="abrirModalNovoCentro()">+ Criar Centro</button>
            </div>

            <div id="centros-content" style="margin-top: 20px;">
                <div class="loading"><div class="spinner"></div><p>Carregando...</p></div>
            </div>
        </div>

        <!-- Modal Criar/Editar Centro -->
        <div id="modal-centro" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="modal-titulo">Criar Novo Centro de Custo</h3>
                    <span class="modal-close" onclick="fecharModalCentro()">×</span>
                </div>

                <div id="modal-alert"></div>

                <form id="form-centro">
                    <div class="form-group">
                        <label>Nome *</label>
                        <input 
                            type="text" 
                            class="form-control" 
                            id="centro-nome" 
                            required
                            placeholder="Ex: Matriz SP"
                        >
                    </div>

                    <div class="form-group">
                        <label>Descrição</label>
                        <textarea 
                            class="form-control" 
                            id="centro-descricao" 
                            rows="3"
                            placeholder="Descrição opcional do centro de custo"
                        ></textarea>
                    </div>

                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <button type="submit" class="btn btn-success" id="btn-salvar" style="flex: 1; min-width: 120px;">💾 Salvar</button>
                        <button type="button" class="btn btn-secondary" onclick="fecharModalCentro()">Cancelar</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Modal Confirmar Exclusão CENTRO -->
        <div id="modal-confirmar-exclusao-centro" class="modal">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3>⚠️ Confirmar Exclusão</h3>
                    <span class="modal-close" onclick="UI.hideModal('modal-confirmar-exclusao-centro')">×</span>
                </div>

                <div style="padding: 20px;">
                    <p style="font-size: 16px; margin-bottom: 20px;">
                        Tem certeza que deseja <strong style="color: #ef4444;">excluir permanentemente</strong> este centro de custo?
                    </p>
                    <p id="centro-excluir-info" style="font-weight: bold; color: #2c3e50; background: #f3f4f6; padding: 15px; border-radius: 8px;"></p>
                    <p style="color: #f59e0b; margin-top: 15px; font-size: 14px;">
                        ⚠️ Patrimônios vinculados a este centro ficarão sem centro de custo!
                    </p>

                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button class="btn btn-danger" onclick="confirmarExclusaoCentro()">Sim, Excluir</button>
                        <button class="btn btn-secondary" onclick="UI.hideModal('modal-confirmar-exclusao-centro')">Cancelar</button>
                    </div>
                </div>
            </div>
        </div>
    `

    document.getElementById('form-centro').addEventListener('submit', handleSalvarCentro)

    await carregarCentros()
}

async function carregarCentros() {
    try {
        const centros = await centroCustoService.listar()
        renderCentros(centros)
    } catch (error) {
        console.error('Erro ao carregar centros:', error)
        const contentElement = document.getElementById('centros-content')
        if (contentElement) {
            contentElement.innerHTML = `
                <div class="alert alert-error">Erro ao carregar centros: ${error.message}</div>
            `
        }
    }
}

function renderCentros(centros) {
    const content = document.getElementById('centros-content')
    
    if (!content) {
        console.error('Elemento centros-content não encontrado')
        return
    }

    if (centros.length === 0) {
        content.innerHTML = '<p class="text-center">Nenhum centro de custo cadastrado.</p>'
        return
    }

    content.innerHTML = `
        <!-- 📱 MOBILE: Cards -->
        <div class="mobile-only" style="display: none;">
            ${centros.map(c => renderCentroCard(c)).join('')}
        </div>

        <!-- 💻 DESKTOP: Tabela -->
        <div class="desktop-only table-container">
            <table>
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Descrição</th>
                        <th style="width: 200px;">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${centros.map(c => renderCentroRow(c)).join('')}
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
function renderCentroCard(c) {
    return `
        <div style="background: white; border: 2px solid #e5e7eb; border-radius: 12px; padding: 15px; margin-bottom: 12px;">
            <div style="margin-bottom: 12px;">
                <div style="font-weight: 600; color: #1e3a8a; font-size: 16px; margin-bottom: 4px;">
                    ${c.nome}
                </div>
                <div style="font-size: 14px; color: #6b7280;">
                    ${c.descricao || '<em style="color: #9ca3af;">Sem descrição</em>'}
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                <button 
                    class="btn btn-primary btn-small" 
                    onclick="editarCentro('${c.id}', '${c.nome.replace(/'/g, "\\'")}', '${(c.descricao || '').replace(/'/g, "\\'")}')"
                >
                    ✏️ Editar
                </button>
                <button 
                    class="btn btn-danger btn-small" 
                    onclick="abrirModalExcluirCentro('${c.id}', '${c.nome.replace(/'/g, "\\'")}')"
                    title="Deletar centro de custo"        // ✅ DENTRO
                >
                    🗑️ Deletar
                </button>
            </div>
        </div>
    `
}

// ✅ Linha para desktop
function renderCentroRow(c) {
    return `
        <tr>
            <td><strong>${c.nome}</strong></td>
            <td>${c.descricao || '-'}</td>
            <td>
                <div style="display: flex; gap: 5px;">
                    <button 
                        class="btn btn-primary btn-small" 
                        onclick="editarCentro('${c.id}', '${c.nome.replace(/'/g, "\\'")}', '${(c.descricao || '').replace(/'/g, "\\'")}')"
                        title="Editar centro de custo"
                    >
                        ✏️ Editar
                    </button>
                    <button 
                        class="btn btn-danger btn-small" 
                        onclick="abrirModalExcluirCentro('${c.id}', '${c.nome.replace(/'/g, "\\'")}')"
                        title="Deletar centro de custo"
                    >
                        🗑️ Deletar
                    </button>
                </div>
            </td>
        </tr>
    `
}

window.abrirModalNovoCentro = function() {
    editingCentroId = null
    document.getElementById('modal-titulo').textContent = 'Criar Novo Centro de Custo'
    document.getElementById('btn-salvar').textContent = '💾 Criar Centro'
    document.getElementById('form-centro').reset()
    document.getElementById('modal-alert').innerHTML = ''
    UI.showModal('modal-centro')
    
    // Focar no campo nome
    setTimeout(() => {
        document.getElementById('centro-nome').focus()
    }, 100)
}

window.editarCentro = function(id, nome, descricao) {
    editingCentroId = id
    document.getElementById('modal-titulo').textContent = 'Editar Centro de Custo'
    document.getElementById('btn-salvar').textContent = '💾 Salvar Alterações'
    document.getElementById('centro-nome').value = nome
    document.getElementById('centro-descricao').value = descricao
    document.getElementById('modal-alert').innerHTML = ''
    UI.showModal('modal-centro')
    
    // Focar no campo nome
    setTimeout(() => {
        document.getElementById('centro-nome').focus()
        document.getElementById('centro-nome').select()
    }, 100)
}

window.fecharModalCentro = function() {
    editingCentroId = null
    document.getElementById('form-centro').reset()
    UI.hideModal('modal-centro')
}

let centroParaExcluir = null

window.abrirModalExcluirCentro = function(id, nome) {
    centroParaExcluir = id
    
    const infoElement = document.getElementById('centro-excluir-info')
    if (infoElement) {
        infoElement.textContent = nome
    } else {
        console.error('Elemento centro-excluir-info não encontrado no DOM')
    }
    
    UI.showModal('modal-confirmar-exclusao-centro')
}

window.confirmarExclusaoCentro = async function() {
    if (!centroParaExcluir) return

    try {
        await centroCustoService.deletar(centroParaExcluir)
        UI.hideModal('modal-confirmar-exclusao-centro')
        await carregarCentros()
        alert('✅ Centro de custo excluído com sucesso!')
    } catch (error) {
        alert('❌ Erro ao excluir centro de custo: ' + error.message)
    }

    centroParaExcluir = null
}

async function handleSalvarCentro(e) {
    e.preventDefault()

    const alertDiv = document.getElementById('modal-alert')

    try {
        UI.showLoading('modal-alert')

        const nome = document.getElementById('centro-nome').value.trim()
        const descricao = document.getElementById('centro-descricao').value.trim()

        if (!nome) {
            UI.showError('modal-alert', '⚠️ O nome é obrigatório')
            return
        }

        if (editingCentroId) {
            // Editar centro existente
            await centroCustoService.atualizar(editingCentroId, { nome, descricao })
            UI.showSuccess('modal-alert', '✅ Centro de custo atualizado com sucesso!')
        } else {
            // Criar novo centro
            await centroCustoService.criar({ nome, descricao })
            UI.showSuccess('modal-alert', '✅ Centro de custo criado com sucesso!')
        }

        setTimeout(() => {
            fecharModalCentro()
            carregarCentros()
        }, 1500)

    } catch (error) {
        console.error('❌ Erro ao salvar centro de custo:', error)
        UI.showError('modal-alert', 'Erro: ' + error.message)
    }
}
