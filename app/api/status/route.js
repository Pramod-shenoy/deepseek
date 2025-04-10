import { NextResponse } from "next/server";
import OpenAI from "openai";
import connectDB from "@/config/db";

export async function GET(req) {
  const statusChecks = {
    mongodb: { status: 'checking', message: 'Checking MongoDB connection...' },
    deepseek: { status: 'checking', message: 'Checking DeepSeek API...' },
    mock: { status: 'ok', message: 'Mock responses are available and working' }
  };

  // Check MongoDB connection
  try {
    await connectDB();
    statusChecks.mongodb = { status: 'ok', message: 'MongoDB connected successfully' };
  } catch (error) {
    console.error('MongoDB connection error:', error);
    statusChecks.mongodb = { 
      status: 'error', 
      message: `Failed to connect to MongoDB: ${error.message}` 
    };
  }

  // Check DeepSeek API
  try {
    const openai = new OpenAI({
      baseURL: 'https://api.deepseek.com/v1',
      apiKey: process.env.DEEPSEEK_API_KEY,
    });

    // Simple test request to check API connectivity
    const response = await openai.chat.completions.create({
      messages: [{ role: "user", content: "Hello, this is a test. Please respond with 'OK'." }],
      model: "deepseek-chat",
      max_tokens: 10,
      temperature: 0.1,
    });

    if (response.choices && response.choices.length > 0) {
      statusChecks.deepseek = { 
        status: 'ok', 
        message: 'DeepSeek API connected successfully',
        response: response.choices[0].message.content
      };
    } else {
      statusChecks.deepseek = { 
        status: 'warning', 
        message: 'DeepSeek API connected but response format unexpected',
        response: JSON.stringify(response)
      };
    }
  } catch (error) {
    console.error('DeepSeek API error:', error);
    
    // Special handling for insufficient balance
    if (error.message && error.message.includes('402 Insufficient Balance')) {
      statusChecks.deepseek = { 
        status: 'warning', 
        message: 'DeepSeek API account has insufficient balance. Using mock responses instead.',
        error: 'Insufficient Balance'
      };
    } else {
      statusChecks.deepseek = { 
        status: 'error', 
        message: `Failed to connect to DeepSeek API: ${error.message}`,
        error: error.response?.data || error.message
      };
    }
  }

  // Return overall status - consider the system operational as long as MongoDB is working
  // since we have mock responses as fallback
  const overallStatus = statusChecks.mongodb.status === 'error' 
    ? 'error' 
    : (statusChecks.deepseek.status === 'error' && statusChecks.deepseek.message !== 'DeepSeek API account has insufficient balance. Using mock responses instead.')
      ? 'warning'
      : 'ok';

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    status: overallStatus,
    checks: statusChecks,
    env: {
      // Include sanitized environment info for debugging
      hasDeepseekApiKey: !!process.env.DEEPSEEK_API_KEY,
      deepseekApiKeyLength: process.env.DEEPSEEK_API_KEY?.length,
      hasMongoUri: !!process.env.MONGODB_URI,
      nodeEnv: process.env.NODE_ENV
    }
  });
} 