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
import { renderGerenciarDepreciacoes } from './pages/gerenciarDepreciacoes.js'
import { renderGerenciarUnidades } from './pages/gerenciarUnidades.js'
import { renderGerenciarRoot } from './pages/gerenciarRoot.js'

/**
 * ✅ ROUTER SIMPLIFICADO v2.0
 * 
 * Sistema de navegação de 2 níveis:
 * - Nível 1: Login / Setup Root / Dashboard Principal / Gerenciar Root
 * - Nível 2: Todas as outras páginas (cadastro, lista, editar, relatórios, etc)
 * 
 * Regra: Sempre que pressionar VOLTAR em uma página de Nível 2, vai para o Dashboard (Nível 1)
 * 
 * Modais: Gerenciados pelo modalManager.js (intercepta voltar para fechar modais)
 */

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
            'gerenciar-depreciacoes': renderGerenciarDepreciacoes,
            'gerenciar-unidades': renderGerenciarUnidades,
            'gerenciar-root': renderGerenciarRoot
        }

        this.currentRoute = null
        this.isNavigating = false
        this.authStateChangeInProgress = false
        this.initialized = false
        
        // ✅ Rotas de Nível 1 (principais) - não podem usar voltar
        this.nivel1Routes = ['login', 'setup-root', 'dashboard', 'gerenciar-root']
        
        // ✅ Rotas de Nível 2 (secundárias) - sempre voltam para dashboard
        this.nivel2Routes = [
            'cadastro-patrimonio',
            'lista-patrimonios',
            'editar-patrimonio',
            'relatorios',
            'gerenciar-usuarios',
            'gerenciar-centros',
            'gerenciar-depreciacoes',
            'gerenciar-unidades'
        ]
    }

    async init() {
        console.log('🚀 Inicializando router simplificado v2.0...')

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

    /**
     * ✅ HANDLER DO BOTÃO VOLTAR SIMPLIFICADO
     * 
     * Sistema de 2 níveis:
     * - Se estiver em rota de Nível 1 (login, dashboard, etc): BLOQUEIA o voltar
     * - Se estiver em rota de Nível 2 (cadastro, lista, etc): VOLTA para dashboard
     * - Modais são tratados pelo modalManager.js
     */
    setupBackButtonHandler() {
        console.log('🔙 Configurando handler do botão voltar simplificado...')
        
        // Substituir estado inicial para prevenir cache
        if (window.history.state === null) {
            window.history.replaceState(
                { route: 'login', nivel: 1, canGoBack: false },
                '',
                '#login'
            )
        }

        window.addEventListener('popstate', async (event) => {
            console.log('⬅️ Botão voltar pressionado')
            console.log('📍 Rota atual:', this.currentRoute)
            console.log('📊 Estado:', event.state)
            
            // ✅ Se há modais abertos, o modalManager vai lidar com isso
            // Não fazemos nada aqui para não interferir
            if (window.modalManager && window.modalManager.modalStack.length > 0) {
                console.log('🎭 Modal aberto detectado - deixando modalManager lidar')
                return
            }
            
            const user = await auth.getCurrentUser()
            
            // ✅ REGRA 1: Bloquear volta para login se usuário autenticado
            if (user && (this.currentRoute === 'login' || event.state?.route === 'login')) {
                console.log('🚫 Bloqueando volta para login - usuário autenticado')
                await this.goToDefaultRoute(user)
                return
            }
            
            // ✅ REGRA 2: Se está em rota de Nível 1, bloquear voltar
            if (this.nivel1Routes.includes(this.currentRoute)) {
                console.log('🚫 Rota de Nível 1 - bloqueando voltar')
                await this.goToDefaultRoute(user)
                return
            }
            
            // ✅ REGRA 3: Se está em rota de Nível 2, voltar para dashboard
            if (this.nivel2Routes.includes(this.currentRoute)) {
                console.log('↩️ Rota de Nível 2 - voltando para dashboard')
                
                if (user && user.role === 'root') {
                    this.navigate('gerenciar-root', {}, false)
                } else {
                    this.navigate('dashboard', {}, false)
                }
                return
            }
            
            // ✅ FALLBACK: Ir para rota padrão
            console.log('↩️ Fallback - indo para rota padrão')
            await this.goToDefaultRoute(user)
        })
        
        console.log('✅ Handler do botão voltar configurado')
    }

    /**
     * ✅ Ir para rota padrão baseado em autenticação
     */
    async goToDefaultRoute(user = null) {
        if (!user) {
            user = await auth.getCurrentUser()
        }
        
        if (user && user.role === 'root') {
            console.log('🔴 Indo para gerenciar-root')
            // Substituir estado para bloquear volta
            window.history.replaceState(
                { route: 'gerenciar-root', nivel: 1, canGoBack: false },
                '',
                '#gerenciar-root'
            )
            this.navigate('gerenciar-root', {}, false)
        } else if (user) {
            console.log('📊 Indo para dashboard')
            // Substituir estado para bloquear volta
            window.history.replaceState(
                { route: 'dashboard', nivel: 1, canGoBack: false },
                '',
                '#dashboard'
            )
            this.navigate('dashboard', {}, false)
        } else {
            console.log('🔓 Indo para login')
            this.navigate('login', {}, false)
        }
    }

    /**
     * ✅ NAVEGAÇÃO SIMPLIFICADA
     * 
     * Determina o nível da rota e adiciona ao histórico apenas se necessário
     */
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
        
        if (addToHistory) {
            // Determinar nível da rota
            const nivel = this.nivel1Routes.includes(route) ? 1 : 2
            const canGoBack = nivel === 2 // Apenas Nível 2 pode usar voltar
            
            const state = {
                route: route,
                nivel: nivel,
                canGoBack: canGoBack,
                timestamp: Date.now()
            }
            
            // Adicionar ao histórico
            window.history.pushState(state, '', `#${route}`)
            
            console.log(`📚 Navegação: ${route} (Nível ${nivel}, voltar: ${canGoBack})`)
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

    /**
     * ✅ Verificar se rota é de Nível 2 (secundária)
     */
    isSecondaryRoute(route) {
        return this.nivel2Routes.includes(route)
    }

    /**
     * ✅ Obter rota padrão para o usuário
     */
    async getDefaultRoute() {
        const user = await auth.getCurrentUser()
        if (user && user.role === 'root') {
            return 'gerenciar-root'
        } else if (user) {
            return 'dashboard'
        }
        return 'login'
    }
}

export const router = new Router()

window.appRouter = router

console.log('✅ Router simplificado v2.0 carregado')