import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { getCurrentUser } from '@/lib/auth'

/**
 * POST /api/upload
 * Upload avatar images or CV PDFs
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
            return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
        }

        const formData = await request.formData()
        const file = formData.get('file') as File | null
        const type = formData.get('type') as string | null

        if (!file) {
            return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
        }

        const validTypes = ['avatar', 'cv', 'logo', 'pitch_deck', 'doc']
        if (!type || !validTypes.includes(type)) {
            return NextResponse.json({ error: `Type invalide. Types acceptés: ${validTypes.join(', ')}` }, { status: 400 })
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

        // Determine upload directory
        const dirMap: Record<string, string> = {
            avatar: 'avatars',
            cv: 'cvs',
            logo: 'logos',
            pitch_deck: 'documents',
            doc: 'documents'
        }
        const uploadDir = dirMap[type] || 'uploads'
        const publicPath = join(process.cwd(), 'public', uploadDir)

        // Create directory if it doesn't exist
        try {
            await mkdir(publicPath, { recursive: true })
        } catch (err) {
            // Directory might already exist, ignore error
        }

        // Convert file to buffer and write
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const filePath = join(publicPath, filename)

        await writeFile(filePath, buffer)

        // Return public URL
        const url = `/${uploadDir}/${filename}`

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
