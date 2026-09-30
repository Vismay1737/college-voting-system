import asyncio
from app.database import async_session_factory
from app.models.admin import Admin
from app.utils.security import verify_password
from sqlalchemy import select

async def test():
    async with async_session_factory() as session:
        res = await session.execute(select(Admin))
        admins = res.scalars().all()
        print("Admins found in DB:")
        for a in admins:
            ok = verify_password("vismayvm943@", a.password_hash)
            print(f" - Username: '{a.username}', Active: {a.is_active}, Password 'vismayvm943@' valid? -> {ok}")

if __name__ == "__main__":
    asyncio.run(test())
