"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus, ArrowRight } from "lucide-react";

const faqs = [
    {
        question: "What is traaaction.com?",
        answer: "Traaaction.com is the ultimate platform for startups looking to scale their sales and for sales talents who want to monetize their network and skills. We connect innovative companies with an agile and motivated sales force."
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
        <section className="bg-slate-50 py-24 border-t border-slate-200">
            <div className="container mx-auto px-4 max-w-5xl">
                <div className="flex flex-col md:flex-row gap-12 md:gap-24 items-start">

                    {/* Left Column: Title & CTA */}
                    <div className="md:w-1/3 sticky top-24">
                        <h2 className="text-3xl md:text-5xl font-bold text-slate-900 tracking-tight leading-tight mb-6">
                            Still have questions? <br />
                            <span className="text-slate-400">We have answers</span>
                        </h2>
                        <p className="text-lg text-slate-500 font-medium mb-2">
                            Didn't find what you were looking for?
                        </p>
                        <a href="#" className="inline-flex items-center gap-1 text-lg font-bold text-violet-600 hover:text-violet-700 hover:gap-2 transition-all">
                            Book a demo <ArrowRight className="w-5 h-5" />
                        </a>
                    </div>

                    {/* Right Column: Accordion */}
                    <div className="md:w-2/3 w-full flex flex-col gap-4">
                        {faqs.map((faq, index) => (
                            <FAQItem
                                key={index}
                                faq={faq}
                                isOpen={openIndex === index}
                                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                            />
                        ))}
                    </div>

                </div>
            </div>
        </section>
    );
};

const FAQItem = ({ faq, isOpen, onClick }: { faq: any, isOpen: boolean, onClick: () => void }) => {
    return (
        <div
            onClick={onClick}
            className={`bg-white rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden ${isOpen ? 'border-slate-200 shadow-lg' : 'border-transparent shadow-sm hover:shadow-md'}`}
        >
            <div className="p-6 md:p-8 flex items-center justify-between gap-6">
                <h3 className="text-lg md:text-xl font-bold text-slate-900 leading-snug select-none">
                    {faq.question}
                </h3>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${isOpen ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                        <div className="px-6 md:px-8 pb-8 text-base md:text-lg text-slate-500 leading-relaxed">
                            {faq.answer}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
