import { auth } from './auth.js'
import { rootService } from './rootService.js'

import { renderLogin } from './pages/login.js'
import { renderSetupRoot } from './pages/setupRoot.js'
import { renderDashboard } from './pages/dashboard.js'
import { renderCadastroPatrimonio } from './pages/cadastroPatrimonio.js'
import { renderListaPatrimonios } from './pages/listaPatrimonios.js'
import { renderEditarPatrimonio } from './pages/editarPatrimonio.js'
import { renderRelatorios } from './pages/relatorios.js'
import { renderGerenciarUsuarios } from './pages/gerenciarUsuarios.js'
import { renderGerenciarCentros } from './pages/gerenciarCentros.js'
import { renderGerenciarRoot } from './pages/gerenciarRoot.js'

class Router {
    constructor() {
        this.routes = {
            'login': renderLogin,
            'setup-root': renderSetupRoot,
            'dashboard': renderDashboard,
            'cadastro-patrimonio': renderCadastroPatrimonio,
            'lista-patrimonios': renderListaPatrimonios,
            'editar-patrimonio': renderEditarPatrimonio,
            'relatorios': renderRelatorios,
            'gerenciar-usuarios': renderGerenciarUsuarios,
            'gerenciar-centros': renderGerenciarCentros,
            'gerenciar-root': renderGerenciarRoot
        }

        this.currentRoute = null
        this.isNavigating = false
        this.authStateChangeInProgress = false
        this.initialized = false
        this.navigationHistory = []
        this.protectedRoutes = ['dashboard', 'cadastro-patrimonio', 'lista-patrimonios', 
                                'editar-patrimonio', 'relatorios', 'gerenciar-usuarios', 
                                'gerenciar-centros', 'gerenciar-root']
    }

    async init() {
        console.log('🚀 Inicializando router...')

        const existeRoot = await rootService.existeRoot()

        if (!existeRoot) {
            console.log('⚠️ Nenhum ROOT encontrado, redirecionando para setup-root')
            this.navigate('setup-root')
            this.initialized = true
            this.setupAuthListener()
            this.setupBackButtonHandler()
            return
        }

        const user = await auth.getCurrentUser()

        if (user && user.role === 'root') {
            console.log('🔴 Usuário ROOT detectado')
            this.navigate('gerenciar-root')
        } else if (user) {
            console.log('✅ Usuário autenticado:', user.nome)
            this.navigate('dashboard')
        } else {
            console.log('❌ Usuário não autenticado')
            this.navigate('login')
        }

        this.initialized = true
        this.setupAuthListener()
        this.setupBackButtonHandler()
    }

    setupAuthListener() {
        auth.onAuthStateChange(async (event, session) => {
            console.log('🔄 Auth state changed:', event)

            if (!this.initialized) {
                console.log('⏭️ Ignorando evento durante inicialização')
                return
            }

            if (this.authStateChangeInProgress) {
                console.log('⏭️ Ignorando evento durante operação de criação')
                return
            }

            // Logout
            if (event === 'SIGNED_OUT' && this.currentRoute !== 'login' && this.currentRoute !== 'setup-root') {
                console.log('🔓 Logout detectado, redirecionando para login')
                // Limpar histórico ao fazer logout
                this.navigationHistory = []
                this.navigate('login', {}, true)
                return
            }

            // Login
            if (event === 'SIGNED_IN' && this.currentRoute === 'login') {
                console.log('✅ Login detectado, redirecionando...')
                
                const user = await auth.getCurrentUser()
                
                if (user && user.role === 'root') {
                    console.log('→ Redirecionando ROOT para gerenciar-root')
                    this.navigate('gerenciar-root', {}, true)
                } else if (user) {
                    console.log('→ Redirecionando usuário para dashboard')
                    this.navigate('dashboard', {}, true)
                }
            }
        })
    }

