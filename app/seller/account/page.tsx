'use client'

export default function AccountPage() {
    return (
        <div className="min-h-screen bg-[#FAFAFA]">
            <div className="max-w-3xl mx-auto px-8 py-10">

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                        Account
                    </h1>
                </div>

                {/* Account Settings */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                    <h2 className="text-base font-semibold mb-1">Account settings</h2>
                    <p className="text-sm text-gray-600 mb-6">
                        Manage your account settings and preferences.
                    </p>

                    <div className="space-y-6">
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Email</label>
                            <input
                                type="email"
                                defaultValue="lucasroncey69@gmail.com"
                                disabled
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Your email address is used for login and notifications
                            </p>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Password</label>
                            <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                                Change password
                            </button>
                        </div>

                        {/* Language */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Language</label>
                            <select className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option>English</option>
                                <option>French</option>
                                <option>Spanish</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-white rounded-lg border border-red-200 p-6">
                    <h2 className="text-base font-semibold text-red-600 mb-1">Danger zone</h2>
                    <p className="text-sm text-gray-600 mb-6">
                        Irreversible actions that affect your account.
                    </p>

                    <button className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors">
                        Delete account
                    </button>
                    <p className="text-xs text-gray-500 mt-2">
                        This will permanently delete your account and all associated data.
                    </p>
                </div>
            </div>
        </div>
    )
}
