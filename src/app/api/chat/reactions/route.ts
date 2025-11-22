import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const CHAT_FILE_PATH = path.join(process.cwd(), 'data', 'chat.json');

// Ensure data directory exists and initialize chat.json if it doesn't exist
async function ensureChatFile() {
  const dataDir = path.join(process.cwd(), 'data');
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
  
  try {
    await fs.access(CHAT_FILE_PATH);
  } catch {
    await fs.writeFile(CHAT_FILE_PATH, JSON.stringify({ messages: [] }, null, 2));
  }
}

// POST - Add or remove reaction
export async function POST(request: NextRequest) {
  try {
    await ensureChatFile();
    
    const body = await request.json();
    const { messageId, reaction, userName } = body;
    
    if (!messageId || !reaction || !userName) {
      return NextResponse.json(
        { error: 'Message ID, reaction, and user name are required' },
        { status: 400 }
      );
    }
    
    // Read existing messages
    const fileContents = await fs.readFile(CHAT_FILE_PATH, 'utf8');
    const data = JSON.parse(fileContents);
    
    // Find message
    const messageIndex = data.messages.findIndex((msg: any) => msg.id === messageId);
    
    if (messageIndex === -1) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }
    
    // Initialize reactions if not exists
    if (!data.messages[messageIndex].reactions) {
      data.messages[messageIndex].reactions = {};
    }
    
    // Initialize reaction if not exists
    if (!data.messages[messageIndex].reactions[reaction]) {
      data.messages[messageIndex].reactions[reaction] = [];
    }
    
    // Toggle reaction (add if not exists, remove if exists)
    const reactionIndex = data.messages[messageIndex].reactions[reaction].indexOf(userName);
    if (reactionIndex > -1) {
      // Remove reaction
      data.messages[messageIndex].reactions[reaction].splice(reactionIndex, 1);
      // Remove reaction key if empty
      if (data.messages[messageIndex].reactions[reaction].length === 0) {
        delete data.messages[messageIndex].reactions[reaction];
      }
    } else {
      // Add reaction
      data.messages[messageIndex].reactions[reaction].push(userName);
    }
    
    // Write back to file
    await fs.writeFile(CHAT_FILE_PATH, JSON.stringify(data, null, 2));
    
    return NextResponse.json({ 
      success: true, 
      reactions: data.messages[messageIndex].reactions 
    });
  } catch (error) {
    console.error('Error updating reaction:', error);
    return NextResponse.json(
      { error: 'Failed to update reaction' },
      { status: 500 }
    );
  }
}

