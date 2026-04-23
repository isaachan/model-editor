import { Toolbar } from './components/Toolbar/Toolbar';
import { LeftSidebar } from './components/LeftSidebar/LeftSidebar';
import { Canvas } from './components/Canvas/Canvas';
import { RightSidebar } from './components/RightSidebar/RightSidebar';
import { StatusBar } from './components/StatusBar/StatusBar';
import { useBootstrap } from './hooks/useBootstrap';

export default function App() {
  useBootstrap();
  return (
    <div className="flex h-full w-full flex-col">
      <Toolbar />
      <div className="flex min-h-0 flex-1">
        <LeftSidebar />
        <Canvas />
        <RightSidebar />
      </div>
      <StatusBar />
    </div>
  );
}
