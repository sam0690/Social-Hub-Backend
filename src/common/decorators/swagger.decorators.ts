import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

export function ApiAuthEndpoint(
  summary: string,
  responses?: {
    ok?: string;
    created?: string;
    notFound?: string;
    conflict?: string;
    badRequest?: string;
    forbidden?: string;
  },
) {
  const decorators = [
    ApiBearerAuth('access-token'),
    ApiOperation({ summary }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
  ];

  if (responses?.ok)
    decorators.push(ApiResponse({ status: 200, description: responses.ok }));
  if (responses?.created)
    decorators.push(
      ApiResponse({ status: 201, description: responses.created }),
    );
  if (responses?.notFound)
    decorators.push(
      ApiResponse({ status: 404, description: responses.notFound }),
    );
  if (responses?.conflict)
    decorators.push(
      ApiResponse({ status: 409, description: responses.conflict }),
    );
  if (responses?.badRequest)
    decorators.push(
      ApiResponse({ status: 400, description: responses.badRequest }),
    );
  if (responses?.forbidden)
    decorators.push(
      ApiResponse({ status: 403, description: responses.forbidden }),
    );

  return applyDecorators(...decorators);
}

export function ApiPublicEndpoint(
  summary: string,
  responses?: {
    ok?: string;
    created?: string;
    notFound?: string;
    conflict?: string;
    badRequest?: string;
  },
) {
  const decorators = [ApiOperation({ summary })];

  if (responses?.ok)
    decorators.push(ApiResponse({ status: 200, description: responses.ok }));
  if (responses?.created)
    decorators.push(
      ApiResponse({ status: 201, description: responses.created }),
    );
  if (responses?.notFound)
    decorators.push(
      ApiResponse({ status: 404, description: responses.notFound }),
    );
  if (responses?.conflict)
    decorators.push(
      ApiResponse({ status: 409, description: responses.conflict }),
    );
  if (responses?.badRequest)
    decorators.push(
      ApiResponse({ status: 400, description: responses.badRequest }),
    );

  return applyDecorators(...decorators);
}
