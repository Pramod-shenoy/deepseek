"use client";
import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

export const AppContext = createContext();

export const useAppContext = ()=>{
    return useContext(AppContext)
}

export const AppContextProvider = ({children})=>{
    const [chats, setChats] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const createNewChat = async ()=>{
        try {
            setIsLoading(true);
            const response = await axios.post('/api/chat/create');
            
            if (response.data.success) {
                toast.success("New chat created");
                await fetchUsersChats();
            } else {
                toast.error(response.data.message || "Failed to create chat");
            }
        } catch (error) {
            console.error("Error creating chat:", error);
            toast.error(error.message || "Failed to create chat");
        } finally {
            setIsLoading(false);
        }
    }

    const fetchUsersChats = async ()=>{
        try {
            setIsLoading(true);
            const {data} = await axios.get('/api/chat/get');
            
            if(data.success){
                console.log("Fetched chats:", data.data);
                setChats(data.data);

                // If there are no chats, create one
                if(data.data.length === 0){
                    await createNewChat();
                    return;
                } else {
                    // sort chats by updated date
                    const sortedChats = [...data.data].sort(
                        (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
                    );
                    
                    // set recently updated chat as selected chat
                    setSelectedChat(sortedChats[0]);
                    console.log("Selected chat:", sortedChats[0]);
                }
            } else {
                toast.error(data.message || "Failed to fetch chats");
            }
        } catch (error) {
            console.error("Error fetching chats:", error);
            toast.error(error.message || "Failed to fetch chats");
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        fetchUsersChats();
    }, []);

    const value = {
        chats,
        setChats,
        selectedChat,
        setSelectedChat,
        fetchUsersChats,
        createNewChat,
        isLoading
    }
    
    return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}