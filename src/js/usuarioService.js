import { supabase } from './supabaseClient.js'
import { auth } from './auth.js'
import { router } from './router.js'

export const usuarioService = {
    async criar(dados) {
        console.log('📄 Criando novo usuário via signUp...')

        try {
            router.startAuthOperation()

            const { data: { session: adminSession } } = await supabase.auth.getSession()
            
            if (!adminSession) {
                throw new Error('Nenhuma sessão ativa encontrada')
            }

            console.log('💾 Sessão do admin salva')

            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: dados.email,
                password: dados.senha,
                options: {
                    data: {
                        nome: dados.nome,
                        role: dados.role
                    }
                }
            })

            if (authError) {
                console.error('❌ Erro ao criar usuário:', authError)
                throw authError
            }

            if (!authData.user) {
                throw new Error('Erro ao criar usuário')
            }

            console.log('✅ Usuário criado no auth:', authData.user.id)

            await supabase.auth.signOut()
            console.log('🔓 Logout do novo usuário realizado')

            const { error: setSessionError } = await supabase.auth.setSession({
                access_token: adminSession.access_token,
                refresh_token: adminSession.refresh_token
            })

            if (setSessionError) {
                console.error('❌ Erro ao restaurar sessão:', setSessionError)
                throw new Error('Erro ao restaurar sessão do administrador')
            }

            console.log('🔐 Sessão do admin restaurada')

            await new Promise(resolve => setTimeout(resolve, 1500))

            const { data: usuario, error: checkError } = await supabase
                .from('usuarios')
                .select('*')
                .eq('id', authData.user.id)
                .single()

            if (checkError || !usuario) {
                console.error('⚠️ Usuário não encontrado na tabela usuarios')
                throw new Error('Erro ao verificar usuário criado')
            }

            console.log('✅ Usuário criado com sucesso:', usuario)

            return usuario

        } catch (error) {
            console.error('❌ Erro ao criar usuário:', error)
            throw error
        } finally {
            router.endAuthOperation()
        }
    },

    async listar() {
        const { data, error } = await supabase
            .from('usuarios')
            .select('*')
            .neq('role', 'root')
            .order('nome')

        if (error) throw error
        return data
    },

    async atualizar(id, dados) {
        const { data, error } = await supabase
            .from('usuarios')
            .update(dados)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async desativar(id) {
        return this.atualizar(id, { ativo: false })
    },

    async ativar(id) {
        return this.atualizar(id, { ativo: true })
    },

    async deletar(id) {
        console.log('🗑️ Deletando usuário:', id)

        try {
            const { error: deleteTableError } = await supabase
                .from('usuarios')
                .delete()
                .eq('id', id)

            if (deleteTableError) throw deleteTableError

            const { error: deleteAuthError } = await supabase.rpc('delete_user', {
                user_id: id
            })

            if (deleteAuthError) {
                console.warn('⚠️ Erro ao deletar do auth:', deleteAuthError.message)
            }

            console.log('✅ Usuário deletado com sucesso')
            return { success: true }

        } catch (error) {
            console.error('❌ Erro ao deletar usuário:', error)
            throw error
        }
    },

    // ✅ CORRIGIDO: Reset de senha via RPC
    async resetarSenha(id, novaSenha) {
        console.log('🔑 Resetando senha via RPC...')

        try {
            const { data: usuario } = await supabase
                .from('usuarios')
                .select('email, nome')
                .eq('id', id)
                .single()

            if (!usuario) {
                throw new Error('Usuário não encontrado')
            }

            // ✅ Usar RPC ao invés de auth.admin
            const { data, error } = await supabase.rpc('reset_user_password', {
                user_id: id,
                new_password: novaSenha
            })

            if (error) {
                console.error('❌ Erro no RPC:', error)
                throw new Error('Erro ao resetar senha: ' + error.message)
            }

            if (data && !data.success) {
                throw new Error(data.error || 'Erro ao resetar senha')
            }

            console.log('✅ Senha resetada com sucesso')
            return { success: true }

        } catch (error) {
            console.error('❌ Erro ao resetar senha:', error)
            throw error
        }
    },

    // Aliases para compatibilidade
    criarUsuario(dados) {
        return this.criar(dados)
    },

    listarUsuarios() {
        return this.listar()
    },

    atualizarUsuario(id, dados) {
        return this.atualizar(id, dados)
    },

    desativarUsuario(id) {
        return this.desativar(id)
    },

    ativarUsuario(id) {
        return this.ativar(id)
    },

    excluirUsuario(id) {
        return this.deletar(id)
    },

    resetSenha(id, novaSenha) {
        return this.resetarSenha(id, novaSenha)
    }
}
