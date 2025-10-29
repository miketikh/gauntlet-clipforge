import React, { useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import Layout from './components/Layout';
import Header from './components/Header';
import MediaLibrary from './components/MediaLibrary';
import Preview from './components/Preview';
import Timeline from './components/Timeline';
import AIAssistantPanel from './components/AIAssistantPanel';
import { useProjectStore } from './store/projectStore';
import * as timelineCalcs from './utils/timelineCalculations';
import './styles/global.css';

const App: React.FC = () => {
  // Expose stores and utils to window for console testing (dev mode only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      (window as any).projectStore = useProjectStore;
      (window as any).timelineCalcs = timelineCalcs;
      console.log(
        '%c🎬 VideoJarvis Dev Mode',
        'color: #22c55e; font-weight: bold; font-size: 14px;'
      );
      console.log(
        '%cTest projectStore:',
        'color: #3b82f6; font-weight: bold;',
        '\n  projectStore.getState()',
        '\n  projectStore.getState().createProject("My Project")',
        '\n  projectStore.getState().addClipToTrack("media-123", 0, 0)',
        '\n  projectStore.getState().getProjectDuration()'
      );
      console.log(
        '%cTest timelineCalcs:',
        'color: #3b82f6; font-weight: bold;',
        '\n  timelineCalcs'
      );
    }
  }, []);

  return (
    <DndProvider backend={HTML5Backend}>
      <Layout
        header={<Header />}
        mediaLibrary={<MediaLibrary />}
        preview={<Preview />}
        timeline={<Timeline />}
        aiPanel={<AIAssistantPanel isOpen={false} onToggle={() => {}} />}
      />
    </DndProvider>
  );
};

export default App;
