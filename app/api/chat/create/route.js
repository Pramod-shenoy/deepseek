import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req) {
    try {
        const { title = "New Chat" } = await req.json();

        const chat = await db.chat.create({
            data: {
                title,
                messages: {
                    create: {
                        content: "Hello! How can I help you today?",
                        role: "assistant"
                    }
                }
            },
            include: {
                messages: true
            }
        });

        return NextResponse.json({
            success: true,
            data: chat
        });
    } catch (error) {
        console.error("Error creating chat:", error);
        return NextResponse.json({
            success: false,
            message: error.message || "Failed to create chat"
        }, { status: 500 });
    }
}