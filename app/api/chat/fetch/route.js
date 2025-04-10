import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req) {
    try {
        const chats = await db.chat.findMany({
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                messages: {
                    orderBy: {
                        createdAt: 'asc'
                    }
                }
            }
        });

        return NextResponse.json({
            success: true,
            data: chats
        });
    } catch (error) {
        console.error("Error fetching chats:", error);
        return NextResponse.json({
            success: false,
            message: error.message || "Failed to fetch chats"
        }, { status: 500 });
    }
} 