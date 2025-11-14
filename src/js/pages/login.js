import { auth } from '../auth.js'
import { router } from '../router.js'
import { supabase } from '../supabaseClient.js'
import { UI } from '../ui.js'

export function renderLogin() {
    // Prevenir cache desta página
    window.history.replaceState({ noCache: true, page: 'login' }, '', '#login')
    
    // Adicionar listener para pageshow (para detectar navegação via cache)
    window.addEventListener('pageshow', function(event) {
        if (event.persisted) {
            // Página foi carregada do cache, recarregar
            window.location.reload()
        }
    })
    
    const app = document.getElementById('app')
    
    app.innerHTML = `
        <div class="login-container">
            <div class="login-card">
                <h2>Resultt - PatriGestor</h2>
                <p class="text-center mb-20">Sistema de Gestão de Patrimônio</p>
                
                <div id="login-alert"></div>
                
                <div id="login-view">
                    <form id="login-form">
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" class="form-control" id="email" required>
                        </div>
                        
                        <div class="form-group">
                            <label>Senha</label>
                            <input type="password" class="form-control" id="password" required>
                        </div>
                        
                        <button type="submit" class="btn btn-primary" style="width: 100%;">
                            Entrar
                        </button>
                    </form>
                    
                    <div class="mt-20 text-center" id="primeiro-acesso">
                        <p style="font-size: 12px; color: #7f8c8d;">
                            Primeiro acesso? 
                            <a href="#" onclick="mostrarCadastro(); return false;" style="color: var(--primary);">
                                Criar conta administrador
                            </a>
                        </p>
                    </div>
                </div>
                
                <div id="cadastro-view" style="display: none;">
                    <form id="cadastro-form">
                        <div class="form-group">
                            <label>Nome *</label>
                            <input type="text" class="form-control" id="cadastro-nome" required>
                        </div>
                        
                        <div class="form-group">
                            <label>Email *</label>
                            <input type="email" class="form-control" id="cadastro-email" required>
                        </div>
                        
                        <div class="form-group">
                            <label>Senha * (mín. 6 caracteres)</label>
                            <input type="password" class="form-control" id="cadastro-password" required minlength="6">
                        </div>
                        
                        <button type="submit" class="btn btn-success" style="width: 100%;">
                            Criar Conta
                        </button>
                    </form>
                    
                    <div class="mt-20 text-center">
                        <a href="#" onclick="mostrarLogin(); return false;" style="color: var(--primary); font-size: 12px;">
                            ← Voltar para login
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `
    
    // Verifica se já existe algum admin → esconde link de cadastro
    verificarPrimeiroAcesso()

    document.getElementById('login-form').addEventListener('submit', handleLogin)
    document.getElementById('cadastro-form').addEventListener('submit', handleCadastro)
}

// ========================================
// FUNÇÃO CORRIGIDA - Verifica se existe admin
// ========================================
async function verificarPrimeiroAcesso() {
    try {
        // Chama a função RPC do Supabase que bypassa RLS
        const { data, error } = await supabase.rpc('existe_admin')
        
        if (error) {
            console.warn('Erro ao verificar admin:', error)
            // Em caso de erro, deixa o link visível (comportamento seguro)
            return
        }
        
        // Se existe admin (data === true), esconde o link de cadastro
        if (data === true) {
            const primeiroAcesso = document.getElementById('primeiro-acesso')
            if (primeiroAcesso) {
                primeiroAcesso.style.display = 'none'
            }
        }
        
    } catch (err) {
        console.warn('Não foi possível verificar usuários:', err)
        // Em caso de erro, deixa visível (comportamento seguro)
    }
}

// ========================================
// FUNÇÕES GLOBAIS PARA NAVEGAÇÃO
// ========================================
window.mostrarCadastro = function() {
    document.getElementById('login-view').style.display = 'none'
    document.getElementById('cadastro-view').style.display = 'block'
    document.getElementById('login-alert').innerHTML = ''
}

window.mostrarLogin = function() {
    document.getElementById('login-view').style.display = 'block'
    document.getElementById('cadastro-view').style.display = 'none'
    document.getElementById('login-alert').innerHTML = ''
}

// ========================================
// HANDLE LOGIN
// ========================================
async function handleLogin(e) {
    e.preventDefault()
    
    const email = document.getElementById('email').value.trim()
    const password = document.getElementById('password').value
    
    try {
        UI.showLoading('login-alert')
        
        await auth.signIn(email, password)
    } catch (error) {
        UI.showError('login-alert', error.message)
    }
}

// ========================================
// HANDLE CADASTRO (Primeiro Admin)
// ========================================
async function handleCadastro(e) {
    e.preventDefault()
    
    const nome = document.getElementById('cadastro-nome').value.trim()
    const email = document.getElementById('cadastro-email').value.trim()
    const password = document.getElementById('cadastro-password').value
    
    if (!nome || !email || !password) {
        UI.showError('login-alert', 'Preencha todos os campos')
        return
    }
    
    try {
        UI.showLoading('login-alert')
        
        await auth.signUp(email, password, nome)
        
        UI.showSuccess('login-alert', 'Conta criada com sucesso! Faça login agora.')
        
        setTimeout(() => {
            mostrarLogin()
            document.getElementById('email').value = email
            // Verifica novamente para esconder o link após sucesso
            verificarPrimeiroAcesso()
        }, 2000)
        
    } catch (error) {
        UI.showError('login-alert', error.message)
    }
}