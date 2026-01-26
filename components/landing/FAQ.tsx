"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus, ArrowRight } from "lucide-react";

const faqs = [
    {
        question: "C'est quoi traaaction.com ?",
        answer: "Traaaction.com est la plateforme ultime pour les startups qui cherchent à scaler leurs ventes et pour les talents commerciaux qui veulent monétiser leur réseau et leurs compétences. Nous connectons les entreprises innovantes avec une force de vente agile et motivée."
    },
    {
        question: "À qui s'adresse traaaction.com ?",
        answer: "Nous nous adressons aux startups B2B et B2C en phase de croissance qui ont besoin de résultats rapides, ainsi qu'aux vendeurs indépendants, étudiants, et apporteurs d'affaires qui souhaitent générer des revenus complémentaires ou faire carrière dans la vente."
    },
    {
        question: "Est-ce que traaaction.com est gratuit ?",
        answer: "L'inscription est totalement gratuite pour les vendeurs. Pour les startups, nous proposons différents plans adaptés à vos besoins de croissance, avec une tarification transparente basée sur la performance et l'accès aux fonctionnalités premium."
    },
    {
        question: "En quoi traaaction.com est différent de Bitly, Linktree ou Rebrandly ?",
        answer: (
            <div className="space-y-4">
                <p>traaaction.com combine ce que font ces outils, mais en mieux :</p>
                <ul className="list-disc pl-5 space-y-2 text-slate-600">
                    <li>Des deep links qui ouvrent directement les apps (YouTube, Spotify, etc.)</li>
                    <li>Un link in bio ultra design et personnalisable</li>
                    <li>Des QR codes pro, faits pour les marques</li>
                    <li>Un vrai focus sur l'expérience, la conversion, et le branding personnalisé</li>
                </ul>
            </div>
        )
    },
    {
        question: "Est-ce que je peux utiliser mon propre nom de domaine ?",
        answer: "Absolument. La crédibilité est clé dans la vente. Vous pouvez connecter votre propre nom de domaine pour que tous vos liens de tracking et pages de vente reflètent parfaitement votre marque ou votre identité personnelle."
    },
    {
        question: "Puis-je voir les performances de mes liens ?",
        answer: "Oui, notre tableau de bord 'Certified Analytics' vous offre une vue détaillée et temps réel de chaque clic, lead et vente générés. Ces données sont certifiées et peuvent même servir de preuve de compétence pour votre CV."
    },
    {
        question: "Comment vous contacter si j'ai une question ?",
        answer: "Notre équipe support est disponible directement via le chat de la plateforme ou par email. Nous avons également une communauté active de vendeurs et de fondateurs prête à vous aider et à partager les meilleures pratiques."
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
                            Encore des questions ? <br />
                            <span className="text-slate-400">On a les réponses</span>
                        </h2>
                        <p className="text-lg text-slate-500 font-medium mb-2">
                            Vous n'avez pas trouvé votre bonheur ?
                        </p>
                        <a href="#" className="inline-flex items-center gap-1 text-lg font-bold text-violet-600 hover:text-violet-700 hover:gap-2 transition-all">
                            Réserver une démo <ArrowRight className="w-5 h-5" />
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
