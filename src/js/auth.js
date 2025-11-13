import { supabase } from './supabaseClient.js'

export const auth = {
    async signUp(email, password, nome) {
        try {
            // Verificar se já existe algum admin
            const { data: admins } = await supabase.rpc('existe_admin')
            const isFirstUser = !admins

            console.log('🔐 Criando usuário:', { email, nome, isFirstUser })

            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        nome: nome,
                        // Primeiro usuário é admin, demais são editors
                        role: isFirstUser ? 'admin' : 'editor'
                    }
                }
            })

            if (authError) throw authError

            if (!authData.user) {
                throw new Error('Erro ao criar usuário na autenticação')
            }

            console.log('✅ Usuário criado no auth:', authData.user.id)
            console.log('✅ Role definido:', isFirstUser ? 'admin' : 'editor')

            // ✅ CORRIGIDO: Aguardar trigger com retry ao invés de timeout fixo
            const usuario = await this.aguardarUsuarioNoBanco(authData.user.id)

            console.log('✅ Usuário verificado na tabela usuarios:', usuario)

            // Fazer logout automático após criar
            await supabase.auth.signOut()
            console.log('🔓 Logout automático após criação')

            return authData

        } catch (error) {
            console.error('❌ Erro no signUp:', error)
            throw error
        }
    },

    // ✅ NOVA FUNÇÃO: Aguardar usuário no banco com retry
    async aguardarUsuarioNoBanco(userId, maxTentativas = 10) {
        for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
            try {
                const { data: usuario, error } = await supabase
                    .from('usuarios')
                    .select('*')
                    .eq('id', userId)
                    .single()

                if (usuario && !error) {
                    console.log(`✅ Usuário encontrado na tentativa ${tentativa}`)
                    return usuario
                }

                console.log(`⏳ Tentativa ${tentativa}/${maxTentativas} - Aguardando trigger...`)
                
                // Aguardar 500ms antes de tentar novamente
                await new Promise(resolve => setTimeout(resolve, 500))
                
            } catch (error) {
                if (tentativa === maxTentativas) {
                    throw new Error('Timeout ao aguardar criação do usuário no banco')
                }
            }
        }
        
        throw new Error('Usuário não foi criado na tabela usuarios após trigger')
    },

    async signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        })
        if (error) throw error

        const usuario = await this.getUserProfile(data.user.id)

        if (!usuario) {
            throw new Error('Usuário não encontrado no sistema')
        }

        if (!usuario.ativo) {
            await this.signOut()
            throw new Error('Usuário inativo. Contate o administrador.')
        }

        return { ...data, usuario }
    },

    async signOut() {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
    },

    async getCurrentUser() {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return null

        const usuario = await this.getUserProfile(user.id)
        return { ...user, ...usuario }
    },

    async getUserProfile(userId) {
        const { data, error } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id', userId)
            .single()

        if (error) return null
        return data
    },

    async hasPermission(requiredRole) {
        const user = await this.getCurrentUser()
        if (!user) return false

        const roleHierarchy = {
            'root': 4,
            'admin': 3,
            'editor': 2,
            'viewer': 1
        }

        return roleHierarchy[user.role] >= roleHierarchy[requiredRole]
    },

    onAuthStateChange(callback) {
        return supabase.auth.onAuthStateChange(callback)
    }
}
