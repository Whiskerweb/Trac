'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, X, Paperclip, Mic, MicOff, Send, CheckCircle, Loader2 } from 'lucide-react'

interface FeedbackWidgetProps {
    userType: 'STARTUP' | 'SELLER'
}

export default function FeedbackWidget({ userType }: FeedbackWidgetProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [message, setMessage] = useState('')
    const [attachments, setAttachments] = useState<File[]>([])
    const [isRecording, setIsRecording] = useState(false)
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fileInputRef = useRef<HTMLInputElement>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<Blob[]>([])
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
        }
    }, [message])

    // Reset form after success
    useEffect(() => {
        if (isSuccess) {
            const timer = setTimeout(() => {
                setIsSuccess(false)
                setIsOpen(false)
                setMessage('')
                setAttachments([])
                setAudioBlob(null)
            }, 2000)
            return () => clearTimeout(timer)
        }
    }, [isSuccess])

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files)
            setAttachments(prev => [...prev, ...newFiles].slice(0, 5)) // Max 5 files
        }
    }

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index))
    }

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const mediaRecorder = new MediaRecorder(stream)
            mediaRecorderRef.current = mediaRecorder
            audioChunksRef.current = []

            mediaRecorder.ondataavailable = (e) => {
                audioChunksRef.current.push(e.data)
            }

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
                setAudioBlob(audioBlob)
                stream.getTracks().forEach(track => track.stop())
            }

            mediaRecorder.start()
            setIsRecording(true)
        } catch (err) {
            console.error('Failed to start recording:', err)
            setError('Microphone access denied')
        }
    }

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop()
            setIsRecording(false)
        }
    }

    const removeAudio = () => {
        setAudioBlob(null)
    }

    const handleSubmit = async () => {
        if (!message.trim() && attachments.length === 0 && !audioBlob) {
            setError('Please add a message, attachment, or voice recording')
            return
        }

        setIsSubmitting(true)
        setError(null)

        try {
            const formData = new FormData()
            formData.append('message', message)
            formData.append('userType', userType)
            formData.append('pageUrl', window.location.href)
            formData.append('userAgent', navigator.userAgent)

            // Add attachments
            attachments.forEach((file, index) => {
                formData.append(`attachment_${index}`, file)
            })

            // Add audio
            if (audioBlob) {
                formData.append('audio', audioBlob, 'recording.webm')
            }

            const response = await fetch('/api/feedback', {
                method: 'POST',
                body: formData,
            })

            const data = await response.json()

            if (!response.ok) {
                console.error('Server error:', data)
                throw new Error(data.details || data.error || 'Failed to submit feedback')
            }

            setIsSuccess(true)
        } catch (err) {
            console.error('Failed to submit feedback:', err)
            setError(err instanceof Error ? err.message : 'Failed to submit feedback. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <>
            {/* Floating button */}
            <motion.button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-neutral-900 text-white rounded-full shadow-lg hover:bg-neutral-800 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
            >
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm font-medium">Feedback</span>
            </motion.button>

            {/* Modal */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !isSubmitting && setIsOpen(false)}
                            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
                        />

                        {/* Modal content */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                            className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] bg-white rounded-2xl shadow-2xl overflow-hidden"
                        >
                            {/* Success state */}
                            {isSuccess ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="p-8 flex flex-col items-center justify-center text-center"
                                >
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', bounce: 0.5 }}
                                    >
                                        <CheckCircle className="w-12 h-12 text-emerald-500 mb-4" />
                                    </motion.div>
                                    <h3 className="text-lg font-semibold text-neutral-900 mb-1">Thank you!</h3>
                                    <p className="text-sm text-neutral-500">Your feedback helps us improve.</p>
                                </motion.div>
                            ) : (
                                <>
                                    {/* Header */}
                                    <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
                                        <div>
                                            <h3 className="text-base font-semibold text-neutral-900">Send Feedback</h3>
                                            <p className="text-xs text-neutral-500 mt-0.5">Help us improve Traaaction</p>
                                        </div>
                                        <button
                                            onClick={() => setIsOpen(false)}
                                            disabled={isSubmitting}
                                            className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            <X className="w-4 h-4 text-neutral-400" />
                                        </button>
                                    </div>

                                    {/* Body */}
                                    <div className="p-5">
                                        {/* Text input */}
                                        <textarea
                                            ref={textareaRef}
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            placeholder="What's on your mind? Bug reports, feature requests, or general feedback..."
                                            className="w-full resize-none border-0 focus:ring-0 text-sm text-neutral-900 placeholder:text-neutral-400 min-h-[100px] max-h-[200px]"
                                            disabled={isSubmitting}
                                        />

                                        {/* Attachments preview */}
                                        {attachments.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-neutral-100">
                                                {attachments.map((file, index) => (
                                                    <div
                                                        key={index}
                                                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-neutral-100 rounded-lg text-xs"
                                                    >
                                                        <Paperclip className="w-3 h-3 text-neutral-500" />
                                                        <span className="text-neutral-700 max-w-[120px] truncate">
                                                            {file.name}
                                                        </span>
                                                        <button
                                                            onClick={() => removeAttachment(index)}
                                                            className="ml-1 text-neutral-400 hover:text-neutral-600"
                                                            disabled={isSubmitting}
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Audio preview */}
                                        {audioBlob && (
                                            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-neutral-100">
                                                <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 rounded-lg flex-1">
                                                    <Mic className="w-4 h-4 text-violet-600" />
                                                    <span className="text-xs text-violet-700 font-medium">Voice recording attached</span>
                                                </div>
                                                <button
                                                    onClick={removeAudio}
                                                    className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg"
                                                    disabled={isSubmitting}
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}

                                        {/* Recording indicator */}
                                        {isRecording && (
                                            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-neutral-100">
                                                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg flex-1">
                                                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                                    <span className="text-xs text-red-700 font-medium">Recording...</span>
                                                </div>
                                                <button
                                                    onClick={stopRecording}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                                >
                                                    <MicOff className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}

                                        {/* Error message */}
                                        {error && (
                                            <p className="text-xs text-red-500 mt-3">{error}</p>
                                        )}
                                    </div>

                                    {/* Footer */}
                                    <div className="flex items-center justify-between px-5 py-4 border-t border-neutral-100 bg-neutral-50/50">
                                        <div className="flex items-center gap-1">
                                            {/* File attachment */}
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                multiple
                                                accept="image/*,.pdf,.doc,.docx,.txt"
                                                onChange={handleFileSelect}
                                                className="hidden"
                                            />
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={isSubmitting || attachments.length >= 5}
                                                className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors disabled:opacity-50"
                                                title="Attach files (max 5)"
                                            >
                                                <Paperclip className="w-4 h-4" />
                                            </button>

                                            {/* Voice recording */}
                                            {!audioBlob && !isRecording && (
                                                <button
                                                    onClick={startRecording}
                                                    disabled={isSubmitting}
                                                    className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors disabled:opacity-50"
                                                    title="Record voice message"
                                                >
                                                    <Mic className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>

                                        {/* Submit button */}
                                        <button
                                            onClick={handleSubmit}
                                            disabled={isSubmitting || (!message.trim() && attachments.length === 0 && !audioBlob)}
                                            className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    <span>Sending...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="w-4 h-4" />
                                                    <span>Send</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    )
}
