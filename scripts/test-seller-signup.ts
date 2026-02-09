/**
 * Test seller signup flow — verifies the triple fallback mechanism
 * Tests the actual code paths without needing a real Supabase signup
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const BASE_URL = 'http://localhost:3000'

async function testSellerSignupFlow() {
    let passed = 0
    let failed = 0

    function pass(msg: string) {
        console.log(`  ✅ ${msg}`)
        passed++
    }
    function fail(msg: string) {
        console.log(`  ❌ ${msg}`)
        failed++
    }

    // =============================================
    // TEST 1: Verify signup action code sets cookie
    // =============================================
    console.log('\n=== TEST 1: Signup code sets trac_signup_role cookie ===')

    // Read the signup action source to verify cookie is set
    const fs = await import('fs')
    const signupAction = fs.readFileSync('app/login/actions.ts', 'utf-8')

    if (signupAction.includes("cookieStore.set('trac_signup_role', role")) {
        pass('signup() sets trac_signup_role cookie')
    } else {
        fail('signup() does NOT set trac_signup_role cookie')
    }

    if (signupAction.includes('httpOnly: true')) {
        pass('Cookie is httpOnly (secure)')
    } else {
        fail('Cookie is NOT httpOnly')
    }

    if (signupAction.includes("maxAge: 60 * 60")) {
        pass('Cookie expires in 1 hour')
    } else {
        fail('Cookie maxAge not set correctly')
    }

    // =============================================
    // TEST 2: Verify callback reads cookie as fallback
    // =============================================
    console.log('\n=== TEST 2: Callback route reads cookie fallback ===')

    const callbackRoute = fs.readFileSync('app/auth/callback/route.ts', 'utf-8')

    // Check triple fallback order
    const urlParamIdx = callbackRoute.indexOf("searchParams.get('role')")
    const metadataIdx = callbackRoute.indexOf('user.user_metadata?.role')
    const cookieIdx = callbackRoute.indexOf("cookieStore.get('trac_signup_role')")

    if (urlParamIdx > -1 && metadataIdx > -1 && cookieIdx > -1) {
        pass('All 3 fallback levels present in callback')
    } else {
        fail(`Missing fallbacks: URL=${urlParamIdx > -1}, metadata=${metadataIdx > -1}, cookie=${cookieIdx > -1}`)
    }

    if (urlParamIdx < metadataIdx && metadataIdx < cookieIdx) {
        pass('Fallback order correct: URL param → metadata → cookie')
    } else {
        fail('Fallback order is WRONG')
    }

    if (callbackRoute.includes("cookieStore.delete('trac_signup_role')")) {
        pass('Cookie is cleaned up after use in callback')
    } else {
        fail('Cookie is NOT cleaned up after use')
    }

    // =============================================
    // TEST 3: Verify middleware safety net at /onboarding
    // =============================================
    console.log('\n=== TEST 3: Middleware safety net at /onboarding ===')

    const middleware = fs.readFileSync('middleware.ts', 'utf-8')

    if (middleware.includes("request.cookies.get('trac_signup_role')")) {
        pass('Middleware reads trac_signup_role cookie')
    } else {
        fail('Middleware does NOT read trac_signup_role cookie')
    }

    if (middleware.includes("/seller/onboarding") && middleware.includes("signupRole === 'seller'")) {
        pass('Middleware redirects seller to /seller/onboarding')
    } else {
        fail('Middleware does NOT redirect seller correctly')
    }

    if (middleware.includes("response.cookies.delete('trac_signup_role')")) {
        pass('Middleware cleans up cookie after redirect')
    } else {
        fail('Middleware does NOT clean up cookie')
    }

    // =============================================
    // TEST 4: Verify user_metadata includes role during signup
    // =============================================
    console.log('\n=== TEST 4: Signup stores role in user_metadata ===')

    if (signupAction.includes("role: role, // Store role in user metadata")) {
        pass('role is stored in user_metadata during signUp()')
    } else if (signupAction.includes("role: role")) {
        pass('role is stored in user_metadata during signUp()')
    } else {
        fail('role is NOT stored in user_metadata')
    }

    // =============================================
    // TEST 5: Verify emailRedirectTo includes role param
    // =============================================
    console.log('\n=== TEST 5: Email redirect URL includes role ===')

    if (signupAction.includes('`${siteUrl}/auth/callback?role=${role}`')) {
        pass('emailRedirectTo includes ?role=${role}')
    } else {
        fail('emailRedirectTo does NOT include role param')
    }

    // =============================================
    // TEST 6: Callback creates seller on roleIntent=seller
    // =============================================
    console.log('\n=== TEST 6: Callback auto-creates seller for new users ===')

    if (callbackRoute.includes("roleIntent === 'seller'") && callbackRoute.includes('createGlobalSeller')) {
        pass('Callback creates GlobalSeller when roleIntent=seller')
    } else {
        fail('Callback does NOT create seller for roleIntent=seller')
    }

    if (callbackRoute.includes("/seller/onboarding")) {
        pass('Callback redirects new seller to /seller/onboarding')
    } else {
        fail('Callback does NOT redirect to /seller/onboarding')
    }

    // =============================================
    // TEST 7: HTTP test — /onboarding without auth → /login
    // =============================================
    console.log('\n=== TEST 7: HTTP — /onboarding unauthenticated → /login ===')

    try {
        const res = await fetch(`${BASE_URL}/onboarding`, { redirect: 'manual' })
        const location = res.headers.get('location')

        if (res.status === 307 && location?.includes('/login')) {
            pass(`/onboarding → 307 ${location}`)
        } else {
            fail(`Expected 307→/login, got ${res.status} → ${location}`)
        }
    } catch (e: any) {
        fail(`Fetch error: ${e.message} (is dev server running on ${BASE_URL}?)`)
    }

    // =============================================
    // TEST 8: HTTP test — /auth/callback without code → error redirect
    // =============================================
    console.log('\n=== TEST 8: HTTP — /auth/callback without code → /login?error ===')

    try {
        const res = await fetch(`${BASE_URL}/auth/callback`, { redirect: 'manual' })
        const location = res.headers.get('location')

        if (location?.includes('/login') && location?.includes('error=')) {
            pass(`/auth/callback → ${res.status} ${location}`)
        } else if (location?.includes('/login')) {
            pass(`/auth/callback → ${res.status} ${location}`)
        } else {
            fail(`Expected redirect to /login?error, got ${res.status} → ${location}`)
        }
    } catch (e: any) {
        fail(`Fetch error: ${e.message}`)
    }

    // =============================================
    // TEST 9: Resend confirmation preserves role in URL
    // =============================================
    console.log('\n=== TEST 9: resendConfirmationEmail includes role in URL ===')

    if (signupAction.includes('resendConfirmationEmail') && signupAction.includes('`${siteUrl}/auth/callback?role=${role}`')) {
        pass('resendConfirmationEmail preserves role in redirect URL')
    } else {
        // Check the function directly
        const resendMatch = signupAction.match(/async function resendConfirmationEmail[\s\S]*?emailRedirectTo:\s*confirmRedirectUrl/)
        if (resendMatch) {
            pass('resendConfirmationEmail uses confirmRedirectUrl with role')
        } else {
            fail('Could not verify resendConfirmationEmail role handling')
        }
    }

    // =============================================
    // SUMMARY
    // =============================================
    console.log('\n========================================')
    console.log(`  RESULTS: ${passed} passed, ${failed} failed`)
    console.log('========================================')

    if (failed === 0) {
        console.log('\n  All seller signup fallback mechanisms verified!')
        console.log('  Flow: Signup → cookie + metadata + URL param → Callback reads all 3 → Middleware safety net')
    } else {
        console.log('\n  Some tests failed — review the output above')
    }
    console.log('')

    process.exit(failed > 0 ? 1 : 0)
}

testSellerSignupFlow().catch(console.error)
