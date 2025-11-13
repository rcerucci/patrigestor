import { auth } from '../auth.js'
import { router } from '../router.js'
import { usuarioService } from '../usuarioService.js'
import { UI } from '../ui.js'

let usuarios = []
let usuarioAtual = null
let currentUserId = null

export async function renderGerenciarUsuarios() {
    const user = await auth.getCurrentUser()

    if (!user || !await auth.hasPermission('admin')) {
        router.navigate('dashboard')
        return
    }

    currentUserId = user.id

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
                <h2 class="card-title" style="margin: 0;">Gerenciar Usuários</h2>
                <button class="btn btn-primary" onclick="abrirModalCriarUsuario()">+ Criar</button>
            </div>

            <div id="lista-usuarios">
                <div class="loading"><div class="spinner"></div><p>Carregando...</p></div>
            </div>
        </div>

        <!-- Modal Criar/Editar -->
        <div id="modal-usuario" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="modal-titulo">Criar Novo Usuário</h3>
                    <span class="modal-close" onclick="fecharModalUsuario()">×</span>
                </div>

                <div id="usuario-alert"></div>

                <form id="usuario-form">
                    <div class="form-group">
                        <label>Nome *</label>
                        <input 
                            type="text" 
                            class="form-control" 
                            id="nome" 
                            required 
                            autocomplete="name"
                        >
                    </div>

                    <div class="form-group">
                        <label>Email *</label>
                        <input 
                            type="email" 
                            class="form-control" 
                            id="email" 
                            required 
                            autocomplete="email"
                        >
                    </div>

                    <div class="form-group">
                        <label>Nível de Acesso *</label>
                        <select class="form-control" id="role" required>
                            <option value="">Selecione</option>
                            <option value="viewer">👁️ Visualizador</option>
                            <option value="editor">✏️ Editor</option>
                            <option value="admin">⚙️ Admin</option>
                        </select>
                    </div>

                    <div class="form-group" id="senha-group">
                        <label>Senha *</label>
                        <input 
                            type="password" 
                            class="form-control" 
                            id="senha" 
                            minlength="6" 
                            autocomplete="new-password"
                        >
                        <small style="color: #6b7280;">Mínimo 6 caracteres</small>
                    </div>

                    <div style="display: flex; gap: 10px; margin-top: 20px; flex-wrap: wrap;">
                        <button type="submit" class="btn btn-success" style="flex: 1; min-width: 120px;">💾 Salvar</button>
                        <button type="button" class="btn btn-secondary" onclick="fecharModalUsuario()">Cancelar</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Modal Exclusão -->
        <div id="modal-confirmar-exclusao-usuario" class="modal">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3>⚠️ Confirmar Exclusão</h3>
                    <span class="modal-close" onclick="fecharModalExclusaoUsuario()">×</span>
                </div>

                <div style="padding: 20px;">
                    <p style="font-size: 16px; margin-bottom: 20px;">
                        Excluir <strong style="color: #ef4444;">permanentemente</strong> este usuário?
                    </p>
                    <p id="usuario-excluir-info" style="font-weight: bold; color: #2c3e50; background: #f3f4f6; padding: 15px; border-radius: 8px;"></p>
                    <p style="color: #f59e0b; margin-top: 15px; font-size: 14px;">
                        ⚠️ Esta ação não pode ser desfeita!
                    </p>

                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button class="btn btn-danger" onclick="confirmarExclusaoUsuario()">Sim, Excluir</button>
                        <button class="btn btn-secondary" onclick="fecharModalExclusaoUsuario()">Cancelar</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal Reset Senha -->
        <div id="modal-reset-senha" class="modal">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3>🔑 Resetar Senha</h3>
                    <span class="modal-close" onclick="fecharModalResetSenha()">×</span>
                </div>

                <div id="reset-senha-alert"></div>

                <form id="reset-senha-form" style="padding: 20px;">
                    <p style="margin-bottom: 20px; background: #eff6ff; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6;">
                        Resetar senha para: <strong id="usuario-reset-nome" style="color: #1e3a8a;"></strong>
                    </p>

                    <div class="form-group">
                        <label>Nova Senha *</label>
                        <input 
                            type="password" 
                            class="form-control" 
                            id="nova-senha" 
                            minlength="6" 
                            required 
                            autocomplete="new-password"
                        >
                        <small style="color: #6b7280;">Mínimo 6 caracteres</small>
                    </div>

                    <div class="form-group">
                        <label>Confirmar Senha *</label>
                        <input 
                            type="password" 
                            class="form-control" 
                            id="confirmar-senha" 
                            minlength="6" 
                            required 
                            autocomplete="new-password"
                        >
                    </div>

                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button type="submit" class="btn btn-primary" style="flex: 1;">🔑 Resetar</button>
                        <button type="button" class="btn btn-secondary" onclick="fecharModalResetSenha()">Cancelar</button>
                    </div>
                </form>
            </div>
        </div>
    `

    await carregarUsuarios()

    document.getElementById('usuario-form').addEventListener('submit', handleSalvarUsuario)
    document.getElementById('reset-senha-form').addEventListener('submit', handleResetSenha)
}

async function carregarUsuarios() {
    try {
        usuarios = await usuarioService.listar()
        renderUsuarios()
    } catch (error) {
        document.getElementById('lista-usuarios').innerHTML = `
            <div class="alert alert-error">Erro ao carregar usuários: ${error.message}</div>
        `
    }
}

function renderUsuarios() {
    const lista = document.getElementById('lista-usuarios')

    if (usuarios.length === 0) {
        lista.innerHTML = '<p class="text-center">Nenhum usuário encontrado.</p>'
        return
    }

    lista.innerHTML = `
        <!-- 📱 MOBILE: Cards -->
        <div class="mobile-only" style="display: none;">
            ${usuarios.map(u => renderUserCard(u)).join('')}
        </div>

        <!-- 💻 DESKTOP: Tabela -->
        <div class="desktop-only table-container">
            <table>
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Email</th>
                        <th>Nível</th>
                        <th>Status</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${usuarios.map(u => renderUserRow(u)).join('')}
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

function renderUserCard(u) {
    const isCurrentUser = u.id === currentUserId
    const { badge, badgeClass } = getUserBadge(u.role)

    return `
        <div style="background: white; border: 2px solid #e5e7eb; border-radius: 12px; padding: 15px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #1e3a8a; font-size: 16px; margin-bottom: 4px;">
                        ${u.nome}
                        ${isCurrentUser ? '<span style="color: #3b82f6; font-size: 13px;">(Você)</span>' : ''}
                    </div>
                    <div style="font-size: 14px; color: #6b7280;">${u.email}</div>
                </div>
                <span class="user-badge ${badgeClass}" style="font-size: 11px;">${badge}</span>
            </div>

            <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 12px;">
                <span style="display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; ${u.ativo ? 'background: #d1fae5; color: #065f46;' : 'background: #fee2e2; color: #991b1b;'}">
                    ${u.ativo ? '✓ Ativo' : '✗ Inativo'}
                </span>
            </div>

            ${!isCurrentUser && u.role !== 'root' ? `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                    <button class="btn btn-primary btn-small" onclick="abrirModalEditarUsuario('${u.id}')">✏️ Editar</button>
                    <button class="btn btn-warning btn-small" onclick="abrirModalResetSenha('${u.id}')">🔑 Senha</button>
                    <button class="btn btn-secondary btn-small" onclick="toggleAtivoUsuario('${u.id}', ${u.ativo})">${u.ativo ? '🔒 Desativar' : '🔓 Ativar'}</button>
                    <button class="btn btn-danger btn-small" onclick="abrirModalExcluirUsuario('${u.id}')">🗑️ Excluir</button>
                </div>
            ` : isCurrentUser ? `
                <p style="color: #6b7280; font-style: italic; font-size: 13px; text-align: center; margin: 0;">
                    🔒 Você não pode gerenciar seu próprio usuário
                </p>
            ` : `
                <p style="color: #ef4444; font-weight: 600; font-size: 13px; text-align: center; margin: 0;">
                    🔴 ROOT - Protegido
                </p>
            `}
        </div>
    `
}

// ✅ CORRIGIDO: Botões com labels no desktop
function renderUserRow(u) {
    const isCurrentUser = u.id === currentUserId
    const { badge, badgeClass } = getUserBadge(u.role)

    return `
        <tr>
            <td>
                ${u.nome} 
                ${isCurrentUser ? '<span style="color: #3b82f6; font-weight: 600;">(Você)</span>' : ''}
            </td>
            <td>${u.email}</td>
            <td><span class="user-badge ${badgeClass}">${badge}</span></td>
            <td>
                <span style="display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; ${u.ativo ? 'background: #d1fae5; color: #065f46;' : 'background: #fee2e2; color: #991b1b;'}">
                    ${u.ativo ? '✓ Ativo' : '✗ Inativo'}
                </span>
            </td>
            <td>
                ${!isCurrentUser && u.role !== 'root' ? `
                    <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                        <button class="btn btn-primary btn-small" onclick="abrirModalEditarUsuario('${u.id}')" title="Editar usuário">✏️ Editar</button>
                        <button class="btn btn-warning btn-small" onclick="abrirModalResetSenha('${u.id}')" title="Resetar senha">🔑 Senha</button>
                        <button class="btn btn-secondary btn-small" onclick="toggleAtivoUsuario('${u.id}', ${u.ativo})" title="${u.ativo ? 'Desativar usuário' : 'Ativar usuário'}">${u.ativo ? '🔒 Desativar' : '🔓 Ativar'}</button>
                        <button class="btn btn-danger btn-small" onclick="abrirModalExcluirUsuario('${u.id}')" title="Excluir usuário">🗑️ Excluir</button>
                    </div>
                ` : isCurrentUser ? `
                    <span style="color: #6b7280; font-style: italic; font-size: 13px;">
                        🔒 Você não pode gerenciar seu próprio usuário
                    </span>
                ` : `
                    <span style="color: #ef4444; font-weight: 600; font-size: 13px;">🔴 ROOT - Protegido</span>
                `}
            </td>
        </tr>
    `
}

function getUserBadge(role) {
    if (role === 'root') return { badge: 'ROOT', badgeClass: 'badge-root' }
    if (role === 'admin') return { badge: 'ADMIN', badgeClass: 'badge-admin' }
    if (role === 'editor') return { badge: 'EDITOR', badgeClass: 'badge-editor' }
    return { badge: 'VIEWER', badgeClass: 'badge-viewer' }
}

window.abrirModalCriarUsuario = function() {
    usuarioAtual = null
    document.getElementById('modal-titulo').textContent = 'Criar Novo Usuário'
    document.getElementById('usuario-form').reset()
    document.getElementById('email').disabled = false
    document.getElementById('senha-group').style.display = 'block'
    document.getElementById('senha').required = true
    document.getElementById('usuario-alert').innerHTML = ''
    UI.showModal('modal-usuario')
}

window.fecharModalUsuario = function() {
    usuarioAtual = null
    document.getElementById('usuario-form').reset()
    UI.hideModal('modal-usuario')
}

window.abrirModalEditarUsuario = async function(userId) {
    usuarioAtual = usuarios.find(u => u.id === userId)
    if (!usuarioAtual) return alert('Usuário não encontrado')

    document.getElementById('modal-titulo').textContent = 'Editar Usuário'
    document.getElementById('nome').value = usuarioAtual.nome
    document.getElementById('email').value = usuarioAtual.email
    document.getElementById('email').disabled = true
    document.getElementById('role').value = usuarioAtual.role
    document.getElementById('senha-group').style.display = 'none'
    document.getElementById('senha').required = false
    document.getElementById('usuario-alert').innerHTML = ''
    UI.showModal('modal-usuario')
}

async function handleSalvarUsuario(e) {
    e.preventDefault()

    try {
        UI.showLoading('usuario-alert')

        const dados = {
            nome: document.getElementById('nome').value,
            email: document.getElementById('email').value,
            role: document.getElementById('role').value
        }

        if (!usuarioAtual) {
            dados.senha = document.getElementById('senha').value
            if (dados.senha.length < 6) {
                UI.showError('usuario-alert', '⚠️ A senha deve ter no mínimo 6 caracteres')
                return
            }
            await usuarioService.criar(dados)
            UI.showSuccess('usuario-alert', '✅ Usuário criado!')
        } else {
            await usuarioService.atualizar(usuarioAtual.id, dados)
            UI.showSuccess('usuario-alert', '✅ Usuário atualizado!')
        }

        setTimeout(async () => {
            UI.hideModal('modal-usuario')
            await carregarUsuarios()
        }, 1500)

    } catch (error) {
        console.error('Erro ao salvar usuário:', error)
        UI.showError('usuario-alert', 'Erro: ' + error.message)
    }
}

window.abrirModalExcluirUsuario = function(userId) {
    usuarioAtual = usuarios.find(u => u.id === userId)
    if (!usuarioAtual) return alert('Usuário não encontrado')

    document.getElementById('usuario-excluir-info').textContent = `${usuarioAtual.nome} (${usuarioAtual.email})`
    UI.showModal('modal-confirmar-exclusao-usuario')
}

window.fecharModalExclusaoUsuario = function() {
    UI.hideModal('modal-confirmar-exclusao-usuario')
}

window.confirmarExclusaoUsuario = async function() {
    if (!usuarioAtual) return

    try {
        await usuarioService.deletar(usuarioAtual.id)
        UI.hideModal('modal-confirmar-exclusao-usuario')
        alert('✅ Usuário excluído!')
        await carregarUsuarios()
    } catch (error) {
        alert('❌ Erro: ' + error.message)
    }
}

window.toggleAtivoUsuario = async function(userId, ativoAtual) {
    const acao = ativoAtual ? 'desativar' : 'ativar'
    if (!confirm(`Deseja ${acao} este usuário?`)) return

    try {
        await usuarioService.atualizar(userId, { ativo: !ativoAtual })
        alert(`✅ Usuário ${acao === 'desativar' ? 'desativado' : 'ativado'}!`)
        await carregarUsuarios()
    } catch (error) {
        alert(`❌ Erro: ` + error.message)
    }
}

window.abrirModalResetSenha = function(userId) {
    usuarioAtual = usuarios.find(u => u.id === userId)
    if (!usuarioAtual) return alert('Usuário não encontrado')

    document.getElementById('usuario-reset-nome').textContent = usuarioAtual.nome
    document.getElementById('reset-senha-form').reset()
    document.getElementById('reset-senha-alert').innerHTML = ''
    UI.showModal('modal-reset-senha')
}

window.fecharModalResetSenha = function() {
    UI.hideModal('modal-reset-senha')
}

async function handleResetSenha(e) {
    e.preventDefault()

    const novaSenha = document.getElementById('nova-senha').value
    const confirmarSenha = document.getElementById('confirmar-senha').value

    if (novaSenha !== confirmarSenha) {
        UI.showError('reset-senha-alert', '⚠️ As senhas não coincidem!')
        return
    }

    if (novaSenha.length < 6) {
        UI.showError('reset-senha-alert', '⚠️ A senha deve ter no mínimo 6 caracteres!')
        return
    }

    try {
        UI.showLoading('reset-senha-alert')
        await usuarioService.resetarSenha(usuarioAtual.id, novaSenha)
        UI.showSuccess('reset-senha-alert', '✅ Senha resetada!')

        setTimeout(() => {
            UI.hideModal('modal-reset-senha')
        }, 1500)

    } catch (error) {
        console.error('Erro ao resetar senha:', error)
        UI.showError('reset-senha-alert', 'Erro: ' + error.message)
    }
}
