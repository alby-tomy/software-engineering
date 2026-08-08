from fastapi import APIRouter

from pulsegrid.api.auth import LoginRequest, TokenResponse, authenticate_user, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest) -> TokenResponse:
    user = authenticate_user(body.username, body.password)
    if user is None:
        from fastapi import HTTPException

        raise HTTPException(status_code=401, detail="Invalid credentials")
    return TokenResponse(access_token=create_access_token(user))
