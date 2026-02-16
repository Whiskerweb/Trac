'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, X, Paperclip, Mic, MicOff, Send, CheckCircle, Loader2 } from 'lucide-react'

interface FeedbackWidgetProps {
    userType: 'STARTUP' | 'SELLER'
}

const DRAG_THRESHOLD = 5
const STORAGE_KEY = 'trac_feedback_pos'
const DRAG_MARGIN = 8 // margin during drag movement (keeps button slightly in-bounds)

export default function FeedbackWidget({ userType }: FeedbackWidgetProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [message, setMessage] = useState('')
    const [attachments, setAttachments] = useState<File[]>([])
    const [isRecording, setIsRecording] = useState(false)
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Drag state
    const [position, setPosition] = useState<{ x: number; y: number }>({ x: -1, y: -1 })
    const [isDragging, setIsDragging] = useState(false)
    const [isDocked, setIsDocked] = useState(false)
    const [dockSide, setDockSide] = useState<'left' | 'right'>('right')
    const [isHoveredWhileDocked, setIsHoveredWhileDocked] = useState(false)

    const fileInputRef = useRef<HTMLInputElement>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<Blob[]>([])
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)
    const dragStartRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null)
    const hasDraggedRef = useRef(false)

    // Restore position from localStorage
    useEffect(() => {
        const defaultPos = () => {
            // Default: docked bottom-right, flush with edge
            const btnWidth = 44
            setPosition({ x: window.innerWidth - btnWidth, y: window.innerHeight - 48 - 24 })
            setDockSide('right')
            setIsDocked(true)
        }
        try {
            const saved = localStorage.getItem(STORAGE_KEY)
            if (saved) {
                const { y, side } = JSON.parse(saved) as { y: number; side: 'left' | 'right' }
                const btnWidth = 44 // docked button width approximation
                const xPos = side === 'left' ? 0 : window.innerWidth - btnWidth
                setPosition({ x: xPos, y: Math.min(y, window.innerHeight - 48) })
                setDockSide(side)
                setIsDocked(true)
            } else {
                defaultPos()
            }
        } catch {
            defaultPos()
        }
    }, [])

    // Handle window resize — keep button flush with docked edge
    useEffect(() => {
        const handleResize = () => {
            setPosition(prev => {
                if (prev.x < 0) return prev
                const btnWidth = buttonRef.current?.offsetWidth ?? 44
                const btnHeight = buttonRef.current?.offsetHeight ?? 48
                const newX = dockSide === 'left' ? 0 : window.innerWidth - btnWidth
                return {
                    x: newX,
                    y: Math.max(0, Math.min(prev.y, window.innerHeight - btnHeight)),
                }
            })
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [dockSide])

    // Pointer event handlers for drag
    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
        if (isOpen) return
        dragStartRef.current = { x: e.clientX, y: e.clientY, px: position.x, py: position.y }
        hasDraggedRef.current = false
        buttonRef.current?.setPointerCapture(e.pointerId)
    }, [isOpen, position.x, position.y])

    const handlePointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
        if (!dragStartRef.current) return

        const dx = e.clientX - dragStartRef.current.x
        const dy = e.clientY - dragStartRef.current.y

        // Check drag threshold
        if (!hasDraggedRef.current && Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) {
            return
        }

        if (!hasDraggedRef.current) {
            hasDraggedRef.current = true
            setIsDragging(true)
            setIsDocked(false)
            setIsHoveredWhileDocked(false)
        }

        const btnWidth = buttonRef.current?.offsetWidth ?? 150
        const btnHeight = buttonRef.current?.offsetHeight ?? 48
        const newX = Math.max(DRAG_MARGIN, Math.min(dragStartRef.current.px + dx, window.innerWidth - btnWidth - DRAG_MARGIN))
        const newY = Math.max(DRAG_MARGIN, Math.min(dragStartRef.current.py + dy, window.innerHeight - btnHeight - DRAG_MARGIN))

        setPosition({ x: newX, y: newY })
    }, [])

    const handlePointerUp = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
        if (!dragStartRef.current) return

        const wasDrag = hasDraggedRef.current
        dragStartRef.current = null

        if (!wasDrag) {
            // It was a click, not a drag
            setIsDragging(false)
            setIsOpen(true)
            return
        }

        // Snap flush to nearest edge — always dock
        const btnWidth = buttonRef.current?.offsetWidth ?? 150
        const btnHeight = buttonRef.current?.offsetHeight ?? 48
        const screenW = window.innerWidth
        const midX = position.x + btnWidth / 2

        const side: 'left' | 'right' = midX < screenW / 2 ? 'left' : 'right'
        const snappedX = side === 'left' ? 0 : screenW - btnWidth
        const clampedY = Math.max(0, Math.min(position.y, window.innerHeight - btnHeight))

        setPosition({ x: snappedX, y: clampedY })
        setDockSide(side)
        setIsDocked(true)
        setIsDragging(false)

        // Persist
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ y: clampedY, side }))
        } catch { /* ignore */ }
    }, [position.x, position.y])

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

    // Don't render until position is initialized (SSR-safe)
    const isInitialized = position.x >= 0

    // Docked appearance: show only icon, reduced size
    const showDocked = isDocked && !isHoveredWhileDocked && !isDragging && !isOpen

    return (
        <>
            {/* Floating draggable button */}
            <motion.button
                ref={buttonRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onMouseEnter={() => { if (isDocked) setIsHoveredWhileDocked(true) }}
                onMouseLeave={() => setIsHoveredWhileDocked(false)}
                className={[
                    'fixed z-50 flex items-center gap-2 bg-neutral-900 text-white shadow-lg select-none',
                    isDragging ? 'cursor-grabbing' : 'cursor-grab',
                    showDocked
                        ? dockSide === 'left'
                            ? 'rounded-r-full pl-2 pr-2.5 py-2.5 opacity-60'
                            : 'rounded-l-full pl-2.5 pr-2 py-2.5 opacity-60'
                        : 'rounded-full px-4 py-2.5 opacity-100',
                    !isDragging && 'transition-all duration-300 ease-out',
                    !isInitialized && 'invisible',
                ].filter(Boolean).join(' ')}
                style={{
                    left: isInitialized ? position.x : undefined,
                    top: isInitialized ? position.y : undefined,
                    touchAction: 'none',
                    willChange: isDragging ? 'transform' : 'auto',
                }}
                whileHover={!isDragging ? { scale: 1.02 } : undefined}
                whileTap={!isDragging ? { scale: 0.98 } : undefined}
                initial={{ opacity: 0 }}
                animate={{ opacity: isInitialized ? (showDocked ? 0.6 : 1) : 0 }}
                transition={{ delay: isInitialized ? 0 : 1 }}
            >
                <MessageSquare className={showDocked ? 'w-4 h-4' : 'w-4 h-4'} />
                {!showDocked && <span className="text-sm font-medium whitespace-nowrap">Feedback</span>}
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
