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
            throw new Error('JÃ¡ existe um usuÃ¡rio ROOT no sistema!')
        }

        try {
            console.log('ðŸ”´ Criando usuÃ¡rio ROOT...')

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
                console.error('âŒ Erro no signUp:', authError)
                throw authError
            }

            if (!authData.user) {
                throw new Error('Erro ao criar usuÃ¡rio ROOT')
            }

            console.log('âœ… ROOT criado no auth:', authData.user.id)

            await supabase.auth.signOut()
            console.log('ðŸ”“ Logout automÃ¡tico apÃ³s criaÃ§Ã£o')

            await new Promise(resolve => setTimeout(resolve, 2000))

            console.log('âœ… ROOT configurado com sucesso!')

            return authData.user

        } catch (error) {
            console.error('âŒ Erro ao criar ROOT:', error)
            throw error
        }
    },

    // ========================================
    // ESTATÃSTICAS (CORRIGIDO - TAMANHO REAL)
    // ========================================
    async obterEstatisticas() {
        try {
            const { count: totalPatrimonios } = await supabase
                .from('patrimonios')
                .select('*', { count: 'exact', head: true })

            const { count: totalCentros } = await supabase
                .from('centro_de_custo')
                .select('*', { count: 'exact', head: true })

            const { count: totalUsuarios } = await supabase
                .from('usuarios')
                .select('*', { count: 'exact', head: true })

            // âœ… BUSCAR FOTOS DO STORAGE (TAMANHO REAL)
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
                    console.warn('âš ï¸ Erro ao listar storage:', storageError)
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
                    // âœ… SOMAR TAMANHO REAL DOS ARQUIVOS
                    arquivos.forEach(arquivo => {
                        if (arquivo.name && arquivo.name.match(/^\d{4}_\d\.jpg$/)) {
                            totalFotos++
                            tamanhoTotalBytes += arquivo.metadata?.size || 200 * 1024
                        }
                    })
                }
            } catch (error) {
                console.warn('âš ï¸ Erro ao calcular estatÃ­sticas de fotos:', error)
            }

            const storageMB = (tamanhoTotalBytes / (1024 * 1024)).toFixed(2)

            console.log(`ðŸ“Š EstatÃ­sticas: ${totalPatrimonios} patrimÃ´nios, ${totalFotos} fotos (${storageMB} MB)`)

            return {
                patrimonios: totalPatrimonios || 0,
                centros: totalCentros || 0,
                usuarios: totalUsuarios || 0,
                fotos: totalFotos,
                storageMB: storageMB
            }
        } catch (error) {
            console.error('Erro ao obter estatÃ­sticas:', error)
            return {
                patrimonios: 0,
                centros: 0,
                usuarios: 0,
                fotos: 0,
                storageMB: '0.00'
            }
        }
    },

    // ========================================
    // ðŸš€ BACKUP COMPLETO COM IMAGENS (ZIP)
    // ========================================
    async fazerBackupCompleto(nomeArquivo, onProgress) {
        console.log('ðŸ’¾ Iniciando backup completo com imagens...')

        try {
            if (typeof JSZip === 'undefined') {
                throw new Error('JSZip nÃ£o carregado. Adicione o script no index.html')
            }

            const zip = new JSZip()

            // 1. Buscar patrimÃ´nios com centros
            if (onProgress) onProgress('Buscando patrimÃ´nios...', 10)
            
            const { data: patrimonios, error: patError } = await supabase
                .from('patrimonios')
                .select(`
                    *,
                    centro_custo:centro_de_custo(nome)
                `)
                .order('placa')

            if (patError) throw patError

            console.log(`âœ… ${patrimonios?.length || 0} patrimÃ´nios encontrados`)

            // 2. Buscar centros
            if (onProgress) onProgress('Buscando centros de custo...', 20)
            
            const { data: centros, error: centrosError } = await supabase
                .from('centro_de_custo')
                .select('*')
                .order('nome')

            if (centrosError) throw centrosError

            console.log(`âœ… ${centros?.length || 0} centros encontrados`)

            // 3. Preparar dados (converter UUID â†’ nome)
            const patrimoniosBackup = patrimonios.map(p => {
                const backup = { ...p }
                
                if (p.centro_custo?.nome) {
                    backup.centro_custo_nome = p.centro_custo.nome
                }
                
                delete backup.id
                delete backup.centro_custo_id
                delete backup.centro_custo
                delete backup.created_at
                delete backup.updated_at
                delete backup.created_by
                delete backup.updated_by
                
                return backup
            })

            // 4. Criar JSON de dados
            const dados = {
                versao: '2.0',
                data_backup: new Date().toISOString(),
                empresa: nomeArquivo || 'patrigestor',
                totais: {
                    patrimonios: patrimoniosBackup.length,
                    centros: centros.length,
                    fotos: 0
                },
                patrimonios: patrimoniosBackup,
                centros_custo: centros
            }

            zip.file('dados.json', JSON.stringify(dados, null, 2))
            console.log('âœ… dados.json criado')

            // 5. Baixar e adicionar imagens
            if (onProgress) onProgress('Baixando imagens...', 30)
            
            const imagensFolder = zip.folder('imagens')
            let totalFotos = 0
            let fotosProcessadas = 0

            // Contar total de fotos
            patrimonios.forEach(p => {
                if (p.foto1_url) totalFotos++
                if (p.foto2_url) totalFotos++
                if (p.foto3_url) totalFotos++
            })

            console.log(`ðŸ“¸ Total de fotos para baixar: ${totalFotos}`)

            // Baixar cada foto
            for (const patrimonio of patrimonios) {
                const fotos = [
                    { url: patrimonio.foto1_url, num: 1 },
                    { url: patrimonio.foto2_url, num: 2 },
                    { url: patrimonio.foto3_url, num: 3 }
                ]

                for (const foto of fotos) {
                    if (foto.url) {
                        try {
                            console.log(`ðŸ“¥ Baixando: ${patrimonio.placa}_${foto.num}.jpg`)
                            
                            const response = await fetch(foto.url)
                            if (!response.ok) throw new Error('Erro ao baixar imagem')
                            
                            const blob = await response.blob()
                            imagensFolder.file(`${patrimonio.placa}_${foto.num}.jpg`, blob)
                            
                            fotosProcessadas++
                            
                            if (onProgress) {
                                const progresso = 30 + Math.floor((fotosProcessadas / totalFotos) * 60)
                                onProgress(`Baixando imagem ${fotosProcessadas}/${totalFotos}...`, progresso)
                            }
                            
                        } catch (error) {
                            console.warn(`âš ï¸ Erro ao baixar foto ${patrimonio.placa}_${foto.num}:`, error)
                        }
                    }
                }
            }

            dados.totais.fotos = fotosProcessadas
            zip.file('dados.json', JSON.stringify(dados, null, 2))

            console.log(`âœ… ${fotosProcessadas} fotos adicionadas ao ZIP`)

            // 6. Gerar ZIP
            if (onProgress) onProgress('Gerando arquivo ZIP...', 95)
            
            const zipBlob = await zip.generateAsync({ 
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 }
            })

            console.log(`âœ… ZIP gerado: ${(zipBlob.size / (1024 * 1024)).toFixed(2)} MB`)

            // 7. Download
            if (onProgress) onProgress('Finalizando...', 100)
            
            const url = URL.createObjectURL(zipBlob)
            const a = document.createElement('a')
            a.href = url
            
            const timestamp = new Date().toISOString().split('T')[0]
            const nomeCompleto = nomeArquivo 
                ? `${nomeArquivo}_${timestamp}.zip`
                : `patrigestor-backup_${timestamp}.zip`
            
            a.download = nomeCompleto
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)

            console.log('âœ… Backup completo finalizado!')

            return {
                success: true,
                patrimonios: patrimoniosBackup.length,
                centros: centros.length,
                fotos: fotosProcessadas,
                tamanho: (zipBlob.size / (1024 * 1024)).toFixed(2) + ' MB'
            }

        } catch (error) {
            console.error('âŒ Erro ao fazer backup:', error)
            throw error
        }
    },

    // ========================================
    // ðŸ“¥ RESTAURAR BACKUP (ZIP ou JSON)
    // ========================================
    async restaurarBackup(arquivo, onProgress) {
        console.log('ðŸ“¥ Iniciando restore...')

        try {
            if (typeof JSZip === 'undefined') {
                throw new Error('JSZip nÃ£o carregado. Adicione o script no index.html')
            }

            if (onProgress) onProgress('Lendo arquivo...', 5)

            // Detectar tipo de arquivo
            const isZip = arquivo.name.endsWith('.zip')

            if (isZip) {
                // Processar ZIP
                return await this.restaurarBackupZip(arquivo, onProgress)
            } else {
                // Processar JSON (compatibilidade)
                return await this.restaurarBackupJson(arquivo, onProgress)
            }

        } catch (error) {
            console.error('âŒ Erro ao restaurar backup:', error)
            throw error
        }
    },

    async restaurarBackupZip(arquivo, onProgress) {
        console.log('ðŸ“¦ Restaurando backup ZIP...')

        try {
            const zip = new JSZip()
            const zipContent = await zip.loadAsync(arquivo)

            // 1. Ler dados.json
            if (onProgress) onProgress('Lendo dados...', 10)
            
            const dadosFile = zipContent.file('dados.json')
            if (!dadosFile) throw new Error('Arquivo dados.json nÃ£o encontrado no ZIP')

            const dadosText = await dadosFile.async('text')
            const dados = JSON.parse(dadosText)

            console.log('ðŸ“Š Dados do backup:', dados)

            // 2. Restaurar centros primeiro
            if (onProgress) onProgress('Restaurando centros de custo...', 20)
            
            const { data: resCentros, error: errCentros } = await supabase.rpc('restore_centros_custo', {
                centros_data: dados.centros_custo || []
            })

            if (errCentros) throw errCentros
            if (!resCentros.success) throw new Error(resCentros.error)

            console.log(`âœ… ${resCentros.centrosRestaurados} centros restaurados`)

            // 3. Restaurar patrimônios NORMALMENTE (já funciona!)
            if (onProgress) onProgress('Restaurando patrimônios...', 40)
            
            // ✅ CORREÇÃO SIMPLES: Restaurar COM URLs antigas (serão substituídas depois)
            const { data: resPat, error: errPat } = await supabase.rpc('restore_patrimonios', {
                patrimonios_data: dados.patrimonios || []  // ✅ Enviar dados COMPLETOS
            })

            if (errPat) throw errPat
            if (!resPat.success) throw new Error(resPat.error)

            console.log(`✅ ${resPat.patrimoniosRestaurados} patrimônios restaurados`)


            // 4. Buscar patrimÃ´nios restaurados para fazer upload das fotos
            if (onProgress) onProgress('Buscando patrimÃ´nios...', 50)
            
            const { data: patrimoniosRestaurados, error: fetchError } = await supabase
                .from('patrimonios')
                .select('id, placa')
                .order('placa')

            if (fetchError) throw fetchError

            // Criar mapa placa â†’ id
            const mapaPlacas = {}
            patrimoniosRestaurados.forEach(p => {
                mapaPlacas[p.placa] = p.id
            })

            // 5. Fazer upload das fotos
            const imagensFolder = zipContent.folder('imagens')
            if (!imagensFolder) {
                console.warn('âš ï¸ Pasta de imagens nÃ£o encontrada no ZIP')
                
                return {
                    success: true,
                    centrosRestaurados: resCentros.centrosRestaurados,
                    patrimoniosRestaurados: resPat.patrimoniosRestaurados,
                    fotosRestauradas: 0,
                    avisos: ['Nenhuma imagem encontrada no backup']
                }
            }

            const arquivosImagens = []
            imagensFolder.forEach((relativePath, file) => {
                if (!file.dir) {
                    arquivosImagens.push({ path: relativePath, file })
                }
            })

            console.log(`ðŸ“¸ ${arquivosImagens.length} imagens para restaurar`)

            let fotosRestauradas = 0

            for (let i = 0; i < arquivosImagens.length; i++) {
                const { path, file } = arquivosImagens[i]
                
                try {
                    // Extrair placa e nÃºmero da foto do nome do arquivo
                    // Formato: placa_numero.jpg
                    const match = path.match(/(.+)_(\d+)\.jpg$/)
                    if (!match) {
                        console.warn(`âš ï¸ Nome de arquivo invÃ¡lido: ${path}`)
                        continue
                    }

                    const [, placa, fotoNum] = match
                    const patrimonioId = mapaPlacas[placa]

                    if (!patrimonioId) {
                        console.warn(`âš ï¸ PatrimÃ´nio nÃ£o encontrado: ${placa}`)
                        continue
                    }

                    // Baixar blob da imagem do ZIP
                    const blobOriginal = await file.async('blob')
                    
                    // âœ… CRIAR NOVO BLOB COM MIME TYPE CORRETO
                    const blob = new Blob([blobOriginal], { type: 'image/jpeg' })

                    // Fazer upload para Supabase Storage
                    const fileName = `${placa}_${fotoNum}.jpg`
                    const filePath = `patrimonios/${fileName}`

                    if (onProgress) {
                        const progresso = 50 + Math.floor((i / arquivosImagens.length) * 45)
                        onProgress(`Restaurando foto ${i + 1}/${arquivosImagens.length}...`, progresso)
                    }

                    // Deletar foto antiga se existir
                    try {
                        await supabase.storage
                            .from('patrigestor-images')
                            .remove([filePath])
                    } catch (deleteError) {
                        // Ignora erro se nÃ£o existir
                    }

                    // Upload da foto com MIME type correto
                    const { data: uploadData, error: uploadError } = await supabase.storage
                        .from('patrigestor-images')
                        .upload(filePath, blob, {
                            cacheControl: '31536000',
                            upsert: false,
                            contentType: 'image/jpeg'
                        })

                    if (uploadError) {
                        console.error(`âŒ Erro ao fazer upload de ${path}:`, uploadError)
                        continue
                    }

                    // Obter URL pÃºblica
                    const { data: urlData } = supabase.storage
                        .from('patrigestor-images')
                        .getPublicUrl(uploadData.path)

                    // Atualizar patrimÃ´nio com URL da foto
                    const fotoField = `foto${fotoNum}_url`
                    
                    console.log(`ðŸ"„ Atualizando patrimÃ´nio: placa=${placa}, id=${patrimonioId}, campo=${fotoField}`)
                    
                    const { data: updateData, error: updateError } = await supabase
                        .from('patrimonios')
                        .update({ [fotoField]: urlData.publicUrl })
                        .eq('id', patrimonioId)
                        .select()  // ⬅️ ADICIONAR ISSO!

                    if (updateError) {
                        console.error(`   ❌ Erro UPDATE: ${updateError.message}`)
                        console.error(`   ❌ Detalhes:`, updateError)
                        continue
                    }

                    // ⬅️ ADICIONAR VALIDAÇÃO
                    if (!updateData || updateData.length === 0) {
                        console.error(`   ❌ UPDATE não retornou dados para placa ${placa}`)
                        continue
                    }

                    console.log(`   ✅ CONFIRMADO! ${fotoField} atualizado`)

                    fotosRestauradas++
                    console.log(`âœ… Foto vinculada: ${placa} -> ${fotoField} = ${urlData.publicUrl}`)

                } catch (error) {
                    console.error(`âŒ Erro ao processar ${path}:`, error)
                }
            }

            console.log(`âœ… ${fotosRestauradas} fotos restauradas`)

            if (onProgress) onProgress('Finalizado!', 100)

            return {
                success: true,
                centrosRestaurados: resCentros.centrosRestaurados,
                patrimoniosRestaurados: resPat.patrimoniosRestaurados,
                fotosRestauradas: fotosRestauradas
            }

        } catch (error) {
            console.error('âŒ Erro ao restaurar ZIP:', error)
            throw error
        }
    },

    async restaurarBackupJson(arquivo, onProgress) {
        console.log('ðŸ“„ Restaurando backup JSON (modo compatibilidade)...')

        try {
            const text = await arquivo.text()
            const backup = JSON.parse(text)

            let resultado = {}

            // Restaurar centros
            if (backup.centros_custo && Array.isArray(backup.centros_custo)) {
                if (onProgress) onProgress('Restaurando centros...', 30)
                
                const { data, error } = await supabase.rpc('restore_centros_custo', {
                    centros_data: backup.centros_custo
                })

                if (error) throw error
                if (!data.success) throw new Error(data.error)

                resultado.centrosRestaurados = data.centrosRestaurados
            }

            // Restaurar patrimÃ´nios
            if (backup.patrimonios && Array.isArray(backup.patrimonios)) {
                if (onProgress) onProgress('Restaurando patrimÃ´nios...', 70)
                
                const { data, error } = await supabase.rpc('restore_patrimonios', {
                    patrimonios_data: backup.patrimonios
                })

                if (error) throw error
                if (!data.success) throw new Error(data.error)

                resultado.patrimoniosRestaurados = data.patrimoniosRestaurados
            }

            if (onProgress) onProgress('Finalizado!', 100)

            resultado.fotosRestauradas = 0
            resultado.avisos = ['Backup JSON nÃ£o contÃ©m imagens']

            return resultado

        } catch (error) {
            console.error('âŒ Erro ao restaurar JSON:', error)
            throw error
        }
    },

    // ========================================
    // ðŸ—‘ï¸ LIMPAR SISTEMA COMPLETO
    // ========================================
    async limparSistema(onProgress) {
        console.log('ðŸ—‘ï¸ Iniciando limpeza do sistema...')

        try {
            const resultado = {
                patrimoniosDeletados: 0,
                fotosDeletadas: 0,
                centrosDeletados: 0
            }

            // 1. Limpar patrimÃ´nios (registros + fotos)
            console.log('ðŸ“¦ Limpando patrimÃ´nios...')
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
                    const progressoFotos = 20 + Math.floor((i / totalPatrimonios) * 40)
                    if (onProgress) onProgress(`Deletando fotos (${i + 1}/${totalPatrimonios} patrimonios)...`, progressoFotos)
                    
                    for (const fotoUrl of fotos) {
                        try {
                            await deleteImage(fotoUrl)
                            resultado.fotosDeletadas++
                        } catch (error) {
                            console.warn(`âš ï¸ Erro ao deletar foto: ${error.message}`)
                        }
                    }
                }

                // Deletar registros
                if (onProgress) onProgress('Deletando registros de patrimonios...', 70)
                const { error: deleteError } = await supabase
                    .from('patrimonios')
                    .delete()
                    .neq('id', '00000000-0000-0000-0000-000000000000')

                if (deleteError) throw deleteError

                resultado.patrimoniosDeletados = patrimonios.length
            }

            console.log(`âœ… ${resultado.patrimoniosDeletados} patrimÃ´nios deletados`)
            console.log(`âœ… ${resultado.fotosDeletadas} fotos deletadas`)

            // 2. Limpar centros de custo
            if (onProgress) onProgress('Deletando centros de custo...', 85)
            console.log('ðŸ¢ Limpando centros de custo...')
            
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

            console.log(`âœ… ${resultado.centrosDeletados} centros deletados`)

            if (onProgress) onProgress('Limpeza concluida!', 100)
            console.log('âœ… LIMPEZA COMPLETA!')
            return resultado

        } catch (error) {
            console.error('âŒ Erro ao limpar sistema:', error)
            throw error
        }
    }
}