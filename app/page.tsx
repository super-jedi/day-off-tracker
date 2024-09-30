'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [username, setUsername] = useState('')
  const [dayOfWeek, setDayOfWeek] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClientComponentClient()

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase
      .from('day_off_requests')
      .insert({ username, day_of_week: dayOfWeek })
    
    if (error) {
      console.error('Supabase error:', error)
      setMessage(`Error submitting request: ${error.message}`)
    } else {
      setMessage('Request submitted successfully')
      setUsername('')
      setDayOfWeek('')
    }
    router.refresh()
  }

  return (
    <div className="h-full bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-center text-black">Cracked Devs <br />Employee Day Off Request</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-black">Telegram Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border-gray-700 border-solid border p-3 bg-white text-gray-700"
            />
          </div>
          <div>
            <label htmlFor="dayOfWeek" className="block text-sm font-medium text-gray-700">Day of Week</label>
            <select
              id="dayOfWeek"
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border-gray-700 border-solid border p-3 bg-white text-gray-700"
            >
              <option value="">Select a day</option>
              {daysOfWeek.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="w-full bg-black text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-black focus:ring-opacity-50"
          >
            Submit Request
          </button>
        </form>
        {message && <p className="mt-4 text-center text-sm text-gray-600">{message}</p>}
      </div>
    </div>
  )
}