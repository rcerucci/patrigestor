import imageCompression from 'browser-image-compression'
import { supabase } from './supabaseClient.js'

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const TAMANHO_MAX_ORIGINAL_MB = 50
const TAMANHO_FINAL_KB = 200
const MIN_WIDTH = 400
const MIN_HEIGHT = 400

export async function uploadImage(file, placa, fotoNumero) {
    try {
        console.log('📸 Iniciando upload:', file.name)
        console.log('📦 Tamanho original:', (file.size / 1024).toFixed(2), 'KB')
        console.log('📋 Tipo:', file.type)
        
        if (!TIPOS_PERMITIDOS.includes(file.type)) {
            throw new Error('Tipo de arquivo não permitido. Use: JPG, PNG ou WEBP')
        }
        
        if (file.size > TAMANHO_MAX_ORIGINAL_MB * 1024 * 1024) {
            throw new Error(`Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(2)}MB). Máximo: ${TAMANHO_MAX_ORIGINAL_MB}MB`)
        }
        
        const dimensions = await getImageDimensions(file)
        if (dimensions.width < MIN_WIDTH || dimensions.height < MIN_HEIGHT) {
            throw new Error(`Imagem muito pequena (${dimensions.width}x${dimensions.height}). Mínimo: ${MIN_WIDTH}x${MIN_HEIGHT}px`)
        }
        
        console.log(`📐 Dimensões: ${dimensions.width}x${dimensions.height}px`)
        
        const compressedFile = await compressImage(file)
        
        console.log('✅ Comprimido:', (compressedFile.size / 1024).toFixed(2), 'KB')
        
        if (compressedFile.size > TAMANHO_FINAL_KB * 1024) {
            throw new Error(`Falha na compressão. Tamanho: ${(compressedFile.size / 1024).toFixed(2)}KB. Use outra imagem.`)
        }
        
        return await uploadToStorage(compressedFile, placa, fotoNumero)

    } catch (error) {
        console.error('❌ Erro no upload:', error)
        throw error
    }
}

async function getImageDimensions(file) {
    return new Promise((resolve, reject) => {
        const img = new Image()
        const url = URL.createObjectURL(file)
        
        img.onload = () => {
            URL.revokeObjectURL(url)
            resolve({
                width: img.width,
                height: img.height
            })
        }
        
        img.onerror = () => {
            URL.revokeObjectURL(url)
            reject(new Error('Erro ao ler dimensões da imagem'))
        }
        
        img.src = url
    })
}

async function compressImage(file) {
    const tentativas = [
        {
            maxSizeMB: TAMANHO_FINAL_KB / 1000,
            maxWidthOrHeight: 1600,
            initialQuality: 0.85
        },
        {
            maxSizeMB: TAMANHO_FINAL_KB / 1000,
            maxWidthOrHeight: 1400,
            initialQuality: 0.75
        },
        {
            maxSizeMB: 0.18,
            maxWidthOrHeight: 1200,
            initialQuality: 0.65
        },
        {
            maxSizeMB: 0.16,
            maxWidthOrHeight: 1000,
            initialQuality: 0.55
        }
    ]
    
    for (let i = 0; i < tentativas.length; i++) {
        const options = {
            ...tentativas[i],
            useWebWorker: true,
            fileType: 'image/jpeg'
        }
        
        console.log(`🔄 Tentativa ${i + 1}/${tentativas.length} de compressão...`)
        
        const compressed = await imageCompression(file, options)
        
        console.log(`   Resultado: ${(compressed.size / 1024).toFixed(2)} KB`)
        
        if (compressed.size <= TAMANHO_FINAL_KB * 1024) {
            console.log(`✅ Compressão bem-sucedida na tentativa ${i + 1}`)
            return compressed
        }
        
        if (i === tentativas.length - 1) {
            console.warn('⚠️ Não conseguiu atingir 200KB, usando melhor resultado')
            return compressed
        }
    }
}

async function uploadToStorage(file, placa, fotoNumero) {
    const placaSanitizada = placa.replace(/[^a-zA-Z0-9]/g, '_')
    const fileName = `${placaSanitizada}_${fotoNumero}.jpg`
    const filePath = `patrimonios/${fileName}`

    console.log('📤 Enviando para Supabase Storage:', filePath)

    try {
        await supabase.storage
            .from('patrigestor-images')
            .remove([filePath])
        console.log('🗑️ Foto antiga removida')
    } catch (deleteError) {
        console.log('ℹ️ Nenhuma foto antiga para remover')
    }

    const { data, error } = await supabase.storage
        .from('patrigestor-images')
        .upload(filePath, file, {
            cacheControl: '31536000',
            upsert: false,
            contentType: 'image/jpeg'
        })

    if (error) {
        console.error('❌ Erro no upload:', error)
        
        if (error.message.includes('Bucket not found')) {
            throw new Error('Bucket de imagens não configurado. Contate o administrador.')
        }
        
        if (error.message.includes('row-level security')) {
            throw new Error('Você não tem permissão para fazer upload de imagens.')
        }
        
        if (error.message.includes('Payload too large')) {
            throw new Error('Arquivo muito grande mesmo após compressão. Tente outra imagem.')
        }
        
        throw new Error('Erro ao fazer upload: ' + error.message)
    }

    console.log('✅ Upload concluído:', data.path)

    const { data: urlData } = supabase.storage
        .from('patrigestor-images')
        .getPublicUrl(data.path)

    console.log('🔗 URL pública:', urlData.publicUrl)

    return urlData.publicUrl
}

