/** 시드 고정 난수. 실행마다 데이터가 달라지면 화면 비교도 회귀 확인도 못 한다 */
export function rng(seed: number) {
  let s = seed
  return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
}

export const NAMES = ['김하늘', '이준서', '박서연', '최민재', '정유진', '강도현', '윤채원', '임태양', '한서우', '오지안']
export const won = (n: number) => n.toLocaleString('ko-KR')
