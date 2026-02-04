"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";

const faqs = [
    {
        question: "What is traaaction.com?",
        answer: "Traaaction connects growing startups with salespeople, influencers, and UGC creators. Startups choose who they want to work with, and sellers are paid on commission for every sale they generate. Simple as that."
    },
    {
        question: "Who is traaaction.com for?",
        answer: "We cater to B2B and B2C startups in growth phase needing fast results, as well as independent sellers, students, and business finders wishing to generate extra income or build a career in sales."
    },
    {
        question: "Is traaaction.com free?",
        answer: "Yes, traaaction.com offers no paid features. We are remunerated solely on commission, at a rate of 15% per sale generated."
    },
    {
        question: "Can I use my own domain name?",
        answer: "Absolutely. Credibility is key in sales. You can connect your own domain name so that all your tracking links and sales pages perfectly reflect your brand or personal identity."
    },
    {
        question: "Can I view my link performance?",
        answer: "Yes, our 'Certified Analytics' dashboard offers you a detailed, real-time view of every click, lead, and sale generated. This data is certified and can even serve as proof of skill for your CV."
    },
    {
        question: "How can I contact you if I have a question?",
        answer: "Our support team is available directly via the platform chat or by email. We also have an active community of sellers and founders ready to help and share best practices."
    }
];

export const FAQ = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <section className="relative bg-[#FAFAF9] py-20 md:py-32 overflow-hidden">
            {/* Subtle grain texture overlay */}
            <div
                className="absolute inset-0 opacity-[0.015] pointer-events-none"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                }}
            />

            <div className="relative container mx-auto px-5 md:px-8 max-w-3xl">
                {/* Header Section */}
                <div className="mb-12 md:mb-16 text-center">
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="text-sm font-medium tracking-[0.2em] uppercase text-slate-400 mb-4"
                    >
                        FAQ
                    </motion.p>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="text-[clamp(2rem,5vw,3rem)] font-semibold text-slate-900 tracking-[-0.02em] leading-[1.1]"
                    >
                        Everything you need to know
                    </motion.h2>
                </div>

                {/* FAQ Items */}
                <div className="space-y-0">
                    {faqs.map((faq, index) => (
                        <FAQItem
                            key={index}
                            faq={faq}
                            index={index}
                            isOpen={openIndex === index}
                            onClick={() => setOpenIndex(openIndex === index ? null : index)}
                            totalItems={faqs.length}
                        />
                    ))}
                </div>

                {/* Join Us Button */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="mt-12 md:mt-16 text-center"
                >
                    <a
                        href="https://calendly.com/contact-traaaction/30min"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center h-12 px-8 rounded-lg border border-slate-200 bg-white text-slate-900 font-medium hover:bg-slate-50 transition-colors"
                    >
                        Join us
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </a>
                </motion.div>
            </div>
        </section>
    );
};

const FAQItem = ({
    faq,
    index,
    isOpen,
    onClick,
    totalItems
}: {
    faq: { question: string; answer: string };
    index: number;
    isOpen: boolean;
    onClick: () => void;
    totalItems: number;
}) => {
    const isLast = index === totalItems - 1;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: index * 0.05 }}
            className={`group ${!isLast ? 'border-b border-slate-200/80' : ''}`}
        >
            <button
                onClick={onClick}
                className="w-full py-6 md:py-7 flex items-start justify-between gap-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/20 focus-visible:ring-offset-4 rounded-lg transition-colors"
                aria-expanded={isOpen}
            >
                <h3 className={`text-base md:text-lg font-medium tracking-[-0.01em] transition-colors duration-300 ${
                    isOpen ? 'text-slate-900' : 'text-slate-600 group-hover:text-slate-900'
                }`}>
                    {faq.question}
                </h3>

                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300 ${
                        isOpen
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600'
                    }`}
                >
                    <ChevronDown className="w-4 h-4" />
                </motion.div>
            </button>

            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{
                            height: "auto",
                            opacity: 1,
                            transition: {
                                height: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
                                opacity: { duration: 0.3, delay: 0.1 }
                            }
                        }}
                        exit={{
                            height: 0,
                            opacity: 0,
                            transition: {
                                height: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
                                opacity: { duration: 0.2 }
                            }
                        }}
                        className="overflow-hidden"
                    >
                        <div className="pb-6 md:pb-8 pr-12">
                            <p className="text-[15px] md:text-base text-slate-500 leading-[1.7]">
                                {faq.answer}
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
