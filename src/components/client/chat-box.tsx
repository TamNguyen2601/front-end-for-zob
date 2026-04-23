import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppSelector } from '@/redux/hooks';
import { callChatGemini } from '@/config/api';
import { IChatHistoryItem } from '@/types/backend';
import styles from '@/styles/chat-box.module.scss';

interface IMessage {
    id: string;
    role: 'user' | 'ai';
    content: string;
    timestamp: Date;
    isLoading?: boolean;
    isError?: boolean;
}

const SUGGESTED_QUESTIONS = [
    'Bạn có thể giúp tôi viết CV không?',
    'Kỹ năng nào cần có cho lập trình viên?',
    'Làm thế nào để phỏng vấn tốt?',
];

const ChatBox = () => {
    const isAuthenticated = useAppSelector(state => state.account.isAuthenticated);
    const user = useAppSelector(state => state.account.user);

    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [messages, setMessages] = useState<IMessage[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [hasUnread, setHasUnread] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const chatHistoryRef = useRef<IChatHistoryItem[]>([]);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    useEffect(() => {
        if (isOpen) {
            setHasUnread(false);
            setTimeout(() => inputRef.current?.focus(), 100);
            // Hiện lời chào nếu chưa có tin nhắn
            if (messages.length === 0) {
                setMessages([
                    {
                        id: 'welcome',
                        role: 'ai',
                        content: `Xin chào **${user?.name || 'bạn'}**! 👋\n\nTôi là trợ lý AI của **Zob**, hỗ trợ bạn trong các vấn đề tìm việc, viết CV, chuẩn bị phỏng vấn và nhiều hơn nữa. Tôi có thể giúp gì cho bạn hôm nay?`,
                        timestamp: new Date(),
                    },
                ]);
            }
        }
    }, [isOpen]);

    if (!isAuthenticated) return null;

    const handleSend = async (messageText?: string) => {
        const text = (messageText ?? inputValue).trim();
        if (!text || isTyping) return;

        setInputValue('');

        const userMsg: IMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: text,
            timestamp: new Date(),
        };

        const loadingId = `ai-loading-${Date.now()}`;
        const loadingMsg: IMessage = {
            id: loadingId,
            role: 'ai',
            content: '',
            timestamp: new Date(),
            isLoading: true,
        };

        setMessages(prev => [...prev, userMsg, loadingMsg]);
        setIsTyping(true);

        try {
            const res = await callChatGemini(text, chatHistoryRef.current);
            const reply = res?.data?.reply ?? 'Xin lỗi, tôi không thể trả lời lúc này.';

            // Cập nhật lịch sử hội thoại
            chatHistoryRef.current = [
                ...chatHistoryRef.current,
                { role: 'user', content: text },
                { role: 'model', content: reply },
            ];

            setMessages(prev =>
                prev.map(m =>
                    m.id === loadingId
                        ? { ...m, content: reply, isLoading: false, timestamp: new Date() }
                        : m
                )
            );

            if (!isOpen) setHasUnread(true);
        } catch (err: any) {
            const errMsg =
                err?.response?.status === 429
                    ? 'AI đang bận, vui lòng thử lại sau ít phút.'
                    : 'Đã có lỗi xảy ra, vui lòng thử lại.';

            setMessages(prev =>
                prev.map(m =>
                    m.id === loadingId
                        ? { ...m, content: errMsg, isLoading: false, isError: true }
                        : m
                )
            );
        } finally {
            setIsTyping(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleClearHistory = () => {
        setMessages([]);
        chatHistoryRef.current = [];
    };

    const formatContent = (text: string) => {
        // Simple markdown-like parsing: **bold**, *italic*, \n
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br/>');
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className={styles['chatbox-wrapper']}>
            {/* Floating Button */}
            <button
                id="chatbox-toggle-btn"
                className={`${styles['chatbox-fab']} ${isOpen ? styles['fab-open'] : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                title="Trợ lý AI Zob"
                aria-label="Mở cửa sổ trò chuyện AI"
            >
                {isOpen ? (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" opacity="0"/>
                        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                    </svg>
                )}
                {hasUnread && !isOpen && <span className={styles['fab-badge']} />}
                <div className={styles['fab-ripple']} />
            </button>

            {/* Chat Window */}
            <div className={`${styles['chatbox-window']} ${isOpen ? styles['window-open'] : ''}`}>
                {/* Header */}
                <div className={styles['chat-header']}>
                    <div className={styles['header-left']}>
                        <div className={styles['ai-avatar']}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14.93V15a1 1 0 0 0-2 0v1.93A8 8 0 0 1 4.07 11H6a1 1 0 0 0 0-2H4.07A8 8 0 0 1 11 4.07V6a1 1 0 0 0 2 0V4.07A8 8 0 0 1 19.93 11H18a1 1 0 0 0 0 2h1.93A8 8 0 0 1 13 16.93z"/>
                            </svg>
                        </div>
                        <div className={styles['header-info']}>
                            <span className={styles['header-name']}>Trợ lý AI Zob</span>
                            <span className={styles['header-status']}>
                                <span className={styles['status-dot']} />
                                Gemini · Trực tuyến
                            </span>
                        </div>
                    </div>
                    <div className={styles['header-actions']}>
                        <button
                            className={styles['header-btn']}
                            onClick={handleClearHistory}
                            title="Xóa lịch sử hội thoại"
                            aria-label="Xóa lịch sử"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="1 4 1 10 7 10"/>
                                <path d="M3.51 15a9 9 0 1 0 .49-3.51"/>
                            </svg>
                        </button>
                        <button
                            className={styles['header-btn']}
                            onClick={() => setIsOpen(false)}
                            aria-label="Đóng cửa sổ"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div className={styles['chat-messages']} id="chat-messages-area">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`${styles['message-row']} ${msg.role === 'user' ? styles['row-user'] : styles['row-ai']}`}
                        >
                            {msg.role === 'ai' && (
                                <div className={styles['msg-avatar-ai']}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                                    </svg>
                                </div>
                            )}
                            <div
                                className={`${styles['message-bubble']} ${
                                    msg.role === 'user' ? styles['bubble-user'] : styles['bubble-ai']
                                } ${msg.isError ? styles['bubble-error'] : ''}`}
                            >
                                {msg.isLoading ? (
                                    <div className={styles['typing-dots']}>
                                        <span /><span /><span />
                                    </div>
                                ) : (
                                    <>
                                        <div
                                            className={styles['bubble-text']}
                                            dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }}
                                        />
                                        <span className={styles['msg-time']}>{formatTime(msg.timestamp)}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Suggested Questions (chỉ hiển thị khi chưa có tin nhắn từ user) */}
                    {messages.length <= 1 && (
                        <div className={styles['suggested-wrap']}>
                            {SUGGESTED_QUESTIONS.map((q, i) => (
                                <button
                                    key={i}
                                    className={styles['suggested-btn']}
                                    onClick={() => handleSend(q)}
                                    disabled={isTyping}
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className={styles['chat-input-area']}>
                    <textarea
                        ref={inputRef}
                        id="chat-input"
                        className={styles['chat-textarea']}
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Nhập câu hỏi... (Enter để gửi)"
                        rows={1}
                        maxLength={2000}
                        disabled={isTyping}
                        aria-label="Nhập tin nhắn"
                    />
                    <button
                        id="chat-send-btn"
                        className={`${styles['send-btn']} ${inputValue.trim() && !isTyping ? styles['send-active'] : ''}`}
                        onClick={() => handleSend()}
                        disabled={!inputValue.trim() || isTyping}
                        aria-label="Gửi tin nhắn"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                        </svg>
                    </button>
                </div>
                <div className={styles['chat-footer']}>
                    Powered by <strong>Gemini 2.0 Flash</strong> · Chỉ mang tính chất tham khảo
                </div>
            </div>
        </div>
    );
};

export default ChatBox;
