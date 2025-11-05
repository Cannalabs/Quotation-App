"""
Centralized exception handlers for the application.
Logs full errors server-side, returns generic messages to clients.
"""
import logging
import traceback
from typing import Union
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import IntegrityError, DatabaseError, SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """
    Handle request validation errors (Pydantic validation failures).
    Logs full validation details server-side, returns generic message to client.
    """
    # Log full validation errors server-side
    logger.warning(
        f"Validation error on {request.method} {request.url.path}",
        extra={
            "errors": exc.errors(),
            "body": exc.body,
            "client": request.client.host if request.client else None,
        }
    )
    
    # Return generic error message to client
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "Invalid request data. Please check your input and try again.",
            "error": "validation_error"
        }
    )


async def database_exception_handler(request: Request, exc: Union[IntegrityError, DatabaseError, SQLAlchemyError]) -> JSONResponse:
    """
    Handle database-related exceptions.
    Logs full database error server-side, returns generic message to client.
    """
    # Log full database error with traceback
    logger.error(
        f"Database error on {request.method} {request.url.path}",
        exc_info=True,
        extra={
            "error_type": type(exc).__name__,
            "error_message": str(exc),
            "client": request.client.host if request.client else None,
        }
    )
    
    # Determine generic message based on error type
    if isinstance(exc, IntegrityError):
        # Common integrity errors (duplicate key, foreign key constraint, etc.)
        error_msg = str(exc.orig) if hasattr(exc, 'orig') else str(exc)
        if "unique" in error_msg.lower() or "duplicate" in error_msg.lower():
            generic_message = "A record with this information already exists."
        elif "foreign key" in error_msg.lower() or "constraint" in error_msg.lower():
            generic_message = "This operation would violate data integrity constraints."
        else:
            generic_message = "Database operation failed. Please try again."
    else:
        generic_message = "Database operation failed. Please try again."
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": generic_message,
            "error": "database_error"
        }
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """
    Handle HTTP exceptions (401, 403, 404, etc.).
    For 401/403/404, we keep the detail message (it's already generic).
    For other status codes, we log and return generic message.
    """
    # Client errors (4xx) - log warning, keep detail message
    if 400 <= exc.status_code < 500:
        logger.warning(
            f"HTTP {exc.status_code} on {request.method} {request.url.path}",
            extra={
                "detail": exc.detail,
                "client": request.client.host if request.client else None,
            }
        )
        # For 401, 403, 404 - keep the detail message (already generic)
        if exc.status_code in [401, 403, 404]:
            return JSONResponse(
                status_code=exc.status_code,
                content={"detail": exc.detail},
                headers=getattr(exc, "headers", None)
            )
        # For 400 errors, preserve the original detail message (may contain validation info)
        # This allows tests and clients to get specific error information
        if exc.status_code == 400:
            return JSONResponse(
                status_code=exc.status_code,
                content={"detail": exc.detail},
                headers=getattr(exc, "headers", None)
            )
        # For other 4xx errors (422, etc.), return generic message
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "detail": "Invalid request. Please check your input and try again.",
                "error": "client_error"
            },
            headers=getattr(exc, "headers", None)
        )
    
    # Server errors (5xx) - log error with full details
    logger.error(
        f"HTTP {exc.status_code} on {request.method} {request.url.path}",
        exc_info=True,
        extra={
            "detail": exc.detail,
            "client": request.client.host if request.client else None,
        }
    )
    
    # Return generic error message
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": "An internal server error occurred. Please try again later.",
            "error": "server_error"
        },
        headers=getattr(exc, "headers", None)
    )


async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Catch-all handler for any unhandled exceptions.
    Logs full error with traceback server-side, returns generic message to client.
    """
    # Log full exception with traceback
    logger.error(
        f"Unhandled exception on {request.method} {request.url.path}",
        exc_info=True,
        extra={
            "exception_type": type(exc).__name__,
            "exception_message": str(exc),
            "traceback": traceback.format_exc(),
            "client": request.client.host if request.client else None,
        }
    )
    
    # Return generic error message
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An unexpected error occurred. Please try again later.",
            "error": "internal_error"
        }
    )

