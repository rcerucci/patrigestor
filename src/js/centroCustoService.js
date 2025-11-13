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

    async atualizar(id, updates) {
        const hasPermission = await auth.hasPermission('admin')
        if (!hasPermission) {
            throw new Error('Apenas administradores podem atualizar centros de custo')
        }

        const { data, error } = await supabase
            .from('centro_de_custo')
            .update(updates)
            .eq('id', id)
            .select()

        if (error) throw error
        return data[0]
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
