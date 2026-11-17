import type { CSSProperties } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/icon';

// The public landing page, carried over from the prototype (haven.html).
export default function LandingPage() {
  return (
    <div id="landing">
      <header className="l-nav">
        <div className="wrap">
          <Link className="brand" href="/" aria-label="Haven home"><span className="brand-mark"><Icon name="home" /></span>Haven</Link>
          <nav aria-label="Site">
            <a className="btn btn-text how-link" href="#how">How it works</a>
            <Link className="btn btn-primary btn-sm" href="/signin">Start your week</Link>
          </nav>
        </div>
      </header>
    
      <main>
        <section className="wrap hero" aria-labelledby="heroTitle">
          <div className="hero-copy">
            <span className="eyebrow">For the one who keeps it all in their head</span>
            <h1 id="heroTitle">Stop being the one who has to <em>remember</em>.</h1>
            <p className="lede">Haven notices the open nights, the late shifts and the missing groceries before you do, so the week runs without anyone keeping score.</p>
            <div className="hero-ctas">
              <Link className="btn btn-primary btn-lg" href="/signin">Start your week <Icon name="arrow" /></Link>
              <a className="btn btn-text" href="#how">See how it works</a>
            </div>
            <div className="reassure">
              <span><Icon name="check" size="sm" />Free for 14 days, no card</span>
              <span><Icon name="lock" size="sm" />Private to your household</span>
              <span><Icon name="link" size="sm" />Everyone else just gets a link</span>
            </div>
          </div>
    
          <div className="preview" role="img" aria-label="Preview of a week in Haven: a heads-up that Thursday has no dinner, Tuesday and Wednesday with events and dinners, and a grocery list with items checked off">
            <div className="preview-head"><strong>This week</strong><span className="p-pill">6 of 7 dinners</span></div>
            <div className="p-heads"><Icon name="bell" size="sm" />Heads up: Thursday has no dinner and a 6 pm meeting.</div>
            <div className="p-day">
              <div className="p-day-name">Tuesday <span className="muted" style={{ fontWeight: '400' } as CSSProperties}>· busy evening</span></div>
              <div className="p-row"><time>9:00 am</time><span className="t">Dentist</span><span className="who" style={{ '--c': '#A65D40' } as CSSProperties}>S</span></div>
              <div className="p-row"><time>5:00 pm</time><span className="t">Working late</span><span className="who" style={{ '--c': '#4F6A85' } as CSSProperties}>D</span></div>
              <div className="p-meal"><Icon name="pot" size="sm" />Black bean tacos · 20 min</div>
            </div>
            <div className="p-day">
              <div className="p-day-name">Wednesday</div>
              <div className="p-row"><time>4:00 pm</time><span className="t">Swim class</span><span className="who" style={{ '--c': '#5C7356' } as CSSProperties}>L</span></div>
              <div className="p-meal"><Icon name="pot" size="sm" />Slow-cooker beef ragu</div>
            </div>
            <div className="p-day">
              <div className="p-day-name">Thursday</div>
              <div className="p-meal open"><Icon name="plus" size="sm" />No dinner yet. Tap to add.</div>
            </div>
            <div className="p-list">
              <strong>Grocery list</strong>
              <span><i className="on"></i><s>2 avocados</s></span>
              <span><i className="on"></i><s>1 lb green beans</s></span>
              <span><i></i>1½ lb mozzarella</span>
              <span><i></i>2 cans black beans</span>
            </div>
          </div>
        </section>
    
        <section className="band band-sand" aria-labelledby="problemTitle">
          <div className="wrap problem">
            <div className="stack">
              <span className="eyebrow">Sound familiar?</span>
              <h2 id="problemTitle" style={{ fontSize: 'clamp(26px,3.4vw,36px)', lineHeight: '1.15', fontWeight: '800' } as CSSProperties}>Doing the chores is the easy part. Remembering them is the job.</h2>
              <p>In most homes one person notices the empty fridge, knows who has practice, and reminds everyone else. A shared to-do list doesn’t fix that. It just gives the reminding a new place to happen.</p>
            </div>
            <div className="texts" aria-label="Example messages">
              <div className="bubble"><small>Dan · 4:12 pm</small>Do we need anything from the store?</div>
              <div className="bubble"><small>Maya · 5:31 pm</small>is there practice tomorrow</div>
              <div className="bubble me"><small>You · 5:46 pm</small>Let me check. Again.</div>
            </div>
          </div>
        </section>
    
        <section className="band" aria-labelledby="featTitle">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">The four parts of running a home</span>
              <h2 id="featTitle">Haven takes on the parts nobody sees.</h2>
              <p>Sociologist Allison Daminger describes the mental side of housework in four stages: anticipating what’s needed, finding options, deciding, and checking it got done. Most apps only help with the doing.</p>
            </div>
            <div className="features">
              <article className="card feature"><span className="feature-icon clay"><Icon name="bell" size="lg" /></span><span className="stage">Anticipate</span><h3>Haven notices first</h3><p>Open nights, busy evenings and a shop day with half the list unbought show up as a short Heads up, three things at most.</p></article>
              <article className="card feature"><span className="feature-icon"><Icon name="shuffle" size="lg" /></span><span className="stage">Find options</span><h3>Ideas, not a blank page</h3><p>Quick meals come first on busy nights. One tap fills every open night, and you can swap any of them.</p></article>
              <article className="card feature"><span className="feature-icon"><Icon name="bag" size="lg" /></span><span className="stage">Decide</span><h3>One tap, list included</h3><p>Pick a dinner and its ingredients land on the grocery list, added up and sorted by aisle.</p></article>
              <article className="card feature"><span className="feature-icon clay"><Icon name="repeat" size="lg" /></span><span className="stage">Monitor</span><h3>Nobody checks up</h3><p>Ticks close things quietly. A one-minute Sunday wrap-up resets the week and carries repeating plans forward.</p></article>
            </div>
          </div>
        </section>
    
        <section className="band band-sand" id="how" aria-labelledby="howTitle">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">How it works</span>
              <h2 id="howTitle">Built for the one who plans. Easy for everyone else.</h2>
              <p>Only you need Haven. Your household just opens a link.</p>
            </div>
            <ol className="steps">
              <li><h3>Start with dinners</h3><p>Plan this week’s dinners first. The calendar and the household can wait.</p></li>
              <li><h3>Let Haven notice</h3><p>Heads up flags what needs you, never more than three things at once.</p></li>
              <li><h3>Send a link, not an app</h3><p>Share the grocery list or the week. It opens in any browser, with nothing to install.</p></li>
            </ol>
          </div>
        </section>
    
        <section className="wrap cta-band" aria-labelledby="ctaTitle">
          <div className="card cta-card">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '34rem' } as CSSProperties}>
              <h2 id="ctaTitle">Hand off the remembering.</h2>
              <p className="muted">Free for 14 days, no card needed. Then $5 a month or $48 a year for the whole household.</p>
            </div>
            <Link className="btn btn-primary btn-lg" href="/signin">Try Haven <Icon name="arrow" /></Link>
          </div>
        </section>
      </main>
    
      <footer className="wrap l-foot">
        <span>Haven · household scheduling and meal planning</span>
        <span>One plan covers everyone you live with.</span>
      </footer>
    </div>
  );
}
