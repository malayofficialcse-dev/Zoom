
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import LandingPage from './pages/landing';
import Authentication from './pages/authentication';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import VideoMeetComponent from './pages/VideoMeet';
import HomeComponent from './pages/home';
import History from './pages/history';
import Analytics from './pages/Analytics';

function App() {
  return (
    <div className="App font-outfit">

      <Router>

        <ThemeProvider>
          <AuthProvider>


            <Routes>

              <Route path='/' element={<LandingPage />} />

              <Route path='/auth' element={<Authentication />} />

              <Route path='/home' element={<HomeComponent />} />
              <Route path='/history' element={<History />} />
              <Route path='/analytics' element={<Analytics />} />
              <Route path='/:url' element={<VideoMeetComponent />} />
            </Routes>
          </AuthProvider>
        </ThemeProvider>

      </Router>
    </div>
  );
}

export default App;
