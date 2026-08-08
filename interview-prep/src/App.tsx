import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { ModulePage } from './pages/ModulePage';
import { LearningPaths } from './pages/LearningPaths';
import { Search } from './pages/Search';
import { Flashcards } from './pages/Flashcards';
import { MockInterview } from './pages/MockInterview';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/module/:moduleId" element={<ModulePage />} />
          <Route path="/paths" element={<LearningPaths />} />
          <Route path="/search" element={<Search />} />
          <Route path="/flashcards" element={<Flashcards />} />
          <Route path="/mock-interview" element={<MockInterview />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
