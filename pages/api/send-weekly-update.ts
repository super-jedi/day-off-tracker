import { createClient } from '@supabase/supabase-js'
import TelegramBot from 'node-telegram-bot-api'
import type { VercelRequest, VercelResponse } from '@vercel/node'

// Define types for your data
type DayOffRequest = {
  id: number;
  username: string;
  day_of_week: string;
  created_at: string;
  
}

// Define the database type
type Database = {
  day_off_requests: DayOffRequest;
  // Add other tables if necessary
}

// Initialize Supabase client
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Initialize Telegram bot
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, { polling: false })

async function sendDayOffRequests() {
  try {
    console.log('Fetching day off requests from Supabase...')

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoISO = sevenDaysAgo.toISOString();

    const { data, error } = await supabase
      .from('day_off_requests')
      .select('username, day_of_week, created_at')
      .gte('created_at', sevenDaysAgoISO)
      .order('day_of_week', { ascending: true })

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }

    if (!data || data.length === 0) {
      await bot.sendMessage(process.env.TELEGRAM_CHAT_ID!, 'No day off requests for this week.')
      return
    }

    let message = 'Day off requests for this week:\n\n'

    data.forEach((request) => {
      const requestDate = new Date(request.created_at).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
      message += `${request.username} will be off work on ${request.day_of_week}\n`
    })

    // Split message if it's too long for a single Telegram message
    const maxLength = 4096
    for (let i = 0; i < message.length; i += maxLength) {
      const chunk = message.slice(i, i + maxLength)
      await bot.sendMessage(process.env.TELEGRAM_CHAT_ID!, chunk)
    }


    console.log('Day off requests sent successfully')
  } catch (error) {
    console.error('Error fetching and sending day off requests:', error)
    let errorMessage = 'Error occurred while fetching day off requests. '
    
    if (error instanceof Error) {
      if ('code' in error) {
        switch (error.code) {
          case '42P01':
            errorMessage += 'The specified table does not exist. Please check your table name and Supabase configuration.'
            break
          case '42501':
            errorMessage += 'Permission denied. Please check your Supabase API key and table permissions.'
            break
          default:
            errorMessage += `Unexpected error occurred: ${error.message}`
        }
      } else {
        errorMessage += error.message
      }
    } else {
      errorMessage += 'An unknown error occurred.'
    }
    
    await bot.sendMessage(process.env.TELEGRAM_CHAT_ID!, errorMessage)
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    // This allows you to test the function via a browser or curl
    res.status(200).json({ message: 'Send weekly update function is ready.' })
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    await sendDayOffRequests()
    res.status(200).json({ message: 'Day off requests sent successfully' })
  } catch (error) {
    console.error('Error in API handler:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}