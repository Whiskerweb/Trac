import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/utils/supabase/server'

/**
 * POST /api/upload
 * Upload avatar images or CV PDFs to Supabase Storage
 *
 * Body: FormData with:
 * - file: the file to upload
 * - type: 'avatar' | 'cv'
 */
export async function POST(request: NextRequest) {
    try {
        // Auth check
        const currentUser = await getCurrentUser()
        if (!currentUser) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const formData = await request.formData()
        const file = formData.get('file') as File | null
        const type = formData.get('type') as string | null

        if (!file) {
            return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
        }

        const validTypes = ['avatar', 'cv', 'logo', 'pitch_deck', 'doc']
        if (!type || !validTypes.includes(type)) {
            return NextResponse.json({ error: `Invalid type. Accepted types: ${validTypes.join(', ')}` }, { status: 400 })
        }

        // Validate file type
        const imageTypes = ['avatar', 'logo']
        const pdfTypes = ['cv', 'pitch_deck', 'doc']

        if (imageTypes.includes(type)) {
            const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
            if (!validImageTypes.includes(file.type)) {
                return NextResponse.json({
                    error: 'Format d\'image invalide. Utilisez JPG, PNG ou WebP.'
                }, { status: 400 })
            }
        } else if (pdfTypes.includes(type)) {
            if (file.type !== 'application/pdf') {
                return NextResponse.json({
                    error: 'Format invalide. Utilisez uniquement PDF.'
                }, { status: 400 })
            }
        }

        // Validate file size (5MB max for images, 10MB max for PDFs)
        const maxSize = imageTypes.includes(type) ? 5 * 1024 * 1024 : 10 * 1024 * 1024
        if (file.size > maxSize) {
            return NextResponse.json({
                error: `Fichier trop volumineux. Maximum ${type === 'avatar' ? '5MB' : '10MB'}.`
            }, { status: 400 })
        }

        // Generate unique filename
        const timestamp = Date.now()
        const extension = file.name.split('.').pop()
        const filename = `${currentUser.userId}_${timestamp}.${extension}`

        // Determine bucket folder
        const dirMap: Record<string, string> = {
            avatar: 'avatars',
            cv: 'cvs',
            logo: 'logos',
            pitch_deck: 'documents',
            doc: 'documents'
        }
        const folder = dirMap[type] || 'uploads'
        const storagePath = `${folder}/${filename}`

        // Upload to Supabase Storage
        const supabase = await createClient()
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        const { data, error} = await supabase.storage
            .from('upload')  // ✅ Fixed: Use singular 'upload' to match created bucket
            .upload(storagePath, buffer, {
                contentType: file.type,
                upsert: true
            })

        if (error) {
            console.error('[Upload] Supabase error:', {
                message: error.message,
                bucket: 'upload',
                path: storagePath,
                user: currentUser.userId
            })

            // Return more specific error message
            const errorMessage = error.message.includes('policies') || error.message.includes('policy')
                ? 'Permissions insuffisantes. Configurez les politiques Supabase Storage (RLS).'
                : error.message.includes('not found') || error.message.includes('does not exist')
                ? 'Supabase Storage bucket not found. Check that the "upload" bucket exists.'
                : `Erreur upload: ${error.message}`

            return NextResponse.json({
                error: errorMessage,
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            }, { status: 500 })
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('upload')  // ✅ Fixed: Use singular 'upload' to match created bucket
            .getPublicUrl(storagePath)

        const url = urlData.publicUrl

        return NextResponse.json({
            success: true,
            url
        })

    } catch (error) {
        console.error('Upload error:', error)
        return NextResponse.json({
            error: 'Erreur lors de l\'upload du fichier'
        }, { status: 500 })
    }
}
