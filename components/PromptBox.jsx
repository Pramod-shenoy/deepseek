import { assets } from '@/assets/assets'
import { useAppContext } from '@/context/AppContext';
import axios from 'axios';
import Image from 'next/image'
import React, { useState, useRef, useEffect } from 'react'
import toast from 'react-hot-toast';
import VoiceAssistant from './VoiceAssistant';

const PromptBox = ({setIsLoading, isLoading}) => {

    const [prompt, setPrompt] = useState('');
    const {user, chats, setChats, selectedChat, setSelectedChat} = useAppContext();
    const [isRetrying, setIsRetrying] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const textAreaRef = useRef(null);

    // Handle window focus/blur for speech recognition
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && isListening) {
                // Stop listening when tab becomes inactive
                setIsListening(false);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [isListening]);

    const handleKeyDown = (e)=>{
        if(e.key === "Enter" && !e.shiftKey){
            e.preventDefault();
            sendPrompt(e);
        }
    }

    const handleTranscript = (transcript) => {
        setPrompt(transcript);
        setTimeout(() => {
            // Auto-send after a brief delay
            sendPrompt({ preventDefault: () => {} });
        }, 500);
    };

    // Function to speak response text
    const speakResponse = (text) => {
        if (!text || isSpeaking) return;
        
        // Clean up the text for better speech
        const cleanText = text
            .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
            .replace(/```[^`]*```/g, 'code block') // Replace code blocks
            .replace(/\n\n/g, '. ') // Replace double newlines with periods
            .replace(/\n/g, ' ') // Replace single newlines with spaces
            .replace(/\s+/g, ' '); // Normalize whitespace
        
        if ('speechSynthesis' in window) {
            setIsSpeaking(true);
            
            // Use Web Speech API for text-to-speech
            const utterance = new SpeechSynthesisUtterance(cleanText);
            utterance.lang = 'en-US';
            utterance.onend = () => {
                setIsSpeaking(false);
            };
            
            window.speechSynthesis.cancel(); // Cancel any ongoing speech
            window.speechSynthesis.speak(utterance);
        } else {
            toast.error('Text-to-speech is not supported in your browser');
        }
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

    const sendPrompt = async (e)=>{
        const promptCopy = prompt;

        try {
            e.preventDefault();
            if(!user) return toast.error('Login to send message');
            if(isLoading && !isRetrying) return toast.error('Wait for the previous prompt response');
            if(!selectedChat) return toast.error('No chat selected');

            setIsLoading(true);
            setIsRetrying(false);
            if (!isRetrying) {
                setPrompt("");
            }

            const userPrompt = {
                role: "user",
                content: promptCopy,
                timestamp: Date.now(),
            };

            // Don't add user prompt again if retrying
            if (!isRetrying) {
                // saving user prompt in chats array
                setChats((prevChats)=> prevChats.map((chat)=> chat._id === selectedChat._id ?
                {
                    ...chat,
                    messages: [...chat.messages, userPrompt]
                }: chat
                ));
                
                // saving user prompt in selected chat
                setSelectedChat((prev)=> ({
                    ...prev,
                    messages: [...prev.messages, userPrompt]
                }));
            }

            console.log("Sending request to API with chatId:", selectedChat._id, "and prompt:", promptCopy);
            
            try {
                const response = await axios.post('/api/chat/ai', {
                    chatId: selectedChat._id,
                    prompt: promptCopy
                }, { 
                    timeout: 15000 // 15 second timeout
                });
                
                const {data} = response;
                console.log("API response:", data);

                if(data.success){
                    if (data.warning) {
                        console.warn("API Warning:", data.warning);
                        toast.error("API Warning: " + data.warning, { duration: 3000 });
                    }

                    setChats((prevChats)=>prevChats.map((chat)=>
                        chat._id === selectedChat._id 
                            ? {...chat, messages: [...chat.messages, data.data]} 
                            : chat
                    ));

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

                            // When the message is complete, read it aloud
                            if (i === messageTokens.length - 1) {
                                speakResponse(assistantMessage.content);
                            }
                        }, i * 100);
                    }
                } else {
                    // API returned an error
                    console.error("API returned error:", data.error || data.message);
                    toast.error(data.error || data.message || "Failed to get response");
                    
                    // Use fallback if API fails
                    createFallbackResponse(userPrompt);
                }
            } catch (apiError) {
                console.error("API call failed:", apiError);
                toast.error("Could not connect to the AI service. Check your network connection.");
                
                // Use fallback if API fails
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
        
        // Find the last user message
        const userMessages = selectedChat.messages.filter(msg => msg.role === 'user');
        if (userMessages.length === 0) return;
        
        const lastUserMessage = userMessages[userMessages.length - 1];
        
        // Set the retry flag and prompt to the last user message
        setIsRetrying(true);
        setPrompt(lastUserMessage.content);
        
        // Remove the last assistant message if it exists
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
        
        // Trigger send with the last user message
        sendPrompt({ preventDefault: () => {} });
    };

    const readLastAssistantMessage = () => {
        if (selectedChat?.messages?.length > 0) {
            // Find the last assistant message
            for (let i = selectedChat.messages.length - 1; i >= 0; i--) {
                if (selectedChat.messages[i].role === 'assistant') {
                    speakResponse(selectedChat.messages[i].content);
                    break;
                }
            }
        }
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
                    <div className="flex items-center gap-2">
                        <button 
                            type="button" 
                            onClick={retryLastPrompt} 
                            className="text-xs text-gray-400 hover:text-white"
                            disabled={isLoading}
                        >
                            Retry last message
                        </button>
                        <button
                            type="button"
                            onClick={readLastAssistantMessage}
                            className="text-xs text-gray-400 hover:text-white"
                            disabled={isLoading || isSpeaking}
                            title="Read last response aloud"
                        >
                            Read aloud
                        </button>
                    </div>
                )}
                
                {/* Integrate Voice Assistant */}
                <VoiceAssistant 
                    onTranscript={handleTranscript} 
                    isListening={isListening}
                    setIsListening={setIsListening}
                    isSpeaking={isSpeaking}
                    setIsSpeaking={setIsSpeaking}
                />
            </div>
            <button type='submit' className='p-1 px-3 border border-gray-500 rounded-lg' disabled={isLoading && !isRetrying}>
                {isLoading ? 'Processing...' : 'Send'}
            </button>
        </div>
    </form>
  )
}

export default PromptBox
