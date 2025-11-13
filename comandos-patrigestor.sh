#!/bin/bash
# Comandos para configurar o PatriGestor
# Execute um por vez, copiando e colando no terminal

# ==================================================
# COMANDO 1: Criar usuarioService.js
# ==================================================
cat > src/js/usuarioService.js << 'ENDOFFILE'
import { supabase } from './supabaseClient.js'
import { auth } from './auth.js'

export const usuarioService = {
    async criar(email, password, nome, role) {
        const hasPermission = await auth.hasPermission('admin')
        if (!hasPermission) {
            throw new Error('Apenas administradores podem criar usuários')
        }
        
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { nome }
        })
        
        if (authError) throw authError
        
        const { data, error } = await supabase
            .from('usuarios')
            .insert([{
                id: authData.user.id,
                email,
                nome,
                role,
                ativo: true
            }])
            .select()
        
        if (error) throw error
        return data[0]
    },

    async listar() {
        const { data, error } = await supabase
            .from('usuarios')
            .select('*')
            .order('created_at', { ascending: false })
        
        if (error) throw error
        return data
    },

    async atualizar(id, updates) {
        const hasPermission = await auth.hasPermission('admin')
        if (!hasPermission) {
            throw new Error('Apenas administradores podem atualizar usuários')
        }
        
        const { data, error } = await supabase
            .from('usuarios')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
        
        if (error) throw error
        return data[0]
    },

    async toggleAtivo(id) {
        const hasPermission = await auth.hasPermission('admin')
        if (!hasPermission) {
            throw new Error('Apenas administradores podem ativar/desativar usuários')
        }
        
        const { data: usuario } = await supabase
            .from('usuarios')
            .select('ativo')
            .eq('id', id)
            .single()
        
        return this.atualizar(id, { ativo: !usuario.ativo })
    }
}
ENDOFFILE

# ==================================================
# COMANDO 2: Criar patrimonioService.js
# ==================================================
cat > src/js/patrimonioService.js << 'ENDOFFILE'
import { supabase } from './supabaseClient.js'
import { auth } from './auth.js'

export const patrimonioService = {
    async criar(patrimonio) {
        const hasPermission = await auth.hasPermission('editor')
        if (!hasPermission) {
            throw new Error('Você não tem permissão para criar patrimônios')
        }
        
        const user = await auth.getCurrentUser()
        
        const { data, error } = await supabase
            .from('patrimonios')
            .insert([{ 
                ...patrimonio, 
                created_by: user.id,
                updated_by: user.id
            }])
            .select()
        
        if (error) throw error
        return data[0]
    },

    async listar() {
        const { data, error } = await supabase
            .from('patrimonios')
            .select(`
                *,
                centro_de_custo:centro_custo_id (
                    id,
                    nome
                ),
                criador:created_by (
                    nome,
                    email
                )
            `)
            .order('created_at', { ascending: false })
        
        if (error) throw error
        return data
    },

    async buscarPorPlaca(placa) {
        const { data, error } = await supabase
            .from('patrimonios')
            .select(`
                *,
                centro_de_custo:centro_custo_id (
                    id,
                    nome
                ),
                criador:created_by (
                    nome,
                    email
                )
            `)
            .ilike('placa', `%${placa}%`)
        
        if (error) throw error
        return data
    },

    async atualizar(id, patrimonio) {
        const hasPermission = await auth.hasPermission('editor')
        if (!hasPermission) {
            throw new Error('Você não tem permissão para atualizar patrimônios')
        }
        
        const user = await auth.getCurrentUser()
        
        const { data, error } = await supabase
            .from('patrimonios')
            .update({ 
                ...patrimonio, 
                updated_at: new Date().toISOString(),
                updated_by: user.id
            })
            .eq('id', id)
            .select()
        
        if (error) throw error
        return data[0]
    },

    async deletar(id) {
        const hasPermission = await auth.hasPermission('admin')
        if (!hasPermission) {
            throw new Error('Apenas administradores podem deletar patrimônios')
        }
        
        const { error } = await supabase
            .from('patrimonios')
            .delete()
            .eq('id', id)
        
        if (error) throw error
    },

    async gerarRelatorio(filtros = {}) {
        let query = supabase
            .from('patrimonios')
            .select(`
                *,
                centro_de_custo:centro_custo_id (
                    id,
                    nome
                ),
                criador:created_by (
                    nome,
                    email
                )
            `)
        
        if (filtros.centro_custo_id) {
            query = query.eq('centro_custo_id', filtros.centro_custo_id)
        }
        
        if (filtros.data_inicio) {
            query = query.gte('created_at', filtros.data_inicio)
        }
        
        if (filtros.data_fim) {
            query = query.lte('created_at', filtros.data_fim)
        }
        
        const { data, error } = await query.order('created_at', { ascending: false })
        
        if (error) throw error
        return data
    }
}
ENDOFFILE

# ==================================================
# COMANDO 3: Criar centroCustoService.js
# ==================================================
cat > src/js/centroCustoService.js << 'ENDOFFILE'
import { supabase } from './supabaseClient.js'
import { auth } from './auth.js'

export const centroCustoService = {
    async criar(centroCusto) {
        const hasPermission = await auth.hasPermission('admin')
        if (!hasPermission) {
            throw new Error('Apenas administradores podem criar centros de custo')
        }
        
        const user = await auth.getCurrentUser()
        
        const { data, error } = await supabase
            .from('centro_de_custo')
            .insert([{ ...centroCusto, created_by: user.id }])
            .select()
        
        if (error) throw error
        return data[0]
    },

    async listar() {
        const { data, error } = await supabase
            .from('centro_de_custo')
            .select('*')
            .order('nome')
        
        if (error) throw error
        return data
    },

    async deletar(id) {
        const hasPermission = await auth.hasPermission('admin')
        if (!hasPermission) {
            throw new Error('Apenas administradores podem deletar centros de custo')
        }
        
        const { error } = await supabase
            .from('centro_de_custo')
            .delete()
            .eq('id', id)
        
        if (error) throw error
    }
}
ENDOFFILE

# ==================================================
# COMANDO 4: Criar ui.js (utilitários de interface)
# ==================================================
cat > src/js/ui.js << 'ENDOFFILE'
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
            modal.classList.add('active')
        }
    },

    hideModal(modalId) {
        const modal = document.getElementById(modalId)
        if (modal) {
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
ENDOFFILE

# ==================================================
# COMANDO 5: Criar router.js
# ==================================================
cat > src/js/router.js << 'ENDOFFILE'
export class Router {
    constructor() {
        this.routes = {}
        this.currentRoute = null
    }

    addRoute(path, handler) {
        this.routes[path] = handler
    }

    navigate(path) {
        this.currentRoute = path
        const handler = this.routes[path]
        if (handler) {
            handler()
        } else {
            console.error(`Route ${path} not found`)
        }
    }
}

export const router = new Router()
ENDOFFILE

echo "✅ Arquivos JavaScript de serviços criados com sucesso!"
echo "Próximo passo: criar o CSS completo"
