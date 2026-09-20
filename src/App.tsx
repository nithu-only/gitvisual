import { useLayoutEffect } from 'react';
import { useGitStore } from './store/gitStore';
import { LandingPage } from './pages/LandingPage';
import { GitLabPage } from './pages/GitLabPage';
import { MergeRebasePage } from './pages/MergeRebasePage';
import { CommandExplorerPage } from './pages/CommandExplorerPage';
import { TutorialsPage } from './pages/TutorialsPage';
import { ChallengesPage } from './pages/ChallengesPage';
import { AboutPage } from './pages/AboutPage';

function App() {
  const { currentPage, theme } = useGitStore();

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const renderPage = () => {
    switch (currentPage) {
      case 'landing': return <LandingPage />;
      case 'lab': return <GitLabPage />;
      case 'merge-rebase': return <MergeRebasePage />;
      case 'explorer': return <CommandExplorerPage />;
      case 'tutorials': return <TutorialsPage />;
      case 'challenges': return <ChallengesPage />;
      case 'about': return <AboutPage />;
      default: return <LandingPage />;
    }
  };

  return <>{renderPage()}</>;
}

export default App;
