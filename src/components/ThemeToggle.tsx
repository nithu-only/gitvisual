import { useGitStore } from '../store/gitStore';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const { theme, toggleTheme } = useGitStore();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className="w-9 h-9 flex items-center justify-center rounded transition-all duration-150 hover:opacity-80"
      style={{ color: 'var(--text-secondary)' }}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  );
}
