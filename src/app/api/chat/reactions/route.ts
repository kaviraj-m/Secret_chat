import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { kv } from '@vercel/kv';

// Use Vercel KV on Vercel (persistent), fallback to file system for local dev
const USE_KV = !!process.env.KV_REST_API_URL;

const CHAT_FILE_PATH = path.join(process.cwd(), 'data', 'chat.json');
const KV_KEY = 'chat:messages';

// Get messages from storage
async function getMessages() {
  if (USE_KV) {
    try {
      const messages = await kv.get<Array<any>>(KV_KEY);
      return messages || [];
    } catch (error) {
      console.error('Error reading from KV:', error);
      return [];
    }
  } else {
    // Local file system
    try {
      await fs.access(CHAT_FILE_PATH);
      const fileContents = await fs.readFile(CHAT_FILE_PATH, 'utf8');
      const data = JSON.parse(fileContents);
      return data.messages || [];
    } catch {
      return [];
    }
  }
}

// Save messages to storage
async function saveMessages(messages: Array<any>) {
  if (USE_KV) {
    try {
      await kv.set(KV_KEY, messages);
    } catch (error) {
      console.error('Error writing to KV:', error);
      throw error;
    }
  } else {
    // Local file system
    const dataDir = path.join(process.cwd(), 'data');
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }
    await fs.writeFile(CHAT_FILE_PATH, JSON.stringify({ messages }, null, 2), 'utf8');
  }
}

// POST - Add or remove reaction
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messageId, reaction, userName } = body;
    
    if (!messageId || !reaction || !userName) {
      return NextResponse.json(
        { error: 'Message ID, reaction, and user name are required' },
        { status: 400 }
      );
    }
    
    // Get existing messages
    const messages = await getMessages();
    
    // Find message
    const messageIndex = messages.findIndex((msg: any) => msg.id === messageId);
    
    if (messageIndex === -1) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }
    
    // Initialize reactions if not exists
    if (!messages[messageIndex].reactions) {
      messages[messageIndex].reactions = {};
    }
    
    // Initialize reaction if not exists
    if (!messages[messageIndex].reactions[reaction]) {
      messages[messageIndex].reactions[reaction] = [];
    }
    
    // Toggle reaction (add if not exists, remove if exists)
    const reactionIndex = messages[messageIndex].reactions[reaction].indexOf(userName);
    if (reactionIndex > -1) {
      // Remove reaction
      messages[messageIndex].reactions[reaction].splice(reactionIndex, 1);
      // Remove reaction key if empty
      if (messages[messageIndex].reactions[reaction].length === 0) {
        delete messages[messageIndex].reactions[reaction];
      }
    } else {
      // Add reaction
      messages[messageIndex].reactions[reaction].push(userName);
    }
    
    // Save messages
    await saveMessages(messages);
    
    return NextResponse.json({ 
      success: true, 
      reactions: messages[messageIndex].reactions 
    });
  } catch (error) {
    console.error('Error updating reaction:', error);
    return NextResponse.json(
      { error: 'Failed to update reaction' },
      { status: 500 }
    );
  }
}
