export const UI = {
    showLoading(elementId) {
        const element = document.getElementById(elementId)
        if (element) {
            element.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                    <p>Carregando...</p>
                </div>
            `
        }
    },

    showError(elementId, message) {
        const element = document.getElementById(elementId)
        if (element) {
            element.innerHTML = `
                <div class="alert alert-error">
                    <strong>Erro:</strong> ${message}
                </div>
            `
        }
    },

    showSuccess(elementId, message) {
        const element = document.getElementById(elementId)
        if (element) {
            element.innerHTML = `
                <div class="alert alert-success">
                    <strong>Sucesso:</strong> ${message}
                </div>
            `
        }
        
        setTimeout(() => {
            const alert = element.querySelector('.alert')
            if (alert) alert.remove()
        }, 3000)
    },

    showModal(modalId) {
        const modal = document.getElementById(modalId)
        if (modal) {
            modal.style.display = 'flex'
            modal.classList.add('active')
        }
    },

    hideModal(modalId) {
        const modal = document.getElementById(modalId)
        if (modal) {
            modal.style.display = 'none'
            modal.classList.remove('active')
        }
    },

    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value)
    },

    formatDate(dateString) {
        const date = new Date(dateString)
        return date.toLocaleDateString('pt-BR')
    }
}


// Expor UI globalmente para uso em onclick inline
window.UI = UI
