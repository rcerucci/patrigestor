import { supabase } from './supabaseClient.js'
import { auth } from './auth.js'
import { deleteImage } from './imageUpload.js'

// Formatar e validar placa
function formatarPlaca(placa) {
    if (!placa) {
        throw new Error('Placa não pode estar vazia')
    }
    
    const apenasNumeros = placa.toString().replace(/\D/g, '')
    
    if (!apenasNumeros) {
        throw new Error('Placa deve conter números')
    }
    
    // Limitar a 10 dígitos
    const placaLimitada = apenasNumeros.slice(0, 10)
    
    // Se tiver menos de 4 dígitos, preenche com zeros à esquerda
    if (placaLimitada.length < 4) {
        return placaLimitada.padStart(4, '0')
    }
    
    return placaLimitada
}

// ✅ CORRIGIDO: Verificar placa duplicada (tratar erro 406)
async function verificarPlacaDuplicada(placa, idExcluir = null) {
    try {
        let query = supabase
            .from('patrimonios')
            .select('id, placa')
            .eq('placa', placa)
        
        if (idExcluir) {
            query = query.neq('id', idExcluir)
        }
        
        // ✅ Usar .maybeSingle() ao invés de .single()
        // maybeSingle() retorna null se não encontrar (sem erro 406)
        const { data, error } = await query.maybeSingle()
        
        if (error) {
            console.error('Erro ao verificar placa:', error)
            return false // Em caso de erro, permite continuar
        }
        
        // Se data não é null, a placa existe
        return data !== null
        
    } catch (error) {
        console.error('Erro na verificação de placa:', error)
        return false // Em caso de erro, permite continuar
    }
}

export const patrimonioService = {
    formatarPlaca,
    verificarPlacaDuplicada,

    async criar(patrimonio) {
        const hasPermission = await auth.hasPermission('editor')
        if (!hasPermission) {
            throw new Error('Apenas editores e administradores podem criar patrimônios')
        }

        const placaFormatada = formatarPlaca(patrimonio.placa)
        
        if (await verificarPlacaDuplicada(placaFormatada)) {
            throw new Error(`A placa ${placaFormatada} já está cadastrada no sistema`)
        }

        const user = await auth.getCurrentUser()

        const { data, error } = await supabase
            .from('patrimonios')
            .insert([{ 
                ...patrimonio, 
                placa: placaFormatada,
                created_by: user.id 
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
                centro_custo:centro_de_custo(id, nome),
                depreciacao:depreciacao(id, nome),
                unidade:unidades(id, nome, cnpj, logo_url),
                created_by_user:usuarios!patrimonios_created_by_fkey(nome)
            `)
            .order('created_at', { ascending: false })

        if (error) throw error
        return data
    },

    async buscarPorId(id) {
        const { data, error } = await supabase
            .from('patrimonios')
            .select(`
                *,
                centro_custo:centro_de_custo(id, nome),
                depreciacao:depreciacao(id, nome),
                unidade:unidades(id, nome, cnpj, logo_url),
                created_by_user:usuarios!patrimonios_created_by_fkey(nome)
            `)
            .eq('id', id)
            .single()

        if (error) throw error
        return data
    },

    async atualizar(id, updates) {
        const hasPermission = await auth.hasPermission('editor')
        if (!hasPermission) {
            throw new Error('Apenas editores e administradores podem atualizar patrimônios')
        }

        if (updates.placa) {
            const placaFormatada = formatarPlaca(updates.placa)
            
            if (await verificarPlacaDuplicada(placaFormatada, id)) {
                throw new Error(`A placa ${placaFormatada} já está cadastrada no sistema`)
            }
            
            updates.placa = placaFormatada
        }

        const user = await auth.getCurrentUser()

        const { data, error } = await supabase
            .from('patrimonios')
            .update({
                ...updates,
                updated_by: user.id,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()

        if (error) throw error
        return data[0]
    },

    async deletar(id) {
        const hasPermission = await auth.hasPermission('editor')
        if (!hasPermission) {
            throw new Error('Apenas editores e administradores podem deletar patrimônios')
        }

        console.log('🗑️ Iniciando exclusão do patrimônio:', id)

        const patrimonio = await this.buscarPorId(id)
        
        if (!patrimonio) {
            throw new Error('Patrimônio não encontrado')
        }

        console.log('📸 Patrimônio encontrado:', patrimonio.placa)

        const fotosParaDeletar = []
        if (patrimonio.foto1_url) fotosParaDeletar.push(patrimonio.foto1_url)
        if (patrimonio.foto2_url) fotosParaDeletar.push(patrimonio.foto2_url)
        if (patrimonio.foto3_url) fotosParaDeletar.push(patrimonio.foto3_url)

        console.log(`🗑️ Deletando ${fotosParaDeletar.length} foto(s) do Storage...`)

        for (const fotoUrl of fotosParaDeletar) {
            try {
                await deleteImage(fotoUrl)
                console.log('✅ Foto deletada:', fotoUrl)
            } catch (error) {
                console.warn('⚠️ Erro ao deletar foto:', error.message)
            }
        }

        console.log('🗑️ Deletando registro do banco...')
        const { error } = await supabase
            .from('patrimonios')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('❌ Erro ao deletar do banco:', error)
            throw error
        }

        console.log('✅ Patrimônio deletado com sucesso!')
    }
}