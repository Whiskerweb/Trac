'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ArrowLeft, Loader2, Upload, Link2, Globe, HelpCircle, Building2 } from 'lucide-react'
import Link from 'next/link'

// =============================================
// TYPES
// =============================================

type WizardStep = 1 | 2 | 3

interface WizardData {
    // Step 1: Getting Started
    companyName: string
    logoUrl: string
    targetUrl: string
    domainType: 'free' | 'custom'

    // Step 2: Configure Rewards
    rewardType: 'SALE' | 'LEAD'
    commissionStructure: 'ONE_OFF' | 'RECURRING'
    recurringDuration: number
    rewardStructure: 'FLAT' | 'PERCENTAGE'
    rewardAmount: number

    // Step 3: Help & Support
    contactEmail: string
    helpCenterUrl: string
}

const STEPS = [
    { id: 1, title: 'Getting started', icon: Building2 },
    { id: 2, title: 'Configure rewards', icon: null },
    { id: 3, title: 'Help and Support', icon: HelpCircle },
] as const

// =============================================
// WIZARD SIDEBAR
// =============================================

function WizardSidebar({ currentStep, completedSteps }: {
    currentStep: WizardStep
    completedSteps: number[]
}) {
    return (
        <div className="w-56 bg-white border-r border-gray-100 p-6 flex flex-col gap-1">
            {STEPS.map((step) => {
                const isCompleted = completedSteps.includes(step.id)
                const isActive = currentStep === step.id
                const isFuture = step.id > currentStep && !isCompleted

                return (
                    <div
                        key={step.id}
                        className={`
                            flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                            ${isActive ? 'bg-blue-50 text-blue-600' : ''}
                            ${isCompleted && !isActive ? 'text-gray-900' : ''}
                            ${isFuture ? 'text-gray-400' : ''}
                        `}
                    >
                        {isCompleted ? (
                            <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                            </div>
                        ) : (
                            <div className={`
                                w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold
                                ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}
                            `}>
                                {step.id}
                            </div>
                        )}
                        <span>{step.title}</span>
                    </div>
                )
            })}
        </div>
    )
}

// =============================================
// STEP 1: GETTING STARTED
// =============================================

function Step1GettingStarted({
    data,
    onChange
}: {
    data: WizardData
    onChange: (updates: Partial<WizardData>) => void
}) {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900 mb-1">Getting started</h1>
                <p className="text-gray-500">Configure your partner program basics.</p>
            </div>

            {/* Company Name */}
            <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Company name</label>
                <p className="text-sm text-gray-500 mb-2">The name of your company</p>
                <input
                    type="text"
                    value={data.companyName}
                    onChange={(e) => onChange({ companyName: e.target.value })}
                    placeholder="Acme"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>

            {/* Logo */}
            <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Logo</label>
                <p className="text-sm text-gray-500 mb-2">A square logo that will be used in various parts of your program</p>
                <div className="w-full h-32 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center cursor-pointer hover:border-gray-300 transition-colors">
                    {data.logoUrl ? (
                        <img src={data.logoUrl} alt="Logo" className="w-20 h-20 object-contain" />
                    ) : (
                        <div className="text-center">
                            <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                            <span className="text-sm text-gray-400">Click to upload or paste URL</span>
                        </div>
                    )}
                </div>
                <input
                    type="text"
                    value={data.logoUrl}
                    onChange={(e) => onChange({ logoUrl: e.target.value })}
                    placeholder="https://example.com/logo.png"
                    className="w-full mt-2 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Referral Link Domain */}
            <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Referral link</label>
                <p className="text-sm text-gray-500 mb-3">Set the custom domain and destination URL for your referral links</p>

                <p className="text-sm font-medium text-gray-700 mb-2">Program domain</p>
                <div className="space-y-2">
                    {/* Free domain option */}
                    <label className={`
                        flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-all
                        ${data.domainType === 'free' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
                    `}>
                        <input
                            type="radio"
                            name="domainType"
                            value="free"
                            checked={data.domainType === 'free'}
                            onChange={() => onChange({ domainType: 'free' })}
                            className="sr-only"
                        />
                        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-xl">
                            👑
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">Claim a free .link domain</span>
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">No setup</span>
                            </div>
                            <p className="text-sm text-gray-500">Free for one year with your paid account.</p>
                        </div>
                    </label>

                    {/* Custom domain option */}
                    <label className={`
                        flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-all
                        ${data.domainType === 'custom' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
                    `}>
                        <input
                            type="radio"
                            name="domainType"
                            value="custom"
                            checked={data.domainType === 'custom'}
                            onChange={() => onChange({ domainType: 'custom' })}
                            className="sr-only"
                        />
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Link2 className="w-5 h-5 text-gray-600" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">Connect a domain you own</span>
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">DNS setup required</span>
                            </div>
                            <p className="text-sm text-gray-500">Dedicate a domain exclusively for your short links and program.</p>
                        </div>
                    </label>
                </div>
                <p className="text-xs text-gray-400 mt-2">This domain will be used for your program's referral links.</p>
            </div>

            {/* Website URL */}
            <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Website URL</label>
                <input
                    type="url"
                    value={data.targetUrl}
                    onChange={(e) => onChange({ targetUrl: e.target.value })}
                    placeholder="https://yoursite.com"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">Where people will be redirected to when they click on your partners' referral links</p>
            </div>
        </div>
    )
}

