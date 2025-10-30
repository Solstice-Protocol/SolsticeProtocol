import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, Lock, Eye, Fingerprint, Check, ArrowRight, 
  Zap, Globe, Users, Code, ChevronDown
} from 'lucide-react';
import '../fonts.css';

function Home() {
  const navigate = useNavigate();
  const [currentSection, setCurrentSection] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [zkProofsGenerated, setZkProofsGenerated] = useState(0);
  const [identitiesVerified, setIdentitiesVerified] = useState(0);
  const [costSavings, setCostSavings] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  
  const sections = ['hero', 'problem', 'solution', 'technology', 'usecases', 'metrics'];
  const metricsRef = useRef(null);

  // Number animation
  const animateNumber = (start: number, end: number, duration: number, setter: (val: number) => void) => {
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const current = Math.floor(start + (end - start) * progress);
      setter(current);
      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    };
    tick();
  };

  // Scroll to section
  const scrollToSection = (sectionIndex: number) => {
    if (isScrolling || sectionIndex < 0 || sectionIndex >= sections.length) return;
    
    setIsScrolling(true);
    const element = document.getElementById(sections[sectionIndex]);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setCurrentSection(sectionIndex);
      setTimeout(() => setIsScrolling(false), 1500);
    }
  };

  // Metrics animation on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setHasAnimated(true);
            animateNumber(0, 1400000000, 2500, setZkProofsGenerated);
            animateNumber(0, 100000, 2000, setIdentitiesVerified);
            animateNumber(0, 5000, 1800, setCostSavings);
          }
        });
      },
      { threshold: 0.5 }
    );

    if (metricsRef.current) {
      observer.observe(metricsRef.current);
    }

    return () => {
      if (metricsRef.current) {
        observer.unobserve(metricsRef.current);
      }
    };
  }, [hasAnimated]);

  // Wheel scroll handler
  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;
    let scrollAccumulator = 0;
    const SCROLL_THRESHOLD = 50;

    const handleWheel = (e: Event) => {
      const wheelEvent = e as WheelEvent;
      wheelEvent.preventDefault();
      if (isScrolling) return;

      scrollAccumulator += wheelEvent.deltaY;
      
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => { scrollAccumulator = 0; }, 150);

      if (Math.abs(scrollAccumulator) >= SCROLL_THRESHOLD) {
        if (scrollAccumulator > 0 && currentSection < sections.length - 1) {
          scrollToSection(currentSection + 1);
          scrollAccumulator = 0;
        } else if (scrollAccumulator < 0 && currentSection > 0) {
          scrollToSection(currentSection - 1);
          scrollAccumulator = 0;
        }
      }
    };

    const container = document.querySelector('.scroll-container');
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      if (container) {
        container.removeEventListener('wheel', handleWheel);
      }
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, [currentSection, isScrolling, sections.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isScrolling) return;
      
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        if (currentSection < sections.length - 1) {
          scrollToSection(currentSection + 1);
        }
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        if (currentSection > 0) {
          scrollToSection(currentSection - 1);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentSection, isScrolling, sections.length]);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="scroll-container">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-black/90 backdrop-blur-md border-b border-purple-500/20">
        <div className="container mx-auto px-8">
          <div className="h-20 flex items-center justify-between">
            <h1 className="text-3xl font-light tracking-tight text-white nighty-font">
              SOLSTICE
            </h1>
            <button
              onClick={() => navigate('/app')}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-500 text-white hover:from-purple-700 hover:to-blue-600 transition-all duration-300 text-sm uppercase tracking-widest advercase-font"
            >
              Launch App
            </button>
          </div>
        </div>
      </header>

      {/* Page Position Indicator */}
      <div className="fixed right-6 top-1/2 -translate-y-1/2 z-40 space-y-2">
        {sections.map((section, idx) => {
          const isActive = idx === currentSection;
          return (
            <div key={section} className="relative group">
              <div
                className={`w-1 h-6 transition-all duration-300 cursor-pointer ${
                  isActive ? 'bg-purple-500' : 'bg-white/30 hover:bg-white/50'
                }`}
                onClick={() => {
                  setCurrentSection(idx);
                  document.getElementById(section)?.scrollIntoView({ behavior: 'smooth' });
                }}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-black/90 border border-purple-500/20 text-white text-xs font-mono opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {section.toUpperCase()}
              </div>
            </div>
          );
        })}
      </div>

      {/* SECTION 1: HERO */}
      <section
        id="hero"
        className="snap-section relative flex items-center justify-center overflow-hidden bg-black text-white"
      >
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1),transparent_50%)]" />
        </div>

        <div className="container mx-auto px-8 relative z-10">
          <div className="max-w-7xl mx-auto text-center">
            <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <h1 className="text-6xl sm:text-7xl lg:text-9xl font-light tracking-tight mb-12 leading-tight nighty-font">
                <div className="block text-white mb-6">
                  Zero-Knowledge
                </div>
                <div className="block mb-6 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                  Identity Verification
                </div>
                <div className="block text-white/90">
                  On Solana
                </div>
              </h1>

              <p className="text-xl text-gray-300 leading-relaxed max-w-3xl mx-auto mb-16 advercase-font">
                Privacy-preserving identity proofs powered by government-issued credentials.
                <span className="text-purple-400"> Prove age, nationality, and uniqueness</span>{' '}
                without revealing personal data.
              </p>

              <div className="flex items-center justify-center gap-8 flex-col sm:flex-row">
                <button
                  onClick={() => navigate('/app')}
                  className="group px-14 py-5 bg-gradient-to-r from-purple-600 to-blue-500 text-white hover:from-purple-700 hover:to-blue-600 transition-all duration-300 text-lg uppercase tracking-widest advercase-font"
                >
                  <span className="flex items-center gap-3">
                    Get Started
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </button>

                <button
                  onClick={() => scrollToSection(3)}
                  className="px-14 py-5 bg-transparent hover:bg-white/10 border border-purple-500/50 text-white transition-all duration-300 text-lg uppercase tracking-widest hover:border-purple-500 advercase-font"
                >
                  Learn More
                </button>
              </div>

              {/* Scroll indicator */}
              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-bounce">
                <ChevronDown className="w-8 h-8 text-purple-400" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: THE PROBLEM */}
      <section
        id="problem"
        className="snap-section relative py-24 bg-black border-t border-purple-500/20 text-white flex items-center justify-center"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black via-purple-950/10 to-black" />
        
        <div className="container mx-auto px-8 max-w-6xl relative z-10">
          <div className="mb-12">
            <h3 className="text-5xl font-light mb-4 text-white nighty-font">
              The Identity Crisis
            </h3>
            <p className="text-gray-400 text-lg advercase-font">
              Web3 promised decentralization, but identity verification still relies on centralized systems
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Problem 1 */}
            <div className="border border-purple-500/20 bg-black/50 p-6 hover:border-purple-500/40 transition-all">
              <div className="w-12 h-12 bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-red-400" />
              </div>
              <h4 className="text-xl text-white mb-3 nighty-font">Privacy Violations</h4>
              <p className="text-sm text-gray-400 mb-4 advercase-font">
                Centralized databases leak sensitive data. Equifax: 147M records. Aadhaar: multiple breaches.
              </p>
              <div className="text-2xl font-mono text-red-400">147M+</div>
              <div className="text-xs text-gray-500 uppercase advercase-font">Records Exposed</div>
            </div>

            {/* Problem 2 */}
            <div className="border border-purple-500/20 bg-black/50 p-6 hover:border-purple-500/40 transition-all">
              <div className="w-12 h-12 bg-orange-500/10 border border-orange-500/30 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-orange-400" />
              </div>
              <h4 className="text-xl text-white mb-3 nighty-font">Sybil Attacks</h4>
              <p className="text-sm text-gray-400 mb-4 advercase-font">
                No cost-effective way to prove uniqueness. Bots farm airdrops and manipulate governance.
              </p>
              <div className="text-2xl font-mono text-orange-400">$100-1000</div>
              <div className="text-xs text-gray-500 uppercase advercase-font">Per Identity On-Chain</div>
            </div>

            {/* Problem 3 */}
            <div className="border border-purple-500/20 bg-black/50 p-6 hover:border-purple-500/40 transition-all">
              <div className="w-12 h-12 bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-yellow-400" />
              </div>
              <h4 className="text-xl text-white mb-3 nighty-font">KYC Paradox</h4>
              <p className="text-sm text-gray-400 mb-4 advercase-font">
                Regulatory compliance requires centralized KYC, defeating Web3's decentralization purpose.
              </p>
              <div className="text-2xl font-mono text-yellow-400">73%</div>
              <div className="text-xs text-gray-500 uppercase advercase-font">DeFi Needs Compliance</div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: SOLUTION */}
      <section
        id="solution"
        className="snap-section relative py-24 bg-black border-t border-purple-500/20 text-white flex items-center justify-center"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black via-blue-950/10 to-black" />
        
        <div className="container mx-auto px-8 max-w-6xl relative z-10">
          <div className="mb-12 text-center">
            <h3 className="text-5xl font-light mb-4 text-white nighty-font">
              The Solstice Solution
            </h3>
            <p className="text-gray-400 text-lg advercase-font">
              Combining three breakthrough technologies for privacy-preserving identity
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {/* Tech 1 */}
            <div className="border border-purple-500/20 bg-gradient-to-b from-purple-900/10 to-black p-6">
              <div className="text-4xl font-mono text-purple-400 mb-2">01</div>
              <h4 className="text-xl text-white mb-3 nighty-font">Aadhaar Infrastructure</h4>
              <p className="text-sm text-gray-400 advercase-font">
                1.4B government-verified identities with 2048-bit RSA signatures
              </p>
            </div>

            {/* Tech 2 */}
            <div className="border border-purple-500/20 bg-gradient-to-b from-blue-900/10 to-black p-6">
              <div className="text-4xl font-mono text-blue-400 mb-2">02</div>
              <h4 className="text-xl text-white mb-3 nighty-font">Groth16 SNARKs</h4>
              <p className="text-sm text-gray-400 advercase-font">
                Sub-second proof generation, constant-size proofs (256 bytes)
              </p>
            </div>

            {/* Tech 3 */}
            <div className="border border-purple-500/20 bg-gradient-to-b from-pink-900/10 to-black p-6">
              <div className="text-4xl font-mono text-pink-400 mb-2">03</div>
              <h4 className="text-xl text-white mb-3 nighty-font">Light Protocol</h4>
              <p className="text-sm text-gray-400 advercase-font">
                5000x compression, $0.00001 per identity vs $0.05 traditional
              </p>
            </div>
          </div>

          {/* How it works */}
          <div className="border border-purple-500/20 bg-black/50 p-8">
            <h4 className="text-2xl text-white mb-6 text-center nighty-font">How It Works</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { step: '01', name: 'Scan QR', desc: 'User scans Aadhaar QR code from mAadhaar app' },
                { step: '02', name: 'Generate Proof', desc: 'Browser creates ZK proof locally (2-5 seconds)' },
                { step: '03', name: 'Submit On-Chain', desc: 'Compressed proof stored on Solana blockchain' },
                { step: '04', name: 'Verify Anywhere', desc: 'Any dApp can verify without seeing data' },
              ].map((item, idx) => (
                <div key={idx} className="text-center">
                  <div className="border border-purple-500/30 bg-purple-900/10 p-4 mb-3">
                    <div className="text-xs text-purple-400 mb-2 advercase-font">{item.step}</div>
                    <div className="text-sm text-white font-medium nighty-font">{item.name}</div>
                  </div>
                  <div className="text-xs text-gray-400 advercase-font">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: TECHNOLOGY */}
      <section
        id="technology"
        className="snap-section relative py-24 bg-black border-t border-purple-500/20 text-white flex items-center justify-center"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black via-purple-950/10 to-black" />
        
        <div className="container mx-auto px-8 max-w-6xl relative z-10">
          <div className="mb-12">
            <h3 className="text-5xl font-light mb-4 text-white nighty-font">
              Zero-Knowledge Proofs
            </h3>
            <p className="text-gray-400 text-lg advercase-font">
              Cryptographic proof system that reveals nothing beyond claim validity
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Circuit Types */}
            <div className="border border-purple-500/20 bg-black/50">
              <div className="p-4 border-b border-purple-500/20">
                <span className="text-white text-sm font-medium advercase-font">
                  ZK CIRCUITS
                </span>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-white text-sm mb-1 nighty-font">Age Proof</div>
                    <div className="text-xs text-gray-400 advercase-font">Proves age {">"} threshold without revealing DOB</div>
                  </div>
                  <div className="text-purple-400 text-xs font-mono">~50K constraints</div>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-white text-sm mb-1 nighty-font">Nationality Proof</div>
                    <div className="text-xs text-gray-400 advercase-font">Proves allowed country without revealing identity</div>
                  </div>
                  <div className="text-blue-400 text-xs font-mono">~30K constraints</div>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-white text-sm mb-1 nighty-font">Uniqueness Proof</div>
                    <div className="text-xs text-gray-400 advercase-font">Prevents Sybil attacks via nullifiers</div>
                  </div>
                  <div className="text-pink-400 text-xs font-mono">~10K constraints</div>
                </div>
              </div>
            </div>

            {/* Performance */}
            <div className="border border-purple-500/20 bg-black/50">
              <div className="p-4 border-b border-purple-500/20">
                <span className="text-white text-sm font-medium advercase-font">
                  PERFORMANCE
                </span>
              </div>
              <div className="p-4 space-y-4">
                <div className="border-l-2 border-purple-500/30 pl-4">
                  <div className="text-2xl font-mono text-white">256 bytes</div>
                  <div className="text-xs text-gray-400 advercase-font">Constant proof size (Groth16)</div>
                </div>
                <div className="border-l-2 border-blue-500/30 pl-4">
                  <div className="text-2xl font-mono text-white">2-5 sec</div>
                  <div className="text-xs text-gray-400 advercase-font">Browser-based proof generation</div>
                </div>
                <div className="border-l-2 border-pink-500/30 pl-4">
                  <div className="text-2xl font-mono text-white">{"<"}1 ms</div>
                  <div className="text-xs text-gray-400 advercase-font">On-chain verification time</div>
                </div>
              </div>
            </div>
          </div>

          {/* Security Properties */}
          <div className="border border-purple-500/20 bg-black/50 p-6">
            <h4 className="text-xl text-white mb-4 nighty-font">Security Guarantees</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { icon: Eye, name: 'Zero-Knowledge', desc: 'Verifier learns nothing beyond claim validity' },
                { icon: Shield, name: 'Soundness', desc: 'Impossible to forge valid proof without witness' },
                { icon: Check, name: 'Completeness', desc: 'Valid witness always produces accepted proof' },
                { icon: Lock, name: 'Non-Malleability', desc: 'Proof cannot be modified or reused' },
              ].map((item, idx) => (
                <div key={idx} className="text-center">
                  <div className="w-12 h-12 mx-auto mb-3 bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
                    <item.icon className="w-6 h-6 text-purple-400" />
                  </div>
                  <div className="text-sm text-white mb-2 nighty-font">{item.name}</div>
                  <div className="text-xs text-gray-400 advercase-font">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: USE CASES */}
      <section
        id="usecases"
        className="snap-section relative py-24 bg-black border-t border-purple-500/20 text-white flex items-center justify-center"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black via-blue-950/10 to-black" />
        
        <div className="container mx-auto px-8 max-w-6xl relative z-10">
          <div className="mb-12 text-center">
            <h3 className="text-5xl font-light mb-4 text-white nighty-font">
              Powering Web3 Identity
            </h3>
            <p className="text-gray-400 text-lg advercase-font">
              Single identity verification works across entire Solana ecosystem
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Use Case 1 */}
            <div className="border border-purple-500/20 bg-gradient-to-br from-purple-900/10 to-black p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-purple-500/10 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                  <Globe className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h4 className="text-xl text-white mb-2 nighty-font">DeFi Compliance</h4>
                  <p className="text-sm text-gray-400 advercase-font">
                    KYC/AML without centralized verification. Prove age ≥18 and nationality ≠ sanctioned country.
                  </p>
                </div>
              </div>
              <div className="border-t border-purple-500/20 pt-4 text-xs text-gray-400 advercase-font">
                Use Case: Decentralized exchanges, lending protocols, security token offerings
              </div>
            </div>

            {/* Use Case 2 */}
            <div className="border border-purple-500/20 bg-gradient-to-br from-blue-900/10 to-black p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-xl text-white mb-2 nighty-font">Sybil-Resistant Airdrops</h4>
                  <p className="text-sm text-gray-400 advercase-font">
                    One Aadhaar = One account. Fair token distribution to real users, not bot farms.
                  </p>
                </div>
              </div>
              <div className="border-t border-blue-500/20 pt-4 text-xs text-gray-400 advercase-font">
                Use Case: Gaming rewards, NFT mints, community incentives
              </div>
            </div>

            {/* Use Case 3 */}
            <div className="border border-purple-500/20 bg-gradient-to-br from-pink-900/10 to-black p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-pink-500/10 border border-pink-500/30 flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-pink-400" />
                </div>
                <div>
                  <h4 className="text-xl text-white mb-2 nighty-font">Democratic Governance</h4>
                  <p className="text-sm text-gray-400 advercase-font">
                    One person one vote with uniqueness proofs. True quadratic voting for DAOs.
                  </p>
                </div>
              </div>
              <div className="border-t border-pink-500/20 pt-4 text-xs text-gray-400 advercase-font">
                Use Case: DAO proposals, community voting, nation-state governance
              </div>
            </div>

            {/* Use Case 4 */}
            <div className="border border-purple-500/20 bg-gradient-to-br from-orange-900/10 to-black p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-orange-500/10 border border-orange-500/30 flex items-center justify-center flex-shrink-0">
                  <Fingerprint className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                  <h4 className="text-xl text-white mb-2 nighty-font">Age-Gated Content</h4>
                  <p className="text-sm text-gray-400 advercase-font">
                    Platform compliance without identity collection. Prove age ≥13, ≥18, or ≥21.
                  </p>
                </div>
              </div>
              <div className="border-t border-orange-500/20 pt-4 text-xs text-gray-400 advercase-font">
                Use Case: Social platforms, gaming, adult content, regulated services
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: METRICS */}
      <section
        id="metrics"
        ref={metricsRef}
        className="snap-section relative py-24 bg-black border-t border-purple-500/20 text-white flex items-center justify-center"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black via-purple-950/10 to-black" />
        
        <div className="container mx-auto px-8 max-w-6xl relative z-10">
          <div className="mb-12 text-center">
            <h3 className="text-5xl font-light mb-4 text-white nighty-font">
              Built for Scale
            </h3>
            <p className="text-gray-400 text-lg advercase-font">
              Infrastructure for 1.4 billion potential users
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="border border-purple-500/20 bg-gradient-to-b from-purple-900/10 to-black p-8 text-center">
              <div className="text-5xl font-mono text-purple-400 mb-3">
                {zkProofsGenerated.toLocaleString()}
              </div>
              <div className="text-white text-sm mb-2 nighty-font">Potential Users</div>
              <div className="text-xs text-gray-400 advercase-font">Aadhaar holders worldwide</div>
            </div>

            <div className="border border-purple-500/20 bg-gradient-to-b from-blue-900/10 to-black p-8 text-center">
              <div className="text-5xl font-mono text-blue-400 mb-3">
                {identitiesVerified.toLocaleString()}+
              </div>
              <div className="text-white text-sm mb-2 nighty-font">DeFi Protocols</div>
              <div className="text-xs text-gray-400 advercase-font">Requiring KYC compliance</div>
            </div>

            <div className="border border-purple-500/20 bg-gradient-to-b from-pink-900/10 to-black p-8 text-center">
              <div className="text-5xl font-mono text-pink-400 mb-3">
                {costSavings}x
              </div>
              <div className="text-white text-sm mb-2 nighty-font">Cost Reduction</div>
              <div className="text-xs text-gray-400 advercase-font">vs traditional on-chain storage</div>
            </div>
          </div>

          {/* CTA */}
          <div className="border border-purple-500/20 bg-gradient-to-br from-purple-900/20 to-blue-900/20 p-12 text-center">
            <h4 className="text-3xl font-light text-white mb-4 nighty-font">
              Ready to Build with Solstice?
            </h4>
            <p className="text-gray-400 text-lg mb-8 advercase-font max-w-2xl mx-auto">
              Join the future of self-sovereign identity. Privacy-preserving, cost-efficient, and developer-friendly.
            </p>
            
            <div className="flex items-center justify-center gap-6">
              <button
                onClick={() => navigate('/app')}
                className="px-12 py-4 bg-gradient-to-r from-purple-600 to-blue-500 text-white hover:from-purple-700 hover:to-blue-600 transition-all duration-300 text-lg uppercase tracking-widest advercase-font"
              >
                Launch App
              </button>
              <a
                href="https://github.com/Shaurya2k06/SolsticeProtocol"
                target="_blank"
                rel="noopener noreferrer"
                className="px-12 py-4 bg-transparent hover:bg-white/10 border border-purple-500/50 text-white transition-all duration-300 text-lg uppercase tracking-widest hover:border-purple-500 advercase-font"
              >
                View Docs
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-purple-500/20 py-8 bg-black">
        <div className="absolute inset-0 bg-black/95" />
        <div className="container mx-auto px-8 max-w-6xl relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-500">
            <div className="advercase-font">
              © {new Date().getFullYear()} SOLSTICE PROTOCOL. ALL RIGHTS RESERVED.
            </div>
            <div className="advercase-font">
              POWERED BY SOLANA • GROTH16 • LIGHT PROTOCOL
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        .scroll-container {
          height: 100vh;
          overflow-y: auto;
          scroll-behavior: smooth;
        }

        .snap-section {
          min-height: 100vh;
          position: relative;
          display: flex;
          flex-direction: column;
        }

        .advercase-font {
          font-family: 'Advercase', monospace;
        }

        .nighty-font {
          font-family: 'Nighty', serif;
        }

        ::-webkit-scrollbar {
          width: 6px;
        }

        ::-webkit-scrollbar-track {
          background: rgba(139, 92, 246, 0.1);
        }

        ::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.3);
          border-radius: 3px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.5);
        }
      `}</style>
    </div>
  );
}

export default Home;
