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
        image_url: string;
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
      .from('posts' as never)
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
        className="s-home target-section" 
        style={{
            height: '100vh', 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center', 
            alignItems: 'center', 
            position: 'relative', 
            overflow: 'hidden'
        }}
      >
        <div className="shadow-overlay" style={{zIndex:1, position:'absolute', inset:0, background:'rgba(0,0,0,0.4)'}}></div>
        <video 
            autoPlay muted loop playsInline id="bg-video" 
            style={{
                position: 'absolute', top: '50%', left: '50%', width: '100vw', height: '100vh', 
                objectFit: 'cover', transform: 'translate(-50%, -50%)', zIndex: 0
            }}
        >
            <source src="/images/hero-bg.mp4" type="video/mp4" />
        </video>

        <div className="home-content" style={{zIndex: 2, width: '100%', position: 'relative', padding: '0 20px', textAlign: 'center'}}>
            
            <div style={{maxWidth: '380px', margin: '0 auto 25px'}}>
                <Image src="/images/main_word.png" alt="ZEUS STUDIO" width={800} height={300} style={{width: '100%', height: 'auto', opacity: '1'}} priority />
            </div>

            <h3 style={{fontSize: '12px', color: 'rgba(255,255,255,0.9)', fontWeight: '400', letterSpacing: '3px', textTransform: 'uppercase', lineHeight: '1.8'}}>
                Recording Studio / Localization <br /> Sound Production & Mixing / Dubbing
            </h3>
        </div> 
        
        <div style={{position: 'absolute', bottom: '30px', left: '0', width: '100%', textAlign: 'center', zIndex: 3, color: 'rgba(255,255,255,0.6)', fontSize: '11px', lineHeight: '1.6', letterSpacing: '0.5px', fontFamily: 'sans-serif'}}>
            <p style={{margin: 0}}>서울 강서구 양천로 551-17 4층 <br/> 4F, 551-17, Yangcheon-ro, Gangseo-gu, Seoul, Republic of Korea</p>
            <p style={{margin: '5px 0'}}>Contact Email: 07@zeus-studio.net</p>
            <p style={{margin: 0, opacity: 0.8}}>Copyrights©ZEUS STUDIO All rights reserved</p>
        </div>

        <ul className="home-social" style={{position: 'absolute', top: '50%', right: '30px', transform: 'translateY(-50%)', listStyle: 'none', zIndex: 3, display: 'flex', flexDirection: 'column', gap: '20px'}}>
            <li><a href="#" style={{color: 'white', fontSize: '18px'}}><i className="fa fa-facebook-square"></i></a></li>
            <li><a href="#" style={{color: 'white', fontSize: '18px'}}><i className="fa fa-twitter"></i></a></li>
            <li><a href="#" style={{color: 'white', fontSize: '18px'}}><i className="fa fa-instagram"></i></a></li>
        </ul> 
      </section>


      {/* ==================================================================
          [2. ABOUT US 섹션] - ID를 'about'으로 변경!
          ================================================================== */}
      <section id='about' className="s-about" style={{padding: '150px 20px', backgroundColor: '#000'}}>
        
        <div className="row section-header" style={{maxWidth: '1200px', margin: '0 auto 80px', textAlign: 'center'}}>
            <h1 style={{fontSize: 'clamp(2.5rem, 4vw, 3.5rem)', color: 'white', fontWeight: '700', margin: 0}}>About</h1>
        </div> 

        <div className="row" style={{maxWidth: '1200px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '60px'}}>
            <div style={{flex: '1 1 500px', color: '#ccc', fontSize: '15px', lineHeight: '2', textAlign: 'center', wordBreak: 'keep-all'}}>
                <p style={{marginBottom: '20px'}}>
                  제우스 스튜디오는 <br/> 전문적인 오디오 작업과 다양한 서비스로 <br/> 최고의 서비스를 제공하기 위해 노력하고 있습니다.
                </p>
                <p style={{marginBottom: '20px'}}>
                  제우스 스튜디오의 전문적인 제작자들과 책임감 있는 매니저들이 <br/> 콘텐츠에 매우 적합한 결과물과 철저한 서비스를 약속드립니다.
                </p>
                <p style={{marginBottom: '40px'}}>
                  항상 최선을 다하여 최고의 퀄리티를 낼 수 있도록 노력하겠습니다. <br/> 언제나 여러분의 소중한 작품에 최선을 다하겠습니다.
                </p>
                <div style={{fontSize: '14px', color: '#fff', fontWeight: '500'}}>
                    <p style={{marginBottom: '15px'}}>ZEUS STUDIO provides high-quality sound works and the best <br/> services on sound production & mixing, dubbing etc.</p>
                    <p style={{marginBottom: '15px'}}>We promise that our professional sound engineers and reliable <br/> project managers do our best to support your project and <br/> expand your content business with outstanding sound works.</p>
                    <p>ZEUS STUDIO will be your capable production partner of your <br/> future business.</p>
                </div>
            </div>
            <div style={{flex: '1 1 400px', display: 'flex', justifyContent: 'center'}}>
                 <Image src="/images/studio/astudiomain.png" width={600} height={600} alt="Mixing Console" style={{width: '100%', maxWidth: '500px', height: 'auto', borderRadius: '0', boxShadow: '0 10px 40px rgba(0,0,0,0.7)'}} />
            </div>
        </div> 
      </section> 


      {/* ==================================================================
          [3. SERVICES 섹션 (NEW!)] - 사진 9.18.42.png 완벽 구현
          ================================================================== */}
      <section id='services' className="s-services" style={{padding: '150px 20px', backgroundColor: '#050505'}}>
        
        <div className="row section-header" style={{maxWidth: '1200px', margin: '0 auto 60px', textAlign: 'center'}}>
            <h1 style={{fontSize: 'clamp(2.5rem, 4vw, 3.5rem)', color: 'white', fontWeight: '700', margin: 0}}>Services</h1>
        </div>

        <div style={{maxWidth: '1000px', margin: '0 auto', textAlign: 'center', color: '#ccc', lineHeight: '2', fontSize: '15px', wordBreak: 'keep-all'}}>
            <p style={{marginBottom: '10px'}}>
                제우스 스튜디오는 한국어는 물론 영어, 중국어, 일본어, 프랑스어, 스페인어 등 전세계
            </p>
            <p style={{marginBottom: '10px', color: '#fff', fontWeight: 'bold'}}>
                30개국 언어의 외국어 번역 및 성우 더빙 서비스를 제공합니다.
            </p>
            <p style={{marginBottom: '40px'}}>
                애니메이션, 광고, 게임, 오디오 북 등 각 종 콘텐츠에 맞는 성우를 추천하여 <br/>
                최상의 퀄리티를 보장합니다.
            </p>

            <div style={{fontSize: '14px', color: '#999', marginBottom: '60px', fontStyle: 'italic'}}>
                <p style={{marginBottom: '10px'}}>
                    Zeus Studio provides global translation and voice dubbing in 30 different languages <br/>
                    including Korean, English, Chinese, Japanese, French, Spanish etc.
                </p>
                <p>
                    We recommend the best suitable voice actor for each content animations, commercials, <br/>
                    games, audio book and result into high quality outputs.
                </p>
            </div>

            {/* 사진: 녹음 부스 이미지 (studio2.jpg) 사용 */}
            <div style={{maxWidth: '800px', margin: '0 auto'}}>
                <Image 
                    src="/images/studio/studio2.jpg" 
                    width={800} 
                    height={500} 
                    alt="Recording Services" 
                    style={{width: '100%', height: 'auto', borderRadius: '4px', opacity: '0.9'}}
                />
            </div>
        </div>
      </section>


      {/* ==================================================================
          [4. STUDIO 섹션]
          ================================================================== */}
      <section id='portfolio' className="s-portfolio" style={{padding: '150px 20px', backgroundColor: '#000'}}>
        <div style={{maxWidth: '1000px', margin: '0 auto 80px', textAlign: 'center'}}>
            <h3 style={{color: '#cc005f', fontSize: '14px', fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px'}}>Studio</h3>
            <h1 style={{fontSize: 'clamp(2rem, 4vw, 3.5rem)', color: 'white', fontWeight: '700'}}>Check Out Our Works.</h1>
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
            <h3 style={{color: '#cc005f', fontSize: '14px', fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px'}}>Contact Us</h3>
            <h1 style={{fontSize: 'clamp(2.5rem, 4vw, 4rem)', color: 'white', fontWeight: '700'}}>Get In Touch.</h1>
        </div>

        <div style={{maxWidth: '1200px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', borderTop: '1px solid #333', paddingTop: '60px', color: '#888'}}>
             <div style={{flex: '1 1 400px', marginBottom: '40px', paddingRight: '20px'}}>
                <h5 style={{color: 'white', fontSize: '14px', letterSpacing: '2px', marginBottom: '20px', textTransform: 'uppercase', fontWeight: '700'}}>Location</h5>
                <p style={{fontSize: '15px', lineHeight: '1.8'}}>
                서울 강서구 양천로 551-17 4층 <br/> 4F, 551-17, Yangcheon-ro, Gangseo-gu, Seoul, Republic of Korea
                </p>
                <p style={{fontSize: '13px', marginTop: '20px'}}>Copyrights©ZEUS STUDIO All rights reserved</p>
            </div>

            <div style={{flex: '1 1 300px', marginBottom: '40px'}}>
                <h5 style={{color: 'white', fontSize: '14px', letterSpacing: '2px', marginBottom: '20px', textTransform: 'uppercase', fontWeight: '700'}}>Contact</h5>
                <p style={{fontSize: '15px', lineHeight: '1.8', color: '#fff'}}>07@zeus-studio.net <br/> help@zeus-studio.net</p>
            </div>
        </div>

        <div style={{textAlign: 'center', borderTop: '1px solid #222', paddingTop: '30px', marginTop: '20px', fontSize: '12px', color: '#444'}}>
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
