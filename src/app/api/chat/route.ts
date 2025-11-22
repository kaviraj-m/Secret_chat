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

// GET - Retrieve all messages
export async function GET() {
  try {
    const messages = await getMessages();
    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error reading messages:', error);
    return NextResponse.json({ messages: [] }, { status: 200 });
  }
}

// POST - Add a new message
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, message } = body;
    
    if (!name || !message) {
      return NextResponse.json(
        { error: 'Name and message are required' },
        { status: 400 }
      );
    }
    
    // Get existing messages
    const messages = await getMessages();
    
    // Add new message with timestamp
    const newMessage = {
      id: Date.now().toString(),
      name,
      message,
      timestamp: new Date().toISOString(),
      reactions: {},
      edited: false,
    };
    
    messages.push(newMessage);
    
    // Save messages
    await saveMessages(messages);
    
    return NextResponse.json({ success: true, message: newMessage });
  } catch (error) {
    console.error('Error saving message:', error);
    return NextResponse.json(
      { error: 'Failed to save message' },
      { status: 500 }
    );
  }
}

// PATCH - Edit a message
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, message, name } = body;
    
    if (!id || !message || !name) {
      return NextResponse.json(
        { error: 'ID, message, and name are required' },
        { status: 400 }
      );
    }
    
    // Get existing messages
    const messages = await getMessages();
    
    // Find and update message
    const messageIndex = messages.findIndex((msg: any) => msg.id === id);
    
    if (messageIndex === -1) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }
    
    // Check if user owns the message
    if (messages[messageIndex].name !== name) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // Update message
    messages[messageIndex].message = message;
    messages[messageIndex].edited = true;
    messages[messageIndex].editedAt = new Date().toISOString();
    
    // Save messages
    await saveMessages(messages);
    
    return NextResponse.json({ success: true, message: messages[messageIndex] });
  } catch (error) {
    console.error('Error updating message:', error);
    return NextResponse.json(
      { error: 'Failed to update message' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a message
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const name = searchParams.get('name');
    
    if (!id || !name) {
      return NextResponse.json(
        { error: 'ID and name are required' },
        { status: 400 }
      );
    }
    
    // Get existing messages
    const messages = await getMessages();
    
    // Find message
    const messageIndex = messages.findIndex((msg: any) => msg.id === id);
    
    if (messageIndex === -1) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }
    
    // Check if user owns the message
    if (messages[messageIndex].name !== name) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // Remove message
    messages.splice(messageIndex, 1);
    
    // Save messages
    await saveMessages(messages);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json(
      { error: 'Failed to delete message' },
      { status: 500 }
    );
  }
}

// Clear all messages - separate route
export async function PUT(request: NextRequest) {
  try {
    // Clear all messages
    await saveMessages([]);
    
    return NextResponse.json({ success: true, message: 'All messages cleared' });
  } catch (error) {
    console.error('Error clearing messages:', error);
    return NextResponse.json(
      { error: 'Failed to clear messages' },
      { status: 500 }
    );
  }
}

