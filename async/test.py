import asyncio

async def make_pasta():
    print("   [주방] 🍝 파스타 시작 (3초)")
    await asyncio.sleep(3)
    print("   [주방] 🍝 파스타 끝")

async def make_steak():
    print("   [주방] 🥩 스테이크 시작 (5초)")
    await asyncio.sleep(5)
    print("   [주방] 🥩 스테이크 끝")

async def restaurant():
    # 1. 두 개의 주문을 연달아 넣습니다. (아직 안 기다림!)
    task1 = asyncio.create_task(make_pasta())
    task2 = asyncio.create_task(make_steak())

    task3 = asyncio.sleep(0.5)
    task4 = asyncio.sleep(1.5)

    print("[홀] 두 가지 요리를 주문 넣었습니다. 기다립니다...")

    # 2. 이제 두 요리가 다 될 때까지 기다립니다.
    # 파스타가 끓는 동안 -> 스테이크도 굽고 있습니다. (동시 진행)
    # await task1
    # await task2

    await task3
    
    print("[홀] 모든 요리가 나왔습니다!")

asyncio.run(restaurant())