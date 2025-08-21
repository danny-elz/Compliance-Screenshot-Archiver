from fastapi import HTTPException, status


class NotFound(HTTPException):
    """404 Not Found exception."""

    def __init__(self, detail: str = "Not found"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class Forbidden(HTTPException):
    """403 Forbidden exception."""

    def __init__(self, detail: str = "Forbidden"):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)
