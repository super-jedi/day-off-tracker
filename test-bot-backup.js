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

async function sendHiMessage() {
  try {
    console.log('Sending Hi message...')
    await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, 'Hi! This is a test message.')
    console.log('Hi message sent successfully')
  } catch (error) {
    console.error('Error sending Hi message:', error)
  }
}

async function fetchAndSendTableContents() {
  try {
    console.log('Fetching table contents from Supabase...')
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)

    const tableName = 'day_off_requests' // Change this to your actual table name
    console.log('Querying table:', tableName)

    // First, let's check if we can access the table at all
    const { error: tableError } = await supabase
      .from(tableName)
      .select('count', { count: 'exact' })

    if (tableError) {
      console.error('Error accessing table:', tableError)
      throw new Error(`Unable to access table: ${tableError.message}`)
    }

    // If we can access the table, let's try to fetch its contents
    const { data, error, status, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact' })

    console.log('Query status:', status)
    console.log('Row count:', count)

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }

    console.log('Supabase response data type:', typeof data)
    console.log('Supabase response data length:', data ? data.length : 'N/A')
    console.log('Supabase response data:', JSON.stringify(data, null, 2))

    let message = `Contents of table '${tableName}':\n\n`
    if (!data || data.length === 0) {
      message += `The query returned no results. Row count: ${count}. This could be due to:\n`
      message += '1. The table is actually empty\n'
      message += '2. There might be an issue with permissions\n'
      message += '3. There might be an issue with the query\n'
      message += 'Please check your Supabase setup and table configuration.'
    } else {
      message += `Found ${data.length} rows. Total row count: ${count}\n\n`
      data.forEach((row, index) => {
        message += `Row ${index + 1}:\n`
        Object.entries(row).forEach(([key, value]) => {
          message += `  ${key}: ${value}\n`
        })
        message += '\n'
      })
    }

    // Split message if it's too long for a single Telegram message
    const maxLength = 4096
    for (let i = 0, j = 1; i < message.length; i += maxLength, j++) {
      const chunk = message.slice(i, i + maxLength)
      console.log(`Sending message chunk ${j}/${Math.ceil(message.length/maxLength)}`)
      await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, chunk)
    }

    console.log('Table contents sent successfully')
  } catch (error) {
    console.error('Error fetching and sending table contents:', error)
    let errorMessage = 'Error occurred while fetching table contents. '
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
  await sendHiMessage()
  await fetchAndSendTableContents()
}

// Run the bot immediately
runBot()

// Then run it every 15 seconds
setInterval(runBot, 15 * 1000)

console.log('Bot started. Running every 15 seconds.')