    // Interceptar botão voltar do sistema (Android/iOS/Browser)
    setupBackButtonHandler() {
        // Substituir estado inicial para prevenir cache do login
        if (window.history.state === null) {
            window.history.replaceState({ route: 'login', canGoBack: false }, '', '#login')
        }

        window.addEventListener('popstate', async (event) => {
            console.log('⬅️ Botão voltar pressionado')
            console.log('Estado atual:', event.state)
            console.log('Rota atual:', this.currentRoute)
            
            // Obter usuário atual
            const user = await auth.getCurrentUser()
            
            // Se tentar voltar para um estado sem permissão de voltar
            if (event.state && event.state.canGoBack === false) {
                console.log('🚫 Bloqueado pelo estado - não pode voltar mais')
                await this.goToDefaultRoute()
                return
            }
            
            // Se o usuário está autenticado e a rota atual (após popstate) é login
            if (user && (this.currentRoute === 'login' || event.state?.route === 'login')) {
                console.log('🚫 Bloqueando volta para login - usuário autenticado')
                
                // Substituir estado para evitar voltar novamente
                if (user.role === 'root') {
                    window.history.replaceState({ route: 'gerenciar-root', canGoBack: false }, '', '#gerenciar-root')
                    this.navigate('gerenciar-root', {}, false)
                } else {
                    window.history.replaceState({ route: 'dashboard', canGoBack: false }, '', '#dashboard')
                    this.navigate('dashboard', {}, false)
                }
                return
            }
            
            // Se há histórico no nosso app, voltar uma página
            if (this.navigationHistory.length > 1) {
                // Remove a rota atual
                this.navigationHistory.pop()
                // Pega a rota anterior
                const previousRoute = this.navigationHistory[this.navigationHistory.length - 1]
                
                // Se a rota anterior é login e usuário está autenticado, vai para rota padrão
                if (previousRoute === 'login' && user) {
                    console.log('🚫 Bloqueando volta para login do histórico')
                    this.navigationHistory = [] // Limpa histórico
                    
                    await this.goToDefaultRoute()
                    return
                }
                
                console.log('↩️ Voltando para:', previousRoute)
                // Remove o último item para não duplicar quando navigate adicionar
                this.navigationHistory.pop()
                this.navigate(previousRoute, {}, false)
            } else {
                // Se não há histórico, vai para a rota padrão
                console.log('↩️ Sem histórico, indo para rota padrão')
                await this.goToDefaultRoute()
            }
        })
        
        console.log('✅ Handler do botão voltar configurado')
    }

    // Ir para rota padrão baseado em autenticação
    async goToDefaultRoute() {
        const user = await auth.getCurrentUser()
        
        if (user && user.role === 'root') {
            // Substituir estado para bloquear volta
            window.history.replaceState({ route: 'gerenciar-root', canGoBack: false }, '', '#gerenciar-root')
            this.navigate('gerenciar-root', {}, false)
        } else if (user) {
            // Substituir estado para bloquear volta
            window.history.replaceState({ route: 'dashboard', canGoBack: false }, '', '#dashboard')
            this.navigate('dashboard', {}, false)
        } else {
            this.navigate('login', {}, false)
        }
    }

    async navigate(route, params = {}, addToHistory = true) {
        if (this.isNavigating) {
            console.log('⏸️ Navegação já em andamento, ignorando...')
            return
        }

        this.isNavigating = true
        console.log('🗺️ Navegando para:', route, params)

        const renderFunction = this.routes[route]

        if (!renderFunction) {
            console.error('❌ Rota não encontrada:', route)
            this.isNavigating = false
            return
        }

        this.currentRoute = route
        
        // Adicionar ao histórico
        if (addToHistory) {
            // Se estiver indo para uma rota protegida após login, limpar histórico anterior
            if (this.protectedRoutes.includes(route) && this.navigationHistory[this.navigationHistory.length - 1] === 'login') {
                console.log('🧹 Limpando histórico de login')
                this.navigationHistory = []
            }
            
            this.navigationHistory.push(route)
            
            // Criar estado com controle de volta
            const state = {
                route: route,
                canGoBack: route !== 'login' && route !== 'setup-root'
            }
            
            // Atualizar a URL do navegador
            window.history.pushState(state, '', `#${route}`)
            console.log('📚 Histórico:', this.navigationHistory)
        }

        try {
            await renderFunction(params)
        } catch (error) {
            console.error('❌ Erro ao renderizar rota:', error)
        }

        this.isNavigating = false
    }

    startAuthOperation() {
        this.authStateChangeInProgress = true
    }

    endAuthOperation() {
        this.authStateChangeInProgress = false
    }
}

export const router = new Router()

window.appRouter = router