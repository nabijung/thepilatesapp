// src/app/api/clients/[clientId]/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { getUserFromToken } from '@/services/auth.service';
import { getClientDetails } from '@/services/client.service';
import { verifyClientStudioAccess } from '@/services/studio.service';
import { ServiceError } from '@/types/index';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ clientId: string }> }
) {

  // return instructorAuthMiddleware(request, async(req) => {
    try {
      const { clientId } = await context.params;

      const { searchParams } = new URL(request.url);
      const studioId = searchParams.get('studioId');

      if (!studioId) {
        return NextResponse.json(
          { success: false, message: 'Studio ID is required' },
          { status: 400 }
        );
      }

       // Get the current user from the token
       const token = request.cookies.get('auth-token')?.value;
       if (!token) {
         return NextResponse.json(
           { success: false, message: 'Not authenticated' },
           { status: 401 }
         );
       }

       const user = await getUserFromToken(token);

       if (!user) {
         return NextResponse.json(
           { success: false, message: 'Invalid token' },
           { status: 401 }
         );
       }

       // Verify access authorization
       const hasAccess = await verifyClientStudioAccess(clientId, studioId, String(user.user?.id));

       if (!hasAccess) {
         return NextResponse.json(
           { success: false, message: 'Unauthorized to access this client' },
           { status: 403 }
         );
       }

       // Now that we've verified authorization, get the client details
       const client = await getClientDetails(clientId, studioId);

      return NextResponse.json(client);
    } catch (error: unknown) {
      const err = error as ServiceError
      console.error('API error:', error);

      return NextResponse.json(
        { success: false, message: err.message || 'Failed to fetch client details' },
        { status: 500 }
      );
    }
  // })

}