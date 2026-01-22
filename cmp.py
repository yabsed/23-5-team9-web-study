import asyncio
import httpx
import time
import random
from shapely.geometry import shape, Point
from shapely.strtree import STRtree

# 데이터 소스 URL
GEOJSON_URL = "https://raw.githubusercontent.com/vuski/admdongkor/master/ver20250101/HangJeongDong_ver20250101.geojson"

# 테스트 설정
NUM_TEST_POINTS = 1000  # 테스트할 좌표 개수

async def get_geometry_data():
    """GeoJSON 데이터를 다운로드하여 Shapely Geometry 리스트로 변환"""
    print(f"--- [1/4] 데이터 다운로드 중... ---")
    async with httpx.AsyncClient() as client:
        response = await client.get(GEOJSON_URL)
        data = response.json()
        features = data.get('features', [])
        
    print(f"--- [2/4] 데이터 파싱 및 Geometry 변환 (총 {len(features)}개) ---")
    # Geometry 객체 리스트 생성
    geometries = [shape(f['geometry']) for f in features]
    return geometries

def generate_random_points(n):
    """대한민국 인근 범위 내 무작위 좌표 생성"""
    points = []
    # 대략적인 대한민국 영역 (경도 126~129, 위도 34~38)
    for _ in range(n):
        lon = random.uniform(126.0, 129.5)
        lat = random.uniform(34.5, 38.0)
        points.append(Point(lon, lat))
    return points

def run_linear_search(geometries, points):
    """방식 1: 선형 탐색 (Brute Force) - 모든 폴리곤을 하나씩 검사"""
    found_count = 0
    start_time = time.perf_counter()
    
    for pt in points:
        # 모든 도형을 순회 (최악의 경우 3500번 비교)
        for geom in geometries:
            if geom.contains(pt):
                found_count += 1
                break # 찾으면 다음 점으로 (이게 없으면 더 느려짐)
                
    end_time = time.perf_counter()
    return end_time - start_time, found_count

def run_tree_search(geometries, tree, points):
    """방식 2: R-tree 탐색 (Spatial Indexing) - 후보군만 추려서 검사"""
    found_count = 0
    start_time = time.perf_counter()
    
    for pt in points:
        # 1. 트리에서 후보 도형의 인덱스들을 추출 (매우 빠름)
        candidate_indices = tree.query(pt)
        
        # 2. 후보들만 정밀 검사 (보통 0~3개)
        for idx in candidate_indices:
            if geometries[idx].contains(pt):
                found_count += 1
                break
                
    end_time = time.perf_counter()
    return end_time - start_time, found_count

async def main():
    # 1. 데이터 준비
    geoms = await get_geometry_data()
    
    # 2. R-tree 생성 (생성 시간은 제외하고 검색 시간만 비교)
    print("--- [3/4] R-tree 인덱스 빌드 중... ---")
    tree = STRtree(geoms)
    
    # 3. 테스트 좌표 생성
    print(f"--- [4/4] 테스트용 무작위 좌표 {NUM_TEST_POINTS}개 생성 중... ---")
    test_points = generate_random_points(NUM_TEST_POINTS)
    print("\n========== 🚀 속도 비교 시작 ==========\n")

    # --- 테스트 1: 선형 탐색 ---
    print(f"1. 선형 탐색 (Linear Search) 수행 중...")
    t_linear, count_linear = run_linear_search(geoms, test_points)
    print(f"   👉 완료! 소요시간: {t_linear:.4f}초 (찾은 개수: {count_linear})")

    print("-" * 40)

    # --- 테스트 2: R-tree 탐색 ---
    print(f"2. R-tree 탐색 (STRtree) 수행 중...")
    t_tree, count_tree = run_tree_search(geoms, tree, test_points)
    print(f"   👉 완료! 소요시간: {t_tree:.4f}초 (찾은 개수: {count_tree})")

    # --- 결과 요약 ---
    print("\n========== 📊 결과 분석 ==========")
    if t_tree > 0:
        speedup = t_linear / t_tree
        print(f"⚡ 속도 차이: R-tree가 약 [{speedup:.1f}배] 더 빠릅니다.")
    else:
        print("속도 차이: R-tree가 너무 빨라서 측정 불가 (거의 0초)")
        
    print(f"평균 1건 처리 시간 (선형): {t_linear/NUM_TEST_POINTS*1000:.4f} ms")
    print(f"평균 1건 처리 시간 (트리): {t_tree/NUM_TEST_POINTS*1000:.4f} ms")

if __name__ == "__main__":
    asyncio.run(main())