import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { LANGUAGES } from './constants';
import { Github, Linkedin, Download, Mail, Phone, MapPin, Sun, Moon, Terminal, Briefcase, Code, User, Cpu, ArrowRight, Award, FileText, Send, MessageCircle, ExternalLink, Languages, Star, Lock, Globe, X, Eye, Bot, AlertTriangle, Wifi, CheckCircle } from 'lucide-react';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { LanguageKey } from './constants';
import reposData from './repos.json';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const API_KEY = process.env.GEMINI_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

export default function App() {
  const [language, setLanguage] = useState<LanguageKey>('en');
  const lang = LANGUAGES[language];
  
  // Force dark mode by default for the premium tech look
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('theme');
    return (savedTheme === 'light' || savedTheme === 'dark') ? savedTheme : 'dark';
  });
  const [promptInput, setPromptInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('about');
  const [isImageZoomed, setIsImageZoomed] = useState(false);
  const [zoomedCertificateImage, setZoomedCertificateImage] = useState<string | null>(null);
  const [isWeChatModalOpen, setIsWeChatModalOpen] = useState(false);
  const [showAllRepos, setShowAllRepos] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<any | null>(null);
  const [visitorInfo, setVisitorInfo] = useState<{ ip: string; country: string; city: string; hostname: string; browser: string; os: string } | null>(null);
  const [viewCount, setViewCount] = useState(0);
  const [recentVisitors, setRecentVisitors] = useState<Array<{ ip: string; country: string; city: string; hostname: string; browser: string; os: string; views: number; lastVisit: string }>>([]);
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'ai'; content: string }>>([]);
  const [aiWarningOpen, setAiWarningOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectedApi, setConnectedApi] = useState<string | null>(null);
  const [matrixSpeed, setMatrixSpeed] = useState(80);
  const [contactClicks, setContactClicks] = useState(0);

  // Theme effect
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleLanguage = () => {
    const keys: LanguageKey[] = ['en', 'mm', 'zh'];
    const currentIndex = keys.indexOf(language);
    const nextIndex = (currentIndex + 1) % keys.length;
    setLanguage(keys[nextIndex]);
  };

  // Scroll spy for active section
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['about', 'experience', 'githubRepos', 'skills', 'ai'];
      const scrollPosition = window.scrollY + 200; // Offset

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element && element.offsetTop <= scrollPosition && (element.offsetTop + element.offsetHeight) > scrollPosition) {
          setActiveSection(section);
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Visitor tracking
  useEffect(() => {
    const trackVisitor = async () => {
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipRes.json();
        const ip = ipData.ip;

        const geoRes = await fetch(`https://ipapi.co/${ip}/json/`);
        const geoData = await geoRes.json();

        const hostname = window.location.hostname || 'local';
        const browser = navigator.userAgent.split(' ').pop()?.split('(')[0] || 'Unknown';
        const os = navigator.platform || 'Unknown';

        const visitorData = {
          ip,
          country: geoData.country_name || 'Unknown',
          city: geoData.city || 'Unknown',
          hostname,
          browser,
          os,
        };

        setVisitorInfo(visitorData);

        // Track view count in localStorage
        const visitors = JSON.parse(localStorage.getItem('portfolio_visitors') || '[]');
        const existingIndex = visitors.findIndex((v: any) => v.ip === ip);
        if (existingIndex >= 0) {
          visitors[existingIndex].views += 1;
          visitors[existingIndex].lastVisit = new Date().toISOString();
        } else {
          visitors.push({
            ...visitorData,
            views: 1,
            lastVisit: new Date().toISOString(),
          });
        }
        localStorage.setItem('portfolio_visitors', JSON.stringify(visitors));
        setViewCount(visitors.reduce((sum: number, v: any) => sum + v.views, 0));
        setRecentVisitors(visitors.slice(-5).reverse());
      } catch (error) {
        console.error('Visitor tracking error:', error);
      }
    };
    trackVisitor();
  }, []);

  const toggleTheme = () => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));

  const handlePromptSubmit = async () => {
    if (!promptInput.trim()) return;
    setIsLoading(true);
    setIsConnecting(true);
    setConnectedApi(null);
    
    const userMessage = promptInput;
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
    setPromptInput('');
    
    const languageMap: Record<LanguageKey, string> = {
      en: 'English',
      mm: 'Myanmar (Burmese)',
      zh: 'Chinese (Simplified)',
    };

    // Myanmar users can only use English or Chinese
    const isMyanmar = visitorInfo?.country === 'Myanmar';
    const effectiveLanguage = isMyanmar ? (language === 'mm' ? 'en' : language) : language;

    const systemPrompt = `You are Htet Aung Hlaing's (ting) personal AI assistant embedded in his portfolio website. Your ONLY purpose is to represent him professionally.

## CRITICAL LANGUAGE RULE:
You MUST respond in ${languageMap[effectiveLanguage]} language. ALWAYS use ${languageMap[effectiveLanguage]} as the primary response language.

## STRICT RULES:
1. ONLY answer questions related to Htet Aung Hlaing's profile, experience, skills, certifications, projects, education, or how he can contribute to a team/company.
2. If asked about anything unrelated, politely decline and redirect.
3. Always frame answers from a HIRING MANAGER perspective.
4. Be concise, confident, and professional.
5. If someone asks about this website, mention it's built with React + Vite + Tailwind CSS and the source code is at https://github.com/tinghah/tinghah.github.io

## HTET AUNG HLAING'S PROFILE:
Name: ${lang.profile.name} (${lang.profile.nickname})
Title: ${lang.profile.tagline}
Location: ${lang.profile.contact.address}

## PROFESSIONAL SUMMARY:
${lang.profile.description.join(' ')}

## WORK EXPERIENCE:
${lang.experience.items.map(exp => `- ${exp.role} at ${exp.company} (${exp.duration}): ${exp.description.join(' ')}`).join('\n')}

## CORE SKILLS:
${lang.skills.items.join(', ')}

## CERTIFICATIONS:
${lang.skills.badges.map(b => `- ${b.name}`).join('\n')}

## CONTACT:
LinkedIn: ${lang.profile.contact.linkedin}
GitHub: ${lang.profile.contact.github}
Email: ${lang.profile.contact.emails[0]}`;

    // Connection animation
    await new Promise(r => setTimeout(r, 800));
    setChatHistory(prev => [...prev, { role: 'ai', content: '⏳ Initializing AI context...' }]);
    await new Promise(r => setTimeout(r, 600));
    
    if (API_KEY && !isMyanmar) {
      setChatHistory(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'ai', content: '🔗 Connecting to Google Gemini API...' };
        return updated;
      });
      await new Promise(r => setTimeout(r, 700));
      
      try {
        const ai = new GoogleGenAI({ apiKey: API_KEY });
        const response: GenerateContentResponse = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: [
            { role: 'user', parts: [{ text: `System Instructions: ${systemPrompt}\n\nUser Question: ${userMessage}` }] },
          ],
        });
        const aiMessage = response.text || 'No response from AI.';
        setConnectedApi('Google Gemini');
        setChatHistory(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'ai', content: `✅ Connected to Google Gemini\n\n${aiMessage}` };
          return updated;
        });
        setIsLoading(false);
        setIsConnecting(false);
        return;
      } catch (error) {
        console.error('Gemini API error, trying OpenRouter fallback:', error);
        setChatHistory(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'ai', content: '⚠️ Gemini unavailable, switching to OpenRouter...' };
          return updated;
        });
        await new Promise(r => setTimeout(r, 500));
      }
    }

    // Fallback to OpenRouter
    if (OPENROUTER_API_KEY) {
      setChatHistory(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'ai', content: '🔗 Connecting to OpenRouter API...' };
        return updated;
      });
      await new Promise(r => setTimeout(r, 600));
      
      const freeModels = [
        'openrouter/free',
        'nvidia/nemotron-3-super:free',
        'google/gemma-4-31b:free',
        'moonshotai/kimi-k2.6:free',
      ];

      for (const model of freeModels) {
        try {
          setChatHistory(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: 'ai', content: `🔗 Trying ${model}...` };
            return updated;
          });
          
          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': window.location.origin,
              'X-Title': 'Portfolio AI Assistant',
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage },
              ],
            }),
          });
          const data = await response.json();
          
          if (data.error) {
            console.error(`OpenRouter ${model} error:`, data.error);
            continue;
          }
          
          if (data.choices && data.choices[0]) {
            const aiMessage = data.choices[0].message.content || 'No response from AI.';
            setConnectedApi(model);
            setChatHistory(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: 'ai', content: `✅ Connected to ${model}\n\n${aiMessage}` };
              return updated;
            });
            setIsLoading(false);
            setIsConnecting(false);
            return;
          }
        } catch (error) {
          console.error(`OpenRouter ${model} failed:`, error);
        }
      }
      setChatHistory(prev => [...prev, { role: 'ai', content: '❌ All AI models are currently unavailable. Please try again later.' }]);
    } else {
      setChatHistory(prev => [...prev, { role: 'ai', content: '❌ AI service is not configured. Please contact the administrator.' }]);
    }

    setIsLoading(false);
    setIsConnecting(false);
  };

  return (
    <div className={`min-h-screen font-sans ${theme} bg-[var(--bg)] text-[var(--fg)] selection:bg-[var(--accent)] selection:text-white`}>
      
      {/* Profile Image Zoom Modal */}
      {isImageZoomed && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsImageZoomed(false)}
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative max-w-4xl w-full h-full flex items-center justify-center"
          >
            <img 
              src={lang.profile.profileImage} 
              alt={lang.profile.name} 
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/executive/800/1200';
              }}
            />
          </motion.div>
        </motion.div>
      )}

      {/* Certificate Image Zoom Modal */}
      {zoomedCertificateImage && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setZoomedCertificateImage(null)}
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative max-w-5xl w-full h-full flex items-center justify-center"
          >
            <img 
              src={zoomedCertificateImage} 
              alt="Certificate" 
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/certificate/1200/800';
              }}
            />
          </motion.div>
        </motion.div>
      )}

      {/* WeChat QR Modal */}
      {isWeChatModalOpen && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md"
          onClick={() => setIsWeChatModalOpen(false)}
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="relative max-w-sm w-full bg-[var(--card)] p-1 rounded-[2.5rem] border border-[var(--card-border)] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-b from-[var(--accent)]/20 to-transparent p-8">
              <button 
                onClick={() => setIsWeChatModalOpen(false)}
                className="absolute top-6 right-6 p-2 rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors z-10"
              >
                <ArrowRight className="rotate-180" size={20} />
              </button>
              
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-[var(--accent)] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[var(--accent)]/20">
                  <MessageCircle size={32} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold text-[var(--fg)]">WeChat Connect</h3>
                <p className="text-[var(--muted)] text-sm mt-1">Scan the code to add me</p>
              </div>

              <div className="relative aspect-square rounded-3xl overflow-hidden border-8 border-white shadow-inner bg-white p-4 group">
                <img 
                  src={lang.profile.contact.wechatQr} 
                  alt="WeChat QR Code" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/wechat/400/400';
                  }}
                />
                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              </div>

              <div className="mt-8 flex flex-col items-center">
                <div className="px-4 py-2 rounded-full bg-[var(--bg)] border border-[var(--card-border)] flex items-center space-x-2">
                  <span className="text-[var(--muted)] text-xs font-mono">ID:</span>
                  <span className="text-[var(--fg)] font-bold font-mono">{lang.profile.contact.wechat}</span>
                </div>
                <p className="mt-4 text-[var(--muted)] text-[10px] uppercase tracking-widest font-bold">霆 | ting</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* AI Warning Popup */}
      {aiWarningOpen && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
          onClick={() => setAiWarningOpen(false)}
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="relative max-w-lg w-full bg-[var(--card)] rounded-2xl border border-[var(--card-border)] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Bot size={28} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {language === 'mm' ? 'AI အကြံပေး လက်ထောက်' : language === 'zh' ? 'AI 执行助理' : 'AI Executive Assistant'}
                  </h3>
                  <p className="text-white/80 text-sm">
                    {language === 'mm' ? 'Google Gemini & OpenRouter ဖြင့် အားဖြည့်ထားသည်' : language === 'zh' ? '由 Google Gemini 和 OpenRouter 提供支持' : 'Powered by Google Gemini & OpenRouter'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-green-400 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-semibold text-[var(--fg)] text-sm">
                    {language === 'mm' ? 'ကျွန်တော် ဘာတွေ ကူညီနိုင်လဲ' : language === 'zh' ? '我能做什么' : 'What I can do:'}
                  </h4>
                  <p className="text-[var(--muted)] text-xs mt-1">
                    {language === 'mm' ? 'Htet ၏ အတွေ့အကြုံ၊ ကျွမ်းကျင်မှု၊ အသိအမှတ်ပြုလက်မှတ်များ၊ စီမံကိန်းများနှင့် သင့်အဖွဲ့တွင် သူ ဘယ်လို ပါဝင်နိုင်ကြောင်း မေးခွန်းများကို ဖြေကြားပေးပါသည်။' : language === 'zh' ? '回答关于 Htet 的经验、技能、认证、项目以及他如何为您的团队做出贡献的问题。' : "Answer questions about Htet's experience, skills, certifications, projects, and how he can contribute to your team."}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-semibold text-[var(--fg)] text-sm">
                    {language === 'mm' ? 'ကျွန်တော် ကူညီမပေးနိုင်တာများ' : language === 'zh' ? '我无法帮助的事项' : 'I cannot help with:'}
                  </h4>
                  <p className="text-[var(--muted)] text-xs mt-1">
                    {language === 'mm' ? 'ဆက်စပ်မရှိသော ခေါင်းစဉ်များ၊ အခြားလူများ၊ အထွေထွေ ဗဟုသုတ်၊ coding အကူအညီ သို့မဟုတ် Htet ၏ ပရော်ဖက်ရှင်နယ် profile ပြင်ပရှိ အရာအားလုံး။' : language === 'zh' ? '不相关的话题、其他人、一般知识、编程帮助或 Htet 专业档案之外的任何内容。' : "Unrelated topics, other people, general knowledge, coding help, or anything outside Htet's professional profile."}
                  </p>
                </div>
              </div>

              {visitorInfo?.country === 'Myanmar' && (
                <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                  <AlertTriangle size={18} className="text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-semibold text-amber-400 text-sm">
                      {language === 'mm' ? 'မြန်မာ အသုံးပြုသူ အကြောင်းကြားချက်' : language === 'zh' ? '缅甸用户通知' : 'Myanmar Users Notice'}
                    </h4>
                    <p className="text-[var(--muted)] text-xs mt-1">
                      {language === 'mm' ? (
                        <>This AI assistant uses <strong className="text-[var(--fg)]">OpenRouter API</strong> for Myanmar visitors, which works best with <strong className="text-[var(--fg)]">English</strong> and <strong className="text-[var(--fg)]">Chinese</strong> only. If you prefer <strong className="text-amber-400">Burmese language</strong>, please use a <strong className="text-[var(--fg)]">VPN</strong> and refresh — this will connect to <strong className="text-[var(--fg)]">Gemini API</strong> which supports Burmese more accurately.</>
                      ) : language === 'zh' ? (
                        <>此 AI 助手对缅甸访客使用 <strong className="text-[var(--fg)]">OpenRouter API</strong>，仅支持 <strong className="text-[var(--fg)]">英语</strong> 和 <strong className="text-[var(--fg)]">中文</strong>。如果您偏好 <strong className="text-amber-400">缅甸语</strong>，请使用 <strong className="text-[var(--fg)]">VPN</strong> 并刷新页面 — 这将连接到支持更准确缅甸语的 <strong className="text-[var(--fg)]">Gemini API</strong>。</>
                      ) : (
                        <>This AI assistant uses <strong className="text-[var(--fg)]">OpenRouter API</strong> for Myanmar visitors, which works best with <strong className="text-[var(--fg)]">English</strong> and <strong className="text-[var(--fg)]">Chinese</strong> only. If you prefer <strong className="text-amber-400">Burmese language</strong>, please use a <strong className="text-[var(--fg)]">VPN</strong> and refresh — this will connect to <strong className="text-[var(--fg)]">Gemini API</strong> which supports Burmese more accurately.</>
                      )}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="flex items-start gap-3">
                <Wifi size={18} className="text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-semibold text-[var(--fg)] text-sm">
                    {language === 'mm' ? 'ဘယ်လို အသုံးပြုရမလဲ' : language === 'zh' ? '如何使用' : 'How to use:'}
                  </h4>
                  <p className="text-[var(--muted)] text-xs mt-1">
                    {language === 'mm' ? 'Htet ၏ SAP အတွေ့အကြုံ၊ နည်းပညာ stack၊ အသိအမှတ်ပြုလက်မှတ်များ သို့မဟုတ် သင့်အဖွဲ့အတွက် သူ ဘယ်လို သင့်တောင့်တင့်ကြောင်း မေးမြန်းပါ။' : language === 'zh' ? '询问 Htet 的 SAP 经验、技术栈、认证，或了解他为什么适合您的团队。点击下方开始聊天！' : "Ask about Htet's SAP experience, tech stack, certifications, or why he's a great fit for your team. Click below to start chatting!"}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-[var(--card-border)] bg-[var(--bg)] flex gap-3">
              <button 
                onClick={() => setAiWarningOpen(false)}
                className="flex-1 px-4 py-2 border border-[var(--card-border)] rounded-lg text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--card)] transition-colors text-sm font-bold"
              >
                {language === 'mm' ? 'နောက်မှ' : language === 'zh' ? '稍后再说' : 'Maybe Later'}
              </button>
              <a 
                href="#ai"
                onClick={() => setAiWarningOpen(false)}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-bold text-center text-sm hover:shadow-lg hover:shadow-green-500/30 transition-all"
              >
                {language === 'mm' ? 'Chat စတင်ရန်' : language === 'zh' ? '开始聊天' : 'Start Chatting'}
              </a>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Repo Details Modal */}
      {selectedRepo && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-md"
          onClick={() => setSelectedRepo(null)}
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="relative w-full max-w-4xl max-h-[90vh] bg-[var(--bg)] rounded-3xl border border-[var(--card-border)] shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-[var(--card-border)] bg-[var(--card)] flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--bg)] border border-[var(--card-border)] flex items-center justify-center text-[var(--accent)] shrink-0">
                  <Code size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold font-display text-[var(--fg)] flex items-center gap-2">
                    {selectedRepo.name}
                    <div className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 bg-[var(--bg)] border border-[var(--card-border)] rounded text-[var(--muted)] shrink-0">
                      {selectedRepo.private ? <Lock size={10} className="text-red-400" /> : <Globe size={10} className="text-green-400" />}
                      <span>{selectedRepo.private ? lang.githubRepos.privateBadge : lang.githubRepos.publicBadge}</span>
                    </div>
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-[var(--muted)]">
                    {selectedRepo.language && (
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--accent)]"></span>{selectedRepo.language}</span>
                    )}
                    <span className="flex items-center gap-1"><Star size={12} className="text-yellow-500" />{selectedRepo.stargazers_count}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedRepo(null)}
                className="p-2 rounded-full hover:bg-[var(--bg)] text-[var(--muted)] hover:text-[var(--fg)] transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-grow prose prose-invert max-w-none text-sm leading-relaxed prose-headings:font-display prose-headings:text-[var(--fg)] prose-p:text-[var(--muted)] prose-a:text-[var(--accent)] prose-a:no-underline hover:prose-a:underline prose-code:text-[var(--accent)] prose-code:bg-[var(--accent)]/10 prose-code:px-1 prose-code:rounded prose-pre:bg-[#0a0a0a] prose-pre:border prose-pre:border-[var(--card-border)]">
              {selectedRepo.readme ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {selectedRepo.readme}
                </ReactMarkdown>
              ) : (
                <div className="text-center py-12">
                  <FileText size={48} className="mx-auto text-[var(--card-border)] mb-4" />
                  <p className="text-[var(--muted)]">No README.md found for this repository.</p>
                  {selectedRepo.description && (
                    <div className="mt-8 text-left bg-[var(--card)] p-6 rounded-xl border border-[var(--card-border)]">
                      <h4 className="text-lg font-bold text-[var(--fg)] mb-2">Description</h4>
                      <p>{selectedRepo.description}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-[var(--card-border)] bg-[var(--card)] flex items-center justify-between">
              <span className="text-xs text-[var(--muted)]">Last updated: {new Date(selectedRepo.updated_at).toLocaleDateString()}</span>
              <a 
                href={selectedRepo.html_url} 
                target="_blank" 
                rel="noreferrer"
                className="px-6 py-2.5 bg-[var(--accent)] text-white rounded-lg font-bold text-sm flex items-center gap-2 hover:opacity-90 transition-opacity"
              >
                <Github size={18} /> View on GitHub
              </a>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Floating Glass Navigation */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 glass rounded-2xl px-5 py-3.5 flex items-center space-x-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.4)] dark:border-white dark:border-2 border-gray-300 border-2 backdrop-blur-xl bg-[var(--card)]/80">
        {[
          { id: 'about', icon: User, label: 'About', color: 'from-pink-500 to-rose-500' },
          { id: 'experience', icon: Briefcase, label: 'Experience', color: 'from-amber-500 to-orange-500' },
          { id: 'githubRepos', icon: Github, label: 'Repos', color: 'from-slate-600 to-gray-700' },
          { id: 'skills', icon: Cpu, label: 'Skills', color: 'from-emerald-500 to-teal-500' },
        ].map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={`relative flex flex-col items-center justify-center px-3.5 py-2.5 rounded-xl transition-all duration-300 font-bold ${
              activeSection === item.id 
                ? `bg-gradient-to-r ${item.color} text-white shadow-lg scale-110 shadow-black/30` 
                : 'text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--card)] hover:shadow-md'
            }`}
            title={item.label}
          >
            <item.icon size={20} strokeWidth={2.5} />
            <span className="text-[10px] mt-1 font-extrabold hidden md:block">{item.label}</span>
          </a>
        ))}
        <button
          onClick={() => setAiWarningOpen(true)}
          className={`relative flex flex-col items-center justify-center px-3.5 py-2.5 rounded-xl transition-all duration-300 font-bold ${
            activeSection === 'ai' 
              ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg scale-110 shadow-black/30' 
              : 'text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--card)] hover:shadow-md'
          }`}
          title="AI Chat"
        >
          <Terminal size={20} strokeWidth={2.5} />
          <span className="text-[10px] mt-1 font-extrabold hidden md:block">AI Chat</span>
        </button>
        <div className="w-px h-10 bg-gradient-to-b from-transparent via-[var(--card-border)] to-transparent mx-1.5"></div>
        <button 
          onClick={toggleLanguage} 
          className="relative flex items-center justify-center px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-500/30 text-blue-500 dark:text-blue-400 hover:from-blue-500 hover:to-indigo-500 hover:text-white hover:border-transparent hover:shadow-lg hover:shadow-blue-500/30 transition-all font-bold" 
          title="Language"
        >
          <Languages size={20} strokeWidth={2.5} />
          <span className="text-[11px] ml-1.5 font-extrabold uppercase">{language}</span>
        </button>
        <button 
          onClick={toggleTheme} 
          className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-500 dark:text-amber-400 hover:from-amber-500 hover:to-orange-500 hover:text-white hover:border-transparent hover:shadow-lg hover:shadow-amber-500/30 transition-all" 
          title="Theme"
        >
          {theme === 'dark' ? <Sun size={22} strokeWidth={2.5} className="animate-pulse" /> : <Moon size={22} strokeWidth={2.5} />}
        </button>
      </nav>

      <main className="w-[90%] mx-auto px-6 pb-32">
        
        {/* HERO SECTION */}
        <section id="about" className="min-h-[90vh] flex flex-col justify-center pt-20 relative">
          {/* Subtle grid background */}
          <div className="absolute inset-0 -z-10 h-full w-full bg-[var(--bg)] bg-[radial-gradient(var(--card-border)_1px,transparent_1px)] [background-size:24px_24px] opacity-20"></div>
          
          <motion.div 
            initial={{ opacity: 0, y: 30 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.8 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center"
          >
            <div className="lg:col-span-8">
              <div className="inline-block px-3 py-1 rounded-full border border-[var(--accent)] text-[var(--accent)] text-xs font-bold tracking-wider uppercase mb-6 bg-[var(--accent)]/10">
                {lang.profile.title}
              </div>
              
              <motion.h1 
                whileHover={{ scale: 1.02, x: 10 }}
                className="text-5xl md:text-7xl font-bold font-display tracking-tight mb-4 text-gradient leading-tight cursor-default"
              >
                <span className="block">{lang.profile.name}</span>
                <span className="block text-3xl md:text-5xl mt-2">{lang.profile.nickname}</span>
              </motion.h1>
              
              <h2 className="text-2xl md:text-3xl text-[var(--muted)] font-display mb-8">
                {lang.profile.tagline}
              </h2>

              <div className="space-y-4 text-lg text-[var(--muted)] leading-relaxed mb-10">
                {lang.profile.description.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>

              <div className="flex flex-wrap gap-4 items-center">
                <a href="#experience" className="px-6 py-3 bg-[var(--fg)] text-[var(--bg)] rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center">
                  View Experience <ArrowRight size={16} className="ml-2" />
                </a>
                <button 
                  onClick={() => setAiWarningOpen(true)}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-green-500/30 transition-all flex items-center"
                >
                  <Bot size={16} className="mr-2" /> 
                  {language === 'mm' ? 'AI လက်ထောက်ကို မေးပါ' : language === 'zh' ? '詢問人工智慧助手' : 'Ask AI Assistant'}
                </button>
                <a href={lang.resume.file} download className="px-6 py-3 border border-[var(--card-border)] rounded-lg font-medium hover:bg-[var(--card)] transition-colors flex items-center">
                  <Download size={16} className="mr-2" /> {lang.resume.download}
                </a>
              </div>
            </div>

            <div className="lg:col-span-4 flex justify-center lg:justify-end relative" style={{ minHeight: 420 }}>
              {/* Binary Matrix Rain Canvas - Behind Profile */}
              <div className="absolute inset-0 flex items-center justify-center">
                <canvas 
                  ref={(canvas) => {
                    if (!canvas) return;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return;
                    canvas.width = 280;
                    canvas.height = 500;
                    
                    const binaryChars: Record<LanguageKey, string> = {
                      en: '01',
                      mm: '၀၁',
                      zh: '零壹〇一',
                    };
                    const katakana = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
                    const chars = binaryChars[language] + katakana;
                    const fontSize = 14;
                    const columns = Math.floor(canvas.width / fontSize);
                    const drops: number[] = Array(columns).fill(1);
                    let animFrame: number;
                    let lastTime = 0;
                    
                    const draw = (timestamp: number) => {
                      if (timestamp - lastTime < matrixSpeed) {
                        animFrame = requestAnimationFrame(draw);
                        return;
                      }
                      lastTime = timestamp;
                      
                      ctx.fillStyle = 'rgba(255,255,255,0.05)';
                      ctx.fillRect(0, 0, canvas.width, canvas.height);
                      ctx.font = `${fontSize}px monospace`;
                      
                      for (let i = 0; i < drops.length; i++) {
                        const text = chars[Math.floor(Math.random() * chars.length)];
                        const y = drops[i] * fontSize;
                        ctx.fillStyle = `rgba(144, 238, 144, ${0.6 + Math.random() * 0.4})`;
                        ctx.fillText(text, i * fontSize, y);
                        if (y > canvas.height && Math.random() > 0.975) {
                          drops[i] = 0;
                        }
                        drops[i] += 0.3;
                      }
                      animFrame = requestAnimationFrame(draw);
                    };
                    
                    animFrame = requestAnimationFrame(draw);
                    return () => cancelAnimationFrame(animFrame);
                  }}
                  className="pointer-events-none"
                  style={{ width: 280, height: 500 }}
                />
              </div>

              {/* Speed Controller */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-[var(--card)] border border-[var(--card-border)] rounded-full px-3 py-1.5 shadow-lg">
                <span className="text-[10px] text-[var(--muted)] font-bold">Matrix</span>
                <input
                  type="range"
                  min="10"
                  max="200"
                  value={200 - matrixSpeed}
                  onChange={(e) => setMatrixSpeed(200 - Number(e.target.value))}
                  className="w-16 h-1 accent-green-500"
                />
                <span className="text-[10px] text-green-500 font-bold">⚡</span>
              </div>
              
              {/* Profile Image - In Front */}
              <motion.div 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsImageZoomed(true)}
                className="relative group cursor-zoom-in z-10"
              >
                <div className="absolute -inset-1 rounded-2xl blur"></div>
                <div className="relative w-64 h-80 md:w-72 md:h-96 rounded-2xl overflow-hidden bg-[var(--card)] shadow-2xl">
                  <img 
                    src={lang.profile.profileImage} 
                    alt={lang.profile.name} 
                    className="w-full h-full object-cover grayscale-0 hover:grayscale transition-all duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/executive/400/600';
                    }}
                  />
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Quick Contact Strip */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ delay: 0.5, duration: 0.8 }} 
            className="mt-20 border-y border-[var(--card-border)] py-12"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--accent)]">Direct Contact</h4>
                <div className="space-y-3">
                  <div className="flex items-center text-[var(--muted)] text-sm hover:text-[var(--fg)] transition-colors">
                    <Phone size={16} className="mr-3 text-[var(--accent)] shrink-0" />
                    <span>{lang.profile.contact.phone}</span>
                  </div>
                  {lang.profile.contact.emails.map((email: string, idx: number) => (
                    <a key={idx} href={`mailto:${email}`} className="flex items-center text-[var(--muted)] text-sm hover:text-[var(--accent)] transition-colors">
                      <Mail size={16} className="mr-3 text-[var(--accent)] shrink-0" />
                      <span>{email}</span>
                    </a>
                  ))}
                  <div className="flex items-center text-[var(--muted)] text-sm">
                    <MapPin size={16} className="mr-3 text-[var(--accent)] shrink-0" />
                    <span>{lang.profile.contact.address}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--accent)]">Social & Chat</h4>
                <div className="space-y-3">
                  <a href={lang.profile.contact.whatsapp} target="_blank" rel="noreferrer" className="flex items-center text-[var(--muted)] text-sm hover:text-[var(--fg)] transition-colors">
                    <MessageCircle size={16} className="mr-3 text-[var(--accent)] shrink-0" />
                    <span>WhatsApp: Message Me</span>
                  </a>
                  <a href={lang.profile.contact.telegram} target="_blank" rel="noreferrer" className="flex items-center text-[var(--muted)] text-sm hover:text-[var(--fg)] transition-colors">
                    <Send size={16} className="mr-3 text-[var(--accent)] shrink-0" />
                    <span>Telegram: {lang.profile.contact.telegramUser}</span>
                  </a>
                  <button 
                    onClick={() => setIsWeChatModalOpen(true)}
                    className="flex items-center text-[var(--muted)] text-sm hover:text-[var(--accent)] transition-colors w-full text-left group"
                  >
                    <MessageCircle size={16} className="mr-3 text-[var(--accent)] shrink-0 group-hover:scale-110 transition-transform" />
                    <span>WeChat: {lang.profile.contact.wechat}</span>
                    <div className="ml-2 px-1.5 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)] text-[10px] font-bold uppercase tracking-tighter">QR</div>
                  </button>
                  <a href={lang.profile.contact.teamsChat} target="_blank" rel="noreferrer" className="flex items-center text-[var(--muted)] text-sm hover:text-[var(--fg)] transition-colors">
                    <Briefcase size={16} className="mr-3 text-[var(--accent)] shrink-0" />
                    <span>MS Teams: {lang.profile.contact.teams}</span>
                  </a>
                  <a href={lang.profile.contact.github} target="_blank" rel="noreferrer" className="flex items-center text-[var(--muted)] text-sm hover:text-[var(--fg)] transition-colors">
                    <Github size={16} className="mr-3 text-[var(--accent)] shrink-0" />
                    <span className="truncate">GitHub: {lang.profile.contact.github.split('/').pop()}</span>
                  </a>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--accent)]">Gaming & Community</h4>
                <div className="space-y-3">
                  <a href={lang.profile.contact.discordLink} target="_blank" rel="noreferrer" className="flex items-center text-[var(--muted)] text-sm hover:text-[var(--fg)] transition-colors">
                    <Terminal size={16} className="mr-3 text-[var(--accent)] shrink-0" />
                    <span>Discord: {lang.profile.contact.discord}</span>
                  </a>
                  <a href={lang.profile.contact.linkedin} target="_blank" rel="noreferrer" className="flex items-center text-[var(--muted)] text-sm hover:text-[var(--fg)] transition-colors">
                    <Linkedin size={16} className="mr-3 text-[var(--accent)] shrink-0" />
                    <span>LinkedIn Profile</span>
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* EXPERIENCE SECTION */}
        <section id="experience" className="py-24 border-t border-[var(--card-border)]">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <h2 className="text-4xl font-bold font-display mb-12 text-gradient">{lang.experience.title}</h2>
            
            <div className="relative border-l border-[var(--card-border)] ml-4 md:ml-6 space-y-12 pb-4">
              {lang.experience.items.map((item, index) => (
                <div key={index} className="relative pl-8 md:pl-12 group">
                  {/* Timeline Dot */}
                  <div className="absolute -left-[5px] top-2 w-2.5 h-2.5 rounded-full bg-[var(--accent)] shadow-[0_0_10px_var(--accent)]"></div>
                  
                  <div className="flex flex-col md:flex-row md:items-baseline md:justify-between mb-2">
                    <h3 className="text-xl font-bold font-display text-[var(--fg)]">
                      {item.role}
                    </h3>
                    <span className="text-sm font-mono text-[var(--accent)] mt-1 md:mt-0 bg-[var(--accent)]/10 px-2 py-1 rounded">
                      {item.duration}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-x-3 mb-4">
                    <h4 className="text-lg font-medium text-[var(--fg)]">
                      {item.company}
                    </h4>
                    {item.department && (
                      <>
                        <span className="text-[var(--muted)]">•</span>
                        <span className="text-sm text-[var(--muted)] italic">{item.department}</span>
                      </>
                    )}
                  </div>
                  
                  <ul className="space-y-3 text-[var(--muted)] text-sm leading-relaxed">
                    {item.description.map((desc: string, descIndex: number) => (
                      <li key={descIndex} className="flex items-start">
                        <span className="text-[var(--accent)] mr-2 mt-1">▹</span>
                        <div className="flex-1">{desc}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* GITHUB REPOS SECTION */}
        <section id="githubRepos" className="py-24 border-t border-[var(--card-border)]">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <div className="flex items-center gap-4 mb-12">
              <Github className="text-[var(--accent)]" size={40} />
              <h2 className="text-4xl font-bold font-display text-gradient">{lang.githubRepos.title}</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
              {reposData.slice(0, showAllRepos ? reposData.length : 9).map((repo, index) => (
                <motion.div 
                  onClick={() => setSelectedRepo(repo)}
                  key={repo.id}
                  whileHover={{ y: -5 }}
                  className="bg-[var(--card)] border border-[var(--card-border)] rounded-2xl p-6 flex flex-col h-full hover:border-[var(--accent)] hover:shadow-xl hover:shadow-[var(--accent)]/10 transition-all group cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2 text-[var(--fg)] font-bold text-lg group-hover:text-[var(--accent)] transition-colors line-clamp-1">
                      <Code size={18} className="text-[var(--muted)]" />
                      <span className="truncate">{repo.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-mono px-2 py-1 bg-[var(--bg)] border border-[var(--card-border)] rounded-md text-[var(--muted)] shrink-0">
                      {repo.private ? <Lock size={12} className="text-red-400" /> : <Globe size={12} className="text-green-400" />}
                      <span>{repo.private ? lang.githubRepos.privateBadge : lang.githubRepos.publicBadge}</span>
                    </div>
                  </div>
                  
                  <p className="text-[var(--muted)] text-sm leading-relaxed mb-6 flex-grow line-clamp-3">
                    {repo.description || "No description provided."}
                  </p>
                  
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-[var(--card-border)]">
                    <div className="flex items-center gap-4 text-xs font-medium text-[var(--muted)]">
                      {repo.language && (
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]"></span>
                          <span>{repo.language}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Star size={14} className="text-yellow-500" />
                        <span>{repo.stargazers_count}</span>
                      </div>
                    </div>
                    <ArrowRight size={16} className="text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors opacity-0 group-hover:opacity-100" />
                  </div>
                </motion.div>
              ))}
            </div>

            {reposData.length > 9 && (
              <div className="flex justify-center">
                <button 
                  onClick={() => setShowAllRepos(!showAllRepos)}
                  className="px-8 py-3 bg-[var(--card)] border border-[var(--card-border)] hover:border-[var(--accent)] hover:text-[var(--accent)] rounded-full font-medium transition-all flex items-center gap-2 shadow-sm text-sm"
                >
                  {showAllRepos ? 'Show Less' : `See All ${reposData.length} Repositories`}
                </button>
              </div>
            )}
          </motion.div>
        </section>

        {/* SKILLS & CERTIFICATIONS SECTION */}
        <section id="skills" className="py-24 border-t border-[var(--card-border)]">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <h2 className="text-4xl font-bold font-display mb-12 text-gradient">{lang.skills.title}</h2>
            
            <div className="mb-16">
              <h3 className="text-xl font-display text-[var(--fg)] mb-6 flex items-center">
                <Cpu className="mr-2 text-[var(--accent)]" size={20} /> Core Competencies
              </h3>
              <div className="flex flex-wrap gap-3">
                {lang.skills.items.map((skill, index) => (
                  <div key={index} className="bg-[var(--card)] border border-[var(--card-border)] px-4 py-2 rounded-lg text-sm font-medium text-[var(--fg)] hover:border-[var(--accent)]/50 transition-colors">
                    {skill}
                  </div>
                ))}
              </div>
            </div>

            {/* Digital Badges */}
            <div className="mb-16">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-display text-[var(--fg)] flex items-center">
                  <Award className="mr-2 text-[var(--accent)]" size={20} /> Digital Badges (Credly)
                </h3>
                <a 
                  href="https://www.credly.com/users/htetaunghlaing" 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-xs font-bold text-[var(--accent)] hover:underline flex items-center"
                >
                  View All on Credly <ArrowRight size={12} className="ml-1" />
                </a>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {lang.skills.badges.map((badge: any, index: number) => (
                  <motion.div 
                    key={index}
                    whileHover={{ y: -5 }}
                    className="relative group flex flex-col items-center"
                  >
                    <a href={badge.verifyUrl} target="_blank" rel="noreferrer" className="block w-full aspect-square rounded-2xl overflow-hidden border border-[var(--card-border)] hover:border-[var(--accent)] transition-all bg-[var(--card)] p-4 shadow-sm group-hover:shadow-xl group-hover:shadow-[var(--accent)]/10">
                      <img src={badge.imageUrl} alt={badge.name} className="w-full h-full object-contain" />
                    </a>
                    <span className="mt-3 text-[10px] text-[var(--muted)] text-center font-bold leading-tight uppercase tracking-tighter h-8 overflow-hidden line-clamp-2">
                      {badge.name}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xl font-display text-[var(--fg)] mb-6 flex items-center">
                <Briefcase className="mr-2 text-[var(--accent)]" size={20} /> Certifications
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {lang.skills.certificates.map((cert: any, index: number) => (
                  <motion.div 
                    key={index} 
                    className="group relative bg-[var(--card)] border border-[var(--card-border)] rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-[var(--accent)]/5 hover:border-[var(--accent)]/30 transition-all duration-500 flex flex-col"
                  >
                    {/* Top Image Section - Full width, framed */}
                    {cert.image && (
                      <div 
                        className="relative w-full aspect-[1.4/1] bg-[var(--bg)] overflow-hidden p-4 sm:p-6 flex items-center justify-center cursor-zoom-in group/image"
                        onClick={() => setZoomedCertificateImage(cert.image)}
                      >
                        <img 
                          src={cert.image} 
                          alt={cert.name}
                          className="w-full h-full object-contain rounded shadow-sm group-hover/image:scale-105 transition-transform duration-500"
                          onError={(e) => {
                            (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    
                    {/* Bottom Info Section */}
                    <div className="p-5 border-t border-[var(--card-border)] bg-[var(--card)] relative z-20 flex-1 flex flex-col justify-center">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-[var(--bg)] border border-[var(--card-border)] flex items-center justify-center text-[var(--accent)] shrink-0">
                            <FileText size={20} />
                          </div>
                          <div>
                            <h4 className="font-bold text-[var(--fg)] text-sm group-hover:text-[var(--accent)] transition-colors">
                              {cert.name}
                            </h4>
                            <p className="text-xs text-[var(--muted)] mt-0.5">
                              {cert.issuer} • {cert.date || cert.year}
                            </p>
                          </div>
                        </div>
                        {cert.link && cert.link !== '#' && (
                          <a 
                            href={cert.link} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="px-4 py-2 bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white rounded-lg font-medium text-xs flex items-center transition-all shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Verify <ExternalLink size={14} className="ml-1.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </section>

        {/* AI INSIGHTS SECTION */}
        <section id="ai" className="py-24 border-t border-[var(--card-border)]">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            
            {/* Welcome + Visitor Info (Outside Terminal) */}
            <div className="mb-6 space-y-4">
              {/* Welcome Box */}
              <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl p-6">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/20">
                    <Bot size={28} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[var(--fg)]">AI Executive Assistant</h3>
                    <p className="text-[var(--muted)] text-sm">Ask about Htet's experience, skills, or why he fits your team</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['SAP Experience', 'Tech Stack', 'Certifications', 'Contact Info'].map(q => (
                    <button
                      key={q}
                      onClick={() => { setPromptInput(q); document.getElementById('ai')?.scrollIntoView({ behavior: 'smooth' }); }}
                      className="px-3 py-1.5 bg-[var(--card)] border border-[var(--card-border)] rounded-full text-xs text-[var(--muted)] hover:text-[var(--fg)] hover:border-green-500 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Visitor Stats Bar */}
              <div className="flex flex-col md:flex-row gap-4">
                {/* View Count - Large */}
                <div className="flex-1 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl p-6 text-center">
                  <div className="text-4xl font-bold text-[var(--fg)] font-display">{viewCount}</div>
                  <div className="text-[var(--muted)] text-sm mt-1">Profile Views</div>
                  <div className="text-[var(--muted)] text-xs mt-2">
                    {contactClicks > 0 && <span className="text-green-400">{contactClicks} connected</span>}
                  </div>
                </div>
                
                {/* Visitor Info */}
                <div className="flex-1 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl p-6">
                  <div className="text-xs text-[var(--muted)] uppercase tracking-wider mb-3 font-bold">Your Info</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Globe size={14} className="text-green-400" />
                      <span className="text-[var(--fg)]">{visitorInfo ? `${visitorInfo.city}, ${visitorInfo.country}` : 'Detecting...'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Wifi size={14} className="text-blue-400" />
                      <span className="text-[var(--fg)] font-mono text-xs">{visitorInfo?.ip || '...'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-purple-400" />
                      <span className="text-[var(--muted)] text-xs">{visitorInfo?.hostname} • {visitorInfo?.browser}</span>
                    </div>
                  </div>
                </div>

                {/* Recent Visitors */}
                {recentVisitors.length > 0 && (
                  <div className="flex-1 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl p-6">
                    <div className="text-xs text-[var(--muted)] uppercase tracking-wider mb-3 font-bold">Recent Visitors</div>
                    <div className="space-y-2">
                      {recentVisitors.slice(0, 4).map((v, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                            <span className="text-[var(--fg)]">{v.city}</span>
                            <span className="text-[var(--muted)]">•</span>
                            <span className="text-[var(--muted)]">{v.country}</span>
                          </span>
                          <span className="text-[var(--muted)] text-[10px]">{new Date(v.lastVisit).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mac Terminal */}
            <div className="bg-[#1e1e1e] rounded-2xl overflow-hidden shadow-2xl font-mono border border-[#333]">
              {/* Mac Title Bar */}
              <div className="bg-[#2d2d2d] border-b border-[#333] px-4 py-3 flex items-center">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f57] hover:brightness-90 transition"></div>
                  <div className="w-3 h-3 rounded-full bg-[#febc2e] hover:brightness-90 transition"></div>
                  <div className="w-3 h-3 rounded-full bg-[#28c840] hover:brightness-90 transition"></div>
                </div>
                <div className="mx-auto text-xs text-gray-500 font-medium flex items-center gap-2">
                  <Terminal size={12} />
                  {lang.prompts.title}
                </div>
                <div className="w-16"></div>
              </div>
              
              {/* Terminal Body */}
              <div className="p-6 text-sm min-h-[450px] max-h-[600px] flex flex-col bg-[#0d0d0d]">
                {/* Terminal Header */}
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  transition={{ delay: 0.2 }}
                  className="text-gray-500 mb-4 space-y-1"
                >
                  <div><span className="text-[#28c840]"> ting@portfolio </span><span className="text-gray-600">:</span><span className="text-[#5ac8fa]">~</span><span className="text-gray-600">$</span> <span className="text-gray-400">./ask_about_ting.sh</span></div>
                  <div className="text-gray-600 text-xs">Initializing AI context . . . Ready</div>
                  <div className="text-gray-600 text-xs">Ask about Htet Aung Hlaing's Experience, Tech, Projects and Personal life growth . .</div>
                  <div className="border-b border-[#333] my-2"></div>
                </motion.div>
                
                {/* Chat History */}
                <div className="flex-grow overflow-y-auto mb-4 space-y-3">
                  {chatHistory.map((msg, index) => (
                    <motion.div 
                      key={index} 
                      initial={{ opacity: 0, x: msg.role === 'user' ? 10 : -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                      className={`pl-4 py-1 ${msg.role === 'ai' ? 'border-l-2 border-[#28c840]' : 'border-l-2 border-[#5ac8fa]'}`}
                    >
                      <span className={`text-[10px] uppercase tracking-wider font-bold ${msg.role === 'ai' ? 'text-[#28c840]' : 'text-[#5ac8fa]'}`}>
                        {msg.role === 'ai' ? `$ ai --model ${connectedApi || 'gemini'}` : '$ you'}
                      </span>
                      <div className={`mt-1 whitespace-pre-wrap text-sm ${msg.role === 'ai' ? 'text-gray-300' : 'text-gray-400'}`}>{msg.content}</div>
                    </motion.div>
                  ))}
                  {isConnecting && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-l-2 border-[#febc2e] pl-4 py-1"
                    >
                      <span className="text-[10px] uppercase tracking-wider font-bold text-[#febc2e]">system</span>
                      <div className="mt-1 flex items-center gap-2 text-gray-400">
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-[#febc2e] rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                          <span className="w-1.5 h-1.5 bg-[#febc2e] rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                          <span className="w-1.5 h-1.5 bg-[#febc2e] rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                        </div>
                        connecting...
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Input */}
                <div className="flex items-center pt-3 border-t border-[#333]">
                  <span className="text-[#28c840] mr-2 font-bold">$</span>
                  <input
                    type="text"
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePromptSubmit()}
                    placeholder={lang.prompts.placeholder}
                    className="flex-1 bg-transparent border-none outline-none text-gray-200 placeholder-gray-600 font-mono text-sm"
                    disabled={isLoading}
                  />
                  <button 
                    onClick={handlePromptSubmit}
                    disabled={isLoading || !promptInput.trim()}
                    className="ml-2 text-gray-500 hover:text-[#28c840] transition-colors disabled:opacity-30"
                  >
                    {isLoading ? <div className="w-4 h-4 border-2 border-[#28c840] border-t-transparent rounded-full animate-spin"></div> : <Send size={18} />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

      </main>
    </div>
  );
}
