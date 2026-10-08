import type { Metadata } from 'next';
import Link from 'next/link';
import {
  BUSINESS_NAME,
  CONTACT_EMAIL,
  DESIGNER_BRAND_URL,
  REPRESENTATIVE_NAME
} from '@/utils/branding';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: '소개 · 운영 안내',
  description:
    '몽상인은 커뮤니티, 게임, 독립 의류 브랜드를 연결합니다. 서비스 이용과 실물 상품 구매, 운영 문의를 안내합니다.',
  alternates: { canonical: '/about' }
};

export default function AboutPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          夢想人 <span>MONGSANGIN</span>
        </Link>
        <Link href="/" className={styles.back}>
          마을로 가기
        </Link>
      </header>
      <article className={styles.content}>
        <p className={styles.eyebrow}>ABOUT THE TOWN</p>
        <h1>
          온라인 마을에서 만나,
          <br />
          현실의 취향으로 이어지는 곳.
        </h1>
        <p className={styles.intro}>
          몽상인은 브라우저에서 바로 들어갈 수 있는 픽셀 커뮤니티 게임입니다.
          광장을 걷고, 다른 사람과 대화하고, 이야기를 남기며 마을을 둘러볼 수
          있습니다. 옷과 영상, 코드를 만드는 1인 사업자 몽상인이 개발하고
          운영합니다.
        </p>
        <div className={styles.links}>
          <Link href="/">광장 들어가기</Link>
          <Link href="/?room=goods">실제 의류 상점 보기</Link>
        </div>

        <section className={styles.section}>
          <h2>마을에서 할 수 있는 일</h2>
          <dl className={styles.places}>
            <div>
              <dt>광장과 카페</dt>
              <dd>
                캐릭터로 이동하며 광장 채팅에 참여하고, 카페에서 다른 주민과
                대화를 나눕니다.
              </dd>
            </div>
            <div>
              <dt>우체국과 여행 수첩</dt>
              <dd>
                이야기와 댓글을 읽고 남기며, 마을 곳곳의 문장 조각을 모아 첫
                편지를 완성합니다.
              </dd>
            </div>
            <div>
              <dt>잡화점과 필름 극장</dt>
              <dd>
                실제 의류, 디지털 파일과 제작 작업을 살펴보고, 영상과 작업
                아카이브를 감상합니다.
              </dd>
            </div>
          </dl>
        </section>

        <section className={styles.store}>
          <p className={styles.eyebrow}>MONGSANGIN × ENICO VECK</p>
          <h2>잡화점의 옷은 실제로 구매할 수 있습니다.</h2>
          <p>
            의류·실물 굿즈 탭에는 독립 의류 브랜드 ENICO VECK의 공개 판매 상품이
            표시됩니다. 사진과 가격을 확인한 뒤 공식 스토어로 이동하면 해당
            상품의 상세 정보를 보고 주문할 수 있습니다.
          </p>
          <p>
            사이즈, 재고, 배송비와 교환·반품 조건은 공식 스토어에서 주문 전에
            확인해 주세요. 실물 상품 주문과 배송은 ENICO VECK에서 처리하며,
            디지털 파일·제작 의뢰는 몽상인 장바구니를 이용합니다.
          </p>
          <a
            href={DESIGNER_BRAND_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            ENICO VECK 공식 스토어
          </a>
        </section>

        <section className={styles.section}>
          <h2>운영 정보 · 문의</h2>
          <dl className={styles.business}>
            <div>
              <dt>사업자 상호</dt>
              <dd>{BUSINESS_NAME} · Mongsangin</dd>
            </div>
            <div>
              <dt>대표</dt>
              <dd>{REPRESENTATIVE_NAME}</dd>
            </div>
            <div>
              <dt>사업 시작</dt>
              <dd>2026년 3월 10일</dd>
            </div>
            <div>
              <dt>운영 지역</dt>
              <dd>대한민국 서울</dd>
            </div>
            <div>
              <dt>이메일</dt>
              <dd>
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              </dd>
            </div>
          </dl>
          <p className={styles.note}>
            서비스 오류나 이용 문의는 이메일로 알려주세요. 화면에서 발생한
            상황과 사용 기기를 적어 주면 확인에 도움이 됩니다.
          </p>
        </section>
        <footer className={styles.footer}>
          © 2026 Mongsangin. 몽상인에서 만들고 운영합니다.
        </footer>
      </article>
    </main>
  );
}
