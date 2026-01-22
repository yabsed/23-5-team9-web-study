![](image.png)
[WaffleStudio 당근마켓 클론코딩](https://github.com/wafflestudio/23-5-team9-web/)


---


당근마켓에서 저희가 위치 기능을 구현할 때 필요한 것은 

- 프런트엔드: GPS 센서→ **위도, 경도 (37.234, 127.185)**
- 백엔드: 위도, 경도 → **행정구역 (경기도 / 용인시처인구 / 역북동)**

이 두 가지입니다. 

---

사용자의 **위치 정보를 분류**하는 것이 목표이므로 

우리의 심플한 클론코딩에서는 

굳이 카카오맵 API 같은 걸 이용할 필요가 없습니다. 

[GitHub - vuski/admdongkor: 대한민국 행정동 경계 파일](https://github.com/vuski/admdongkor)

누군가가 이미 Github에 **대한민국 행정동 경계 파일을** 올려놓았더군요. 

이걸 이용하면 됩니다. 

---

우리가 할 것은 결국 **json 파일** 파싱입니다. 

[raw.githubusercontent.com](https://raw.githubusercontent.com/vuski/admdongkor/master/ver20250101/HangJeongDong_ver20250101.geojson)

```json
{
  "type": "FeatureCollection",
  "name": "20250101",  // 데이터 버전 (예: 2025년 1월 1일 기준)
  "crs": {             // 좌표계 정보 (WGS84)
    "type": "name",
    "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" }
  },
  "features": [
    {
      "type": "Feature",
      "properties": {
        // --- [행정구역 속성 정보] ---
        "adm_nm":   "서울특별시 종로구 사직동",  // [중요] 행정동 전체 명칭 (코드에서 사용)
        "sidonm":   "서울특별시",              // [중요] 시/도 명칭 (코드에서 사용)
        "sggnm":    "종로구",                  // [중요] 시/군/구 명칭 (코드에서 사용)
        "sido":     "11",                     // 시/도 코드 (2자리)
        "sgg":      "11110",                  // 시/군/구 코드 (5자리)
        "adm_cd":   "11010530",               // 행정동 코드 (8자리, 통계청 기준 추정)
        "adm_cd2":  "1111053000"              // 행정동 코드 (10자리, 행안부 기준 추정)
      },
      "geometry": {
        // --- [지리 정보 / 다각형 좌표] ---
        "type": "MultiPolygon",  // 도형 타입 (Polygon 또는 MultiPolygon)
        "coordinates": [         // 경도(lon), 위도(lat) 좌표 배열의 집합
          [
            [
              [ 126.976888, 37.575650 ],
              [ 126.977034, 37.569194 ],
              // ... 수많은 좌표 점들이 이어져 다각형을 형성 ...
            ]
          ]
        ]
      }
    },
    // ... 추가 행정동 데이터 계속 ...
  ]
}
```

geometry 정보가 있기 때문에 우리는 각 좌표가 어떤 다각형 안에 있는지를 파악하고 정확하게 지역을 알아낼 수 있는 겁니다. 

**O(N)**으로 그냥 해도 되지만, 이미 잘 구현된 **STRtree** 라이브러리를 이용하면 **O(logN)**만에 할 수 있습니다. 

```python
def find_region_by_coord(self, lat, lon):
	"""R-tree를 사용하여 좌표가 속한 행정구역을 빠르게 검색"""
	if self.tree is None:
	    print("⚠️ 데이터가 로드되지 않았습니다.")
	    return None
	
	target_point = Point(lon, lat)
	
	# ✅ 1. Tree 조회 (query)
	# 해당 점이 포함될 '가능성이 있는(바운딩 박스가 겹치는)' 다각형의 인덱스들을 반환합니다.
	# 전체 3500개를 다 도는 게 아니라, 후보 1~3개 정도만 순식간에 찾아냅니다.
	candidate_indices = self.tree.query(target_point)
	
	# ✅ 2. 정밀 검사
	# 후보들 중에서 실제로 점을 포함(contains)하는지 확인
	for index in candidate_indices:
	    candidate_geom = self.geometries[index]
	    
	    if candidate_geom.contains(target_point):
	        props = self.features[index]['properties']
	        return {
	            "full_name": props.get('adm_nm'),
	            "sido": props.get('sidonm'),
	            "sigungu": props.get('sggnm'),
	            "dong": props.get('adm_nm').split()[-1]
	        }
	
	return None
```

---

이제 이걸 가지고 **API**를 명세서를 의뢰하겠습니다. 

주의할 것은 **region_id**입니다. 이미 저희 프로젝트에서는 **온보딩**과 같은 기능에 이 필드가 절찬리에 이용되고 있기 때문에 이걸 갈아엎으면 프론트에서도 다 다시 짜야됩니다. 

## region

- [GET] **/api/region/** (통합 검색 및 조회)
    
    이 엔드포인트 하나로 **전체 목록**, **키워드 검색**, **좌표 기반 검색**을 모두 처리합니다.
    
    **Query Parameters (모두 Optional)**
    
    1. `query`: 텍스트 검색어 (예: "낙성대", "관악구")
    2. `lat` & `lon`: 위도/경도 좌표 (예: 37.4765, 126.9816)

**동작 로직**

- `lat`, `lon`이 있으면: 해당 좌표의 행정동 **1개**를 찾아 리스트로 반환 (가장 높은 우선순위)
- `query`가 있으면: 이름에 검색어가 포함된 행정동 **목록**을 반환
- 파라미터가 없으면: 전체 목록 반환 (데이터가 많으므로 limit/offset 권장, 여기선 생략)

```json
// Case 1: 키워드 검색
// GET /api/region/?query=낙성대

// Case 2: 좌표 검색 (내 위치 찾기)
// GET /api/region/?lat=37.4765&lon=126.9816

// Response (공통적으로 List 형태 반환)
[
  {
    "id": "d64a81ac-9658-4b66-b228-95893e0dbed1",
    "sido": "서울특별시",
    "sigungu": "관악구",
    "dong": "낙성대동",
    "full_name": "서울특별시 관악구 낙성대동"
  }
]
```

- [GET] **/api/region/{region_id}** (단일 상세 조회)
    
    특정 ID로 정확하게 하나의 정보를 가져올 때 사용합니다.
    
    ```json
    // GET /api/region/d64a81ac-9658-4b66-b228-95893e0dbed1
    
    // Response (Object 형태)
    {
      "id": "d64a81ac-9658-4b66-b228-95893e0dbed1",
      "sido": "서울특별시",
      "sigungu": "관악구",
      "dong": "낙성대동",
      "full_name": "서울특별시 관악구 낙성대동"
    }
    ```
    

---

### UI/UX 보조용 계층형 API (Dropdown용)

사용자가 검색 대신 "시/도 선택 -> 시/군/구 선택" UI를 사용할 때 필요한 보조 API입니다. 이들은 Region 객체가 아닌 단순 문자열 리스트를 반환하므로 별도 경로로 유지하는 것이 좋습니다.

- [GET] **/api/region/sido**
    
    ```json
    // Response
    ["강원특별자치도", "경기도", "서울특별시", ...]
    ```
    
- [GET] **/api/region/sido/{sido_name}/sigungu**
    
    ```json
    // GET /api/region/sido/서울특별시/sigungu
    // Response
    ["강남구", "강동구", "관악구", ...]
    ```
    
- [GET] **/api/region/sido/{sido_name}/sigungu/{sigungu_name}/dong**
    
    마지막 단계에서는 실제 Region 객체 리스트(ID 포함)를 반환하여 선택 시 ID를 확보할 수 있게 합니다.
    
    ```json
    // GET /api/region/sido/서울특별시/sigungu/관악구/dong
    // Response
    [
      {
        "id": "d64a81ac...",
        "dong": "낙성대동"
        // 필요한 경우 full_name 등 추가 가능
      },
      ...
    ]
    ```