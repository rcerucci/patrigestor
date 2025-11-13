import { rootService } from '../rootService.js'
import { router } from '../router.js'
import { UI } from '../ui.js'

export async function renderSetupRoot() {
    // Verificar se já existe ROOT
    const jaExiste = await rootService.existeRoot()
    
    if (jaExiste) {
        // Se já existe, redirecionar para login
        router.navigate('login')
        return
    }

    const app = document.getElementById('app')

    app.innerHTML = `
        <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
            <div class="card" style="max-width: 500px; width: 100%; margin: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #e74c3c; font-size: 48px; margin-bottom: 10px;">🔴</h1>
                    <h2 style="color: #2c3e50; margin-bottom: 10px;">Configuração Inicial</h2>
                    <p style="color: #7f8c8d;">Nenhum usuário ROOT encontrado. Crie o primeiro ROOT para começar a usar o sistema.</p>
                </div>

                <div id="setup-alert"></div>

                <form id="form-setup-root">
                    <div class="form-group">
                        <label>Nome Completo *</label>
                        <input type="text" class="form-control" id="root-nome" required placeholder="Ex: Administrador do Sistema">
                    </div>

                    <div class="form-group">
                        <label>Email *</label>
                        <input type="email" class="form-control" id="root-email" required placeholder="root@sistema.com" autocomplete="email">
                    </div>

                    <div class="form-group">
                        <label>Senha *</label>
                        <input type="password" class="form-control" id="root-senha" required minlength="6" placeholder="Mínimo 6 caracteres" autocomplete="new-password">
                        <small style="color: #7f8c8d;">A senha deve ter no mínimo 6 caracteres</small>
                    </div>

                    <div class="form-group">
                        <label>Confirmar Senha *</label>
                        <input type="password" class="form-control" id="root-confirmar-senha" required minlength="6" placeholder="Digite a senha novamente" autocomplete="new-password">
                    </div>

                    <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <strong style="color: #856404;">⚠️ Atenção:</strong>
                        <ul style="margin: 10px 0 0 20px; color: #856404;">
                            <li>O usuário ROOT tem acesso total ao sistema</li>
                            <li>Apenas UM ROOT pode ser criado</li>
                            <li>Guarde essas credenciais com segurança</li>
                        </ul>
                    </div>

                    <button type="submit" class="btn btn-danger" style="width: 100%; padding: 15px; font-size: 16px; font-weight: bold;">
                        🔴 CRIAR ROOT E COMEÇAR
                    </button>
                </form>
            </div>
        </div>
    `

    document.getElementById('form-setup-root').addEventListener('submit', handleSetupRoot)
}

async function handleSetupRoot(e) {
    e.preventDefault()

    const nome = document.getElementById('root-nome').value.trim()
    const email = document.getElementById('root-email').value.trim()
    const senha = document.getElementById('root-senha').value
    const confirmarSenha = document.getElementById('root-confirmar-senha').value

    // Validações
    if (!nome || !email || !senha) {
        UI.showError('setup-alert', 'Preencha todos os campos obrigatórios')
        return
    }

    if (senha !== confirmarSenha) {
        UI.showError('setup-alert', 'As senhas não coincidem!')
        return
    }

    if (senha.length < 6) {
        UI.showError('setup-alert', 'A senha deve ter no mínimo 6 caracteres')
        return
    }

    try {
        UI.showLoading('setup-alert')

        await rootService.criarRoot({ nome, email, senha })

        UI.showSuccess('setup-alert', '✅ ROOT criado com sucesso! Redirecionando para login...')

        setTimeout(() => {
            router.navigate('login')
        }, 2000)

    } catch (error) {
        console.error('Erro ao criar ROOT:', error)
        UI.showError('setup-alert', error.message)
    }
}
