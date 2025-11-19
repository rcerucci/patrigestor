import { supabase } from './supabaseClient.js'
import { deleteImage } from './imageUpload.js'

export const rootService = {
    // ========================================
    // VERIFICAR ROOT
    // ========================================
    async existeRoot() {
        try {
            const { data, error } = await supabase.rpc('verifica_root_existe')
            
            if (error) {
                console.warn('Erro ao verificar ROOT via RPC:', error)
                
                const { data: usuarios, error: queryError } = await supabase
                    .from('usuarios')
                    .select('id')
                    .eq('role', 'root')
                    .limit(1)
                
                if (queryError) {
                    console.error('Erro ao verificar ROOT via query:', queryError)
                    return false
                }
                
                return usuarios && usuarios.length > 0
            }
            
            return data === true
            
        } catch (error) {
            console.error('Erro ao verificar ROOT:', error)
            return false
        }
    },

    // ========================================
    // CRIAR ROOT
    // ========================================
    async criarRoot(dados) {
        const jaExiste = await this.existeRoot()
        if (jaExiste) {
            throw new Error('Já existe um usuário ROOT no sistema!')
        }

        try {
            console.log('🔴 Criando usuário ROOT...')

            await supabase.auth.signOut()

            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: dados.email,
                password: dados.senha,
                options: {
                    data: {
                        nome: dados.nome,
                        role: 'root'
                    }
                }
            })

            if (authError) {
                console.error('❌ Erro no signUp:', authError)
                throw authError
            }

            if (!authData.user) {
                throw new Error('Erro ao criar usuário ROOT')
            }

            console.log('✅ ROOT criado no auth:', authData.user.id)

            await supabase.auth.signOut()
            console.log('🔓 Logout automático após criação')

            await new Promise(resolve => setTimeout(resolve, 2000))

            console.log('✅ ROOT configurado com sucesso!')

            return authData.user

        } catch (error) {
            console.error('❌ Erro ao criar ROOT:', error)
            throw error
        }
    },

    // ========================================
    // REDEFINIR SENHA DE QUALQUER USUÁRIO
    // ========================================
    async redefinirSenha(userId, novaSenha) {
        try {
            console.log('🔐 Redefinindo senha para usuário:', userId)

            // Usar Admin API do Supabase para atualizar senha
            const { data, error } = await supabase.auth.admin.updateUserById(
                userId,
                { password: novaSenha }
            )

            if (error) {
                console.error('❌ Erro ao redefinir senha:', error)
                throw error
            }

            console.log('✅ Senha redefinida com sucesso!')
            return data

        } catch (error) {
            console.error('❌ Erro ao redefinir senha:', error)
            throw new Error('Não foi possível redefinir a senha. Use o painel do Supabase.')
        }
    },

    // ========================================
    // ESTATÍSTICAS (ATUALIZADO COM NOVAS TABELAS)
    // ========================================
    async obterEstatisticas() {
        try {
            const { count: totalPatrimonios } = await supabase
                .from('patrimonios')
                .select('*', { count: 'exact', head: true })

            const { count: totalCentros } = await supabase
                .from('centro_de_custo')
                .select('*', { count: 'exact', head: true })

            const { count: totalUnidades } = await supabase
                .from('unidades')
                .select('*', { count: 'exact', head: true })

            const { count: totalDepreciacoes } = await supabase
                .from('depreciacao')
                .select('*', { count: 'exact', head: true })

            const { count: totalUsuarios } = await supabase
                .from('usuarios')
                .select('*', { count: 'exact', head: true })

            // ✅ BUSCAR FOTOS DO STORAGE (TAMANHO REAL)
            let totalFotos = 0
            let tamanhoTotalBytes = 0

            try {
                // Listar todos os arquivos na pasta patrimonios
                const { data: arquivos, error: storageError } = await supabase.storage
                    .from('patrigestor-images')
                    .list('patrimonios', {
                        limit: 10000,
                        offset: 0,
                        sortBy: { column: 'name', order: 'asc' }
                    })

                if (storageError) {
                    console.warn('⚠️ Erro ao listar storage:', storageError)
                    // Fallback: contar pelas URLs
                    const { data: patrimonios } = await supabase
                        .from('patrimonios')
                        .select('foto1_url, foto2_url, foto3_url')

                    if (patrimonios) {
                        patrimonios.forEach(p => {
                            if (p.foto1_url) totalFotos++
                            if (p.foto2_url) totalFotos++
                            if (p.foto3_url) totalFotos++
                        })
                        // Estimativa
                        tamanhoTotalBytes = totalFotos * 200 * 1024
                    }
                } else if (arquivos) {
                    // ✅ SOMAR TAMANHO REAL DOS ARQUIVOS
                    arquivos.forEach(arquivo => {
                        if (arquivo.name && arquivo.name.match(/^\d{4}_\d\.jpg$/)) {
                            totalFotos++
                            tamanhoTotalBytes += arquivo.metadata?.size || 200 * 1024
                        }
                    })
                }
            } catch (error) {
                console.warn('⚠️ Erro ao calcular estatísticas de fotos:', error)
            }

            const storageMB = (tamanhoTotalBytes / (1024 * 1024)).toFixed(2)

            console.log(`📊 Estatísticas: ${totalPatrimonios} patrimônios, ${totalFotos} fotos (${storageMB} MB)`)

            return {
                patrimonios: totalPatrimonios || 0,
                centros: totalCentros || 0,
                unidades: totalUnidades || 0,
                depreciacoes: totalDepreciacoes || 0,
                usuarios: totalUsuarios || 0,
                fotos: totalFotos,
                storageMB: storageMB
            }
        } catch (error) {
            console.error('Erro ao obter estatísticas:', error)
            return {
                patrimonios: 0,
                centros: 0,
                unidades: 0,
                depreciacoes: 0,
                usuarios: 0,
                fotos: 0,
                storageMB: '0.00'
            }
        }
    },

    // ========================================
    // 🆕 MIGRAR LOGOS ANTIGOS PARA PADRÃO CORRETO
    // ========================================
    async migrarLogosUnidades(onProgress) {
        console.log('🔄 Iniciando migração de logos de unidades...')
        
        try {
            let logosMigrados = 0
            let erros = 0

            // Buscar todas as unidades com logos
            const { data: unidades, error: fetchError } = await supabase
                .from('unidades')
                .select('id, nome, logo_url')
                .not('logo_url', 'is', null)

            if (fetchError) throw fetchError

            if (!unidades || unidades.length === 0) {
                console.log('ℹ️ Nenhuma unidade com logo encontrada')
                return { logosMigrados: 0, erros: 0 }
            }

            console.log(`📋 ${unidades.length} unidades com logos encontradas`)

            for (let i = 0; i < unidades.length; i++) {
                const unidade = unidades[i]
                
                try {
                    if (onProgress) {
                        const progresso = Math.floor((i / unidades.length) * 100)
                        onProgress(`Migrando logo ${i + 1}/${unidades.length} (${unidade.nome})...`, progresso)
                    }

                    // Extrair nome do arquivo atual da URL
                    const urlParts = unidade.logo_url.split('/')
                    const nomeArquivoAtual = urlParts[urlParts.length - 1]
                    
                    // Verificar se já está no padrão correto (nome = ID da unidade)
                    const extensao = nomeArquivoAtual.split('.').pop()
                    const nomeCorreto = `${unidade.id}.${extensao}`
                    
                    if (nomeArquivoAtual === nomeCorreto) {
                        console.log(`✅ Logo já está correto: ${unidade.nome}`)
                        continue
                    }

                    console.log(`🔄 Migrando logo de ${unidade.nome}:`)
                    console.log(`   Atual: ${nomeArquivoAtual}`)
                    console.log(`   Novo:  ${nomeCorreto}`)

                    // 1. Baixar arquivo atual
                    const response = await fetch(unidade.logo_url)
                    if (!response.ok) {
                        console.warn(`⚠️ Não foi possível baixar logo de ${unidade.nome}`)
                        erros++
                        continue
                    }

                    const blob = await response.blob()
                    const mimeType = extensao === 'png' ? 'image/png' : 'image/jpeg'

                    // 2. Fazer upload com novo nome
                    const novoPath = `unidades/${nomeCorreto}`
                    const { data: uploadData, error: uploadError } = await supabase.storage
                        .from('patrigestor-images')
                        .upload(novoPath, blob, {
                            cacheControl: '31536000',
                            upsert: true,
                            contentType: mimeType
                        })

                    if (uploadError) {
                        console.error(`❌ Erro ao fazer upload do novo logo: ${uploadError.message}`)
                        erros++
                        continue
                    }

                    // 3. Obter nova URL pública
                    const { data: urlData } = supabase.storage
                        .from('patrigestor-images')
                        .getPublicUrl(novoPath)

                    // 4. Atualizar registro da unidade
                    const { error: updateError } = await supabase
                        .from('unidades')
                        .update({ logo_url: urlData.publicUrl })
                        .eq('id', unidade.id)

                    if (updateError) {
                        console.error(`❌ Erro ao atualizar URL: ${updateError.message}`)
                        erros++
                        continue
                    }

                    // 5. Deletar arquivo antigo (somente se tiver nome diferente)
                    if (nomeArquivoAtual !== nomeCorreto) {
                        try {
                            await deleteImage(unidade.logo_url)
                            console.log(`🗑️ Arquivo antigo deletado: ${nomeArquivoAtual}`)
                        } catch (error) {
                            console.warn(`⚠️ Não foi possível deletar arquivo antigo: ${error.message}`)
                        }
                    }

                    logosMigrados++
                    console.log(`✅ Logo migrado: ${unidade.nome}`)

                } catch (error) {
                    console.error(`❌ Erro ao migrar logo de ${unidade.nome}:`, error)
                    erros++
                }
            }

            if (onProgress) onProgress('Migração concluída!', 100)

            console.log(`✅ Migração concluída: ${logosMigrados} logos migrados, ${erros} erros`)
            
            return { logosMigrados, erros }

        } catch (error) {
            console.error('❌ Erro ao migrar logos:', error)
            throw error
        }
    },

    // ========================================
    // 🆕 LIMPAR ARQUIVOS ÓRFÃOS DO STORAGE
    // ========================================
    async limparArquivosOrfaos(onProgress) {
        console.log('🧹 Iniciando limpeza de arquivos órfãos...')
        
        try {
            let fotosOrfas = 0
            let logosOrfaos = 0

            // 1. LIMPAR FOTOS ÓRFÃS DE PATRIMÔNIOS
            if (onProgress) onProgress('Buscando fotos de patrimônios...', 10)

            // Buscar todas as fotos referenciadas no banco
            const { data: patrimonios, error: patError } = await supabase
                .from('patrimonios')
                .select('foto1_url, foto2_url, foto3_url')

            if (patError) throw patError

            const fotosReferenciadas = new Set()
            patrimonios.forEach(p => {
                if (p.foto1_url) {
                    const nome = p.foto1_url.split('/').pop()
                    fotosReferenciadas.add(nome)
                }
                if (p.foto2_url) {
                    const nome = p.foto2_url.split('/').pop()
                    fotosReferenciadas.add(nome)
                }
                if (p.foto3_url) {
                    const nome = p.foto3_url.split('/').pop()
                    fotosReferenciadas.add(nome)
                }
            })

            console.log(`📊 ${fotosReferenciadas.size} fotos referenciadas no banco`)

            // Listar todos os arquivos no storage
            if (onProgress) onProgress('Listando arquivos no storage...', 30)

            const { data: arquivosStorage, error: storageError } = await supabase.storage
                .from('patrigestor-images')
                .list('patrimonios', {
                    limit: 10000,
                    offset: 0
                })

            if (storageError) throw storageError

            console.log(`📦 ${arquivosStorage.length} arquivos no storage`)

            // Identificar e deletar órfãos
            if (onProgress) onProgress('Deletando fotos órfãs...', 50)

            for (const arquivo of arquivosStorage) {
                if (!fotosReferenciadas.has(arquivo.name)) {
                    try {
                        const { error: deleteError } = await supabase.storage
                            .from('patrigestor-images')
                            .remove([`patrimonios/${arquivo.name}`])

                        if (deleteError) {
                            console.warn(`⚠️ Erro ao deletar ${arquivo.name}:`, deleteError)
                        } else {
                            fotosOrfas++
                            console.log(`🗑️ Foto órfã deletada: ${arquivo.name}`)
                        }
                    } catch (error) {
                        console.warn(`⚠️ Erro ao deletar ${arquivo.name}:`, error)
                    }
                }
            }

            // 2. LIMPAR LOGOS ÓRFÃOS DE UNIDADES
            if (onProgress) onProgress('Buscando logos de unidades...', 70)

            const { data: unidades, error: uniError } = await supabase
                .from('unidades')
                .select('logo_url')

            if (uniError) throw uniError

            const logosReferenciados = new Set()
            unidades.forEach(u => {
                if (u.logo_url) {
                    const nome = u.logo_url.split('/').pop()
                    logosReferenciados.add(nome)
                }
            })

            console.log(`📊 ${logosReferenciados.size} logos referenciados no banco`)

            // Listar logos no storage
            if (onProgress) onProgress('Listando logos no storage...', 80)

            const { data: logosStorage, error: logosStorageError } = await supabase.storage
                .from('patrigestor-images')
                .list('unidades', {
                    limit: 10000,
                    offset: 0
                })

            if (logosStorageError) throw logosStorageError

            console.log(`📦 ${logosStorage.length} logos no storage`)

            // Deletar logos órfãos
            if (onProgress) onProgress('Deletando logos órfãos...', 90)

            for (const arquivo of logosStorage) {
                if (!logosReferenciados.has(arquivo.name)) {
                    try {
                        const { error: deleteError } = await supabase.storage
                            .from('patrigestor-images')
                            .remove([`unidades/${arquivo.name}`])

                        if (deleteError) {
                            console.warn(`⚠️ Erro ao deletar ${arquivo.name}:`, deleteError)
                        } else {
                            logosOrfaos++
                            console.log(`🗑️ Logo órfão deletado: ${arquivo.name}`)
                        }
                    } catch (error) {
                        console.warn(`⚠️ Erro ao deletar ${arquivo.name}:`, error)
                    }
                }
            }

            if (onProgress) onProgress('Limpeza concluída!', 100)

            console.log(`✅ Limpeza concluída: ${fotosOrfas} fotos órfãs e ${logosOrfaos} logos órfãos removidos`)

            return { fotosOrfas, logosOrfaos }

        } catch (error) {
            console.error('❌ Erro ao limpar arquivos órfãos:', error)
            throw error
        }
    },

    // ========================================
    // 🚀 BACKUP COMPLETO COM IMAGENS (ZIP) - CORRIGIDO
    // ========================================
    async fazerBackupCompleto(nomeArquivo, onProgress) {
        console.log('💾 Iniciando backup completo com imagens...')

        try {
            if (typeof JSZip === 'undefined') {
                throw new Error('JSZip não carregado. Adicione o script no index.html')
            }

            const zip = new JSZip()

            // 1. Buscar DEPRECIAÇÕES
            if (onProgress) onProgress('Buscando categorias de depreciação...', 5)
            
            const { data: depreciacoes, error: depError } = await supabase
                .from('depreciacao')
                .select('*')
                .order('nome')

            if (depError) throw depError
            console.log(`✅ ${depreciacoes?.length || 0} depreciações encontradas`)

            // 2. Buscar UNIDADES
            if (onProgress) onProgress('Buscando unidades...', 10)
            
            const { data: unidades, error: uniError } = await supabase
                .from('unidades')
                .select('*')
                .order('nome')

            if (uniError) throw uniError
            console.log(`✅ ${unidades?.length || 0} unidades encontradas`)

            // 3. Buscar CENTROS DE CUSTO
            if (onProgress) onProgress('Buscando centros de custo...', 15)
            
            const { data: centros, error: centrosError } = await supabase
                .from('centro_de_custo')
                .select('*')
                .order('nome')

            if (centrosError) throw centrosError
            console.log(`✅ ${centros?.length || 0} centros encontrados`)

            // 4. Buscar PATRIMÔNIOS com relacionamentos
            if (onProgress) onProgress('Buscando patrimônios...', 20)
            
            const { data: patrimonios, error: patError } = await supabase
                .from('patrimonios')
                .select(`
                    *,
                    centro_custo:centro_de_custo(nome),
                    unidade:unidades(nome),
                    depreciacao_cat:depreciacao(nome)
                `)
                .order('placa')

            if (patError) throw patError
            console.log(`✅ ${patrimonios?.length || 0} patrimônios encontrados`)

            // 5. Preparar dados (converter UUID → nome)
            const patrimoniosBackup = patrimonios.map(p => {
                const backup = { ...p }
                
                // Converter relacionamentos para nomes
                if (p.centro_custo?.nome) {
                    backup.centro_custo_nome = p.centro_custo.nome
                }
                if (p.unidade?.nome) {
                    backup.unidade_nome = p.unidade.nome
                }
                if (p.depreciacao_cat?.nome) {
                    backup.depreciacao_nome = p.depreciacao_cat.nome
                }
                
                // Remover objetos relacionados
                delete backup.centro_custo
                delete backup.unidade
                delete backup.depreciacao_cat
                
                return backup
            })

            // 6. Salvar JSONs no ZIP
            if (onProgress) onProgress('Salvando dados...', 30)
            
            zip.file('depreciacoes.json', JSON.stringify(depreciacoes, null, 2))
            zip.file('unidades.json', JSON.stringify(unidades, null, 2))
            zip.file('centros_custo.json', JSON.stringify(centros, null, 2))
            zip.file('patrimonios.json', JSON.stringify(patrimoniosBackup, null, 2))

            console.log('✅ JSONs adicionados ao ZIP')

            // 7. Baixar e adicionar fotos ao ZIP
            const totalFotos = patrimonios.reduce((sum, p) => {
                return sum + [p.foto1_url, p.foto2_url, p.foto3_url].filter(Boolean).length
            }, 0)

            console.log(`📸 Total de fotos a baixar: ${totalFotos}`)

            let fotosProcessadas = 0
            const fotosFolder = zip.folder('fotos')

            for (const pat of patrimonios) {
                const fotos = [
                    { url: pat.foto1_url, num: 1 },
                    { url: pat.foto2_url, num: 2 },
                    { url: pat.foto3_url, num: 3 }
                ].filter(f => f.url)

                for (const foto of fotos) {
                    try {
                        fotosProcessadas++
                        const progresso = 30 + Math.floor((fotosProcessadas / totalFotos) * 50)
                        if (onProgress) onProgress(`Baixando fotos (${fotosProcessadas}/${totalFotos})...`, progresso)

                        const response = await fetch(foto.url)
                        if (!response.ok) {
                            console.warn(`⚠️ Foto não encontrada: ${foto.url}`)
                            continue
                        }

                        const blob = await response.blob()
                        const nomeArquivo = `${pat.placa}_${foto.num}.jpg`
                        fotosFolder.file(nomeArquivo, blob)

                    } catch (error) {
                        console.warn(`⚠️ Erro ao baixar foto ${pat.placa}_${foto.num}:`, error)
                    }
                }
            }

            console.log(`✅ ${fotosProcessadas} fotos adicionadas ao ZIP`)

            // 7.5. Baixar e adicionar logos das unidades ao ZIP (CORRIGIDO)
            const totalLogos = unidades.filter(u => u.logo_url).length
            console.log(`🏢 Total de logos de unidades a baixar: ${totalLogos}`)

            let logosProcessados = 0
            const logosFolder = zip.folder('logos_unidades')

            for (const unidade of unidades) {
                if (!unidade.logo_url) continue

                try {
                    logosProcessados++
                    const progresso = 80 + Math.floor((logosProcessados / (totalLogos || 1)) * 5)
                    if (onProgress) onProgress(`Baixando logos (${logosProcessados}/${totalLogos})...`, progresso)

                    // ✅ BAIXAR LOGO DA URL ATUAL
                    const response = await fetch(unidade.logo_url)
                    if (!response.ok) {
                        console.warn(`⚠️ Logo não encontrado: ${unidade.logo_url}`)
                        continue
                    }

                    const blob = await response.blob()
                    
                    // ✅ SALVAR COM ID DA UNIDADE (padrão correto!)
                    const extensao = unidade.logo_url.match(/\.(jpg|jpeg|png|webp|gif)$/i)?.[1] || 'jpg'
                    const nomeArquivo = `${unidade.id}.${extensao}`
                    logosFolder.file(nomeArquivo, blob)

                    console.log(`✅ Logo salvo no backup: ${nomeArquivo} (${unidade.nome})`)

                } catch (error) {
                    console.warn(`⚠️ Erro ao baixar logo da unidade ${unidade.nome}:`, error)
                }
            }

            console.log(`✅ ${logosProcessados} logos de unidades adicionados ao ZIP`)

            // 8. Gerar arquivo ZIP
            if (onProgress) onProgress('Gerando arquivo ZIP...', 90)
            
            const zipBlob = await zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 }
            })

            console.log(`✅ ZIP gerado: ${(zipBlob.size / (1024 * 1024)).toFixed(2)} MB`)

            // 9. Download do ZIP
            if (onProgress) onProgress('Baixando arquivo...', 95)
            
            const link = document.createElement('a')
            link.href = URL.createObjectURL(zipBlob)
            link.download = nomeArquivo
            link.click()

            if (onProgress) onProgress('Concluído!', 100)
            console.log('✅ BACKUP COMPLETO REALIZADO!')

            return {
                success: true,
                depreciacoes: depreciacoes?.length || 0,
                unidades: unidades?.length || 0,
                centros: centros?.length || 0,
                patrimonios: patrimonios?.length || 0,
                fotos: fotosProcessadas,
                logos: logosProcessados
            }

        } catch (error) {
            console.error('❌ Erro ao fazer backup:', error)
            throw error
        }
    },

    // ========================================
    // 📥 RESTAURAR BACKUP (ZIP OU JSON) - MANTIDO IGUAL
    // ========================================
    async restaurarBackup(arquivo, onProgress) {
        const extensao = arquivo.name.split('.').pop().toLowerCase()

        if (extensao === 'zip') {
            return await this.restaurarBackupZip(arquivo, onProgress)
        } else if (extensao === 'json') {
            return await this.restaurarBackupJson(arquivo, onProgress)
        } else {
            throw new Error('Formato inválido. Use .zip ou .json')
        }
    },

    async restaurarBackupZip(arquivo, onProgress) {
        console.log('📦 Restaurando backup ZIP...')

        try {
            if (typeof JSZip === 'undefined') {
                throw new Error('JSZip não carregado')
            }

            const zip = await JSZip.loadAsync(arquivo)

            // 1. Ler JSONs do ZIP
            if (onProgress) onProgress('Lendo dados do backup...', 5)

            const depreciacoesJson = await zip.file('depreciacoes.json')?.async('text')
            const unidadesJson = await zip.file('unidades.json')?.async('text')
            const centrosJson = await zip.file('centros_custo.json')?.async('text')
            const patrimoniosJson = await zip.file('patrimonios.json')?.async('text')

            const depreciacoes = depreciacoesJson ? JSON.parse(depreciacoesJson) : []
            const unidades = unidadesJson ? JSON.parse(unidadesJson) : []
            const centros = centrosJson ? JSON.parse(centrosJson) : []
            const patrimonios = patrimoniosJson ? JSON.parse(patrimoniosJson) : []

            console.log(`📊 Backup contém:`)
            console.log(`   - ${depreciacoes.length} depreciações`)
            console.log(`   - ${unidades.length} unidades`)
            console.log(`   - ${centros.length} centros`)
            console.log(`   - ${patrimonios.length} patrimônios`)

            // 2. Restaurar DEPRECIAÇÕES
            if (onProgress) onProgress('Restaurando categorias de depreciação...', 10)
            
            const { data: dataDep, error: errorDep } = await supabase.rpc('restore_depreciacoes', {
                depreciacoes_data: depreciacoes
            })

            if (errorDep) throw errorDep
            if (!dataDep.success) throw new Error(dataDep.error)

            console.log(`✅ ${dataDep.depreciacoesRestauradas} depreciações restauradas`)

            // 3. Restaurar UNIDADES
            if (onProgress) onProgress('Restaurando unidades...', 20)
            
            const { data: dataUni, error: errorUni } = await supabase.rpc('restore_unidades', {
                unidades_data: unidades
            })

            if (errorUni) throw errorUni
            if (!dataUni.success) throw new Error(dataUni.error)

            console.log(`✅ ${dataUni.unidadesRestauradas} unidades restauradas`)

            // 4. Restaurar CENTROS
            if (onProgress) onProgress('Restaurando centros de custo...', 30)
            
            const { data: resCentros, error: errorCentros } = await supabase.rpc('restore_centros_custo', {
                centros_data: centros
            })

            if (errorCentros) throw errorCentros
            if (!resCentros.success) throw new Error(resCentros.error)

            console.log(`✅ ${resCentros.centrosRestaurados} centros restaurados`)

            // 5. Restaurar PATRIMÔNIOS
            if (onProgress) onProgress('Restaurando patrimônios...', 50)
            
            const { data: resPat, error: errorPat } = await supabase.rpc('restore_patrimonios', {
                patrimonios_data: patrimonios
            })

            if (errorPat) throw errorPat
            if (!resPat.success) throw new Error(resPat.error)

            console.log(`✅ ${resPat.patrimoniosRestaurados} patrimônios restaurados`)

            // 6. Restaurar FOTOS
            if (onProgress) onProgress('Restaurando fotos...', 70)

            const fotosFolder = zip.folder('fotos')
            if (!fotosFolder) {
                console.warn('⚠️ Pasta de fotos não encontrada no backup')
                return {
                    success: true,
                    depreciacoesRestauradas: dataDep.depreciacoesRestauradas,
                    unidadesRestauradas: dataUni.unidadesRestauradas,
                    centrosRestaurados: resCentros.centrosRestaurados,
                    patrimoniosRestaurados: resPat.patrimoniosRestaurados,
                    fotosRestauradas: 0,
                    logosRestaurados: 0
                }
            }

            // Filtrar APENAS arquivos da pasta fotos/
            const arquivosFotos = Object.keys(fotosFolder.files)
                .filter(f => f.startsWith('fotos/') && !f.endsWith('/') && f.match(/\.jpg$/))
            
            console.log(`📸 ${arquivosFotos.length} fotos encontradas no backup`)

            let fotosRestauradas = 0
            const totalArquivos = arquivosFotos.length

            for (let i = 0; i < arquivosFotos.length; i++) {
                const path = arquivosFotos[i]
                
                try {
                    const fileName = path.split('/').pop()
                    const match = fileName.match(/^(\d{4})_(\d)\.jpg$/)
                    
                    if (!match) {
                        console.warn(`⚠️ Nome inválido: ${fileName}`)
                        continue
                    }

                    const placa = match[1]
                    const fotoNum = match[2]

                    // Atualizar progresso
                    const progresso = 70 + Math.floor((i / totalArquivos) * 20)
                    if (onProgress) onProgress(`Restaurando foto ${i + 1}/${totalArquivos}...`, progresso)

                    // Buscar patrimônio pela placa
                    const { data: patrimonioData, error: patrimonioError } = await supabase
                        .from('patrimonios')
                        .select('id')
                        .eq('placa', placa)
                        .single()

                    if (patrimonioError || !patrimonioData) {
                        console.warn(`⚠️ Patrimônio não encontrado para placa ${placa}`)
                        continue
                    }

                    const patrimonioId = patrimonioData.id

                    // Extrair foto do ZIP
                    const blobData = await zip.file(path).async('blob')
                    const blob = new Blob([blobData], { type: 'image/jpeg' })
                    const filePath = `patrimonios/${placa}_${fotoNum}.jpg`

                    // Upload da foto
                    const { error: uploadError } = await supabase.storage
                        .from('patrigestor-images')
                        .upload(filePath, blob, {
                            cacheControl: '31536000',
                            upsert: true,
                            contentType: 'image/jpeg'
                        })

                    if (uploadError) {
                        console.error(`❌ Erro ao fazer upload de ${fileName}:`, uploadError)
                        continue
                    }

                    // Obter URL pública usando filePath
                    const { data: urlData } = supabase.storage
                        .from('patrigestor-images')
                        .getPublicUrl(filePath)

                    // Atualizar patrimônio com URL da foto
                    const fotoField = `foto${fotoNum}_url`
                    
                    const { error: updateError } = await supabase
                        .from('patrimonios')
                        .update({ [fotoField]: urlData.publicUrl })
                        .eq('id', patrimonioId)

                    if (updateError) {
                        console.error(`❌ Erro UPDATE para ${placa}:`, updateError)
                        continue
                    }

                    fotosRestauradas++

                } catch (error) {
                    console.error(`❌ Erro ao processar foto ${path}:`, error)
                }
            }

            console.log(`✅ ${fotosRestauradas} fotos restauradas`)

            // 7. Restaurar LOGOS DAS UNIDADES (MANTIDO IGUAL - JÁ ESTÁ CORRETO)
            if (onProgress) onProgress('Restaurando logos das unidades...', 95)

            const logosFolder = zip.folder('logos_unidades')
            let logosRestaurados = 0

            if (logosFolder) {
                const arquivosLogos = Object.keys(logosFolder.files)
                    .filter(f => f.startsWith('logos_unidades/') && !f.endsWith('/'))
                
                console.log(`🏢 ${arquivosLogos.length} logos de unidades encontrados no backup`)

                for (const logoPath of arquivosLogos) {
                    try {
                        const fileName = logoPath.split('/').pop()
                        const unidadeId = fileName.split('.')[0]
                        const extensao = fileName.split('.').pop()

                        console.log(`\n🔍 === Logo ${fileName} ===`)
                        console.log(`🔍 ID extraído: ${unidadeId}`)
                        console.log(`🔍 Extensão: ${extensao}`)

                        // Buscar unidade pelo ID
                        const { data: unidadeData, error: unidadeError } = await supabase
                            .from('unidades')
                            .select('id, nome')
                            .eq('id', unidadeId)
                            .single()

                        console.log(`🔍 Unidade encontrada:`, unidadeData)
                        console.log(`🔍 Erro na busca:`, unidadeError)

                        if (unidadeError || !unidadeData) {
                            console.warn(`⚠️ Unidade não encontrada para ID ${unidadeId}`)
                            continue
                        }

                        // Extrair logo do ZIP
                        const blobData = await zip.file(logoPath).async('blob')
                        const mimeType = extensao === 'png' ? 'image/png' : 'image/jpeg'
                        const blob = new Blob([blobData], { type: mimeType })
                        const filePath = `unidades/${unidadeId}.${extensao}`
                        
                        console.log(`🔍 Blob criado - Size: ${blob.size} bytes, Type: ${blob.type}`)
                        console.log(`🔍 File path: ${filePath}`)

                        // Upload do logo
                        const { error: uploadError } = await supabase.storage
                            .from('patrigestor-images')
                            .upload(filePath, blob, {
                                cacheControl: '31536000',
                                upsert: true,
                                contentType: mimeType
                            })

                        console.log(`🔍 Erro no upload:`, uploadError)

                        if (uploadError) {
                            console.error(`❌ Erro ao fazer upload do logo de ${unidadeData.nome}:`, uploadError)
                            continue
                        }

                        // Obter URL pública
                        const { data: urlData } = supabase.storage
                            .from('patrigestor-images')
                            .getPublicUrl(filePath)

                        console.log(`🔍 URL gerada:`, urlData.publicUrl)

                        // Atualizar unidade com URL do logo
                        const { error: updateError } = await supabase
                            .from('unidades')
                            .update({ logo_url: urlData.publicUrl })
                            .eq('id', unidadeId)

                        console.log(`🔍 Erro no update:`, updateError)

                        if (updateError) {
                            console.error(`❌ Erro UPDATE logo para ${unidadeData.nome}:`, updateError)
                            continue
                        }

                        logosRestaurados++
                        console.log(`✅ Logo restaurado com sucesso: ${unidadeData.nome}\n`)

                    } catch (error) {
                        console.error(`❌ Erro ao processar logo ${logoPath}:`, error)
                    }
                }

                console.log(`✅ ${logosRestaurados} logos de unidades restaurados`)
            }

            if (onProgress) onProgress('Finalizado!', 100)

            return {
                success: true,
                depreciacoesRestauradas: dataDep.depreciacoesRestauradas,
                unidadesRestauradas: dataUni.unidadesRestauradas,
                centrosRestaurados: resCentros.centrosRestaurados,
                patrimoniosRestaurados: resPat.patrimoniosRestaurados,
                fotosRestauradas: fotosRestauradas,
                logosRestaurados: logosRestaurados
            }

        } catch (error) {
            console.error('❌ Erro ao restaurar ZIP:', error)
            throw error
        }
    },

    async restaurarBackupJson(arquivo, onProgress) {
        console.log('📄 Restaurando backup JSON (modo compatibilidade)...')

        try {
            const text = await arquivo.text()
            const backup = JSON.parse(text)

            let resultado = {}

            // Restaurar depreciações
            if (backup.depreciacoes && Array.isArray(backup.depreciacoes)) {
                if (onProgress) onProgress('Restaurando depreciações...', 15)
                
                const { data, error } = await supabase.rpc('restore_depreciacoes', {
                    depreciacoes_data: backup.depreciacoes
                })

                if (error) throw error
                if (!data.success) throw new Error(data.error)

                resultado.depreciacoesRestauradas = data.depreciacoesRestauradas
            }

            // Restaurar unidades
            if (backup.unidades && Array.isArray(backup.unidades)) {
                if (onProgress) onProgress('Restaurando unidades...', 25)
                
                const { data, error } = await supabase.rpc('restore_unidades', {
                    unidades_data: backup.unidades
                })

                if (error) throw error
                if (!data.success) throw new Error(data.error)

                resultado.unidadesRestauradas = data.unidadesRestauradas
            }

            // Restaurar centros
            if (backup.centros_custo && Array.isArray(backup.centros_custo)) {
                if (onProgress) onProgress('Restaurando centros...', 40)
                
                const { data, error } = await supabase.rpc('restore_centros_custo', {
                    centros_data: backup.centros_custo
                })

                if (error) throw error
                if (!data.success) throw new Error(data.error)

                resultado.centrosRestaurados = data.centrosRestaurados
            }

            // Restaurar patrimônios
            if (backup.patrimonios && Array.isArray(backup.patrimonios)) {
                if (onProgress) onProgress('Restaurando patrimônios...', 70)
                
                const { data, error } = await supabase.rpc('restore_patrimonios', {
                    patrimonios_data: backup.patrimonios
                })

                if (error) throw error
                if (!data.success) throw new Error(data.error)

                resultado.patrimoniosRestaurados = data.patrimoniosRestaurados
            }

            if (onProgress) onProgress('Finalizado!', 100)

            resultado.fotosRestauradas = 0
            resultado.logosRestaurados = 0
            resultado.avisos = ['Backup JSON não contém imagens']

            return resultado

        } catch (error) {
            console.error('❌ Erro ao restaurar JSON:', error)
            throw error
        }
    },

    // ========================================
    // 🗑️ LIMPAR SISTEMA COMPLETO - CORRIGIDO
    // ========================================
    async limparSistema(onProgress) {
        console.log('🗑️ Iniciando limpeza do sistema...')

        try {
            const resultado = {
                patrimoniosDeletados: 0,
                fotosDeletadas: 0,
                logosDeletados: 0,
                centrosDeletados: 0,
                unidadesDeletadas: 0,
                depreciacoesDeletadas: 0
            }

            // 1. Limpar patrimônios (registros + fotos)
            console.log('📦 Limpando patrimônios...')
            if (onProgress) onProgress('Buscando patrimonios...', 10)
            
            const { data: patrimonios, error: fetchError } = await supabase
                .from('patrimonios')
                .select('id, placa, foto1_url, foto2_url, foto3_url')

            if (fetchError) throw fetchError

            if (patrimonios && patrimonios.length > 0) {
                const totalPatrimonios = patrimonios.length
                if (onProgress) onProgress(`Deletando fotos (0/${totalPatrimonios} patrimonios)...`, 20)
                
                // Deletar fotos do storage
                for (let i = 0; i < patrimonios.length; i++) {
                    const pat = patrimonios[i]
                    const fotos = [pat.foto1_url, pat.foto2_url, pat.foto3_url].filter(Boolean)
                    const progressoFotos = 20 + Math.floor((i / totalPatrimonios) * 30)
                    if (onProgress) onProgress(`Deletando fotos (${i + 1}/${totalPatrimonios} patrimonios)...`, progressoFotos)
                    
                    for (const fotoUrl of fotos) {
                        try {
                            await deleteImage(fotoUrl)
                            resultado.fotosDeletadas++
                        } catch (error) {
                            console.warn(`⚠️ Erro ao deletar foto: ${error.message}`)
                        }
                    }
                }

                // Deletar registros
                if (onProgress) onProgress('Deletando registros de patrimonios...', 55)
                const { error: deleteError } = await supabase
                    .from('patrimonios')
                    .delete()
                    .neq('id', '00000000-0000-0000-0000-000000000000')

                if (deleteError) throw deleteError

                resultado.patrimoniosDeletados = patrimonios.length
            }

            console.log(`✅ ${resultado.patrimoniosDeletados} patrimônios deletados`)
            console.log(`✅ ${resultado.fotosDeletadas} fotos deletadas`)

            // 2. Limpar centros de custo
            if (onProgress) onProgress('Deletando centros de custo...', 70)
            console.log('🏢 Limpando centros de custo...')
            
            const { data: centros, error: centrosError } = await supabase
                .from('centro_de_custo')
                .select('id')

            if (centrosError) throw centrosError

            if (centros && centros.length > 0) {
                const { error: deleteCentrosError } = await supabase
                    .from('centro_de_custo')
                    .delete()
                    .neq('id', '00000000-0000-0000-0000-000000000000')

                if (deleteCentrosError) throw deleteCentrosError

                resultado.centrosDeletados = centros.length
            }

            console.log(`✅ ${resultado.centrosDeletados} centros deletados`)

            // 3. Limpar logos das unidades (CORRIGIDO)
            if (onProgress) onProgress('Deletando logos das unidades...', 80)
            console.log('🏢 Limpando logos das unidades...')
            
            const { data: unidades, error: unidadesError } = await supabase
                .from('unidades')
                .select('id, logo_url')

            if (unidadesError) throw unidadesError

            if (unidades && unidades.length > 0) {
                // Deletar logos do storage
                for (const unidade of unidades) {
                    if (unidade.logo_url) {
                        try {
                            // ✅ deleteImage() extrai o path da URL e deleta corretamente
                            await deleteImage(unidade.logo_url)
                            resultado.logosDeletados++
                            console.log(`🗑️ Logo deletado: ${unidade.logo_url.split('/').pop()}`)
                        } catch (error) {
                            console.warn(`⚠️ Erro ao deletar logo: ${error.message}`)
                        }
                    }
                }
            }

            console.log(`✅ ${resultado.logosDeletados} logos deletados`)

            // 4. Limpar unidades
            if (onProgress) onProgress('Deletando unidades...', 85)
            console.log('🏪 Limpando unidades...')

            if (unidades && unidades.length > 0) {
                const { error: deleteUnidadesError } = await supabase
                    .from('unidades')
                    .delete()
                    .neq('id', '00000000-0000-0000-0000-000000000000')

                if (deleteUnidadesError) throw deleteUnidadesError

                resultado.unidadesDeletadas = unidades.length
            }

            console.log(`✅ ${resultado.unidadesDeletadas} unidades deletadas`)

            // 5. Limpar depreciações
            if (onProgress) onProgress('Deletando categorias de depreciação...', 95)
            console.log('📊 Limpando depreciações...')
            
            const { data: depreciacoes, error: depreciacoesError } = await supabase
                .from('depreciacao')
                .select('id')

            if (depreciacoesError) throw depreciacoesError

            if (depreciacoes && depreciacoes.length > 0) {
                const { error: deleteDepreciacoesError } = await supabase
                    .from('depreciacao')
                    .delete()
                    .neq('id', '00000000-0000-0000-0000-000000000000')

                if (deleteDepreciacoesError) throw deleteDepreciacoesError

                resultado.depreciacoesDeletadas = depreciacoes.length
            }

            console.log(`✅ ${resultado.depreciacoesDeletadas} depreciações deletadas`)

            // ⚠️ USUÁRIOS NÃO SÃO DELETADOS

            if (onProgress) onProgress('Limpeza concluida!', 100)
            console.log('✅ LIMPEZA COMPLETA!')
            console.log('ℹ️ Usuários não foram deletados (administração individual)')
            
            return resultado

        } catch (error) {
            console.error('❌ Erro ao limpar sistema:', error)
            throw error
        }
    }
}