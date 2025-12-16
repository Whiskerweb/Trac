import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { createToken, setAuthCookie } from '@/lib/auth'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { email, password, name, role } = body

        // Validation
        if (!email || !password || !name || !role) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            )
        }

        if (!['STARTUP', 'AFFILIATE'].includes(role)) {
            return NextResponse.json(
                { success: false, error: 'Invalid role. Must be STARTUP or AFFILIATE' },
                { status: 400 }
            )
        }

        if (password.length < 8) {
            return NextResponse.json(
                { success: false, error: 'Password must be at least 8 characters' },
                { status: 400 }
            )
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        })

        if (existingUser) {
            return NextResponse.json(
                { success: false, error: 'Email already registered' },
                { status: 409 }
            )
        }

        // Hash password
        const password_hash = await bcrypt.hash(password, 10)

        // Create user
        const user = await prisma.user.create({
            data: {
                email: email.toLowerCase(),
                password_hash,
                name,
                role,
            },
        })

        // Create JWT token
        const token = await createToken({
            userId: user.id,
            email: user.email,
            role: user.role as 'STARTUP' | 'AFFILIATE',
        })

        // Set cookie
        await setAuthCookie(token)

        console.log('✅ User registered:', user.email, 'Role:', user.role)

        return NextResponse.json(
            {
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                },
            },
            { status: 201 }
        )
    } catch (error) {
        console.error('Error registering user:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}
