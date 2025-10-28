import React from 'react';
import Layout from './components/Layout';
import Header from './components/Header';
import MediaLibrary from './components/MediaLibrary';
import Preview from './components/Preview';
import Timeline from './components/Timeline';
import './styles/global.css';

const App: React.FC = () => {
  return (
    <Layout
      header={<Header />}
      mediaLibrary={<MediaLibrary />}
      preview={<Preview />}
      timeline={<Timeline />}
    />
  );
};

export default App;
