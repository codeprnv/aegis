import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Create a 303 redirect to the login page
  const response = NextResponse.redirect(new URL('/login', request.url), 303);
  
  // Clear the cookies
  response.cookies.delete('access_token');
  response.cookies.delete('refresh_token');
  
  return response;
}
