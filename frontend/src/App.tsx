import { useState } from 'react';
import SourcesPanel from './components/SourcesPanel/SourcesPanel';
import ChatPanel from './components/ChatPanel/ChatPanel';
import SimulationPanel from './components/SimulationPanel/SimulationPanel';
import type { SourceFile } from './components/SourcesPanel/SourcesPanel';

const INITIAL_SOURCES: SourceFile[] = [
  {
    id: '1',
    name: '641309578_295343398152020...pdf',
    type: 'pdf',
    checked: true,
  },
  {
    id: '2',
    name: '641668721_948761154157677...pdf',
    type: 'pdf',
    checked: true,
  },
  {
    id: '3',
    name: '643391136_163588102775412...pdf',
    type: 'pdf',
    checked: true,
  },
  {
    id: '4',
    name: '645723790_163320778146420...pdf',
    type: 'pdf',
    checked: true,
  },
  { id: '5', name: 'SWARM-PRD (1).pdf', type: 'pdf', checked: false },
  { id: '6', name: 'SWARM-PRD.pdf', type: 'pdf', checked: false },
  {
    id: '7',
    name: 'SWARM-refined-idea (1).pdf',
    type: 'pdf',
    checked: false,
  },
  { id: '8', name: 'SWARM-refined-idea.pdf', type: 'pdf', checked: false },
  { id: '9', name: 'prd.pdf', type: 'pdf', checked: true },
  { id: '10', name: 'product-vision.pdf', type: 'pdf', checked: true },
];

function App() {
  const [sources, setSources] = useState<SourceFile[]>(INITIAL_SOURCES);
  const checkedCount = sources.filter((s) => s.checked).length;

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      <SourcesPanel sources={sources} onSourcesChange={setSources} />
      <ChatPanel checkedSourceCount={checkedCount} />
      <SimulationPanel />
    </div>
  );
}

export default App;
