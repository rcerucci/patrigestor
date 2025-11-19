/**
 * ✅ MODAL MANAGER
 * Sistema global de gestão de modais que intercepta o botão voltar do navegador
 * 
 * Funcionalidades:
 * - Detecta automaticamente quando um modal é aberto
 * - Adiciona entrada no histórico para interceptar botão voltar
 * - Fecha o modal quando o usuário pressiona voltar
 * - Remove entradas do histórico ao fechar modal manualmente
 */

class ModalManager {
    constructor() {
        this.modalStack = []
        this.isHandlingPopstate = false
        this.modalObserver = null
        this.initialized = false
    }

    init() {
        if (this.initialized) return
        
        console.log('🎭 Inicializando Modal Manager...')
        
        // Interceptar popstate (botão voltar)
        window.addEventListener('popstate', (event) => {
            this.handlePopstate(event)
        })
        
        // Observar mudanças no DOM para detectar modais
        this.setupModalObserver()
        
        // Detectar modais já existentes
        this.detectExistingModals()
        
        this.initialized = true
        console.log('✅ Modal Manager inicializado')
    }

    setupModalObserver() {
        // Observa mudanças no DOM para detectar quando modais são adicionados/removidos
        this.modalObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        if (node.classList?.contains('modal') || node.id?.includes('modal')) {
                            this.checkModalState(node)
                        }
                        // Verificar modais dentro do node adicionado
                        node.querySelectorAll?.('.modal, [id*="modal"]').forEach(modal => {
                            this.checkModalState(modal)
                        })
                    }
                })
            })
        })

        this.modalObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
        })
    }

    detectExistingModals() {
        // Detecta modais que já existem no DOM
        const modals = document.querySelectorAll('.modal, [id*="modal"]')
        modals.forEach(modal => this.checkModalState(modal))
    }

    checkModalState(modalElement) {
        if (!modalElement) return
        
        const isVisible = this.isModalVisible(modalElement)
        const modalId = modalElement.id || modalElement.className
        
        if (isVisible && !this.isModalInStack(modalId)) {
            // Modal foi aberto
            this.onModalOpen(modalElement)
        } else if (!isVisible && this.isModalInStack(modalId)) {
            // Modal foi fechado
            this.onModalClose(modalId)
        }
    }

    isModalVisible(modal) {
        if (!modal) return false
        
        const computedStyle = window.getComputedStyle(modal)
        const isDisplayed = computedStyle.display !== 'none'
        const isVisible = computedStyle.visibility !== 'hidden'
        const hasOpacity = computedStyle.opacity !== '0'
        const hasShowClass = modal.classList.contains('show') || modal.classList.contains('active')
        
        return (isDisplayed || hasShowClass) && isVisible && hasOpacity
    }

    isModalInStack(modalId) {
        return this.modalStack.some(m => m.id === modalId)
    }

    onModalOpen(modalElement) {
        const modalId = modalElement.id || modalElement.className
        const modalData = {
            id: modalId,
            element: modalElement,
            timestamp: Date.now()
        }
        
        this.modalStack.push(modalData)
        
        // Adicionar entrada no histórico para interceptar o botão voltar
        const state = {
            modalOpen: true,
            modalId: modalId,
            timestamp: modalData.timestamp
        }
        
        window.history.pushState(state, '', window.location.href)
        
        console.log('🎭 Modal aberto:', modalId)
        console.log('📚 Stack de modais:', this.modalStack.length)
    }

    onModalClose(modalId, skipHistory = false) {
        const index = this.modalStack.findIndex(m => m.id === modalId)
        if (index === -1) return
        
        this.modalStack.splice(index, 1)
        
        console.log('🎭 Modal fechado:', modalId)
        console.log('📚 Stack de modais:', this.modalStack.length)
        
        // Remover entrada do histórico se não estiver sendo chamado pelo popstate
        if (!skipHistory && !this.isHandlingPopstate) {
            window.history.back()
        }
    }

    handlePopstate(event) {
        if (this.isHandlingPopstate) return
        
        // Se há modais abertos, fechar o último
        if (this.modalStack.length > 0) {
            this.isHandlingPopstate = true
            
            const lastModal = this.modalStack[this.modalStack.length - 1]
            console.log('⬅️ Botão voltar - Fechando modal:', lastModal.id)
            
            // Tentar fechar o modal usando métodos comuns
            this.closeModalElement(lastModal.element)
            
            // Remover do stack
            this.onModalClose(lastModal.id, true)
            
            // Restaurar estado após um pequeno delay
            setTimeout(() => {
                this.isHandlingPopstate = false
            }, 100)
            
            // Prevenir navegação padrão adicionando entrada novamente se ainda há modais
            if (this.modalStack.length > 0) {
                window.history.pushState(
                    { modalOpen: true, modalId: this.modalStack[this.modalStack.length - 1].id },
                    '',
                    window.location.href
                )
            }
        }
    }

    closeModalElement(modalElement) {
        if (!modalElement) return
        
        // Método 1: Procurar botão de fechar
        const closeButtons = modalElement.querySelectorAll('.modal-close, .btn-close, [data-dismiss="modal"], .close')
        if (closeButtons.length > 0) {
            closeButtons[0].click()
            return
        }
        
        // Método 2: Remover classes de visibilidade
        modalElement.classList.remove('show', 'active', 'visible')
        modalElement.style.display = 'none'
        
        // Método 3: Procurar função global de fechar
        const modalId = modalElement.id
        if (modalId) {
            // Tentar funções comuns de fechar modal
            const closeFunctions = [
                `fecharModal${modalId.replace('modal-', '').replace(/-/g, '')}`,
                `fechar${modalId.replace('modal-', '').replace(/-/g, '')}`,
                `closeModal`,
                `hideModal`
            ]
            
            for (const funcName of closeFunctions) {
                const capitalizedFuncName = funcName.charAt(0).toUpperCase() + funcName.slice(1)
                if (typeof window[funcName] === 'function') {
                    window[funcName]()
                    return
                }
                if (typeof window[capitalizedFuncName] === 'function') {
                    window[capitalizedFuncName]()
                    return
                }
            }
        }
    }

    // API Pública para registrar modais manualmente
    registerModal(modalElement, onClose) {
        if (!modalElement) return
        
        const modalId = modalElement.id || `modal-${Date.now()}`
        modalElement.id = modalId
        
        const modalData = {
            id: modalId,
            element: modalElement,
            onClose: onClose,
            timestamp: Date.now()
        }
        
        this.modalStack.push(modalData)
        
        window.history.pushState(
            { modalOpen: true, modalId: modalId },
            '',
            window.location.href
        )
        
        console.log('📝 Modal registrado manualmente:', modalId)
    }

    // API Pública para desregistrar modais
    unregisterModal(modalId) {
        this.onModalClose(modalId, false)
    }

    // Limpar stack de modais
    clearStack() {
        this.modalStack = []
    }

    // Destruir observer
    destroy() {
        if (this.modalObserver) {
            this.modalObserver.disconnect()
        }
        this.clearStack()
        this.initialized = false
    }
}

// Criar instância global
const modalManager = new ModalManager()

// Auto-inicializar quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => modalManager.init())
} else {
    modalManager.init()
}

// Exportar para uso global
window.modalManager = modalManager

export { modalManager }