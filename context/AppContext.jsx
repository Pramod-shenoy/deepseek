"use client";
import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import { createContext, useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";

export const AppContext = createContext();

export const useAppContext = ()=>{
    return useContext(AppContext)
}

export const AppContextProvider = ({children})=>{
    const {user} = useUser()
    const {getToken} = useAuth()

    const [chats, setChats] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const createNewChat = async ()=>{
        try {
            if(!user) {
                toast.error("Please sign in to create a new chat");
                return null;
            }

            setIsLoading(true);
            const token = await getToken();

            const response = await axios.post('/api/chat/create', {}, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

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
            if (!user) return;
            
            setIsLoading(true);
            const token = await getToken();
            
            const {data} = await axios.get('/api/chat/get', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            
            if(data.success){
                console.log("Fetched chats:", data.data);
                setChats(data.data);

                // If the user has no chats, create one
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
        if(user){
            fetchUsersChats();
        } else {
            // Clear data when user logs out
            setChats([]);
            setSelectedChat(null);
        }
    }, [user]);

    const value = {
        user,
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