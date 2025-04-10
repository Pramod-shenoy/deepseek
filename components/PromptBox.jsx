import { assets } from '@/assets/assets'
import { useAppContext } from '@/context/AppContext';
import axios from 'axios';
import Image from 'next/image'
import React, { useState, useRef } from 'react'
import toast from 'react-hot-toast';

const PromptBox = ({setIsLoading, isLoading}) => {
    const [prompt, setPrompt] = useState('');
    const {user, chats, setChats, selectedChat, setSelectedChat} = useAppContext();
    const [isRetrying, setIsRetrying] = useState(false);
    const textAreaRef = useRef(null);

    const handleKeyDown = (e)=>{
        if(e.key === "Enter" && !e.shiftKey){
            e.preventDefault();
            sendPrompt(e);
        }
    }

    const sendPrompt = async (e) => {
        e.preventDefault();
        if (!prompt.trim() || isLoading) return;

        try {
            setIsLoading(true);
            const userPrompt = prompt;
            setPrompt('');

            // Add user message to chat
            const userMessage = {
                role: 'user',
                content: userPrompt,
                timestamp: Date.now(),
            };

            setSelectedChat((prev) => ({
                ...prev,
                messages: [...prev.messages, userMessage],
            }));

            // Call API
            try {
                const { data } = await axios.post('/api/chat/ai', {
                    prompt: userPrompt,
                });

                if (data.success) {
                    const message = data.data.content;
                    const messageTokens = message.split(" ");
                    let assistantMessage = {
                        role: 'assistant',
                        content: "",
                        timestamp: Date.now(),
                    };

                    setSelectedChat((prev) => ({
                        ...prev,
                        messages: [...prev.messages, assistantMessage],
                    }));

                    for (let i = 0; i < messageTokens.length; i++) {
                        setTimeout(()=>{
                            assistantMessage.content = messageTokens.slice(0, i + 1).join(" ");
                            setSelectedChat((prev)=>{
                                const updatedMessages = [
                                    ...prev.messages.slice(0, -1),
                                    assistantMessage
                                ];
                                return {...prev, messages: updatedMessages};
                            });
                        }, i * 100);
                    }
                } else {
                    console.error("API returned error:", data.error || data.message);
                    toast.error(data.error || data.message || "Failed to get response");
                    createFallbackResponse(userPrompt);
                }
            } catch (apiError) {
                console.error("API call failed:", apiError);
                toast.error("Could not connect to the AI service. Check your network connection.");
                createFallbackResponse(userPrompt);
            }
        } catch (error) {
            console.error("Error during prompt handling:", error);
            const errorMessage = error.response?.data?.error || error.message || "Something went wrong";
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const retryLastPrompt = () => {
        if (selectedChat?.messages.length < 1) return;
        
        const userMessages = selectedChat.messages.filter(msg => msg.role === 'user');
        if (userMessages.length === 0) return;
        
        const lastUserMessage = userMessages[userMessages.length - 1];
        
        setIsRetrying(true);
        setPrompt(lastUserMessage.content);
        
        const lastMsg = selectedChat.messages[selectedChat.messages.length - 1];
        if (lastMsg.role === 'assistant') {
            setSelectedChat(prev => ({
                ...prev,
                messages: prev.messages.slice(0, -1)
            }));
            
            setChats(prevChats => prevChats.map(chat => 
                chat._id === selectedChat._id
                    ? {...chat, messages: chat.messages.slice(0, -1)}
                    : chat
            ));
        }
        
        sendPrompt({ preventDefault: () => {} });
    };

    const createFallbackResponse = (userPrompt) => {
        // Create a fallback response when the API fails
        const fallbackResponse = {
            role: 'assistant',
            content: "I'm sorry, I couldn't process your request at the moment. Please check your network connection and try again later.",
            timestamp: Date.now(),
            isFallback: true
        };
        
        // Update the chat state with the fallback message
        setChats((prevChats) => prevChats.map((chat) => 
            chat._id === selectedChat._id 
                ? {...chat, messages: [...chat.messages, fallbackResponse]} 
                : chat
        ));
        
        setSelectedChat((prev) => ({
            ...prev,
            messages: [...prev.messages, fallbackResponse]
        }));
        
        return fallbackResponse;
    };

    return (
        <form onSubmit={sendPrompt}
         className={`w-full ${selectedChat?.messages.length > 0 ? "max-w-3xl" : "max-w-2xl"} bg-[#404045] p-4 rounded-3xl mt-4 transition-all`}>
            <textarea
            ref={textAreaRef}
            onKeyDown={handleKeyDown}
            className='outline-none w-full resize-none overflow-hidden break-words bg-transparent'
            rows={2}
            placeholder='Message ThinkNest' required 
            onChange={(e)=> setPrompt(e.target.value)} value={prompt}/>
            <div className='flex items-center justify-between pt-2'>
                <div className='flex items-center gap-2'>
                    {isLoading && <p className="text-xs text-gray-400">Thinking...</p>}
                    {selectedChat?.messages.length > 0 && (
                        <button 
                            type="button" 
                            onClick={retryLastPrompt} 
                            className="text-xs text-gray-400 hover:text-white"
                            disabled={isLoading}
                        >
                            Retry last message
                        </button>
                    )}
                </div>
                <button type='submit' className='p-1 px-3 border border-gray-500 rounded-lg' disabled={isLoading && !isRetrying}>
                    {isLoading ? 'Processing...' : 'Send'}
                </button>
            </div>
        </form>
    )
}

export default PromptBox
