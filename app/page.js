const Icon = ({ children }) => <span className="icon">{children}</span>;
const Arrow = () => <span aria-hidden="true">↗</span>;

const capabilities = [
  ["AI", "AI Employees", "Role-specific assistants for sales, service, operations, and internal teams."],
  ["↻", "Business Automation", "Connected workflows that move information, trigger action, and remove repetitive work."],
  ["◇", "Private Infrastructure", "A secure foundation with stronger ownership, flexibility, and control than closed platforms."],
  ["✦", "Custom Intelligence", "Systems shaped around your business, your processes, and your knowledge."],
];

const industries = [
  ["01", "Healthcare & Clinics", "AI reception, intake, appointment workflows, follow-up, and communication systems."],
  ["02", "Insurance & Financial Services", "Lead qualification, document workflows, compliant communication, and agent productivity."],
  ["03", "Professional Services", "Client onboarding, proposal generation, knowledge systems, and pipeline automation."],
  ["04", "Nonprofits & Community Organizations", "Donor journeys, volunteer coordination, outreach campaigns, and impact reporting."],
];

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top"><span className="mark">K</span><span>KROVORO</span></a>
        <nav>
          <a href="#capabilities">Capabilities</a>
          <a href="#industries">Industries</a>
          <a href="#why">Why Krovoro</a>
          <a href="#contact">Contact</a>
        </nav>
        <a className="header-link" href="#contact">Start a conversation <Arrow /></a>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><span /> AI Receptionist • Never Miss Another Call</div>
          <h1>Your AI <em>Receptionist.</em></h1>
          <p>Krovoro answers every call, books appointments, qualifies leads, and follows up automatically—24 hours a day, 7 days a week.</p>
          <div className="actions">
            <a className="btn primary" href="#contact">Book a Demo <Arrow /></a>
            <a className="btn secondary" href="#capabilities">See It In Action</a>
          </div>
          <div className="trust">
  <span>Answers Every Call</span>
  <span>Books Appointments</span>
  <span>Works 24/7</span>
</div>
        </div>

        <div className="system-card">
          <div className="system-head"><span>KROVORO CORE</span><span className="live">● LIVE</span></div>
          <div className="system-body">
            <div className="orbit orbit-a" />
            <div className="orbit orbit-b" />
            <div className="core"><strong>K</strong><small>INTELLIGENCE<br/>ENGINE</small></div>
            <div className="node n1">AI</div><div className="node n2">DATA</div><div className="node n3">FLOW</div><div className="node n4">CRM</div>
          </div>
          <div className="metrics"><div><strong>24/7</strong><span>Operations</span></div><div><strong>1</strong><span>Connected system</span></div><div><strong>∞</strong><span>Growth potential</span></div></div>
        </div>
      </section>

      <section className="ticker"><span>AI EMPLOYEES</span><i/><span>AUTOMATION</span><i/><span>PRIVATE CLOUD</span><i/><span>BUSINESS SYSTEMS</span></section>

      <section className="section intro">
        <span className="section-label">THE KROVORO DIFFERENCE</span>
        <div className="split">
          <h2>Not another tool.<br/>A working intelligence layer.</h2>
          <div><p>Most businesses are buried under disconnected software, repetitive work, and information that never reaches the right person at the right time.</p><p>Krovoro connects your workflows, knowledge, communications, and AI into one practical operating system designed around how your business actually works.</p></div>
        </div>
      </section>

      <section className="section" id="capabilities">
        <div className="section-top"><div><span className="section-label">WHAT WE BUILD</span><h2>Systems that create leverage.</h2></div><p>From the first customer interaction to the final internal handoff, Krovoro helps work move intelligently.</p></div>
        <div className="cap-grid">
          {capabilities.map(([symbol,title,text]) => <article key={title}><Icon>{symbol}</Icon><h3>{title}</h3><p>{text}</p></article>)}
        </div>
      </section>

      <section className="section panel" id="why">
        <div>
          <span className="section-label">OWN THE ADVANTAGE</span>
          <h2>Your business deserves more than rented intelligence.</h2>
          <p>Krovoro is built on infrastructure designed for ownership, resilience, and long-term flexibility.</p>
          <ul><li>Greater control over data and integrations</li><li>Custom workflows without platform constraints</li><li>AI designed around your business knowledge</li><li>A foundation that grows with your organization</li></ul>
        </div>
        <div className="stack">
          <div className="stack-card"><div className="stack-title"><span>KROVORO INFRASTRUCTURE</span><b>●</b></div><div className="stack-row"><span>AI Layer</span><strong>ACTIVE</strong></div><div className="stack-row"><span>Automation Engine</span><strong>CONNECTED</strong></div><div className="stack-row"><span>Business Data</span><strong>CONTROLLED</strong></div><div className="stack-row"><span>Client Experience</span><strong>READY</strong></div><div className="progress"><span/></div></div>
        </div>
      </section>

      <section className="section" id="industries">
        <div className="section-top"><div><span className="section-label">BUILT FOR BUSINESS</span><h2>Industry-focused. System-minded.</h2></div><p>Krovoro starts with the realities of your industry, then builds the intelligence your operation needs.</p></div>
        <div className="industry-list">
          {industries.map(([num,title,text]) => <article key={num}><span>{num}</span><h3>{title}</h3><p>{text}</p><Arrow/></article>)}
        </div>
      </section>

      <section className="section process">
        <span className="section-label">HOW WE WORK</span>
        <div className="process-grid"><article><span>01</span><h3>Map the operation</h3><p>We identify the work, bottlenecks, systems, and opportunities that matter most.</p></article><article><span>02</span><h3>Build the intelligence</h3><p>We design AI assistants, data connections, and workflows around your real process.</p></article><article><span>03</span><h3>Deploy and improve</h3><p>We launch, measure, refine, and expand the system as your organization grows.</p></article></div>
      </section>

      <section className="cta" id="contact"><span className="section-label">BUILD WHAT WORKS</span><h2>Turn your next bottleneck into your next advantage.</h2><p>Tell us where your business is losing time, leads, or momentum. We’ll show you what an intelligent system could do.</p><div className="actions"><a className="btn primary" href="mailto:hello@krovoro.com">Contact Krovoro <Arrow/></a><a className="email" href="mailto:hello@krovoro.com">hello@krovoro.com</a></div></section>

      <footer><a className="brand" href="#top"><span className="mark">K</span><span>KROVORO</span></a><p>Intelligence that works.</p><span>© 2026 Krovoro. All rights reserved.</span></footer>
    </main>
  );
}
