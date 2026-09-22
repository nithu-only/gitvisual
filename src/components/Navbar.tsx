import { useState, useRef, useEffect } from 'react';
import { useGitStore } from '../store/gitStore';
import { GitBranch, ChevronDown } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

export function Navbar() {
  const { theme, setCurrentPage, currentPage } = useGitStore();
  const isDark = theme === 'dark';
  const [learnOpen, setLearnOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setLearnOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const learnItems = [
    { page: 'tutorials' as const, label: 'Tutorials' },
    { page: 'merge-rebase' as const, label: 'Merge vs Rebase' },
    { page: 'explorer' as const, label: 'Commands' },
  ];

  const isLearnActive = learnItems.some(i => i.page === currentPage);

  const linkStyle = (active: boolean) => ({
    color: active ? '#58a6ff' : isDark ? '#8b949e' : '#57606a',
    backgroundColor: active ? (isDark ? 'rgba(88,166,255,0.1)' : 'rgba(9,105,218,0.08)') : 'transparent',
  });

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>, active: boolean) => {
    if (!active) {
      e.currentTarget.style.color = isDark ? '#e6edf3' : '#1b1f24';
      e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>, active: boolean) => {
    if (!active) {
      e.currentTarget.style.color = isDark ? '#8b949e' : '#57606a';
      e.currentTarget.style.backgroundColor = 'transparent';
    }
  };

  return (
    <nav
      className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 border-b backdrop-blur-md"
      style={{
        backgroundColor: isDark ? 'rgba(22, 27, 34, 0.85)' : 'rgba(255, 255, 255, 0.85)',
        borderColor: isDark ? '#30363d' : '#d8dee4',
      }}
    >
      <button
        onClick={() => setCurrentPage('landing')}
        className="flex items-center gap-2 transition-opacity hover:opacity-80"
      >
        <GitBranch size={20} style={{ color: '#58a6ff' }} />
        <span className="font-bold text-sm tracking-wide" style={{ color: isDark ? '#e6edf3' : '#1b1f24' }}>
          GIT VISUALIZER
        </span>
      </button>

      <div className="hidden md:flex items-center gap-1">
        <button
          onClick={() => setCurrentPage('lab')}
          className="px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150"
          style={linkStyle(currentPage === 'lab')}
          onMouseEnter={(e) => handleMouseEnter(e, currentPage === 'lab')}
          onMouseLeave={(e) => handleMouseLeave(e, currentPage === 'lab')}
        >
          Lab
        </button>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setLearnOpen(prev => !prev)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150"
            style={linkStyle(isLearnActive)}
            onMouseEnter={(e) => handleMouseEnter(e, isLearnActive)}
            onMouseLeave={(e) => handleMouseLeave(e, isLearnActive)}
          >
            Learn <ChevronDown size={12} className={`transition-transform duration-150 ${learnOpen ? 'rotate-180' : ''}`} />
          </button>
          {learnOpen && (
            <div
              className="absolute top-full left-0 mt-1 py-1 rounded-md min-w-[160px] z-50"
              style={{
                backgroundColor: isDark ? '#1c2128' : '#ffffff',
                border: `1px solid ${isDark ? '#30363d' : '#d0d7de'}`,
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              }}
            >
              {learnItems.map((item) => (
                <button
                  key={item.page}
                  onClick={() => { setCurrentPage(item.page); setLearnOpen(false); }}
                  className="w-full text-left px-3 py-2 text-sm font-medium transition-colors"
                  style={{
                    color: currentPage === item.page ? '#58a6ff' : isDark ? '#c9d1d9' : '#24292f',
                    backgroundColor: currentPage === item.page ? (isDark ? 'rgba(88,166,255,0.1)' : 'rgba(9,105,218,0.08)') : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (currentPage !== item.page) {
                      e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentPage !== item.page) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => setCurrentPage('challenges')}
          className="px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150"
          style={linkStyle(currentPage === 'challenges')}
          onMouseEnter={(e) => handleMouseEnter(e, currentPage === 'challenges')}
          onMouseLeave={(e) => handleMouseLeave(e, currentPage === 'challenges')}
        >
          Challenges
        </button>

        <button
          onClick={() => setCurrentPage('about')}
          className="px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150"
          style={linkStyle(currentPage === 'about')}
          onMouseEnter={(e) => handleMouseEnter(e, currentPage === 'about')}
          onMouseLeave={(e) => handleMouseLeave(e, currentPage === 'about')}
        >
          About
        </button>
      </div>

      <ThemeToggle />
    </nav>
  );
}
