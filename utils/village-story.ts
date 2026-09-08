import type { VillageBuildingId } from './village-buildings';

export const STORY_KEY = 'mongsangin-first-letter-v1';
export const STORY_EVENT = 'village:story-changed';
export const fragments = [
  {
    id: 'stamp',
    room: 'community',
    text: '버려진 마음에도',
    object: '반송된 우표'
  },
  {
    id: 'label',
    room: 'goods',
    text: '머물 자리는',
    object: '이름 없는 옷의 꼬리표'
  },
  { id: 'reel', room: 'studio', text: '있다', object: '마지막 필름' }
] as const;
export type FragmentId = (typeof fragments)[number]['id'];
export type StoryAction = 'start' | 'complete' | 'reset' | FragmentId;
export type StoryState = {
  fragments: FragmentId[];
  completed: boolean;
  started: boolean;
};
export const emptyStory: StoryState = {
  fragments: [],
  completed: false,
  started: false
};

export function readStory(raw: string | null): StoryState {
  try {
    const value = JSON.parse(raw || '{}');
    const found: FragmentId[] = Array.isArray(value?.fragments)
      ? fragments.filter((f) => value.fragments.includes(f.id)).map((f) => f.id)
      : [];
    return {
      fragments: found,
      started: value?.started === true || found.length > 0,
      completed: value?.completed === true && found.length === fragments.length
    };
  } catch {
    return { ...emptyStory, fragments: [] };
  }
}

export function advanceStory(
  state: StoryState,
  action: StoryAction
): StoryState {
  if (action === 'reset') return { ...emptyStory, fragments: [] };
  if (action === 'start') return { ...state, started: true };
  if (action === 'complete')
    return { ...state, completed: state.fragments.length === fragments.length };
  if (!fragments.some((f) => f.id === action)) return state;
  return {
    ...state,
    started: true,
    fragments: Array.from(new Set([...state.fragments, action]))
  };
}
export function isRestored(order: readonly string[]) {
  return (
    order.length === fragments.length &&
    fragments.every((f, i) => order[i] === f.id)
  );
}
export function nextStoryRoom(state: StoryState): VillageBuildingId {
  return (
    fragments.find((f) => !state.fragments.includes(f.id))?.room || 'about'
  );
}

export const residents: Record<
  VillageBuildingId,
  {
    name: string;
    role: string;
    greeting: string;
    question: string;
    answer: string;
    action: string;
    clue: string;
  }
> = {
  community: {
    name: '모아',
    role: '반송 편지 보관인',
    greeting:
      '여기는 똥 우체국. 남들한테는 버릴 말이어도, 여기서는 누군가의 첫 문장이 되지. 오늘은 주소 없는 편지가 한 통 왔어.',
    question: '왜 하필 똥 우체국이야?',
    answer:
      '멋진 말만 남기라면 아무도 솔직해지지 못하잖아. 엉망인 하루도 여기 두고 가. 대신 누군가를 다치게 하는 말은 배달하지 말자.',
    action: '편지함 열기',
    clue: '우표 뒷면에 첫 문장이 남아 있어. 나머지는 잡화점과 극장에 맡겼다는군.'
  },
  goods: {
    name: '단',
    role: '쓸모를 다시 찾는 재단사',
    greeting:
      '어서 와. 여기 있는 건 모두 누군가의 손을 거친 물건이야. 둘러보기만 해도 괜찮아. 저 꼬리표는 주인을 잃고도 남아 있네.',
    question: '꼭 사야 하는 건 아니지?',
    answer:
      '당연하지. 마음에 드는 형태를 기억해 가는 것도 충분해. 물건의 가격과 사람의 가치는 다른 거니까.',
    action: '진열대 살펴보기',
    clue: '낡은 꼬리표의 안쪽. 가격 대신 짧은 문장이 적혀 있다.'
  },
  studio: {
    name: '루',
    role: '마지막 장면의 영사 기사',
    greeting:
      '불을 조금 낮췄어. 오늘의 작품은 저 스크린에서 만나. 그리고 저 필름은 아직 아무에게도 마지막 장면을 보여주지 못했대.',
    question: '아무것도 상영하지 않는 날엔?',
    answer:
      '잠깐 빈 화면을 보고 있어. 누군가의 작품이 도착하기 전에도, 기다리는 시간은 흐르거든.',
    action: '상영기 켜기',
    clue: '필름을 빛에 비추자, 지워지지 않은 마지막 한 단어가 보인다.'
  },
  profile: {
    name: '서',
    role: '이름을 기억하는 주민 안내인',
    greeting:
      '처음 와도 주민이 될 수 있어. 네 이름과 주문한 물건의 행방은 여기서 기억할게.',
    question: '마을에서 뭘 하면 돼?',
    answer:
      '길을 걷고, 다른 사람의 흔적을 읽고, 네 속도로 머물러. 출석이나 순위를 위한 마을은 아니니까.',
    action: '내 주민 기록',
    clue: '안내인의 수첩에는 빈 이름 칸이 많다. 아직 만나지 못한 사람들의 자리라고 한다.'
  },
  dating: {
    name: '온',
    role: '빈 의자를 남겨 두는 주인',
    greeting:
      '오늘도 의자는 두 개. 누군가를 만나고 싶다면 자리를 신청해. 조용히 앉아 있다 가도 괜찮고.',
    question: '누구를 만나게 돼?',
    answer:
      '함께 자리를 신청한 다른 주민이야. 대화를 시작하고 끝내는 건 네 선택이지. 개인정보는 천천히, 신중하게 나누자.',
    action: '대화 자리 신청',
    clue: '잔 밑에 적힌 한마디. 오늘은 아무 말도 하지 않아도 괜찮습니다.'
  },
  about: {
    name: '결',
    role: '불완전한 것을 잇는 제작자',
    greeting:
      '찢어진 문장을 가지고 왔어? 세 조각을 제자리에 놓아 보자. 이 마을이 처음 생긴 이유가 그 안에 있을 거야.',
    question: '몽상인은 무엇을 만드는 곳이야?',
    answer:
      '옷과 영상, 코드. 재료는 달라도 결국 사람이 머물 자리를 만드는 일이라고 생각해. 완벽하지 않은 마음까지.',
    action: '문장 복원하기',
    clue: '우표, 옷의 꼬리표, 필름. 마음에서 시작해, 자리로 이어지고, 존재로 끝나는 문장.'
  }
};
