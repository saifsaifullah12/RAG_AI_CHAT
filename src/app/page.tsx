import Link from 'next/link';
import { ArrowRight, Bot, FileText, Image, Zap, Shield, Sparkles } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-8">
            <Sparkles size={16} />
            <span>Powered by OpenRouter + RAG</span>
          </div>
          
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            AI Assistant with Intelligence
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
            Experience the power of AI with document understanding, image analysis, and RAG-powered contextual responses.
          </p>
          
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:shadow-2xl hover:scale-105 transition-all duration-300"
          >
            Start Chatting
            <ArrowRight size={20} />
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-24 max-w-6xl mx-auto">
          {[
            {
              icon: <Bot className="text-blue-600" size={32} />,
              title: 'Smart Conversations',
              description: 'Powered by Claude 3.5 Sonnet via OpenRouter for intelligent, context-aware responses.',
              gradient: 'from-blue-500 to-cyan-500',
            },
            {
              icon: <FileText className="text-purple-600" size={32} />,
              title: 'Document Analysis',
              description: 'Upload PDFs, DOCs, and text files. RAG technology finds relevant information instantly.',
              gradient: 'from-purple-500 to-pink-500',
            },
            {
              icon: <Image className="text-pink-600" size={32} />,
              title: 'Vision Capabilities',
              description: 'Share images and get detailed analysis, descriptions, and insights from AI vision.',
              gradient: 'from-pink-500 to-rose-500',
            },
            {
              icon: <Zap className="text-yellow-600" size={32} />,
              title: 'Lightning Fast',
              description: 'Optimized Next.js architecture with streaming responses for instant feedback.',
              gradient: 'from-yellow-500 to-orange-500',
            },
            {
              icon: <Shield className="text-green-600" size={32} />,
              title: 'Privacy First',
              description: 'Your conversations and documents are processed securely with enterprise-grade protection.',
              gradient: 'from-green-500 to-emerald-500',
            },
            {
              icon: <Sparkles className="text-indigo-600" size={32} />,
              title: 'RAG Technology',
              description: 'Retrieval-Augmented Generation ensures accurate, contextual answers from your documents.',
              gradient: 'from-indigo-500 to-purple-500',
            },
          ].map((feature, index) => (
            <div
              key={index}
              className="group relative bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100 dark:border-gray-700"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity`} />
              
              <div className="relative">
                <div className="mb-4 inline-block p-3 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-xl">
                  {feature.icon}
                </div>
                
                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
                  {feature.title}
                </h3>
                
                <p className="text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-24 text-center">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 max-w-4xl mx-auto text-white shadow-2xl">
            <h2 className="text-4xl font-bold mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-xl mb-8 text-blue-100">
              Join thousands of users leveraging AI for smarter conversations
            </p>
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-full text-lg font-semibold hover:shadow-xl hover:scale-105 transition-all"
            >
              Launch Chat Interface
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}