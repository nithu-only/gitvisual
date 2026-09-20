import { useGitStore } from '../store/gitStore';
import { GitBranch } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

export function Navbar() {
  const { theme, setCurrentPage, currentPage } = useGitStore();
  const isDark = theme === 'dark';

  const links = [
    { page: 'lab' as const, label: 'Lab' },
    { page: 'merge-rebase' as const, label: 'Merge vs Rebase' },
    { page: 'tutorials' as const, label: 'Tutorials' },
    { page: 'challenges' as const, label: 'Challenges' },
    { page: 'explorer' as const, label: 'Commands' },
    { page: 'about' as const, label: 'About' },
  ];

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
        {links.map((link) => (
          <button
            key={link.page}
            onClick={() => setCurrentPage(link.page)}
            className="px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150"
            style={{
              color: currentPage === link.page ? '#58a6ff' : isDark ? '#8b949e' : '#57606a',
              backgroundColor: currentPage === link.page ? (isDark ? 'rgba(88,166,255,0.1)' : 'rgba(9,105,218,0.08)' ) : 'transparent',
            }}
            onMouseEnter={(e) => {
              if (currentPage !== link.page) {
                e.currentTarget.style.color = isDark ? '#e6edf3' : '#1b1f24';
                e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
              }
            }}
            onMouseLeave={(e) => {
              if (currentPage !== link.page) {
                e.currentTarget.style.color = isDark ? '#8b949e' : '#57606a';
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            {link.label}
          </button>
        ))}
      </div>

      <ThemeToggle />
    </nav>
  );
}
