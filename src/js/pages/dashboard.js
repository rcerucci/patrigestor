import { auth } from '../auth.js'
import { router } from '../router.js'

export async function renderDashboard() {
    const user = await auth.getCurrentUser()

    if (!user) {
        router.navigate('login')
        return
    }

    // Se for ROOT, redirecionar para painel ROOT
    if (user.role === 'root') {
        router.navigate('gerenciar-root')
        return
    }

    const app = document.getElementById('app')

    const isAdmin = await auth.hasPermission('admin')
    const isEditor = await auth.hasPermission('editor')

    app.innerHTML = `
        <div class="header">
            <h1>🏢 Resultt - PatriGestor</h1>
            <div class="user-info">
                <span class="user-name">${user.nome}</span>
                <span class="user-badge ${
                    user.role === 'admin' ? 'badge-admin' : 
                    user.role === 'editor' ? 'badge-editor' : 
                    'badge-viewer'
                }">
                    ${user.role === 'admin' ? 'ADMIN' : user.role === 'editor' ? 'EDITOR' : 'VIEWER'}
                </span>
                <button class="btn btn-secondary btn-small" onclick="handleLogout()">Sair</button>
            </div>
        </div>

        <div class="card">
            <h2 class="card-title">Bem-vindo ao Sistema</h2>
            <p style="color: #7f8c8d; margin-bottom: 30px;">Selecione uma opção abaixo para começar:</p>

            <div class="dashboard-grid">
                ${isEditor ? `
                    <div class="dashboard-card" onclick="window.appRouter.navigate('cadastro-patrimonio')">
                        <div class="card-icon">📦</div>
                        <h3>Cadastrar Patrimônio</h3>
                        <p>Adicione novo item ao inventário</p>
                    </div>
                ` : ''}

                <div class="dashboard-card" onclick="window.appRouter.navigate('lista-patrimonios')">
                    <div class="card-icon">📋</div>
                    <h3>Lista de Patrimônios</h3>
                    <p>Ver todos os itens cadastrados</p>
                </div>

                <div class="dashboard-card" onclick="window.appRouter.navigate('relatorios')">
                    <div class="card-icon">📊</div>
                    <h3>Relatórios</h3>
                    <p>Gerar relatórios personalizados</p>
                </div>

                ${isAdmin ? `
                    <div class="dashboard-card" onclick="window.appRouter.navigate('gerenciar-usuarios')">
                        <div class="card-icon">👥</div>
                        <h3>Gerenciar Usuários</h3>
                        <p>Criar e gerenciar usuários</p>
                    </div>

                    <div class="dashboard-card" onclick="window.appRouter.navigate('gerenciar-centros')">
                        <div class="card-icon">🏢</div>
                        <h3>Centros de Custo</h3>
                        <p>Gerenciar centros de custo</p>
                    </div>
                ` : ''}
            </div>
        </div>
    `
}

window.handleLogout = async function() {
    if (confirm('Deseja realmente sair do sistema?')) {
        try {
            await auth.signOut()
            router.navigate('login')
        } catch (error) {
            alert('Erro ao sair: ' + error.message)
        }
    }
}
