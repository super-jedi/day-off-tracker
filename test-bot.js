import { createClient } from '@supabase/supabase-js'
import TelegramBot from 'node-telegram-bot-api'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from .env.local
dotenv.config({ path: resolve(__dirname, '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false })

async function sendDayOffRequests() {
  try {
    console.log('Fetching day off requests from Supabase...')

    const tableName = 'day_off_requests' // Make sure this matches your actual table name

    const { data, error } = await supabase
      .from(tableName)
      .select('username, day_of_week')
      .order('day_of_week', { ascending: true })

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }

    if (!data || data.length === 0) {
      await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, 'No day off requests found.')
      return
    }

    let message = 'Current day off requests:\n\n'

    data.forEach((request) => {
      message += `${request.username} will be off work on ${request.day_of_week}\n`
    })

    // Split message if it's too long for a single Telegram message
    const maxLength = 4096
    for (let i = 0; i < message.length; i += maxLength) {
      const chunk = message.slice(i, i + maxLength)
      await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, chunk)
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
    await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, errorMessage)
  }
}

async function runBot() {
  await sendDayOffRequests()
}

// Run the bot immediately
runBot()

// Then run it every hour
setInterval(runBot, 60 * 60 * 1000)

console.log('Bot started. Running every hour.')

export default function Component() {
  return null // This component doesn't render anything
}