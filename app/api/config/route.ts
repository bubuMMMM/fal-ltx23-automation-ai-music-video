import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    hasFalKey: !!process.env.FAL_KEY,
  })
}
