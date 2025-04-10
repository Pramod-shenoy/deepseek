'use client';
import { assets } from "@/assets/assets";
import Message from "@/components/Message";
import PromptBox from "@/components/PromptBox";
import Sidebar from "@/components/Sidebar";
import { useAppContext } from "@/context/AppContext";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useAuth } from "@clerk/nextjs";

export default function Home() {
  const [expand, setExpand] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState('unknown'); // 'online', 'offline', 'warning', 'unknown'
  const {selectedChat, user, createNewChat} = useAppContext();
  const { isSignedIn } = useAuth();
  const containerRef = useRef(null);

  useEffect(()=>{
    if(selectedChat){
      setMessages(selectedChat.messages);
    }
  },[selectedChat]);

  useEffect(()=>{
    if(containerRef.current){
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  },[messages]);

  // Check API status on component mount
  useEffect(() => {
    checkApiStatus();
  }, []);

  const checkApiStatus = async () => {
    try {
      setApiStatus('checking');
      toast.loading('Checking API status...', { id: 'apiStatusCheck' });
      
      // Use our dedicated status endpoint
      const response = await axios.get('/api/status');
      const data = response.data;
      
      console.log('API Status Check Result:', data);
      
      if (data.status === 'ok') {
        setApiStatus('online');
        toast.success('All services are online and responding', { id: 'apiStatusCheck' });
      } else if (data.status === 'warning') {
        setApiStatus('warning');
        toast.error(`Warning: ${data.checks.deepseek.message}`, { id: 'apiStatusCheck' });
      } else {
        setApiStatus('offline');
        const errorMessage = data.checks.deepseek.status === 'error' 
          ? data.checks.deepseek.message
          : data.checks.mongodb.status === 'error'
            ? data.checks.mongodb.message
            : 'Unknown error';
        toast.error(`API Status Error: ${errorMessage}`, { id: 'apiStatusCheck' });
      }
    } catch (error) {
      setApiStatus('offline');
      toast.error(`Could not check API status: ${error.message}`, { id: 'apiStatusCheck' });
      console.error('API Status Check Error:', error);
    }
  };

  // Get status color based on apiStatus
  const getStatusColor = () => {
    switch (apiStatus) {
      case 'online': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'offline': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const handleNewChat = () => {
    if (!isSignedIn) {
      toast.error("Please sign in to create a new chat");
      return;
    }
    createNewChat();
  };

  return (
    <div>
      <div className="flex h-screen">
        <Sidebar expand={expand} setExpand={setExpand}/>
        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8 bg-[#292a2d] text-white relative">
          <div className="md:hidden absolute px-4 top-6 flex items-center justify-between w-full">
            <Image onClick={()=> (expand ? setExpand(false) : setExpand(true))}
             className="rotate-180" src={assets.menu_icon} alt=""/>
            <Image className="opacity-70" src={assets.chat_icon} alt=""/>
          </div>

          {!selectedChat || messages.length === 0 ? (
            <>
            <div className="flex items-center gap-3">
              <Image src={assets.logo_icon} alt="" className="h-16"/>
              <p className="text-2xl font-medium">Hi, I'm ThinkNest.</p>
            </div>
            <p className="text-sm mt-2">How can I help you today?</p>
            <div className="mt-4 flex flex-col items-center gap-2">
              <button 
                onClick={checkApiStatus}
                className="text-xs bg-[#404045] hover:bg-[#4D4D52] py-1 px-3 rounded-md"
                disabled={apiStatus === 'checking'}
              >
                {apiStatus === 'checking' ? 'Checking...' : 'Check API Status'}
              </button>
              {apiStatus !== 'unknown' && (
                <p className={`text-xs mt-2 ${getStatusColor()}`}>
                  API Status: {apiStatus.charAt(0).toUpperCase() + apiStatus.slice(1)}
                </p>
              )}
              
              {!isSignedIn && (
                <p className="text-xs text-yellow-400 mt-2">
                  Please sign in to start chatting
                </p>
              )}
              
              {isSignedIn && (
                <button 
                  onClick={handleNewChat}
                  className="text-xs mt-3 bg-blue-600 hover:bg-blue-700 py-1 px-3 rounded-md"
                >
                  Start New Chat
                </button>
              )}
            </div>
            </>
          ):(
          <div ref={containerRef}
          className="relative flex flex-col items-center justify-start w-full mt-20 max-h-screen overflow-y-auto"
          > 
          <div className="fixed top-8 border border-transparent hover:border-gray-500/50 py-1 px-2 rounded-lg font-semibold mb-6 flex items-center">
            <span>{selectedChat.name}</span>
            <button 
              onClick={checkApiStatus}
              className="ml-3 text-xs bg-[#404045] hover:bg-[#4D4D52] py-0.5 px-2 rounded-md"
              disabled={apiStatus === 'checking'}
            >
              {apiStatus === 'checking' ? '...' : 'Check API'}
            </button>
            {apiStatus !== 'unknown' && (
              <span className={`ml-2 text-xs ${getStatusColor()}`}>
                • {apiStatus}
              </span>
            )}
            <button 
              onClick={handleNewChat}
              className="ml-3 text-xs bg-[#404045] hover:bg-[#4D4D52] py-0.5 px-2 rounded-md"
            >
              New Chat
            </button>
          </div>
          {messages.map((msg, index)=>(
            <Message key={index} role={msg.role} content={msg.content}/>
          ))}
          </div>
          )}
          <PromptBox isLoading={isLoading} setIsLoading={setIsLoading}/>
          <p className="text-xs absolute bottom-1 text-gray-500">AI-generated (mock responses), for demo only</p>
        </div>
      </div>
    </div>
  )
}
