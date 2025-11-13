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
        this.navigationHistory = [] // ✅ NOVO: Histórico de navegação
    }

    async init() {
        console.log('🚀 Inicializando router...')

        const existeRoot = await rootService.existeRoot()

        if (!existeRoot) {
            console.log('⚠️ Nenhum ROOT encontrado, redirecionando para setup-root')
            this.navigate('setup-root')
            this.initialized = true
            this.setupAuthListener()
            this.setupBackButtonHandler() // ✅ NOVO
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
        this.setupBackButtonHandler() // ✅ NOVO
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
                this.navigate('login')
                return
            }

            // Login
            if (event === 'SIGNED_IN' && this.currentRoute === 'login') {
                console.log('✅ Login detectado, redirecionando...')
                
                const user = await auth.getCurrentUser()
                
                if (user && user.role === 'root') {
                    console.log('→ Redirecionando ROOT para gerenciar-root')
                    this.navigate('gerenciar-root')
                } else if (user) {
                    console.log('→ Redirecionando usuário para dashboard')
                    this.navigate('dashboard')
                }
            }
        })
    }

    // ✅ NOVO: Interceptar botão voltar do sistema (Android/iOS/Browser)
    setupBackButtonHandler() {
        window.addEventListener('popstate', (event) => {
            console.log('⬅️ Botão voltar pressionado')
            
            // Prevenir comportamento padrão
            event.preventDefault()
            
            // Se há histórico no nosso app, voltar uma página
            if (this.navigationHistory.length > 1) {
                // Remove a rota atual
                this.navigationHistory.pop()
                // Pega a rota anterior
                const previousRoute = this.navigationHistory[this.navigationHistory.length - 1]
                console.log('→ Voltando para:', previousRoute)
                this.navigate(previousRoute, {}, false) // false = não adicionar ao histórico
            } else {
                // Se não há histórico, vai para a rota padrão
                console.log('→ Sem histórico, indo para dashboard/login')
                this.goToDefaultRoute()
            }
        })
        
        console.log('✅ Handler do botão voltar configurado')
    }

    // ✅ NOVO: Ir para rota padrão baseado em autenticação
    async goToDefaultRoute() {
        const user = await auth.getCurrentUser()
        
        if (user && user.role === 'root') {
            this.navigate('gerenciar-root')
        } else if (user) {
            this.navigate('dashboard')
        } else {
            this.navigate('login')
        }
    }

    async navigate(route, params = {}, addToHistory = true) {
        if (this.isNavigating) {
            console.log('⏸️ Navegação já em andamento, ignorando...')
            return
        }

        this.isNavigating = true
        console.log('📍 Navegando para:', route, params)

        const renderFunction = this.routes[route]

        if (!renderFunction) {
            console.error('❌ Rota não encontrada:', route)
            this.isNavigating = false
            return
        }

        this.currentRoute = route
        
        // ✅ NOVO: Adicionar ao histórico (se não for navegação "voltar")
        if (addToHistory) {
            this.navigationHistory.push(route)
            // Atualizar a URL do navegador sem recarregar
            window.history.pushState({ route }, '', `#${route}`)
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