export async function deleteImage(imageUrl) {
    try {
        if (!imageUrl) return
        
        const urlParts = imageUrl.split('/storage/v1/object/public/patrigestor-images/')
        if (urlParts.length < 2) {
            console.warn('URL inválida para deletar:', imageUrl)
            return
        }
        
        const path = urlParts[1]
        
        console.log('🗑️ Deletando imagem:', path)
        
        const { error } = await supabase.storage
            .from('patrigestor-images')
            .remove([path])

        if (error) {
            console.error('Erro ao deletar imagem:', error)
        } else {
            console.log('✅ Imagem deletada com sucesso')
        }
        
    } catch (error) {
        console.error('❌ Erro ao deletar imagem:', error)
    }
}

// ============================================
// UPLOAD DE LOGOS DE UNIDADES
// ============================================

const LOGO_CONFIG = {
    TAMANHO_FINAL_KB: 300,    // Logos precisam de mais qualidade
    MIN_WIDTH: 200,           // Logos podem ser menores
    MIN_HEIGHT: 200,
    MAX_DIMENSION: 800        // Tamanho máximo para logos
}

export async function uploadLogo(file, unidadeId) {
    try {
        console.log('🖼️ Iniciando upload de logo:', file.name)
        console.log('📦 Tamanho original:', (file.size / 1024).toFixed(2), 'KB')
        console.log('📋 Tipo:', file.type)
        
        if (!TIPOS_PERMITIDOS.includes(file.type)) {
            throw new Error('Tipo de arquivo não permitido. Use: JPG, PNG ou WEBP')
        }
        
        if (file.size > TAMANHO_MAX_ORIGINAL_MB * 1024 * 1024) {
            throw new Error(`Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(2)}MB). Máximo: ${TAMANHO_MAX_ORIGINAL_MB}MB`)
        }
        
        const dimensions = await getImageDimensions(file)
        if (dimensions.width < LOGO_CONFIG.MIN_WIDTH || dimensions.height < LOGO_CONFIG.MIN_HEIGHT) {
            throw new Error(`Logo muito pequeno (${dimensions.width}x${dimensions.height}). Mínimo: ${LOGO_CONFIG.MIN_WIDTH}x${LOGO_CONFIG.MIN_HEIGHT}px`)
        }
        
        console.log(`📏 Dimensões: ${dimensions.width}x${dimensions.height}px`)
        
        const compressedFile = await compressLogo(file)
        
        console.log('✅ Comprimido:', (compressedFile.size / 1024).toFixed(2), 'KB')
        
        if (compressedFile.size > LOGO_CONFIG.TAMANHO_FINAL_KB * 1024) {
            console.warn(`⚠️ Logo ficou com ${(compressedFile.size / 1024).toFixed(2)}KB (ideal: ${LOGO_CONFIG.TAMANHO_FINAL_KB}KB)`)
        }
        
        return await uploadLogoToStorage(compressedFile, unidadeId)

    } catch (error) {
        console.error('❌ Erro no upload do logo:', error)
        throw error
    }
}

async function compressLogo(file) {
    const tentativas = [
        {
            maxSizeMB: LOGO_CONFIG.TAMANHO_FINAL_KB / 1000,
            maxWidthOrHeight: LOGO_CONFIG.MAX_DIMENSION,
            initialQuality: 0.90
        },
        {
            maxSizeMB: LOGO_CONFIG.TAMANHO_FINAL_KB / 1000,
            maxWidthOrHeight: 700,
            initialQuality: 0.80
        },
        {
            maxSizeMB: 0.28,
            maxWidthOrHeight: 600,
            initialQuality: 0.70
        }
    ]
    
    for (let i = 0; i < tentativas.length; i++) {
        const options = {
            ...tentativas[i],
            useWebWorker: true,
            fileType: 'image/jpeg'
        }
        
        console.log(`🔄 Tentativa ${i + 1}/${tentativas.length} de compressão do logo...`)
        
        const compressed = await imageCompression(file, options)
        
        console.log(`   Resultado: ${(compressed.size / 1024).toFixed(2)} KB`)
        
        if (compressed.size <= LOGO_CONFIG.TAMANHO_FINAL_KB * 1024) {
            console.log(`✅ Compressão bem-sucedida na tentativa ${i + 1}`)
            return compressed
        }
        
        if (i === tentativas.length - 1) {
            console.warn('⚠️ Não conseguiu atingir 300KB, usando melhor resultado')
            return compressed
        }
    }
}

async function uploadLogoToStorage(file, unidadeId) {
    const fileName = `${unidadeId}.jpg`
    const filePath = `unidades/${fileName}`

    console.log('📤 Enviando logo para Supabase Storage:', filePath)

    try {
        await supabase.storage
            .from('patrigestor-images')
            .remove([filePath])
        console.log('🗑️ Logo antigo removido')
    } catch (deleteError) {
        console.log('ℹ️ Nenhum logo antigo para remover')
    }

    const { data, error } = await supabase.storage
        .from('patrigestor-images')
        .upload(filePath, file, {
            cacheControl: '31536000',
            upsert: false,
            contentType: 'image/jpeg'
        })

    if (error) {
        console.error('❌ Erro no upload do logo:', error)
        
        if (error.message.includes('Bucket not found')) {
            throw new Error('Bucket de imagens não configurado. Contate o administrador.')
        }
        
        if (error.message.includes('row-level security')) {
            throw new Error('Você não tem permissão para fazer upload de logos.')
        }
        
        if (error.message.includes('Payload too large')) {
            throw new Error('Logo muito grande mesmo após compressão. Tente outra imagem.')
        }
        
        throw new Error('Erro ao fazer upload do logo: ' + error.message)
    }

    console.log('✅ Upload do logo concluído:', data.path)

    const { data: urlData } = supabase.storage
        .from('patrigestor-images')
        .getPublicUrl(data.path)

    console.log('🔗 URL pública do logo:', urlData.publicUrl)

    return urlData.publicUrl
}