import { supabase } from './supabaseClient.js'
import { auth } from './auth.js'

export const depreciacaoService = {
    async criar(depreciacao) {
        const hasPermission = await auth.hasPermission('admin')
        if (!hasPermission) {
            throw new Error('Apenas administradores podem criar tipos de depreciação')
        }

        const user = await auth.getCurrentUser()

        const { data, error } = await supabase
            .from('depreciacao')
            .insert([{ ...depreciacao, created_by: user.id }])
            .select()

        if (error) throw error
        return data[0]
    },

    async listar() {
        const { data, error } = await supabase
            .from('depreciacao')
            .select('*')
            .order('nome')

        if (error) throw error
        return data
    },

    async atualizar(id, updates) {
        const hasPermission = await auth.hasPermission('admin')
        if (!hasPermission) {
            throw new Error('Apenas administradores podem atualizar tipos de depreciação')
        }

        const { data, error } = await supabase
            .from('depreciacao')
            .update(updates)
            .eq('id', id)
            .select()

        if (error) throw error
        return data[0]
    },

    async deletar(id) {
        const hasPermission = await auth.hasPermission('admin')
        if (!hasPermission) {
            throw new Error('Apenas administradores podem deletar tipos de depreciação')
        }

        const { error } = await supabase
            .from('depreciacao')
            .delete()
            .eq('id', id)

        if (error) throw error
    }
}