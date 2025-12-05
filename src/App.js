import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import StartPage from './StartPage';
import RecordsPage from './RecordsPage';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<StartPage />} />
          <Route path="/records" element={<RecordsPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
