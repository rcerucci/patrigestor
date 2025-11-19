import { supabase } from './supabaseClient.js'
import { auth } from './auth.js'
import { deleteImage } from './imageUpload.js'

export const unidadeService = {
    async criar(unidade) {
        const hasPermission = await auth.hasPermission('admin')
        if (!hasPermission) {
            throw new Error('Apenas administradores podem criar unidades')
        }

        const user = await auth.getCurrentUser()

        const { data, error } = await supabase
            .from('unidades')
            .insert([{ ...unidade, created_by: user.id }])
            .select()

        if (error) throw error
        return data[0]
    },

    async listar() {
        const { data, error } = await supabase
            .from('unidades')
            .select('*')
            .order('nome')

        if (error) throw error
        return data
    },

    async buscarPorId(id) {
        const { data, error } = await supabase
            .from('unidades')
            .select('*')
            .eq('id', id)
            .single()

        if (error) throw error
        return data
    },

    async atualizar(id, updates) {
        const hasPermission = await auth.hasPermission('admin')
        if (!hasPermission) {
            throw new Error('Apenas administradores podem atualizar unidades')
        }

        const { data, error } = await supabase
            .from('unidades')
            .update(updates)
            .eq('id', id)
            .select()

        if (error) throw error
        return data[0]
    },

    async deletar(id) {
        const hasPermission = await auth.hasPermission('admin')
        if (!hasPermission) {
            throw new Error('Apenas administradores podem deletar unidades')
        }

        console.log('🗑️ Iniciando exclusão da unidade:', id)

        const unidade = await this.buscarPorId(id)
        
        if (!unidade) {
            throw new Error('Unidade não encontrada')
        }

        console.log('🏢 Unidade encontrada:', unidade.nome)

        // Deletar logo do Storage se existir
        if (unidade.logo_url) {
            console.log('🖼️ Deletando logo do Storage...')
            try {
                await deleteImage(unidade.logo_url)
                console.log('✅ Logo deletado')
            } catch (error) {
                console.warn('⚠️ Erro ao deletar logo:', error.message)
            }
        }

        console.log('🗑️ Deletando registro do banco...')
        const { error } = await supabase
            .from('unidades')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('❌ Erro ao deletar do banco:', error)
            throw error
        }

        console.log('✅ Unidade deletada com sucesso!')
    }
}