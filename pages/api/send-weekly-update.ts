import { createClient } from '@supabase/supabase-js'
import TelegramBot from 'node-telegram-bot-api'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, { polling: false })

async function sendDayOffRequests() {
  try {
    console.log('Fetching day off requests from Supabase...')

    const tableName = 'day_off_requests' // Make sure this matches your actual table name
    const today = new Date().toISOString().split('T')[0] // Get today's date in YYYY-MM-DD format

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .gte('date', today)
      .order('date', { ascending: true })

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }

    if (!data || data.length === 0) {
      await bot.sendMessage(process.env.TELEGRAM_CHAT_ID!, 'No day off requests found starting from today.')
      return
    }

    let message = `Day off requests starting from ${today}:\n\n`

    data.forEach((request) => {
      message += `${request.username} will be off work on ${request.date}\n`
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
    if (error.code === '42P01') {
      errorMessage += 'The specified table does not exist. Please check your table name and Supabase configuration.'
    } else if (error.code === '42501') {
      errorMessage += 'Permission denied. Please check your Supabase API key and table permissions.'
    } else {
      errorMessage += `Error details: ${error.message}`
    }
    await bot.sendMessage(process.env.TELEGRAM_CHAT_ID!, errorMessage)
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await sendDayOffRequests()
  res.status(200).json({ message: 'Day off requests sent successfully' })
}