// =============================================
// STEP 2: CONFIGURE REWARDS
// =============================================

function Step2ConfigureRewards({
    data,
    onChange
}: {
    data: WizardData
    onChange: (updates: Partial<WizardData>) => void
}) {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900 mb-1">Configure rewards</h1>
                <p className="text-gray-500">Set how your affiliates will be rewarded.</p>
            </div>

            {/* Reward Type */}
            <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Reward type</label>
                <p className="text-sm text-gray-500 mb-3">Set the default reward type for all your affiliates</p>

                <div className="grid grid-cols-2 gap-3">
                    {/* Sale */}
                    <label className={`
                        relative p-4 border-2 rounded-xl cursor-pointer transition-all
                        ${data.rewardType === 'SALE' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 hover:border-gray-300'}
                    `}>
                        <input
                            type="radio"
                            name="rewardType"
                            value="SALE"
                            checked={data.rewardType === 'SALE'}
                            onChange={() => onChange({ rewardType: 'SALE' })}
                            className="sr-only"
                        />
                        {data.rewardType === 'SALE' && (
                            <div className="absolute top-3 right-3 w-5 h-5 bg-white rounded-full flex items-center justify-center">
                                <Check className="w-3 h-3 text-gray-900" />
                            </div>
                        )}
                        <div className="font-semibold mb-1">Sale</div>
                        <div className={`text-sm ${data.rewardType === 'SALE' ? 'text-gray-300' : 'text-gray-500'}`}>
                            For sales and subscriptions
                        </div>
                    </label>

                    {/* Lead */}
                    <label className={`
                        relative p-4 border-2 rounded-xl cursor-pointer transition-all
                        ${data.rewardType === 'LEAD' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 hover:border-gray-300'}
                    `}>
                        <input
                            type="radio"
                            name="rewardType"
                            value="LEAD"
                            checked={data.rewardType === 'LEAD'}
                            onChange={() => onChange({ rewardType: 'LEAD' })}
                            className="sr-only"
                        />
                        {data.rewardType === 'LEAD' && (
                            <div className="absolute top-3 right-3 w-5 h-5 bg-white rounded-full flex items-center justify-center">
                                <Check className="w-3 h-3 text-gray-900" />
                            </div>
                        )}
                        <div className="font-semibold mb-1">Lead</div>
                        <div className={`text-sm ${data.rewardType === 'LEAD' ? 'text-gray-300' : 'text-gray-500'}`}>
                            For sign ups and leads
                        </div>
                    </label>
                </div>
            </div>

            {/* Commission Structure - Only for SALE */}
            {data.rewardType === 'SALE' && (
                <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Commission structure</label>
                    <p className="text-sm text-gray-500 mb-3">Set how the affiliate will get rewarded</p>

                    <div className="grid grid-cols-2 gap-3">
                        {/* One-off */}
                        <label className={`
                            relative p-4 border-2 rounded-xl cursor-pointer transition-all
                            ${data.commissionStructure === 'ONE_OFF' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 hover:border-gray-300'}
                        `}>
                            <input
                                type="radio"
                                name="commissionStructure"
                                value="ONE_OFF"
                                checked={data.commissionStructure === 'ONE_OFF'}
                                onChange={() => onChange({ commissionStructure: 'ONE_OFF' })}
                                className="sr-only"
                            />
                            {data.commissionStructure === 'ONE_OFF' && (
                                <div className="absolute top-3 right-3 w-5 h-5 bg-white rounded-full flex items-center justify-center">
                                    <Check className="w-3 h-3 text-gray-900" />
                                </div>
                            )}
                            <div className="font-semibold mb-1">One-off</div>
                            <div className={`text-sm ${data.commissionStructure === 'ONE_OFF' ? 'text-gray-300' : 'text-gray-500'}`}>
                                Pay a one-time payout
                            </div>
                        </label>

                        {/* Recurring */}
                        <label className={`
                            relative p-4 border-2 rounded-xl cursor-pointer transition-all
                            ${data.commissionStructure === 'RECURRING' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 hover:border-gray-300'}
                        `}>
                            <input
                                type="radio"
                                name="commissionStructure"
                                value="RECURRING"
                                checked={data.commissionStructure === 'RECURRING'}
                                onChange={() => onChange({ commissionStructure: 'RECURRING' })}
                                className="sr-only"
                            />
                            {data.commissionStructure === 'RECURRING' && (
                                <div className="absolute top-3 right-3 w-5 h-5 bg-white rounded-full flex items-center justify-center">
                                    <Check className="w-3 h-3 text-gray-900" />
                                </div>
                            )}
                            <div className="font-semibold mb-1">Recurring</div>
                            <div className={`text-sm ${data.commissionStructure === 'RECURRING' ? 'text-gray-300' : 'text-gray-500'}`}>
                                Pay an ongoing payout
                            </div>
                        </label>
                    </div>
                </div>
            )}

            {/* Recurring Duration - Only if RECURRING */}
            {data.rewardType === 'SALE' && data.commissionStructure === 'RECURRING' && (
                <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Commission duration</label>
                    <p className="text-sm text-gray-500 mb-3">How long will the affiliate receive commissions</p>
                    <select
                        value={data.recurringDuration}
                        onChange={(e) => onChange({ recurringDuration: parseInt(e.target.value) })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                        <option value={3}>3 months</option>
                        <option value={6}>6 months</option>
                        <option value={12}>12 months</option>
                        <option value={24}>24 months</option>
                        <option value={36}>36 months</option>
                        <option value={48}>48 months (Lifetime)</option>
                    </select>
                </div>
            )}

            {/* Reward Amount */}
            <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Reward amount</label>
                <p className="text-sm text-gray-500 mb-3">Set how much the affiliate will get rewarded</p>

                {/* Reward Structure */}
                <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Reward structure</label>
                    <select
                        value={data.rewardStructure}
                        onChange={(e) => onChange({ rewardStructure: e.target.value as 'FLAT' | 'PERCENTAGE' })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                        <option value="FLAT">Flat</option>
                        <option value="PERCENTAGE">Percentage</option>
                    </select>
                </div>

                {/* Amount Input */}
                <div className="relative">
                    {data.rewardStructure === 'FLAT' && (
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                    )}
                    <input
                        type="number"
                        value={data.rewardAmount || ''}
                        onChange={(e) => onChange({ rewardAmount: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                        className={`
                            w-full py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500
                            ${data.rewardStructure === 'FLAT' ? 'pl-8 pr-16' : 'pl-4 pr-16'}
                        `}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                        {data.rewardStructure === 'PERCENTAGE' ? '%' : 'EUR'}
                    </span>
                </div>
            </div>
        </div>
    )
}

// =============================================
// STEP 3: HELP & SUPPORT
// =============================================

function Step3HelpSupport({
    data,
    onChange
}: {
    data: WizardData
    onChange: (updates: Partial<WizardData>) => void
}) {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900 mb-1">Help & Support Resources</h1>
                <p className="text-gray-500">Provide resources and contact info for your partners.</p>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Contact Email</label>
                    <input
                        type="email"
                        value={data.contactEmail}
                        onChange={(e) => onChange({ contactEmail: e.target.value })}
                        placeholder="partners@yourcompany.com"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Help Center URL</label>
                    <input
                        type="url"
                        value={data.helpCenterUrl}
                        onChange={(e) => onChange({ helpCenterUrl: e.target.value })}
                        placeholder="https://help.yourcompany.com"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* Partner Assets - Simplified for now */}
            <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Partner Resources & Assets</label>
                <p className="text-sm text-gray-500 mb-3">Add links to resources that will help your partners succeed</p>

                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
                    <Globe className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 mb-2">Assets can be added after creating the program</p>
                    <p className="text-sm text-gray-400">You'll be able to add pitch decks, brand kits, and more.</p>
                </div>
            </div>
        </div>
    )
}

// =============================================
// MAIN WIZARD PAGE
// =============================================

export default function CreateMissionWizard() {
    const router = useRouter()
    const [step, setStep] = useState<WizardStep>(1)
    const [completedSteps, setCompletedSteps] = useState<number[]>([])
    const [loading, setLoading] = useState(false)

    const [data, setData] = useState<WizardData>({
        // Step 1
        companyName: '',
        logoUrl: '',
        targetUrl: '',
        domainType: 'free',
        // Step 2
        rewardType: 'SALE',
        commissionStructure: 'ONE_OFF',
        recurringDuration: 12,
        rewardStructure: 'FLAT',
        rewardAmount: 0,
        // Step 3
        contactEmail: '',
        helpCenterUrl: '',
    })

    const updateData = (updates: Partial<WizardData>) => {
        setData(prev => ({ ...prev, ...updates }))
    }

    const handleContinue = () => {
        if (step < 3) {
            setCompletedSteps(prev => [...prev, step])
            setStep((step + 1) as WizardStep)
        }
    }

    const handleBack = () => {
        if (step > 1) {
            setStep((step - 1) as WizardStep)
        }
    }

    const handleFinish = async () => {
        setLoading(true)
        try {
            // Import and call the server action
            const { createMissionFromWizard } = await import('@/app/actions/missions')
            const result = await createMissionFromWizard(data)

            if (result.success) {
                router.push('/dashboard/missions')
            } else {
                alert(result.error || 'Failed to create mission')
            }
        } catch (error) {
            console.error('Failed to create mission:', error)
            alert('An unexpected error occurred')
        } finally {
            setLoading(false)
        }
    }

    // Validation for Continue button
    const canContinue = () => {
        if (step === 1) {
            return data.companyName.trim() !== '' && data.targetUrl.trim() !== ''
        }
        if (step === 2) {
            return data.rewardAmount > 0
        }
        return true
    }

    return (
        <div className="min-h-screen bg-white flex">
            {/* Sidebar */}
            <WizardSidebar currentStep={step} completedSteps={completedSteps} />

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="h-16 border-b border-gray-100 flex items-center justify-between px-6">
                    <Link href="/dashboard/missions" className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm font-medium">Cancel</span>
                    </Link>
                    <button className="text-sm font-medium text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                        Save and exit
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto">
                    <div className="max-w-xl mx-auto py-12 px-6">
                        {step === 1 && <Step1GettingStarted data={data} onChange={updateData} />}
                        {step === 2 && <Step2ConfigureRewards data={data} onChange={updateData} />}
                        {step === 3 && <Step3HelpSupport data={data} onChange={updateData} />}
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-100 p-6">
                    <div className="max-w-xl mx-auto flex gap-3">
                        {step > 1 && (
                            <button
                                onClick={handleBack}
                                className="px-6 py-3 text-gray-600 font-medium rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                Back
                            </button>
                        )}

                        {step < 3 ? (
                            <button
                                onClick={handleContinue}
                                disabled={!canContinue()}
                                className={`
                                    flex-1 py-3 font-medium rounded-lg transition-colors flex items-center justify-center gap-2
                                    ${canContinue()
                                        ? 'bg-gray-900 text-white hover:bg-black'
                                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    }
                                `}
                            >
                                Continue
                            </button>
                        ) : (
                            <button
                                onClick={handleFinish}
                                disabled={loading}
                                className="flex-1 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-black transition-colors flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    'Finish & Launch Program'
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
