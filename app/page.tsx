import Image from 'next/image';
import PostsSection from '@/components/PostsSection';
import StudioPostsGrid from '@/components/StudioPostsGrid';
import { createClient } from '@/utils/supabase/server';

export default async function HomePage() {
  const isSupabaseConfigured =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  let user: { id?: string; email?: string | null } | null = null;
  let posts:
    | Array<{
        id: string;
        title: string;
        content: string;
        created_at: string;
        user_id: string;
      }>
    | null = null;
  let studioPosts:
    | Array<{
        id: string;
      title: string;
      content: string;
        image_url: string | null;
      created_at: string;
      user_id: string;
    }>
    | null = null;

  if (isSupabaseConfigured) {
    const supabase = createClient();
    const {
      data: { user: authUser }
    } = await supabase.auth.getUser();
    user = authUser;

    const { data } = await supabase
      .from('studio_posts' as never)
      .select('id,title,content,created_at,user_id')
      .order('created_at', { ascending: false });
    posts = data as typeof posts;

    const { data: studioData } = await supabase
      .from('studio_posts' as never)
      .select('id,title,content,image_url,created_at,user_id')
      .order('created_at', { ascending: false });
    studioPosts = studioData as typeof studioPosts;
  }

  return (
    <>
      {/* ==================================================================
          [1. HOME 섹션]
          ================================================================== */}
      <section 
        id="home" 
        className="s-home target-section relative flex h-screen flex-col items-center justify-center overflow-hidden bg-black"
      >
        <div className="shadow-overlay absolute inset-0 z-[1] bg-black/70"></div>
        <video 
            autoPlay muted loop playsInline id="bg-video" 
            className="absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 object-cover grayscale"
        >
            <source src="/images/hero-bg.mp4" type="video/mp4" />
        </video>

        <div className="home-content relative z-[2] w-full px-5 text-center">
            
            <div className="mx-auto mb-6 max-w-[360px]">
                <Image src="/images/main_word.png" alt="ZEUS STUDIO" width={800} height={300} className="h-auto w-full grayscale" priority />
            </div>

            <h3 className="text-sm font-light uppercase tracking-[0.35em] text-white/80">
                Recording Studio / Localization <br /> Sound Production & Mixing / Dubbing
            </h3>
        </div> 
        
        <div className="absolute bottom-8 left-0 z-[3] w-full text-center text-sm uppercase tracking-[0.2em] text-white/50">
            <p className="m-0">서울 강서구 양천로 551-17 4층 <br/> 4F, 551-17, Yangcheon-ro, Gangseo-gu, Seoul, Republic of Korea</p>
            <p className="my-2">Contact Email: 07@zeus-studio.net</p>
            <p className="m-0 text-white/40">Copyrights©ZEUS STUDIO All rights reserved</p>
        </div>

        <ul className="home-social absolute right-6 top-1/2 z-[3] flex -translate-y-1/2 flex-col gap-5 text-white/70">
            <li><a href="#" className="text-lg text-white/70 transition hover:text-white"><i className="fa fa-facebook-square"></i></a></li>
            <li><a href="#" className="text-lg text-white/70 transition hover:text-white"><i className="fa fa-twitter"></i></a></li>
            <li><a href="#" className="text-lg text-white/70 transition hover:text-white"><i className="fa fa-instagram"></i></a></li>
        </ul> 
      </section>


      {/* ==================================================================
          [2. ABOUT US 섹션] - ID를 'about'으로 변경!
          ================================================================== */}
      <section id='about' className="s-about bg-black px-5 py-32">
        
        <div className="row section-header mx-auto mb-20 max-w-5xl text-center">
            <h1 className="text-4xl font-semibold text-white md:text-5xl">About</h1>
        </div> 

        <div className="row mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-12">
            <div className="flex-1 basis-[500px] text-center text-base leading-8 text-neutral-300">
                <p className="mb-5">
                  제우스 스튜디오는 <br/> 전문적인 오디오 작업과 다양한 서비스로 <br/> 최고의 서비스를 제공하기 위해 노력하고 있습니다.
                </p>
                <p className="mb-5">
                  제우스 스튜디오의 전문적인 제작자들과 책임감 있는 매니저들이 <br/> 콘텐츠에 매우 적합한 결과물과 철저한 서비스를 약속드립니다.
                </p>
                <p className="mb-10">
                  항상 최선을 다하여 최고의 퀄리티를 낼 수 있도록 노력하겠습니다. <br/> 언제나 여러분의 소중한 작품에 최선을 다하겠습니다.
                </p>
                <div className="text-sm font-medium uppercase tracking-[0.2em] text-white/80">
                    <p className="mb-4">ZEUS STUDIO provides high-quality sound works and the best <br/> services on sound production & mixing, dubbing etc.</p>
                    <p className="mb-4">We promise that our professional sound engineers and reliable <br/> project managers do our best to support your project and <br/> expand your content business with outstanding sound works.</p>
                    <p>ZEUS STUDIO will be your capable production partner of your <br/> future business.</p>
                </div>
            </div>
            <div className="flex flex-1 basis-[400px] justify-center">
                 <Image src="/images/studio/astudiomain.png" width={600} height={600} alt="Mixing Console" className="h-auto w-full max-w-[500px] grayscale shadow-[0_20px_60px_rgba(0,0,0,0.6)]" />
            </div>
        </div> 
      </section> 


      {/* ==================================================================
          [3. SERVICES 섹션 (NEW!)] - 사진 9.18.42.png 완벽 구현
          ================================================================== */}
      <section id='services' className="s-services bg-neutral-950 px-5 py-32">
        
        <div className="row section-header mx-auto mb-16 max-w-5xl text-center">
            <h1 className="text-4xl font-semibold text-white md:text-5xl">Services</h1>
        </div>

        <div className="mx-auto max-w-4xl text-center text-base leading-8 text-neutral-300">
            <p className="mb-3">
                제우스 스튜디오는 한국어는 물론 영어, 중국어, 일본어, 프랑스어, 스페인어 등 전세계
            </p>
            <p className="mb-3 font-semibold text-white">
                30개국 언어의 외국어 번역 및 성우 더빙 서비스를 제공합니다.
            </p>
            <p className="mb-10">
                애니메이션, 광고, 게임, 오디오 북 등 각 종 콘텐츠에 맞는 성우를 추천하여 <br/>
                최상의 퀄리티를 보장합니다.
            </p>

            <div className="mb-14 text-sm uppercase tracking-[0.2em] text-neutral-500">
                <p className="mb-3">
                    Zeus Studio provides global translation and voice dubbing in 30 different languages <br/>
                    including Korean, English, Chinese, Japanese, French, Spanish etc.
                </p>
                <p>
                    We recommend the best suitable voice actor for each content animations, commercials, <br/>
                    games, audio book and result into high quality outputs.
                </p>
            </div>

            {/* 사진: 녹음 부스 이미지 (studio2.jpg) 사용 */}
            <div className="mx-auto max-w-3xl">
                <Image 
                    src="/images/studio/studio2.jpg" 
                    width={800} 
                    height={500} 
                    alt="Recording Services" 
                    className="h-auto w-full rounded-md grayscale"
                />
            </div>
        </div>
      </section>


      {/* ==================================================================
          [4. STUDIO 섹션]
          ================================================================== */}
      <section id='portfolio' className="s-portfolio bg-black px-5 py-24">
        <div className="mx-auto mb-16 max-w-4xl text-center">
            <h3 className="text-sm font-semibold uppercase tracking-[0.35em] text-neutral-400">Studio</h3>
            <h1 className="mt-4 text-4xl font-semibold text-white md:text-5xl">Check Out Our Works.</h1>
        </div>

        <StudioPostsGrid posts={studioPosts ?? []} />
      </section>

      <PostsSection
        isAuthenticated={Boolean(user?.id)}
        userEmail={user?.email ?? null}
        posts={posts ?? []}
      />


      {/* ==================================================================
          [5. CONTACT 섹션]
          ================================================================== */}
      <section id="contact" className="s-contact" style={{padding: '100px 20px 40px', backgroundColor: '#0f0f0f'}}>
        
        <div style={{textAlign: 'center', marginBottom: '80px'}}>
            <h3 style={{color: '#b3b3b3', fontSize: '16px', fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px'}}>Contact Us</h3>
            <h1 style={{fontSize: 'clamp(2.5rem, 4vw, 4rem)', color: 'white', fontWeight: '700'}}>Get In Touch.</h1>
        </div>

        <div style={{maxWidth: '1200px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', borderTop: '1px solid #333', paddingTop: '60px', color: '#888'}}>
             <div style={{flex: '1 1 400px', marginBottom: '40px', paddingRight: '20px'}}>
                <h5 style={{color: 'white', fontSize: '16px', letterSpacing: '2px', marginBottom: '20px', textTransform: 'uppercase', fontWeight: '700'}}>Location</h5>
                <p style={{fontSize: '16px', lineHeight: '1.8'}}>
                서울 강서구 양천로 551-17 4층 <br/> 4F, 551-17, Yangcheon-ro, Gangseo-gu, Seoul, Republic of Korea
                </p>
                <p style={{fontSize: '14px', marginTop: '20px'}}>Copyrights©ZEUS STUDIO All rights reserved</p>
            </div>

            <div style={{flex: '1 1 300px', marginBottom: '40px'}}>
                <h5 style={{color: 'white', fontSize: '16px', letterSpacing: '2px', marginBottom: '20px', textTransform: 'uppercase', fontWeight: '700'}}>Contact</h5>
                <p style={{fontSize: '16px', lineHeight: '1.8', color: '#fff'}}>07@zeus-studio.net <br/> help@zeus-studio.net</p>
            </div>
        </div>

        <div style={{textAlign: 'center', borderTop: '1px solid #222', paddingTop: '30px', marginTop: '20px', fontSize: '14px', color: '#444'}}>
            Design by <span style={{color: '#fff', fontWeight: 'bold'}}>ZEUS STUDIO</span>
        </div>
      </section>
      
      <div id="go-top" style={{position: 'fixed', bottom: '30px', right: '30px', zIndex: 100}}>
          <a className="smoothscroll" title="Back to Top" href="#home" style={{display: 'flex', width: '50px', height: '50px', background: '#333', color: 'white', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', textDecoration: 'none', transition: 'background 0.3s'}}>
              <i className="fa fa-arrow-up"></i>
          </a>
      </div>
    </>
  );
}
