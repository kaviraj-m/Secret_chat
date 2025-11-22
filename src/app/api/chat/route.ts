import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Use /tmp on Vercel (writable), fallback to project directory for local dev
const CHAT_FILE_PATH = process.env.VERCEL 
  ? path.join('/tmp', 'chat.json')
  : path.join(process.cwd(), 'data', 'chat.json');

// Ensure data directory exists and initialize chat.json if it doesn't exist
async function ensureChatFile() {
  try {
    await fs.access(CHAT_FILE_PATH);
  } catch {
    // File doesn't exist, create it with empty messages
    await fs.writeFile(CHAT_FILE_PATH, JSON.stringify({ messages: [] }, null, 2), 'utf8');
  }
}

// GET - Retrieve all messages
export async function GET() {
  try {
    await ensureChatFile();
    const fileContents = await fs.readFile(CHAT_FILE_PATH, 'utf8');
    const data = JSON.parse(fileContents);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reading chat file:', error);
    return NextResponse.json({ messages: [] }, { status: 200 });
  }
}

// POST - Add a new message
export async function POST(request: NextRequest) {
  try {
    await ensureChatFile();
    
    const body = await request.json();
    const { name, message } = body;
    
    if (!name || !message) {
      return NextResponse.json(
        { error: 'Name and message are required' },
        { status: 400 }
      );
    }
    
    // Read existing messages
    const fileContents = await fs.readFile(CHAT_FILE_PATH, 'utf8');
    const data = JSON.parse(fileContents);
    
    // Add new message with timestamp
    const newMessage = {
      id: Date.now().toString(),
      name,
      message,
      timestamp: new Date().toISOString(),
      reactions: {},
      edited: false,
    };
    
    data.messages.push(newMessage);
    
    // Write back to file
    await fs.writeFile(CHAT_FILE_PATH, JSON.stringify(data, null, 2));
    
    return NextResponse.json({ success: true, message: newMessage });
  } catch (error) {
    console.error('Error writing to chat file:', error);
    return NextResponse.json(
      { error: 'Failed to save message' },
      { status: 500 }
    );
  }
}

// PATCH - Edit a message
export async function PATCH(request: NextRequest) {
  try {
    await ensureChatFile();
    
    const body = await request.json();
    const { id, message, name } = body;
    
    if (!id || !message || !name) {
      return NextResponse.json(
        { error: 'ID, message, and name are required' },
        { status: 400 }
      );
    }
    
    // Read existing messages
    const fileContents = await fs.readFile(CHAT_FILE_PATH, 'utf8');
    const data = JSON.parse(fileContents);
    
    // Find and update message
    const messageIndex = data.messages.findIndex((msg: any) => msg.id === id);
    
    if (messageIndex === -1) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }
    
    // Check if user owns the message
    if (data.messages[messageIndex].name !== name) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // Update message
    data.messages[messageIndex].message = message;
    data.messages[messageIndex].edited = true;
    data.messages[messageIndex].editedAt = new Date().toISOString();
    
    // Write back to file
    await fs.writeFile(CHAT_FILE_PATH, JSON.stringify(data, null, 2));
    
    return NextResponse.json({ success: true, message: data.messages[messageIndex] });
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
    await ensureChatFile();
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const name = searchParams.get('name');
    
    if (!id || !name) {
      return NextResponse.json(
        { error: 'ID and name are required' },
        { status: 400 }
      );
    }
    
    // Read existing messages
    const fileContents = await fs.readFile(CHAT_FILE_PATH, 'utf8');
    const data = JSON.parse(fileContents);
    
    // Find message
    const messageIndex = data.messages.findIndex((msg: any) => msg.id === id);
    
    if (messageIndex === -1) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }
    
    // Check if user owns the message
    if (data.messages[messageIndex].name !== name) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // Remove message
    data.messages.splice(messageIndex, 1);
    
    // Write back to file
    await fs.writeFile(CHAT_FILE_PATH, JSON.stringify(data, null, 2));
    
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
    await ensureChatFile();
    
    // Read existing messages
    const fileContents = await fs.readFile(CHAT_FILE_PATH, 'utf8');
    const data = JSON.parse(fileContents);
    
    // Clear all messages
    data.messages = [];
    
    // Write back to file
    await fs.writeFile(CHAT_FILE_PATH, JSON.stringify(data, null, 2));
    
    return NextResponse.json({ success: true, message: 'All messages cleared' });
  } catch (error) {
    console.error('Error clearing messages:', error);
    return NextResponse.json(
      { error: 'Failed to clear messages' },
      { status: 500 }
    );
  }
}

